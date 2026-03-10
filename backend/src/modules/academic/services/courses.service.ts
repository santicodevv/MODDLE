import { Injectable, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import { MoodleCourse } from '../../moodle-integration/entities/moodle-course.entity';
import { MoodleEnrolment } from '../../moodle-integration/entities/moodle-enrolment.entity';
import { MoodleCategory } from '../../moodle-integration/entities/moodle-category.entity';
import { MoodleUser } from '../../moodle-integration/entities/moodle-user.entity';
import { MoodleClientService } from '../../moodle-integration/moodle-client.service';
import { CreateCourseDto } from '../dto/create-course.dto';
import { CourseTeacher } from '../entities/course-teacher.entity';
import { User } from '../../users/entities/user.entity';
import { AuditService } from '../../sync/services/audit.service';

export interface CoursesQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CourseWithCounts extends MoodleCourse {
  studentCount?: number;
  teacherCount?: number;
}

export interface EnrolledUserWithDetails {
  id: number;
  moodleId: number;
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  roleCode: string;
  enrolStatus: string;
  lastCourseAccess: Date | null;
}

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  constructor(
    @InjectRepository(MoodleCourse)
    private readonly courseRepository: Repository<MoodleCourse>,
    @InjectRepository(MoodleEnrolment)
    private readonly enrolmentRepository: Repository<MoodleEnrolment>,
    @InjectRepository(MoodleCategory)
    private readonly categoryRepository: Repository<MoodleCategory>,
    @InjectRepository(MoodleUser)
    private readonly moodleUserRepository: Repository<MoodleUser>,
    @InjectRepository(CourseTeacher)
    private readonly courseTeacherRepository: Repository<CourseTeacher>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly moodleClient: MoodleClientService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get all courses with pagination and searchs
   */
  async findAll(params: CoursesQueryParams) {
    const { page = 1, limit = 20, search } = params;
    const skip = (page - 1) * limit;

    const whereClause = search
      ? [
          { fullname: ILike(`%${search}%`) },
          { shortname: ILike(`%${search}%`) },
          { subjectName: ILike(`%${search}%`) },
        ]
      : {};

    const [courses, total] = await this.courseRepository.findAndCount({
      where: whereClause,
      order: { visible: 'DESC', fullname: 'ASC' },
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

  /**
   * Get all categories
   */
  async getCategories() {
    return this.categoryRepository.find({
      order: { name: 'ASC' },
    });
  }

  /**
   * Sync categories from Moodle
   */
  async syncCategories() {
    this.logger.log('Starting categories sync from Moodle...');

    const moodleCategories = await this.moodleClient.getCategories();

    this.logger.log(`Received ${moodleCategories?.length || 0} categories from Moodle`);
    this.logger.debug(`Categories data: ${JSON.stringify(moodleCategories)}`);

    if (!moodleCategories || !Array.isArray(moodleCategories) || moodleCategories.length === 0) {
      this.logger.warn('No categories received from Moodle');
      return { synced: 0 };
    }

    for (const mCat of moodleCategories) {
      let category = await this.categoryRepository.findOne({
        where: { moodleId: mCat.id },
      });

      if (category) {
        category.name = mCat.name;
        category.parent = mCat.parent;
        category.description = mCat.description || '';
        category.depth = mCat.depth;
        category.path = mCat.path;
        category.coursecount = mCat.coursecount;
        category.visible = mCat.visible === 1;
        category.timemodified = mCat.timemodified
          ? new Date(mCat.timemodified * 1000)
          : null;
        category.lastSyncedAt = new Date();
      } else {
        category = this.categoryRepository.create({
          moodleId: mCat.id,
          name: mCat.name,
          parent: mCat.parent,
          description: mCat.description || '',
          depth: mCat.depth,
          path: mCat.path,
          coursecount: mCat.coursecount,
          visible: mCat.visible === 1,
          lastSyncedAt: new Date(),
        });
        if (mCat.timemodified) {
          category.timemodified = new Date(mCat.timemodified * 1000);
        }
      }

      await this.categoryRepository.save(category);
      this.logger.log(`Saved category: ${mCat.name} (Moodle ID: ${mCat.id})`);
    }

    this.logger.log(`Categories sync completed. Total synced: ${moodleCategories.length}`);
    return { synced: moodleCategories.length };
  }

  /**
   * Update the subject name of a course (local only)
   */
  async updateSubjectName(courseId: number, subjectName: string) {
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }
    course.subjectName = subjectName;
    await this.courseRepository.save(course);
    return course;
  }

  /**
   * Create a new course in Moodle and save locally
   */
  async createCourse(data: CreateCourseDto) {
    this.logger.log(`Creating course: ${JSON.stringify(data)}`);

    // Ensure categoryid is a number
    const categoryId = Number(data.categoryid);
    if (isNaN(categoryId) || categoryId <= 0) {
      throw new BadRequestException('Invalid category ID');
    }

    // Verify category exists
    const category = await this.categoryRepository.findOne({
      where: { moodleId: categoryId },
    });

    this.logger.log(`Category lookup for moodleId ${data.categoryid}: ${category ? 'found' : 'not found'}`);

    if (!category) {
      throw new BadRequestException(
        `Category with Moodle ID ${categoryId} not found. Please sync categories first.`,
      );
    }

    // Create course in Moodle
    const moodlePayload = {
      fullname: data.fullname,
      shortname: data.shortname,
      categoryid: categoryId,
      idnumber: data.idnumber,
      summary: data.summary,
      visible: data.visible === false ? 0 : 1,
      startdate: data.startdate
        ? Math.floor(new Date(data.startdate).getTime() / 1000)
        : undefined,
      enddate: data.enddate
        ? Math.floor(new Date(data.enddate).getTime() / 1000)
        : undefined,
    };

    this.logger.log(`Sending to Moodle: ${JSON.stringify(moodlePayload)}`);

    let moodleResult;
    try {
      moodleResult = await this.moodleClient.createCourse(moodlePayload);
      this.logger.log(`Moodle response: ${JSON.stringify(moodleResult)}`);

      if (!moodleResult || moodleResult.length === 0) {
        throw new BadRequestException('Failed to create course in Moodle - empty response');
      }
    } catch (error) {
      this.logger.error(`Moodle create course error: ${error.message}`);
      throw new BadRequestException(`Error creating course in Moodle: ${error.message}`);
    }

    const createdMoodleCourse = moodleResult[0];

    // Save course locally
    const course = this.courseRepository.create({
      moodleId: createdMoodleCourse.id,
      shortname: data.shortname,
      fullname: data.fullname,
      categoryId: categoryId,
      visible: data.visible !== false,
      lastSyncedAt: new Date(),
    });

    if (data.idnumber) {
      course.idnumber = data.idnumber;
    }
    if (data.summary) {
      course.summary = data.summary;
    }
    if (data.startdate) {
      course.startdate = new Date(data.startdate);
    }
    if (data.enddate) {
      course.enddate = new Date(data.enddate);
    }
    if (data.subjectName) {
      course.subjectName = data.subjectName;
    }

    await this.courseRepository.save(course);

    return {
      ...course,
      studentCount: 0,
      teacherCount: 0,
    };
  }

  /**
   * Get courses where a user is enrolled
   */
  async getCoursesForUser(userMoodleId: number): Promise<CourseWithCounts[]> {
    // Find all enrollments for this user
    const enrolments = await this.enrolmentRepository.find({
      where: {
        userMoodleId,
        enrolStatus: 'active',
      },
    });

    if (enrolments.length === 0) {
      return [];
    }

    // Get unique course moodle IDs
    const courseMoodleIds = [...new Set(enrolments.map((e) => e.courseMoodleId))];

    // Get the courses
    const courses = await this.courseRepository
      .createQueryBuilder('course')
      .where('course.moodleId IN (:...ids)', { ids: courseMoodleIds })
      .orderBy('course.fullname', 'ASC')
      .getMany();

    // Add counts for each course
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

    return coursesWithCounts;
  }

  /**
   * Get enrolled users with their details
   */
  async getEnrolledUsersWithDetails(
    courseId: number,
  ): Promise<EnrolledUserWithDetails[]> {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      return [];
    }

    const enrolments = await this.enrolmentRepository.find({
      where: {
        courseMoodleId: course.moodleId,
        enrolStatus: 'active',
      },
    });

    const userMoodleIds = enrolments.map((e) => e.userMoodleId);

    if (userMoodleIds.length === 0) {
      return [];
    }

    const users = await this.moodleUserRepository
      .createQueryBuilder('user')
      .where('user.moodleId IN (:...ids)', { ids: userMoodleIds })
      .getMany();

    const userMap = new Map(users.map((u) => [u.moodleId, u]));

    return enrolments
      .map((enrolment) => {
        const user = userMap.get(enrolment.userMoodleId);
        if (!user) return null;

        return {
          id: user.id,
          moodleId: user.moodleId,
          username: user.username,
          email: user.email,
          firstname: user.firstname,
          lastname: user.lastname,
          roleCode: enrolment.roleCode,
          enrolStatus: enrolment.enrolStatus,
          lastCourseAccess: enrolment.lastCourseAccess,
        };
      })
      .filter((u): u is EnrolledUserWithDetails => u !== null);
  }

  /**
   * Delete a course (local only, does not delete from Moodle)
   */
  async delete(id: number): Promise<void> {
    const course = await this.courseRepository.findOne({ where: { id } });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    // Delete associated enrollments
    await this.enrolmentRepository.delete({ courseMoodleId: course.moodleId });

    // Delete the course
    await this.courseRepository.delete(id);

    this.logger.log(`Deleted course ${id} (Moodle ID: ${course.moodleId})`);
  }

  // =====================
  // TEACHER ASSIGNMENT METHODS
  // =====================

  /**
   * Assign teachers to a course
   */
  async assignTeachers(
    courseMoodleId: number,
    teacherIds: number[],
    adminUserId: number,
    courseName?: string,
  ): Promise<CourseTeacher[]> {
    // Verify teachers exist
    const teachers = await this.userRepository.find({
      where: { id: In(teacherIds), isActive: true },
    });

    if (teachers.length !== teacherIds.length) {
      const foundIds = teachers.map((t) => t.id);
      const notFoundIds = teacherIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(
        `Teachers not found: ${notFoundIds.join(', ')}`,
      );
    }

    // Check for existing assignments
    const existingAssignments = await this.courseTeacherRepository.find({
      where: {
        courseMoodleId,
        teacherId: In(teacherIds),
      },
    });

    const existingTeacherIds = existingAssignments.map((a) => Number(a.teacherId));
    const newTeacherIds = teacherIds.filter(
      (id) => !existingTeacherIds.includes(Number(id)),
    );

    if (newTeacherIds.length === 0) {
      return existingAssignments;
    }

    // Create new assignments
    const newAssignments = newTeacherIds.map((teacherId) =>
      this.courseTeacherRepository.create({
        courseMoodleId,
        courseName,
        teacherId,
        isPrimary: existingAssignments.length === 0 && newTeacherIds.indexOf(teacherId) === 0,
      }),
    );

    const savedAssignments = await this.courseTeacherRepository.save(newAssignments);

    await this.auditService.log({
      actorUserId: adminUserId,
      action: 'course.teachers_assigned',
      entity: 'course_teachers',
      entityKey: `${courseMoodleId}`,
      afterData: { teacherIds: newTeacherIds },
      source: 'app',
    });

    return [...existingAssignments, ...savedAssignments];
  }

  /**
   * Remove a teacher from a course
   */
  async removeTeacher(
    courseMoodleId: number,
    teacherId: number,
    adminUserId: number,
  ): Promise<void> {
    const assignment = await this.courseTeacherRepository.findOne({
      where: { courseMoodleId, teacherId },
    });

    if (!assignment) {
      throw new NotFoundException('Teacher assignment not found');
    }

    await this.courseTeacherRepository.delete(assignment.id);

    await this.auditService.log({
      actorUserId: adminUserId,
      action: 'course.teacher_removed',
      entity: 'course_teachers',
      entityKey: `${courseMoodleId}`,
      beforeData: assignment,
      source: 'app',
    });
  }

  /**
   * Get teachers assigned to a course
   */
  async getTeachersForCourse(courseMoodleId: number): Promise<CourseTeacher[]> {
    try {
      return await this.courseTeacherRepository.find({
        where: { courseMoodleId },
        relations: ['teacher'],
        order: { isPrimary: 'DESC', createdAt: 'ASC' },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching teachers for course ${courseMoodleId}: ${error.message}`,
        error.stack,
      );
      // Return empty array instead of crashing 
      return [];
    }
  }

  /**
   * Get all courses where a teacher is assigned (with full course details)
   */
  async getCoursesForTeacher(teacherId: number): Promise<CourseWithCounts[]> {
    // Get teacher's course assignments
    const assignments = await this.courseTeacherRepository.find({
      where: { teacherId },
      order: { createdAt: 'DESC' },
    });

    if (assignments.length === 0) {
      return [];
    }

    // Get the courseMoodleIds
    const courseMoodleIds = assignments.map((a) => a.courseMoodleId);

    // Get full course details
    const courses = await this.courseRepository.find({
      where: { moodleId: In(courseMoodleIds) },
    });

    // Add counts for each course
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

    return coursesWithCounts;
  }

  /**
   * Set a teacher as primary for a course
   */
  async setPrimaryTeacher(
    courseMoodleId: number,
    teacherId: number,
    adminUserId: number,
  ): Promise<CourseTeacher> {
    const assignment = await this.courseTeacherRepository.findOne({
      where: { courseMoodleId, teacherId },
    });

    if (!assignment) {
      throw new NotFoundException('Teacher assignment not found');
    }

    // Remove primary from all other teachers
    await this.courseTeacherRepository.update(
      { courseMoodleId },
      { isPrimary: false },
    );

    // Set this teacher as primary
    assignment.isPrimary = true;
    const updated = await this.courseTeacherRepository.save(assignment);

    await this.auditService.log({
      actorUserId: adminUserId,
      action: 'course.primary_teacher_set',
      entity: 'course_teachers',
      entityKey: `${courseMoodleId}`,
      afterData: { teacherId },
      source: 'app',
    });

    return updated;
  }
}
