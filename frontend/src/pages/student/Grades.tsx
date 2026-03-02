// Student Grades - View my final grades (total + comment only)
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gradesApi } from '@/api/grades.api';
import { Card, CardContent, Spinner, Select, Label } from '@/components/ui';
import { GraduationCap, TrendingUp, BookOpen, CheckCircle } from 'lucide-react';
import type { StudentCourseGrade } from '@/types';

export default function StudentGrades() {
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);

  // Fetch periods where I have grades
  const { data: myPeriods, isLoading: periodsLoading } = useQuery({
    queryKey: ['my-periods-with-grades'],
    queryFn: () => gradesApi.getMyPeriodsWithGrades(),
  });

  // Fetch my grades filtered by period only (no course filter)
  const { data: grades, isLoading: gradesLoading } = useQuery({
    queryKey: ['my-grades', selectedPeriodId],
    queryFn: () =>
      gradesApi.getMyGrades(selectedPeriodId || undefined, undefined),
    enabled: true,
  });

  const isLoading = periodsLoading || gradesLoading;

  // Calculate statistics
  const gradedCourses =
    grades?.filter((g: StudentCourseGrade) => g.totalGrade !== null) || [];
  const averageGrade =
    gradedCourses.length > 0
      ? gradedCourses.reduce(
          (sum: number, g: StudentCourseGrade) => sum + (g.totalGrade || 0),
          0,
        ) / gradedCourses.length
      : null;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mis Calificaciones</h1>
        <p className="text-gray-600 mt-1">
          Consulta tus notas finales por período
        </p>
      </div>

      {/* Period Filter Only */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-end gap-4">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-gray-500" />
              <div className="min-w-[200px]">
                <Label>Período académico</Label>
                {periodsLoading ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <Select
                    value={selectedPeriodId || ''}
                    onChange={(e) =>
                      setSelectedPeriodId(Number(e.target.value) || null)
                    }
                    className="mt-1"
                  >
                    <option value="">Todos los períodos</option>
                    {myPeriods?.map((period) => (
                      <option key={period.periodId} value={period.periodId}>
                        {period.periodName}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
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
                  <p className="text-xl font-bold text-gray-900">
                    {grades.length}
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
                  <p className="text-xl font-bold text-gray-900">
                    {gradedCourses.length}
                  </p>
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

      {/* Grades Table */}
      {isLoading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <Spinner />
        </div>
      ) : grades && grades.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Curso
                    </th>
                    <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comentario
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {grades.map((grade: StudentCourseGrade) => (
                    <tr
                      key={`${grade.courseMoodleId}-${grade.periodId}`}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {grade.courseName}
                          </p>
                          {grade.periodName && !selectedPeriodId && (
                            <p className="text-xs text-gray-400">
                              {grade.periodName}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {grade.totalGrade !== null ? (
                          <span className="text-sm font-semibold text-gray-900">
                            {grade.totalGrade}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {grade.comment ? (
                          <p className="text-sm text-gray-700">
                            {grade.comment}
                          </p>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">
              No tienes calificaciones registradas
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Las notas apareceran aqui cuando tus profesores las registren
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
