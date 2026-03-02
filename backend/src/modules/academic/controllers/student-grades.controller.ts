import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { StudentGradesService } from '../services/student-grades.service';
import { UpdateStudentGradeDto } from '../dto/student-grade.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RoleCode } from '../../users/entities/role.entity';

@Controller('student-grades')
export class StudentGradesController {
  constructor(private readonly studentGradesService: StudentGradesService) {}

  /**
   * Get grades for a course by period (Teacher/Admin)
   * Returns all students with their grades
   */
  @Roles(RoleCode.ADMIN, RoleCode.TEACHER)
  @Get('course/:courseMoodleId')
  async getGradesByCourse(
    @Param('courseMoodleId', ParseIntPipe) courseMoodleId: number,
    @Query('periodId', ParseIntPipe) periodId: number,
    @Request() req: any,
  ) {
    return this.studentGradesService.getGradesByCourse(
      courseMoodleId,
      periodId,
      req.user?.id,
    );
  }

  /**
   * Update a student's grade (Teacher/Admin)
   */
  @Roles(RoleCode.ADMIN, RoleCode.TEACHER)
  @Patch('course/:courseMoodleId/student/:studentId')
  async updateGrade(
    @Param('courseMoodleId', ParseIntPipe) courseMoodleId: number,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query('periodId', ParseIntPipe) periodId: number,
    @Body() dto: UpdateStudentGradeDto,
    @Request() req: any,
  ) {
    return this.studentGradesService.updateGrade(
      courseMoodleId,
      studentId,
      periodId,
      dto,
      req.user.id,
    );
  }

  /**
   * Sync Moodle grade sums for all students in a course (Admin)
   */
  @Roles(RoleCode.ADMIN)
  @Post('course/:courseMoodleId/sync-sums')
  async syncMoodleSums(
    @Param('courseMoodleId', ParseIntPipe) courseMoodleId: number,
    @Query('periodId', ParseIntPipe) periodId: number,
    @Request() req: any,
  ) {
    return this.studentGradesService.syncMoodleSums(
      courseMoodleId,
      periodId,
      req.user.id,
    );
  }

  /**
   * Get my grades (Student)
   */
  @Roles(RoleCode.STUDENT)
  @Get('mine')
  async getMyGrades(@Request() req: any) {
    return this.studentGradesService.getMyGrades(req.user.id);
  }

  /**
   * Get my grades for a specific period (Student)
   */
  @Roles(RoleCode.STUDENT)
  @Get('mine/period/:periodId')
  async getMyGradesByPeriod(
    @Param('periodId', ParseIntPipe) periodId: number,
    @Request() req: any,
  ) {
    return this.studentGradesService.getMyGradesByPeriod(req.user.id, periodId);
  }
}
