// Teacher Courses - List of courses the teacher can manage grades for
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib';
import { Card, CardContent, Spinner, Button, Badge } from '@/components/ui';
import { BookOpen, Users, ClipboardList, ChevronRight } from 'lucide-react';

interface Course {
  moodleId: number;
  fullname: string;
  shortname: string;
  subjectName?: string;
  visible: boolean;
  categoryId: number;
}

export default function TeacherCourses() {
  const navigate = useNavigate();

  // Fetch courses
  const { data: courses, isLoading } = useQuery({
    queryKey: ['teacher-courses'],
    queryFn: async () => {
      const response = await api.get<Course[]>('/grades/courses');
      return response.data;
    },
  });

  // Fetch edit session status
  const { data: editSessionStatus } = useQuery({
    queryKey: ['edit-session-status'],
    queryFn: async () => {
      const response = await api.get('/grades/edit-session/status');
      return response.data;
    },
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Cursos</h1>
          <p className="mt-1 text-gray-600">
            Seleccione un curso para gestionar calificaciones
          </p>
        </div>
        {editSessionStatus?.isActive && (
          <Badge variant="success" className="px-3 py-1 text-sm">
            Edicion de notas habilitada
          </Badge>
        )}
      </div>

      {/* Edit Session Status Banner */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-full ${editSessionStatus?.isActive ? 'bg-green-100' : 'bg-gray-100'}`}
            >
              <ClipboardList
                className={`h-5 w-5 ${editSessionStatus?.isActive ? 'text-green-600' : 'text-gray-400'}`}
              />
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {editSessionStatus?.isActive
                  ? 'La edicion de notas esta habilitada'
                  : 'La edicion de notas esta deshabilitada'}
              </p>
              <p className="text-sm text-gray-500">
                {editSessionStatus?.isActive
                  ? 'Puede editar las calificaciones de sus estudiantes. Una vez editada una nota, no podra modificarla hasta que el administrador habilite una nueva sesion.'
                  : 'Contacte al administrador para habilitar la edicion de notas.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Courses List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : courses && courses.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card
              key={course.moodleId}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/teacher/grades/${course.moodleId}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {course.shortname}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {course.subjectName || course.fullname}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
                <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>Estudiantes</span>
                  </div>
                  {!course.visible && <Badge variant="secondary">Oculto</Badge>}
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/teacher/grades/${course.moodleId}`);
                  }}
                >
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Gestionar Calificaciones
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No hay cursos disponibles</p>
              <p className="text-sm mt-1">
                Los cursos apareceran aqui cuando se sincronicen desde Moodle
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
