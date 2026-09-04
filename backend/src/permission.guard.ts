import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthRequest } from './auth.types';
import { PERMISSION_KEY } from './require-permission.decorator';

/**
 * Global (registrado en AppModule): no hace nada en un endpoint sin
 * @RequirePermission, y en uno que sí lo tiene, exige que el permiso esté en
 * el rango del usuario autenticado — resuelto en cada pedido por
 * AuthService.authenticate(), nunca cacheado en el token.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    // getAllAndOverride: si el método tiene su propia clave, gana esa; si no,
    // cae a la de la clase — así un controlador entero puede compartir un
    // permiso (como antes con @UseGuards(AdminGuard) a nivel de clase).
    const required = this.reflector.getAllAndOverride<string | undefined>(PERMISSION_KEY, [context.getHandler(), context.getClass()]);
    if (!required) return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    if (!request.user?.permissions?.has(required)) {
      throw new ForbiddenException(`Te falta el permiso "${required}" para hacer esto`);
    }
    return true;
  }
}
