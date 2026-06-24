import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Login } from '@/auth/login.use-case';
import { Public } from '@/auth/public.decorator';
import { LoginDto } from '@/auth/dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly loginUser: Login) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto) {
    return { accessToken: await this.loginUser.execute(body) };
  }
}
