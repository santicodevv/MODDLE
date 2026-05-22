// Admin Users Page
import { useState, useCallback } from 'react';
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
  Filter,
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

const PAGE_SIZE_OPTIONS = [20, 50, 100, 0] as const; // 0 = todos

function getPageSizeLabel(size: number) {
  return size === 0 ? 'Todos' : String(size);
}

/** Genera la lista de páginas visibles: siempre first, last y window alrededor de current */
function buildPageRange(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [];
  const around = new Set([1, total, current - 1, current, current + 1].filter(p => p >= 1 && p <= total));
  let prev: number | null = null;
  for (const p of [...around].sort((a, b) => a - b)) {
    if (prev !== null && p - prev > 1) pages.push('...');
    pages.push(p);
    prev = p;
  }
  return pages;
}

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(20);
  const [jumpInput, setJumpInput] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
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

  const isActiveParam =
    filterStatus === 'active' ? 'true' : filterStatus === 'inactive' ? 'false' : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, limit, search, filterStatus, filterRole],
    queryFn: async () => {
      const response = await api.get<UsersResponse>('/users', {
        params: {
          page,
          limit: limit === 0 ? 9999 : limit,
          search: search || undefined,
          isActive: isActiveParam,
          role: filterRole !== 'all' ? filterRole : undefined,
        },
      });
      return response.data;
    },
  });

  const { data: rolesData } = useQuery({
    queryKey: ['available-roles'],
    queryFn: async () => {
      const response = await api.get<Role[]>('/users/roles');
      return response.data;
    },
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<EditForm> & { roleIds?: number[] } }) => {
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
      toast.error(error.response?.data?.message || 'Error al actualizar usuario');
    },
  });

  const createUser = useMutation({
    mutationFn: async (data: { email: string; password: string; displayName?: string; isActive: boolean; roleIds: number[] }) => {
      const response = await api.post('/users/admin/create', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowCreateModal(false);
      setCreateForm({ displayName: '', email: '', password: '', isActive: true, selectedRoleIds: [] });
      toast.success('Usuario creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear usuario');
    },
  });

  const getRoleBadgeVariant = (code: string) => {
    switch (code) {
      case 'ADMIN': return 'default' as const;
      case 'TEACHER': return 'success' as const;
      case 'STUDENT': return 'info' as const;
      default: return 'secondary' as const;
    }
  };

  const getRoleName = (code: string) => {
    switch (code) {
      case 'ADMIN': return 'Administrador';
      case 'TEACHER': return 'Profesor';
      case 'STUDENT': return 'Estudiante';
      default: return code;
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
      return { ...prev, selectedRoleIds: has ? prev.selectedRoleIds.filter((id) => id !== roleId) : [...prev.selectedRoleIds, roleId] };
    });
  };

  const toggleCreateRole = (roleId: number) => {
    setCreateForm((prev) => {
      const has = prev.selectedRoleIds.includes(roleId);
      return { ...prev, selectedRoleIds: has ? prev.selectedRoleIds.filter((id) => id !== roleId) : [...prev.selectedRoleIds, roleId] };
    });
  };

  const handleCreate = () => {
    if (!createForm.email || !createForm.password) { toast.error('Email y contraseña son requeridos'); return; }
    if (createForm.password.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return; }
    if (createForm.selectedRoleIds.length === 0) { toast.error('Debe seleccionar al menos un rol'); return; }
    createUser.mutate({ email: createForm.email, password: createForm.password, displayName: createForm.displayName || undefined, isActive: createForm.isActive, roleIds: createForm.selectedRoleIds });
  };

  const handleSave = () => {
    if (!editingUser) return;
    const changes: Partial<EditForm> & { roleIds?: number[] } = {};
    if (editForm.displayName !== editingUser.displayName) changes.displayName = editForm.displayName;
    if (editForm.email !== editingUser.email) changes.email = editForm.email;
    if (editForm.password) changes.password = editForm.password;
    if (editForm.isActive !== editingUser.isActive) changes.isActive = editForm.isActive;
    const currentRoleIds = editingUser.roles.map((r) => r.id).sort();
    const newRoleIds = [...editForm.selectedRoleIds].sort();
    if (JSON.stringify(currentRoleIds) !== JSON.stringify(newRoleIds)) changes.roleIds = editForm.selectedRoleIds;
    if (Object.keys(changes).length === 0) { toast.error('No hay cambios para guardar'); return; }
    updateUser.mutate({ id: editingUser.id, data: changes });
  };

  const totalPages = data && limit > 0 ? Math.ceil(data.total / limit) : 1;

  const resetFiltersAndPage = useCallback(() => setPage(1), []);

  const handleJumpPage = () => {
    const n = parseInt(jumpInput, 10);
    if (!isNaN(n) && n >= 1 && n <= totalPages) {
      setPage(n);
      setJumpInput('');
    }
  };

  const pageRange = buildPageRange(page, totalPages);

  const activeFiltersCount = (filterStatus !== 'all' ? 1 : 0) + (filterRole !== 'all' ? 1 : 0);

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-7 w-7 text-blue-600" />
            Gestión de Usuarios
          </h1>
          <p className="mt-1 text-gray-600">Administra los usuarios del sistema y sus roles</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Crear Usuario
        </Button>
      </div>

      {/* Search and filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            {/* Top row: search + count */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre o email..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); resetFiltersAndPage(); }}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 whitespace-nowrap">
                {data && <span>{data.total} usuarios encontrados</span>}
              </div>
            </div>

            {/* Filter row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <Filter className="h-4 w-4" />
                Filtros
                {activeFiltersCount > 0 && (
                  <span className="ml-1 bg-blue-100 text-blue-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </span>

              {/* Status filter */}
              <div className="flex rounded-md border border-gray-200 overflow-hidden text-sm">
                {(['all', 'active', 'inactive'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setFilterStatus(s); resetFiltersAndPage(); }}
                    className={`px-3 py-1.5 transition-colors ${filterStatus === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  >
                    {s === 'all' ? 'Todos' : s === 'active' ? 'Activos' : 'Inactivos'}
                  </button>
                ))}
              </div>

              {/* Role filter */}
              <select
                value={filterRole}
                onChange={(e) => { setFilterRole(e.target.value); resetFiltersAndPage(); }}
                className="text-sm border border-gray-200 rounded-md px-3 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los roles</option>
                {rolesData?.map((r) => (
                  <option key={r.id} value={r.code}>{getRoleName(r.code)}</option>
                ))}
              </select>

              {/* Clear filters */}
              {activeFiltersCount > 0 && (
                <button
                  onClick={() => { setFilterStatus('all'); setFilterRole('all'); resetFiltersAndPage(); }}
                  className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : data?.users && data.users.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roles</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Registrado</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="shrink-0 h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-medium text-sm">
                                {user.displayName?.charAt(0)?.toUpperCase() || '?'}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 leading-tight">{user.displayName}</div>
                              <div className="text-xs text-gray-400">ID: {user.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-sm text-gray-700">
                            <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <span className="truncate max-w-[200px]">{user.email}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((role) => (
                              <Badge key={role.id} variant={getRoleBadgeVariant(role.code)}>
                                {getRoleName(role.code)}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={user.isActive ? 'success' : 'danger'}>
                            {user.isActive ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 hidden xl:table-cell whitespace-nowrap">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => openEditModal(user)}
                            title="Editar usuario"
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t bg-gray-50">
                {/* Left: rows-per-page + total */}
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span>Filas por página:</span>
                  <select
                    value={limit}
                    onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                    className="border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    {PAGE_SIZE_OPTIONS.map((s) => (
                      <option key={s} value={s}>{getPageSizeLabel(s)}</option>
                    ))}
                  </select>
                  {limit === 0 ? (
                    <span>Mostrando todos ({data.total})</span>
                  ) : (
                    <span>
                      {(page - 1) * limit + 1}–{Math.min(page * limit, data.total)} de {data.total}
                    </span>
                  )}
                </div>

                {/* Right: page numbers + jump */}
                {limit > 0 && totalPages > 1 && (
                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    {/* Prev */}
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    {/* Page numbers */}
                    {pageRange.map((p, i) =>
                      p === '...' ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-gray-400 text-sm">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p as number)}
                          className={`min-w-[32px] h-8 rounded-md text-sm font-medium border transition-colors ${
                            page === p
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-200 text-gray-600 hover:bg-white'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}

                    {/* Next */}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>

                    {/* Jump to page */}
                    {totalPages > 5 && (
                      <div className="flex items-center gap-1 ml-2 text-sm text-gray-500">
                        <span>Ir a:</span>
                        <input
                          type="number"
                          min={1}
                          max={totalPages}
                          value={jumpInput}
                          onChange={(e) => setJumpInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleJumpPage()}
                          className="w-14 border border-gray-200 rounded-md px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Pág."
                        />
                        <button
                          onClick={handleJumpPage}
                          className="px-2 py-1 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
                        >
                          →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Users className="h-12 w-12 mb-4 text-gray-300" />
              <p className="text-lg font-medium">No se encontraron usuarios</p>
              <p className="text-sm">
                {search || activeFiltersCount > 0
                  ? 'Intenta con otros filtros de búsqueda'
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
              <h2 className="text-lg font-semibold text-gray-900">Editar Usuario</h2>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <Input value={editForm.displayName} onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })} placeholder="Nombre completo" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="correo@ejemplo.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nueva Contraseña <span className="text-gray-400 font-normal">(dejar vacío para no cambiar)</span>
                </label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="••••••••" className="pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
                <div className="flex flex-wrap gap-2">
                  {rolesData?.map((role) => {
                    const isSelected = editForm.selectedRoleIds.includes(role.id);
                    return (
                      <button key={role.id} type="button" onClick={() => toggleRole(role.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${isSelected ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                        <Shield className="h-3 w-3 inline mr-1" />{getRoleName(role.code)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Estado del usuario</label>
                <button type="button" onClick={() => setEditForm({ ...editForm, isActive: !editForm.isActive })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editForm.isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editForm.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              {editingUser.moodleUserId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700"><strong>Moodle ID:</strong> {editingUser.moodleUserId}</p>
                  <p className="text-xs text-blue-600 mt-1">Los cambios se sincronizarán automáticamente con Moodle</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-lg">
              <Button variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={updateUser.isPending}>
                {updateUser.isPending ? <Spinner className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
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
              <h2 className="text-lg font-semibold text-gray-900">Crear Nuevo Usuario</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-gray-400">(opcional)</span></label>
                <Input value={createForm.displayName} onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })} placeholder="Nombre completo" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                <Input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="correo@ejemplo.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Input type={showCreatePassword ? 'text' : 'password'} value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Mínimo 6 caracteres" className="pr-10" />
                  <button type="button" onClick={() => setShowCreatePassword(!showCreatePassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Roles <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {rolesData?.map((role) => {
                    const isSelected = createForm.selectedRoleIds.includes(role.id);
                    return (
                      <button key={role.id} type="button" onClick={() => toggleCreateRole(role.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${isSelected ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                        <Shield className="h-3 w-3 inline mr-1" />{getRoleName(role.code)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Usuario activo</label>
                <button type="button" onClick={() => setCreateForm({ ...createForm, isActive: !createForm.isActive })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${createForm.isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${createForm.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-lg">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={createUser.isPending}>
                {createUser.isPending ? <Spinner className="h-4 w-4 mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                Crear Usuario
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
