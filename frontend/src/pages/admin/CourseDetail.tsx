// Admin Course Detail Page - View course details and enrolled users
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { coursesApi } from '@/api/courses.api';
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
  Calendar,
  ArrowLeft,
  GraduationCap,
  UserCheck,
  Hash,
  Eye,
  EyeOff,
  Clock,
} from 'lucide-react';
import type { EnrolledUserWithDetails } from '@/types';

export default function AdminCourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'teacher'>('all');

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course-detail', courseId],
    queryFn: () => coursesApi.getByMoodleId(Number(courseId)),
    enabled: !!courseId,
  });

  const { data: enrolledUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['enrolled-users', courseId],
    queryFn: () => coursesApi.getEnrolledUsersWithDetails(Number(courseId)),
    enabled: !!courseId,
  });

  const filteredUsers = enrolledUsers?.filter((user: EnrolledUserWithDetails) => {
    const matchesSearch =
      !search ||
      user.firstname.toLowerCase().includes(search.toLowerCase()) ||
      user.lastname.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.username.toLowerCase().includes(search.toLowerCase());

    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'student' && user.roleCode === 'student') ||
      (roleFilter === 'teacher' && user.roleCode.toLowerCase().includes('teacher'));

    return matchesSearch && matchesRole;
  });

  const students = enrolledUsers?.filter((u: EnrolledUserWithDetails) => u.roleCode === 'student') || [];
  const teachers = enrolledUsers?.filter((u: EnrolledUserWithDetails) =>
    u.roleCode.toLowerCase().includes('teacher')
  ) || [];

  if (courseLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">Curso no encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/admin/courses')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Cursos
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin/courses')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Cursos
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{course.fullname}</h1>
            <p className="mt-1 text-gray-600">
              Detalles del curso y personas inscritas
            </p>
          </div>
          <Badge variant={course.visible ? 'success' : 'secondary'} className="text-sm">
            {course.visible ? (
              <>
                <Eye className="h-3 w-3 mr-1" />
                Visible
              </>
            ) : (
              <>
                <EyeOff className="h-3 w-3 mr-1" />
                Oculto
              </>
            )}
          </Badge>
        </div>
      </div>

      {/* Course Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Hash className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Código</p>
                <p className="font-mono font-medium">{course.shortname}</p>
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
                <p className="text-xs text-gray-500 uppercase">ID Moodle</p>
                <p className="font-medium">{course.moodleId}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <GraduationCap className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Estudiantes</p>
                <p className="font-medium">{students.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <UserCheck className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Profesores</p>
                <p className="font-medium">{teachers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Informaci&oacute;n del Curso
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">Nombre Completo</p>
                <p className="font-medium">{course.fullname}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase">Nombre Corto (C&oacute;digo)</p>
                <p className="font-mono">{course.shortname}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase">ID Local</p>
                  <p>{course.id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">ID Moodle</p>
                  <p>{course.moodleId}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase">Categor&iacute;a ID</p>
                <p>{course.categoryId || '-'}</p>
              </div>

              {course.idnumber && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">N&uacute;mero ID</p>
                  <p>{course.idnumber}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Fecha Inicio
                  </p>
                  <p className="text-sm">
                    {course.startdate
                      ? new Date(course.startdate).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Fecha Fin
                  </p>
                  <p className="text-sm">
                    {course.enddate
                      ? new Date(course.enddate).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })
                      : '-'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  &Uacute;ltima Sincronizaci&oacute;n
                </p>
                <p className="text-sm">
                  {course.lastSyncedAt
                    ? new Date(course.lastSyncedAt).toLocaleString('es-ES')
                    : 'No sincronizado'}
                </p>
              </div>

              {course.summary && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Descripci&oacute;n</p>
                  <p className="text-sm text-gray-600 mt-1">{course.summary}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Enrolled Users */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                <Users className="h-5 w-5 inline mr-2" />
                Personas Inscritas ({enrolledUsers?.length || 0})
              </h3>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre o usuario..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={roleFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRoleFilter('all')}
                >
                  Todos
                </Button>
                <Button
                  variant={roleFilter === 'student' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRoleFilter('student')}
                >
                  <GraduationCap className="h-4 w-4 mr-1" />
                  Estudiantes ({students.length})
                </Button>
                <Button
                  variant={roleFilter === 'teacher' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRoleFilter('teacher')}
                >
                  <UserCheck className="h-4 w-4 mr-1" />
                  Profesores ({teachers.length})
                </Button>
              </div>
            </div>

            {/* Users Table */}
            {usersLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : filteredUsers && filteredUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Usuario
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Rol
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Último Acceso
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredUsers.map((user: EnrolledUserWithDetails) => (
                      <tr key={`${user.moodleId}-${user.roleCode}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg ${
                                user.roleCode === 'student'
                                  ? 'bg-green-100'
                                  : 'bg-orange-100'
                              }`}
                            >
                              {user.roleCode === 'student' ? (
                                <GraduationCap
                                  className={`h-4 w-4 ${
                                    user.roleCode === 'student'
                                      ? 'text-green-600'
                                      : 'text-orange-600'
                                  }`}
                                />
                              ) : (
                                <UserCheck className="h-4 w-4 text-orange-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {user.firstname} {user.lastname}
                              </p>
                              <p className="text-xs text-gray-500">@{user.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant={user.roleCode === 'student' ? 'default' : 'secondary'}
                          >
                            {user.roleCode === 'student'
                              ? 'Estudiante'
                              : user.roleCode === 'editingteacher'
                              ? 'Profesor Editor'
                              : 'Profesor'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                            <Clock className="h-3 w-3" />
                            {user.lastCourseAccess
                              ? new Date(user.lastCourseAccess).toLocaleDateString('es-ES', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Nunca'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={user.enrolStatus === 'active' ? 'success' : 'secondary'}>
                            {user.enrolStatus === 'active' ? 'Activo' : 'Suspendido'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Users className="h-12 w-12 mb-4 text-gray-300" />
                <p>No hay personas inscritas</p>
                {search && <p className="text-sm">Intenta con otra b&uacute;squeda</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
