import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Login } from '@/auth/login.use-case';
import { RefreshAccessToken } from '@/auth/refresh-access-token.use-case';
import { Public } from '@/auth/public.decorator';
import { LoginDto } from '@/auth/dto/login.dto';
import { RefreshDto } from '@/auth/dto/refresh.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUser: Login,
    private readonly refreshAccessToken: RefreshAccessToken,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto) {
    return this.loginUser.execute(body);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: RefreshDto) {
    return {
      accessToken: await this.refreshAccessToken.execute(body),
    };
  }
}
