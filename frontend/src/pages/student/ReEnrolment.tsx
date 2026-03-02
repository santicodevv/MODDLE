// Student Re-Enrolment Page
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { periodsApi, reenrolmentsApi } from '@/api';
import {
  Card,
  CardContent,
  Button,
  Spinner,
  Badge,
} from '@/components/ui';
import {
  RefreshCw,
  BookOpen,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Trash2,
  Plus,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { AcademicPeriod, PeriodAvailableCourse, ReEnrolmentRequest } from '@/types';

type ViewMode = 'periods' | 'select-courses' | 'history';

export default function StudentReEnrolment() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('periods');
  const [selectedPeriod, setSelectedPeriod] = useState<AcademicPeriod | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<number[]>([]);

  // Períodos con reinscripción abierta
  const { data: openPeriods, isLoading: loadingPeriods } = useQuery({
    queryKey: ['periods-open-reenrolment'],
    queryFn: () => periodsApi.getOpenForReenrolment(),
  });

  // Solicitudes del estudiante
  const { data: myRequests, isLoading: loadingRequests } = useQuery({
    queryKey: ['my-reenrolments'],
    queryFn: () => reenrolmentsApi.getMine(),
  });

  // Cursos disponibles del período seleccionado
  const { data: availableCourses, isLoading: loadingCourses } = useQuery({
    queryKey: ['available-courses', selectedPeriod?.id],
    queryFn: () => periodsApi.getAvailableCourses(selectedPeriod!.id),
    enabled: !!selectedPeriod,
  });

  // Borrador existente del período seleccionado
  const { data: existingDraft } = useQuery({
    queryKey: ['my-draft', selectedPeriod?.id],
    queryFn: () => reenrolmentsApi.getMyDraft(selectedPeriod!.id),
    enabled: !!selectedPeriod,
  });

  // Mutaciones
  const createMutation = useMutation({
    mutationFn: (data: { periodId: number; courses: { courseMoodleId: number }[] }) =>
      reenrolmentsApi.create({ ...data, notes: '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reenrolments'] });
      queryClient.invalidateQueries({ queryKey: ['my-draft'] });
      toast.success('Solicitud creada');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear solicitud');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, courses }: { id: number; courses: { courseMoodleId: number }[] }) =>
      reenrolmentsApi.update(id, { courses }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reenrolments'] });
      queryClient.invalidateQueries({ queryKey: ['my-draft'] });
      toast.success('Solicitud actualizada');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar');
    },
  });

  const submitMutation = useMutation({
    mutationFn: (id: number) => reenrolmentsApi.submit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reenrolments'] });
      queryClient.invalidateQueries({ queryKey: ['my-draft'] });
      toast.success('Solicitud enviada para revisión');
      setViewMode('history');
      setSelectedPeriod(null);
      setSelectedCourses([]);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al enviar');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => reenrolmentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reenrolments'] });
      queryClient.invalidateQueries({ queryKey: ['my-draft'] });
      toast.success('Borrador eliminado');
      setSelectedCourses([]);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar');
    },
  });

  // Handlers
  const handleSelectPeriod = (period: AcademicPeriod) => {
    setSelectedPeriod(period);
    setSelectedCourses([]);
    setViewMode('select-courses');
  };

  const handleToggleCourse = (courseMoodleId: number) => {
    setSelectedCourses((prev) =>
      prev.includes(courseMoodleId)
        ? prev.filter((id) => id !== courseMoodleId)
        : [...prev, courseMoodleId],
    );
  };

  const handleSaveDraft = async () => {
    if (!selectedPeriod) return;

    const courses = selectedCourses.map((id) => ({ courseMoodleId: id }));

    if (existingDraft) {
      updateMutation.mutate({ id: existingDraft.id, courses });
    } else {
      createMutation.mutate({ periodId: selectedPeriod.id, courses });
    }
  };

  const handleSubmit = async () => {
    if (!existingDraft && !selectedCourses.length) {
      toast.error('Selecciona al menos un curso');
      return;
    }

    // Si no hay borrador, crear primero
    if (!existingDraft) {
      const courses = selectedCourses.map((id) => ({ courseMoodleId: id }));
      const created = await reenrolmentsApi.create({
        periodId: selectedPeriod!.id,
        courses,
        notes: '',
      });
      submitMutation.mutate(created.id);
    } else {
      // Si hay cambios, actualizar primero
      if (selectedCourses.length > 0) {
        const courses = selectedCourses.map((id) => ({ courseMoodleId: id }));
        await reenrolmentsApi.update(existingDraft.id, { courses });
      }
      submitMutation.mutate(existingDraft.id);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { variant: any; icon: any; label: string }> = {
      draft: { variant: 'secondary', icon: Clock, label: 'Borrador' },
      submitted: { variant: 'warning', icon: Clock, label: 'En revisión' },
      approved: { variant: 'info', icon: CheckCircle, label: 'Aprobada' },
      rejected: { variant: 'error', icon: XCircle, label: 'Rechazada' },
      applied: { variant: 'success', icon: CheckCircle, label: 'Aplicada' },
    };
    const config = configs[status] || configs.draft;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  // Inicializar cursos seleccionados cuando se carga el borrador
  if (existingDraft && selectedCourses.length === 0 && viewMode === 'select-courses') {
    const draftCourseIds = existingDraft.lines?.map((l) => l.courseMoodleId) || [];
    if (draftCourseIds.length > 0) {
      setSelectedCourses(draftCourseIds);
    }
  }

  // Obtener cursos ya solicitados (en solicitudes submitted, approved o applied) para el período seleccionado
  const getAlreadyRequestedCourses = (): Set<number> => {
    if (!selectedPeriod || !myRequests) return new Set();

    const requestedCourses = new Set<number>();
    myRequests
      .filter(
        (r) =>
          r.periodId === selectedPeriod.id &&
          ['submitted', 'approved', 'applied'].includes(r.status)
      )
      .forEach((request) => {
        request.lines?.forEach((line) => {
          requestedCourses.add(Number(line.courseMoodleId));
        });
      });

    return requestedCourses;
  };

  const alreadyRequestedCourses = getAlreadyRequestedCourses();

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <RefreshCw className="h-7 w-7 text-blue-600" />
          Reinscripción
        </h1>
        <p className="mt-1 text-gray-600">
          Solicita tu reinscripción para el próximo período académico
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={viewMode === 'periods' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => {
            setViewMode('periods');
            setSelectedPeriod(null);
            setSelectedCourses([]);
          }}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Períodos Disponibles
        </Button>
        <Button
          variant={viewMode === 'history' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setViewMode('history')}
        >
          <Clock className="h-4 w-4 mr-2" />
          Mis Solicitudes
        </Button>
      </div>

      {/* Vista: Períodos disponibles */}
      {viewMode === 'periods' && (
        <div>
          {loadingPeriods ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : openPeriods && openPeriods.length > 0 ? (
            <div className="grid gap-4">
              {openPeriods.map((period) => {
                const hasSubmitted = myRequests?.some(
                  (r) => r.periodId === period.id && r.status === 'submitted',
                );
                const hasDraft = myRequests?.some(
                  (r) => r.periodId === period.id && r.status === 'draft',
                );

                return (
                  <Card
                    key={period.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => !hasSubmitted && handleSelectPeriod(period)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-lg bg-blue-100">
                            <Calendar className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {period.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              Código: {period.code}
                            </p>
                            <p className="text-sm text-gray-500">
                              Reinscripción hasta:{' '}
                              {period.reenrolmentEndDate
                                ? new Date(period.reenrolmentEndDate).toLocaleDateString()
                                : 'Sin fecha límite'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {hasSubmitted && (
                            <Badge variant="warning">Ya tienes solicitud</Badge>
                          )}
                          {hasDraft && !hasSubmitted && (
                            <Badge variant="secondary">Borrador pendiente</Badge>
                          )}
                          {!hasSubmitted && (
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12">
                <div className="flex flex-col items-center justify-center text-gray-500">
                  <AlertCircle className="h-12 w-12 mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No hay períodos disponibles</p>
                  <p className="text-sm">
                    Actualmente no hay ningún período con reinscripción abierta
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Vista: Seleccionar cursos */}
      {viewMode === 'select-courses' && selectedPeriod && (
        <div>
          {/* Breadcrumb */}
          <div className="mb-6">
            <button
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
              onClick={() => {
                setViewMode('periods');
                setSelectedPeriod(null);
                setSelectedCourses([]);
              }}
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
              Volver a períodos
            </button>
          </div>

          {/* Período seleccionado */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedPeriod.name}
                  </h2>
                  <p className="text-gray-500">
                    Selecciona los cursos en los que deseas inscribirte
                  </p>
                </div>
                {existingDraft && (
                  <Badge variant="secondary">
                    Borrador guardado
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Lista de cursos */}
          {loadingCourses ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : availableCourses && availableCourses.length > 0 ? (
            <>
              <div className="grid gap-3 mb-6">
                {availableCourses.map((course) => {
                  const isSelected = selectedCourses.includes(course.courseMoodleId);
                  const isAlreadyRequested = alreadyRequestedCourses.has(Number(course.courseMoodleId));
                  const isDisabled = isAlreadyRequested;

                  return (
                    <Card
                      key={course.id}
                      className={`transition-all ${
                        isDisabled
                          ? 'opacity-60 cursor-not-allowed bg-gray-50'
                          : isSelected
                          ? 'ring-2 ring-blue-500 bg-blue-50 cursor-pointer'
                          : 'hover:shadow-md cursor-pointer'
                      }`}
                      onClick={() => !isDisabled && handleToggleCourse(course.courseMoodleId)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              isAlreadyRequested
                                ? 'bg-green-600 border-green-600'
                                : isSelected
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-gray-300'
                            }`}
                          >
                            {(isSelected || isAlreadyRequested) && (
                              <CheckCircle className="h-4 w-4 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-gray-400" />
                              <span className={`font-medium ${isDisabled ? 'text-gray-500' : 'text-gray-900'}`}>
                                {course.courseName || `Curso ${course.courseMoodleId}`}
                              </span>
                              {isAlreadyRequested && (
                                <Badge variant="success" className="ml-2">
                                  Ya solicitado
                                </Badge>
                              )}
                            </div>
                            {course.courseShortname && (
                              <p className="text-sm text-gray-500 ml-6">
                                {course.courseShortname}
                              </p>
                            )}
                          </div>
                          {course.maxStudents && (
                            <div className="text-sm text-gray-500">
                              {course.enrolledCount}/{course.maxStudents} inscritos
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Resumen y acciones */}
              <Card className="sticky bottom-4">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Cursos seleccionados</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {selectedCourses.length}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      {existingDraft && (
                        <Button
                          variant="outline"
                          onClick={() => deleteMutation.mutate(existingDraft.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar borrador
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={handleSaveDraft}
                        disabled={
                          selectedCourses.length === 0 ||
                          createMutation.isPending ||
                          updateMutation.isPending
                        }
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Guardar borrador
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={
                          selectedCourses.length === 0 ||
                          submitMutation.isPending ||
                          createMutation.isPending
                        }
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Enviar solicitud
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-12">
                <div className="flex flex-col items-center justify-center text-gray-500">
                  <AlertCircle className="h-12 w-12 mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No hay cursos disponibles</p>
                  <p className="text-sm">
                    No hay cursos habilitados para este período
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Vista: Historial de solicitudes */}
      {viewMode === 'history' && (
        <div>
          {loadingRequests ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : myRequests && myRequests.length > 0 ? (
            <div className="space-y-4">
              {myRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          {getStatusBadge(request.status)}
                          <span className="text-sm text-gray-500">
                            Creada: {new Date(request.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {request.period?.name || `Período ${request.periodId}`}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Código: {request.period?.code}
                          </p>
                        </div>

                        {request.lines && request.lines.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              Cursos solicitados ({request.lines.length}):
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {request.lines.map((line) => (
                                <Badge key={line.id} variant="secondary">
                                  <BookOpen className="h-3 w-3 mr-1" />
                                  {line.courseName || `Curso ${line.courseMoodleId}`}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {request.status === 'rejected' && (
                          <div className="mt-3 p-3 bg-red-50 rounded-lg">
                            <p className="text-sm text-red-700">
                              <strong>Motivo:</strong>{' '}
                              {(request as any).rejectionReason || 'No especificado'}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {request.status === 'draft' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const period = openPeriods?.find(
                                  (p) => p.id === request.periodId,
                                );
                                if (period) {
                                  handleSelectPeriod(period);
                                }
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => submitMutation.mutate(request.id)}
                              disabled={submitMutation.isPending}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Enviar
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
                  <p className="text-lg font-medium">No tienes solicitudes</p>
                  <p className="text-sm mb-4">
                    Aún no has realizado ninguna solicitud de reinscripción
                  </p>
                  <Button onClick={() => setViewMode('periods')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Solicitud
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
