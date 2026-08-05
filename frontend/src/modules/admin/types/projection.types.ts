export interface AcademicProgram {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  moodleCategoryId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudyPlan {
  id: number;
  programId: number;
  courseMoodleId: number;
  level: number;
  courseName?: string;
  createdAt: string;
}

export interface StudentProgram {
  id: number;
  userId: number;
  programId: number;
  entryDate: string;
  createdAt: string;
}

export interface PendingSubject {
  studentId: number;
  courseMoodleId: number;
  level: number;
  status: 'approved' | 'failed' | 'pending';
}

export interface DemandBySubject {
  courseMoodleId: number;
  courseName: string;
  pendingCount: number;
  failedCount: number;
  totalDemand: number;
  studentsPerSection: number;
  sectionsNeeded: number;
}

export interface DemandByLevel {
  level: number;
  studentCount: number;
}

export interface SectionProjection {
  courseMoodleId: number;
  courseName: string;
  pendingCount: number;
  sectionsNeeded: number;
}

export interface ProjectionMatrixRow {
  studentId: number;
  studentName?: string;
  courses: {
    courseMoodleId: number;
    courseName: string;
    status: 'pending' | 'approved';
  }[];
}

export interface CreateAcademicProgramRequest {
  name: string;
  code: string;
  description?: string;
}

export interface UpdateAcademicProgramRequest {
  name?: string;
  code?: string;
  description?: string;
}

export interface CreateStudyPlanRequest {
  courseMoodleId: number;
  level: number;
}

export interface CreateProgramCourseRequest {
  fullname: string;
  shortname: string;
  level: number;
  subjectName?: string;
  code?: string;
  idnumber?: string;
  summary?: string;
  visible?: boolean;
  startdate?: string;
  enddate?: string;
}

export interface AutoAssignResult {
  programsProcessed: number;
  coursesAssigned: number;
  coursesSkipped: number;
}

export interface AssignStudentProgramRequest {
  userId: number;
  programId: number;
  entryDate?: string;
}
