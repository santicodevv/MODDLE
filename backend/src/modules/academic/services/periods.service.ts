import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AcademicPeriod,
  AcademicPeriodStatus,
} from '../entities/academic-period.entity';
import { CreatePeriodDto } from '../dto/create-period.dto';
import { AuditService } from '../../sync/services/audit.service';

@Injectable()
export class PeriodsService {
  constructor(
    @InjectRepository(AcademicPeriod)
    private readonly periodRepository: Repository<AcademicPeriod>,
    private readonly auditService: AuditService,
  ) {}

  async create(
    createPeriodDto: CreatePeriodDto,
    actorUserId?: number,
  ): Promise<AcademicPeriod> {
    // Verificar que no exista un período con el mismo código
    const existing = await this.periodRepository.findOne({
      where: { code: createPeriodDto.code },
    });

    if (existing) {
      throw new ConflictException(
        `Period with code ${createPeriodDto.code} already exists`,
      );
    }

    // Validar fechas
    const startDate = new Date(createPeriodDto.startDate);
    const endDate = new Date(createPeriodDto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const period = this.periodRepository.create({
      code: createPeriodDto.code,
      name: createPeriodDto.name,
      startDate,
      endDate,
      description: createPeriodDto.description,
      status: AcademicPeriodStatus.PLANNED,
    });

    const saved = await this.periodRepository.save(period);

    // Auditoría
    await this.auditService.log({
      actorUserId,
      action: 'period.created',
      entity: 'academic_periods',
      entityKey: saved.id.toString(),
      afterData: saved,
      source: 'app',
    });

    return saved;
  }

  async findAll(): Promise<AcademicPeriod[]> {
    return this.periodRepository.find({
      order: { startDate: 'DESC' },
    });
  }

  async findOne(id: number): Promise<AcademicPeriod> {
    const period = await this.periodRepository.findOne({ where: { id } });

    if (!period) {
      throw new NotFoundException(`Period with ID ${id} not found`);
    }

    return period;
  }

  async findByCode(code: string): Promise<AcademicPeriod> {
    const period = await this.periodRepository.findOne({ where: { code } });

    if (!period) {
      throw new NotFoundException(`Period with code ${code} not found`);
    }

    return period;
  }

  async findActive(): Promise<AcademicPeriod[]> {
    return this.periodRepository.find({
      where: { status: AcademicPeriodStatus.OPEN },
      order: { startDate: 'DESC' },
    });
  }

  async open(id: number, actorUserId?: number): Promise<AcademicPeriod> {
    const period = await this.findOne(id);

    if (period.status === AcademicPeriodStatus.OPEN) {
      throw new ConflictException('Period is already open');
    }

    if (period.status === AcademicPeriodStatus.CLOSED) {
      throw new ConflictException('Cannot reopen a closed period');
    }

    const beforeData = { ...period };
    period.status = AcademicPeriodStatus.OPEN;
    const updated = await this.periodRepository.save(period);

    // Auditoría
    await this.auditService.log({
      actorUserId,
      action: 'period.opened',
      entity: 'academic_periods',
      entityKey: id.toString(),
      beforeData,
      afterData: updated,
      source: 'app',
    });

    return updated;
  }

  async close(id: number, actorUserId?: number): Promise<AcademicPeriod> {
    const period = await this.findOne(id);

    if (period.status === AcademicPeriodStatus.CLOSED) {
      throw new ConflictException('Period is already closed');
    }

    const beforeData = { ...period };
    period.status = AcademicPeriodStatus.CLOSED;
    const updated = await this.periodRepository.save(period);

    // Auditoría
    await this.auditService.log({
      actorUserId,
      action: 'period.closed',
      entity: 'academic_periods',
      entityKey: id.toString(),
      beforeData,
      afterData: updated,
      source: 'app',
    });

    return updated;
  }

  async update(
    id: number,
    updateData: Partial<CreatePeriodDto>,
    actorUserId?: number,
  ): Promise<AcademicPeriod> {
    const period = await this.findOne(id);

    if (period.status === AcademicPeriodStatus.CLOSED) {
      throw new ConflictException('Cannot update a closed period');
    }

    const beforeData = { ...period };

    if (updateData.name) period.name = updateData.name;
    if (updateData.description !== undefined)
      period.description = updateData.description;
    if (updateData.startDate)
      period.startDate = new Date(updateData.startDate);
    if (updateData.endDate) period.endDate = new Date(updateData.endDate);

    // Validar fechas si se actualizan
    if (period.endDate <= period.startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const updated = await this.periodRepository.save(period);

    // Auditoría
    await this.auditService.log({
      actorUserId,
      action: 'period.updated',
      entity: 'academic_periods',
      entityKey: id.toString(),
      beforeData,
      afterData: updated,
      source: 'app',
    });

    return updated;
  }
}
