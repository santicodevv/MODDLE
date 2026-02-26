// Admin Sync Page - Enhanced with Integration Features
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib';
import {
  Card,
  CardContent,
  Badge,
  Spinner,
  Button,
} from '@/components/ui';
import {
  Database,
  RefreshCw,
  Users,
  BookOpen,
  UserPlus,
  ClipboardList,
  CheckCircle,
  Clock,
  AlertCircle,
  Play,
  Wifi,
  WifiOff,
  Zap,
  RotateCcw,
  Server,
  Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SyncState {
  entity: string;
  lastCheckpoint?: string;
  lastSyncedAt?: string;
}

interface SyncStatus {
  states: SyncState[];
  isRunning: boolean;
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  moodleConnected: boolean;
  responseTimeMs: number;
  coursesAvailable?: number;
  error?: string;
  checkedAt: string;
}

interface IntegrationStatus {
  moodle: {
    status: string;
    coursesInMoodle: number;
  };
  mirror: {
    users: number;
    courses: number;
    enrolments: number;
    gradeItems: number;
    grades: number;
  };
  syncStates: SyncState[];
  generatedAt: string;
}

interface ReconcileResult {
  success: boolean;
  message: string;
  before: Record<string, number>;
  after: Record<string, number>;
  differences: Record<string, number>;
  completedAt: string;
}

const entityConfig: Record<string, { label: string; icon: typeof Users; color: string; bgColor: string }> = {
  users: { label: 'Usuarios', icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  courses: { label: 'Cursos', icon: BookOpen, color: 'text-green-600', bgColor: 'bg-green-100' },
  enrolments: { label: 'Inscripciones', icon: UserPlus, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  grade_items: { label: 'Items Calificación', icon: ClipboardList, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  grades: { label: 'Calificaciones', icon: ClipboardList, color: 'text-red-600', bgColor: 'bg-red-100' },
};

export default function AdminSync() {
  const queryClient = useQueryClient();
  const [showReconcileResult, setShowReconcileResult] = useState<ReconcileResult | null>(null);

  // Fetch sync status
  const { data: syncStatus, isLoading: syncLoading } = useQuery({
    queryKey: ['sync-status'],
    queryFn: async () => {
      const response = await api.get<SyncStatus>('/sync/status');
      return response.data;
    },
    refetchInterval: 5000,
  });

  // Fetch health status
  const { data: healthStatus, isLoading: healthLoading } = useQuery({
    queryKey: ['moodle-health'],
    queryFn: async () => {
      const response = await api.get<HealthStatus>('/integrations/moodle/health');
      return response.data;
    },
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Fetch detailed integration status
  const { data: integrationStatus, isLoading: integrationLoading } = useQuery({
    queryKey: ['integration-status'],
    queryFn: async () => {
      const response = await api.get<IntegrationStatus>('/integrations/moodle/status');
      return response.data;
    },
    refetchInterval: 10000,
  });

  // Trigger full sync
  const triggerAllMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/sync/trigger');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['integration-status'] });
      toast.success('Sincronización completa iniciada');
    },
    onError: () => {
      toast.error('Error al iniciar sincronización');
    },
  });

  // Trigger entity sync
  const triggerEntityMutation = useMutation({
    mutationFn: async (entity: string) => {
      const response = await api.post(`/sync/trigger/${entity.toLowerCase()}`);
      return response.data;
    },
    onSuccess: (_, entity) => {
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['integration-status'] });
      toast.success(`Sincronización de ${entityConfig[entity]?.label || entity} iniciada`);
    },
    onError: () => {
      toast.error('Error al iniciar sincronización');
    },
  });

  // Bootstrap sync (initial full import)
  const bootstrapMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/integrations/moodle/sync/bootstrap');
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['integration-status'] });
      toast.success(`Bootstrap completado: ${data.syncedCounts?.users || 0} usuarios, ${data.syncedCounts?.courses || 0} cursos`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error en bootstrap');
    },
  });

  // Reconcile sync
  const reconcileMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<ReconcileResult>('/integrations/moodle/sync/reconcile');
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['integration-status'] });
      setShowReconcileResult(data);
      toast.success('Reconciliación completada');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error en reconciliación');
    },
  });

  const formatLastSync = (dateStr?: string) => {
    if (!dateStr) return 'Nunca';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const getTimeSinceSync = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `Hace ${diffDays} día(s)`;
    if (diffHours > 0) return `Hace ${diffHours} hora(s)`;
    if (diffMins > 0) return `Hace ${diffMins} minuto(s)`;
    return 'Hace menos de un minuto';
  };

  const isAnyMutationPending =
    triggerAllMutation.isPending ||
    bootstrapMutation.isPending ||
    reconcileMutation.isPending;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="h-7 w-7 text-blue-600" />
            Sincronización con Moodle
          </h1>
          <p className="mt-1 text-gray-600">
            Gestiona la sincronización de datos entre MODDLE y Moodle
          </p>
        </div>
      </div>

      {/* Health Check & Connection Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Moodle Connection Status */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${healthStatus?.moodleConnected ? 'bg-green-100' : 'bg-red-100'}`}>
                  {healthLoading ? (
                    <Spinner size="sm" />
                  ) : healthStatus?.moodleConnected ? (
                    <Wifi className="h-6 w-6 text-green-600" />
                  ) : (
                    <WifiOff className="h-6 w-6 text-red-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Conexión Moodle
                  </h3>
                  <p className="text-sm text-gray-500">
                    {healthStatus?.moodleConnected
                      ? `Conectado (${healthStatus.responseTimeMs}ms)`
                      : healthStatus?.error || 'Desconectado'}
                  </p>
                </div>
              </div>
              <Badge variant={healthStatus?.moodleConnected ? 'success' : 'destructive'}>
                {healthStatus?.moodleConnected ? 'Online' : 'Offline'}
              </Badge>
            </div>
            {healthStatus?.coursesAvailable !== undefined && (
              <p className="mt-3 text-sm text-gray-500">
                Cursos disponibles en Moodle: <span className="font-semibold">{healthStatus.coursesAvailable}</span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${syncStatus?.isRunning ? 'bg-yellow-100' : 'bg-green-100'}`}>
                  {syncStatus?.isRunning ? (
                    <RefreshCw className="h-6 w-6 text-yellow-600 animate-spin" />
                  ) : (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Estado del Sistema
                  </h3>
                  <p className="text-sm text-gray-500">
                    {syncStatus?.isRunning ? 'Sincronización en progreso...' : 'Sistema sincronizado'}
                  </p>
                </div>
              </div>
              <Badge variant={syncStatus?.isRunning ? 'warning' : 'success'}>
                {syncStatus?.isRunning ? (
                  <>
                    <Clock className="h-3 w-3 mr-1" />
                    En Progreso
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Listo
                  </>
                )}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mirror Stats */}
      {!integrationLoading && integrationStatus && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Server className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Datos en Mirror Local</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <Users className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-blue-600">{integrationStatus.mirror.users}</p>
                <p className="text-xs text-gray-500">Usuarios</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <BookOpen className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-600">{integrationStatus.mirror.courses}</p>
                <p className="text-xs text-gray-500">Cursos</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <UserPlus className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-purple-600">{integrationStatus.mirror.enrolments}</p>
                <p className="text-xs text-gray-500">Inscripciones</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <ClipboardList className="h-6 w-6 text-orange-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-orange-600">{integrationStatus.mirror.gradeItems}</p>
                <p className="text-xs text-gray-500">Items Calif.</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <Activity className="h-6 w-6 text-red-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-600">{integrationStatus.mirror.grades}</p>
                <p className="text-xs text-gray-500">Calificaciones</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Acciones de Sincronización</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => triggerAllMutation.mutate()}
              disabled={isAnyMutationPending || syncStatus?.isRunning}
            >
              {triggerAllMutation.isPending ? (
                <Spinner size="sm" className="mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sincronizar Todo
            </Button>

            <Button
              variant="outline"
              onClick={() => bootstrapMutation.mutate()}
              disabled={isAnyMutationPending || syncStatus?.isRunning || !healthStatus?.moodleConnected}
            >
              {bootstrapMutation.isPending ? (
                <Spinner size="sm" className="mr-2" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Bootstrap (Sync Inicial)
            </Button>

            <Button
              variant="outline"
              onClick={() => reconcileMutation.mutate()}
              disabled={isAnyMutationPending || syncStatus?.isRunning || !healthStatus?.moodleConnected}
            >
              {reconcileMutation.isPending ? (
                <Spinner size="sm" className="mr-2" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Reconciliar
            </Button>
          </div>
          <p className="mt-3 text-sm text-gray-500">
            <strong>Bootstrap:</strong> Reinicia y hace sync completo desde cero.
            <strong className="ml-2">Reconciliar:</strong> Compara y repara diferencias entre Moodle y mirror local.
          </p>
        </CardContent>
      </Card>

      {/* Reconcile Result Modal */}
      {showReconcileResult && (
        <Card className="mb-6 border-2 border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Resultado de Reconciliación</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowReconcileResult(null)}>
                Cerrar
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium text-gray-700 mb-2">Antes</p>
                {Object.entries(showReconcileResult.before).map(([key, value]) => (
                  <p key={key} className="text-gray-600">{key}: {value}</p>
                ))}
              </div>
              <div>
                <p className="font-medium text-gray-700 mb-2">Después</p>
                {Object.entries(showReconcileResult.after).map(([key, value]) => (
                  <p key={key} className="text-gray-600">{key}: {value}</p>
                ))}
              </div>
              <div>
                <p className="font-medium text-gray-700 mb-2">Diferencias</p>
                {Object.entries(showReconcileResult.differences).map(([key, value]) => (
                  <p key={key} className={value !== 0 ? 'text-green-600 font-medium' : 'text-gray-600'}>
                    {key}: {value > 0 ? `+${value}` : value}
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entity Sync Status */}
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado por Entidad</h3>
      {syncLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-4">
          {Object.entries(entityConfig).map(([entity, config]) => {
            const state = integrationStatus?.syncStates?.find(
              s => s.entity.toLowerCase() === entity.toLowerCase()
            );
            const Icon = config.icon;

            return (
              <Card key={entity}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${config.bgColor}`}>
                        <Icon className={`h-6 w-6 ${config.color}`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {config.label}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Última sync: {formatLastSync(state?.lastSyncedAt)}
                          </span>
                          {state?.lastSyncedAt && (
                            <span className="text-blue-600">
                              {getTimeSinceSync(state.lastSyncedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {state?.lastSyncedAt ? (
                        <Badge variant="success">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Sincronizado
                        </Badge>
                      ) : (
                        <Badge variant="warning">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Pendiente
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => triggerEntityMutation.mutate(entity)}
                        disabled={triggerEntityMutation.isPending || syncStatus?.isRunning}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Sincronizar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info Card */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900">Información de Sincronización</h4>
              <ul className="mt-2 text-sm text-gray-600 space-y-1">
                <li><strong>Incremental:</strong> Se ejecuta automáticamente cada minuto (solo cambios recientes).</li>
                <li><strong>Reconciliación:</strong> Se ejecuta diariamente a las 2:00 AM (sync completo).</li>
                <li><strong>Bootstrap:</strong> Usa esto para la primera importación o para reiniciar desde cero.</li>
                <li><strong>Watermarks:</strong> El sistema usa timestamps para sincronizar solo datos modificados.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
