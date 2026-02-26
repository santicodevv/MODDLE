// Admin Audit Page
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib';
import {
  Card,
  CardContent,
  Badge,
  Spinner,
  Input,
  Button,
} from '@/components/ui';
import {
  FileSearch,
  Search,
  User,
  RefreshCw,
  Plus,
  Trash2,
  Clock,
  AlertCircle,
  Filter,
} from 'lucide-react';

interface AuditLog {
  id: number;
  actorUserId: number;
  actor?: {
    id: number;
    email: string;
    displayName: string;
  };
  action: string;
  entity: string;
  entityKey: string;
  beforeData?: any;
  afterData?: any;
  source: string;
  createdAt: string;
}

const actionIcons: Record<string, typeof Plus> = {
  CREATE: Plus,
  UPDATE: RefreshCw,
  DELETE: Trash2,
};

const actionColors: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-600',
  UPDATE: 'bg-blue-100 text-blue-600',
  DELETE: 'bg-red-100 text-red-600',
};

const sourceLabels: Record<string, string> = {
  app: 'Aplicación',
  moodle: 'Moodle',
  sync: 'Sincronización',
};

export default function AdminAudit() {
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 50;

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', page, search, entityFilter],
    queryFn: async () => {
      const response = await api.get<AuditLog[]>('/audit', {
        params: {
          limit: page * limit,
          entity: entityFilter || undefined,
        },
      });
      return response.data;
    },
  });

  // Get unique entities for filter
  const entities = logs
    ? [...new Set(logs.map((log) => log.entity))].sort()
    : [];

  // Filter logs based on search
  const filteredLogs = logs?.filter((log) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      log.entity.toLowerCase().includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower) ||
      log.entityKey.toLowerCase().includes(searchLower) ||
      log.actor?.email.toLowerCase().includes(searchLower) ||
      log.actor?.displayName.toLowerCase().includes(searchLower)
    );
  });

  const getActionBadge = (action: string) => {
    const Icon = actionIcons[action] || RefreshCw;
    const colorClass = actionColors[action] || 'bg-gray-100 text-gray-600';

    return (
      <div className={`p-2 rounded-full ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
    );
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileSearch className="h-7 w-7 text-blue-600" />
          Registro de Auditoría
        </h1>
        <p className="mt-1 text-gray-600">
          Historial de actividades y cambios en el sistema
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar en el registro..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={entityFilter}
                onChange={(e) => {
                  setEntityFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">Todas las entidades</option>
                {entities.map((entity) => (
                  <option key={entity} value={entity}>
                    {entity}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-500 flex items-center">
              {filteredLogs?.length || 0} registros
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : filteredLogs && filteredLogs.length > 0 ? (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <Card key={log.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {getActionBadge(log.action)}

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">
                        {log.action}
                      </span>
                      <Badge variant="secondary">{log.entity}</Badge>
                      <span className="text-sm text-gray-500">
                        ID: {log.entityKey}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      {log.actor ? (
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {log.actor.displayName || log.actor.email}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          Sistema
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                      <Badge variant="outline">
                        {sourceLabels[log.source] || log.source}
                      </Badge>
                    </div>

                    {/* Show data changes for updates */}
                    {log.action === 'UPDATE' && (log.beforeData || log.afterData) && (
                      <details className="mt-3">
                        <summary className="text-sm text-blue-600 cursor-pointer hover:underline">
                          Ver cambios
                        </summary>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          {log.beforeData && (
                            <div className="p-3 bg-red-50 rounded-lg">
                              <p className="font-medium text-red-700 mb-1">Antes:</p>
                              <pre className="text-red-600 overflow-auto max-h-32">
                                {JSON.stringify(log.beforeData, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.afterData && (
                            <div className="p-3 bg-green-50 rounded-lg">
                              <p className="font-medium text-green-700 mb-1">Después:</p>
                              <pre className="text-green-600 overflow-auto max-h-32">
                                {JSON.stringify(log.afterData, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </details>
                    )}

                    {/* Show data for creates */}
                    {log.action === 'CREATE' && log.afterData && (
                      <details className="mt-3">
                        <summary className="text-sm text-blue-600 cursor-pointer hover:underline">
                          Ver datos
                        </summary>
                        <div className="mt-2 p-3 bg-green-50 rounded-lg text-xs">
                          <pre className="text-green-600 overflow-auto max-h-32">
                            {JSON.stringify(log.afterData, null, 2)}
                          </pre>
                        </div>
                      </details>
                    )}

                    {/* Show data for deletes */}
                    {log.action === 'DELETE' && log.beforeData && (
                      <details className="mt-3">
                        <summary className="text-sm text-blue-600 cursor-pointer hover:underline">
                          Ver datos eliminados
                        </summary>
                        <div className="mt-2 p-3 bg-red-50 rounded-lg text-xs">
                          <pre className="text-red-600 overflow-auto max-h-32">
                            {JSON.stringify(log.beforeData, null, 2)}
                          </pre>
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Load More */}
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={() => setPage((p) => p + 1)}
              disabled={isLoading}
            >
              Cargar más registros
            </Button>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-gray-500">
              <AlertCircle className="h-12 w-12 mb-4 text-gray-300" />
              <p className="text-lg font-medium">No hay registros de auditoría</p>
              <p className="text-sm">
                {search || entityFilter
                  ? 'No se encontraron registros con esos filtros'
                  : 'No hay actividad registrada aún'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
