// SSO Callback Page - Handles redirect from backend after Microsoft OAuth login
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { storage, decodeToken } from '@/lib';
import { authApi } from '@/api';
import type { DecodedToken } from '@/types';

export default function SSOCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      // No hay token — redirigir al login con error
      navigate('/login?sso_error=' + encodeURIComponent('No se recibió el token de autenticación.'), { replace: true });
      return;
    }

    const decoded = decodeToken<DecodedToken>(token);
    if (!decoded) {
      navigate('/login?sso_error=' + encodeURIComponent('El token recibido no es válido.'), { replace: true });
      return;
    }

    // Guardar el token igual que lo hace el login normal
    storage.setAccessToken(token);

    // Redirigir según el rol del usuario
    const roles = decoded.roles || [];
    if (roles.includes('ADMIN')) {
      navigate('/admin', { replace: true });
    } else if (roles.includes('TEACHER')) {
      navigate('/teacher', { replace: true });
    } else {
      navigate('/student', { replace: true });
    }
  }, []);

  // Pantalla de carga mientras se procesa
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      fontFamily: 'Inter, sans-serif',
      background: '#f8fafc',
    }}>
      <svg
        style={{ animation: 'spin 1s linear infinite', width: 48, height: 48, color: '#3b82f6' }}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      <p style={{ color: '#475569', fontSize: 16 }}>Iniciando sesión con tu cuenta institucional…</p>
    </div>
  );
}
