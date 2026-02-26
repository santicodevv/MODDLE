// Admin Users Page
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib';
import {
  Card,
  CardContent,
  Badge,
  Spinner,
  Input,
  Button,
} from '@/components/ui';
import {
  Users,
  Search,
  Mail,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface Role {
  id: number;
  code: string;
  name: string;
}

interface User {
  id: number;
  email: string;
  displayName: string;
  roles: Role[];
  moodleId?: number;
  createdAt: string;
  lastLogin?: string;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: async () => {
      const response = await api.get<UsersResponse>('/users', {
        params: { page, limit, search: search || undefined },
      });
      return response.data;
    },
  });

  const getRoleBadgeVariant = (code: string) => {
    switch (code) {
      case 'ADMIN':
        return 'default';
      case 'TEACHER':
        return 'success';
      case 'STUDENT':
        return 'info';
      default:
        return 'secondary';
    }
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="h-7 w-7 text-blue-600" />
          Gestión de Usuarios
        </h1>
        <p className="mt-1 text-gray-600">
          Administra los usuarios del sistema y sus roles
        </p>
      </div>

      {/* Search and filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {data && (
                <span>
                  {data.total} usuarios encontrados
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : data?.users && data.users.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Roles
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Moodle ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Registrado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-medium">
                                {user.displayName?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.displayName}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {user.id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm text-gray-900">
                            <Mail className="h-4 w-4 text-gray-400" />
                            {user.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((role) => (
                              <Badge
                                key={role.id}
                                variant={getRoleBadgeVariant(role.code)}
                              >
                                <Shield className="h-3 w-3 mr-1" />
                                {role.name}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.moodleId || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-gray-500">
                    Página {page} de {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Users className="h-12 w-12 mb-4 text-gray-300" />
              <p className="text-lg font-medium">No se encontraron usuarios</p>
              <p className="text-sm">
                {search
                  ? 'Intenta con otro término de búsqueda'
                  : 'No hay usuarios registrados'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
