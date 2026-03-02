// Grades API service
import { api } from '@/lib';
import type {
  LocalGrade,
  MoodleGradeItem,
  CreateGradeRequest,
  UpdateGradeRequest,
  BulkGradeRequest,
  GradesQueryParams,
  StudentGradeRow,
  StudentGradeReport,
  StudentGradeWithDetails,
  StudentCourseGrade,
  UpdateStudentGradeDto,
  SyncMoodleSumsResult,
  PaginatedResponse,
  SuccessResponse,
} from '@/types';

export const gradesApi = {
  /**
   * Get grade items for a course
   */
  async getGradeItems(courseMoodleId: number): Promise<MoodleGradeItem[]> {
    const response = await api.get<MoodleGradeItem[]>(
      `/grades/items/${courseMoodleId}`
    );
    return response.data;
  },

  /**
   * Get grades for a specific item with student info
   */
  async getGradesByItem(
    courseMoodleId: number,
    itemMoodleId: number
  ): Promise<StudentGradeRow[]> {
    const response = await api.get<StudentGradeRow[]>(
      `/grades/courses/${courseMoodleId}/items/${itemMoodleId}`
    );
    return response.data;
  },

  /**
   * Get all grades (admin view)
   */
  async getAll(params?: GradesQueryParams): Promise<PaginatedResponse<LocalGrade>> {
    const response = await api.get<PaginatedResponse<LocalGrade>>('/grades', { params });
    return response.data;
  },

  /**
   * Create a new grade
   */
  async create(data: CreateGradeRequest): Promise<LocalGrade> {
    const response = await api.post<LocalGrade>('/grades', data);
    return response.data;
  },

  /**
   * Update a grade
   */
  async update(id: number, data: UpdateGradeRequest): Promise<LocalGrade> {
    const response = await api.patch<LocalGrade>(`/grades/${id}`, data);
    return response.data;
  },

  /**
   * Delete a grade
   */
  async delete(id: number): Promise<SuccessResponse> {
    const response = await api.delete<SuccessResponse>(`/grades/${id}`);
    return response.data;
  },

  /**
   * Bulk create/update grades
   */
  async bulkSave(data: BulkGradeRequest): Promise<LocalGrade[]> {
    const response = await api.post<LocalGrade[]>('/grades/bulk', data);
    return response.data;
  },

  /**
   * Get student's grade report for all courses
   */
  async getStudentReport(studentMoodleId?: number): Promise<StudentGradeReport[]> {
    const params = studentMoodleId ? { studentMoodleId } : {};
    const response = await api.get<StudentGradeReport[]>('/grades/report', { params });
    return response.data;
  },

  /**
   * Get student's grade report for a specific period
   */
  async getStudentPeriodReport(
    periodId: number,
    studentMoodleId?: number
  ): Promise<StudentGradeReport[]> {
    const params = studentMoodleId ? { studentMoodleId } : {};
    const response = await api.get<StudentGradeReport[]>(
      `/grades/report/period/${periodId}`,
      { params }
    );
    return response.data;
  },

  /**
   * Export grades to Excel
   */
  async exportToExcel(courseMoodleId: number, itemMoodleId?: number): Promise<Blob> {
    const response = await api.get(`/grades/export/${courseMoodleId}`, {
      params: { itemMoodleId },
      responseType: 'blob',
    });
    return response.data;
  },

  // ================================
  // Student Final Grades (Teacher view with total + comment)
  // ================================

  /**
   * Get all student grades for a course by period (Teacher/Admin)
   */
  async getStudentGradesByCourse(
    courseMoodleId: number,
    periodId: number
  ): Promise<StudentGradeWithDetails[]> {
    const response = await api.get<StudentGradeWithDetails[]>(
      `/student-grades/course/${courseMoodleId}`,
      { params: { periodId } }
    );
    return response.data;
  },

  /**
   * Update a student's grade (Teacher/Admin)
   */
  async updateStudentGrade(
    courseMoodleId: number,
    studentId: number,
    periodId: number,
    data: UpdateStudentGradeDto
  ): Promise<StudentGradeWithDetails> {
    const response = await api.patch<StudentGradeWithDetails>(
      `/student-grades/course/${courseMoodleId}/student/${studentId}`,
      data,
      { params: { periodId } }
    );
    return response.data;
  },

  /**
   * Sync Moodle grade sums for all students in a course (Admin)
   */
  async syncMoodleSums(
    courseMoodleId: number,
    periodId: number
  ): Promise<SyncMoodleSumsResult> {
    const response = await api.post<SyncMoodleSumsResult>(
      `/student-grades/course/${courseMoodleId}/sync-sums`,
      {},
      { params: { periodId } }
    );
    return response.data;
  },

  /**
   * Get my grades (Student)
   */
  async getMyGrades(): Promise<StudentCourseGrade[]> {
    const response = await api.get<StudentCourseGrade[]>('/student-grades/mine');
    return response.data;
  },

  /**
   * Get my grades for a specific period (Student)
   */
  async getMyGradesByPeriod(periodId: number): Promise<StudentCourseGrade[]> {
    const response = await api.get<StudentCourseGrade[]>(
      `/student-grades/mine/period/${periodId}`
    );
    return response.data;
  },
};
