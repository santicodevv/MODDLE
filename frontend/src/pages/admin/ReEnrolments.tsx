// Admin Re-Enrolments Page
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Course {
  id: number;
  name: string;
  shortName: string;
}

interface Student {
  id: number;
  displayName: string;
  email: string;
}

interface ReEnrolment {
  id: number;
  student: Student;
  course: Course;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED';
  requestedAt: string;
  processedAt?: string;
  appliedAt?: string;
  rejectionReason?: string;
}

export default function AdminReEnrolments() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: reenrolments, isLoading } = useQuery({
    queryKey: ['admin-reenrolments', statusFilter, page, search],
    queryFn: async () => {
      const endpoint = statusFilter === 'PENDING' ? '/re-enrolments/pending' : '/re-enrolments';
      const response = await api.get<ReEnrolment[]>(endpoint, {
        params: {
          page,
          limit,
          status: statusFilter !== 'PENDING' ? statusFilter : undefined,
          search: search || undefined
        },
      });
      return response.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post(`/re-enrolments/${id}/approve`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reenrolments'] });
      toast.success('Reinscripción aprobada');
    },
    onError: () => {
      toast.error('Error al aprobar la reinscripción');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const response = await api.post(`/re-enrolments/${id}/reject`, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reenrolments'] });
      toast.success('Reinscripción rechazada');
    },
    onError: () => {
      toast.error('Error al rechazar la reinscripción');
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post(`/re-enrolments/${id}/apply-to-moodle`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reenrolments'] });
      toast.success('Reinscripción aplicada a Moodle');
    },
    onError: () => {
      toast.error('Error al aplicar en Moodle');
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="warning">
            <Clock className="h-3 w-3 mr-1" />
            Pendiente
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge variant="info">
            <CheckCircle className="h-3 w-3 mr-1" />
            Aprobada
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="error">
            <XCircle className="h-3 w-3 mr-1" />
            Rechazada
          </Badge>
        );
      case 'APPLIED':
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

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por estudiante o curso..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {['PENDING', 'APPROVED', 'REJECTED', 'APPLIED'].map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setStatusFilter(status);
                    setPage(1);
                  }}
                >
                  {status === 'PENDING' && 'Pendientes'}
                  {status === 'APPROVED' && 'Aprobadas'}
                  {status === 'REJECTED' && 'Rechazadas'}
                  {status === 'APPLIED' && 'Aplicadas'}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Re-enrolments List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : reenrolments && reenrolments.length > 0 ? (
        <div className="space-y-4">
          {reenrolments.map((reenrolment) => (
            <Card key={reenrolment.id}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(reenrolment.status)}
                      <span className="text-sm text-gray-500">
                        Solicitado: {new Date(reenrolment.requestedAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-blue-100">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Estudiante</p>
                          <p className="font-medium text-gray-900">
                            {reenrolment.student.displayName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {reenrolment.student.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-green-100">
                          <BookOpen className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Curso</p>
                          <p className="font-medium text-gray-900">
                            {reenrolment.course.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {reenrolment.course.shortName}
                          </p>
                        </div>
                      </div>
                    </div>

                    {reenrolment.rejectionReason && (
                      <div className="mt-2 p-3 bg-red-50 rounded-lg">
                        <p className="text-sm text-red-700">
                          <strong>Motivo de rechazo:</strong> {reenrolment.rejectionReason}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {reenrolment.status === 'PENDING' && (
                      <>
                        <Button
                          onClick={() => approveMutation.mutate(reenrolment.id)}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Aprobar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const reason = prompt('Motivo del rechazo:');
                            if (reason) {
                              rejectMutation.mutate({ id: reenrolment.id, reason });
                            }
                          }}
                          disabled={rejectMutation.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Rechazar
                        </Button>
                      </>
                    )}
                    {reenrolment.status === 'APPROVED' && (
                      <Button
                        onClick={() => applyMutation.mutate(reenrolment.id)}
                        disabled={applyMutation.isPending}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Aplicar a Moodle
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <span className="text-sm text-gray-500">Página {page}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={reenrolments.length < limit}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-gray-500">
              <AlertCircle className="h-12 w-12 mb-4 text-gray-300" />
              <p className="text-lg font-medium">No hay solicitudes</p>
              <p className="text-sm">
                {statusFilter === 'PENDING'
                  ? 'No hay solicitudes pendientes de revisión'
                  : 'No se encontraron solicitudes con ese estado'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
