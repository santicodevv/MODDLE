// Student Dashboard
import { useAuth } from '@/context';
import { Card, CardContent } from '@/components/ui';
import { BookOpen, ClipboardList, FileText, TrendingUp } from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();

  const stats = [
    {
      label: 'Cursos Activos',
      value: '-',
      icon: BookOpen,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
    },
    {
      label: 'Promedio General',
      value: '-',
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-100',
    },
    {
      label: 'Calificaciones Pendientes',
      value: '-',
      icon: ClipboardList,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
    },
    {
      label: 'Constancias Generadas',
      value: '-',
      icon: FileText,
      color: 'text-purple-600',
      bg: 'bg-purple-100',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenido, {user?.displayName}
        </h1>
        <p className="mt-1 text-gray-600">
          Panel de estudiante - Resumen de tu actividad académica
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Próximas Entregas
            </h3>
            <p className="text-gray-500 text-center py-8">
              No hay entregas próximas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Actividad Reciente
            </h3>
            <p className="text-gray-500 text-center py-8">
              No hay actividad reciente
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
