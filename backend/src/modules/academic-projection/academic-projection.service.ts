import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademicProgram } from './entities/academic-program.entity';
import { StudyPlan } from './entities/study-plan.entity';
import { StudentProgram } from './entities/student-program.entity';
import { MoodleCourse } from '../moodle-integration/entities/moodle-course.entity';
import { MoodleUser } from '../moodle-integration/entities/moodle-user.entity';
import { CreateAcademicProgramDto } from './dto/create-academic-program.dto';
import { UpdateAcademicProgramDto } from './dto/update-academic-program.dto';
import { CreateStudyPlanDto } from './dto/create-study-plan.dto';
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
    const courseMap = new Map(courses.map((c) => [Number(c.moodleId), c]));
    return plans.map((plan) => ({
      ...plan,
      courseName:
        courseMap.get(Number(plan.courseMoodleId))?.fullname ||
        courseMap.get(Number(plan.courseMoodleId))?.subjectName ||
        'Unknown',
    }));
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
    const courseMap = new Map(courses.map((c) => [Number(c.moodleId), c]));

    for (const p of pending) {
      if (p.status === 'approved') continue;
      if (!grouped.has(p.courseMoodleId)) {
        grouped.set(p.courseMoodleId, {
          pendingCount: 0,
          failedCount: 0,
          courseName:
            courseMap.get(Number(p.courseMoodleId))?.fullname ||
            courseMap.get(Number(p.courseMoodleId))?.subjectName ||
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
    const courseMap = new Map(courses.map((c) => [Number(c.moodleId), c]));

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
          courseMap.get(Number(p.courseMoodleId))?.fullname ||
          courseMap.get(Number(p.courseMoodleId))?.subjectName ||
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
