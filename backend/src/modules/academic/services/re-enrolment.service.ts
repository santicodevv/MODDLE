import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import { CreateReEnrolmentDto } from '../dto/create-re-enrolment.dto';
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
    private readonly auditService: AuditService,
    private readonly outboxService: OutboxService,
  ) {}

  async create(
    studentUserId: number,
    createDto: CreateReEnrolmentDto,
  ): Promise<ReEnrolmentRequest> {
    // Verificar que el período existe y está abierto
    const period = await this.periodRepository.findOne({
      where: { id: createDto.periodId },
    });

    if (!period) {
      throw new NotFoundException(
        `Period with ID ${createDto.periodId} not found`,
      );
    }

    if (period.status !== AcademicPeriodStatus.OPEN) {
      throw new BadRequestException(
        'Period is not open for re-enrolment',
      );
    }

    // Verificar que no haya solicitud pendiente/aprobada para este período
    const existing = await this.requestRepository.findOne({
      where: {
        appUserId: studentUserId,
        periodId: createDto.periodId,
        status: ReEnrolmentStatus.SUBMITTED,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'You already have a pending request for this period',
      );
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
    const lines = createDto.courses.map((course) =>
      this.lineRepository.create({
        requestId: savedRequest.id,
        courseMoodleId: course.courseMoodleId,
        action: EnrolmentAction.ENROL,
        status: EnrolmentLineStatus.PENDING,
      }),
    );

    await this.lineRepository.save(lines);

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
}
