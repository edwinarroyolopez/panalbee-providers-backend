import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    const headerToken =
      req?.headers?.['x-push-token'] ?? req?.headers?.['x-fcm-token'];
    const headerPlatform =
      req?.headers?.['x-push-platform'] ?? req?.headers?.['x-fcm-platform'];

    const pushToken = Array.isArray(headerToken) ? headerToken[0] : headerToken;
    const pushPlatform = Array.isArray(headerPlatform)
      ? headerPlatform[0]
      : headerPlatform;

    return this.authService.me(req.user.sub, pushToken, pushPlatform);
  }

  @UseGuards(JwtAuthGuard)
  @Post('push-token')
  registerPushToken(@Body() dto: RegisterPushTokenDto, @Req() req: any) {
    return this.authService.registerPushToken(req.user.sub, dto);
  }
}
