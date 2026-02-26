import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { PeriodsService } from '../services/periods.service';
import { CreatePeriodDto } from '../dto/create-period.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RoleCode } from '../../users/entities/role.entity';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';

@Controller('periods')
export class PeriodsController {
  constructor(private readonly periodsService: PeriodsService) {}

  @Roles(RoleCode.ADMIN)
  @Post()
  async create(
    @Body() createPeriodDto: CreatePeriodDto,
    @CurrentUser() user: User,
  ) {
    return this.periodsService.create(createPeriodDto, user.id);
  }

  @Get()
  async findAll() {
    return this.periodsService.findAll();
  }

  @Get('active')
  async findActive() {
    return this.periodsService.findActive();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.periodsService.findOne(id);
  }

  @Roles(RoleCode.ADMIN)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Partial<CreatePeriodDto>,
    @CurrentUser() user: User,
  ) {
    return this.periodsService.update(id, updateData, user.id);
  }

  @Roles(RoleCode.ADMIN)
  @Post(':id/open')
  async open(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.periodsService.open(id, user.id);
  }

  @Roles(RoleCode.ADMIN)
  @Post(':id/close')
  async close(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.periodsService.close(id, user.id);
  }
}
