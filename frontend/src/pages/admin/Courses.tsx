// Admin Courses Page - View synchronized courses
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib';
import { coursesApi } from '@/api';
import {
  Card,
  CardContent,
  Badge,
  Spinner,
  Input,
  Button,
} from '@/components/ui';
import {
  BookOpen,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  Eye,
  GraduationCap,
  Plus,
  ExternalLink,
  Trash2,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Course {
  id: number;
  moodleId: number;
  shortname: string;
  fullname: string;
  categoryId: number;
  visible: boolean;
  startdate: string;
  enddate: string;
  studentCount?: number;
  teacherCount?: number;
  subjectName?: string;
  lastSyncedAt: string;
}

interface CoursesResponse {
  courses: Course[];
  total: number;
  page: number;
  limit: number;
}

export default function AdminCourses() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [editingSubjectName, setEditingSubjectName] = useState(false);
  const [subjectNameValue, setSubjectNameValue] = useState('');
  const limit = 20;

  const updateSubjectNameMutation = useMutation({
    mutationFn: ({ id, subjectName }: { id: number; subjectName: string }) =>
      coursesApi.updateSubjectName(id, subjectName),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      if (selectedCourse) {
        setSelectedCourse({
          ...selectedCourse,
          subjectName: updated.subjectName,
        });
      }
      setEditingSubjectName(false);
      toast.success('Nombre de asignatura actualizado');
    },
    onError: () => toast.error('Error al actualizar'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => coursesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      setSelectedCourse(null);
      toast.success('Curso eliminado');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar curso');
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-courses', page, search],
    queryFn: async () => {
      const response = await api.get<CoursesResponse>('/courses', {
        params: { page, limit, search: search || undefined },
      });
      return response.data;
    },
  });

  const { data: courseDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['course-details', selectedCourse?.id],
    queryFn: async () => {
      if (!selectedCourse) return null;
      const response = await api.get(`/courses/${selectedCourse.id}/details`);
      return response.data;
    },
    enabled: !!selectedCourse,
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cursos</h1>
          <p className="mt-1 text-gray-600">
            Cursos sincronizados desde Moodle
          </p>
        </div>
        <Button onClick={() => navigate('/admin/courses/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Crear Curso
        </Button>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o código..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Courses List */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Spinner />
                </div>
              ) : data?.courses && data.courses.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Curso
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Código
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            Estudiantes
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            Estado
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {data.courses.map((course) => (
                          <tr
                            key={course.id}
                            className={`hover:bg-gray-50 cursor-pointer ${
                              selectedCourse?.id === course.id
                                ? 'bg-blue-50'
                                : ''
                            }`}
                            onClick={() => setSelectedCourse(course)}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`p-2 rounded-lg ${course.visible ? 'bg-green-100' : 'bg-gray-100'}`}
                                >
                                  <BookOpen
                                    className={`h-4 w-4 ${course.visible ? 'text-green-600' : 'text-gray-400'}`}
                                  />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 text-sm">
                                    {course.subjectName || course.fullname}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    ID Moodle: {course.moodleId}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-mono text-gray-600">
                                {course.shortname}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Users className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                  {course.studentCount ?? '-'}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge
                                variant={
                                  course.visible ? 'success' : 'secondary'
                                }
                              >
                                {course.visible ? 'Activo' : 'Inactivo'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCourse(course);
                                  }}
                                  title="Vista r&aacute;pida"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/admin/courses/${course.id}`);
                                  }}
                                  title="Ver detalle completo"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <p className="text-sm text-gray-600">
                      Mostrando {(page - 1) * limit + 1} -{' '}
                      {Math.min(page * limit, data.total)} de {data.total}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage(page + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <BookOpen className="h-12 w-12 mb-4 text-gray-300" />
                  <p>No hay cursos sincronizados</p>
                  <p className="text-sm">
                    Ejecuta una sincronización desde Moodle
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Course Details Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6">
              {selectedCourse ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Detalles del Curso
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Nombre</p>
                      <p className="font-medium">{selectedCourse.fullname}</p>
                    </div>

                    {/* Nombre Asignatura - Editable */}
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500 uppercase">
                          Asignatura
                        </p>
                        {!editingSubjectName && (
                          <button
                            onClick={() => {
                              setSubjectNameValue(
                                selectedCourse.subjectName || '',
                              );
                              setEditingSubjectName(true);
                            }}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      {editingSubjectName ? (
                        <div className="flex items-center gap-1 mt-1">
                          <Input
                            value={subjectNameValue}
                            onChange={(e) =>
                              setSubjectNameValue(e.target.value)
                            }
                            placeholder="Nombre de asignatura"
                            className="h-8 text-sm"
                          />
                          <button
                            onClick={() =>
                              updateSubjectNameMutation.mutate({
                                id: selectedCourse.id,
                                subjectName: subjectNameValue,
                              })
                            }
                            className="p-1 text-green-600 hover:text-green-700"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingSubjectName(false)}
                            className="p-1 text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <p className="font-medium text-sm">
                          {selectedCourse.subjectName || (
                            <span className="text-gray-400 italic">
                              Sin asignar
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 uppercase">Código</p>
                      <p className="font-mono">{selectedCourse.shortname}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">
                          ID Moodle
                        </p>
                        <p>{selectedCourse.moodleId}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">
                          Categoría
                        </p>
                        <p>{selectedCourse.categoryId}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase">
                          Fecha Inicio
                        </p>
                        <p className="text-sm">
                          {selectedCourse.startdate
                            ? new Date(
                                selectedCourse.startdate,
                              ).toLocaleDateString()
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase">
                          Fecha Fin
                        </p>
                        <p className="text-sm">
                          {selectedCourse.enddate
                            ? new Date(
                                selectedCourse.enddate,
                              ).toLocaleDateString()
                            : '-'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-2">
                        Estadísticas
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-blue-50 rounded-lg p-3 text-center">
                          <GraduationCap className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                          <p className="text-lg font-bold text-blue-600">
                            {selectedCourse.studentCount ?? 0}
                          </p>
                          <p className="text-xs text-blue-600">Estudiantes</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3 text-center">
                          <Users className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                          <p className="text-lg font-bold text-purple-600">
                            {selectedCourse.teacherCount ?? 0}
                          </p>
                          <p className="text-xs text-purple-600">Profesores</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 uppercase">
                        Última Sincronización
                      </p>
                      <p className="text-sm">
                        {selectedCourse.lastSyncedAt
                          ? new Date(
                              selectedCourse.lastSyncedAt,
                            ).toLocaleString()
                          : 'No sincronizado'}
                      </p>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button
                        className="flex-1"
                        onClick={() =>
                          navigate(`/admin/courses/${selectedCourse.id}`)
                        }
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver Detalle
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => {
                          if (
                            confirm(
                              '¿Eliminar este curso? Se eliminara solo de la base de datos local, no de Moodle.',
                            )
                          ) {
                            deleteMutation.mutate(selectedCourse.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                  <BookOpen className="h-12 w-12 mb-4 text-gray-300" />
                  <p className="text-sm">
                    Selecciona un curso para ver detalles
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
