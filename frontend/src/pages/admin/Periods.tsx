// Admin Periods Page
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { periodsApi } from '@/api';
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
  Settings,
  BookOpen,
  ChevronRight,
  Trash2,
  Save,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { AcademicPeriod, PeriodAvailableCourse } from '@/types';

type ViewMode = 'list' | 'detail' | 'courses';

interface MoodleCourse {
  id: number;
  moodleId: number;
  shortname: string;
  fullname: string;
  categoryId: number;
}

export default function AdminPeriods() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPeriod, setSelectedPeriod] = useState<AcademicPeriod | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showReenrolmentConfig, setShowReenrolmentConfig] = useState(false);

  // Form states
  const [newPeriod, setNewPeriod] = useState({
    code: '',
    name: '',
    startDate: '',
    endDate: '',
    description: '',
  });
  const [reenrolmentConfig, setReenrolmentConfig] = useState({
    reenrolmentStartDate: '',
    reenrolmentEndDate: '',
  });
  const [selectedCoursesToAdd, setSelectedCoursesToAdd] = useState<number[]>([]);

  // Queries
  const { data: periods, isLoading: loadingPeriods } = useQuery({
    queryKey: ['admin-periods'],
    queryFn: () => periodsApi.getAll(),
  });

  const { data: availableCourses, isLoading: loadingAvailableCourses } = useQuery({
    queryKey: ['period-available-courses', selectedPeriod?.id],
    queryFn: () => periodsApi.getAllAvailableCourses(selectedPeriod!.id),
    enabled: !!selectedPeriod && viewMode === 'courses',
  });

  const { data: moodleCourses, isLoading: loadingMoodleCourses } = useQuery({
    queryKey: ['moodle-courses'],
    queryFn: async () => {
      const response = await api.get<{ data: MoodleCourse[]; total: number }>('/courses', {
        params: { limit: 1000 }, // Get all courses
      });
      return response.data.data;
    },
    enabled: viewMode === 'courses',
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: typeof newPeriod) => periodsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-periods'] });
      setShowCreateForm(false);
      setNewPeriod({ code: '', name: '', startDate: '', endDate: '', description: '' });
      toast.success('Período creado');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear período');
    },
  });

  const configReenrolmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof reenrolmentConfig }) =>
      periodsApi.configureReenrolment(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-periods'] });
      setSelectedPeriod(updated);
      setShowReenrolmentConfig(false);
      toast.success('Configuración de reinscripción actualizada');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al configurar');
    },
  });

  const openReenrolmentMutation = useMutation({
    mutationFn: (id: number) => periodsApi.openReenrolment(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-periods'] });
      setSelectedPeriod(updated);
      toast.success('Reinscripción abierta');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al abrir reinscripción');
    },
  });

  const closeReenrolmentMutation = useMutation({
    mutationFn: (id: number) => periodsApi.closeReenrolment(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-periods'] });
      setSelectedPeriod(updated);
      toast.success('Reinscripción cerrada');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al cerrar reinscripción');
    },
  });

  const openPeriodMutation = useMutation({
    mutationFn: (id: number) => periodsApi.open(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-periods'] });
      setSelectedPeriod(updated);
      toast.success('Período abierto');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error');
    },
  });

  const closePeriodMutation = useMutation({
    mutationFn: (id: number) => periodsApi.close(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-periods'] });
      setSelectedPeriod(updated);
      toast.success('Período cerrado');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error');
    },
  });

  const addCoursesMutation = useMutation({
    mutationFn: ({ periodId, courses }: { periodId: number; courses: any[] }) =>
      periodsApi.addAvailableCourses(periodId, { courses }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['period-available-courses'] });
      setSelectedCoursesToAdd([]);
      toast.success('Cursos agregados');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al agregar cursos');
    },
  });

  const removeCoursesMutation = useMutation({
    mutationFn: ({ periodId, courseMoodleIds }: { periodId: number; courseMoodleIds: number[] }) =>
      periodsApi.removeAvailableCourses(periodId, courseMoodleIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['period-available-courses'] });
      toast.success('Curso eliminado');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar');
    },
  });

  const toggleCourseMutation = useMutation({
    mutationFn: ({
      periodId,
      courseMoodleId,
      enabled,
    }: {
      periodId: number;
      courseMoodleId: number;
      enabled: boolean;
    }) => periodsApi.updateAvailableCourse(periodId, courseMoodleId, { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['period-available-courses'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error');
    },
  });

  // Handlers
  const handleSelectPeriod = (period: AcademicPeriod) => {
    setSelectedPeriod(period);
    setReenrolmentConfig({
      reenrolmentStartDate: period.reenrolmentStartDate?.split('T')[0] || '',
      reenrolmentEndDate: period.reenrolmentEndDate?.split('T')[0] || '',
    });
    setViewMode('detail');
  };

  const handleAddCourses = () => {
    if (!selectedPeriod || selectedCoursesToAdd.length === 0) return;

    const courses = selectedCoursesToAdd.map((moodleId) => {
      const course = moodleCourses?.find((c) => c.moodleId === moodleId);
      return {
        courseMoodleId: moodleId,
        courseName: course?.fullname,
        courseShortname: course?.shortname,
        categoryMoodleId: course?.categoryId,
      };
    });

    addCoursesMutation.mutate({ periodId: selectedPeriod.id, courses });
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { variant: any; icon: any; label: string }> = {
      planned: { variant: 'secondary', icon: Clock, label: 'Planificado' },
      open: { variant: 'success', icon: CheckCircle, label: 'Abierto' },
      closed: { variant: 'error', icon: XCircle, label: 'Cerrado' },
    };
    const config = configs[status] || configs.planned;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  // Filter courses that are not already added
  const coursesToShow = moodleCourses?.filter(
    (c) => !availableCourses?.some((ac) => ac.courseMoodleId === c.moodleId),
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-7 w-7 text-blue-600" />
            Períodos Académicos
          </h1>
          <p className="mt-1 text-gray-600">
            Gestiona los períodos académicos y configura reinscripciones
          </p>
        </div>
        {viewMode === 'list' && (
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Período
          </Button>
        )}
      </div>

      {/* Create Form */}
      {showCreateForm && viewMode === 'list' && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Crear Nuevo Período</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(newPeriod);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="code">Código</Label>
                  <Input
                    id="code"
                    value={newPeriod.code}
                    onChange={(e) => setNewPeriod({ ...newPeriod, code: e.target.value })}
                    placeholder="Ej: 2026.2"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={newPeriod.name}
                    onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })}
                    placeholder="Ej: Segundo Semestre 2026"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="startDate">Fecha Inicio</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={newPeriod.startDate}
                    onChange={(e) => setNewPeriod({ ...newPeriod, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Fecha Fin</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={newPeriod.endDate}
                    onChange={(e) => setNewPeriod({ ...newPeriod, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  Crear Período
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <>
          {loadingPeriods ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : periods && periods.length > 0 ? (
            <div className="grid gap-4">
              {periods.map((period) => (
                <Card
                  key={period.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleSelectPeriod(period)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-blue-100">
                          <Calendar className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900">{period.name}</h3>
                            {getStatusBadge(period.status)}
                            {period.reenrolmentOpen && (
                              <Badge variant="info">
                                <Play className="h-3 w-3 mr-1" />
                                Reinscripción Activa
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            Código: {period.code} |{' '}
                            {new Date(period.startDate).toLocaleDateString()} -{' '}
                            {new Date(period.endDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
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
        </>
      )}

      {/* DETAIL VIEW */}
      {viewMode === 'detail' && selectedPeriod && (
        <div>
          {/* Back button */}
          <button
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 mb-6"
            onClick={() => {
              setViewMode('list');
              setSelectedPeriod(null);
            }}
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            Volver a períodos
          </button>

          {/* Period Header */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-gray-900">{selectedPeriod.name}</h2>
                    {getStatusBadge(selectedPeriod.status)}
                    {selectedPeriod.reenrolmentOpen && (
                      <Badge variant="info">
                        <Play className="h-3 w-3 mr-1" />
                        Reinscripción Activa
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-500">Código: {selectedPeriod.code}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Período: {new Date(selectedPeriod.startDate).toLocaleDateString()} -{' '}
                    {new Date(selectedPeriod.endDate).toLocaleDateString()}
                  </p>
                  {selectedPeriod.reenrolmentStartDate && selectedPeriod.reenrolmentEndDate && (
                    <p className="text-sm text-gray-500">
                      Reinscripción:{' '}
                      {new Date(selectedPeriod.reenrolmentStartDate).toLocaleDateString()} -{' '}
                      {new Date(selectedPeriod.reenrolmentEndDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {selectedPeriod.status === 'planned' && (
                    <Button onClick={() => openPeriodMutation.mutate(selectedPeriod.id)}>
                      <Play className="h-4 w-4 mr-2" />
                      Abrir Período
                    </Button>
                  )}
                  {selectedPeriod.status === 'open' && (
                    <Button
                      variant="outline"
                      onClick={() => closePeriodMutation.mutate(selectedPeriod.id)}
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Cerrar Período
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Reenrolment Config */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuración de Reinscripción
                </h3>

                {showReenrolmentConfig ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Fecha inicio reinscripción</Label>
                      <Input
                        type="date"
                        value={reenrolmentConfig.reenrolmentStartDate}
                        onChange={(e) =>
                          setReenrolmentConfig({
                            ...reenrolmentConfig,
                            reenrolmentStartDate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Fecha fin reinscripción</Label>
                      <Input
                        type="date"
                        value={reenrolmentConfig.reenrolmentEndDate}
                        onChange={(e) =>
                          setReenrolmentConfig({
                            ...reenrolmentConfig,
                            reenrolmentEndDate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() =>
                          configReenrolmentMutation.mutate({
                            id: selectedPeriod.id,
                            data: reenrolmentConfig,
                          })
                        }
                        disabled={configReenrolmentMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Guardar
                      </Button>
                      <Button variant="outline" onClick={() => setShowReenrolmentConfig(false)}>
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600">
                      {selectedPeriod.reenrolmentStartDate && selectedPeriod.reenrolmentEndDate ? (
                        <>
                          <p>
                            Inicio:{' '}
                            {new Date(selectedPeriod.reenrolmentStartDate).toLocaleDateString()}
                          </p>
                          <p>
                            Fin: {new Date(selectedPeriod.reenrolmentEndDate).toLocaleDateString()}
                          </p>
                        </>
                      ) : (
                        <p className="text-gray-400">No configurado</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setShowReenrolmentConfig(true)}>
                        <Settings className="h-4 w-4 mr-2" />
                        Configurar Fechas
                      </Button>
                      {selectedPeriod.reenrolmentStartDate &&
                        selectedPeriod.reenrolmentEndDate &&
                        !selectedPeriod.reenrolmentOpen && (
                          <Button
                            onClick={() => openReenrolmentMutation.mutate(selectedPeriod.id)}
                            disabled={openReenrolmentMutation.isPending}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Abrir Reinscripción
                          </Button>
                        )}
                      {selectedPeriod.reenrolmentOpen && (
                        <Button
                          variant="outline"
                          onClick={() => closeReenrolmentMutation.mutate(selectedPeriod.id)}
                          disabled={closeReenrolmentMutation.isPending}
                        >
                          <Square className="h-4 w-4 mr-2" />
                          Cerrar Reinscripción
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Courses Management */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Cursos Disponibles
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Gestiona qué cursos estarán disponibles para reinscripción en este período.
                </p>
                <Button onClick={() => setViewMode('courses')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Gestionar Cursos
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* COURSES VIEW */}
      {viewMode === 'courses' && selectedPeriod && (
        <div>
          {/* Back button */}
          <button
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1 mb-6"
            onClick={() => setViewMode('detail')}
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            Volver al período
          </button>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Cursos disponibles para {selectedPeriod.name}
              </h2>
              <p className="text-gray-500">
                Agrega o quita cursos que estarán disponibles para reinscripción
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Available Courses */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Cursos Habilitados</h3>
                {loadingAvailableCourses ? (
                  <div className="flex justify-center py-8">
                    <Spinner />
                  </div>
                ) : availableCourses && availableCourses.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {availableCourses.map((course) => (
                      <div
                        key={course.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          course.enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <BookOpen className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {course.courseName || `Curso ${course.courseMoodleId}`}
                            </p>
                            {course.courseShortname && (
                              <p className="text-sm text-gray-500">{course.courseShortname}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              toggleCourseMutation.mutate({
                                periodId: selectedPeriod.id,
                                courseMoodleId: course.courseMoodleId,
                                enabled: !course.enabled,
                              })
                            }
                          >
                            {course.enabled ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              removeCoursesMutation.mutate({
                                periodId: selectedPeriod.id,
                                courseMoodleIds: [course.courseMoodleId],
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No hay cursos habilitados para este período
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Add Courses */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Agregar Cursos</h3>
                {loadingMoodleCourses ? (
                  <div className="flex justify-center py-8">
                    <Spinner />
                  </div>
                ) : coursesToShow && coursesToShow.length > 0 ? (
                  <>
                    <div className="space-y-2 max-h-72 overflow-y-auto mb-4">
                      {coursesToShow.map((course) => {
                        const isSelected = selectedCoursesToAdd.includes(course.moodleId);
                        return (
                          <div
                            key={course.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-blue-50 border-blue-300'
                                : 'hover:bg-gray-50'
                            }`}
                            onClick={() =>
                              setSelectedCoursesToAdd((prev) =>
                                isSelected
                                  ? prev.filter((id) => id !== course.moodleId)
                                  : [...prev, course.moodleId],
                              )
                            }
                          >
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                isSelected
                                  ? 'bg-blue-600 border-blue-600'
                                  : 'border-gray-300'
                              }`}
                            >
                              {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{course.fullname}</p>
                              <p className="text-sm text-gray-500">{course.shortname}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Button
                      onClick={handleAddCourses}
                      disabled={selectedCoursesToAdd.length === 0 || addCoursesMutation.isPending}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar {selectedCoursesToAdd.length} curso(s)
                    </Button>
                  </>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No hay más cursos disponibles para agregar
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
