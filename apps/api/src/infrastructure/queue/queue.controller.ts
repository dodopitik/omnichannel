import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { QueueService } from './queue.service';

@ApiTags('Queues')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller({ path: 'queues', version: '1' })
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get()
  @RequirePermissions('dashboard:read')
  @ApiOperation({ summary: 'Get queue statistics' })
  getStats() {
    return this.queueService.getQueueStats();
  }

  @Get(':name/failed')
  @RequirePermissions('dashboard:read')
  @ApiOperation({ summary: 'Get failed jobs for a queue' })
  getFailed(@Param('name') name: string) {
    return this.queueService.getFailedJobs(name);
  }

  @Post(':name/jobs/:jobId/retry')
  @RequirePermissions('marketplace:sync')
  @ApiOperation({ summary: 'Retry failed queue job' })
  retry(@Param('name') name: string, @Param('jobId') jobId: string) {
    return this.queueService.retryJob(name, jobId);
  }
}
