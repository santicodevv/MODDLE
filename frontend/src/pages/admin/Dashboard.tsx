// Admin Dashboard
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context';
import { api } from '@/lib';
import { Card, CardContent, Badge, Spinner, Button } from '@/components/ui';
import {
  Users,
  BookOpen,
  RefreshCw,
  Database,
  Clock,
  AlertCircle,
  TrendingUp,
  CheckCircle,
  XCircle,
  Calendar,
  ClipboardList,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalUsers: number;
  totalCourses: number;
  totalEnrolments: number;
  totalGrades: number;
  pendingReEnrolments: number;
  activePeriod?: {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
  };
}

interface RecentActivity {
  id: number;
  action: string;
  entity: string;
  entityKey: string;
  actorUserId: number;
  actor?: {
    id: number;
    email: string;
    displayName: string;
  };
  createdAt: string;
}

interface ActiveStudent {
  id: number;
  moodleId: number;
  firstname: string;
  lastname: string;
  email: string;
  lastAccess: string | null;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const response = await api.get<DashboardStats>('/reports/global/summary');
      return response.data;
    },
  });

  // Fetch recent activity
  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['admin-recent-activity'],
    queryFn: async () => {
      const response = await api.get<RecentActivity[]>('/audit', {
        params: { limit: 5 },
      });
      return response.data;
    },
  });

  // Fetch pending reenrolments count
  const { data: pendingReenrolments } = useQuery({
    queryKey: ['pending-reenrolments'],
    queryFn: async () => {
      const response = await api.get('/re-enrolments/pending');
      return response.data;
    },
  });

  // Fetch grade edit session status
  const { data: editSessionStatus } = useQuery({
    queryKey: ['edit-session-status'],
    queryFn: async () => {
      const response = await api.get('/grades/edit-session/status');
      return response.data;
    },
  });

  // Fetch active students
  const { data: activeStudents, isLoading: studentsLoading } = useQuery({
    queryKey: ['active-students'],
    queryFn: async () => {
      const response = await api.get<ActiveStudent[]>(
        '/reports/global/active-students',
        { params: { limit: 8 } },
      );
      return response.data;
    },
  });

  // Toggle edit session mutation
  const toggleEditSession = useMutation({
    mutationFn: async () => {
      const response = await api.post('/grades/edit-session/toggle');
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['edit-session-status'] });
      toast.success(data.message || 'Estado actualizado');
    },
    onError: () => {
      toast.error('Error al cambiar el estado');
    },
  });

  // Format relative time for last access
  const formatRelativeTime = (dateString: string | null): string => {
    if (!dateString) return 'Sin acceso';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return `${diffSeconds} segundos`;
    } else if (diffMinutes < 60) {
      const secs = diffSeconds % 60;
      return secs > 0
        ? `${diffMinutes} min ${secs} seg`
        : `${diffMinutes} minutos`;
    } else if (diffHours < 24) {
      const mins = diffMinutes % 60;
      return mins > 0
        ? `${diffHours} hora${diffHours > 1 ? 's' : ''} ${mins} min`
        : `${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    } else {
      return `${diffDays} día${diffDays > 1 ? 's' : ''}`;
    }
  };

  // Get initials for avatar
  const getInitials = (firstname: string, lastname: string): string => {
    const first = firstname?.charAt(0)?.toUpperCase() || '';
    const last = lastname?.charAt(0)?.toUpperCase() || '';
    return first + last || '??';
  };

  const statCards = [
    {
      label: 'Usuarios',
      value: stats?.totalUsers ?? '-',
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      label: 'Cursos',
      value: stats?.totalCourses ?? '-',
      icon: BookOpen,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      label: 'Inscripciones',
      value: stats?.totalEnrolments ?? '-',
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
    {
      label: 'Reinscripciones Pendientes',
      value: Array.isArray(pendingReenrolments)
        ? pendingReenrolments.length
        : '-',
      icon: RefreshCw,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Panel de Administración
        </h1>
        <p className="mt-1 text-gray-600">Bienvenido, {user?.displayName}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>
                    {statsLoading ? <Spinner size="sm" /> : stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Period */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Período Activo
              </h3>
              {stats?.activePeriod ? (
                <Badge variant="success">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Activo
                </Badge>
              ) : (
                <Badge variant="warning">
                  <Clock className="h-3 w-3 mr-1" />
                  Sin período activo
                </Badge>
              )}
            </div>
            {stats?.activePeriod ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {stats.activePeriod.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(
                        stats.activePeriod.startDate,
                      ).toLocaleDateString()}{' '}
                      -{' '}
                      {new Date(
                        stats.activePeriod.endDate,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <AlertCircle className="h-5 w-5 mr-2" />
                No hay período académico activo
              </div>
            )}
          </CardContent>
        </Card>

        {/* Grade Edit Session Toggle */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Edición de Notas
              </h3>
              {editSessionStatus?.isActive ? (
                <Badge variant="success">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Habilitada
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  Deshabilitada
                </Badge>
              )}
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                {editSessionStatus?.isActive
                  ? 'Los profesores pueden editar calificaciones. Una vez que guardan una nota, no podrán modificarla.'
                  : 'Los profesores no pueden editar calificaciones actualmente.'}
              </p>
              <Button
                variant={editSessionStatus?.isActive ? 'danger' : 'primary'}
                className="w-full"
                onClick={() => toggleEditSession.mutate()}
                disabled={toggleEditSession.isPending}
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                {editSessionStatus?.isActive
                  ? 'Deshabilitar Edición'
                  : 'Habilitar Edición'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Active Students */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Estudiantes Activos
              </h3>
              <Badge variant="info">
                <Users className="h-3 w-3 mr-1" />
                Último acceso
              </Badge>
            </div>
            {studentsLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : activeStudents && activeStudents.length > 0 ? (
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {activeStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                        {getInitials(student.firstname, student.lastname)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {student.firstname} {student.lastname}
                        </p>
                        <p className="text-xs text-gray-500">{student.email}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatRelativeTime(student.lastAccess)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <AlertCircle className="h-5 w-5 mr-2" />
                No hay datos de actividad
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sync Status */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Estado de Sincronización
              </h3>
              <Badge variant="success">
                <Database className="h-3 w-3 mr-1" />
                Conectado
              </Badge>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Usuarios Moodle</span>
                <span className="text-gray-900 font-medium">
                  {stats?.totalUsers ?? '-'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Cursos Sincronizados</span>
                <span className="text-gray-900 font-medium">
                  {stats?.totalCourses ?? '-'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Inscripciones</span>
                <span className="text-gray-900 font-medium">
                  {stats?.totalEnrolments ?? '-'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Calificaciones</span>
                <span className="text-gray-900 font-medium">
                  {stats?.totalGrades ?? '-'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Actividad Reciente
              </h3>
            </div>
            {activityLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-full ${
                          activity.action === 'CREATE'
                            ? 'bg-green-100'
                            : activity.action === 'UPDATE'
                              ? 'bg-blue-100'
                              : activity.action === 'DELETE'
                                ? 'bg-red-100'
                                : 'bg-gray-100'
                        }`}
                      >
                        {activity.action === 'CREATE' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : activity.action === 'DELETE' ? (
                          <XCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <RefreshCw className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {activity.action} - {activity.entity}
                        </p>
                        <p className="text-xs text-gray-500">
                          {activity.actor?.email || 'Sistema'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(activity.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <AlertCircle className="h-5 w-5 mr-2" />
                No hay actividad reciente
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
