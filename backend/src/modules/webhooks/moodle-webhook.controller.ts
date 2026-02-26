import {
  Controller,
  Post,
  Body,
  Headers,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { Public } from '../../common/decorators/public.decorator';
import { AuditService } from '../sync/services/audit.service';

export interface MoodleWebhookPayload {
  eventname: string;
  objectid?: number;
  courseid?: number;
  userid?: number;
  relateduserid?: number;
  timecreated?: number;
  data?: any;
}

@Controller('integrations/moodle/webhook')
export class MoodleWebhookController {
  private readonly logger = new Logger(MoodleWebhookController.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    @InjectQueue('moodle-inbound')
    private readonly inboundQueue: Queue,
  ) {
    this.webhookSecret =
      this.configService.get<string>('MOODLE_WEBHOOK_SECRET') || '';
  }

  @Public()
  @Post()
  async handleWebhook(
    @Headers('x-moodle-signature') signature: string,
    @Body() payload: MoodleWebhookPayload,
  ) {
    this.logger.log(`Received webhook: ${payload.eventname}`);

    // Validar firma (seguridad básica)
    if (!this.validateSignature(signature)) {
      this.logger.warn('Invalid webhook signature');
      throw new BadRequestException('Invalid signature');
    }

    // Registrar en auditoría
    await this.auditService.log({
      action: 'webhook.received',
      entity: 'moodle_webhook',
      entityKey: payload.eventname,
      afterData: payload,
      source: 'moodle',
    });

    // Encolar para procesamiento asíncrono
    await this.inboundQueue.add('process-webhook', payload);

    return { status: 'accepted' };
  }

  private validateSignature(signature: string): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('MOODLE_WEBHOOK_SECRET not configured, skipping validation');
      return true;
    }

    // Comparar con el secreto configurado
    // En producción, deberías usar un HMAC más robusto
    return signature === this.webhookSecret;
  }
}
