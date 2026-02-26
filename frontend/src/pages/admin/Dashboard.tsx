// Admin Dashboard
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context';
import { api } from '@/lib';
import { Card, CardContent, Badge, Spinner } from '@/components/ui';
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
  Calendar
} from 'lucide-react';

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

export default function AdminDashboard() {
  const { user } = useAuth();

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
        params: { limit: 5 }
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
      value: Array.isArray(pendingReenrolments) ? pendingReenrolments.length : '-',
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
        <p className="mt-1 text-gray-600">
          Bienvenido, {user?.displayName}
        </p>
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
                    <p className="font-medium text-gray-900">{stats.activePeriod.name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(stats.activePeriod.startDate).toLocaleDateString()} - {new Date(stats.activePeriod.endDate).toLocaleDateString()}
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
                <span className="text-gray-900 font-medium">{stats?.totalUsers ?? '-'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Cursos Sincronizados</span>
                <span className="text-gray-900 font-medium">{stats?.totalCourses ?? '-'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Inscripciones</span>
                <span className="text-gray-900 font-medium">{stats?.totalEnrolments ?? '-'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Calificaciones</span>
                <span className="text-gray-900 font-medium">{stats?.totalGrades ?? '-'}</span>
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
                      <div className={`p-2 rounded-full ${
                        activity.action === 'CREATE' ? 'bg-green-100' :
                        activity.action === 'UPDATE' ? 'bg-blue-100' :
                        activity.action === 'DELETE' ? 'bg-red-100' : 'bg-gray-100'
                      }`}>
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
                        <p className="text-xs text-gray-500">{activity.actor?.email || 'Sistema'}</p>
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
