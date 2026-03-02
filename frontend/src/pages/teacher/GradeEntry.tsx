// Teacher Grade Entry - Edit grades for a specific course
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib';
import {
  Card,
  CardContent,
  Spinner,
  Button,
  Input,
  Badge,
} from '@/components/ui';
import {
  ArrowLeft,
  Save,
  ClipboardList,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface GradeItem {
  itemMoodleId: number;
  itemName: string;
  itemType: string;
  gradeMax: number;
  gradeMin: number;
  weight: number | null;
}

interface StudentGrade {
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

interface Participant {
  studentMoodleId: number;
  studentName: string;
  studentEmail: string;
  grades: StudentGrade[];
}

interface CourseGradesResponse {
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

export default function TeacherGradeEntry() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Track local edits before saving
  const [localEdits, setLocalEdits] = useState<
    Map<string, { grade: number; feedback?: string }>
  >(new Map());

  // Fetch course grades with editable status
  const { data, isLoading, error } = useQuery({
    queryKey: ['teacher-course-grades', courseId],
    queryFn: async () => {
      const response = await api.get<CourseGradesResponse>(
        `/grades/course/${courseId}/editable`,
      );
      return response.data;
    },
    enabled: !!courseId,
  });

  // Save grade mutation
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
      // Remove from local edits
      const key = `${variables.studentMoodleId}-${variables.itemMoodleId}`;
      setLocalEdits((prev) => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });
      // Refresh data
      queryClient.invalidateQueries({
        queryKey: ['teacher-course-grades', courseId],
      });
      toast.success('Nota guardada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al guardar la nota');
    },
  });

  const handleGradeChange = (
    studentMoodleId: number,
    itemMoodleId: number,
    value: string,
    gradeMax: number,
  ) => {
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

    if (isNaN(numValue) || numValue < 0 || numValue > gradeMax) {
      return;
    }

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

  const getGradeColor = (grade: number | null, max: number) => {
    if (grade === null) return 'text-gray-400';
    const percentage = (grade / max) * 100;
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-blue-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
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

  const isEditingEnabled = data.editSession?.isActive ?? false;

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
              {data.course?.shortname || 'Curso'}
            </h1>
            <p className="text-gray-600">{data.course?.fullname}</p>
          </div>
        </div>
        {isEditingEnabled ? (
          <Badge variant="success" className="px-3 py-1">
            <CheckCircle className="h-4 w-4 mr-1" />
            Edicion habilitada
          </Badge>
        ) : (
          <Badge variant="secondary" className="px-3 py-1">
            <Lock className="h-4 w-4 mr-1" />
            Edicion deshabilitada
          </Badge>
        )}
      </div>

      {/* Warning if editing is disabled */}
      {!isEditingEnabled && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">
                  Edicion de notas deshabilitada
                </p>
                <p className="text-sm text-yellow-700">
                  Contacte al administrador para habilitar la edicion de
                  calificaciones.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grades Table */}
      <Card>
        <CardContent className="p-0">
          {data.participants.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50">
                      Estudiante
                    </th>
                    {data.gradeItems.map((item) => (
                      <th
                        key={item.itemMoodleId}
                        className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase min-w-[140px]"
                      >
                        <div className="flex flex-col items-center">
                          <span
                            className="truncate max-w-[120px]"
                            title={item.itemName}
                          >
                            {item.itemName}
                          </span>
                          <span className="text-gray-400 font-normal">
                            (max: {item.gradeMax})
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.participants.map((participant) => (
                    <tr
                      key={participant.studentMoodleId}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 sticky left-0 bg-white">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-gray-100 rounded-full">
                            <User className="h-4 w-4 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {participant.studentName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {participant.studentEmail}
                            </p>
                          </div>
                        </div>
                      </td>
                      {participant.grades.map((grade) => {
                        const key = `${participant.studentMoodleId}-${grade.itemMoodleId}`;
                        const localEdit = localEdits.get(key);
                        const displayGrade =
                          localEdit?.grade ??
                          grade.editedGrade ??
                          grade.moodleGrade;
                        const hasLocalEdit = localEdit !== undefined;
                        const canEdit = isEditingEnabled && grade.editable;

                        return (
                          <td
                            key={grade.itemMoodleId}
                            className="px-4 py-3 text-center"
                          >
                            {canEdit ? (
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    value={
                                      localEdit?.grade ?? displayGrade ?? ''
                                    }
                                    onChange={(e) =>
                                      handleGradeChange(
                                        participant.studentMoodleId,
                                        grade.itemMoodleId,
                                        e.target.value,
                                        grade.gradeMax,
                                      )
                                    }
                                    min={0}
                                    max={grade.gradeMax}
                                    step={0.01}
                                    className="w-20 text-center text-sm"
                                    placeholder="-"
                                  />
                                  {hasLocalEdit && (
                                    <Button
                                      size="sm"
                                      variant="primary"
                                      onClick={() =>
                                        handleSaveGrade(
                                          participant.studentMoodleId,
                                          grade.itemMoodleId,
                                        )
                                      }
                                      disabled={saveGrade.isPending}
                                    >
                                      <Save className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                                {grade.moodleGrade !== null && (
                                  <span className="text-xs text-gray-400">
                                    Original: {grade.moodleGrade}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center">
                                <span
                                  className={`font-medium ${getGradeColor(
                                    displayGrade,
                                    grade.gradeMax,
                                  )}`}
                                >
                                  {displayGrade !== null ? displayGrade : '-'}
                                </span>
                                {grade.wasEdited && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs mt-1"
                                  >
                                    <Lock className="h-3 w-3 mr-1" />
                                    Editada
                                  </Badge>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No hay estudiantes matriculados en este curso</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Leyenda:</p>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Input disabled className="w-16 text-center" placeholder="-" />
              <span>Campo editable</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                <Lock className="h-3 w-3 mr-1" />
                Editada
              </Badge>
              <span>Nota ya editada (bloqueada)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600 font-medium">90+</span>
              <span className="text-blue-600 font-medium">70-89</span>
              <span className="text-yellow-600 font-medium">60-69</span>
              <span className="text-red-600 font-medium">&lt;60</span>
              <span>Colores por porcentaje</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
