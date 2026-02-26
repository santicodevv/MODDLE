import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocalGrade } from '../entities/local-grade.entity';
import { AcademicPeriod, AcademicPeriodStatus } from '../entities/academic-period.entity';
import { MoodleCourse } from '../../moodle-integration/entities/moodle-course.entity';
import { MoodleGradeItem } from '../../moodle-integration/entities/moodle-grade-item.entity';
import { MoodleEnrolment } from '../../moodle-integration/entities/moodle-enrolment.entity';
import { User } from '../../users/entities/user.entity';
import { OutboxService } from '../../sync/services/outbox.service';
import { AuditService } from '../../sync/services/audit.service';
import { OutboxEventType } from '../../sync/entities/outbox-event.entity';
import { CreateGradeDto } from '../dto/create-grade.dto';
import { UpdateGradeDto } from '../dto/update-grade.dto';

@Injectable()
export class GradesService {
  constructor(
    @InjectRepository(LocalGrade)
    private readonly gradeRepository: Repository<LocalGrade>,
    @InjectRepository(AcademicPeriod)
    private readonly periodRepository: Repository<AcademicPeriod>,
    @InjectRepository(MoodleCourse)
    private readonly courseRepository: Repository<MoodleCourse>,
    @InjectRepository(MoodleGradeItem)
    private readonly gradeItemRepository: Repository<MoodleGradeItem>,
    @InjectRepository(MoodleEnrolment)
    private readonly enrolmentRepository: Repository<MoodleEnrolment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly outboxService: OutboxService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Crear una nueva calificación
   */
  async create(
    createDto: CreateGradeDto,
    teacherId: number,
  ): Promise<LocalGrade> {
    // Validaciones
    await this.validateGradeCreation(createDto, teacherId);

    // Verificar si ya existe una calificación para este estudiante/item
    const existing = await this.gradeRepository.findOne({
      where: {
        courseId: createDto.courseId,
        gradeItemId: createDto.gradeItemId,
        studentId: createDto.studentId,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Ya existe una calificación para este estudiante en este item',
      );
    }

    // Obtener datos del curso y el item para Moodle
    const course = await this.courseRepository.findOne({
      where: { id: createDto.courseId },
    });
    const gradeItem = await this.gradeItemRepository.findOne({
      where: { id: createDto.gradeItemId },
    });
    const student = await this.userRepository.findOne({
      where: { id: createDto.studentId },
    });

    if (!course || !gradeItem || !student) {
      throw new NotFoundException('Curso, item o estudiante no encontrado');
    }

    // Crear la calificación local
    const grade = this.gradeRepository.create({
      ...createDto,
      teacherId,
      syncedToMoodle: false,
      createdBy: teacherId,
      updatedBy: teacherId,
    });

    const saved = await this.gradeRepository.save(grade);

    // Crear evento de outbox para sincronizar a Moodle
    const outboxEvent = await this.outboxService.createEvent(
      OutboxEventType.GRADE_UPDATED,
      {
        courseMoodleId: course.moodleId,
        itemMoodleId: gradeItem.itemMoodleId,
        userMoodleId: student.moodleUserId,
        grade: createDto.grade,
        feedback: createDto.feedback || '',
      },
    );

    // Vincular el evento con la calificación
    saved.outboxEventId = outboxEvent.id;
    await this.gradeRepository.save(saved);

    // Auditoría
    await this.auditService.log({
      entity: 'LocalGrade',
      entityKey: saved.id.toString(),
      action: 'CREATE',
      actorUserId: teacherId,
      afterData: createDto,
    });

    return saved;
  }

  /**
   * Actualizar una calificación existente
   */
  async update(
    id: number,
    updateDto: UpdateGradeDto,
    teacherId: number,
  ): Promise<LocalGrade> {
    const grade = await this.gradeRepository.findOne({
      where: { id },
      relations: ['period', 'course', 'gradeItem', 'student'],
    });

    if (!grade) {
      throw new NotFoundException('Calificación no encontrada');
    }

    // Validar que el profesor sea el propietario
    if (grade.teacherId !== teacherId) {
      throw new ForbiddenException(
        'No tiene permisos para modificar esta calificación',
      );
    }

    // Validar que el período siga abierto
    if (grade.period.status !== AcademicPeriodStatus.OPEN) {
      throw new BadRequestException('El período académico está cerrado');
    }

    // Validar rango de la nueva calificación
    if (updateDto.grade !== undefined) {
      await this.validateGradeRange(
        grade.gradeItemId,
        updateDto.grade,
      );
    }

    const oldData = { ...grade };

    // Actualizar campos
    if (updateDto.grade !== undefined) {
      grade.grade = updateDto.grade;
    }
    if (updateDto.feedback !== undefined) {
      grade.feedback = updateDto.feedback;
    }

    grade.updatedBy = teacherId;
    grade.syncedToMoodle = false; // Marcar como no sincronizado

    const updated = await this.gradeRepository.save(grade);

    // Crear nuevo evento de outbox
    const outboxEvent = await this.outboxService.createEvent(
      OutboxEventType.GRADE_UPDATED,
      {
        courseMoodleId: grade.course.moodleId,
        itemMoodleId: grade.gradeItem.itemMoodleId,
        userMoodleId: grade.student.moodleUserId,
        grade: updated.grade,
        feedback: updated.feedback || '',
      },
    );

    updated.outboxEventId = outboxEvent.id;
    await this.gradeRepository.save(updated);

    // Auditoría
    await this.auditService.log({
      entity: 'LocalGrade',
      entityKey: id.toString(),
      action: 'UPDATE',
      actorUserId: teacherId,
      beforeData: oldData,
      afterData: updateDto,
    });

    return updated;
  }

  /**
   * Obtener calificaciones por profesor
   */
  async findByTeacher(
    teacherId: number,
    courseId?: number,
    periodId?: number,
  ): Promise<LocalGrade[]> {
    const query = this.gradeRepository
      .createQueryBuilder('grade')
      .leftJoinAndSelect('grade.course', 'course')
      .leftJoinAndSelect('grade.gradeItem', 'gradeItem')
      .leftJoinAndSelect('grade.student', 'student')
      .leftJoinAndSelect('grade.period', 'period')
      .where('grade.teacherId = :teacherId', { teacherId });

    if (courseId) {
      query.andWhere('grade.courseId = :courseId', { courseId });
    }

    if (periodId) {
      query.andWhere('grade.periodId = :periodId', { periodId });
    }

    query.orderBy('grade.createdAt', 'DESC');

    return query.getMany();
  }

  /**
   * Obtener calificaciones por estudiante
   */
  async findByStudent(
    studentId: number,
    periodId?: number,
  ): Promise<LocalGrade[]> {
    const query = this.gradeRepository
      .createQueryBuilder('grade')
      .leftJoinAndSelect('grade.course', 'course')
      .leftJoinAndSelect('grade.gradeItem', 'gradeItem')
      .leftJoinAndSelect('grade.teacher', 'teacher')
      .leftJoinAndSelect('grade.period', 'period')
      .where('grade.studentId = :studentId', { studentId });

    if (periodId) {
      query.andWhere('grade.periodId = :periodId', { periodId });
    }

    query.orderBy('grade.createdAt', 'DESC');

    return query.getMany();
  }

  /**
   * Obtener calificaciones por curso
   */
  async findByCourse(
    courseId: number,
    gradeItemId?: number,
  ): Promise<LocalGrade[]> {
    const query = this.gradeRepository
      .createQueryBuilder('grade')
      .leftJoinAndSelect('grade.student', 'student')
      .leftJoinAndSelect('grade.gradeItem', 'gradeItem')
      .leftJoinAndSelect('grade.teacher', 'teacher')
      .leftJoinAndSelect('grade.period', 'period')
      .where('grade.courseId = :courseId', { courseId });

    if (gradeItemId) {
      query.andWhere('grade.gradeItemId = :gradeItemId', { gradeItemId });
    }

    query.orderBy('student.email', 'ASC');

    return query.getMany();
  }

  /**
   * Obtener una calificación por ID
   */
  async findOne(id: number): Promise<LocalGrade> {
    const grade = await this.gradeRepository.findOne({
      where: { id },
      relations: [
        'course',
        'gradeItem',
        'student',
        'teacher',
        'period',
      ],
    });

    if (!grade) {
      throw new NotFoundException('Calificación no encontrada');
    }

    return grade;
  }

  /**
   * Marcar calificación como sincronizada (llamado por OutboxProcessor)
   */
  async markAsSynced(id: number): Promise<void> {
    await this.gradeRepository.update(id, {
      syncedToMoodle: true,
      syncedAt: new Date(),
    });
  }

  /**
   * Validaciones privadas
   */
  private async validateGradeCreation(
    createDto: CreateGradeDto,
    teacherId: number,
  ): Promise<void> {
    // 1. Validar que el período esté abierto
    const period = await this.periodRepository.findOne({
      where: { id: createDto.periodId },
    });

    if (!period) {
      throw new NotFoundException('Período académico no encontrado');
    }

    if (period.status !== AcademicPeriodStatus.OPEN) {
      throw new BadRequestException('El período académico no está abierto');
    }

    // 2. Validar que el curso exista
    const course = await this.courseRepository.findOne({
      where: { id: createDto.courseId },
    });

    if (!course) {
      throw new NotFoundException('Curso no encontrado');
    }

    // 3. Validar que el grade item exista y pertenezca al curso
    const gradeItem = await this.gradeItemRepository.findOne({
      where: { id: createDto.gradeItemId },
    });

    if (!gradeItem) {
      throw new NotFoundException('Item de calificación no encontrado');
    }

    if (gradeItem.courseMoodleId !== course.moodleId) {
      throw new BadRequestException(
        'El item de calificación no pertenece a este curso',
      );
    }

    // 4. Validar rango de calificación
    await this.validateGradeRange(createDto.gradeItemId, createDto.grade);

    // 5. Validar que el estudiante exista
    const student = await this.userRepository.findOne({
      where: { id: createDto.studentId },
    });

    if (!student || !student.moodleUserId) {
      throw new NotFoundException(
        'Estudiante no encontrado o no vinculado a Moodle',
      );
    }

    // 6. Validar que el estudiante esté inscrito en el curso
    const enrolment = await this.enrolmentRepository.findOne({
      where: {
        userMoodleId: student.moodleUserId,
        courseMoodleId: course.moodleId,
      },
    });

    if (!enrolment) {
      throw new BadRequestException(
        'El estudiante no está inscrito en este curso',
      );
    }

    if (enrolment.enrolStatus !== 'active') {
      throw new BadRequestException(
        'La inscripción del estudiante no está activa',
      );
    }

    // 7. Validar que el profesor esté asignado al curso
    // Esto se podría implementar con una tabla de asignaciones profesor-curso
    // Por ahora, asumimos que si el profesor tiene rol TEACHER, puede calificar
    const teacher = await this.userRepository.findOne({
      where: { id: teacherId },
      relations: ['roles'],
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }

    const hasTeacherRole = teacher.roles.some(
      (role) => role.code === 'TEACHER' || role.code === 'ADMIN',
    );

    if (!hasTeacherRole) {
      throw new ForbiddenException(
        'No tiene permisos para calificar en este curso',
      );
    }
  }

  private async validateGradeRange(
    gradeItemId: number,
    grade: number,
  ): Promise<void> {
    const gradeItem = await this.gradeItemRepository.findOne({
      where: { id: gradeItemId },
    });

    if (!gradeItem) {
      throw new NotFoundException('Item de calificación no encontrado');
    }

    const min = gradeItem.grademin || 0;
    const max = gradeItem.grademax || 100;

    if (grade < min || grade > max) {
      throw new BadRequestException(
        `La calificación debe estar entre ${min} y ${max}`,
      );
    }
  }
}
