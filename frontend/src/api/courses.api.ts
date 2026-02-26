// Courses API service
import { api } from '@/lib';
import type {
  MoodleCourse,
  CourseWithStats,
  EnrolledStudent,
  MoodleEnrolment,
  CoursesQueryParams,
  PaginatedResponse,
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
};
