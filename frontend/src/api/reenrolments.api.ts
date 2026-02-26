// Re-enrolments API service
import { api } from '@/lib';
import type {
  ReEnrolmentRequest,
  ReEnrolmentSummary,
  CreateReEnrolmentRequest,
  UpdateReEnrolmentRequest,
  ProcessReEnrolmentRequest,
  ReEnrolmentsQueryParams,
  PaginatedResponse,
  SuccessResponse,
} from '@/types';

export const reenrolmentsApi = {
  /**
   * Get all re-enrolment requests (admin view)
   */
  async getAll(
    params?: ReEnrolmentsQueryParams
  ): Promise<PaginatedResponse<ReEnrolmentSummary>> {
    const response = await api.get<PaginatedResponse<ReEnrolmentSummary>>(
      '/reenrolments',
      { params }
    );
    return response.data;
  },

  /**
   * Get re-enrolment request by ID
   */
  async getById(id: number): Promise<ReEnrolmentRequest> {
    const response = await api.get<ReEnrolmentRequest>(`/reenrolments/${id}`);
    return response.data;
  },

  /**
   * Get student's own re-enrolment requests
   */
  async getMy(): Promise<ReEnrolmentRequest[]> {
    const response = await api.get<ReEnrolmentRequest[]>('/reenrolments/my');
    return response.data;
  },

  /**
   * Get student's current draft (if exists)
   */
  async getMyDraft(): Promise<ReEnrolmentRequest | null> {
    const response = await api.get<ReEnrolmentRequest | null>('/reenrolments/my/draft');
    return response.data;
  },

  /**
   * Create a new re-enrolment request
   */
  async create(data: CreateReEnrolmentRequest): Promise<ReEnrolmentRequest> {
    const response = await api.post<ReEnrolmentRequest>('/reenrolments', data);
    return response.data;
  },

  /**
   * Update a draft re-enrolment request
   */
  async update(id: number, data: UpdateReEnrolmentRequest): Promise<ReEnrolmentRequest> {
    const response = await api.patch<ReEnrolmentRequest>(`/reenrolments/${id}`, data);
    return response.data;
  },

  /**
   * Submit a draft for review
   */
  async submit(id: number): Promise<ReEnrolmentRequest> {
    const response = await api.post<ReEnrolmentRequest>(`/reenrolments/${id}/submit`);
    return response.data;
  },

  /**
   * Process (approve/reject) a re-enrolment request
   */
  async process(id: number, data: ProcessReEnrolmentRequest): Promise<ReEnrolmentRequest> {
    const response = await api.post<ReEnrolmentRequest>(
      `/reenrolments/${id}/process`,
      data
    );
    return response.data;
  },

  /**
   * Apply approved re-enrolment (execute in Moodle)
   */
  async apply(id: number): Promise<ReEnrolmentRequest> {
    const response = await api.post<ReEnrolmentRequest>(`/reenrolments/${id}/apply`);
    return response.data;
  },

  /**
   * Delete a draft re-enrolment request
   */
  async delete(id: number): Promise<SuccessResponse> {
    const response = await api.delete<SuccessResponse>(`/reenrolments/${id}`);
    return response.data;
  },

  /**
   * Get pending requests count (for badge)
   */
  async getPendingCount(): Promise<{ count: number }> {
    const response = await api.get<{ count: number }>('/reenrolments/pending/count');
    return response.data;
  },
};
