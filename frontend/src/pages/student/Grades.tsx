// Student Grades - View my final grades (total + comment only)
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gradesApi } from '@/api/grades.api';
import { periodsApi } from '@/api/periods.api';
import {
  Card,
  CardContent,
  Spinner,
  Badge,
  Select,
  Label,
} from '@/components/ui';
import {
  GraduationCap,
  BookOpen,
  MessageSquare,
  CheckCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import type { StudentCourseGrade } from '@/types';

export default function StudentGrades() {
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);

  // Fetch periods
  const { data: periods, isLoading: periodsLoading } = useQuery({
    queryKey: ['periods'],
    queryFn: () => periodsApi.getAll(),
  });

  // Get active period as default
  const activePeriod = periods?.find((p) => p.status === 'open');
  const effectivePeriodId = selectedPeriodId ?? activePeriod?.id;

  // Fetch my grades
  const { data: grades, isLoading: gradesLoading } = useQuery({
    queryKey: ['my-grades', effectivePeriodId],
    queryFn: () =>
      effectivePeriodId
        ? gradesApi.getMyGradesByPeriod(effectivePeriodId)
        : gradesApi.getMyGrades(),
    enabled: true,
  });

  const getGradeColor = (grade: number | null) => {
    if (grade === null) return 'text-gray-400';
    if (grade >= 90) return 'text-green-600 bg-green-50';
    if (grade >= 70) return 'text-blue-600 bg-blue-50';
    if (grade >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getGradeLabel = (grade: number | null) => {
    if (grade === null) return 'Pendiente';
    if (grade >= 90) return 'Excelente';
    if (grade >= 80) return 'Muy Bueno';
    if (grade >= 70) return 'Bueno';
    if (grade >= 60) return 'Aprobado';
    return 'Reprobado';
  };

  const isLoading = periodsLoading || gradesLoading;

  // Calculate statistics
  const gradedCourses = grades?.filter((g: StudentCourseGrade) => g.totalGrade !== null) || [];
  const averageGrade = gradedCourses.length > 0
    ? gradedCourses.reduce((sum: number, g: StudentCourseGrade) => sum + (g.totalGrade || 0), 0) / gradedCourses.length
    : null;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mis Calificaciones</h1>
        <p className="text-gray-600 mt-1">Consulta tus notas finales por curso</p>
      </div>

      {/* Period selector */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <GraduationCap className="h-5 w-5 text-gray-500" />
            <div className="flex-1 max-w-xs">
              <Label>Periodo academico</Label>
              {periodsLoading ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <Select
                  value={effectivePeriodId || ''}
                  onChange={(e) => setSelectedPeriodId(Number(e.target.value) || null)}
                  className="mt-1"
                >
                  <option value="">Todos los periodos</option>
                  {periods?.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.name} {period.status === 'open' ? '(Actual)' : ''}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      {!isLoading && grades && grades.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Cursos</p>
                  <p className="text-xl font-bold text-gray-900">{grades.length}</p>
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
                  <p className="text-xl font-bold text-gray-900">{gradedCourses.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Promedio</p>
                  <p className="text-xl font-bold text-purple-600">
                    {averageGrade !== null ? averageGrade.toFixed(1) : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Grades List */}
      {isLoading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <Spinner />
        </div>
      ) : grades && grades.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {grades.map((grade: StudentCourseGrade) => (
            <Card key={`${grade.courseMoodleId}-${grade.periodId}`} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="h-4 w-4 text-gray-400" />
                      <span className="text-xs text-gray-500 uppercase">{grade.courseShortname}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{grade.courseName}</h3>
                    <p className="text-sm text-gray-500 mt-1">{grade.periodName}</p>
                    {grade.teacherName && (
                      <p className="text-xs text-gray-400 mt-1">Profesor: {grade.teacherName}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {grade.totalGrade !== null ? (
                      <div className={`px-4 py-2 rounded-lg ${getGradeColor(grade.totalGrade)}`}>
                        <p className="text-2xl font-bold">{grade.totalGrade}</p>
                        <p className="text-xs">{getGradeLabel(grade.totalGrade)}</p>
                      </div>
                    ) : (
                      <Badge variant="secondary" className="px-3 py-1">
                        <Clock className="h-3 w-3 mr-1" />
                        Pendiente
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Comment */}
                {grade.comment && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Comentario del profesor:</p>
                        <p className="text-sm text-gray-700">{grade.comment}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No tienes calificaciones registradas</p>
            <p className="text-sm text-gray-400 mt-1">
              Las notas apareceran aqui cuando tus profesores las registren
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
