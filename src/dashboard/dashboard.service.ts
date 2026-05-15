import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';
import { Client } from '../clients/entities/client.entity';
import { Project } from '../projects/entities/project.entity';
import { Report } from '../projects/entities/report.entity';
import { Sample } from '../samples/entities/sample.entity';
import { Template } from '../samples/entities/template.entity';
import { User } from '../users/entities/user.entity';

const RECENT_LIMIT = 5;

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(Sample)
    private readonly sampleRepository: Repository<Sample>,
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getSummary() {
    const [
      totalClients,
      totalProjects,
      totalSamples,
      totalTemplates,
      totalUsers,
      totalReports,
      activeUsers,
      activeClients,
    ] = await Promise.all([
      this.clientRepository.count(),
      this.projectRepository.count(),
      this.sampleRepository.count(),
      this.templateRepository.count(),
      this.userRepository.count(),
      this.reportRepository.count(),
      this.userRepository.count({ where: { active: true } }),
      this.clientRepository.count({ where: { status: 'active' } }),
    ]);

    const [samplesByStatus, projectsByStatus, clientsByStatus] = await Promise.all([
      this.getStatusCounts(this.sampleRepository, 'status'),
      this.getStatusCounts(this.projectRepository, 'status'),
      this.getStatusCounts(this.clientRepository, 'status'),
    ]);

    const usersByStatus = {
      active: activeUsers,
      inactive: totalUsers - activeUsers,
    };

    const recentSamples = await this.sampleRepository.find({
      relations: { project: true, template: true },
      order: { createdAt: 'DESC' },
      take: RECENT_LIMIT,
    });

    const recentProjects = await this.projectRepository.find({
      relations: { client: true },
      order: { createdAt: 'DESC' },
      take: RECENT_LIMIT,
    });

    const recentClients = await this.clientRepository.find({
      order: { createdAt: 'DESC' },
      take: RECENT_LIMIT,
    });

    const recentUsers = await this.userRepository.find({
      order: { createdAt: 'DESC' },
      take: RECENT_LIMIT,
    });

    const topTemplates = await this.sampleRepository
      .createQueryBuilder('sample')
      .leftJoin('sample.template', 'template')
      .select('template.id', 'id')
      .addSelect('template.name', 'name')
      .addSelect('COUNT(sample.id)', 'sampleCount')
      .groupBy('template.id')
      .addGroupBy('template.name')
      .orderBy('"sampleCount"', 'DESC')
      .limit(RECENT_LIMIT)
      .getRawMany();

    const recentProjectWithCounts = await Promise.all(
      recentProjects.map(async (project) => {
        const sampleCount = await this.sampleRepository.count({
          where: { project: { id: project.id } },
        });

        return {
          id: project.id,
          name: project.name,
          status: project.status,
          createdAt: project.createdAt,
          client: project.client
            ? { id: project.client.id, name: project.client.name }
            : null,
          sampleCount,
        };
      }),
    );

    return {
      totals: {
        clients: totalClients,
        projects: totalProjects,
        samples: totalSamples,
        templates: totalTemplates,
        users: totalUsers,
        reports: totalReports,
      },
      samplesByStatus,
      projectsByStatus,
      clientsByStatus,
      usersByStatus,
      recentSamples: recentSamples.map((sample) => ({
        id: sample.id,
        code: sample.code,
        status: sample.status,
        createdAt: sample.createdAt,
        project: sample.project
          ? { id: sample.project.id, name: sample.project.name }
          : null,
        template: sample.template
          ? { id: sample.template.id, name: sample.template.name }
          : null,
      })),
      recentProjects: recentProjectWithCounts,
      recentClients: recentClients.map((client) => ({
        id: client.id,
        name: client.name,
        status: client.status,
        createdAt: client.createdAt,
      })),
      recentUsers: recentUsers.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        createdAt: user.createdAt,
      })),
      topTemplates: topTemplates.map((template) => ({
        id: template.id,
        name: template.name,
        sampleCount: Number(template.sampleCount) || 0,
      })),
      activeClients,
    };
  }

  async getWorkflowStatus() {
    const [samplesByStatus, projectsByStatus, clientsByStatus] = await Promise.all([
      this.getStatusCounts(this.sampleRepository, 'status'),
      this.getStatusCounts(this.projectRepository, 'status'),
      this.getStatusCounts(this.clientRepository, 'status'),
    ]);

    return {
      samplesByStatus,
      projectsByStatus,
      clientsByStatus,
    };
  }

  private async getStatusCounts<T extends ObjectLiteral>(
    repository: Repository<T>,
    column: keyof T,
  ): Promise<Record<string, number>> {
    const rows = await repository
      .createQueryBuilder('entity')
      .select(`entity.${String(column)}`, 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy(`entity.${String(column)}`)
      .getRawMany();

    return rows.reduce<Record<string, number>>((acc, row) => {
      const key = String(row.status || 'unknown').toLowerCase();
      acc[key] = Number(row.count) || 0;
      return acc;
    }, {});
  }
}
