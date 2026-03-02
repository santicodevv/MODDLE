// Admin Re-Enrolments Page
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reenrolmentsApi, periodsApi } from '@/api';
import type { ReEnrolmentRequest, ReEnrolmentStatus } from '@/types';
import {
  Card,
  CardContent,
  Badge,
  Spinner,
  Button,
  Input,
} from '@/components/ui';
import {
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  User,
  BookOpen,
  AlertCircle,
  ArrowLeft,
  Calendar,
  FileText,
  Send,
  Eye,
  Filter,
  BarChart3,
  X,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

type ViewMode = 'list' | 'detail';

export default function AdminReEnrolments() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedRequest, setSelectedRequest] = useState<ReEnrolmentRequest | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReEnrolmentStatus | 'all'>('submitted');
  const [periodFilter, setPeriodFilter] = useState<number | 'all'>('all');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  // Fetch periods for filter
  const { data: periods } = useQuery({
    queryKey: ['periods-for-filter'],
    queryFn: () => periodsApi.getAll(),
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['reenrolment-stats', periodFilter],
    queryFn: () => reenrolmentsApi.getStats(periodFilter !== 'all' ? periodFilter : undefined),
  });

  // Fetch requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin-reenrolments', statusFilter, periodFilter, search],
    queryFn: async () => {
      let data: ReEnrolmentRequest[];

      if (periodFilter !== 'all') {
        data = await reenrolmentsApi.getByPeriod(periodFilter);
      } else if (statusFilter === 'submitted') {
        data = await reenrolmentsApi.getPending();
      } else {
        data = await reenrolmentsApi.getAll();
      }

      // Filter by status if not 'all' and not already filtered by pending
      if (statusFilter !== 'all' && statusFilter !== 'submitted') {
        data = data.filter(r => r.status === statusFilter);
      } else if (statusFilter === 'all') {
        // Show all except drafts for admin
        data = data.filter(r => r.status !== 'draft');
      }

      // Filter by search
      if (search) {
        const searchLower = search.toLowerCase();
        data = data.filter(r =>
          r.student?.displayName?.toLowerCase().includes(searchLower) ||
          r.student?.email?.toLowerCase().includes(searchLower) ||
          r.period?.name?.toLowerCase().includes(searchLower) ||
          r.period?.code?.toLowerCase().includes(searchLower)
        );
      }

      return data;
    },
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: (id: number) => reenrolmentsApi.approve(id),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-reenrolments'] });
      queryClient.invalidateQueries({ queryKey: ['reenrolment-stats'] });
      toast.success('Solicitud aprobada y aplicada a Moodle');
      // Update with fresh data from server including line statuses
      if (data) {
        setSelectedRequest(data);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al aprobar la solicitud');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      reenrolmentsApi.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reenrolments'] });
      queryClient.invalidateQueries({ queryKey: ['reenrolment-stats'] });
      toast.success('Solicitud rechazada');
      setRejectModalOpen(false);
      setRejectReason('');
      setRejectingId(null);
      if (selectedRequest) {
        setSelectedRequest({ ...selectedRequest, status: 'rejected' });
      }
    },
    onError: () => {
      toast.error('Error al rechazar la solicitud');
    },
  });

  const applyMutation = useMutation({
    mutationFn: (id: number) => reenrolmentsApi.applyToMoodle(id),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-reenrolments'] });
      queryClient.invalidateQueries({ queryKey: ['reenrolment-stats'] });
      toast.success('Inscripciones aplicadas a Moodle');
      // Update with fresh data from server including line statuses
      if (data) {
        setSelectedRequest(data);
      }
    },
    onError: () => {
      toast.error('Error al aplicar en Moodle');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => reenrolmentsApi.adminDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reenrolments'] });
      queryClient.invalidateQueries({ queryKey: ['reenrolment-stats'] });
      toast.success('Solicitud eliminada');
      if (selectedRequest) {
        setViewMode('list');
        setSelectedRequest(null);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar');
    },
  });

  const getStatusBadge = (status: ReEnrolmentStatus) => {
    switch (status) {
      case 'draft':
        return (
          <Badge variant="secondary">
            <FileText className="h-3 w-3 mr-1" />
            Borrador
          </Badge>
        );
      case 'submitted':
        return (
          <Badge variant="warning">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="info">
            <CheckCircle className="h-3 w-3 mr-1" />
            Aprobada
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="error">
            <XCircle className="h-3 w-3 mr-1" />
            Rechazada
          </Badge>
        );
      case 'applied':
        return (
          <Badge variant="success">
            <CheckCircle className="h-3 w-3 mr-1" />
            Aplicada
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const openRejectModal = (id: number) => {
    setRejectingId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleReject = () => {
    if (rejectingId && rejectReason.trim()) {
      rejectMutation.mutate({ id: rejectingId, reason: rejectReason.trim() });
    }
  };

  const viewDetail = (request: ReEnrolmentRequest) => {
    setSelectedRequest(request);
    setViewMode('detail');
  };

  const backToList = () => {
    setViewMode('list');
    setSelectedRequest(null);
  };

  // Detail View
  if (viewMode === 'detail' && selectedRequest) {
    return (
      <div>
        <div className="mb-6">
          <Button variant="ghost" onClick={backToList} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a la lista
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-7 w-7 text-blue-600" />
            Solicitud #{selectedRequest.id}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Student Info */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Información del Estudiante
                </h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Nombre</p>
                    <p className="font-medium">{selectedRequest.student?.displayName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{selectedRequest.student?.email || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Selected Courses */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-green-600" />
                  Cursos Seleccionados ({selectedRequest.lines?.length || 0})
                </h2>
                {selectedRequest.lines && selectedRequest.lines.length > 0 ? (
                  <div className="space-y-3">
                    {selectedRequest.lines.map((line) => (
                      <div
                        key={line.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <BookOpen className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {line.courseName || `Curso ID: ${line.courseMoodleId}`}
                            </p>
                            <p className="text-sm text-gray-500">
                              Moodle ID: {line.courseMoodleId}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {line.status === 'done' && (
                            <Badge variant="success">Inscrito</Badge>
                          )}
                          {line.status === 'pending' && (
                            <Badge variant="secondary">Pendiente</Badge>
                          )}
                          {line.status === 'failed' && (
                            <Badge variant="error" title={line.lastError}>
                              Error
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No hay cursos seleccionados
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {selectedRequest.notes && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold mb-4">Notas del Estudiante</h2>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedRequest.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status & Actions */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Estado</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedRequest.status)}
                  </div>

                  {selectedRequest.status === 'submitted' && (
                    <div className="pt-4 border-t space-y-2">
                      <Button
                        className="w-full"
                        onClick={() => approveMutation.mutate(selectedRequest.id)}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {approveMutation.isPending ? 'Aprobando...' : 'Aprobar y Aplicar'}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => openRejectModal(selectedRequest.id)}
                        disabled={rejectMutation.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Rechazar Solicitud
                      </Button>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <Button
                      variant="danger"
                      className="w-full"
                      onClick={() => {
                        if (confirm('¿Eliminar esta solicitud? Esta accion no se puede deshacer.')) {
                          deleteMutation.mutate(selectedRequest.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar Solicitud
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Period Info */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  Período
                </h2>
                <div className="space-y-2">
                  <p className="font-medium">{selectedRequest.period?.name || 'N/A'}</p>
                  <p className="text-sm text-gray-500">
                    Código: {selectedRequest.period?.code || 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Dates */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4">Fechas</h2>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-500">Creada</p>
                    <p>{new Date(selectedRequest.createdAt).toLocaleString()}</p>
                  </div>
                  {selectedRequest.submittedAt && (
                    <div>
                      <p className="text-gray-500">Enviada</p>
                      <p>{new Date(selectedRequest.submittedAt).toLocaleString()}</p>
                    </div>
                  )}
                  {selectedRequest.decidedAt && (
                    <div>
                      <p className="text-gray-500">Procesada</p>
                      <p>{new Date(selectedRequest.decidedAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Reject Modal */}
        {rejectModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Rechazar Solicitud</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRejectModalOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo del rechazo *
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Indica el motivo por el cual se rechaza esta solicitud..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setRejectModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || rejectMutation.isPending}
                >
                  {rejectMutation.isPending ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    'Confirmar Rechazo'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // List View
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <RefreshCw className="h-7 w-7 text-blue-600" />
          Solicitudes de Reinscripción
        </h1>
        <p className="mt-1 text-gray-600">
          Revisa y gestiona las solicitudes de reinscripción de estudiantes
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold text-yellow-600">{stats.submitted || 0}</p>
              <p className="text-sm text-gray-500">Pendientes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-600">{stats.approved || 0}</p>
              <p className="text-sm text-gray-500">Aprobadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-600">{stats.rejected || 0}</p>
              <p className="text-sm text-gray-500">Rechazadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Send className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.applied || 0}</p>
              <p className="text-sm text-gray-500">Aplicadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <BarChart3 className="h-5 w-5 text-gray-600" />
              </div>
              <p className="text-2xl font-bold text-gray-600">
                {(stats.submitted || 0) + (stats.approved || 0) + (stats.rejected || 0) + (stats.applied || 0)}
              </p>
              <p className="text-sm text-gray-500">Total</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por estudiante o período..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                >
                  <option value="all">Todos los períodos</option>
                  {periods?.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.code} - {period.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'submitted', 'approved', 'rejected', 'applied'] as const).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                >
                  {status === 'all' && 'Todas'}
                  {status === 'submitted' && 'Pendientes'}
                  {status === 'approved' && 'Aprobadas'}
                  {status === 'rejected' && 'Rechazadas'}
                  {status === 'applied' && 'Aplicadas'}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : requests && requests.length > 0 ? (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      {getStatusBadge(request.status)}
                      <span className="text-sm text-gray-500">
                        #{request.id}
                      </span>
                      {request.submittedAt && (
                        <span className="text-sm text-gray-500">
                          Enviada: {new Date(request.submittedAt).toLocaleString()}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-blue-100">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Estudiante</p>
                          <p className="font-medium text-gray-900">
                            {request.student?.displayName || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {request.student?.email || ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-purple-100">
                          <Calendar className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Período</p>
                          <p className="font-medium text-gray-900">
                            {request.period?.name || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {request.period?.code || ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-green-100">
                          <BookOpen className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Cursos</p>
                          <p className="font-medium text-gray-900">
                            {request.lines?.length || 0} cursos seleccionados
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" onClick={() => viewDetail(request)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalle
                    </Button>
                    {request.status === 'submitted' && (
                      <>
                        <Button
                          onClick={() => approveMutation.mutate(request.id)}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {approveMutation.isPending ? 'Aplicando...' : 'Aprobar'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => openRejectModal(request.id)}
                          disabled={rejectMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Rechazar
                        </Button>
                      </>
                    )}
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
              <p className="text-lg font-medium">No hay solicitudes</p>
              <p className="text-sm">
                {statusFilter === 'submitted'
                  ? 'No hay solicitudes pendientes de revisión'
                  : 'No se encontraron solicitudes con los filtros seleccionados'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Rechazar Solicitud</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRejectModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo del rechazo *
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Indica el motivo por el cual se rechaza esta solicitud..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setRejectModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleReject}
                disabled={!rejectReason.trim() || rejectMutation.isPending}
              >
                {rejectMutation.isPending ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  'Confirmar Rechazo'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
