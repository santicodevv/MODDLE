import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
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

  @Roles(RoleCode.ADMIN)
  @Get()
  async findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<User> {
    return this.usersService.findById(id);
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
