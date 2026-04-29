import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Role, RoleCode } from './entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { MoodleClientService } from '../moodle-integration/moodle-client.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly moodleClient: MoodleClientService,
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
      isActive: createUserDto.isActive ?? true,
    });

    // Assign roles if provided
    if (createUserDto.roleIds && createUserDto.roleIds.length > 0) {
      const roles = await this.roleRepository.findByIds(createUserDto.roleIds);
      user.roles = roles;
    }

    return this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['roles'],
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { username },
      relations: ['roles'],
    });
  }

  async findByEmailOrUsername(identifier: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: [
        { email: identifier },
        { username: identifier },
      ],
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

  /**
   * Get all available roles
   */
  async getAllRoles(): Promise<Role[]> {
    return this.roleRepository.find({ order: { id: 'ASC' } });
  }

  /**
   * Paginated user search
   */
  async findAllPaginated(
    page: number = 1,
    limit: number = 20,
    search?: string,
  ): Promise<{ users: User[]; total: number; page: number; limit: number }> {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .select([
        'user.id',
        'user.email',
        'user.displayName',
        'user.moodleUserId',
        'user.isActive',
        'user.createdAt',
        'user.updatedAt',
        'roles.id',
        'roles.code',
        'roles.description',
      ]);

    if (search && search.trim()) {
      qb.where(
        '(user.email ILIKE :search OR user.displayName ILIKE :search)',
        { search: `%${search.trim()}%` },
      );
    }

    qb.orderBy('user.id', 'ASC');

    const total = await qb.getCount();
    const users = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { users, total, page, limit };
  }

  /**
   * Update a user and sync to Moodle
   */
  async updateUser(id: number, updateDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    // Update local fields
    if (updateDto.email !== undefined) {
      // Check email uniqueness
      if (updateDto.email !== user.email) {
        const existing = await this.userRepository.findOne({
          where: { email: updateDto.email },
        });
        if (existing) {
          throw new ConflictException('Email already in use');
        }
      }
      user.email = updateDto.email;
    }

    if (updateDto.displayName !== undefined) {
      user.displayName = updateDto.displayName;
    }

    if (updateDto.isActive !== undefined) {
      user.isActive = updateDto.isActive;
    }

    if (updateDto.password) {
      user.passwordHash = await bcrypt.hash(updateDto.password, 10);
    }

    // Update roles if provided
    if (updateDto.roleIds !== undefined) {
      const roles = await this.roleRepository.findByIds(updateDto.roleIds);
      user.roles = roles;
    }

    const saved = await this.userRepository.save(user);

    // Sync to Moodle if user is linked
    if (user.moodleUserId) {
      try {
        const moodleData: any = {};
        if (updateDto.email) moodleData.email = updateDto.email;
        if (updateDto.password) moodleData.password = updateDto.password;
        if (updateDto.isActive !== undefined) moodleData.suspended = !updateDto.isActive;

        // Split displayName into firstname/lastname for Moodle
        if (updateDto.displayName) {
          const parts = updateDto.displayName.trim().split(/\s+/);
          moodleData.firstname = parts[0] || '';
          moodleData.lastname = parts.slice(1).join(' ') || '';
        }

        if (Object.keys(moodleData).length > 0) {
          await this.moodleClient.updateUser(user.moodleUserId, moodleData);
          this.logger.log(`Synced user ${id} to Moodle (moodleId: ${user.moodleUserId})`);
        }
      } catch (error) {
        this.logger.error(`Failed to sync user ${id} to Moodle: ${error.message}`);
        // Don't throw — local update succeeded, Moodle sync failed
      }
    }

    return saved;
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

  /**
   * Get all users with teacher role
   */
  async findTeachers(): Promise<{ id: number; email: string; displayName: string | null }[]> {
    const users = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .where('role.code = :code', { code: RoleCode.TEACHER })
      .andWhere('user.isActive = true')
      .select(['user.id', 'user.email', 'user.displayName'])
      .orderBy('user.displayName', 'ASC')
      .getMany();

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
    }));
  }

  /**
   * SSO: Find or create user from Microsoft Identity.
   *
   * Linking logic:
   * 1. ¿Existe ya un usuario con este email institucional? → usarlo directamente.
   * 2. ¿No? → Extraer el prefijo (ej: "welin1924" de welin1924@sebti.edu.do)
   *    y buscar si hay un usuario con ese mismo prefijo pero otro dominio (ej: welin1924@gmail.com).
   * 3. Si lo encuentra → VINCULAR: actualizar su email al institucional para que
   *    todos sus datos (notas, cursos, etc.) queden accesibles.
   * 4. Si no encuentra nada → crear cuenta nueva con rol STUDENT.
   */
  async findOrCreateSSOUser(profile: { email: string; displayName: string; microsoftId: string }): Promise<User> {
    // 1. Buscar por email institucional exacto
    const existingByEmail = await this.userRepository.findOne({
      where: { email: profile.email },
      relations: ['roles'],
    });

    if (existingByEmail) {
      if (!existingByEmail.isActive) {
        throw new ConflictException('La cuenta de usuario está inactiva');
      }
      this.logger.log(`SSO login: found existing user by email ${profile.email}`);
      return existingByEmail;
    }

    // 2. Extraer el prefijo del correo institucional (ej: "welin1924")
    const usernamePart = profile.email.split('@')[0];

    // 3. Buscar si existe un usuario con ese mismo prefijo en otro dominio
    //    Usamos ILIKE para búsqueda insensible a mayúsculas
    const linkedUser = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .where('user.email ILIKE :pattern', { pattern: `${usernamePart}@%` })
      .andWhere('user.email != :institutionalEmail', { institutionalEmail: profile.email })
      .getOne();

    if (linkedUser) {
      if (!linkedUser.isActive) {
        throw new ConflictException('La cuenta de usuario está inactiva');
      }

      // Vincular: actualizar el email al institucional para que el login SSO
      // funcione directamente en el futuro y todos los datos se preserven
      this.logger.log(
        `SSO account linking: merging ${linkedUser.email} → ${profile.email} (prefix: "${usernamePart}")`,
      );

      linkedUser.email = profile.email;

      // Actualizar displayName solo si el actual está vacío
      if (!linkedUser.displayName && profile.displayName) {
        linkedUser.displayName = profile.displayName;
      }

      return this.userRepository.save(linkedUser);
    }

    // 4. No hay cuenta previa → crear usuario nuevo con rol STUDENT
    this.logger.log(`SSO provisioning new user: ${profile.email}`);

    const dummyPasswordHash = await bcrypt.hash(profile.microsoftId + Date.now().toString(), 10);

    const newUser = this.userRepository.create({
      email: profile.email,
      passwordHash: dummyPasswordHash,
      displayName: profile.displayName,
      isActive: true,
    });

    const studentRole = await this.roleRepository.findOne({ where: { code: RoleCode.STUDENT } });
    if (studentRole) {
      newUser.roles = [studentRole];
    }

    return this.userRepository.save(newUser);
  }
}

