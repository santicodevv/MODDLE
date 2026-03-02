import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CourseStudentGrade } from '../entities/course-student-grade.entity';
import { MoodleCourse } from '../../moodle-integration/entities/moodle-course.entity';
import { MoodleEnrolment } from '../../moodle-integration/entities/moodle-enrolment.entity';
import { MoodleGrade } from '../../moodle-integration/entities/moodle-grade.entity';
import { MoodleGradeItem } from '../../moodle-integration/entities/moodle-grade-item.entity';
import { User } from '../../users/entities/user.entity';
import { AuditService } from '../../sync/services/audit.service';
import { UpdateStudentGradeDto } from '../dto/student-grade.dto';

export interface StudentGradeWithDetails {
  id: number;
  courseMoodleId: number;
  courseName: string | null;
  courseShortname: string | null;
  studentId: number;
  studentName: string;
  studentEmail: string;
  periodId: number;
  moodleSumGrade: number | null;
  moodleSumMax: number | null;
  totalGrade: number | null;
  comment: string | null;
  updatedAt: Date;
}

export interface StudentCourseGrade {
  courseMoodleId: number;
  courseName: string;
  courseShortname: string;
  periodId: number;
  periodName: string;
  totalGrade: number | null;
  comment: string | null;
  teacherName: string | null;
}

@Injectable()
export class StudentGradesService {
  private readonly logger = new Logger(StudentGradesService.name);

  constructor(
    @InjectRepository(CourseStudentGrade)
    private readonly gradeRepository: Repository<CourseStudentGrade>,
    @InjectRepository(MoodleCourse)
    private readonly courseRepository: Repository<MoodleCourse>,
    @InjectRepository(MoodleEnrolment)
    private readonly enrolmentRepository: Repository<MoodleEnrolment>,
    @InjectRepository(MoodleGrade)
    private readonly moodleGradeRepository: Repository<MoodleGrade>,
    @InjectRepository(MoodleGradeItem)
    private readonly gradeItemRepository: Repository<MoodleGradeItem>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get all student grades for a course (for teacher/admin)
   */
  async getGradesByCourse(
    courseMoodleId: number,
    periodId: number,
    teacherId?: number,
  ): Promise<StudentGradeWithDetails[]> {
    // Get course info
    const course = await this.courseRepository.findOne({
      where: { moodleId: courseMoodleId },
    });

    if (!course) {
      throw new NotFoundException(`Course with Moodle ID ${courseMoodleId} not found`);
    }

    // Get students enrolled in the course
    const enrolments = await this.enrolmentRepository.find({
      where: {
        courseMoodleId,
        roleCode: 'student',
        enrolStatus: 'active',
      },
    });

    if (enrolments.length === 0) {
      return [];
    }

    // Get users (students)
    const studentMoodleIds = enrolments.map((e) => e.userMoodleId);
    const students = await this.userRepository
      .createQueryBuilder('user')
      .where('user.moodleUserId IN (:...ids)', { ids: studentMoodleIds })
      .getMany();

    const studentMap = new Map(students.map((s) => [s.moodleUserId, s]));

    // Get existing grades from our table
    const existingGrades = await this.gradeRepository.find({
      where: {
        courseMoodleId,
        periodId,
      },
    });

    const gradeMap = new Map(existingGrades.map((g) => [g.studentId, g]));

    // Calculate Moodle sum for each student
    const moodleSums = await this.calculateMoodleSums(courseMoodleId, studentMoodleIds);

    // Build result
    const results: StudentGradeWithDetails[] = [];

    for (const enrolment of enrolments) {
      const student = studentMap.get(enrolment.userMoodleId);
      if (!student) continue;

      const existingGrade = gradeMap.get(student.id);
      const moodleSum = moodleSums.get(enrolment.userMoodleId);

      results.push({
        id: existingGrade?.id ?? 0,
        courseMoodleId,
        courseName: course.fullname,
        courseShortname: course.shortname,
        studentId: student.id,
        studentName: student.displayName || `${student.email}`,
        studentEmail: student.email,
        periodId,
        moodleSumGrade: moodleSum?.sum ?? null,
        moodleSumMax: moodleSum?.max ?? null,
        totalGrade: existingGrade?.totalGrade ?? null,
        comment: existingGrade?.comment ?? null,
        updatedAt: existingGrade?.updatedAt ?? new Date(),
      });
    }

    return results.sort((a, b) => a.studentName.localeCompare(b.studentName));
  }

  /**
   * Calculate Moodle grade sums for students
   */
  private async calculateMoodleSums(
    courseMoodleId: number,
    studentMoodleIds: number[],
  ): Promise<Map<number, { sum: number; max: number }>> {
    const result = new Map<number, { sum: number; max: number }>();

    // Get grade items for the course
    const gradeItems = await this.gradeItemRepository.find({
      where: { courseMoodleId },
    });

    if (gradeItems.length === 0) {
      return result;
    }

    const itemMoodleIds = gradeItems.map((gi) => gi.itemMoodleId);
    const totalMax = gradeItems.reduce((sum, gi) => sum + (gi.grademax || 0), 0);

    // Get grades for all students
    for (const studentMoodleId of studentMoodleIds) {
      const grades = await this.moodleGradeRepository.find({
        where: {
          courseMoodleId,
          userMoodleId: studentMoodleId,
          itemMoodleId: In(itemMoodleIds),
        },
      });

      const sum = grades.reduce((total, g) => total + (g.grade || 0), 0);
      result.set(studentMoodleId, { sum, max: totalMax });
    }

    return result;
  }

  /**
   * Update or create a student grade (for teacher)
   */
  async updateGrade(
    courseMoodleId: number,
    studentId: number,
    periodId: number,
    dto: UpdateStudentGradeDto,
    teacherId: number,
  ): Promise<CourseStudentGrade> {
    // Get course info
    const course = await this.courseRepository.findOne({
      where: { moodleId: courseMoodleId },
    });

    if (!course) {
      throw new NotFoundException(`Course with Moodle ID ${courseMoodleId} not found`);
    }

    // Check if student exists
    const student = await this.userRepository.findOne({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found`);
    }

    // Find existing grade or create new
    let grade = await this.gradeRepository.findOne({
      where: {
        courseMoodleId,
        studentId,
        periodId,
      },
    });

    const isNew = !grade;
    const beforeData = grade ? { ...grade } : null;

    if (!grade) {
      grade = this.gradeRepository.create({
        courseMoodleId,
        studentId,
        periodId,
        teacherId,
        courseName: course.fullname,
        courseShortname: course.shortname,
      });
    }

    // Update fields
    if (dto.totalGrade !== undefined) {
      grade.totalGrade = dto.totalGrade;
    }
    if (dto.comment !== undefined) {
      grade.comment = dto.comment;
    }
    grade.teacherId = teacherId;

    const saved = await this.gradeRepository.save(grade);

    // Audit
    await this.auditService.log({
      actorUserId: teacherId,
      action: isNew ? 'student_grade.created' : 'student_grade.updated',
      entity: 'course_student_grades',
      entityKey: `${courseMoodleId}:${studentId}:${periodId}`,
      beforeData,
      afterData: saved,
      source: 'app',
    });

    return saved;
  }

  /**
   * Get student's own grades (for student dashboard)
   */
  async getMyGrades(studentId: number): Promise<StudentCourseGrade[]> {
    const grades = await this.gradeRepository.find({
      where: { studentId },
      relations: ['period', 'teacher'],
      order: { updatedAt: 'DESC' },
    });

    return grades.map((g) => ({
      courseMoodleId: g.courseMoodleId,
      courseName: g.courseName || 'Curso',
      courseShortname: g.courseShortname || '',
      periodId: g.periodId,
      periodName: g.period?.name || '',
      totalGrade: g.totalGrade,
      comment: g.comment,
      teacherName: g.teacher?.displayName || null,
    }));
  }

  /**
   * Get student's grades for a specific period
   */
  async getMyGradesByPeriod(
    studentId: number,
    periodId: number,
  ): Promise<StudentCourseGrade[]> {
    const grades = await this.gradeRepository.find({
      where: { studentId, periodId },
      relations: ['period', 'teacher'],
    });

    return grades.map((g) => ({
      courseMoodleId: g.courseMoodleId,
      courseName: g.courseName || 'Curso',
      courseShortname: g.courseShortname || '',
      periodId: g.periodId,
      periodName: g.period?.name || '',
      totalGrade: g.totalGrade,
      comment: g.comment,
      teacherName: g.teacher?.displayName || null,
    }));
  }

  /**
   * Batch update grades (for admin to sync Moodle sums)
   */
  async syncMoodleSums(
    courseMoodleId: number,
    periodId: number,
    teacherId: number,
  ): Promise<{ updated: number }> {
    const course = await this.courseRepository.findOne({
      where: { moodleId: courseMoodleId },
    });

    if (!course) {
      throw new NotFoundException(`Course with Moodle ID ${courseMoodleId} not found`);
    }

    const enrolments = await this.enrolmentRepository.find({
      where: {
        courseMoodleId,
        roleCode: 'student',
        enrolStatus: 'active',
      },
    });

    const studentMoodleIds = enrolments.map((e) => e.userMoodleId);
    const moodleSums = await this.calculateMoodleSums(courseMoodleId, studentMoodleIds);

    // Get students
    const students = await this.userRepository
      .createQueryBuilder('user')
      .where('user.moodleUserId IN (:...ids)', { ids: studentMoodleIds })
      .getMany();

    const studentMap = new Map(students.map((s) => [s.moodleUserId, s]));

    let updated = 0;

    for (const enrolment of enrolments) {
      const student = studentMap.get(enrolment.userMoodleId);
      if (!student) continue;

      const moodleSum = moodleSums.get(enrolment.userMoodleId);
      if (!moodleSum) continue;

      let grade = await this.gradeRepository.findOne({
        where: {
          courseMoodleId,
          studentId: student.id,
          periodId,
        },
      });

      if (!grade) {
        grade = this.gradeRepository.create({
          courseMoodleId,
          studentId: student.id,
          periodId,
          teacherId,
          courseName: course.fullname,
          courseShortname: course.shortname,
        });
      }

      grade.moodleSumGrade = moodleSum.sum;
      grade.moodleSumMax = moodleSum.max;

      await this.gradeRepository.save(grade);
      updated++;
    }

    return { updated };
  }
}
