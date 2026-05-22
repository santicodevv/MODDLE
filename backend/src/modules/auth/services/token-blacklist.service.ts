import { Injectable } from '@nestjs/common';

@Injectable()
export class TokenBlacklistService {
  private blacklist = new Set<string>();

  /**
   * Registra un token en la lista negra para invalidarlo.
   * Se elimina del set automáticamente después de 2 horas (tiempo mayor a la expiración del token)
   * para prevenir el consumo progresivo de memoria (memory leaks).
   */
  add(token: string): void {
    if (!token) return;
    this.blacklist.add(token);
    
    // Purga automática
    setTimeout(() => {
      this.blacklist.delete(token);
    }, 2 * 60 * 60 * 1000); // 2 horas en milisegundos
  }

  /**
   * Verifica si un token se encuentra en la lista negra.
   */
  isBlacklisted(token: string): boolean {
    if (!token) return false;
    return this.blacklist.has(token);
  }
}
