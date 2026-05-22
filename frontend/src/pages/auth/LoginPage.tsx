// Login Page
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context';
import { getErrorMessage } from '@/lib';
import { Button, Input, Alert, Card, CardContent } from '@/components/ui';
import { User, Lock } from 'lucide-react';

const loginSchema = z.object({
  identifier: z.string().min(1, 'El correo o usuario es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessionExpired, setSessionExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Leer el error de SSO que el backend devuelve como query param o chequear expiración por inactividad
  useEffect(() => {
    const ssoError = searchParams.get('sso_error');
    if (ssoError) {
      setError(decodeURIComponent(ssoError));
      // Limpiar el param de la URL sin recargar la página
      setSearchParams((prev) => {
        prev.delete('sso_error');
        return prev;
      }, { replace: true });
    }

    if (localStorage.getItem('moddle_session_expired') === 'true') {
      setSessionExpired(true);
    }
  }, [searchParams, setSearchParams]);

  const handleAcknowledgeSessionExpired = () => {
    localStorage.removeItem('moddle_session_expired');
    setSessionExpired(false);
  };

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

  const handleMicrosoftLogin = () => {
    // Redirige al backend de NestJS para iniciar el flujo OAuth de Microsoft
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/microsoft`;
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
            label="Correo o usuario"
            type="text"
            placeholder="correo@ejemplo.com o usuario"
            autoComplete="username"
            leftIcon={<User className="h-5 w-5" />}
            error={errors.identifier?.message}
            {...register('identifier')}
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

        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">O también</span>
          </div>
        </div>

        <div className="mt-6">
          <Button
            type="button"
            variant="outline"
            className="w-full relative flex items-center justify-center gap-2"
            size="lg"
            onClick={handleMicrosoftLogin}
          >
            <svg className="h-5 w-5" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 0H0V10H10V0Z" fill="#F25022"/>
              <path d="M21 0H11V10H21V0Z" fill="#7FBA00"/>
              <path d="M10 11H0V21H10V11Z" fill="#00A4EF"/>
              <path d="M21 11H11V21H21V11Z" fill="#FFB900"/>
            </svg>
            Cuenta Institucional (Office 365)
          </Button>
        </div>

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

      {/* Modal Bloqueante - Sesión Cerrada por Inactividad (Fase 3) */}
      {sessionExpired && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 border border-red-50 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center mb-4 mx-auto border border-red-100">
              <Lock className="h-7 w-7 text-red-600 animate-pulse" />
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2">
              🔒 Sesión cerrada
            </h2>
            
            <p className="text-gray-600 mb-6 leading-relaxed">
              Tu sesión fue cerrada automáticamente por inactividad para proteger tu información.
            </p>

            <Button
              onClick={handleAcknowledgeSessionExpired}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl shadow-md shadow-blue-200 transition-all"
            >
              Volver a ingresar
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
