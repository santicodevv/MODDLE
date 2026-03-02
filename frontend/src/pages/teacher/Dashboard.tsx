// Teacher Dashboard
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context';
import { coursesApi } from '@/api/courses.api';
import { Card, CardContent, Spinner, Button } from '@/components/ui';
import {
  BookOpen,
  Users,
  ClipboardList,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

interface TeacherCourse {
  id: number;
  moodleId: number;
  fullname: string;
  subjectName?: string;
  shortname: string;
  enrolledCount?: number;
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch teacher's courses
  const { data: coursesData, isLoading } = useQuery({
    queryKey: ['teacher-courses'],
    queryFn: async () => {
      const response = await coursesApi.getAll({ limit: 100 });
      return response;
    },
  });

  const courses = coursesData?.data || [];
  const totalStudents = courses.reduce(
    (sum: number, c: TeacherCourse) => sum + (c.enrolledCount || 0),
    0,
  );

  const stats = [
    {
      label: 'Mis Cursos',
      value: isLoading ? '-' : courses.length.toString(),
      icon: BookOpen,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      label: 'Total Estudiantes',
      value: isLoading ? '-' : totalStudents.toString(),
      icon: Users,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      label: 'Calificaciones Pendientes',
      value: '-',
      icon: ClipboardList,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
    },
    {
      label: 'Calificaciones Registradas',
      value: '-',
      icon: CheckCircle,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenido, {user?.displayName}
        </h1>
        <p className="mt-1 text-gray-600">
          Panel de profesor - Gestiona tus cursos y calificaciones
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>
                    {stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Mis Cursos
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/teacher/courses')}
              >
                Ver todos
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : courses.length > 0 ? (
              <div className="space-y-3">
                {courses.slice(0, 5).map((course: TeacherCourse) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() =>
                      navigate(`/teacher/grades/${course.moodleId}`)
                    }
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {course.shortname}
                      </p>
                      <p className="text-sm text-gray-500">
                        {course.subjectName || course.fullname}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <ClipboardList className="h-4 w-4 mr-1" />
                      Calificar
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No tienes cursos asignados
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Acciones Rapidas
            </h3>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/teacher/courses')}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Ver todos mis cursos
              </Button>
              {courses.length > 0 && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() =>
                    navigate(`/teacher/grades/${courses[0].moodleId}`)
                  }
                >
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Registrar calificaciones
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
