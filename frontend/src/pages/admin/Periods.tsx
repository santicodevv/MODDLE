// Admin Periods Page
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
  Label,
} from '@/components/ui';
import {
  Calendar,
  Plus,
  Play,
  Square,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Period {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isReenrolmentOpen: boolean;
  createdAt: string;
}

export default function AdminPeriods() {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPeriod, setNewPeriod] = useState({
    name: '',
    startDate: '',
    endDate: '',
  });

  const { data: periods, isLoading } = useQuery({
    queryKey: ['admin-periods'],
    queryFn: async () => {
      const response = await api.get<Period[]>('/periods');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newPeriod) => {
      const response = await api.post('/periods', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-periods'] });
      setShowCreateForm(false);
      setNewPeriod({ name: '', startDate: '', endDate: '' });
      toast.success('Período creado exitosamente');
    },
    onError: () => {
      toast.error('Error al crear el período');
    },
  });

  const openMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post(`/periods/${id}/open`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-periods'] });
      toast.success('Período de reinscripción abierto');
    },
    onError: () => {
      toast.error('Error al abrir el período');
    },
  });

  const closeMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post(`/periods/${id}/close`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-periods'] });
      toast.success('Período de reinscripción cerrado');
    },
    onError: () => {
      toast.error('Error al cerrar el período');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newPeriod);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-7 w-7 text-blue-600" />
            Períodos Académicos
          </h1>
          <p className="mt-1 text-gray-600">
            Gestiona los períodos académicos y reinscripciones
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Período
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Crear Nuevo Período</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="name">Nombre del Período</Label>
                  <Input
                    id="name"
                    value={newPeriod.name}
                    onChange={(e) =>
                      setNewPeriod({ ...newPeriod, name: e.target.value })
                    }
                    placeholder="Ej: Período 2024-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="startDate">Fecha de Inicio</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={newPeriod.startDate}
                    onChange={(e) =>
                      setNewPeriod({ ...newPeriod, startDate: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Fecha de Fin</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={newPeriod.endDate}
                    onChange={(e) =>
                      setNewPeriod({ ...newPeriod, endDate: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <Spinner size="sm" className="mr-2" />
                  ) : null}
                  Crear Período
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Periods List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : periods && periods.length > 0 ? (
        <div className="grid gap-4">
          {periods.map((period) => (
            <Card key={period.id} className={period.isActive ? 'ring-2 ring-blue-500' : ''}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {period.name}
                      </h3>
                      <div className="flex gap-2">
                        {period.isActive ? (
                          <Badge variant="success">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactivo
                          </Badge>
                        )}
                        {period.isReenrolmentOpen ? (
                          <Badge variant="info">
                            <Clock className="h-3 w-3 mr-1" />
                            Reinscripción Abierta
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Inicio: {new Date(period.startDate).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Fin: {new Date(period.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {period.isActive && !period.isReenrolmentOpen ? (
                      <Button
                        variant="outline"
                        onClick={() => openMutation.mutate(period.id)}
                        disabled={openMutation.isPending}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Abrir Reinscripción
                      </Button>
                    ) : period.isActive && period.isReenrolmentOpen ? (
                      <Button
                        variant="outline"
                        onClick={() => closeMutation.mutate(period.id)}
                        disabled={closeMutation.isPending}
                      >
                        <Square className="h-4 w-4 mr-2" />
                        Cerrar Reinscripción
                      </Button>
                    ) : null}
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
              <p className="text-lg font-medium">No hay períodos académicos</p>
              <p className="text-sm mb-4">Crea un nuevo período para comenzar</p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Período
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
