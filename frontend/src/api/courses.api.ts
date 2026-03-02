// Courses API service
import { api } from '@/lib';
import type {
  MoodleCourse,
  CourseWithStats,
  EnrolledStudent,
  MoodleEnrolment,
  CoursesQueryParams,
  PaginatedResponse,
  MoodleCategory,
  CreateCourseDto,
  EnrolledUserWithDetails,
} from '@/types';

export const coursesApi = {
  /**
   * Get paginated list of courses
   */
  async getAll(params?: CoursesQueryParams): Promise<PaginatedResponse<MoodleCourse>> {
    const response = await api.get<PaginatedResponse<MoodleCourse>>('/courses', { params });
    return response.data;
  },

  /**
   * Get course by Moodle ID
   */
  async getByMoodleId(moodleId: number): Promise<CourseWithStats> {
    const response = await api.get<CourseWithStats>(`/courses/${moodleId}`);
    return response.data;
  },

  /**
   * Get students enrolled in a course
   */
  async getStudents(moodleId: number): Promise<EnrolledStudent[]> {
    const response = await api.get<EnrolledStudent[]>(`/courses/${moodleId}/students`);
    return response.data;
  },

  /**
   * Get teacher's courses
   */
  async getMyCourses(): Promise<CourseWithStats[]> {
    const response = await api.get<CourseWithStats[]>('/courses/my');
    return response.data;
  },

  /**
   * Get student's enrolled courses
   */
  async getEnrolledCourses(): Promise<MoodleCourse[]> {
    const response = await api.get<MoodleCourse[]>('/courses/enrolled');
    return response.data;
  },

  /**
   * Get all enrolments for a course
   */
  async getEnrolments(moodleId: number): Promise<MoodleEnrolment[]> {
    const response = await api.get<MoodleEnrolment[]>(`/courses/${moodleId}/enrolments`);
    return response.data;
  },

  /**
   * Get available courses for re-enrolment
   */
  async getAvailableForEnrolment(periodId: number): Promise<MoodleCourse[]> {
    const response = await api.get<MoodleCourse[]>('/courses/available', {
      params: { periodId },
    });
    return response.data;
  },

  /**
   * Get all categories
   */
  async getCategories(): Promise<MoodleCategory[]> {
    const response = await api.get<MoodleCategory[]>('/courses/categories');
    return response.data;
  },

  /**
   * Sync categories from Moodle
   */
  async syncCategories(): Promise<{ synced: number }> {
    const response = await api.post<{ synced: number }>('/courses/categories/sync');
    return response.data;
  },

  /**
   * Create a new course
   */
  async createCourse(data: CreateCourseDto): Promise<CourseWithStats> {
    const response = await api.post<CourseWithStats>('/courses', data);
    return response.data;
  },

  /**
   * Get enrolled users with details for a course
   */
  async getEnrolledUsersWithDetails(courseId: number): Promise<EnrolledUserWithDetails[]> {
    const response = await api.get<EnrolledUserWithDetails[]>(`/courses/${courseId}/enrolled-users`);
    return response.data;
  },

  /**
   * Delete a course (local only)
   */
  async delete(courseId: number): Promise<{ success: boolean }> {
    const response = await api.delete<{ success: boolean }>(`/courses/${courseId}`);
    return response.data;
  },
};
