import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { readFileSync } from 'fs';
import { join } from 'path';

const packageJson = JSON.parse(
  readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
);

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getInfo() {
    return {
      name: packageJson.name,
      version: packageJson.version,
      status: 'running',
      documentation: '/docs',
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
