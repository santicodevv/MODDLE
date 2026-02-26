import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RoleCode } from '../../users/entities/role.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SyncState, SyncEntity } from '../entities/sync-state.entity';
import { SyncSchedulerService } from '../services/sync-scheduler.service';

@Controller('sync')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SyncController {
  constructor(
    @InjectRepository(SyncState)
    private readonly syncStateRepository: Repository<SyncState>,
    private readonly syncSchedulerService: SyncSchedulerService,
  ) {}

  @Get('status')
  @Roles(RoleCode.ADMIN)
  async getStatus() {
    const states = await this.syncStateRepository.find({
      order: { updatedAt: 'DESC' },
    });

    return {
      states,
      isRunning: false,
    };
  }

  @Post('trigger')
  @Roles(RoleCode.ADMIN)
  async triggerSync() {
    await this.syncSchedulerService.forceSync();
    return { message: 'Sync triggered successfully' };
  }

  @Post('trigger/:entity')
  @Roles(RoleCode.ADMIN)
  async triggerEntitySync(@Param('entity') entity: string) {
    const syncEntity = entity.toUpperCase() as SyncEntity;
    await this.syncSchedulerService.forceSync(syncEntity);
    return { message: `${entity} sync triggered successfully` };
  }
}
