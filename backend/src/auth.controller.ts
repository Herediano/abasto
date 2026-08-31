import { Body, Controller, Inject, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  @Post('signup') signup(@Body() body: Record<string, unknown>) { return this.auth.signup(body); }
  @Post('login') login(@Body() body: Record<string, unknown>) { return this.auth.login(body); }
}
