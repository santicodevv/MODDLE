import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ReEnrolmentService } from '../services/re-enrolment.service';
import { CreateReEnrolmentDto } from '../dto/create-re-enrolment.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RoleCode } from '../../users/entities/role.entity';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';

@Controller('re-enrolments')
export class ReEnrolmentController {
  constructor(private readonly reEnrolmentService: ReEnrolmentService) {}

  @Roles(RoleCode.STUDENT)
  @Post()
  async create(
    @Body() createDto: CreateReEnrolmentDto,
    @CurrentUser() user: User,
  ) {
    return this.reEnrolmentService.create(user.id, createDto);
  }

  @Roles(RoleCode.STUDENT)
  @Get('mine')
  async getMine(@CurrentUser() user: User) {
    return this.reEnrolmentService.findByStudent(user.id);
  }

  @Roles(RoleCode.ADMIN, RoleCode.TEACHER)
  @Get()
  async findAll() {
    return this.reEnrolmentService.findAll();
  }

  @Roles(RoleCode.ADMIN)
  @Get('pending')
  async findPending() {
    return this.reEnrolmentService.findPending();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reEnrolmentService.findOne(id);
  }

  @Roles(RoleCode.STUDENT)
  @Post(':id/submit')
  async submit(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.reEnrolmentService.submit(id, user.id);
  }

  @Roles(RoleCode.ADMIN)
  @Post(':id/approve')
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.reEnrolmentService.approve(id, user.id);
  }

  @Roles(RoleCode.ADMIN)
  @Post(':id/reject')
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @CurrentUser() user: User,
  ) {
    return this.reEnrolmentService.reject(id, user.id, reason);
  }

  @Roles(RoleCode.ADMIN)
  @Post(':id/apply-to-moodle')
  async applyToMoodle(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.reEnrolmentService.applyToMoodle(id, user.id);
  }
}
