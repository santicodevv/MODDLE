
import { GraduationCap } from 'lucide-react';
import { Card, CardContent, Label, Select } from '@/shared/components/ui';

export function TeacherGradesFilters({ periods, effectivePeriodId, setSelectedPeriodId }: any) {
  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <GraduationCap className="h-5 w-5 text-gray-500" />
          <div className="flex-1">
            <Label>Periodo academico</Label>
            <Select
              value={effectivePeriodId || ''}
              onChange={(e) => setSelectedPeriodId(Number(e.target.value))}
              className="mt-1"
            >
              {periods?.map((period: any) => (
                <option key={period.id} value={period.id}>
                  {period.name} {period.status === 'open' ? '(Activo)' : ''}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
