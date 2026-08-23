import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { Public } from '../../common/decorators/permissions.decorator';

@ApiTags('Health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'System health check' })
  async check() {
    const [dbHealthy, redisHealthy] = await Promise.all([
      this.db.healthCheck(),
      this.redis.healthCheck(),
    ]);

    const status = dbHealthy && redisHealthy ? 'healthy' : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      services: {
        database: { status: dbHealthy ? 'healthy' : 'unhealthy' },
        redis: { status: redisHealthy ? 'healthy' : 'unhealthy' },
        api: { status: 'healthy' },
      },
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.floor(process.uptime()),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
    };
  }
}
