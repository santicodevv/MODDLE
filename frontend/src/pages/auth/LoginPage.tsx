// Login Page
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context';
import { getErrorMessage } from '@/lib';
import { Button, Input, Alert, Card, CardContent } from '@/components/ui';
import { Mail, Lock } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Ingresa un correo válido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError('');
    setIsLoading(true);

    try {
      await login(data);
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
          <h1 className="text-2xl font-bold text-gray-900">Iniciar sesión</h1>
          <p className="mt-2 text-gray-600">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        {error && (
          <Alert variant="error" className="mb-6" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
            autoComplete="current-password"
            leftIcon={<Lock className="h-5 w-5" />}
            error={errors.password?.message}
            {...register('password')}
          />

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isLoading}
          >
            Iniciar sesión
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            ¿No tienes cuenta?{' '}
            <Link
              to="/register"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Regístrate
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
