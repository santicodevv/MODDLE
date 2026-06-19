import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gradesApi } from '@/shared/api';
import toast from 'react-hot-toast';
import type { CourseWithGrades } from './useAdminGrades';

export function useCourseGradeSection(
  course: CourseWithGrades,
  periodId: number,
  isExpanded: boolean,
  editingGrades: Map<string, { totalGrade: number | null; comment: string | null }>,
  setEditingGrades: React.Dispatch<
    React.SetStateAction<Map<string, { totalGrade: number | null; comment: string | null }>>
  >
) {
  const queryClient = useQueryClient();

  const { data: grades, isLoading: gradesLoading } = useQuery({
    queryKey: ['course-grades-period', periodId, course.courseMoodleId],
    queryFn: () => gradesApi.getGradesForPeriodAndCourse(periodId, course.courseMoodleId),
    enabled: isExpanded,
  });

  const updateGradeMutation = useMutation({
    mutationFn: ({
      studentId,
      data,
    }: {
      studentId: number;
      data: {
        totalGrade?: number | null | undefined;
        comment?: string | null | undefined;
      };
    }) => gradesApi.updateStudentGrade(course.courseMoodleId, studentId, periodId, data as any),
    onSuccess: (_, variables) => {
      const key = `${course.courseMoodleId}-${variables.studentId}`;
      setEditingGrades((prev) => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });
      queryClient.invalidateQueries({
        queryKey: ['course-grades-period', periodId, course.courseMoodleId],
      });
      queryClient.invalidateQueries({
        queryKey: ['period-courses-grades', periodId],
      });
      toast.success('Calificación guardada');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al guardar');
    },
  });

  const handleGradeChange = (
    studentId: number,
    field: 'totalGrade' | 'comment',
    value: string | number | null,
  ) => {
    const key = `${course.courseMoodleId}-${studentId}`;
    const currentGrade = grades?.find((g) => g.studentId === studentId);
    const existing = editingGrades.get(key) || {
      totalGrade: currentGrade?.totalGrade ?? null,
      comment: currentGrade?.comment ?? null,
    };

    if (field === 'totalGrade' && value !== null) {
      const numVal = Number(value);
      if (numVal < 0 || numVal > 10) {
        toast.error('Solo se permite calificaciones del 0 - 10');
        return;
      }
    }

    setEditingGrades((prev) => {
      const newMap = new Map(prev);
      newMap.set(key, {
        ...existing,
        [field]: value,
      });
      return newMap;
    });
  };

  const handleSave = (studentId: number) => {
    const key = `${course.courseMoodleId}-${studentId}`;
    const edit = editingGrades.get(key);
    if (!edit) return;

    updateGradeMutation.mutate({
      studentId,
      data: {
        totalGrade: edit.totalGrade,
        comment: edit.comment,
      },
    });
  };

  const hasChanges = (studentId: number): boolean => {
    const key = `${course.courseMoodleId}-${studentId}`;
    return editingGrades.has(key);
  };

  const getGradeColor = (grade: number | null) => {
    if (grade === null) return 'text-gray-400';
    if (grade <= 5) return 'text-red-600 font-bold';
    if (grade > 5 && grade < 7) return 'text-orange-500 font-bold';
    if (grade >= 7 && grade < 9) return 'text-yellow-600 font-bold';
    if (grade >= 9 && grade <= 10) return 'text-green-600 font-bold';
    return 'text-gray-600';
  };

  return {
    grades,
    gradesLoading,
    updateGradeMutation,
    handleGradeChange,
    handleSave,
    hasChanges,
    getGradeColor,
  };
}
