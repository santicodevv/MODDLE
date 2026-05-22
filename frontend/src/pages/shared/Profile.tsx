// Profile Page
import { useState } from 'react';
import { useAuth } from '@/context';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge,
  Modal,
  ModalFooter,
  Input,
  Label,
} from '@/components/ui';
import { User, Mail, Shield, LogOut, ArrowLeft, Pencil, Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/api/auth.api';

interface EditProfileFormData {
  displayName: string;
  password: string;
  confirmPassword: string;
}

export default function ProfilePage() {
  const { user, logout, roles, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const defaultRoute = roles.includes('ADMIN')
    ? '/admin'
    : roles.includes('TEACHER')
      ? '/teacher'
      : '/student';

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<EditProfileFormData>({
    defaultValues: {
      displayName: user?.displayName || '',
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = watch('password');

  const openEditModal = () => {
    reset({
      displayName: user?.displayName || '',
      password: '',
      confirmPassword: '',
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
  };

  const onSubmit = async (data: EditProfileFormData) => {
    setIsSaving(true);
    try {
      const payload: { displayName?: string; password?: string } = {};

      if (data.displayName && data.displayName !== user?.displayName) {
        payload.displayName = data.displayName;
      }
      if (data.password) {
        payload.password = data.password;
      }

      if (Object.keys(payload).length === 0) {
        toast('No hay cambios que guardar.', { icon: 'ℹ️' });
        closeEditModal();
        return;
      }

      await authApi.updateProfile(payload);
      await refreshUser();
      toast.success('Perfil actualizado exitosamente');
      closeEditModal();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Error al actualizar el perfil';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'danger';
      case 'TEACHER':
        return 'primary';
      case 'STUDENT':
        return 'success';
      default:
        return 'default';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrador';
      case 'TEACHER':
        return 'Profesor';
      case 'STUDENT':
        return 'Estudiante';
      default:
        return role;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate(defaultRoute)}
          className="flex items-center gap-2 w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al Dashboard
        </Button>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mi Perfil</h1>

      <Card>
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
          <CardDescription>
            Tu información de cuenta en el sistema
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-blue-600">
              <User className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {user?.displayName}
              </h2>
              <div className="flex gap-2 mt-1">
                {roles.map((role) => (
                  <Badge key={role} variant={getRoleBadgeVariant(role)}>
                    {getRoleLabel(role)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Correo electrónico</p>
                <p className="font-medium text-gray-900">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Estado de cuenta</p>
                <p className="font-medium text-gray-900">
                  {user?.isActive ? (
                    <Badge variant="success">Activa</Badge>
                  ) : (
                    <Badge variant="danger">Inactiva</Badge>
                  )}
                </p>
              </div>
            </div>

            {user?.moodleUserId && (
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">ID de Moodle</p>
                  <p className="font-medium text-gray-900">{user.moodleUserId}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            leftIcon={<Pencil className="h-4 w-4" />}
            onClick={openEditModal}
          >
            Editar perfil
          </Button>
          <Button variant="danger" leftIcon={<LogOut className="h-4 w-4" />} onClick={logout}>
            Cerrar sesión
          </Button>
        </CardFooter>
      </Card>

      {/* Modal de Edición */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        title="Editar perfil"
        description="Actualiza tu información básica de cuenta."
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Nombre */}
          <div className="space-y-1">
            <Label htmlFor="displayName">Nombre a mostrar</Label>
            <Input
              id="displayName"
              placeholder="Tu nombre completo"
              {...register('displayName', {
                required: 'El nombre es requerido',
                minLength: { value: 2, message: 'Mínimo 2 caracteres' },
              })}
            />
            {errors.displayName && (
              <p className="text-sm text-red-600">{errors.displayName.message}</p>
            )}
          </div>

          {/* Nueva contraseña */}
          <div className="space-y-1">
            <Label htmlFor="password">Nueva contraseña <span className="text-gray-400 font-normal">(opcional)</span></Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Dejar en blanco para no cambiar"
                {...register('password', {
                  minLength: { value: 6, message: 'Mínimo 6 caracteres' },
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          {/* Confirmar contraseña */}
          {passwordValue && (
            <div className="space-y-1">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Repite la nueva contraseña"
                  {...register('confirmPassword', {
                    validate: (val) =>
                      val === passwordValue || 'Las contraseñas no coinciden',
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>
          )}

          <ModalFooter>
            <Button type="button" variant="outline" onClick={closeEditModal} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Guardar cambios
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
