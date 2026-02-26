import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { MoodleClientService } from './moodle-client.service';
import { MoodleUser } from './entities/moodle-user.entity';
import { MoodleCourse } from './entities/moodle-course.entity';
import { MoodleEnrolment } from './entities/moodle-enrolment.entity';
import { MoodleGradeItem } from './entities/moodle-grade-item.entity';
import { MoodleGrade } from './entities/moodle-grade.entity';
import { User } from '../users/entities/user.entity';
import { Role, RoleCode } from '../users/entities/role.entity';

@Injectable()
export class MoodleSyncService {
  private readonly logger = new Logger(MoodleSyncService.name);

  constructor(
    private readonly moodleClient: MoodleClientService,
    @InjectRepository(MoodleUser)
    private readonly moodleUserRepository: Repository<MoodleUser>,
    @InjectRepository(MoodleCourse)
    private readonly moodleCourseRepository: Repository<MoodleCourse>,
    @InjectRepository(MoodleEnrolment)
    private readonly moodleEnrolmentRepository: Repository<MoodleEnrolment>,
    @InjectRepository(MoodleGradeItem)
    private readonly moodleGradeItemRepository: Repository<MoodleGradeItem>,
    @InjectRepository(MoodleGrade)
    private readonly moodleGradeRepository: Repository<MoodleGrade>,
    @InjectRepository(User)
    private readonly appUserRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async syncUsers(sinceTimestamp?: number): Promise<void> {
    this.logger.log('Starting user sync...');

    try {
      const moodleUsers = await this.moodleClient.getUsers();
      let syncedCount = 0;

      for (const mUser of moodleUsers) {
        // Skip if doing incremental sync and user hasn't been modified
        if (sinceTimestamp && mUser.timemodified && mUser.timemodified < sinceTimestamp) {
          continue;
        }

        const existingUser = await this.moodleUserRepository.findOne({
          where: { moodleId: mUser.id },
        });

        const userType = this.determineUserType(mUser);
        const userData = {
          moodleId: mUser.id,
          username: mUser.username,
          email: mUser.email,
          firstname: mUser.firstname,
          lastname: mUser.lastname,
          userType,
          suspended: mUser.suspended || false,
          timemodified: mUser.timemodified ? new Date(mUser.timemodified * 1000) : undefined,
          lastSyncedAt: new Date(),
        };

        if (existingUser) {
          await this.moodleUserRepository.update(existingUser.id, userData);
        } else {
          await this.moodleUserRepository.save(userData);
        }

        // Also create/update app_user for login capability
        await this.syncAppUser(mUser, userType);
        syncedCount++;
      }

      this.logger.log(`Synced ${syncedCount} users`);
    } catch (error) {
      this.logger.error(`Error syncing users: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create or update an app_user from a Moodle user
   * This allows the user to login to the application
   */
  private async syncAppUser(moodleUser: any, userType: string): Promise<void> {
    if (!moodleUser.email) {
      this.logger.warn(`Skipping app_user creation for Moodle user ${moodleUser.id}: no email`);
      return;
    }

    try {
      const existingAppUser = await this.appUserRepository.findOne({
        where: { moodleUserId: moodleUser.id },
        relations: ['roles'],
      });

      // Determine role based on userType
      const roleCode = this.mapUserTypeToRole(userType);
      const role = await this.roleRepository.findOne({ where: { code: roleCode } });

      if (!role) {
        this.logger.warn(`Role ${roleCode} not found, skipping app_user sync for ${moodleUser.email}`);
        return;
      }

      const displayName = `${moodleUser.firstname || ''} ${moodleUser.lastname || ''}`.trim() || moodleUser.username;

      if (existingAppUser) {
        // Update existing app_user
        existingAppUser.email = moodleUser.email;
        existingAppUser.displayName = displayName;
        existingAppUser.isActive = !moodleUser.suspended;

        // Add role if not already assigned
        if (!existingAppUser.roles.some(r => r.code === roleCode)) {
          existingAppUser.roles.push(role);
        }

        await this.appUserRepository.save(existingAppUser);
      } else {
        // Check if user exists by email (might have been created manually)
        const existingByEmail = await this.appUserRepository.findOne({
          where: { email: moodleUser.email },
          relations: ['roles'],
        });

        if (existingByEmail) {
          // Link existing user to Moodle
          existingByEmail.moodleUserId = moodleUser.id;
          existingByEmail.displayName = displayName;
          if (!existingByEmail.roles.some(r => r.code === roleCode)) {
            existingByEmail.roles.push(role);
          }
          await this.appUserRepository.save(existingByEmail);
        } else {
          // Create new app_user with default password (user should reset)
          const defaultPassword = await bcrypt.hash(`Moodle${moodleUser.id}!`, 10);

          const newAppUser = this.appUserRepository.create({
            email: moodleUser.email,
            passwordHash: defaultPassword,
            displayName,
            moodleUserId: moodleUser.id,
            isActive: !moodleUser.suspended,
            roles: [role],
          });

          await this.appUserRepository.save(newAppUser);
          this.logger.log(`Created app_user for ${moodleUser.email} with role ${roleCode}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error syncing app_user for Moodle user ${moodleUser.id}: ${error.message}`);
      // Don't throw - continue with other users
    }
  }

  private mapUserTypeToRole(userType: string): RoleCode {
    switch (userType) {
      case 'teacher':
        return RoleCode.TEACHER;
      case 'student':
        return RoleCode.STUDENT;
      default:
        return RoleCode.STUDENT; // Default to student
    }
  }

  async syncCourses(sinceTimestamp?: number): Promise<void> {
    this.logger.log('Starting course sync...');

    try {
      const moodleCourses = await this.moodleClient.getCourses();
      let syncedCount = 0;

      for (const mCourse of moodleCourses) {
        // Skip if doing incremental sync and course hasn't been modified
        if (sinceTimestamp && mCourse.timemodified && mCourse.timemodified < sinceTimestamp) {
          continue;
        }

        const existingCourse = await this.moodleCourseRepository.findOne({
          where: { moodleId: mCourse.id },
        });

        const courseData = {
          moodleId: mCourse.id,
          shortname: mCourse.shortname,
          fullname: mCourse.fullname,
          categoryId: mCourse.category,
          visible: mCourse.visible === 1,
          startdate: mCourse.startdate ? new Date(mCourse.startdate * 1000) : undefined,
          enddate: mCourse.enddate ? new Date(mCourse.enddate * 1000) : undefined,
          timemodified: mCourse.timemodified ? new Date(mCourse.timemodified * 1000) : undefined,
          lastSyncedAt: new Date(),
        };

        if (existingCourse) {
          await this.moodleCourseRepository.update(existingCourse.id, courseData);
        } else {
          await this.moodleCourseRepository.save(courseData);
        }
        syncedCount++;
      }

      this.logger.log(`Synced ${syncedCount} courses`);
    } catch (error) {
      this.logger.error(`Error syncing courses: ${error.message}`);
      throw error;
    }
  }

  async syncEnrolments(courseMoodleId: number): Promise<void> {
    this.logger.log(`Starting enrolment sync for course ${courseMoodleId}...`);

    try {
      const enrolledUsers = await this.moodleClient.getEnrolledUsers(courseMoodleId);

      for (const enrollment of enrolledUsers) {
        for (const role of enrollment.roles || []) {
          const existingEnrolment = await this.moodleEnrolmentRepository.findOne({
            where: {
              courseMoodleId,
              userMoodleId: enrollment.id,
              roleCode: role.shortname,
            },
          });

          const enrolmentData = {
            courseMoodleId,
            userMoodleId: enrollment.id,
            roleCode: role.shortname,
            enrolStatus: 'active',
            lastCourseAccess: enrollment.lastcourseaccess
              ? new Date(enrollment.lastcourseaccess * 1000)
              : null,
            lastSyncedAt: new Date(),
          };

          if (existingEnrolment) {
            await this.moodleEnrolmentRepository.update(
              existingEnrolment.id,
              enrolmentData,
            );
          } else {
            await this.moodleEnrolmentRepository.save(enrolmentData);
          }
        }
      }

      this.logger.log(`Synced enrolments for course ${courseMoodleId}`);
    } catch (error) {
      this.logger.error(`Error syncing enrolments for course ${courseMoodleId}: ${error.message}`);
      throw error;
    }
  }

  async syncAllEnrolments(): Promise<number> {
    this.logger.log('Starting enrolments sync for all courses...');

    const courses = await this.moodleCourseRepository.find();
    let totalEnrolments = 0;

    for (const course of courses) {
      try {
        await this.syncEnrolments(course.moodleId);
        const count = await this.moodleEnrolmentRepository.count({
          where: { courseMoodleId: course.moodleId },
        });
        totalEnrolments += count;
      } catch (error) {
        this.logger.warn(`Failed to sync enrolments for course ${course.moodleId}: ${error.message}`);
        // Continue with other courses
      }
    }

    this.logger.log(`Synced enrolments for ${courses.length} courses (${totalEnrolments} total enrolments)`);
    return totalEnrolments;
  }

  async syncGradeItems(courseMoodleId: number): Promise<void> {
    this.logger.log(`Starting grade items sync for course ${courseMoodleId}...`);

    try {
      const gradeData = await this.moodleClient.getGrades(courseMoodleId);

      if (!gradeData?.usergrades || gradeData.usergrades.length === 0) {
        this.logger.debug(`No grade data found for course ${courseMoodleId}`);
        return;
      }

      // Get grade items from the first user's grades (structure is same for all users)
      const gradeItems = gradeData.usergrades[0]?.gradeitems || [];

      for (const item of gradeItems) {
        const existingItem = await this.moodleGradeItemRepository.findOne({
          where: {
            courseMoodleId,
            itemMoodleId: item.id,
          },
        });

        const itemData = {
          courseMoodleId,
          itemMoodleId: item.id,
          itemname: item.itemname || item.cmid?.toString() || 'Unknown',
          itemtype: item.itemtype || 'mod',
          grademax: item.grademax || 100,
          grademin: item.grademin || 0,
          weight: item.weightraw || null,
          lastSyncedAt: new Date(),
        };

        if (existingItem) {
          await this.moodleGradeItemRepository.update(existingItem.id, itemData);
        } else {
          await this.moodleGradeItemRepository.save(itemData);
        }
      }

      this.logger.log(`Synced ${gradeItems.length} grade items for course ${courseMoodleId}`);
    } catch (error) {
      this.logger.error(`Error syncing grade items for course ${courseMoodleId}: ${error.message}`);
      throw error;
    }
  }

  async syncAllGradeItems(): Promise<number> {
    this.logger.log('Starting grade items sync for all courses...');

    const courses = await this.moodleCourseRepository.find();
    let totalItems = 0;

    for (const course of courses) {
      try {
        await this.syncGradeItems(course.moodleId);
        const count = await this.moodleGradeItemRepository.count({
          where: { courseMoodleId: course.moodleId },
        });
        totalItems += count;
      } catch (error) {
        this.logger.warn(`Failed to sync grade items for course ${course.moodleId}: ${error.message}`);
        // Continue with other courses
      }
    }

    this.logger.log(`Synced grade items for ${courses.length} courses (${totalItems} total items)`);
    return totalItems;
  }

  async syncGrades(courseMoodleId: number, sinceTimestamp?: number): Promise<void> {
    this.logger.log(`Starting grades sync for course ${courseMoodleId}...`);

    try {
      const gradeData = await this.moodleClient.getGrades(courseMoodleId);

      if (!gradeData?.usergrades || gradeData.usergrades.length === 0) {
        this.logger.debug(`No grade data found for course ${courseMoodleId}`);
        return;
      }

      let gradesCount = 0;

      for (const userGrade of gradeData.usergrades) {
        const userId = userGrade.userid;
        const gradeItems = userGrade.gradeitems || [];

        for (const item of gradeItems) {
          // Skip if no grade value
          if (item.graderaw === null && item.gradeformatted === '-') {
            continue;
          }

          // Skip if doing incremental sync and grade hasn't been modified
          if (sinceTimestamp && item.gradedategraded && item.gradedategraded < sinceTimestamp) {
            continue;
          }

          const existingGrade = await this.moodleGradeRepository.findOne({
            where: {
              courseMoodleId,
              itemMoodleId: item.id,
              userMoodleId: userId,
            },
          });

          const gradeValue = item.graderaw !== null ? item.graderaw : null;

          const gradeDataToSave = {
            courseMoodleId,
            itemMoodleId: item.id,
            userMoodleId: userId,
            grade: gradeValue,
            feedback: item.feedback || undefined,
            timemodified: item.gradedategraded
              ? new Date(item.gradedategraded * 1000)
              : undefined,
            lastSyncedAt: new Date(),
          };

          if (existingGrade) {
            await this.moodleGradeRepository.update(existingGrade.id, gradeDataToSave);
          } else {
            await this.moodleGradeRepository.save(gradeDataToSave);
          }
          gradesCount++;
        }
      }

      this.logger.log(`Synced ${gradesCount} grades for course ${courseMoodleId}`);
    } catch (error) {
      this.logger.error(`Error syncing grades for course ${courseMoodleId}: ${error.message}`);
      throw error;
    }
  }

  async syncAllGrades(sinceTimestamp?: number): Promise<number> {
    this.logger.log('Starting grades sync for all courses...');

    const courses = await this.moodleCourseRepository.find();
    let totalGrades = 0;

    for (const course of courses) {
      try {
        await this.syncGrades(course.moodleId, sinceTimestamp);
        const count = await this.moodleGradeRepository.count({
          where: { courseMoodleId: course.moodleId },
        });
        totalGrades += count;
      } catch (error) {
        this.logger.warn(`Failed to sync grades for course ${course.moodleId}: ${error.message}`);
        // Continue with other courses
      }
    }

    this.logger.log(`Synced grades for ${courses.length} courses (${totalGrades} total grades)`);
    return totalGrades;
  }

  async syncAll(): Promise<void> {
    this.logger.log('Starting full sync...');

    await this.syncUsers();
    await this.syncCourses();
    await this.syncAllEnrolments();
    await this.syncAllGradeItems();
    await this.syncAllGrades();

    this.logger.log('Full sync completed!');
  }

  private determineUserType(moodleUser: any): string {
    // Lógica simple para determinar el tipo de usuario
    // Esto puede refinarse según las necesidades específicas
    if (moodleUser.username?.includes('student')) return 'student';
    if (moodleUser.username?.includes('teacher')) return 'teacher';
    return 'other';
  }
}
