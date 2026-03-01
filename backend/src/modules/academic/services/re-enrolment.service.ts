import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  ReEnrolmentRequest,
  ReEnrolmentStatus,
} from '../entities/re-enrolment-request.entity';
import {
  ReEnrolmentLine,
  EnrolmentAction,
  EnrolmentLineStatus,
} from '../entities/re-enrolment-line.entity';
import { AcademicPeriod, AcademicPeriodStatus } from '../entities/academic-period.entity';
import { PeriodAvailableCourse } from '../entities/period-available-course.entity';
import { CreateReEnrolmentDto, ReEnrolmentCourseDto } from '../dto/create-re-enrolment.dto';
import { AuditService } from '../../sync/services/audit.service';
import { OutboxService } from '../../sync/services/outbox.service';
import { OutboxEventType } from '../../sync/entities/outbox-event.entity';

@Injectable()
export class ReEnrolmentService {
  private readonly logger = new Logger(ReEnrolmentService.name);

  constructor(
    @InjectRepository(ReEnrolmentRequest)
    private readonly requestRepository: Repository<ReEnrolmentRequest>,
    @InjectRepository(ReEnrolmentLine)
    private readonly lineRepository: Repository<ReEnrolmentLine>,
    @InjectRepository(AcademicPeriod)
    private readonly periodRepository: Repository<AcademicPeriod>,
    @InjectRepository(PeriodAvailableCourse)
    private readonly availableCourseRepository: Repository<PeriodAvailableCourse>,
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
  ) {}

  async create(
    studentUserId: number,
    createDto: CreateReEnrolmentDto,
  ): Promise<ReEnrolmentRequest> {
    // Verificar que el período existe
    const period = await this.periodRepository.findOne({
      where: { id: createDto.periodId },
    });

    if (!period) {
      throw new NotFoundException(
        `Period with ID ${createDto.periodId} not found`,
      );
    }

    // Verificar que la reinscripción está abierta
    if (!period.reenrolmentOpen) {
      throw new BadRequestException(
        'Reenrolment is not open for this period',
      );
    }

    // Verificar fechas de reinscripción
    const now = new Date();
    if (period.reenrolmentStartDate && now < period.reenrolmentStartDate) {
      throw new BadRequestException(
        'Reenrolment period has not started yet',
      );
    }
    if (period.reenrolmentEndDate && now > period.reenrolmentEndDate) {
      throw new BadRequestException(
        'Reenrolment period has ended',
      );
    }

    // Verificar que no haya solicitud pendiente o ya enviada para este período
    const existingSubmitted = await this.requestRepository.findOne({
      where: {
        appUserId: studentUserId,
        periodId: createDto.periodId,
        status: ReEnrolmentStatus.SUBMITTED,
      },
    });

    if (existingSubmitted) {
      throw new BadRequestException(
        'You already have a pending request for this period',
      );
    }

    // Verificar si ya existe un borrador
    const existingDraft = await this.requestRepository.findOne({
      where: {
        appUserId: studentUserId,
        periodId: createDto.periodId,
        status: ReEnrolmentStatus.DRAFT,
      },
    });

    if (existingDraft) {
      throw new BadRequestException(
        'You already have a draft for this period. Use update instead.',
      );
    }

    // Validar que los cursos están disponibles para reinscripción
    if (createDto.courses && createDto.courses.length > 0) {
      const courseMoodleIds = createDto.courses.map((c) => c.courseMoodleId);
      const validation = await this.validateCoursesAvailable(
        createDto.periodId,
        courseMoodleIds,
      );

      if (!validation.valid) {
        throw new BadRequestException(
          `The following courses are not available for reenrolment: ${validation.invalidCourses.join(', ')}`,
        );
      }
    }

    // Crear solicitud
    const request = this.requestRepository.create({
      appUserId: studentUserId,
      periodId: createDto.periodId,
      status: ReEnrolmentStatus.DRAFT,
      notes: createDto.notes,
    });

    const savedRequest = await this.requestRepository.save(request);

    // Crear líneas
    if (createDto.courses && createDto.courses.length > 0) {
      const lines = createDto.courses.map((course) =>
        this.lineRepository.create({
          requestId: savedRequest.id,
          courseMoodleId: course.courseMoodleId,
          action: EnrolmentAction.ENROL,
          status: EnrolmentLineStatus.PENDING,
        }),
      );

      await this.lineRepository.save(lines);
    }

    // Auditoría
    await this.auditService.log({
      actorUserId: studentUserId,
      action: 'reenrolment.created',
      entity: 're_enrolment_requests',
      entityKey: savedRequest.id.toString(),
      afterData: { ...savedRequest, courses: createDto.courses },
      source: 'app',
    });

    return this.findOne(savedRequest.id);
  }

  private async validateCoursesAvailable(
    periodId: number,
    courseMoodleIds: number[],
  ): Promise<{ valid: boolean; invalidCourses: number[] }> {
    const availableCourses = await this.availableCourseRepository.find({
      where: {
        periodId,
        courseMoodleId: In(courseMoodleIds),
        enabled: true,
      },
    });

    const availableIds = availableCourses.map((c) => c.courseMoodleId);
    const invalidCourses = courseMoodleIds.filter(
      (id) => !availableIds.includes(id),
    );

    return {
      valid: invalidCourses.length === 0,
      invalidCourses,
    };
  }

  async findOne(id: number): Promise<ReEnrolmentRequest> {
    const request = await this.requestRepository.findOne({
      where: { id },
      relations: ['student', 'period', 'lines', 'decider'],
    });

    if (!request) {
      throw new NotFoundException(`Re-enrolment request ${id} not found`);
    }

    return request;
  }

  async findByStudent(studentUserId: number): Promise<ReEnrolmentRequest[]> {
    return this.requestRepository.find({
      where: { appUserId: studentUserId },
      relations: ['period', 'lines'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(): Promise<ReEnrolmentRequest[]> {
    return this.requestRepository.find({
      relations: ['student', 'period', 'lines'],
      order: { createdAt: 'DESC' },
    });
  }

  async findPending(): Promise<ReEnrolmentRequest[]> {
    return this.requestRepository.find({
      where: { status: ReEnrolmentStatus.SUBMITTED },
      relations: ['student', 'period', 'lines'],
      order: { submittedAt: 'ASC' },
    });
  }

  async submit(
    id: number,
    studentUserId: number,
  ): Promise<ReEnrolmentRequest> {
    const request = await this.findOne(id);

    // Verificar que es el estudiante dueño de la solicitud
    if (request.appUserId !== studentUserId) {
      throw new ForbiddenException('Not authorized to submit this request');
    }

    if (request.status !== ReEnrolmentStatus.DRAFT) {
      throw new BadRequestException('Request has already been submitted');
    }

    // Verificar que tenga al menos un curso
    if (!request.lines || request.lines.length === 0) {
      throw new BadRequestException(
        'Cannot submit request without courses',
      );
    }

    const beforeData = { ...request };
    request.status = ReEnrolmentStatus.SUBMITTED;
    request.submittedAt = new Date();

    const updated = await this.requestRepository.save(request);

    // Auditoría
    await this.auditService.log({
      actorUserId: studentUserId,
      action: 'reenrolment.submitted',
      entity: 're_enrolment_requests',
      entityKey: id.toString(),
      beforeData,
      afterData: updated,
      source: 'app',
    });

    return this.findOne(id);
  }

  async approve(
    id: number,
    adminUserId: number,
  ): Promise<ReEnrolmentRequest> {
    const request = await this.findOne(id);

    if (request.status !== ReEnrolmentStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted requests can be approved');
    }

    const beforeData = { ...request };
    request.status = ReEnrolmentStatus.APPROVED;
    request.decidedAt = new Date();
    request.decidedBy = adminUserId;

    const updated = await this.requestRepository.save(request);

    // Auditoría
    await this.auditService.log({
      actorUserId: adminUserId,
      action: 'reenrolment.approved',
      entity: 're_enrolment_requests',
      entityKey: id.toString(),
      beforeData,
      afterData: updated,
      source: 'app',
    });

    return this.findOne(id);
  }

  async reject(
    id: number,
    adminUserId: number,
    reason: string,
  ): Promise<ReEnrolmentRequest> {
    const request = await this.findOne(id);

    if (request.status !== ReEnrolmentStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted requests can be rejected');
    }

    const beforeData = { ...request };
    request.status = ReEnrolmentStatus.REJECTED;
    request.decidedAt = new Date();
    request.decidedBy = adminUserId;
    request.rejectionReason = reason;

    const updated = await this.requestRepository.save(request);

    // Auditoría
    await this.auditService.log({
      actorUserId: adminUserId,
      action: 'reenrolment.rejected',
      entity: 're_enrolment_requests',
      entityKey: id.toString(),
      beforeData,
      afterData: updated,
      source: 'app',
    });

    return this.findOne(id);
  }

  async applyToMoodle(
    id: number,
    adminUserId: number,
  ): Promise<ReEnrolmentRequest> {
    const request = await this.findOne(id);

    if (request.status !== ReEnrolmentStatus.APPROVED) {
      throw new BadRequestException('Only approved requests can be applied');
    }

    this.logger.log(
      `Applying re-enrolment request ${id} to Moodle (${request.lines.length} courses)`,
    );

    // Obtener moodle_user_id del estudiante
    const student = request.student;
    if (!student.moodleUserId) {
      throw new BadRequestException(
        'Student does not have a Moodle user ID',
      );
    }

    // Crear eventos en outbox para cada curso
    for (const line of request.lines) {
      if (line.status === EnrolmentLineStatus.DONE) {
        this.logger.debug(`Line ${line.id} already applied, skipping`);
        continue;
      }

      try {
        await this.outboxService.createEvent(
          OutboxEventType.ENROLMENT_CREATED,
          {
            courseMoodleId: line.courseMoodleId,
            userMoodleId: student.moodleUserId,
            roleId: 5, // Student role en Moodle
          },
        );

        // Marcar línea como done
        await this.lineRepository.update(line.id, {
          status: EnrolmentLineStatus.DONE,
          appliedAt: new Date(),
        });

        this.logger.log(
          `Enrolment event created for course ${line.courseMoodleId}`,
        );
      } catch (error) {
        this.logger.error(
          `Error creating enrolment event: ${error.message}`,
        );

        await this.lineRepository.update(line.id, {
          status: EnrolmentLineStatus.FAILED,
          lastError: error.message,
        });
      }
    }

    // Marcar solicitud como aplicada
    const beforeData = { ...request };
    request.status = ReEnrolmentStatus.APPLIED;
    const updated = await this.requestRepository.save(request);

    // Auditoría
    await this.auditService.log({
      actorUserId: adminUserId,
      action: 'reenrolment.applied',
      entity: 're_enrolment_requests',
      entityKey: id.toString(),
      beforeData,
      afterData: updated,
      source: 'app',
    });

    return this.findOne(id);
  }

  // =====================
  // MÉTODOS ADICIONALES PARA ESTUDIANTES
  // =====================

  async findDraft(
    studentUserId: number,
    periodId: number,
  ): Promise<ReEnrolmentRequest | null> {
    return this.requestRepository.findOne({
      where: {
        appUserId: studentUserId,
        periodId,
        status: ReEnrolmentStatus.DRAFT,
      },
      relations: ['period', 'lines'],
    });
  }

  async findDraftOrCreate(
    studentUserId: number,
    periodId: number,
  ): Promise<ReEnrolmentRequest> {
    const existing = await this.findDraft(studentUserId, periodId);
    if (existing) return existing;

    return this.create(studentUserId, {
      periodId,
      courses: [],
    });
  }

  async updateDraft(
    id: number,
    studentUserId: number,
    courses: ReEnrolmentCourseDto[],
    notes?: string,
  ): Promise<ReEnrolmentRequest> {
    const request = await this.findOne(id);

    // Verificar que es el estudiante dueño de la solicitud
    if (request.appUserId !== studentUserId) {
      throw new ForbiddenException('Not authorized to update this request');
    }

    if (request.status !== ReEnrolmentStatus.DRAFT) {
      throw new BadRequestException('Only drafts can be updated');
    }

    // Verificar que la reinscripción sigue abierta
    const period = request.period;
    if (!period.reenrolmentOpen) {
      throw new BadRequestException('Reenrolment is no longer open');
    }

    // Validar cursos disponibles
    if (courses && courses.length > 0) {
      const courseMoodleIds = courses.map((c) => c.courseMoodleId);
      const validation = await this.validateCoursesAvailable(
        request.periodId,
        courseMoodleIds,
      );

      if (!validation.valid) {
        throw new BadRequestException(
          `The following courses are not available: ${validation.invalidCourses.join(', ')}`,
        );
      }
    }

    // Eliminar líneas existentes
    await this.lineRepository.delete({ requestId: id });

    // Crear nuevas líneas
    if (courses && courses.length > 0) {
      const lines = courses.map((course) =>
        this.lineRepository.create({
          requestId: id,
          courseMoodleId: course.courseMoodleId,
          action: EnrolmentAction.ENROL,
          status: EnrolmentLineStatus.PENDING,
        }),
      );
      await this.lineRepository.save(lines);
    }

    // Actualizar notas si se proporcionan
    if (notes !== undefined) {
      request.notes = notes;
      await this.requestRepository.save(request);
    }

    await this.auditService.log({
      actorUserId: studentUserId,
      action: 'reenrolment.updated',
      entity: 're_enrolment_requests',
      entityKey: id.toString(),
      afterData: { courses, notes },
      source: 'app',
    });

    return this.findOne(id);
  }

  async addCoursesToDraft(
    id: number,
    studentUserId: number,
    courses: ReEnrolmentCourseDto[],
  ): Promise<ReEnrolmentRequest> {
    const request = await this.findOne(id);

    if (request.appUserId !== studentUserId) {
      throw new ForbiddenException('Not authorized');
    }

    if (request.status !== ReEnrolmentStatus.DRAFT) {
      throw new BadRequestException('Only drafts can be modified');
    }

    // Validar cursos disponibles
    const courseMoodleIds = courses.map((c) => c.courseMoodleId);
    const validation = await this.validateCoursesAvailable(
      request.periodId,
      courseMoodleIds,
    );

    if (!validation.valid) {
      throw new BadRequestException(
        `The following courses are not available: ${validation.invalidCourses.join(', ')}`,
      );
    }

    // Agregar solo los que no existen
    const existingIds = request.lines.map((l) => l.courseMoodleId);
    const newCourses = courses.filter(
      (c) => !existingIds.includes(c.courseMoodleId),
    );

    if (newCourses.length > 0) {
      const lines = newCourses.map((course) =>
        this.lineRepository.create({
          requestId: id,
          courseMoodleId: course.courseMoodleId,
          action: EnrolmentAction.ENROL,
          status: EnrolmentLineStatus.PENDING,
        }),
      );
      await this.lineRepository.save(lines);
    }

    return this.findOne(id);
  }

  async removeCoursesFromDraft(
    id: number,
    studentUserId: number,
    courseMoodleIds: number[],
  ): Promise<ReEnrolmentRequest> {
    const request = await this.findOne(id);

    if (request.appUserId !== studentUserId) {
      throw new ForbiddenException('Not authorized');
    }

    if (request.status !== ReEnrolmentStatus.DRAFT) {
      throw new BadRequestException('Only drafts can be modified');
    }

    await this.lineRepository.delete({
      requestId: id,
      courseMoodleId: In(courseMoodleIds),
    });

    return this.findOne(id);
  }

  async deleteDraft(id: number, studentUserId: number): Promise<void> {
    const request = await this.findOne(id);

    if (request.appUserId !== studentUserId) {
      throw new ForbiddenException('Not authorized to delete this request');
    }

    if (request.status !== ReEnrolmentStatus.DRAFT) {
      throw new BadRequestException('Only drafts can be deleted');
    }

    await this.requestRepository.delete(id);

    await this.auditService.log({
      actorUserId: studentUserId,
      action: 'reenrolment.deleted',
      entity: 're_enrolment_requests',
      entityKey: id.toString(),
      beforeData: request,
      source: 'app',
    });
  }

  async findByPeriod(periodId: number): Promise<ReEnrolmentRequest[]> {
    return this.requestRepository.find({
      where: { periodId },
      relations: ['student', 'lines'],
      order: { createdAt: 'DESC' },
    });
  }

  async countByStatus(
    periodId?: number,
  ): Promise<Record<ReEnrolmentStatus, number>> {
    const qb = this.requestRepository
      .createQueryBuilder('r')
      .select('r.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('r.status');

    if (periodId) {
      qb.where('r.periodId = :periodId', { periodId });
    }

    const results = await qb.getRawMany();

    const counts: Record<ReEnrolmentStatus, number> = {
      [ReEnrolmentStatus.DRAFT]: 0,
      [ReEnrolmentStatus.SUBMITTED]: 0,
      [ReEnrolmentStatus.APPROVED]: 0,
      [ReEnrolmentStatus.REJECTED]: 0,
      [ReEnrolmentStatus.APPLIED]: 0,
    };

    for (const row of results) {
      counts[row.status as ReEnrolmentStatus] = row.count;
    }

    return counts;
  }
}
