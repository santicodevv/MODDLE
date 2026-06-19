// User types
import type { Role } from '@/modules/auth/types';

export interface User {
  username?: string;
  lastLoginAt?: string;
  id: number;
  email: string;
  displayName: string;
  isActive: boolean;
  moodleUserId?: number;
  roles: Role[];
  createdAt: string;
  updatedAt: string;
}

export interface MoodleUser {
  id: number;
  moodleId: number;
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  userType: 'student' | 'teacher' | 'other';
  suspended: boolean;
  timemodified?: string;
  lastSyncedAt?: string;
}

// Request types
export interface CreateUserRequest {
  email: string;
  password: string;
  displayName: string;
  roleIds?: number[];
}

export interface UpdateUserRequest {
  email?: string;
  displayName?: string;
  isActive?: boolean;
  moodleUserId?: number;
}

export interface AssignRolesRequest {
  roleIds: number[];
}

// Query params
export interface UsersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isActive?: boolean;
}
