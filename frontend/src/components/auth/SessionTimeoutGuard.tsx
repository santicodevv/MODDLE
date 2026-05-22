import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context';
import { api } from '@/lib';
import { Button } from '@/components/ui';
import { AlertTriangle, LogOut, CheckCircle } from 'lucide-react';

// Tiempos en milisegundos (25 minutos de inactividad, 5 minutos de advertencia)
const INACTIVITY_LIMIT = 25 * 60 * 1000;
const GRACE_LIMIT = 5 * 60; // 300 segundos

export function SessionTimeoutGuard({ children }: { children: React.ReactNode }) {
  const { logout, isAuthenticated } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(GRACE_LIMIT);

  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastActivityUpdateRef = useRef<number>(0);

  // Formatear segundos en MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Función para cerrar sesión de forma síncrona/asíncrona completa
  const handleForceLogout = useCallback(async (broadcast = true) => {
    // 1. Notificar a otras pestañas
    if (broadcast && channelRef.current) {
      try {
        channelRef.current.postMessage('logout');
      } catch (e) {
        console.error('Error broadcasting logout', e);
      }
    }

    // 2. Marcar en localStorage que la sesión expiró por inactividad
    localStorage.setItem('moddle_session_expired', 'true');

    // 3. Invalidar token en el backend
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.warn('Backend logout failed or token already invalid', e);
    }

    // 4. Cerrar sesión en el cliente (limpia storage y redirige a /login)
    logout();
  }, [logout]);

  // Función para renovar la sesión (Sigo aquí)
  const renewSession = useCallback((broadcast = true) => {
    const nowStr = Date.now().toString();
    localStorage.setItem('moddle_last_activity', nowStr);
    setShowModal(false);
    setTimeLeft(GRACE_LIMIT);

    if (broadcast && channelRef.current) {
      try {
        channelRef.current.postMessage('keep_alive');
      } catch (e) {
        console.error('Error broadcasting keep_alive', e);
      }
    }
  }, []);

  // Registrar actividad (con throttle de 3 segundos para no saturar CPU/I-O)
  const registerActivity = useCallback(() => {
    if (!isAuthenticated) return;
    
    const now = Date.now();
    if (now - lastActivityUpdateRef.current > 3000) {
      lastActivityUpdateRef.current = now;
      localStorage.setItem('moddle_last_activity', now.toString());
      
      // Si el modal estaba visible y el usuario interactúa, renovamos de inmediato
      if (showModal) {
        renewSession(true);
      }
    }
  }, [isAuthenticated, showModal, renewSession]);

  // Suscribirse a eventos de usuario y canal de comunicación
  useEffect(() => {
    if (!isAuthenticated) {
      setShowModal(false);
      return;
    }

    // Inicializar timestamp de última actividad
    if (!localStorage.getItem('moddle_last_activity')) {
      localStorage.setItem('moddle_last_activity', Date.now().toString());
    }

    // Inicializar canal de comunicación (BroadcastChannel)
    try {
      const channel = new BroadcastChannel('moddle_session');
      channelRef.current = channel;

      channel.onmessage = (event) => {
        if (event.data === 'keep_alive') {
          // Otra pestaña renovó la sesión
          setShowModal(false);
          setTimeLeft(GRACE_LIMIT);
        } else if (event.data === 'logout') {
          // Otra pestaña forzó el cierre
          handleForceLogout(false);
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported', e);
    }

    // Eventos del DOM para detectar actividad
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((name) => window.addEventListener(name, registerActivity, { passive: true }));

    // Bucle de comprobación (cada segundo)
    const interval = setInterval(() => {
      const lastActivity = Number(localStorage.getItem('moddle_last_activity') || Date.now());
      const now = Date.now();
      const diff = now - lastActivity;

      if (diff >= INACTIVITY_LIMIT) {
        // Fase 1: Entramos en tiempo de advertencia
        setShowModal(true);
        const timePassedSinceLimit = Math.floor((diff - INACTIVITY_LIMIT) / 1000);
        const secondsRemaining = Math.max(0, GRACE_LIMIT - timePassedSinceLimit);
        setTimeLeft(secondsRemaining);

        // Fase 2: Expiración de tiempo de gracia
        if (secondsRemaining <= 0) {
          clearInterval(interval);
          handleForceLogout(true);
        }
      } else {
        // Si la actividad fue renovada en otra pestaña, ocultamos el modal
        if (showModal) {
          setShowModal(false);
        }
      }
    }, 1000);

    return () => {
      // Limpieza
      events.forEach((name) => window.removeEventListener(name, registerActivity));
      clearInterval(interval);
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
  }, [isAuthenticated, registerActivity, handleForceLogout, showModal]);

  return (
    <>
      {children}

      {/* Modal de Advertencia (Fase 1) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 border border-amber-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-full bg-amber-50 flex items-center justify-center mb-4 border border-amber-200">
                <AlertTriangle className="h-7 w-7 text-amber-600 animate-bounce" />
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-2">
                ¿Sigues ahí?
              </h2>
              
              <p className="text-gray-600 mb-6">
                Tu sesión se cerrará en{' '}
                <span className="font-bold text-amber-600 text-lg tabular-nums">
                  {formatTime(timeLeft)}
                </span>{' '}
                minutos por inactividad.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Button
                  variant="outline"
                  onClick={() => handleForceLogout(true)}
                  className="w-full sm:order-1 flex items-center justify-center gap-2 border-gray-200 hover:bg-gray-50 text-gray-700"
                >
                  <LogOut className="h-4 w-4 text-gray-500" />
                  Cerrar Sesión
                </Button>
                <Button
                  onClick={() => renewSession(true)}
                  className="w-full sm:order-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-200"
                >
                  <CheckCircle className="h-4 w-4" />
                  Sigo aquí
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
