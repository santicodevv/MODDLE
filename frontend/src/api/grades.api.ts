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
};
