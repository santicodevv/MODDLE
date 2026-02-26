// Teacher Grade Entry - Placeholder
import { useParams } from 'react-router-dom';

export default function TeacherGradeEntry() {
  const { courseId, itemId } = useParams();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">Registro de Calificaciones</h1>
      <p className="mt-2 text-gray-600">
        Curso: {courseId} {itemId && `| Item: ${itemId}`}
      </p>

      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <p className="text-gray-500 text-center py-8">
          Página en construcción...
        </p>
      </div>
    </div>
  );
}
