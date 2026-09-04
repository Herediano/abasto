import { Body, Controller, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './auth.guard';
import { AuthRequest } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  @Post('signup') signup(@Body() body: Record<string, unknown>) { return this.auth.signup(body); }
  @Post('login') login(@Body() body: Record<string, unknown>) { return this.auth.login(body); }

  @Post('authorize-supervisor')
  @UseGuards(JwtAuthGuard)
  authorizeSupervisor(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) {
    return this.auth.authorizeSupervisor(request.user.tenantId, body);
  }
}
