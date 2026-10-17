import * as ExcelJS from 'exceljs';
import { ProjectionExcelService } from './projection-excel.service';
import { ProgramCompletionStatus } from '../dto/program-completion-status';

describe('Projection Excel student records', () => {
  it('exports totals, status and all course columns beyond column Z with numeric grades', async () => {
    const buffer =
      await new ProjectionExcelService().generateStudentGradesMatrixExcel(
        {
          selectionName: 'Tecnicatura',
          passingGrade: 7,
          maximumGrade: 10,
          totalSubprograms: 4,
          courses: Array.from({ length: 30 }, (_, i) => ({
            id: i + 1,
            name: `Curso ${i + 1}`,
            shortname: `C${i + 1}`,
          })),
          students: [
            {
              moodleId: 1,
              name: 'Estudiante A',
              suspended: false,
              completedCourseCount: 4,
              grades: { 1: 7, 30: 10 },
            },
            {
              moodleId: 2,
              name: 'Estudiante B',
              suspended: false,
              completedCourseCount: 3,
              grades: { 1: 6.99 },
            },
          ],
          total: 2,
          page: 1,
          limit: 2,
        },
        ProgramCompletionStatus.ALL,
        'Estudiante',
      );
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(
      buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
    );
    const sheet = workbook.worksheets[0];
    expect(sheet.getCell('A1').value).toContain('Tecnicatura');
    expect(sheet.getCell('A2').value).toContain('Búsqueda: Estudiante');
    expect(sheet.getCell('A2').value).toContain('Nota mínima: 7/10');
    expect(sheet.getCell('B4').value).toBe('Avance del programa');
    expect(sheet.getCell('B5').value).toBe(1);
    expect(sheet.getCell('B6').value).toBe(0.75);
    expect(sheet.getCell('B5').numFmt).toBe('0%');
    expect(sheet.getCell('D5').value).toBe('Completado');
    expect(sheet.getCell('D6').value).toBe('Pendiente');
    expect(sheet.getCell('E5').value).toBe(7);
    expect(sheet.getCell(5, 34).value).toBe(10);
    expect(sheet.getCell('F5').value).toBeNull();
    expect(sheet.rowCount).toBe(6);
    expect(sheet.views[0]).toMatchObject({
      state: 'frozen',
      xSplit: 2,
      ySplit: 4,
    });
  });
});
