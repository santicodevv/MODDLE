// Academic Period types

export type PeriodStatus = 'planned' | 'open' | 'closed';

export interface AcademicPeriod {
  id: number;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: PeriodStatus;
  createdAt: string;
  updatedAt: string;
}

// Request types
export interface CreatePeriodRequest {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status?: PeriodStatus;
}

export interface UpdatePeriodRequest {
  code?: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  status?: PeriodStatus;
}

// Query params
export interface PeriodsQueryParams {
  status?: PeriodStatus;
  page?: number;
  limit?: number;
}
