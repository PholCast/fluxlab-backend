import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get dashboard summary' })
  @ApiOkResponse({ description: 'Dashboard summary' })
  getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('workflow-status')
  @ApiOperation({ summary: 'Get dashboard workflow status' })
  @ApiOkResponse({ description: 'Dashboard workflow status' })
  getWorkflowStatus() {
    return this.dashboardService.getWorkflowStatus();
  }
}
