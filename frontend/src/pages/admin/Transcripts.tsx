// Admin Transcripts Page - Generate and manage official records
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, downloadBlob } from '@/lib';
import {
  Card,
  CardContent,
  Badge,
  Spinner,
  Input,
  Button,
  Modal,
  Select,
} from '@/components/ui';
import {
  FileText,
  Search,
  Download,
  Plus,
  Eye,
  XCircle,
  CheckCircle,
  Clock,
  QrCode,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Transcript {
  id: number;
  studentId: number;
  student?: {
    id: number;
    email: string;
    displayName: string;
  };
  periodId?: number;
  period?: {
    id: number;
    code: string;
    name: string;
  };
  transcriptNumber: string;
  fileHash: string;
  status: 'generated' | 'revoked';
  generatedAt: string;
  revokedAt?: string;
  revokedReason?: string;
}

interface Student {
  id: number;
  email: string;
  displayName: string;
}

interface Period {
  id: number;
  code: string;
  name: string;
}

interface TranscriptsResponse {
  transcripts: Transcript[];
  total: number;
}

export default function AdminTranscripts() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [generateForm, setGenerateForm] = useState({
    studentId: '',
    periodId: '',
  });
  const limit = 20;
  const queryClient = useQueryClient();

  // Fetch transcripts
  const { data, isLoading } = useQuery({
    queryKey: ['admin-transcripts', page, search, statusFilter],
    queryFn: async () => {
      const response = await api.get<Transcript[]>('/transcripts', {
        params: {
          status: statusFilter || undefined,
          studentId: search || undefined,
        },
      });
      return {
        transcripts: response.data,
        total: response.data.length,
      };
    },
  });

  // Fetch students for generate modal
  const { data: students } = useQuery({
    queryKey: ['students-list'],
    queryFn: async () => {
      const response = await api.get<{ users: Student[] }>('/users', {
        params: { role: 'STUDENT', limit: 500 },
      });
      return response.data.users;
    },
    enabled: showGenerateModal,
  });

  // Fetch periods for generate modal
  const { data: periods } = useQuery({
    queryKey: ['periods'],
    queryFn: async () => {
      const response = await api.get<Period[]>('/periods');
      return response.data;
    },
    enabled: showGenerateModal,
  });

  // Generate transcript mutation
  const generateMutation = useMutation({
    mutationFn: async (data: { studentId: number; periodId?: number }) => {
      const response = await api.post('/transcripts', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Constancia generada exitosamente');
      setShowGenerateModal(false);
      setGenerateForm({ studentId: '', periodId: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-transcripts'] });
    },
    onError: () => {
      toast.error('Error al generar la constancia');
    },
  });

  // Revoke transcript mutation
  const revokeMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const response = await api.patch(`/transcripts/${id}/revoke`, { reason });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Constancia revocada');
      setShowRevokeModal(false);
      setSelectedTranscript(null);
      setRevokeReason('');
      queryClient.invalidateQueries({ queryKey: ['admin-transcripts'] });
    },
    onError: () => {
      toast.error('Error al revocar la constancia');
    },
  });

  const handleDownload = async (transcript: Transcript) => {
    try {
      const response = await api.get(`/transcripts/${transcript.id}/download`, {
        responseType: 'blob',
      });
      downloadBlob(response.data, `${transcript.transcriptNumber}.pdf`);
      toast.success('Constancia descargada');
    } catch (error) {
      toast.error('Error al descargar la constancia');
    }
  };

  const handleGenerate = () => {
    if (!generateForm.studentId) {
      toast.error('Selecciona un estudiante');
      return;
    }
    generateMutation.mutate({
      studentId: parseInt(generateForm.studentId),
      periodId: generateForm.periodId ? parseInt(generateForm.periodId) : undefined,
    });
  };

  const handleRevoke = () => {
    if (!selectedTranscript || !revokeReason.trim()) {
      toast.error('Ingresa el motivo de revocación');
      return;
    }
    revokeMutation.mutate({ id: selectedTranscript.id, reason: revokeReason });
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Constancias</h1>
          <p className="mt-1 text-gray-600">
            Generación y gestión de récord académico oficial
          </p>
        </div>
        <Button onClick={() => setShowGenerateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Generar Constancia
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Constancias Activas</p>
                <p className="text-xl font-bold text-green-600">
                  {data?.transcripts.filter((t) => t.status === 'generated').length ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Revocadas</p>
                <p className="text-xl font-bold text-red-600">
                  {data?.transcripts.filter((t) => t.status === 'revoked').length ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Generadas</p>
                <p className="text-xl font-bold text-blue-600">
                  {data?.total ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por número o estudiante..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-48"
            >
              <option value="">Todos los estados</option>
              <option value="generated">Activas</option>
              <option value="revoked">Revocadas</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transcripts Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : data?.transcripts && data.transcripts.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Número
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Estudiante
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Período
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Fecha Generación
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data.transcripts.map((transcript) => (
                      <tr key={transcript.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <QrCode className="h-4 w-4 text-gray-400" />
                            <span className="font-mono text-sm">
                              {transcript.transcriptNumber}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="font-medium text-sm">
                                {transcript.student?.displayName || 'N/A'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {transcript.student?.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {transcript.period ? (
                            <Badge variant="secondary">
                              {transcript.period.code}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-sm">Todos</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant={transcript.status === 'generated' ? 'success' : 'destructive'}
                          >
                            {transcript.status === 'generated' ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Activa
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                Revocada
                              </>
                            )}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="h-4 w-4" />
                            {new Date(transcript.generatedAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(transcript)}
                              disabled={transcript.status === 'revoked'}
                              title="Descargar PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {transcript.status === 'generated' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedTranscript(transcript);
                                  setShowRevokeModal(true);
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Revocar"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-gray-600">
                    Mostrando {(page - 1) * limit + 1} -{' '}
                    {Math.min(page * limit, data.total)} de {data.total}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mb-4 text-gray-300" />
              <p>No hay constancias generadas</p>
              <p className="text-sm">Genera una nueva constancia para un estudiante</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Generar Constancia"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estudiante *
            </label>
            <Select
              value={generateForm.studentId}
              onChange={(e) =>
                setGenerateForm({ ...generateForm, studentId: e.target.value })
              }
            >
              <option value="">Seleccionar estudiante...</option>
              {students?.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.displayName} ({student.email})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Período (opcional)
            </label>
            <Select
              value={generateForm.periodId}
              onChange={(e) =>
                setGenerateForm({ ...generateForm, periodId: e.target.value })
              }
            >
              <option value="">Todos los períodos</option>
              {periods?.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.name} ({period.code})
                </option>
              ))}
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Si no seleccionas período, se generará el récord completo
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowGenerateModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <Spinner size="sm" className="mr-2" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Generar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Revoke Modal */}
      <Modal
        isOpen={showRevokeModal}
        onClose={() => {
          setShowRevokeModal(false);
          setSelectedTranscript(null);
          setRevokeReason('');
        }}
        title="Revocar Constancia"
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">
                  Esta acción no se puede deshacer
                </p>
                <p className="text-sm text-yellow-700">
                  La constancia {selectedTranscript?.transcriptNumber} será marcada como
                  revocada y no podrá ser utilizada como documento oficial.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo de revocación *
            </label>
            <textarea
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              rows={3}
              placeholder="Ingresa el motivo de la revocación..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowRevokeModal(false);
                setSelectedTranscript(null);
                setRevokeReason('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={revokeMutation.isPending}
            >
              {revokeMutation.isPending ? (
                <Spinner size="sm" className="mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Revocar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
