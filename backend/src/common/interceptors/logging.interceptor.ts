import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Generar correlation ID
    const correlationId = (request.headers['x-correlation-id'] as string) || uuidv4();
    request.headers['x-correlation-id'] = correlationId;
    response.setHeader('x-correlation-id', correlationId);

    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const userId = (request as any).user?.id || 'anonymous';

    const startTime = Date.now();

    this.logger.log(
      `[${correlationId}] ${method} ${url} - User: ${userId} - IP: ${ip} - UA: ${userAgent}`,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;

          this.logger.log(
            `[${correlationId}] ${method} ${url} - ${statusCode} - ${duration}ms`,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          this.logger.error(
            `[${correlationId}] ${method} ${url} - ${statusCode} - ${duration}ms - Error: ${error.message}`,
          );
        },
      }),
    );
  }
}
