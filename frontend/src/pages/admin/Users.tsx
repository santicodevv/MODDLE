// Admin Users Page
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Pencil,
  X,
  Save,
  Eye,
  EyeOff,
  UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Role {
  id: number;
  code: string;
  description?: string;
}

interface User {
  id: number;
  email: string;
  displayName: string;
  roles: Role[];
  moodleUserId?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

interface EditForm {
  displayName: string;
  email: string;
  password: string;
  isActive: boolean;
  selectedRoleIds: number[];
}

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;
  const queryClient = useQueryClient();

  // Edit modal state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    displayName: '',
    email: '',
    password: '',
    isActive: true,
    selectedRoleIds: [],
  });
  const [showPassword, setShowPassword] = useState(false);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<EditForm>({
    displayName: '',
    email: '',
    password: '',
    isActive: true,
    selectedRoleIds: [],
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: async () => {
      const response = await api.get<UsersResponse>('/users', {
        params: { page, limit, search: search || undefined },
      });
      return response.data;
    },
  });

  // Fetch available roles
  const { data: rolesData } = useQuery({
    queryKey: ['available-roles'],
    queryFn: async () => {
      const response = await api.get<Role[]>('/users/roles');
      return response.data;
    },
  });

  const updateUser = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<EditForm> & { roleIds?: number[] };
    }) => {
      const payload: any = {};
      if (data.displayName) payload.displayName = data.displayName;
      if (data.email) payload.email = data.email;
      if (data.password) payload.password = data.password;
      if (data.isActive !== undefined) payload.isActive = data.isActive;
      if (data.roleIds !== undefined) payload.roleIds = data.roleIds;
      const response = await api.patch(`/users/${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditingUser(null);
      toast.success('Usuario actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Error al actualizar usuario',
      );
    },
  });

  const createUser = useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      displayName?: string;
      isActive: boolean;
      roleIds: number[];
    }) => {
      const response = await api.post('/users/admin/create', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowCreateModal(false);
      setCreateForm({
        displayName: '',
        email: '',
        password: '',
        isActive: true,
        selectedRoleIds: [],
      });
      toast.success('Usuario creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Error al crear usuario',
      );
    },
  });

  const getRoleBadgeVariant = (code: string) => {
    switch (code) {
      case 'ADMIN':
        return 'default' as const;
      case 'TEACHER':
        return 'success' as const;
      case 'STUDENT':
        return 'info' as const;
      default:
        return 'secondary' as const;
    }
  };

  const getRoleName = (code: string) => {
    switch (code) {
      case 'ADMIN':
        return 'Administrador';
      case 'TEACHER':
        return 'Profesor';
      case 'STUDENT':
        return 'Estudiante';
      default:
        return code;
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditForm({
      displayName: user.displayName || '',
      email: user.email || '',
      password: '',
      isActive: user.isActive,
      selectedRoleIds: user.roles.map((r) => r.id),
    });
    setShowPassword(false);
  };

  const toggleRole = (roleId: number) => {
    setEditForm((prev) => {
      const has = prev.selectedRoleIds.includes(roleId);
      return {
        ...prev,
        selectedRoleIds: has
          ? prev.selectedRoleIds.filter((id) => id !== roleId)
          : [...prev.selectedRoleIds, roleId],
      };
    });
  };

  const toggleCreateRole = (roleId: number) => {
    setCreateForm((prev) => {
      const has = prev.selectedRoleIds.includes(roleId);
      return {
        ...prev,
        selectedRoleIds: has
          ? prev.selectedRoleIds.filter((id) => id !== roleId)
          : [...prev.selectedRoleIds, roleId],
      };
    });
  };

  const handleCreate = () => {
    if (!createForm.email || !createForm.password) {
      toast.error('Email y contraseña son requeridos');
      return;
    }
    if (createForm.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (createForm.selectedRoleIds.length === 0) {
      toast.error('Debe seleccionar al menos un rol');
      return;
    }

    createUser.mutate({
      email: createForm.email,
      password: createForm.password,
      displayName: createForm.displayName || undefined,
      isActive: createForm.isActive,
      roleIds: createForm.selectedRoleIds,
    });
  };

  const handleSave = () => {
    if (!editingUser) return;

    const changes: Partial<EditForm> & { roleIds?: number[] } = {};
    if (editForm.displayName !== editingUser.displayName) {
      changes.displayName = editForm.displayName;
    }
    if (editForm.email !== editingUser.email) {
      changes.email = editForm.email;
    }
    if (editForm.password) {
      changes.password = editForm.password;
    }
    if (editForm.isActive !== editingUser.isActive) {
      changes.isActive = editForm.isActive;
    }

    // Check if roles changed
    const currentRoleIds = editingUser.roles.map((r) => r.id).sort();
    const newRoleIds = [...editForm.selectedRoleIds].sort();
    if (JSON.stringify(currentRoleIds) !== JSON.stringify(newRoleIds)) {
      changes.roleIds = editForm.selectedRoleIds;
    }

    if (Object.keys(changes).length === 0) {
      toast.error('No hay cambios para guardar');
      return;
    }

    updateUser.mutate({ id: editingUser.id, data: changes });
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-7 w-7 text-blue-600" />
            Gestión de Usuarios
          </h1>
          <p className="mt-1 text-gray-600">
            Administra los usuarios del sistema y sus roles
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Crear Usuario
        </Button>
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
              {data && <span>{data.total} usuarios encontrados</span>}
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
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Moodle ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Registrado
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-medium">
                                {user.displayName?.charAt(0)?.toUpperCase() ||
                                  '?'}
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
                                {getRoleName(role.code)}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={user.isActive ? 'success' : 'danger'}>
                            {user.isActive ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.moodleUserId || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(user)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
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
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
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

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                Editar Usuario
              </h2>
              <button
                onClick={() => setEditingUser(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <Input
                  value={editForm.displayName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, displayName: e.target.value })
                  }
                  placeholder="Nombre completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nueva Contraseña
                  <span className="text-gray-400 font-normal ml-1">
                    (dejar vacío para no cambiar)
                  </span>
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={editForm.password}
                    onChange={(e) =>
                      setEditForm({ ...editForm, password: e.target.value })
                    }
                    placeholder="••••••••"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Roles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Roles
                </label>
                <div className="flex flex-wrap gap-2">
                  {rolesData?.map((role) => {
                    const isSelected = editForm.selectedRoleIds.includes(
                      role.id,
                    );
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => toggleRole(role.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                          isSelected
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <Shield className="h-3 w-3 inline mr-1" />
                        {getRoleName(role.code)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Estado del usuario
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setEditForm({ ...editForm, isActive: !editForm.isActive })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editForm.isActive ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      editForm.isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {editingUser.moodleUserId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    <strong>Moodle ID:</strong> {editingUser.moodleUserId}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Los cambios se sincronizarán automáticamente con Moodle
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-lg">
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={updateUser.isPending}>
                {updateUser.isPending ? (
                  <Spinner className="h-4 w-4 mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Guardar Cambios
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                Crear Nuevo Usuario
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre <span className="text-gray-400">(opcional)</span>
                </label>
                <Input
                  value={createForm.displayName}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, displayName: e.target.value })
                  }
                  placeholder="Nombre completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showCreatePassword ? 'text' : 'password'}
                    value={createForm.password}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, password: e.target.value })
                    }
                    placeholder="Minimo 6 caracteres"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCreatePassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Roles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Roles <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {rolesData?.map((role) => {
                    const isSelected = createForm.selectedRoleIds.includes(role.id);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => toggleCreateRole(role.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                          isSelected
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <Shield className="h-3 w-3 inline mr-1" />
                        {getRoleName(role.code)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Usuario activo
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setCreateForm({ ...createForm, isActive: !createForm.isActive })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    createForm.isActive ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      createForm.isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-lg">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={createUser.isPending}>
                {createUser.isPending ? (
                  <Spinner className="h-4 w-4 mr-2" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Crear Usuario
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
