// Register Page
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context';
import { getErrorMessage } from '@/lib';
import { Button, Input, Alert, Card, CardContent } from '@/components/ui';
import { Mail, Lock, User } from 'lucide-react';

const registerSchema = z
  .object({
    displayName: z
      .string()
      .min(2, 'El nombre debe tener al menos 2 caracteres'),
    email: z.string().email('Ingresa un correo válido'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setError('');
    setIsLoading(true);

    try {
      await registerUser({
        email: data.email,
        password: data.password,
        displayName: data.displayName,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Crear cuenta</h1>
          <p className="mt-2 text-gray-600">
            Completa tus datos para registrarte
          </p>
        </div>

        {error && (
          <Alert variant="error" className="mb-6" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Nombre completo"
            type="text"
            placeholder="Tu nombre"
            autoComplete="name"
            leftIcon={<User className="h-5 w-5" />}
            error={errors.displayName?.message}
            {...register('displayName')}
          />

          <Input
            label="Correo electrónico"
            type="email"
            placeholder="tu@correo.com"
            autoComplete="email"
            leftIcon={<Mail className="h-5 w-5" />}
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            leftIcon={<Lock className="h-5 w-5" />}
            hint="Mínimo 8 caracteres"
            error={errors.password?.message}
            {...register('password')}
          />

          <Input
            label="Confirmar contraseña"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            leftIcon={<Lock className="h-5 w-5" />}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isLoading}
          >
            Crear cuenta
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Inicia sesión
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
