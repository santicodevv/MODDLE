
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui';
import { useCourses } from '@/modules/admin/hooks/useCourses';
import { CourseFilters } from '../components/courses/CourseFilters';
import { CourseList } from '../components/courses/CourseList';
import { CourseDetails } from '../components/courses/CourseDetails';

export default function AdminCourses() {
  const navigate = useNavigate();
  const coursesHook = useCourses();

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cursos</h1>
          <p className="mt-1 text-gray-600">Cursos sincronizados desde Moodle</p>
        </div>
        <Button onClick={() => navigate('/admin/courses/create')}>
          <Plus className="h-4 w-4 mr-2" /> Crear Curso
        </Button>
      </div>

      <CourseFilters {...coursesHook} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CourseList {...coursesHook} />
        <CourseDetails {...coursesHook} />
      </div>
    </div>
  );
}
