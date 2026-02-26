import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Role, RoleCode } from './entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.userRepository.create({
      email: createUserDto.email,
      passwordHash: hashedPassword,
      displayName: createUserDto.displayName,
      moodleUserId: createUserDto.moodleUserId,
    });

    return this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['roles'],
    });
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({ relations: ['roles'] });
  }

  async addRoleToUser(userId: number, roleCode: RoleCode): Promise<User> {
    const user = await this.findById(userId);
    const role = await this.roleRepository.findOne({ where: { code: roleCode } });

    if (!role) {
      throw new NotFoundException(`Role ${roleCode} not found`);
    }

    if (!user.roles) {
      user.roles = [];
    }

    const hasRole = user.roles.some((r) => r.code === roleCode);
    if (!hasRole) {
      user.roles.push(role);
      await this.userRepository.save(user);
    }

    return user;
  }

  async removeRoleFromUser(userId: number, roleCode: RoleCode): Promise<User> {
    const user = await this.findById(userId);
    user.roles = user.roles.filter((role) => role.code !== roleCode);
    return this.userRepository.save(user);
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}
