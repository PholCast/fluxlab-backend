import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

export class RolesGuard implements CanActivate {
  constructor(private requiredRoles: string[]) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
        throw new ForbiddenException('User not found');
    }

    const userRole = user.app_metadata?.role;

    if (!userRole) {
        throw new ForbiddenException('No role found');
    }

    const hasAccess = this.requiredRoles.includes(userRole);

    if (!hasAccess) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}