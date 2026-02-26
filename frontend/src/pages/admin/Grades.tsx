// Admin Grades Page - View and manage grades/reports
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, downloadBlob } from '@/lib';
import {
  Card,
  CardContent,
  Badge,
  Spinner,
  Input,
  Button,
  Select,
} from '@/components/ui';
import {
  ClipboardList,
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  Users,
  BookOpen,
  Calendar,
  TrendingUp,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Grade {
  id: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  courseId: number;
  courseName: string;
  gradeItemId: number;
  gradeItemName: string;
  grade: number;
  gradeMax: number;
  percentage: number;
  feedback?: string;
  teacherName: string;
  periodCode: string;
  createdAt: string;
}

interface Period {
  id: number;
  code: string;
  name: string;
  status: string;
}

interface Course {
  id: number;
  fullname: string;
  shortname: string;
}

interface GradesResponse {
  grades: Grade[];
  total: number;
  page: number;
  limit: number;
}

export default function AdminGrades() {
  const [search, setSearch] = useState('');
  const [periodId, setPeriodId] = useState<string>('');
  const [courseId, setCourseId] = useState<string>('');
  const [page, setPage] = useState(1);
  const [exportLoading, setExportLoading] = useState(false);
  const limit = 25;

  // Fetch periods for filter
  const { data: periods } = useQuery({
    queryKey: ['periods'],
    queryFn: async () => {
      const response = await api.get<Period[]>('/periods');
      return response.data;
    },
  });

  // Fetch courses for filter
  const { data: courses } = useQuery({
    queryKey: ['courses-list'],
    queryFn: async () => {
      const response = await api.get<{ courses: Course[] }>('/courses', {
        params: { limit: 100 },
      });
      return response.data.courses;
    },
  });

  // Fetch grades
  const { data, isLoading } = useQuery({
    queryKey: ['admin-grades', page, search, periodId, courseId],
    queryFn: async () => {
      const response = await api.get<GradesResponse>('/grades', {
        params: {
          page,
          limit,
          search: search || undefined,
          periodId: periodId || undefined,
          courseId: courseId || undefined,
        },
      });
      return response.data;
    },
  });

  // Fetch summary stats
  const { data: stats } = useQuery({
    queryKey: ['grades-stats', periodId],
    queryFn: async () => {
      const response = await api.get('/reports/global/summary', {
        params: { periodId: periodId || undefined },
      });
      return response.data;
    },
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const handleExport = async (format: 'excel' | 'pdf') => {
    setExportLoading(true);
    try {
      const response = await api.get('/reports/global/summary', {
        params: {
          periodId: periodId || undefined,
          format,
        },
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

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 bg-green-50';
    if (percentage >= 70) return 'text-blue-600 bg-blue-50';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calificaciones</h1>
          <p className="mt-1 text-gray-600">
            Gestión y reportes de calificaciones
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

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtros</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar estudiante..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>

            <Select
              value={periodId}
              onChange={(e) => {
                setPeriodId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos los períodos</option>
              {periods?.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.name} ({period.code})
                </option>
              ))}
            </Select>

            <Select
              value={courseId}
              onChange={(e) => {
                setCourseId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos los cursos</option>
              {courses?.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.shortname} - {course.fullname}
                </option>
              ))}
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSearch('');
                setPeriodId('');
                setCourseId('');
                setPage(1);
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grades Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : data?.grades && data.grades.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Estudiante
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Curso
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Ítem
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Calificación
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Período
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Profesor
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Fecha
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data.grades.map((grade) => (
                      <tr key={grade.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {grade.studentName}
                            </p>
                            <p className="text-xs text-gray-500">{grade.studentEmail}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-900">{grade.courseName}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-600">{grade.gradeItemName}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center">
                            <span
                              className={`px-2 py-1 rounded-lg text-sm font-bold ${getGradeColor(
                                grade.percentage
                              )}`}
                            >
                              {grade.grade}/{grade.gradeMax}
                            </span>
                            <span className="text-xs text-gray-500">
                              {grade.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="secondary">{grade.periodCode}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-600">{grade.teacherName}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-500">
                            {new Date(grade.createdAt).toLocaleDateString()}
                          </p>
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
              <ClipboardList className="h-12 w-12 mb-4 text-gray-300" />
              <p>No hay calificaciones registradas</p>
              <p className="text-sm">Las calificaciones aparecerán aquí cuando se registren</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
