import { Body, Controller, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './auth.guard';
import { AuthRequest } from './auth.types';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  @Post() create(@Req() request: AuthRequest, @Body() body: Record<string, unknown>) { return this.auth.createUser(request.user.tenantId, body); }
}
