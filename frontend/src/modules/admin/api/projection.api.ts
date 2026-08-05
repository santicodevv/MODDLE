import { api } from '@/shared/lib';
import type { SuccessResponse } from '@/shared/types';
import type { Course } from '../types/course.types';
import type {
  AcademicProgram,
  StudyPlan,
  StudentProgram,
  DemandBySubject,
  DemandByLevel,
  SectionProjection,
  ProjectionMatrixRow,
  CreateAcademicProgramRequest,
  UpdateAcademicProgramRequest,
  CreateStudyPlanRequest,
  AssignStudentProgramRequest,
  CreateProgramCourseRequest,
  AutoAssignResult,
} from '../types/projection.types';

export const projectionApi = {
  async getPrograms(): Promise<AcademicProgram[]> {
    const response = await api.get<AcademicProgram[]>('/academic-projection/programs');
    return response.data;
  },

  async getProgramById(id: number): Promise<AcademicProgram> {
    const response = await api.get<AcademicProgram>(`/academic-projection/programs/${id}`);
    return response.data;
  },

  async createProgram(data: CreateAcademicProgramRequest): Promise<AcademicProgram> {
    const response = await api.post<AcademicProgram>('/academic-projection/programs', data);
    return response.data;
  },

  async updateProgram(id: number, data: UpdateAcademicProgramRequest): Promise<AcademicProgram> {
    const response = await api.patch<AcademicProgram>(`/academic-projection/programs/${id}`, data);
    return response.data;
  },

  async deleteProgram(id: number): Promise<SuccessResponse> {
    const response = await api.delete<SuccessResponse>(`/academic-projection/programs/${id}`);
    return response.data;
  },

  async getStudyPlans(programId: number): Promise<StudyPlan[]> {
    const response = await api.get<StudyPlan[]>(`/academic-projection/programs/${programId}/study-plans`);
    return response.data;
  },

  async addStudyPlan(programId: number, data: CreateStudyPlanRequest): Promise<StudyPlan> {
    const response = await api.post<StudyPlan>(`/academic-projection/programs/${programId}/study-plans`, data);
    return response.data;
  },

  async removeStudyPlan(id: number): Promise<SuccessResponse> {
    const response = await api.delete<SuccessResponse>(`/academic-projection/study-plans/${id}`);
    return response.data;
  },

  async createProgramCourse(programId: number, data: CreateProgramCourseRequest): Promise<{ course: Course }> {
    const response = await api.post<{ course: Course }>(`/academic-projection/programs/${programId}/courses`, data);
    return response.data;
  },

  async autoAssignCoursesToPrograms(): Promise<AutoAssignResult> {
    const response = await api.post<AutoAssignResult>('/academic-projection/study-plans/auto-assign');
    return response.data;
  },

  async assignStudent(data: AssignStudentProgramRequest): Promise<StudentProgram> {
    const response = await api.post<StudentProgram>('/academic-projection/student-program', data);
    return response.data;
  },

  async getStudentPrograms(userId: number): Promise<StudentProgram[]> {
    const response = await api.get<StudentProgram[]>(`/academic-projection/student-program/student/${userId}`);
    return response.data;
  },

  async removeStudentProgram(id: number): Promise<SuccessResponse> {
    const response = await api.delete<SuccessResponse>(`/academic-projection/student-program/${id}`);
    return response.data;
  },

  async getDemandBySubject(programId?: number): Promise<DemandBySubject[]> {
    const params = programId ? { programId } : {};
    const response = await api.get<DemandBySubject[]>('/academic-projection/demand-by-subject', { params });
    return response.data;
  },

  async getDemandByLevel(programId?: number): Promise<DemandByLevel[]> {
    const params = programId ? { programId } : {};
    const response = await api.get<DemandByLevel[]>('/academic-projection/demand-by-level', { params });
    return response.data;
  },

  async getSectionProjection(programId?: number): Promise<SectionProjection[]> {
    const params = programId ? { programId } : {};
    const response = await api.get<SectionProjection[]>('/academic-projection/section-projection', { params });
    return response.data;
  },

  async getProjectionMatrix(programId?: number): Promise<ProjectionMatrixRow[]> {
    const params = programId ? { programId } : {};
    const response = await api.get<ProjectionMatrixRow[]>('/academic-projection/matrix', { params });
    return response.data;
  },

  async exportDemandBySubject(programId?: number): Promise<Blob> {
    const params = programId ? { programId, format: 'excel' } : { format: 'excel' };
    const response = await api.get('/academic-projection/demand-by-subject', { params, responseType: 'blob' });
    return response.data;
  },

  async exportDemandByLevel(programId?: number): Promise<Blob> {
    const params = programId ? { programId, format: 'excel' } : { format: 'excel' };
    const response = await api.get('/academic-projection/demand-by-level', { params, responseType: 'blob' });
    return response.data;
  },

  async exportSectionProjection(programId?: number): Promise<Blob> {
    const params = programId ? { programId, format: 'excel' } : { format: 'excel' };
    const response = await api.get('/academic-projection/section-projection', { params, responseType: 'blob' });
    return response.data;
  },

  async exportProjectionMatrix(programId?: number): Promise<Blob> {
    const params = programId ? { programId, format: 'excel' } : { format: 'excel' };
    const response = await api.get('/academic-projection/matrix', { params, responseType: 'blob' });
    return response.data;
  },
};
