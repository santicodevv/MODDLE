// Admin Grades Page - View and manage student grades by period
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gradesApi, periodsApi } from '@/api';
import {
  Card,
  CardContent,
  Badge,
  Spinner,
  Button,
  Select,
  Input,
  Label,
} from '@/components/ui';
import {
  ClipboardList,
  Users,
  BookOpen,
  TrendingUp,
  User,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Save,
  MessageSquare,
  GraduationCap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { StudentGradeWithDetails } from '@/types';

interface CourseWithGrades {
  courseMoodleId: number;
  courseName: string;
  courseShortname: string;
  studentCount: number;
  gradedCount: number;
}

export default function AdminGrades() {
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [expandedCourses, setExpandedCourses] = useState<Set<number>>(
    new Set(),
  );
  const [editingGrades, setEditingGrades] = useState<
    Map<string, { totalGrade: number | null; comment: string | null }>
  >(new Map());
  const _queryClient = useQueryClient();

  // Fetch periods
  const { data: periods, isLoading: periodsLoading } = useQuery({
    queryKey: ['periods'],
    queryFn: () => periodsApi.getAll(),
  });

  // Get active period as default
  const activePeriod = periods?.find((p) => p.status === 'open');
  const effectivePeriodId = selectedPeriodId ?? activePeriod?.id;

  // Fetch courses with grades for the period
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['period-courses-grades', effectivePeriodId],
    queryFn: () => gradesApi.getCoursesWithGradesForPeriod(effectivePeriodId!),
    enabled: !!effectivePeriodId,
  });

  // Calculate statistics
  const totalStudents =
    courses?.reduce((sum, c) => sum + c.studentCount, 0) || 0;
  const totalGraded = courses?.reduce((sum, c) => sum + c.gradedCount, 0) || 0;

  const toggleCourse = (courseMoodleId: number) => {
    setExpandedCourses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(courseMoodleId)) {
        newSet.delete(courseMoodleId);
      } else {
        newSet.add(courseMoodleId);
      }
      return newSet;
    });
  };

  const handlePeriodChange = (periodId: number | null) => {
    setSelectedPeriodId(periodId);
    setExpandedCourses(new Set());
    setEditingGrades(new Map());
  };

  if (periodsLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Calificaciones por Período
        </h1>
        <p className="text-gray-600 mt-1">
          Gestiona las calificaciones finales de los estudiantes
        </p>
      </div>

      {/* Period selector */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <GraduationCap className="h-5 w-5 text-gray-500" />
            <div className="flex-1 max-w-xs">
              <Label>Período Académico</Label>
              <Select
                value={effectivePeriodId || ''}
                onChange={(e) =>
                  handlePeriodChange(Number(e.target.value) || null)
                }
                className="mt-1"
              >
                <option value="">-- Selecciona un período --</option>
                {periods?.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.name} {period.status === 'open' ? '(Actual)' : ''}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {effectivePeriodId && courses && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BookOpen className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cursos</p>
                  <p className="text-xl font-bold text-purple-600">
                    {courses.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Estudiantes</p>
                  <p className="text-xl font-bold text-blue-600">
                    {totalStudents}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Calificados</p>
                  <p className="text-xl font-bold text-green-600">
                    {totalGraded}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Progreso</p>
                  <p className="text-xl font-bold text-orange-600">
                    {totalStudents > 0
                      ? Math.round((totalGraded / totalStudents) * 100)
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Courses List */}
      {effectivePeriodId && (
        <>
          {coursesLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : courses && courses.length > 0 ? (
            <div className="space-y-4">
              {courses.map((course) => (
                <CourseGradeSection
                  key={course.courseMoodleId}
                  course={course}
                  periodId={effectivePeriodId}
                  isExpanded={expandedCourses.has(course.courseMoodleId)}
                  onToggle={() => toggleCourse(course.courseMoodleId)}
                  editingGrades={editingGrades}
                  setEditingGrades={setEditingGrades}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">
                  No hay calificaciones registradas para este período
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!effectivePeriodId && (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">
              Selecciona un período académico para ver las calificaciones
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Course Grade Section Component
interface CourseGradeSectionProps {
  course: CourseWithGrades;
  periodId: number;
  isExpanded: boolean;
  onToggle: () => void;
  editingGrades: Map<
    string,
    { totalGrade: number | null; comment: string | null }
  >;
  setEditingGrades: React.Dispatch<
    React.SetStateAction<
      Map<string, { totalGrade: number | null; comment: string | null }>
    >
  >;
}

function CourseGradeSection({
  course,
  periodId,
  isExpanded,
  onToggle,
  editingGrades,
  setEditingGrades,
}: CourseGradeSectionProps) {
  const queryClient = useQueryClient();

  // Fetch grades when expanded
  const { data: grades, isLoading: gradesLoading } = useQuery({
    queryKey: ['course-grades-period', periodId, course.courseMoodleId],
    queryFn: () =>
      gradesApi.getGradesForPeriodAndCourse(periodId, course.courseMoodleId),
    enabled: isExpanded,
  });

  // Update grade mutation
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
    }) =>
      gradesApi.updateStudentGrade(
        course.courseMoodleId,
        studentId,
        periodId,
        data as any,
      ),
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
    if (grade >= 90) return 'text-green-600';
    if (grade >= 70) return 'text-blue-600';
    if (grade >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardContent className="p-0">
        {/* Header - Clickable */}
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={onToggle}
        >
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronRight className="h-5 w-5 text-gray-400" />
            )}
            <div className="p-2 bg-purple-100 rounded-lg">
              <BookOpen className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">
                {course.courseShortname} - {course.courseName}
              </h3>
              <p className="text-sm text-gray-500">
                {course.studentCount} estudiantes • {course.gradedCount}{' '}
                calificados
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                course.gradedCount === course.studentCount
                  ? 'success'
                  : 'secondary'
              }
            >
              {course.gradedCount}/{course.studentCount}
            </Badge>
          </div>
        </div>

        {/* Expanded Content - Grades Table */}
        {isExpanded && (
          <div className="border-t">
            {gradesLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : grades && grades.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[200px]">
                        Estudiante
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Email
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-32">
                        Acumulado
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-32">
                        Total
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[200px]">
                        Comentario
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-24">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {grades.map((grade: StudentGradeWithDetails) => {
                      const key = `${course.courseMoodleId}-${grade.studentId}`;
                      const editData = editingGrades.get(key);
                      const displayTotal =
                        editData?.totalGrade ?? grade.totalGrade;
                      const displayComment = editData?.comment ?? grade.comment;

                      return (
                        <tr key={grade.studentId} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-gray-100 rounded-full">
                                <User className="h-4 w-4 text-gray-600" />
                              </div>
                              <span className="font-medium text-gray-900 text-sm">
                                {grade.studentName}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {grade.studentEmail}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm text-gray-600">
                              {grade.moodleSumGrade !== null
                                ? grade.moodleSumGrade.toFixed(1)
                                : '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={displayTotal ?? ''}
                              onChange={(e) =>
                                handleGradeChange(
                                  grade.studentId,
                                  'totalGrade',
                                  e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                )
                              }
                              className={`w-20 text-center ${getGradeColor(displayTotal)}`}
                              placeholder="-"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              <Input
                                value={displayComment || ''}
                                onChange={(e) =>
                                  handleGradeChange(
                                    grade.studentId,
                                    'comment',
                                    e.target.value,
                                  )
                                }
                                placeholder="Sin comentario"
                                className="text-sm"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleSave(grade.studentId)}
                              disabled={
                                !hasChanges(grade.studentId) ||
                                updateGradeMutation.isPending
                              }
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No hay estudiantes con calificaciones en este curso</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
