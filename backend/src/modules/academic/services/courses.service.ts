import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { MoodleCourse } from '../../moodle-integration/entities/moodle-course.entity';
import { MoodleEnrolment } from '../../moodle-integration/entities/moodle-enrolment.entity';

export interface CoursesQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CourseWithCounts extends MoodleCourse {
  studentCount?: number;
  teacherCount?: number;
}

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(MoodleCourse)
    private readonly courseRepository: Repository<MoodleCourse>,
    @InjectRepository(MoodleEnrolment)
    private readonly enrolmentRepository: Repository<MoodleEnrolment>,
  ) {}

  /**
   * Get all courses with pagination and search
   */
  async findAll(params: CoursesQueryParams) {
    const { page = 1, limit = 20, search } = params;
    const skip = (page - 1) * limit;

    const whereClause = search
      ? [
          { fullname: ILike(`%${search}%`) },
          { shortname: ILike(`%${search}%`) },
        ]
      : {};

    const [courses, total] = await this.courseRepository.findAndCount({
      where: whereClause,
      order: { fullname: 'ASC' },
      skip,
      take: limit,
    });

    // Get student and teacher counts for each course
    const coursesWithCounts: CourseWithCounts[] = await Promise.all(
      courses.map(async (course) => {
        const [studentCount, teacherCount] = await Promise.all([
          this.enrolmentRepository.count({
            where: {
              courseMoodleId: course.moodleId,
              roleCode: 'student',
              enrolStatus: 'active',
            },
          }),
          this.enrolmentRepository.count({
            where: {
              courseMoodleId: course.moodleId,
              roleCode: ILike('%teacher%'),
              enrolStatus: 'active',
            },
          }),
        ]);

        return {
          ...course,
          studentCount,
          teacherCount,
        };
      }),
    );

    return {
      courses: coursesWithCounts,
      total,
      page,
      limit,
    };
  }

  /**
   * Get a single course by ID
   */
  async findOne(id: number) {
    const course = await this.courseRepository.findOne({
      where: { id },
    });

    if (!course) {
      return null;
    }

    // Get counts
    const [studentCount, teacherCount] = await Promise.all([
      this.enrolmentRepository.count({
        where: {
          courseMoodleId: course.moodleId,
          roleCode: 'student',
          enrolStatus: 'active',
        },
      }),
      this.enrolmentRepository.count({
        where: {
          courseMoodleId: course.moodleId,
          roleCode: ILike('%teacher%'),
          enrolStatus: 'active',
        },
      }),
    ]);

    return {
      ...course,
      studentCount,
      teacherCount,
    };
  }

  /**
   * Get course details with enrolled students and teachers
   */
  async getCourseDetails(id: number) {
    const course = await this.findOne(id);
    if (!course) {
      return null;
    }

    const enrolments = await this.enrolmentRepository.find({
      where: {
        courseMoodleId: course.moodleId,
        enrolStatus: 'active',
      },
    });

    const students = enrolments.filter((e) => e.roleCode === 'student');
    const teachers = enrolments.filter((e) =>
      e.roleCode.toLowerCase().includes('teacher'),
    );

    return {
      ...course,
      students,
      teachers,
    };
  }
}
