import { Body, Controller, Get, Inject, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './auth.guard';
import { PermissionGuard } from './permission.guard';
import { AuthRequest } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  @Post('signup') signup(@Body() body: Record<string, unknown>) { return this.auth.signup(body); }
  @Post('login') login(@Body() body: Record<string, unknown>) { return this.auth.login(body); }

  /**
   * Como la sesión no vence, esto es lo que la pantalla llama al abrir la
   * app para refrescar el rango y los permisos — si un supervisor le cambió
   * el rango a alguien hace un rato, se entera acá sin tener que desloguearse.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  me(@Req() request: AuthRequest) {
    return this.auth.me(request.user);
  }

  /** El propio usuario edita su perfil (nombre, email, contraseña) y preferencias desde Ajustes. */
  @Patch('me')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  updateMe(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    return this.auth.updateMe(request.user, body);
  }

  /** Datos de la empresa (nombre, logo, zona horaria) — sólo el Dueño. */
  @Patch('tenant')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  updateTenant(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    return this.auth.updateTenant(request.user, body);
  }

  @Post('authorize-supervisor')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  authorizeSupervisor(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    return this.auth.authorizeSupervisor(request.user.tenantId, body);
  }
}
