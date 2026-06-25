import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from '@/app.service';
import { Public } from '@/auth/public.decorator';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check — returns a hello message' })
  @ApiOkResponse({ description: 'Service is up; returns a hello string.' })
  getHello(): string {
    return this.appService.getHello();
  }
}
