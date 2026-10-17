import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { entities } from '../../../config/entities';
import { AuditService } from '../../sync/services/audit.service';
import { StudentGradesService } from './student-grades.service';

describe('SEBTI grade record hierarchy', () => {
  it('shows the academic title as program and the subject as subprogram, preserving final grades', async () => {
    const repositories = new Map(
      entities.map((entity) => [
        entity.name,
        {
          find: jest.fn().mockResolvedValue([]),
          findOne: jest.fn().mockResolvedValue(null),
          manager: { query: jest.fn().mockResolvedValue([]) },
        },
      ]),
    );
    repositories
      .get('User')!
      .findOne.mockResolvedValue({
        id: 100,
        moodleUserId: 10,
        displayName: 'Estudiante Prueba',
        email: 'test@example.com',
      });
    repositories
      .get('CourseStudentGrade')!
      .find.mockResolvedValue([
        {
          studentId: 100,
          courseMoodleId: '8',
          periodId: 1,
          totalGrade: '69.00',
          period: { name: 'Ciclo', code: '2025-1' },
        },
      ]);
    repositories
      .get('MoodleCourse')!
      .find.mockResolvedValue([
        {
          moodleId: '8',
          categoryId: 16,
          fullname: 'Curso edición 2025',
          shortname: 'HE01_2025-1',
        },
      ]);
    repositories.get('MoodleCourse')!.manager.query.mockResolvedValue([
      {
        course_moodle_id: '8',
        cat_moodle_id: '16',
        cat_name: 'HERMENEUTICA I',
        cat_parent: '2',
        sga_program_id: null,
        distance: 0,
      },
      {
        course_moodle_id: '8',
        cat_moodle_id: '2',
        cat_name: 'DIPLOMATURA',
        cat_parent: '1',
        sga_program_id: 27,
        distance: 1,
      },
      {
        course_moodle_id: '8',
        cat_moodle_id: '1',
        cat_name: 'FORMACIÓN BÍBLICA',
        cat_parent: '0',
        sga_program_id: null,
        distance: 2,
      },
    ]);
    const module = await Test.createTestingModule({
      providers: [
        StudentGradesService,
        { provide: AuditService, useValue: {} },
        ...entities.map((entity) => ({
          provide: getRepositoryToken(entity),
          useValue: repositories.get(entity.name),
        })),
      ],
    }).compile();
    const result = await module
      .get(StudentGradesService)
      .getAllGradesForUser(100);
    expect(result.periods[0].courses[0]).toMatchObject({
      programMoodleId: 2,
      programName: 'DIPLOMATURA',
      materiaName: 'HERMENEUTICA I',
      totalGrade: '69.00',
    });
    expect(result.periods[0].periodCode).toBe('2025-1');
  });
});
