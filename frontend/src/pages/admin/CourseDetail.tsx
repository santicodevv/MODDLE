// Admin Course Detail Page - View course details and enrolled users
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi, usersApi } from '@/api';
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
  Plus,
  X,
  Star,
  Trash2,
} from 'lucide-react';
import type { EnrolledUserWithDetails, CourseTeacher } from '@/types';
import toast from 'react-hot-toast';

export default function AdminCourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'teacher'>(
    'all',
  );
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState('');

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

  // Fetch assigned teachers for the course
  const { data: assignedTeachers, isLoading: teachersLoading } = useQuery({
    queryKey: ['course-teachers', course?.moodleId],
    queryFn: () => coursesApi.getTeachersForCourse(course!.moodleId),
    enabled: !!course?.moodleId,
  });

  // Fetch all users with TEACHER role for add modal
  const { data: allTeachers } = useQuery({
    queryKey: ['all-teachers'],
    queryFn: () => usersApi.getAll({ limit: 1000 }),
    enabled: showAddTeacherModal,
  });

  // Filter available teachers (not already assigned)
  const availableTeachers =
    (allTeachers as any)?.users?.filter((user: any) => {
      // Check if user has TEACHER role
      const hasTeacherRole = user.roles?.some((r: any) => r.code === 'TEACHER');
      if (!hasTeacherRole) return false;

      // Check if already assigned
      const isAssigned = assignedTeachers?.some(
        (at) => at.teacherId === user.id,
      );
      if (isAssigned) return false;

      // Apply search filter
      if (teacherSearch) {
        const searchLower = teacherSearch.toLowerCase();
        return (
          user.displayName?.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower)
        );
      }
      return true;
    }) || [];

  // Mutations for teacher management
  const assignTeacherMutation = useMutation({
    mutationFn: (teacherId: number) =>
      coursesApi.assignTeachers(
        course!.moodleId,
        [teacherId],
        course!.fullname,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['course-teachers', course?.moodleId],
      });
      toast.success('Profesor asignado correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al asignar profesor');
    },
  });

  const removeTeacherMutation = useMutation({
    mutationFn: (teacherId: number) =>
      coursesApi.removeTeacher(course!.moodleId, teacherId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['course-teachers', course?.moodleId],
      });
      toast.success('Profesor removido correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al remover profesor');
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: (teacherId: number) =>
      coursesApi.setPrimaryTeacher(course!.moodleId, teacherId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['course-teachers', course?.moodleId],
      });
      toast.success('Profesor principal actualizado');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar');
    },
  });

  const filteredUsers = enrolledUsers?.filter(
    (user: EnrolledUserWithDetails) => {
      const matchesSearch =
        !search ||
        user.firstname.toLowerCase().includes(search.toLowerCase()) ||
        user.lastname.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase()) ||
        user.username.toLowerCase().includes(search.toLowerCase());

      const matchesRole =
        roleFilter === 'all' ||
        (roleFilter === 'student' && user.roleCode === 'student') ||
        (roleFilter === 'teacher' &&
          user.roleCode.toLowerCase().includes('teacher'));

      return matchesSearch && matchesRole;
    },
  );

  const students =
    enrolledUsers?.filter(
      (u: EnrolledUserWithDetails) => u.roleCode === 'student',
    ) || [];
  const teachers =
    enrolledUsers?.filter((u: EnrolledUserWithDetails) =>
      u.roleCode.toLowerCase().includes('teacher'),
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
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/admin/courses')}
        >
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
            <h1 className="text-2xl font-bold text-gray-900">
              {course.subjectName || course.fullname}
            </h1>
            <p className="mt-1 text-gray-600">
              Detalles del curso y personas inscritas
            </p>
          </div>
          <Badge
            variant={course.visible ? 'success' : 'secondary'}
            className="text-sm"
          >
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
                <p className="text-xs text-gray-500 uppercase">
                  Nombre Completo
                </p>
                <p className="font-medium">
                  {course.subjectName || course.fullname}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase">
                  Nombre Corto (C&oacute;digo)
                </p>
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
                <p className="text-xs text-gray-500 uppercase">
                  Categor&iacute;a ID
                </p>
                <p>{course.categoryId || '-'}</p>
              </div>

              {course.idnumber && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">
                    N&uacute;mero ID
                  </p>
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
                  <p className="text-xs text-gray-500 uppercase">
                    Descripci&oacute;n
                  </p>
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
                  variant={roleFilter === 'all' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setRoleFilter('all')}
                >
                  Todos
                </Button>
                <Button
                  variant={roleFilter === 'student' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setRoleFilter('student')}
                >
                  <GraduationCap className="h-4 w-4 mr-1" />
                  Estudiantes ({students.length})
                </Button>
                <Button
                  variant={roleFilter === 'teacher' ? 'primary' : 'outline'}
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
                      <tr
                        key={`${user.moodleId}-${user.roleCode}`}
                        className="hover:bg-gray-50"
                      >
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
                              <p className="text-xs text-gray-500">
                                @{user.username}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant={
                              user.roleCode === 'student'
                                ? 'default'
                                : 'secondary'
                            }
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
                              ? new Date(
                                  user.lastCourseAccess,
                                ).toLocaleDateString('es-ES', {
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
                          <Badge
                            variant={
                              user.enrolStatus === 'active'
                                ? 'success'
                                : 'secondary'
                            }
                          >
                            {user.enrolStatus === 'active'
                              ? 'Activo'
                              : 'Suspendido'}
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
                {search && (
                  <p className="text-sm">Intenta con otra b&uacute;squeda</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Teacher Management Section */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              <UserCheck className="h-5 w-5 inline mr-2" />
              Gestionar Profesores Asignados
            </h3>
            <Button size="sm" onClick={() => setShowAddTeacherModal(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Agregar Profesor
            </Button>
          </div>

          {/* Assigned Teachers List */}
          {teachersLoading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : assignedTeachers && assignedTeachers.length > 0 ? (
            <div className="space-y-2">
              {assignedTeachers.map((teacher: CourseTeacher) => (
                <div
                  key={teacher.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <UserCheck className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {teacher.teacher?.displayName ||
                            teacher.teacher?.email ||
                            `ID: ${teacher.teacherId}`}
                        </p>
                        {teacher.isPrimary && (
                          <Badge variant="warning" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Principal
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {teacher.teacher?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!teacher.isPrimary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setPrimaryMutation.mutate(teacher.teacherId)
                        }
                        disabled={setPrimaryMutation.isPending}
                        title="Establecer como principal"
                      >
                        <Star className="h-4 w-4 text-yellow-500" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (confirm('¿Remover este profesor del curso?')) {
                          removeTeacherMutation.mutate(teacher.teacherId);
                        }
                      }}
                      disabled={removeTeacherMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <UserCheck className="h-10 w-10 mx-auto text-gray-300 mb-2" />
              <p>No hay profesores asignados a este curso</p>
              <p className="text-sm">
                Haz clic en "Agregar Profesor" para asignar uno
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Teacher Modal */}
      {showAddTeacherModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Agregar Profesor</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddTeacherModal(false);
                  setTeacherSearch('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar profesor..."
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableTeachers.length > 0 ? (
                availableTeachers.map((teacher: any) => (
                  <div
                    key={teacher.id}
                    className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer"
                    onClick={() => {
                      assignTeacherMutation.mutate(teacher.id);
                      setShowAddTeacherModal(false);
                      setTeacherSearch('');
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <UserCheck className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {teacher.displayName || teacher.email}
                        </p>
                        <p className="text-sm text-gray-500">{teacher.email}</p>
                      </div>
                    </div>
                    <Plus className="h-4 w-4 text-blue-600" />
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No hay profesores disponibles para agregar
                </p>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddTeacherModal(false);
                  setTeacherSearch('');
                }}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
