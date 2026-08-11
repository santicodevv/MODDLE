import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, In } from 'typeorm';
import { AcademicProgram } from './entities/academic-program.entity';
import { StudyPlan } from './entities/study-plan.entity';
import { StudentProgram } from './entities/student-program.entity';
import { MoodleCourse } from '../moodle-integration/entities/moodle-course.entity';
import { MoodleUser } from '../moodle-integration/entities/moodle-user.entity';
import { MoodleCategory } from '../moodle-integration/entities/moodle-category.entity';
import { MoodleClientService } from '../moodle-integration/moodle-client.service';
import { CreateAcademicProgramDto } from './dto/create-academic-program.dto';
import { UpdateAcademicProgramDto } from './dto/update-academic-program.dto';
import { CreateStudyPlanDto } from './dto/create-study-plan.dto';
import { CreateProgramCourseDto } from './dto/create-program-course.dto';
import { AssignStudentProgramDto } from './dto/assign-student-program.dto';

@Injectable()
export class ProjectionService {
  constructor(
    @InjectRepository(AcademicProgram)
    private readonly programRepository: Repository<AcademicProgram>,
    @InjectRepository(StudyPlan)
    private readonly studyPlanRepository: Repository<StudyPlan>,
    @InjectRepository(StudentProgram)
    private readonly studentProgramRepository: Repository<StudentProgram>,
    @InjectRepository(MoodleCourse)
    private readonly courseRepository: Repository<MoodleCourse>,
    @InjectRepository(MoodleUser)
    private readonly moodleUserRepository: Repository<MoodleUser>,
    @InjectRepository(MoodleCategory)
    private readonly moodleCategoryRepository: Repository<MoodleCategory>,
    private readonly moodleClient: MoodleClientService,
  ) {}

  // ========== PROGRAMS CRUD ==========

  async createProgram(dto: CreateAcademicProgramDto): Promise<AcademicProgram> {
    const existing = await this.programRepository.findOne({
      where: { code: dto.code },
    });
    if (existing)
      throw new ConflictException(
        `Program with code ${dto.code} already exists`,
      );
    const program = this.programRepository.create(dto);
    return this.programRepository.save(program);
  }

  async findAllPrograms(): Promise<AcademicProgram[]> {
    return this.programRepository.find({ order: { name: 'ASC' } });
  }

  async findProgramById(id: number): Promise<AcademicProgram> {
    const program = await this.programRepository.findOne({ where: { id } });
    if (!program)
      throw new NotFoundException(`Program with ID ${id} not found`);
    return program;
  }

  async updateProgram(
    id: number,
    dto: UpdateAcademicProgramDto,
  ): Promise<AcademicProgram> {
    const program = await this.findProgramById(id);
    Object.assign(program, dto);
    return this.programRepository.save(program);
  }

  async deleteProgram(id: number): Promise<void> {
    const program = await this.findProgramById(id);
    await this.studyPlanRepository.delete({ programId: id });
    await this.studentProgramRepository.delete({ programId: id });
    await this.programRepository.remove(program);
  }

  // ========== STUDY PLANS ==========

  async addStudyPlan(
    programId: number,
    dto: CreateStudyPlanDto,
  ): Promise<StudyPlan> {
    await this.findProgramById(programId);
    const existing = await this.studyPlanRepository.findOne({
      where: { programId, courseMoodleId: dto.courseMoodleId },
    });
    if (existing)
      throw new ConflictException('This course is already in the study plan');
    const plan = this.studyPlanRepository.create({ ...dto, programId });
    return this.studyPlanRepository.save(plan);
  }

  async getStudyPlansByProgram(programId: number): Promise<any[]> {
    await this.findProgramById(programId);
    const plans = await this.studyPlanRepository.find({
      where: { programId },
      order: { level: 'ASC' },
    });
    const moodleIds = plans.map((p) => p.courseMoodleId);
    const courses =
      moodleIds.length > 0
        ? await this.courseRepository.find({
            where: moodleIds.map((id) => ({ moodleId: id })),
          })
        : [];
    const courseMap = new Map(courses.map((c) => [String(c.moodleId), c]));
    return plans.map((plan) => ({
      ...plan,
      courseName:
        courseMap.get(String(plan.courseMoodleId))?.fullname ||
        courseMap.get(String(plan.courseMoodleId))?.subjectName ||
        'Unknown',
    }));
  }

  /**
   * Obtiene los programas que ya tienen asignado este curso en su plan de estudio.
   */
  async getProgramsByCourse(
    courseMoodleId: number,
  ): Promise<AcademicProgram[]> {
    const plans = await this.studyPlanRepository.find({
      where: { courseMoodleId },
    });
    if (plans.length === 0) return [];
    const programIds = [...new Set(plans.map((p) => p.programId))];
    return this.programRepository.find({
      where: programIds.map((id) => ({ id })),
      order: { name: 'ASC' },
    });
  }

  async updateStudyPlan(
    id: number,
    dto: Partial<CreateStudyPlanDto>,
  ): Promise<StudyPlan> {
    const plan = await this.studyPlanRepository.findOne({ where: { id } });
    if (!plan)
      throw new NotFoundException(`Study plan entry with ID ${id} not found`);
    Object.assign(plan, dto);
    return this.studyPlanRepository.save(plan);
  }

  async removeStudyPlan(id: number): Promise<void> {
    const plan = await this.studyPlanRepository.findOne({ where: { id } });
    if (!plan)
      throw new NotFoundException(`Study plan entry with ID ${id} not found`);
    await this.studyPlanRepository.remove(plan);
  }

  /**
   * Crea un curso nuevo en Moodle usando la categoría del programa y lo
   * agrega al plan de estudio del programa en un solo paso.
   */
  async createCourseForProgram(
    programId: number,
    dto: CreateProgramCourseDto,
  ): Promise<any> {
    const program = await this.findProgramById(programId);

    if (program.moodleCategoryId == null) {
      throw new BadRequestException(
        `El programa "${program.name}" no está vinculado a una categoría de Moodle. Sincroniza las categorías primero.`,
      );
    }

    const categoryId = Number(program.moodleCategoryId);

    const category = await this.moodleCategoryRepository.findOne({
      where: { moodleId: categoryId },
    });
    if (!category) {
      throw new BadRequestException(
        `La categoría de Moodle ${categoryId} no existe. Sincroniza las categorías primero.`,
      );
    }

    const moodlePayload = {
      fullname: dto.fullname,
      shortname: dto.shortname,
      categoryid: categoryId,
      idnumber: dto.idnumber,
      summary: dto.summary,
      visible: dto.visible === false ? 0 : 1,
      startdate: dto.startdate
        ? Math.floor(new Date(dto.startdate).getTime() / 1000)
        : undefined,
      enddate: dto.enddate
        ? Math.floor(new Date(dto.enddate).getTime() / 1000)
        : undefined,
    };

    let moodleResult;
    try {
      moodleResult = await this.moodleClient.createCourse(moodlePayload);
    } catch (error) {
      throw new BadRequestException(
        `Error al crear el curso en Moodle: ${error.message}`,
      );
    }

    if (!moodleResult || moodleResult.length === 0) {
      throw new BadRequestException(
        'Error al crear el curso en Moodle: respuesta vacía',
      );
    }

    const createdMoodleCourse = moodleResult[0];

    const course = this.courseRepository.create({
      moodleId: createdMoodleCourse.id,
      shortname: dto.shortname,
      fullname: dto.fullname,
      categoryId,
      visible: dto.visible !== false,
      lastSyncedAt: new Date(),
    });

    if (dto.idnumber) course.idnumber = dto.idnumber;
    if (dto.summary) course.summary = dto.summary;
    if (dto.startdate) course.startdate = new Date(dto.startdate);
    if (dto.enddate) course.enddate = new Date(dto.enddate);
    if (dto.subjectName) course.subjectName = dto.subjectName;
    if (dto.code) course.code = dto.code;

    await this.courseRepository.save(course);

    const existing = await this.studyPlanRepository.findOne({
      where: { programId, courseMoodleId: course.moodleId },
    });
    if (!existing) {
      await this.studyPlanRepository.save(
        this.studyPlanRepository.create({
          programId,
          courseMoodleId: course.moodleId,
          level: dto.level,
        }),
      );
    }

    return {
      course: { ...course, studentCount: 0, teacherCount: 0 },
    };
  }

  /**
   * Asigna automáticamente a cada programa los cursos de Moodle que ya
   * pertenecen a su categoría (MoodleCourse.categoryId === Program.moodleCategoryId)
   * y aún no están en el plan de estudio. El nivel por defecto es 1.
   */
  async autoAssignCoursesToPrograms(): Promise<{
    programsProcessed: number;
    coursesAssigned: number;
    coursesSkipped: number;
  }> {
    const programs = await this.programRepository.find({
      where: { moodleCategoryId: Not(IsNull()) },
    });

    let programsProcessed = 0;
    let coursesAssigned = 0;
    let coursesSkipped = 0;

    for (const program of programs) {
      const moodleCategoryId = Number(program.moodleCategoryId);
      const courses = await this.courseRepository.find({
        where: { categoryId: moodleCategoryId },
      });

      if (courses.length === 0) continue;

      programsProcessed++;

      const existingPlans = await this.studyPlanRepository.find({
        where: { programId: program.id },
      });
      const existingCourseIds = new Set(
        existingPlans.map((p) => String(p.courseMoodleId)),
      );

      for (const course of courses) {
        const courseKey = String(course.moodleId);
        if (existingCourseIds.has(courseKey)) {
          coursesSkipped++;
          continue;
        }
        await this.studyPlanRepository.save(
          this.studyPlanRepository.create({
            programId: program.id,
            courseMoodleId: course.moodleId,
            level: 1,
          }),
        );
        coursesAssigned++;
      }
    }

    return { programsProcessed, coursesAssigned, coursesSkipped };
  }

  // ========== STUDENT PROGRAM ==========

  async assignStudentToProgram(
    dto: AssignStudentProgramDto,
  ): Promise<StudentProgram> {
    await this.findProgramById(dto.programId);
    const existing = await this.studentProgramRepository.findOne({
      where: { userId: dto.userId, programId: dto.programId },
    });
    if (existing)
      throw new ConflictException(
        'Student is already assigned to this program',
      );
    const sp = this.studentProgramRepository.create(dto);
    return this.studentProgramRepository.save(sp);
  }

  async getStudentPrograms(userId: number): Promise<StudentProgram[]> {
    return this.studentProgramRepository.find({
      where: { userId },
      relations: ['program'],
    });
  }

  async getStudentsByProgram(programId: number): Promise<any[]> {
    await this.findProgramById(programId);
    return this.studentProgramRepository.find({
      where: { programId },
      order: { createdAt: 'DESC' },
    });
  }

  async removeStudentFromProgram(id: number): Promise<void> {
    const sp = await this.studentProgramRepository.findOne({ where: { id } });
    if (!sp)
      throw new NotFoundException(
        `Student program assignment with ID ${id} not found`,
      );
    await this.studentProgramRepository.remove(sp);
  }

  async toggleStudentProgram(
    dto: AssignStudentProgramDto,
  ): Promise<{ assigned: boolean; studentProgram?: StudentProgram }> {
    await this.findProgramById(dto.programId);
    const existing = await this.studentProgramRepository.findOne({
      where: { userId: dto.userId, programId: dto.programId },
    });

    if (existing) {
      await this.studentProgramRepository.remove(existing);
      return { assigned: false };
    }

    const sp = this.studentProgramRepository.create({
      userId: dto.userId,
      programId: dto.programId,
      entryDate: dto.entryDate ?? new Date().toISOString().slice(0, 10),
    });
    const saved = await this.studentProgramRepository.save(sp);
    return { assigned: true, studentProgram: saved };
  }

  async findStudentsPaginated(
    page: number = 1,
    limit: number = 10,
    search?: string,
  ): Promise<{
    students: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const qb = this.moodleUserRepository
      .createQueryBuilder('mu')
      .where(
        `EXISTS (SELECT 1 FROM moodle_enrolments me WHERE me.user_moodle_id = mu.moodle_id AND me.role_code = 'student')`,
      );

    if (search && search.trim()) {
      qb.andWhere(
        '(mu.firstname ILIKE :search OR mu.lastname ILIKE :search OR mu.email ILIKE :search OR mu.username ILIKE :search)',
        { search: `%${search.trim()}%` },
      );
    }

    qb.orderBy('mu.suspended', 'ASC')
      .addOrderBy('mu.firstname', 'ASC')
      .addOrderBy('mu.lastname', 'ASC');

    const total = await qb.getCount();
    const users = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const students = users.map((u) => ({
      moodleId: Number(u.moodleId),
      studentName:
        [u.firstname, u.lastname].filter(Boolean).join(' ').trim() ||
        u.email ||
        `User ${u.moodleId}`,
      username: u.username,
      matriculation: u.username && /^\d+$/.test(u.username) ? u.username : null,
      email: u.email,
      suspended: u.suspended,
      programIds: [] as number[],
    }));

    if (students.length > 0) {
      const assignments = await this.studentProgramRepository.find({
        where: { userId: In(students.map((s) => s.moodleId)) },
      });
      const byUser = new Map<number, number[]>();
      for (const a of assignments) {
        const key = Number(a.userId);
        if (!byUser.has(key)) byUser.set(key, []);
        byUser.get(key)!.push(Number(a.programId));
      }
      for (const s of students) {
        s.programIds = byUser.get(s.moodleId) ?? [];
      }
    }

    return { students, total, page, limit };
  }

  // ========== PROJECTION LOGIC ==========

  async getPendingSubjects(programId?: number): Promise<any[]> {
    const query = this.studentProgramRepository
      .createQueryBuilder('sp')
      .select('sp.user_id', 'studentId')
      .addSelect('sp.program_id', 'programId')
      .addSelect('pe.course_moodle_id', 'courseMoodleId')
      .addSelect('pe.level', 'level')
      .addSelect(
        'MAX(CASE WHEN mg.grade >= 70 THEN 1 ELSE 0 END)',
        'hasApproved',
      )
      .addSelect(
        'MAX(CASE WHEN mg.grade IS NOT NULL THEN 1 ELSE 0 END)',
        'hasAnyGrade',
      )
      .innerJoin('sga_study_plans', 'pe', 'pe.program_id = sp.program_id')
      .leftJoin(
        'moodle_grades',
        'mg',
        'mg.user_moodle_id = sp.user_id AND mg.course_moodle_id = pe.course_moodle_id',
      )
      .groupBy('sp.user_id, sp.program_id, pe.course_moodle_id, pe.level');

    if (programId) {
      query.where('sp.program_id = :programId', { programId });
    }

    const results = await query.getRawMany();
    return results.map((r) => {
      const hasApproved = Number(r.hasApproved) === 1;
      const hasAnyGrade = Number(r.hasAnyGrade) === 1;
      let status: 'approved' | 'failed' | 'pending';
      if (hasApproved) {
        status = 'approved';
      } else if (hasAnyGrade) {
        status = 'failed';
      } else {
        status = 'pending';
      }
      return {
        studentId: Number(r.studentId),
        courseMoodleId: Number(r.courseMoodleId),
        level: Number(r.level),
        status,
      };
    });
  }

  async getDemandBySubject(programId?: number): Promise<any[]> {
    const pending = await this.getPendingSubjects(programId);
    const grouped = new Map<
      number,
      { pendingCount: number; failedCount: number; courseName: string }
    >();

    const courseIds = [...new Set(pending.map((p) => p.courseMoodleId))];
    const courses =
      courseIds.length > 0
        ? await this.courseRepository.find({
            where: courseIds.map((id) => ({ moodleId: id })),
          })
        : [];
    const courseMap = new Map(courses.map((c) => [String(c.moodleId), c]));

    for (const p of pending) {
      if (p.status === 'approved') continue;
      if (!grouped.has(p.courseMoodleId)) {
        grouped.set(p.courseMoodleId, {
          pendingCount: 0,
          failedCount: 0,
          courseName:
            courseMap.get(String(p.courseMoodleId))?.fullname ||
            courseMap.get(String(p.courseMoodleId))?.subjectName ||
            `Course ${p.courseMoodleId}`,
        });
      }
      const entry = grouped.get(p.courseMoodleId)!;
      if (p.status === 'pending') entry.pendingCount++;
      else entry.failedCount++;
    }

    return Array.from(grouped.entries())
      .map(([courseMoodleId, data]) => ({
        courseMoodleId,
        courseName: data.courseName,
        pendingCount: data.pendingCount,
        failedCount: data.failedCount,
        totalDemand: data.pendingCount + data.failedCount,
        studentsPerSection: 25,
        sectionsNeeded: Math.ceil(data.pendingCount / 25),
      }))
      .sort((a, b) => b.pendingCount - a.pendingCount);
  }

  async getDemandByLevel(programId?: number): Promise<any[]> {
    const pending = await this.getPendingSubjects(programId);
    const grouped = new Map<number, Set<number>>();

    for (const p of pending) {
      if (p.status === 'approved') continue;
      if (!grouped.has(p.level)) grouped.set(p.level, new Set());
      grouped.get(p.level)!.add(p.studentId);
    }

    return Array.from(grouped.entries())
      .map(([level, students]) => ({
        level,
        studentCount: students.size,
      }))
      .sort((a, b) => a.level - b.level);
  }

  async getSectionProjection(
    programId?: number,
    maxStudentsPerSection: number = 25,
  ): Promise<any[]> {
    const demand = await this.getDemandBySubject(programId);
    return demand.map((d) => ({
      courseMoodleId: d.courseMoodleId,
      courseName: d.courseName,
      pendingCount: d.pendingCount,
      sectionsNeeded: Math.ceil(d.pendingCount / maxStudentsPerSection),
    }));
  }

  async getProjectionMatrix(programId?: number): Promise<any[]> {
    const pending = await this.getPendingSubjects(programId);
    const students = new Map<number, any>();
    const courseIds = [...new Set(pending.map((p) => p.courseMoodleId))];
    const courses =
      courseIds.length > 0
        ? await this.courseRepository.find({
            where: courseIds.map((id) => ({ moodleId: id })),
          })
        : [];
    const courseMap = new Map(courses.map((c) => [String(c.moodleId), c]));

    for (const p of pending) {
      if (!students.has(p.studentId)) {
        students.set(p.studentId, {
          studentId: p.studentId,
          courses: [],
        });
      }
      students.get(p.studentId)!.courses.push({
        courseMoodleId: p.courseMoodleId,
        courseName:
          courseMap.get(String(p.courseMoodleId))?.fullname ||
          courseMap.get(String(p.courseMoodleId))?.subjectName ||
          `Course ${p.courseMoodleId}`,
        status: p.status === 'approved' ? 'approved' : 'pending',
      });
    }

    const rows = Array.from(students.values());

    const studentIds = rows.map((r) => r.studentId);
    const users =
      studentIds.length > 0
        ? await this.moodleUserRepository.find({
            where: studentIds.map((id) => ({ moodleId: id })),
          })
        : [];
    const userMap = new Map(users.map((u) => [Number(u.moodleId), u]));

    return rows.map((row) => {
      const moodleUser = userMap.get(row.studentId);
      const studentName = moodleUser
        ? [moodleUser.firstname, moodleUser.lastname]
            .filter(Boolean)
            .join(' ')
            .trim() || moodleUser.email
        : undefined;
      return { ...row, studentName };
    });
  }
}
