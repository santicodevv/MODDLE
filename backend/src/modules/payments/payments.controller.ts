import { Controller, Get, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsQueryDto } from './dto/payments.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleCode } from '../users/entities/role.entity';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Roles(RoleCode.ADMIN)
  @Get('dashboard')
  async getDashboard(@Query() query: PaymentsQueryDto) {
    return this.paymentsService.getDashboard(query);
  }

  @Roles(RoleCode.ADMIN)
  @Get('stats')
  async getStats() {
    return this.paymentsService.getStats();
  }

  @Roles(RoleCode.ADMIN)
  @Get('students')
  async getStudentInvoices(@Query('search') search: string) {
    return this.paymentsService.getStudentInvoices(search || '');
  }
}
