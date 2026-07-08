import { Badge, Spinner } from '@/shared/components/ui';
import type { PaymentDashboardItem } from '../../types/payment.types';

interface PaymentsTableProps {
  items: PaymentDashboardItem[];
  isLoading: boolean;
}

function formatCurrency(amount: number): string {
  return `RD$${amount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const statusBadge = {
  Pagado: 'success' as const,
  Parcial: 'warning' as const,
  Pendiente: 'danger' as const,
};

export function PaymentsTable({ items, isLoading }: PaymentsTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No se encontraron facturas
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estudiante</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factura</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pagado</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pendiente</th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {items.map((item, idx) => (
            <tr key={item.invoiceId + idx} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {item.estudiante}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                {item.factura}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                {formatCurrency(item.total)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                {formatCurrency(item.pagado)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-orange-600 font-medium">
                {formatCurrency(item.pendiente)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <Badge variant={statusBadge[item.estado]}>
                  {item.estado}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
