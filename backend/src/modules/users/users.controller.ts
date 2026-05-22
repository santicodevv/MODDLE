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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { RoleCode } from './entities/role.entity';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  /**
   * Admin-only endpoint to create a user with roles
   */
  @Roles(RoleCode.ADMIN)
  @Post('admin/create')
  async adminCreate(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Roles(RoleCode.ADMIN)
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('role') role?: string,
  ) {
    const isActiveParsed =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.usersService.findAllPaginated(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      search,
      isActiveParsed,
      role,
    );
  }

  @Roles(RoleCode.ADMIN)
  @Get('roles')
  async getRoles() {
    return this.usersService.getAllRoles();
  }

  /**
   * Get all users with teacher role
   */
  @Roles(RoleCode.ADMIN)
  @Get('teachers')
  async getTeachers() {
    return this.usersService.findTeachers();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<User> {
    return this.usersService.findById(id);
  }

  @Roles(RoleCode.ADMIN)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.updateUser(id, updateUserDto);
  }

  @Roles(RoleCode.ADMIN)
  @Post(':id/roles/:roleCode')
  async addRole(
    @Param('id', ParseIntPipe) id: number,
    @Param('roleCode') roleCode: RoleCode,
  ): Promise<User> {
    return this.usersService.addRoleToUser(id, roleCode);
  }
}
