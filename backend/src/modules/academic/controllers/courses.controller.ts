import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { CoursesService } from '../services/courses.service';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RoleCode } from '../../users/entities/role.entity';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  /**
   * Get all courses with pagination
   * Accessible by all authenticated users (for dropdowns, etc.)
   */
  @Roles(RoleCode.ADMIN, RoleCode.TEACHER, RoleCode.STUDENT)
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.coursesService.findAll({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
    });
  }

  /**
   * Get a single course by ID
   */
  @Roles(RoleCode.ADMIN, RoleCode.TEACHER)
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const course = await this.coursesService.findOne(id);
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }
    return course;
  }

  /**
   * Get course details with enrollments
   */
  @Roles(RoleCode.ADMIN, RoleCode.TEACHER)
  @Get(':id/details')
  async getCourseDetails(@Param('id', ParseIntPipe) id: number) {
    const details = await this.coursesService.getCourseDetails(id);
    if (!details) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }
    return details;
  }
}
