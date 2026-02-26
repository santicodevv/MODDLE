// Admin Grades Page - View and manage grades/reports
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, downloadBlob } from '@/lib';
import {
  Card,
  CardContent,
  Badge,
  Spinner,
  Button,
  Select,
  Input,
} from '@/components/ui';
import {
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Users,
  BookOpen,
  TrendingUp,
  ToggleLeft,
  ToggleRight,
  User,
  Lock,
  CheckCircle,
  Search,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Course {
  moodleId: number;
  fullname: string;
  shortname: string;
}

interface GradeItem {
  itemMoodleId: number;
  itemName: string;
  itemType: string;
  gradeMax: number;
  gradeMin: number;
}

interface StudentGrade {
  itemMoodleId: number;
  itemName: string;
  gradeMax: number;
  gradeMin: number;
  moodleGrade: number | null;
  editedGrade: number | null;
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

interface EditSessionStatus {
  isActive: boolean;
  session: {
    id: number;
    activatedAt: string;
    activatedBy: number;
  } | null;
}

export default function AdminGrades() {
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [exportLoading, setExportLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [localEdits, setLocalEdits] = useState<Map<string, { grade: number; feedback?: string }>>(new Map());
  const queryClient = useQueryClient();

  // Fetch courses for filter
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses-list'],
    queryFn: async () => {
      const response = await api.get<Course[]>('/grades/courses');
      return response.data;
    },
  });

  // Fetch edit session status
  const { data: editSessionStatus, isLoading: sessionLoading } = useQuery({
    queryKey: ['edit-session-status'],
    queryFn: async () => {
      const response = await api.get<EditSessionStatus>('/grades/edit-session/status');
      return response.data;
    },
  });

  // Fetch grades for selected course (with editable status)
  const { data: courseGrades, isLoading: gradesLoading } = useQuery({
    queryKey: ['course-grades', selectedCourseId],
    queryFn: async () => {
      const response = await api.get<CourseGradesResponse>(`/grades/course/${selectedCourseId}/editable`);
      return response.data;
    },
    enabled: !!selectedCourseId,
  });

  // Toggle edit session mutation
  const toggleEditSession = useMutation({
    mutationFn: async () => {
      const response = await api.post('/grades/edit-session/toggle');
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['edit-session-status'] });
      queryClient.invalidateQueries({ queryKey: ['course-grades'] });
      setLocalEdits(new Map());
      toast.success(data.message);
    },
    onError: () => {
      toast.error('Error al cambiar el estado de edicion');
    },
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
      const key = `${variables.studentMoodleId}-${variables.itemMoodleId}`;
      setLocalEdits((prev) => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });
      queryClient.invalidateQueries({ queryKey: ['course-grades', selectedCourseId] });
      toast.success('Nota guardada exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al guardar la nota');
    },
  });

  // Fetch summary stats
  const { data: stats } = useQuery({
    queryKey: ['grades-stats'],
    queryFn: async () => {
      const response = await api.get('/reports/global/summary');
      return response.data;
    },
  });

  // Filter participants by search term
  const filteredParticipants = useMemo(() => {
    if (!courseGrades?.participants) return [];
    if (!searchTerm.trim()) return courseGrades.participants;

    const term = searchTerm.toLowerCase();
    return courseGrades.participants.filter(
      (p) =>
        p.studentName.toLowerCase().includes(term) ||
        p.studentEmail.toLowerCase().includes(term)
    );
  }, [courseGrades?.participants, searchTerm]);

  const handleExport = async (format: 'excel' | 'pdf') => {
    setExportLoading(true);
    try {
      const response = await api.get('/reports/global/summary', {
        params: { format },
        responseType: 'blob',
      });

      const filename = `reporte_calificaciones_${new Date().toISOString().split('T')[0]}.${
        format === 'excel' ? 'xlsx' : 'pdf'
      }`;
      downloadBlob(response.data, filename);
      toast.success(`Reporte exportado como ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Error al exportar el reporte');
    } finally {
      setExportLoading(false);
    }
  };

  const handleToggleEditSession = () => {
    toggleEditSession.mutate();
  };

  const handleGradeChange = (
    studentMoodleId: number,
    itemMoodleId: number,
    value: string,
    gradeMax: number
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

    if (!edit || !selectedCourseId) return;

    saveGrade.mutate({
      courseMoodleId: parseInt(selectedCourseId),
      itemMoodleId,
      studentMoodleId,
      newGrade: edit.grade,
      feedback: edit.feedback,
    });
  };

  const getGradeColor = (grade: number | null, max: number) => {
    if (grade === null) return 'text-gray-400';
    const percentage = (grade / max) * 100;
    if (percentage >= 90) return 'text-green-600 bg-green-50';
    if (percentage >= 70) return 'text-blue-600 bg-blue-50';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  if (sessionLoading || coursesLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  const isEditingEnabled = editSessionStatus?.isActive ?? false;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calificaciones</h1>
          <p className="mt-1 text-gray-600">
            Gestion y reportes de calificaciones
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport('excel')}
            disabled={exportLoading}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('pdf')}
            disabled={exportLoading}
          >
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Edit Session Toggle */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {editSessionStatus?.isActive ? (
                <ToggleRight className="h-6 w-6 text-green-600" />
              ) : (
                <ToggleLeft className="h-6 w-6 text-gray-400" />
              )}
              <div>
                <p className="font-medium text-gray-900">Edicion de Notas</p>
                <p className="text-sm text-gray-500">
                  {editSessionStatus?.isActive
                    ? 'Administradores y profesores pueden editar calificaciones'
                    : 'La edicion de calificaciones esta deshabilitada'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {editSessionStatus?.isActive && editSessionStatus.session && (
                <span className="text-sm text-gray-500">
                  Activo desde:{' '}
                  {new Date(editSessionStatus.session.activatedAt).toLocaleString()}
                </span>
              )}
              <Button
                variant={editSessionStatus?.isActive ? 'destructive' : 'default'}
                onClick={handleToggleEditSession}
                disabled={toggleEditSession.isPending}
              >
                {toggleEditSession.isPending ? (
                  <Spinner className="h-4 w-4" />
                ) : editSessionStatus?.isActive ? (
                  'Deshabilitar Edicion'
                ) : (
                  'Habilitar Edicion'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ClipboardList className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Calificaciones</p>
                <p className="text-xl font-bold text-blue-600">
                  {stats?.totalGrades ?? '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Estudiantes</p>
                <p className="text-xl font-bold text-green-600">
                  {stats?.totalUsers ?? '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BookOpen className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Cursos</p>
                <p className="text-xl font-bold text-purple-600">
                  {stats?.totalCourses ?? '-'}
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
                <p className="text-sm text-gray-500">Inscripciones</p>
                <p className="text-xl font-bold text-orange-600">
                  {stats?.totalEnrolments ?? '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Selection */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seleccionar Curso para ver Calificaciones
              </label>
              <Select
                value={selectedCourseId}
                onChange={(e) => {
                  setSelectedCourseId(e.target.value);
                  setSearchTerm('');
                  setLocalEdits(new Map());
                }}
              >
                <option value="">-- Seleccione un curso --</option>
                {courses?.map((course) => (
                  <option key={course.moodleId} value={course.moodleId}>
                    {course.shortname} - {course.fullname}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grades Table */}
      {selectedCourseId && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {gradesLoading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : courseGrades && courseGrades.participants.length > 0 ? (
              <>
                {/* Header with search */}
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {courseGrades.course?.shortname} - {courseGrades.course?.fullname}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {filteredParticipants.length} de {courseGrades.participants.length} estudiantes
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Search input */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Buscar estudiante..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 w-64"
                        />
                      </div>
                      {isEditingEnabled && (
                        <Badge variant="success">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Edicion activa
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Table with horizontal scroll only */}
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 min-w-[200px]">
                          Estudiante
                        </th>
                        {courseGrades.gradeItems.map((item) => (
                          <th
                            key={item.itemMoodleId}
                            className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase min-w-[140px]"
                          >
                            <div className="flex flex-col items-center">
                              <span className="truncate max-w-[120px]" title={item.itemName}>
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
                      {filteredParticipants.map((participant) => (
                        <tr key={participant.studentMoodleId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 sticky left-0 bg-white min-w-[200px]">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-gray-100 rounded-full">
                                <User className="h-4 w-4 text-gray-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">
                                  {participant.studentName}
                                </p>
                                <p className="text-xs text-gray-500">{participant.studentEmail}</p>
                              </div>
                            </div>
                          </td>
                          {participant.grades.map((grade) => {
                            const key = `${participant.studentMoodleId}-${grade.itemMoodleId}`;
                            const localEdit = localEdits.get(key);
                            const displayGrade = localEdit?.grade ?? grade.editedGrade ?? grade.moodleGrade;
                            const hasLocalEdit = localEdit !== undefined;
                            const canEdit = isEditingEnabled && grade.editable;

                            return (
                              <td key={grade.itemMoodleId} className="px-4 py-3 text-center">
                                {canEdit ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center gap-1">
                                      <Input
                                        type="number"
                                        value={localEdit?.grade ?? displayGrade ?? ''}
                                        onChange={(e) =>
                                          handleGradeChange(
                                            participant.studentMoodleId,
                                            grade.itemMoodleId,
                                            e.target.value,
                                            grade.gradeMax
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
                                          variant="default"
                                          onClick={() =>
                                            handleSaveGrade(
                                              participant.studentMoodleId,
                                              grade.itemMoodleId
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
                                      className={`px-2 py-1 rounded text-sm font-medium ${getGradeColor(
                                        displayGrade,
                                        grade.gradeMax
                                      )}`}
                                    >
                                      {displayGrade !== null ? displayGrade : '-'}
                                    </span>
                                    {grade.wasEdited && (
                                      <Badge variant="secondary" className="text-xs mt-1">
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

                {/* No results message */}
                {filteredParticipants.length === 0 && searchTerm && (
                  <div className="p-8 text-center text-gray-500">
                    <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>No se encontraron estudiantes con "{searchTerm}"</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <ClipboardList className="h-12 w-12 mb-4 text-gray-300" />
                <p>No hay estudiantes matriculados en este curso</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedCourseId && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-gray-500">
              <BookOpen className="h-12 w-12 mb-4 text-gray-300" />
              <p>Seleccione un curso para ver las calificaciones</p>
              <p className="text-sm mt-1">Las calificaciones se sincronizaran automaticamente desde Moodle</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
