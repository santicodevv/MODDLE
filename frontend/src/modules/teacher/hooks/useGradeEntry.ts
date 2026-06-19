
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/axios';
import toast from 'react-hot-toast';

export interface GradeItem {
  itemMoodleId: number;
  itemName: string;
  itemType: string;
  gradeMax: number;
  gradeMin: number;
  weight: number | null;
}

export interface StudentGrade {
  itemMoodleId: number;
  itemName: string;
  gradeMax: number;
  gradeMin: number;
  moodleGrade: number | null;
  editedGrade: number | null;
  feedback: string | null;
  wasEdited: boolean;
  editable: boolean;
}

export interface Participant {
  studentMoodleId: number;
  studentName: string;
  studentEmail: string;
  grades: StudentGrade[];
}

export interface CourseGradesResponse {
  course: {
    moodleId: number;
    fullname: string;
    shortname: string;
  } | null;
  gradeItems: GradeItem[];
  participants: Participant[];
  editSession: {
    id: number;
    isActive: boolean;
    activatedAt: string;
  } | null;
}

export function useGradeEntry() {
  const { courseId } = useParams<{ courseId: string }>();
  const queryClient = useQueryClient();

  const [localEdits, setLocalEdits] = useState<Map<string, { grade: number; feedback?: string }>>(new Map());

  const { data, isLoading, error } = useQuery({
    queryKey: ['teacher-course-grades', courseId],
    queryFn: async () => {
      const response = await api.get<CourseGradesResponse>(`/grades/course/${courseId}/editable`);
      return response.data;
    },
    enabled: !!courseId,
  });

  const saveGrade = useMutation({
    mutationFn: async (gradeData: {
      courseMoodleId: number;
      itemMoodleId: number;
      studentMoodleId: number;
      newGrade: number;
      feedback?: string;
    }) => {
      const response = await api.post('/grades/edit', gradeData);
      return response.data;
    },
    onSuccess: (_, variables) => {
      const key = `${variables.studentMoodleId}-${variables.itemMoodleId}`;
      setLocalEdits((prev) => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });
      queryClient.invalidateQueries({ queryKey: ['teacher-course-grades', courseId] });
      toast.success('Nota guardada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al guardar la nota');
    },
  });

  const handleGradeChange = (studentMoodleId: number, itemMoodleId: number, value: string, gradeMax: number) => {
    const key = `${studentMoodleId}-${itemMoodleId}`;
    const numValue = parseFloat(value);

    if (value === '') {
      setLocalEdits((prev) => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });
      return;
    }

    if (isNaN(numValue) || numValue < 0 || numValue > gradeMax) return;

    setLocalEdits((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(key);
      newMap.set(key, { grade: numValue, feedback: existing?.feedback });
      return newMap;
    });
  };

  const handleSaveGrade = (studentMoodleId: number, itemMoodleId: number) => {
    const key = `${studentMoodleId}-${itemMoodleId}`;
    const edit = localEdits.get(key);

    if (!edit || !courseId) return;

    saveGrade.mutate({
      courseMoodleId: parseInt(courseId),
      itemMoodleId,
      studentMoodleId,
      newGrade: edit.grade,
      feedback: edit.feedback,
    });
  };

  return {
    courseId,
    data,
    isLoading,
    error,
    localEdits,
    saveGrade,
    handleGradeChange,
    handleSaveGrade,
  };
}
