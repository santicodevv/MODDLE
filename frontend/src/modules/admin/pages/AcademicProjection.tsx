import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3, Plus, Trash2, Pencil, X, Check, Loader2, Search, Download, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn, downloadBlob } from '@/shared/lib';
import Button from '@/shared/components/ui/Button';
import { projectionApi } from '../api/projection.api';
import { coursesApi } from '../api/courses.api';
import type { AcademicProgram } from '../types/projection.types';
import type { MoodleCourse } from '../types/course.types';

const TABS = [
  { id: 'programs', label: 'Programas' },
  { id: 'study-plan', label: 'Plan de Estudio' },
  { id: 'students', label: 'Estudiantes por Programa' },
  { id: 'demand-subject', label: 'Demanda por Asignatura' },
  { id: 'demand-level', label: 'Demanda por Nivel' },
  { id: 'sections', label: 'Proyección de Secciones' },
  { id: 'matrix', label: 'Matriz de Pendientes' },
];

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-gray-500">
      <p>{message}</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-red-500">
      <p>{message}</p>
    </div>
  );
}

function ExportExcelButton({
  onExport,
  filename,
}: {
  onExport: () => Promise<Blob>;
  filename: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    try {
      setDownloading(true);
      setError(null);
      const blob = await onExport();
      downloadBlob(blob, filename);
    } catch {
      setError('Error al exportar');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-xs text-red-500">{error}</span>}
      <Button
        size="sm"
        variant="outline"
        onClick={handleClick}
        isLoading={downloading}
        leftIcon={<Download className="w-4 h-4" />}
      >
        Exportar Excel
      </Button>
    </div>
  );
}

function ProgramModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  isPending,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; code: string; description?: string }) => void;
  initialData?: AcademicProgram | null;
  isPending: boolean;
}) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [code, setCode] = useState(initialData?.code ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {initialData ? 'Editar Programa' : 'Nuevo Programa'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave({ name, code, description: description || undefined });
          }}
          className="p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ej: ING-INFO"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ej: Ingeniería Informática"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Descripción opcional"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isPending}>
              {initialData ? 'Guardar Cambios' : 'Crear Programa'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProgramsTab({ programs }: { programs: AcademicProgram[] }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicProgram | null>(null);

  const createMutation = useMutation({
    mutationFn: projectionApi.createProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-programs'] });
      setModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<{ name: string; code: string; description?: string }> }) =>
      projectionApi.updateProgram(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic-programs'] });
      setModalOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: projectionApi.deleteProgram,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['academic-programs'] }),
  });

  const syncCategoriesMutation = useMutation({
    mutationFn: () => coursesApi.syncCategories(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['academic-programs'] });
      if (result.programsCreated > 0) {
        toast.success(
          `Categorías sincronizadas (${result.synced}). Programas creados: ${result.programsCreated}.`,
        );
      } else {
        toast.success(
          `Categorías sincronizadas (${result.synced}). No se crearon programas nuevos.`,
        );
      }
    },
    onError: () => toast.error('Error al sincronizar categorías'),
  });

  return (
    <div>
      <div className="flex justify-end gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncCategoriesMutation.mutate()}
          isLoading={syncCategoriesMutation.isPending}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Sincronizar categorías
        </Button>
        <Button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Nuevo Programa
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Código</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Descripción</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {programs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  No hay programas académicos registrados
                </td>
              </tr>
            ) : (
              programs.map((program) => (
                <tr key={program.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{program.code}</td>
                  <td className="px-4 py-3 text-gray-700">
                    <div className="flex items-center gap-2">
                      <span>{program.name}</span>
                      {program.moodleCategoryId != null && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                          title="Programa sincronizado desde una categoría de Moodle"
                        >
                          Moodle
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                    {program.description || '-'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setEditing(program); setModalOpen(true); }}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Eliminar el programa "${program.name}"?`)) {
                            deleteMutation.mutate(program.id);
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ProgramModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={(data) => {
          if (editing) {
            updateMutation.mutate({ id: editing.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        initialData={editing}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}

function ProgramSelector({
  programs,
  selectedProgramId,
  onChange,
}: {
  programs: AcademicProgram[];
  selectedProgramId: number | null;
  onChange: (id: number | null) => void;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <label className="text-sm font-medium text-gray-700">Programa:</label>
      <select
        value={selectedProgramId ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value="">Todos los programas</option>
        {programs.map((p) => (
          <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
        ))}
      </select>
    </div>
  );
}

function StudyPlanTab({ programs }: { programs: AcademicProgram[] }) {
  const queryClient = useQueryClient();
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [courseMoodleId, setCourseMoodleId] = useState('');
  const [level, setLevel] = useState('');

  const { data: studyPlans = [], isLoading, isError } = useQuery({
    queryKey: ['study-plans', selectedProgramId],
    queryFn: () => projectionApi.getStudyPlans(selectedProgramId!),
    enabled: !!selectedProgramId,
  });

  const { data: moodleCoursesData } = useQuery({
    queryKey: ['moodle-courses'],
    queryFn: () => coursesApi.getAll({ limit: 200 }),
    enabled: !!selectedProgramId,
  });

  const moodleCourses =
    (moodleCoursesData as unknown as { courses: MoodleCourse[] } | undefined)
      ?.courses ?? [];

  const asignaturaOptions = moodleCourses.filter(
    (c) => c.visible === true || (c.code && c.code.trim().length > 0),
  );

  const addMutation = useMutation({
    mutationFn: () => {
      if (!selectedProgramId) throw new Error('No program selected');
      return projectionApi.addStudyPlan(selectedProgramId, {
        courseMoodleId: Number(courseMoodleId),
        level: Number(level),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['study-plans', selectedProgramId] });
      setCourseMoodleId('');
      setLevel('');
    },
  });

  const removeMutation = useMutation({
    mutationFn: projectionApi.removeStudyPlan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['study-plans', selectedProgramId] }),
  });

  return (
    <div>
      <ProgramSelector programs={programs} selectedProgramId={selectedProgramId} onChange={setSelectedProgramId} />

      {!selectedProgramId && <EmptyState message="Selecciona un programa para ver su plan de estudio" />}

      {isLoading && <LoadingSpinner />}
      {isError && <ErrorState message="Error al cargar el plan de estudio" />}

      {selectedProgramId && !isLoading && !isError && (
        <>
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Agregar Asignatura</h3>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Curso</label>
                <select
                  value={courseMoodleId}
                  onChange={(e) => setCourseMoodleId(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[240px]"
                >
                  <option value="">Seleccionar curso...</option>
                  {asignaturaOptions.map((c) => (
                    <option key={c.id} value={c.moodleId}>
                      {c.shortname} - {c.fullname}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nivel</label>
                <input
                  type="number"
                  min={1}
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="1"
                />
              </div>
              <Button
                onClick={() => addMutation.mutate()}
                disabled={!courseMoodleId || !level}
                isLoading={addMutation.isPending}
                leftIcon={<Plus className="w-4 h-4" />}
                size="sm"
              >
                Agregar
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Curso</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nivel</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {studyPlans.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                      No hay asignaturas en el plan de estudio
                    </td>
                  </tr>
                ) : (
                  studyPlans.map((sp) => (
                    <tr key={sp.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">{sp.courseName ?? `Curso #${sp.courseMoodleId}`}</td>
                      <td className="px-4 py-3 text-gray-700">Nivel {sp.level}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            if (window.confirm('¿Eliminar esta asignatura del plan de estudio?')) {
                              removeMutation.mutate(sp.id);
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function StudentsTab({ programs }: { programs: AcademicProgram[] }) {
  const queryClient = useQueryClient();
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [searchUserId, setSearchUserId] = useState('');
  const [lookupUserId, setLookupUserId] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [entryDate, setEntryDate] = useState('');

  const { data: studentPrograms = [], isLoading, isError } = useQuery({
    queryKey: ['student-programs', lookupUserId],
    queryFn: () => projectionApi.getStudentPrograms(Number(lookupUserId)),
    enabled: !!lookupUserId,
  });

  const addMutation = useMutation({
    mutationFn: () => {
      if (!selectedProgramId) throw new Error('No program selected');
      return projectionApi.assignStudent({
        userId: Number(userId),
        programId: selectedProgramId,
        entryDate: entryDate || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-programs'] });
      setUserId('');
      setEntryDate('');
    },
  });

  const removeMutation = useMutation({
    mutationFn: projectionApi.removeStudentProgram,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['student-programs'] }),
  });

  return (
    <div>
      <ProgramSelector programs={programs} selectedProgramId={selectedProgramId} onChange={setSelectedProgramId} />

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Asignar Estudiante</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">ID de Usuario</label>
            <input
              type="number"
              min={1}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="ID"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de Ingreso</label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <Button
            onClick={() => addMutation.mutate()}
            disabled={!userId || !selectedProgramId}
            isLoading={addMutation.isPending}
            leftIcon={<Plus className="w-4 h-4" />}
            size="sm"
          >
            Asignar
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Consultar Programas de un Estudiante</h3>
        <div className="flex gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">ID de Estudiante</label>
            <input
              type="number"
              min={1}
              value={searchUserId}
              onChange={(e) => setSearchUserId(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="ID"
            />
          </div>
          <Button
            onClick={() => setLookupUserId(searchUserId)}
            disabled={!searchUserId}
            leftIcon={<Search className="w-4 h-4" />}
            size="sm"
            variant="outline"
          >
            Buscar
          </Button>
        </div>
      </div>

      {lookupUserId && (
        <>
          {isLoading && <LoadingSpinner />}
          {isError && <ErrorState message="Error al consultar los programas del estudiante" />}
          {!isLoading && !isError && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Programa</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha de Ingreso</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Asignado Desde</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {studentPrograms.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        El estudiante no está asignado a ningún programa
                      </td>
                    </tr>
                  ) : (
                    studentPrograms.map((sp) => {
                      const program = programs.find((p) => p.id === sp.programId);
                      return (
                        <tr key={sp.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {program ? `${program.code} - ${program.name}` : `Programa #${sp.programId}`}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {sp.entryDate ? new Date(sp.entryDate).toLocaleDateString('es-VE') : '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {new Date(sp.createdAt).toLocaleDateString('es-VE')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                if (window.confirm('¿Remover este estudiante del programa?')) {
                                  removeMutation.mutate(sp.id);
                                }
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                              title="Remover"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DemandBySubjectTab() {
  const { data: programs = [] } = useQuery({
    queryKey: ['academic-programs'],
    queryFn: projectionApi.getPrograms,
  });

  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);

  const { data: demand = [], isLoading, isError } = useQuery({
    queryKey: ['demand-by-subject', selectedProgramId],
    queryFn: () => projectionApi.getDemandBySubject(selectedProgramId ?? undefined),
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <ProgramSelector programs={programs} selectedProgramId={selectedProgramId} onChange={setSelectedProgramId} />
        <ExportExcelButton
          filename="oferta_demanda_asignatura.xlsx"
          onExport={() => projectionApi.exportDemandBySubject(selectedProgramId ?? undefined)}
        />
      </div>
      {isLoading && <LoadingSpinner />}
      {isError && <ErrorState message="Error al cargar la demanda por asignatura" />}
      {!isLoading && !isError && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Asignatura</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Pendientes</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Reprobados</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Demanda Total</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Estudiantes por Sección</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Secciones Necesarias</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {demand.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No hay datos de demanda por asignatura
                  </td>
                </tr>
              ) : (
                demand.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{row.courseName}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{row.pendingCount}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{row.failedCount}</td>
                    <td className="px-4 py-3 text-right font-medium text-indigo-600">{row.totalDemand}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{row.studentsPerSection}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {row.sectionsNeeded}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DemandByLevelTab() {
  const { data: programs = [] } = useQuery({
    queryKey: ['academic-programs'],
    queryFn: projectionApi.getPrograms,
  });

  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);

  const { data: demand = [], isLoading, isError } = useQuery({
    queryKey: ['demand-by-level', selectedProgramId],
    queryFn: () => projectionApi.getDemandByLevel(selectedProgramId ?? undefined),
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <ProgramSelector programs={programs} selectedProgramId={selectedProgramId} onChange={setSelectedProgramId} />
        <ExportExcelButton
          filename="oferta_demanda_nivel.xlsx"
          onExport={() => projectionApi.exportDemandByLevel(selectedProgramId ?? undefined)}
        />
      </div>
      {isLoading && <LoadingSpinner />}
      {isError && <ErrorState message="Error al cargar la demanda por nivel" />}
      {!isLoading && !isError && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nivel</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Cantidad de Estudiantes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {demand.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                    No hay datos de demanda por nivel
                  </td>
                </tr>
              ) : (
                demand.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">Nivel {row.level}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{row.studentCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SectionProjectionTab() {
  const { data: programs = [] } = useQuery({
    queryKey: ['academic-programs'],
    queryFn: projectionApi.getPrograms,
  });

  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);

  const { data: sections = [], isLoading, isError } = useQuery({
    queryKey: ['section-projection', selectedProgramId],
    queryFn: () => projectionApi.getSectionProjection(selectedProgramId ?? undefined),
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <ProgramSelector programs={programs} selectedProgramId={selectedProgramId} onChange={setSelectedProgramId} />
        <ExportExcelButton
          filename="oferta_proyeccion_secciones.xlsx"
          onExport={() => projectionApi.exportSectionProjection(selectedProgramId ?? undefined)}
        />
      </div>
      {isLoading && <LoadingSpinner />}
      {isError && <ErrorState message="Error al cargar la proyección de secciones" />}
      {!isLoading && !isError && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Asignatura</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Pendientes</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Secciones Necesarias</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sections.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                    No hay datos de proyección de secciones
                  </td>
                </tr>
              ) : (
                sections.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{row.courseName}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{row.pendingCount}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {row.sectionsNeeded}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProjectionMatrixTab() {
  const { data: programs = [] } = useQuery({
    queryKey: ['academic-programs'],
    queryFn: projectionApi.getPrograms,
  });

  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);

  const { data: matrix = [], isLoading, isError } = useQuery({
    queryKey: ['projection-matrix', selectedProgramId],
    queryFn: () => projectionApi.getProjectionMatrix(selectedProgramId ?? undefined),
  });

  const allCourseNames = Array.from(
    new Set(matrix.flatMap((row) => row.courses.map((c) => c.courseName)))
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <ProgramSelector programs={programs} selectedProgramId={selectedProgramId} onChange={setSelectedProgramId} />
        <ExportExcelButton
          filename="oferta_matriz_pendientes.xlsx"
          onExport={() => projectionApi.exportProjectionMatrix(selectedProgramId ?? undefined)}
        />
      </div>
      {isLoading && <LoadingSpinner />}
      {isError && <ErrorState message="Error al cargar la matriz de pendientes" />}
      {!isLoading && !isError && matrix.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Estudiante</th>
                {allCourseNames.map((name) => (
                  <th key={name} className="text-center px-3 py-3 font-medium text-gray-600 text-xs whitespace-nowrap">
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {matrix.map((row) => {
                const courseMap = new Map(row.courses.map((c) => [c.courseName, c.status]));
                return (
                  <tr key={row.studentId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {row.studentName || `Estudiante #${row.studentId}`}
                    </td>
                    {allCourseNames.map((name) => {
                      const status = courseMap.get(name);
                      return (
                        <td key={name} className="text-center px-3 py-3">
                          {status === 'approved' ? (
                            <Check className="w-4 h-4 text-green-500 mx-auto" />
                          ) : status === 'pending' ? (
                            <X className="w-4 h-4 text-red-400 mx-auto" />
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!isLoading && !isError && matrix.length === 0 && (
        <EmptyState message="No hay datos de matriz de pendientes para mostrar" />
      )}
    </div>
  );
}

export default function AcademicProjection() {
  const [activeTab, setActiveTab] = useState('programs');

  const { data: programs = [], isLoading: programsLoading, isError: programsError } = useQuery({
    queryKey: ['academic-programs'],
    queryFn: projectionApi.getPrograms,
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-6 h-6 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Proyección de Oferta Académica</h1>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-0 -mb-px overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {programsLoading && <LoadingSpinner />}
      {programsError && <ErrorState message="Error al cargar los programas académicos" />}

      {!programsLoading && !programsError && (
        <>
          {activeTab === 'programs' && <ProgramsTab programs={programs} />}
          {activeTab === 'study-plan' && <StudyPlanTab programs={programs} />}
          {activeTab === 'students' && <StudentsTab programs={programs} />}
          {activeTab === 'demand-subject' && <DemandBySubjectTab />}
          {activeTab === 'demand-level' && <DemandByLevelTab />}
          {activeTab === 'sections' && <SectionProjectionTab />}
          {activeTab === 'matrix' && <ProjectionMatrixTab />}
        </>
      )}
    </div>
  );
}
