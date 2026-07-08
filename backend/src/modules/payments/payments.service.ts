import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import type {
  KnoroomInvoice,
  KnoroomPayment,
  PaymentDashboardItem,
} from './interfaces/knorooms-payment.types';
import type { PaymentsQueryDto, PaymentStatsDto } from './dto/payments.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly apiClient: AxiosInstance;
  private readonly locationId: string;

  constructor(private readonly configService: ConfigService) {
    const baseURL =
      this.configService.get<string>('PAYMENTS_API_URL') ||
      'https://services.leadconnectorhq.com';
    const token =
      this.configService.get<string>('PAYMENTS_API_TOKEN') || '';
    this.locationId =
      this.configService.get<string>('PAYMENTS_LOCATION_ID') || '';

    this.apiClient = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Version: '2021-07-28',
      },
      timeout: 15000,
    });
  }

  private getParams(): Record<string, string> {
    const params: Record<string, string> = {
      limit: '100',
      offset: '0',
    };
    if (this.locationId) {
      params.altId = this.locationId;
      params.altType = 'location';
    }
    return params;
  }

  async getInvoices(): Promise<KnoroomInvoice[]> {
    try {
      const { data } = await this.apiClient.get('/invoices/', {
        params: this.getParams(),
      });
      return data.invoices || data || [];
    } catch (error) {
      this.logger.error('Error fetching invoices', error.message);
      throw new HttpException(
        'Error al obtener facturas de KNOROOMS',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async getPayments(): Promise<KnoroomPayment[]> {
    try {
      const { data } = await this.apiClient.get('/payments/transactions', {
        params: this.getParams(),
      });
      return data.transactions || data.payments || data || [];
    } catch (error) {
      this.logger.warn('Error fetching payments (non-fatal): ' + error.message);
      return [];
    }
  }

  async getDashboard(query: PaymentsQueryDto): Promise<{
    items: PaymentDashboardItem[];
    stats: PaymentStatsDto;
    total: number;
    page: number;
    limit: number;
  }> {
    const [invoices, payments] = await Promise.all([
      this.getInvoices(),
      this.getPayments(),
    ]);

    const items: PaymentDashboardItem[] = invoices.map((inv) => {
      const pagosFactura = payments.filter((p) => p.invoiceId === inv._id && p.status === 'success');
      const totalPagado = pagosFactura.reduce((sum, p) => sum + p.amount, 0);
      const pendiente = Math.max(0, (inv.amountDue ?? inv.total) - totalPagado);

      let estado: PaymentDashboardItem['estado'];
      if (pendiente <= 0) {
        estado = 'Pagado';
      } else if (totalPagado > 0) {
        estado = 'Parcial';
      } else {
        estado = 'Pendiente';
      }

      return {
        estudiante: inv.contactDetails?.name || 'Desconocido',
        factura: inv.invoiceNumber ? `Factura #${inv.invoiceNumber}` : inv.title || `Factura #${inv._id}`,
        total: inv.total,
        pagado: totalPagado,
        pendiente,
        estado,
        invoiceId: inv._id,
        fecha: inv.createdAt,
      };
    });

    let filtered = items;
    if (query.search) {
      const s = query.search.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.estudiante.toLowerCase().includes(s) ||
          i.factura.toLowerCase().includes(s),
      );
    }
    if (query.status) {
      filtered = filtered.filter(
        (i) => i.estado.toLowerCase() === query.status!.toLowerCase(),
      );
    }

    const stats: PaymentStatsDto = {
      totalFacturado: items.reduce((s, i) => s + i.total, 0),
      totalCobrado: items.reduce((s, i) => s + i.pagado, 0),
      totalPendiente: items.reduce((s, i) => s + i.pendiente, 0),
      facturasPagadas: items.filter((i) => i.estado === 'Pagado').length,
      facturasParciales: items.filter((i) => i.estado === 'Parcial').length,
      facturasPendientes: items.filter((i) => i.estado === 'Pendiente').length,
    };

    const total = filtered.length;
    const page = query.page || 1;
    const limit = query.limit || 12;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return { items: paginated, stats, total, page, limit };
  }

  async getStats(): Promise<PaymentStatsDto> {
    const { stats } = await this.getDashboard({ page: 1, limit: 1 });
    return stats;
  }

  async getStudentInvoices(search: string): Promise<PaymentDashboardItem[]> {
    const invoices = await this.getInvoices();
    const payments = await this.getPayments();
    const s = search.toLowerCase();

    const filtered = invoices.filter(
      (inv) =>
        inv.contactDetails?.name?.toLowerCase().includes(s) ||
        inv._id?.toLowerCase().includes(s),
    );

    return filtered.map((inv) => {
      const pagosFactura = payments.filter(
        (p) => p.invoiceId === inv._id && p.status === 'success',
      );
      const totalPagado = pagosFactura.reduce((sum, p) => sum + p.amount, 0);
      const pendiente = Math.max(0, (inv.amountDue ?? inv.total) - totalPagado);

      return {
        estudiante: inv.contactDetails?.name || 'Desconocido',
        factura: inv.invoiceNumber ? `Factura #${inv.invoiceNumber}` : inv.title || `Factura #${inv._id}`,
        total: inv.total,
        pagado: totalPagado,
        pendiente,
        estado: pendiente <= 0 ? 'Pagado' : totalPagado > 0 ? 'Parcial' : 'Pendiente',
        invoiceId: inv._id,
        fecha: inv.createdAt,
      };
    });
  }
}
