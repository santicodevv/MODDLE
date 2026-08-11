import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);

  const { data: studyPlans = [], isLoading, isError } = useQuery({
    queryKey: ['study-plans', selectedProgramId],
    queryFn: () => projectionApi.getStudyPlans(selectedProgramId!),
    enabled: !!selectedProgramId,
  });

  const removeMutation = useMutation({
    mutationFn: projectionApi.removeStudyPlan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['study-plans', selectedProgramId] }),
  });

  const autoAssignMutation = useMutation({
    mutationFn: projectionApi.autoAssignCoursesToPrograms,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['study-plans', selectedProgramId] });
      queryClient.invalidateQueries({ queryKey: ['moodle-courses'] });
      if (result.coursesAssigned > 0) {
        toast.success(`Cursos asignados automáticamente: ${result.coursesAssigned}`);
      } else {
        toast.success('No había cursos nuevos por asignar');
      }
    },
    onError: () => toast.error('Error al asignar cursos automáticamente'),
  });

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <ProgramSelector programs={programs} selectedProgramId={selectedProgramId} onChange={setSelectedProgramId} />
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => autoAssignMutation.mutate()}
            isLoading={autoAssignMutation.isPending}
            disabled={!selectedProgramId}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Asignar automáticamente
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/admin/courses/create')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Crear Curso
          </Button>
        </div>
      </div>

      {!selectedProgramId && <EmptyState message="Selecciona un programa para ver su plan de estudio" />}

      {isLoading && <LoadingSpinner />}
      {isError && <ErrorState message="Error al cargar el plan de estudio" />}

      {selectedProgramId && !isLoading && !isError && (
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
                    No hay asignaturas en el plan de estudio. Usa "Asignar automáticamente" para importar los cursos del programa desde Moodle.
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
      )}
    </div>
  );
}

function StudentsTab({ programs }: { programs: AcademicProgram[] }) {
  const queryClient = useQueryClient();
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const PAGE_SIZE = 10;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['projection-students', page, search],
    queryFn: () => projectionApi.getStudents(page, PAGE_SIZE, search || undefined),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ userId, programId }: { userId: number; programId: number }) =>
      projectionApi.toggleStudentProgram(userId, programId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projection-students'] });
    },
    onError: () => toast.error('Error al actualizar la asignación de programa'),
  });

  const students = data?.students ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  return (
    <div>
      <ProgramSelector programs={programs} selectedProgramId={selectedProgramId} onChange={setSelectedProgramId} />

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-60">
            <label className="block text-xs font-medium text-gray-500 mb-1">Buscar estudiante</label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Nombre, apellido, matrícula o correo"
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={!searchInput.trim()}
            leftIcon={<Search className="w-4 h-4" />}
            size="sm"
          >
            Buscar
          </Button>
          {search && (
            <Button onClick={handleClearSearch} size="sm" variant="outline">
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {isLoading && <LoadingSpinner />}
      {isError && <ErrorState message="Error al cargar los estudiantes" />}

      {!isLoading && !isError && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estudiante</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Matrícula</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                  {programs.map((program) => (
                    <th
                      key={program.id}
                      className="text-center px-4 py-3 font-medium text-gray-600 whitespace-nowrap"
                      title={program.name}
                    >
                      {program.code} - {program.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={3 + programs.length} className="px-4 py-8 text-center text-gray-500">
                      {search ? 'No hay estudiantes que coincidan con la búsqueda' : 'No hay estudiantes registrados'}
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr key={student.moodleId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{student.studentName}</p>
                        {student.email && <p className="text-xs text-gray-400">{student.email}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{student.matriculation ?? '-'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                            student.suspended
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-emerald-100 text-emerald-700',
                          )}
                        >
                          {student.suspended ? 'Inactivo' : 'Activo'}
                        </span>
                      </td>
                      {programs.map((program) => {
                        const checked = student.programIds.includes(program.id);
                        return (
                          <td key={program.id} className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={toggleMutation.isPending}
                              onChange={() =>
                                toggleMutation.mutate({
                                  userId: student.moodleId,
                                  programId: program.id,
                                })
                              }
                              className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                              title={`${checked ? 'Quitar' : 'Asignar'} ${student.studentName} al programa ${program.code}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {total > 0 && (
            <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-500">
                Mostrando {(page - 1) * PAGE_SIZE + 1} – {Math.min(page * PAGE_SIZE, total)} de {total} estudiantes
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <span className="text-xs text-gray-600">
                  Página {page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </div>
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
