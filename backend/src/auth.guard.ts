import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthRequest } from './auth.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Falta el token Bearer');
    // La sucursal activa viaja en un header (no en el token): el cliente la
    // cambia sin re-loguearse y acá se valida contra el rango en cada pedido.
    const branchHeader = request.headers['x-branch'];
    const requestedBranchId = typeof branchHeader === 'string' && branchHeader ? branchHeader : undefined;
    request.user = await this.auth.authenticate(header.slice(7), requestedBranchId);
    return true;
  }
}
