// Academic Periods API service
import { api } from '@/lib';
import type {
  AcademicPeriod,
  CreatePeriodRequest,
  UpdatePeriodRequest,
  PeriodsQueryParams,
  PaginatedResponse,
  SuccessResponse,
} from '@/types';

export const periodsApi = {
  /**
   * Get all periods
   */
  async getAll(params?: PeriodsQueryParams): Promise<PaginatedResponse<AcademicPeriod>> {
    const response = await api.get<PaginatedResponse<AcademicPeriod>>('/periods', {
      params,
    });
    return response.data;
  },

  /**
   * Get period by ID
   */
  async getById(id: number): Promise<AcademicPeriod> {
    const response = await api.get<AcademicPeriod>(`/periods/${id}`);
    return response.data;
  },

  /**
   * Get current active period
   */
  async getCurrent(): Promise<AcademicPeriod | null> {
    const response = await api.get<AcademicPeriod | null>('/periods/current');
    return response.data;
  },

  /**
   * Create a new period
   */
  async create(data: CreatePeriodRequest): Promise<AcademicPeriod> {
    const response = await api.post<AcademicPeriod>('/periods', data);
    return response.data;
  },

  /**
   * Update a period
   */
  async update(id: number, data: UpdatePeriodRequest): Promise<AcademicPeriod> {
    const response = await api.patch<AcademicPeriod>(`/periods/${id}`, data);
    return response.data;
  },

  /**
   * Delete a period
   */
  async delete(id: number): Promise<SuccessResponse> {
    const response = await api.delete<SuccessResponse>(`/periods/${id}`);
    return response.data;
  },

  /**
   * Open a period for re-enrolments
   */
  async open(id: number): Promise<AcademicPeriod> {
    const response = await api.post<AcademicPeriod>(`/periods/${id}/open`);
    return response.data;
  },

  /**
   * Close a period
   */
  async close(id: number): Promise<AcademicPeriod> {
    const response = await api.post<AcademicPeriod>(`/periods/${id}/close`);
    return response.data;
  },
};
