// Grade types

// Grade item (from Moodle mirror)
export interface MoodleGradeItem {
  id: number;
  courseMoodleId: number;
  itemMoodleId: number;
  itemname?: string;
  itemtype?: string;
  grademax?: number;
  grademin?: number;
  weight?: number;
  timemodified?: string;
  lastSyncedAt?: string;
}

// Grade (from Moodle mirror)
export interface MoodleGrade {
  id: number;
  courseMoodleId: number;
  itemMoodleId: number;
  userMoodleId: number;
  grade?: number;
  feedback?: string;
  timemodified?: string;
  lastSyncedAt?: string;
}

// Local grade (registered in app)
export interface LocalGrade {
  id: number;
  courseMoodleId: number;
  itemMoodleId: number;
  studentMoodleId: number;
  teacherAppUserId: number;
  grade: number;
  feedback?: string;
  source: 'app' | 'moodle';
  version: number;
  updatedAt: string;
}

// Request types
export interface CreateGradeRequest {
  courseMoodleId: number;
  itemMoodleId: number;
  studentMoodleId: number;
  grade: number;
  feedback?: string;
}

export interface UpdateGradeRequest {
  grade?: number;
  feedback?: string;
}

export interface BulkGradeEntry {
  studentMoodleId: number;
  grade: number;
  feedback?: string;
}

export interface BulkGradeRequest {
  courseMoodleId: number;
  itemMoodleId: number;
  grades: BulkGradeEntry[];
}

// Grade display for UI
export interface StudentGradeRow {
  studentMoodleId: number;
  studentName: string;
  studentEmail: string;
  grade?: number;
  feedback?: string;
  gradeId?: number;
}

// Grade report types
export interface GradesByItem {
  itemId: number;
  itemName: string;
  gradeMax: number;
  weight?: number;
  grade?: number;
  weighted?: number;
}

export interface StudentGradeReport {
  courseMoodleId: number;
  courseName: string;
  items: GradesByItem[];
  totalGrade: number;
  totalWeighted: number;
}

// Query params
export interface GradesQueryParams {
  courseMoodleId?: number;
  studentMoodleId?: number;
  itemMoodleId?: number;
  periodId?: number;
}
