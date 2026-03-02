// Student Courses Page
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { coursesApi } from '@/api';
import { Card, CardContent, Spinner, Badge, Button } from '@/components/ui';
import {
  BookOpen,
  Users,
  GraduationCap,
  AlertCircle,
  ChevronRight,
  Calendar,
} from 'lucide-react';

interface CourseWithCounts {
  id: number;
  moodleId: number;
  fullname: string;
  shortname: string;
  summary?: string;
  visible: boolean;
  startdate?: string;
  enddate?: string;
  studentCount?: number;
  teacherCount?: number;
}

export default function StudentCourses() {
  const navigate = useNavigate();

  const { data: courses, isLoading, error } = useQuery({
    queryKey: ['student-enrolled-courses'],
    queryFn: () => coursesApi.getEnrolledCourses(),
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('es', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-red-500">
              <AlertCircle className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">Error al cargar los cursos</p>
              <p className="text-sm text-gray-500">
                {(error as any)?.response?.data?.message || 'Intenta nuevamente'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-blue-600" />
          Mis Cursos
        </h1>
        <p className="mt-1 text-gray-600">
          Cursos en los que actualmente estas inscrito
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total de Cursos</p>
                <p className="text-2xl font-bold text-blue-600">
                  {courses?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100">
                <GraduationCap className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Cursos Activos</p>
                <p className="text-2xl font-bold text-green-600">
                  {courses?.filter((c: CourseWithCounts) => c.visible).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-100">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Companeros</p>
                <p className="text-2xl font-bold text-purple-600">
                  {courses?.reduce(
                    (sum: number, c: CourseWithCounts) => sum + (c.studentCount || 0),
                    0
                  ) || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Courses List */}
      {courses && courses.length > 0 ? (
        <div className="grid gap-4">
          {(courses as CourseWithCounts[]).map((course) => (
            <Card
              key={course.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/student/grades`)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-3 rounded-lg bg-blue-100">
                      <BookOpen className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {course.fullname}
                        </h3>
                        {!course.visible && (
                          <Badge variant="secondary">Oculto</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-2">
                        {course.shortname}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {course.studentCount || 0} estudiantes
                        </span>
                        {course.startdate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Inicio: {formatDate(course.startdate)}
                          </span>
                        )}
                        {course.enddate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Fin: {formatDate(course.enddate)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      Ver Calificaciones
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-gray-500">
              <AlertCircle className="h-12 w-12 mb-4 text-gray-300" />
              <p className="text-lg font-medium">No tienes cursos inscritos</p>
              <p className="text-sm">
                Cuando te inscriban en cursos, apareceran aqui
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
