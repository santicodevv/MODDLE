import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { GradesService } from '../services/grades.service';
import { CreateGradeDto } from '../dto/create-grade.dto';
import { UpdateGradeDto } from '../dto/update-grade.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RoleCode } from '../../users/entities/role.entity';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';

@Controller('grades')
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  /**
   * Crear una nueva calificación
   * Solo profesores y administradores
   */
  @Roles(RoleCode.TEACHER, RoleCode.ADMIN)
  @Post()
  async create(
    @Body() createDto: CreateGradeDto,
    @CurrentUser() user: User,
  ) {
    return this.gradesService.create(createDto, user.id);
  }

  /**
   * Actualizar una calificación existente
   * Solo el profesor propietario o administradores
   */
  @Roles(RoleCode.TEACHER, RoleCode.ADMIN)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateGradeDto,
    @CurrentUser() user: User,
  ) {
    return this.gradesService.update(id, updateDto, user.id);
  }

  /**
   * Obtener mis calificaciones capturadas (como profesor)
   * Filtrado opcional por curso y período
   */
  @Roles(RoleCode.TEACHER, RoleCode.ADMIN)
  @Get('my-grades')
  async getMyGrades(
    @CurrentUser() user: User,
    @Query('courseId', ParseIntPipe) courseId?: number,
    @Query('periodId', ParseIntPipe) periodId?: number,
  ) {
    return this.gradesService.findByTeacher(user.id, courseId, periodId);
  }

  /**
   * Obtener calificaciones de un estudiante
   * Los estudiantes solo pueden ver las suyas propias
   * Profesores y admins pueden ver cualquiera
   */
  @Roles(RoleCode.STUDENT, RoleCode.TEACHER, RoleCode.ADMIN)
  @Get('student/:studentId')
  async getStudentGrades(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query('periodId', ParseIntPipe) periodId: number | undefined,
    @CurrentUser() user: User,
  ) {
    // Validar que estudiantes solo vean sus propias calificaciones
    const isStudent = user.roles.some((role) => role.code === RoleCode.STUDENT);
    if (isStudent && user.id !== studentId) {
      throw new Error('No tiene permisos para ver calificaciones de otros estudiantes');
    }

    return this.gradesService.findByStudent(studentId, periodId);
  }

  /**
   * Obtener calificaciones por curso
   * Solo profesores y administradores
   */
  @Roles(RoleCode.TEACHER, RoleCode.ADMIN)
  @Get('course/:courseId')
  async getCourseGrades(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Query('gradeItemId', ParseIntPipe) gradeItemId?: number,
  ) {
    return this.gradesService.findByCourse(courseId, gradeItemId);
  }

  /**
   * Obtener una calificación específica
   */
  @Roles(RoleCode.TEACHER, RoleCode.ADMIN)
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.gradesService.findOne(id);
  }
}
