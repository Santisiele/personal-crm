import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Login } from '@/auth/login.use-case';
import { RefreshAccessToken } from '@/auth/refresh-access-token.use-case';
import { Public } from '@/auth/public.decorator';
import { LoginDto } from '@/auth/dto/login.dto';
import { RefreshDto } from '@/auth/dto/refresh.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUser: Login,
    private readonly refreshAccessToken: RefreshAccessToken,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate by name and password, issue tokens' })
  @ApiOkResponse({
    description: 'Credentials valid; returns an access and refresh token pair.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async login(@Body() body: LoginDto) {
    return this.loginUser.execute(body);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange a refresh token for a fresh access token',
  })
  @ApiOkResponse({
    description: 'Refresh token valid; returns a fresh access token.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token.',
  })
  async refresh(@Body() body: RefreshDto) {
    return {
      accessToken: await this.refreshAccessToken.execute(body),
    };
  }
}
