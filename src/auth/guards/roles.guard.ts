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
        throw new ForbiddenException('Usuario no encontrado');
    }

    const userRole = user.app_metadata?.role;

    if (!userRole) {
        throw new ForbiddenException('Rol no encontrado');
    }

    const hasAccess = this.requiredRoles.includes(userRole);

    if (!hasAccess) {
      throw new ForbiddenException('Permisos insuficientes');
    }

    return true;
  }
}