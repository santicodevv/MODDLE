// Teacher Grades - Simplified view with sum (readonly) + total + comment (editable)
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gradesApi } from '@/api/grades.api';
import { periodsApi } from '@/api/periods.api';
import {
  Card,
  CardContent,
  Spinner,
  Button,
  Input,
  Badge,
  Select,
  Label,
} from '@/components/ui';
import {
  ArrowLeft,
  Save,
  User,
  CheckCircle,
  MessageSquare,
  Calculator,
  GraduationCap,
  Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { StudentGradeWithDetails, UpdateStudentGradeDto } from '@/types';

export default function TeacherGrades() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [localEdits, setLocalEdits] = useState<
    Map<number, UpdateStudentGradeDto>
  >(new Map());

  // Fetch periods
  const { data: periods, isLoading: periodsLoading } = useQuery({
    queryKey: ['periods'],
    queryFn: () => periodsApi.getAll(),
  });

  // Set default period when loaded
  const activePeriod = periods?.find((p) => p.status === 'open');
  const effectivePeriodId = selectedPeriodId ?? activePeriod?.id;

  // Fetch student grades for this course and period
  const {
    data: studentGrades,
    isLoading: gradesLoading,
    error,
  } = useQuery({
    queryKey: ['teacher-student-grades', courseId, effectivePeriodId],
    queryFn: () =>
      gradesApi.getStudentGradesByCourse(Number(courseId), effectivePeriodId!),
    enabled: !!courseId && !!effectivePeriodId,
  });

  // Update grade mutation
  const updateGradeMutation = useMutation({
    mutationFn: async ({
      studentId,
      data,
    }: {
      studentId: number;
      data: UpdateStudentGradeDto;
    }) => {
      return gradesApi.updateStudentGrade(
        Number(courseId),
        studentId,
        effectivePeriodId!,
        data,
      );
    },
    onSuccess: (_, variables) => {
      setLocalEdits((prev) => {
        const newMap = new Map(prev);
        newMap.delete(variables.studentId);
        return newMap;
      });
      queryClient.invalidateQueries({
        queryKey: ['teacher-student-grades', courseId, effectivePeriodId],
      });
      toast.success('Calificacion guardada');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al guardar');
    },
  });

  const handleGradeChange = (
    studentId: number,
    field: 'totalGrade' | 'comment',
    value: string,
  ) => {
    setLocalEdits((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(studentId) || {};

      if (field === 'totalGrade') {
        const numValue = value === '' ? null : parseFloat(value);
        if (numValue !== null) {
          if (isNaN(numValue) || numValue < 0 || numValue > 10) {
            toast.error('Solo se permite calificaciones del 0 - 10');
            return prev;
          }
        }
        newMap.set(studentId, { ...existing, totalGrade: numValue });
      } else {
        newMap.set(studentId, { ...existing, comment: value });
      }

      return newMap;
    });
  };

  const handleSave = (studentId: number) => {
    const edit = localEdits.get(studentId);
    if (!edit) return;

    updateGradeMutation.mutate({ studentId, data: edit });
  };

  const getGradeColor = (grade: number | null) => {
    if (grade === null) return 'text-gray-400';
    if (grade <= 5) return 'text-red-600';
    if (grade > 5 && grade < 7) return 'text-orange-500';
    if (grade >= 7 && grade < 9) return 'text-yellow-600';
    if (grade >= 9 && grade <= 10) return 'text-green-600';
    return 'text-gray-600';
  };

  const isLoading = periodsLoading || gradesLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">Error al cargar las calificaciones</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate('/teacher/courses')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a cursos
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const courseName = studentGrades?.[0]?.courseName || 'Curso';
  const courseShortname = studentGrades?.[0]?.courseShortname || '';

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/teacher/courses')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {courseShortname || courseName}
            </h1>
            <p className="text-gray-600">{courseName}</p>
          </div>
        </div>
      </div>

      {/* Period selector */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <GraduationCap className="h-5 w-5 text-gray-500" />
            <div className="flex-1">
              <Label>Periodo academico</Label>
              <Select
                value={effectivePeriodId || ''}
                onChange={(e) => setSelectedPeriodId(Number(e.target.value))}
                className="mt-1"
              >
                {periods?.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.name} {period.status === 'open' ? '(Activo)' : ''}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grades Table */}
      <Card>
        <CardContent className="p-0">
          {studentGrades && studentGrades.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Estudiante
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      <div className="flex flex-col items-center">
                        <Calculator className="h-4 w-4 mb-1" />
                        <span>Sumatoria Moodle</span>
                        <span className="text-gray-400 font-normal">
                          (Solo lectura)
                        </span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      <div className="flex flex-col items-center">
                        <CheckCircle className="h-4 w-4 mb-1" />
                        <span>Nota Final</span>
                        <span className="text-gray-400 font-normal">
                          (0-10)
                        </span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      <div className="flex flex-col items-center">
                        <MessageSquare className="h-4 w-4 mb-1" />
                        <span>Comentario</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {studentGrades.map((student: StudentGradeWithDetails) => {
                    const localEdit = localEdits.get(student.studentId);
                    const displayTotal =
                      localEdit !== undefined && localEdit.totalGrade !== undefined
                        ? localEdit.totalGrade
                        : student.totalGrade;
                    const displayComment =
                      localEdit?.comment ?? student.comment ?? '';
                    const hasLocalEdit = localEdit !== undefined;
                    const isLocked =
                      student.totalGrade !== null && !hasLocalEdit;

                    return (
                      <tr key={student.studentId} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-gray-100 rounded-full">
                              <User className="h-4 w-4 text-gray-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">
                                {student.studentName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {student.studentEmail}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`font-medium text-lg ${getGradeColor(student.moodleSumGrade)}`}
                          >
                            {student.moodleSumGrade !== null
                              ? student.moodleSumGrade.toFixed(1)
                              : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isLocked ? (
                            <span
                              className={`font-bold text-lg ${getGradeColor(student.totalGrade)}`}
                            >
                              {student.totalGrade}
                            </span>
                          ) : (
                            <Input
                              type="number"
                              value={displayTotal ?? ''}
                              onChange={(e) =>
                                handleGradeChange(
                                  student.studentId,
                                  'totalGrade',
                                  e.target.value,
                                )
                              }
                              min={0}
                              max={10}
                              step={0.1}
                              className="w-24 text-center mx-auto"
                              placeholder="-"
                            />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isLocked ? (
                            <span className="text-sm text-gray-700">
                              {student.comment || '-'}
                            </span>
                          ) : (
                            <Input
                              type="text"
                              value={displayComment}
                              onChange={(e) =>
                                handleGradeChange(
                                  student.studentId,
                                  'comment',
                                  e.target.value,
                                )
                              }
                              className="w-full min-w-[200px]"
                              placeholder="Agregar comentario..."
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isLocked ? (
                            <Badge variant="secondary">
                              <Lock className="h-3 w-3 mr-1" />
                              Calificado
                            </Badge>
                          ) : (
                            <>
                              {hasLocalEdit && (
                                <Button
                                  size="sm"
                                  onClick={() => handleSave(student.studentId)}
                                  disabled={updateGradeMutation.isPending}
                                >
                                  <Save className="h-4 w-4 mr-1" />
                                  Guardar
                                </Button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500">
              <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>
                No hay estudiantes en este curso para el periodo seleccionado
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <p className="text-sm text-gray-600">
            <strong>Sumatoria Moodle:</strong> Es la suma de todas las notas de
            Moodle (solo lectura).
            <br />
            <strong>Nota Final:</strong> La nota que usted asigna al estudiante
            (0-10).
            <br />
            <strong>Comentario:</strong> Observaciones para el estudiante.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
