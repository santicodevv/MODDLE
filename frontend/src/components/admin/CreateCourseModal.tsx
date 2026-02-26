// Create Course Modal Component
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { coursesApi } from '@/api/courses.api';
import {
  Modal,
  ModalFooter,
  Button,
  Input,
  Select,
  Label,
  Alert,
  Spinner,
} from '@/components/ui';
import {
  BookOpen,
  RefreshCw,
  Calendar,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { CreateCourseDto, MoodleCategory } from '@/types';

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateCourseModal({ isOpen, onClose, onSuccess }: CreateCourseModalProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateCourseDto>({
    fullname: '',
    shortname: '',
    categoryid: 0,
    idnumber: '',
    summary: '',
    visible: true,
    startdate: '',
    enddate: '',
  });
  const [enableEndDate, setEnableEndDate] = useState(false);

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading, refetch: refetchCategories } = useQuery({
    queryKey: ['moodle-categories'],
    queryFn: () => coursesApi.getCategories(),
    enabled: isOpen,
  });

  // Sync categories mutation
  const syncCategoriesMutation = useMutation({
    mutationFn: () => coursesApi.syncCategories(),
    onSuccess: () => {
      refetchCategories();
    },
  });

  // Create course mutation
  const createCourseMutation = useMutation({
    mutationFn: (data: CreateCourseDto) => coursesApi.createCourse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      onSuccess?.();
      handleClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Error al crear el curso');
    },
  });

  const handleClose = () => {
    setFormData({
      fullname: '',
      shortname: '',
      categoryid: 0,
      idnumber: '',
      summary: '',
      visible: true,
      startdate: '',
      enddate: '',
    });
    setEnableEndDate(false);
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.fullname.trim()) {
      setError('El nombre completo del curso es requerido');
      return;
    }
    if (!formData.shortname.trim()) {
      setError('El nombre corto del curso es requerido');
      return;
    }
    if (!formData.categoryid) {
      setError('Debes seleccionar una categoria');
      return;
    }
    if (!formData.startdate) {
      setError('La fecha de inicio es requerida');
      return;
    }

    const dataToSubmit = {
      ...formData,
      categoryid: Number(formData.categoryid),
      enddate: enableEndDate ? formData.enddate : undefined,
    };

    console.log('Submitting course data:', dataToSubmit);
    createCourseMutation.mutate(dataToSubmit);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Set default start date to today
  useEffect(() => {
    if (isOpen && !formData.startdate) {
      const today = new Date();
      today.setHours(8, 0, 0, 0);
      setFormData((prev) => ({
        ...prev,
        startdate: today.toISOString().slice(0, 16),
      }));
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Crear Nuevo Curso"
      description="Crea un curso en Moodle y en el sistema local"
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        <div className="space-y-4">
          {/* Nombre completo */}
          <div>
            <Label htmlFor="fullname">
              Nombre completo del curso <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fullname"
              name="fullname"
              value={formData.fullname}
              onChange={handleInputChange}
              placeholder="Ej: Matematicas I - 2024"
              required
            />
          </div>

          {/* Nombre corto */}
          <div>
            <Label htmlFor="shortname">
              Nombre corto del curso <span className="text-red-500">*</span>
            </Label>
            <Input
              id="shortname"
              name="shortname"
              value={formData.shortname}
              onChange={handleInputChange}
              placeholder="Ej: MAT101-2024"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Codigo unico para identificar el curso
            </p>
          </div>

          {/* Categoria */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="categoryid">
                Categoria de cursos <span className="text-red-500">*</span>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => syncCategoriesMutation.mutate()}
                disabled={syncCategoriesMutation.isPending}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${syncCategoriesMutation.isPending ? 'animate-spin' : ''}`} />
                Sincronizar
              </Button>
            </div>
            {categoriesLoading ? (
              <div className="flex items-center gap-2 py-2">
                <Spinner className="h-4 w-4" />
                <span className="text-sm text-gray-500">Cargando categorias...</span>
              </div>
            ) : categories && categories.length > 0 ? (
              <Select
                id="categoryid"
                name="categoryid"
                value={formData.categoryid}
                onChange={handleInputChange}
                placeholder="Selecciona una categoria"
              >
                <option value="">Selecciona una categoria</option>
                {categories.map((cat: MoodleCategory) => (
                  <option key={cat.moodleId} value={cat.moodleId}>
                    {cat.name} {cat.coursecount > 0 && `(${cat.coursecount} cursos)`}
                  </option>
                ))}
              </Select>
            ) : (
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md">
                No hay categorias disponibles. Haz click en "Sincronizar" para obtener las categorias de Moodle.
              </div>
            )}
          </div>

          {/* Visibilidad */}
          <div>
            <Label>Visibilidad del curso</Label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visible"
                  checked={formData.visible === true}
                  onChange={() => setFormData((prev) => ({ ...prev, visible: true }))}
                  className="h-4 w-4 text-blue-600"
                />
                <Eye className="h-4 w-4 text-green-600" />
                <span className="text-sm">Mostrar</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="visible"
                  checked={formData.visible === false}
                  onChange={() => setFormData((prev) => ({ ...prev, visible: false }))}
                  className="h-4 w-4 text-blue-600"
                />
                <EyeOff className="h-4 w-4 text-gray-400" />
                <span className="text-sm">Ocultar</span>
              </label>
            </div>
          </div>

          {/* Fecha de inicio */}
          <div>
            <Label htmlFor="startdate">
              <Calendar className="h-4 w-4 inline mr-1" />
              Fecha de inicio del curso <span className="text-red-500">*</span>
            </Label>
            <Input
              id="startdate"
              name="startdate"
              type="datetime-local"
              value={formData.startdate}
              onChange={handleInputChange}
              required
            />
          </div>

          {/* Fecha de fin */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="enableEndDate"
                checked={enableEndDate}
                onChange={(e) => setEnableEndDate(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <Label htmlFor="enableEndDate" className="mb-0">
                <Calendar className="h-4 w-4 inline mr-1" />
                Habilitar fecha de finalizacion
              </Label>
            </div>
            {enableEndDate && (
              <Input
                id="enddate"
                name="enddate"
                type="datetime-local"
                value={formData.enddate}
                onChange={handleInputChange}
              />
            )}
          </div>

          {/* Numero ID */}
          <div>
            <Label htmlFor="idnumber">Numero ID del curso (opcional)</Label>
            <Input
              id="idnumber"
              name="idnumber"
              value={formData.idnumber}
              onChange={handleInputChange}
              placeholder="Ej: 2024-MAT-001"
            />
            <p className="text-xs text-gray-500 mt-1">
              Identificador externo para integraciones
            </p>
          </div>

          {/* Descripcion */}
          <div>
            <Label htmlFor="summary">Descripcion del curso (opcional)</Label>
            <textarea
              id="summary"
              name="summary"
              value={formData.summary}
              onChange={handleInputChange}
              rows={3}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Descripcion breve del curso..."
            />
          </div>
        </div>

        <ModalFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={createCourseMutation.isPending}>
            {createCourseMutation.isPending ? (
              <>
                <Spinner className="h-4 w-4 mr-2" />
                Creando...
              </>
            ) : (
              <>
                <BookOpen className="h-4 w-4 mr-2" />
                Crear Curso
              </>
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default CreateCourseModal;
