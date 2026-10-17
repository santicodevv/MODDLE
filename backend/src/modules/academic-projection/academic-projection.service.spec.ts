import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { entities } from '../../config/entities';
import { MoodleClientService } from '../moodle-integration/moodle-client.service';
import { ProjectionService } from './academic-projection.service';
import { ProgramCompletionStatus } from './dto/program-completion-status';

describe('ProjectionService student grades matrix', () => {
  let service: ProjectionService;
  let repositories: Map<string, { find: jest.Mock }>;
  let query: Record<string, jest.Mock>;

  beforeEach(async () => {
    query = {};
    for (const method of [
      'where',
      'andWhere',
      'orderBy',
      'addOrderBy',
      'skip',
      'take',
    ]) {
      query[method] = jest.fn().mockReturnValue(query);
    }
    query.getCount = jest.fn().mockResolvedValue(1);
    query.getMany = jest.fn().mockResolvedValue([
      {
        moodleId: '10',
        firstname: 'Estudiante',
        lastname: 'Prueba',
        suspended: false,
      },
    ]);
    repositories = new Map(
      entities.map((entity) => [
        entity.name,
        {
          find: jest.fn().mockResolvedValue([]),
          createQueryBuilder: jest.fn().mockReturnValue(query),
        },
      ]),
    );
    const module = await Test.createTestingModule({
      providers: [
        ProjectionService,
        { provide: MoodleClientService, useValue: {} },
        ...entities.map((entity) => ({
          provide: getRepositoryToken(entity),
          useValue: repositories.get(entity.name),
        })),
      ],
    }).compile();
    service = module.get(ProjectionService);
    repositories.get('MoodleCategory')!.find.mockResolvedValue([
      { moodleId: '1', parent: '0', name: 'Programa' },
      ...[1, 2, 3, 4, 5].map((id) => ({
        moodleId: String(id + 10),
        parent: '1',
        name: `Subprograma ${id}`,
      })),
    ]);
    repositories.get('MoodleCourse')!.find.mockResolvedValue(
      [1, 2, 3, 4, 5].map((id) => ({
        moodleId: String(id),
        categoryId: String(id + 10),
        fullname: `Curso ${id}`,
      })),
    );
    repositories
      .get('User')!
      .find.mockResolvedValue([{ id: '100', moodleUserId: '10' }]);
  });

  it('uses the latest manual final grade and the SEBTI threshold for pending subjects', async () => {
    const pendingQuery: Record<string, jest.Mock> = {};
    for (const method of [
      'select',
      'addSelect',
      'innerJoin',
      'leftJoin',
      'setParameter',
      'groupBy',
      'where',
    ]) {
      pendingQuery[method] = jest.fn().mockReturnValue(pendingQuery);
    }
    pendingQuery.getRawMany = jest.fn().mockResolvedValue([
      {
        studentId: '10',
        courseMoodleId: '1',
        level: '1',
        hasApproved: '1',
        hasAnyGrade: '1',
      },
      {
        studentId: '11',
        courseMoodleId: '1',
        level: '1',
        hasApproved: '0',
        hasAnyGrade: '1',
      },
      {
        studentId: '12',
        courseMoodleId: '1',
        level: '1',
        hasApproved: '0',
        hasAnyGrade: '0',
      },
    ]);
    jest
      .spyOn((service as any).studentProgramRepository, 'createQueryBuilder')
      .mockReturnValue(pendingQuery);
    const rows = await service.getPendingSubjects(27);
    expect(rows.map((row) => row.status)).toEqual([
      'approved',
      'failed',
      'pending',
    ]);
    expect(pendingQuery.setParameter).toHaveBeenCalledWith('passingGrade', 7);
    expect(pendingQuery.leftJoin).toHaveBeenCalledWith(
      'course_student_grades',
      'mg',
      expect.stringContaining('ORDER BY g.updated_at DESC, g.id DESC LIMIT 1'),
    );
    expect(pendingQuery.where).toHaveBeenCalledWith(
      'sp.program_id = :programId',
      { programId: 27 },
    );
  });

  it('counts 7 and above, excluding missing, zero and failing final grades', async () => {
    repositories.get('CourseStudentGrade')!.find.mockResolvedValue([
      { studentId: '100', courseMoodleId: '1', totalGrade: '7.00' },
      { studentId: '100', courseMoodleId: '2', totalGrade: '6.99' },
      { studentId: '100', courseMoodleId: '3', totalGrade: '0.00' },
      { studentId: '100', courseMoodleId: '4', totalGrade: '10.00' },
    ]);
    const result = await service.getStudentGradesMatrix(1);
    expect(result.students[0].completedCourseCount).toBe(2);
    expect(result.students[0].grades).toEqual({
      1: 7,
      2: 6.99,
      3: 0,
      4: 10,
      5: null,
    });
  });

  it('uses the latest non-null final grade when a course has multiple periods', async () => {
    repositories.get('CourseStudentGrade')!.find.mockResolvedValue([
      { studentId: '100', courseMoodleId: '1', totalGrade: '6.00' },
      { studentId: '100', courseMoodleId: '1', totalGrade: '9.50' },
    ]);
    const result = await service.getStudentGradesMatrix(1);
    expect(result.students[0].completedCourseCount).toBe(0);
    expect(result.students[0].grades[1]).toBe(6);
    expect(repositories.get('CourseStudentGrade')!.find).toHaveBeenCalledWith(
      expect.objectContaining({ order: { updatedAt: 'DESC', id: 'DESC' } }),
    );
  });

  it.each([
    [ProgramCompletionStatus.COMPLETED, '='],
    [ProgramCompletionStatus.PENDING, '<'],
  ])(
    'filters %s before counting and paginating with the same approval threshold',
    async (status, operator) => {
      await service.getStudentGradesMatrix(1, 2, 10, 'Estudiante', status);
      expect(query.andWhere).toHaveBeenCalledWith(
        expect.stringContaining(`) ${operator} :requiredSubprograms`),
        {
          passingGrade: 7,
          requiredSubprograms: 5,
          groupCourseIds: [1, 2, 3, 4, 5],
          groupSubprogramIds: [11, 12, 13, 14, 15],
        },
      );
      expect(query.andWhere.mock.invocationCallOrder.at(-1)).toBeLessThan(
        query.getCount.mock.invocationCallOrder[0],
      );
      expect(query.getCount.mock.invocationCallOrder[0]).toBeLessThan(
        query.skip.mock.invocationCallOrder[0],
      );
      expect(query.skip).toHaveBeenCalledWith(10);
      expect(query.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('CONCAT_WS'),
        { studentSearch0: '%Estudiante%' },
      );
    },
  );

  it('returns no completed students for a selection without courses', async () => {
    repositories.get('MoodleCourse')!.find.mockResolvedValue([]);
    const result = await service.getStudentGradesMatrix(
      1,
      1,
      10,
      undefined,
      ProgramCompletionStatus.COMPLETED,
    );
    expect(result).toEqual({
      courses: [],
      students: [],
      total: 0,
      page: 1,
      limit: 10,
      totalSubprograms: 5,
      passingGrade: 7,
      maximumGrade: 10,
      selectionName: 'Programa',
    });
    expect(query.getCount).not.toHaveBeenCalled();
  });

  it('counts a subprogram only once even with multiple approved course editions', async () => {
    repositories.get('MoodleCourse')!.find.mockResolvedValue([
      { moodleId: '1', categoryId: '11', fullname: 'Edición A' },
      { moodleId: '2', categoryId: '11', fullname: 'Edición B' },
    ]);
    repositories.get('CourseStudentGrade')!.find.mockResolvedValue([
      { studentId: '100', courseMoodleId: '1', totalGrade: '9' },
      { studentId: '100', courseMoodleId: '2', totalGrade: '8.5' },
    ]);
    const result = await service.getStudentGradesMatrix(1);
    expect(result.students[0].completedCourseCount).toBe(1);
    expect(result.totalSubprograms).toBe(5); // Los subprogramas sin cursos también faltan.
  });

  it('requires only one approved edition when a subprogram is selected', async () => {
    repositories.get('MoodleCourse')!.find.mockResolvedValue([
      { moodleId: '1', categoryId: '11', fullname: 'Edición A' },
      { moodleId: '2', categoryId: '11', fullname: 'Edición B' },
    ]);
    repositories.get('CourseStudentGrade')!.find.mockResolvedValue([
      { studentId: '100', courseMoodleId: '1', totalGrade: '7' },
      { studentId: '100', courseMoodleId: '2', totalGrade: '6' },
    ]);
    const result = await service.getStudentGradesMatrix(11);
    expect(result.totalSubprograms).toBe(1);
    expect(result.students[0].completedCourseCount).toBe(1);
  });

  it('exports all matching students without applying page limits', async () => {
    await service.getStudentGradesMatrix(
      1,
      3,
      10,
      'Prueba',
      ProgramCompletionStatus.PENDING,
      false,
    );
    expect(query.skip).not.toHaveBeenCalled();
    expect(query.take).not.toHaveBeenCalled();
    expect(query.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('CONCAT_WS'),
      { studentSearch0: '%Prueba%' },
    );
  });
  it('uses academic titles as programs and keeps Formación Bíblica as a container', async () => {
    repositories.get('MoodleCategory')!.find.mockResolvedValue([
      { moodleId: '1', parent: '0', name: 'FORMACIÓN BÍBLICA' },
      { moodleId: '2', parent: '1', name: 'DIPLOMATURA' },
      { moodleId: '16', parent: '2', name: 'HERMENEUTICA I' },
      { moodleId: '13', parent: '2', name: 'MATERIAS BASE', visible: false },
    ]);
    repositories.get('AcademicProgram')!.find.mockResolvedValue([
      { id: 19, moodleCategoryId: '1' },
      { id: 27, moodleCategoryId: '2' },
    ]);
    const hierarchy = await service.getCategoryHierarchy();
    expect(hierarchy.map((category) => category.moodleId)).toEqual([2]);
    expect(hierarchy[0].children.map((category) => category.moodleId)).toEqual([
      16,
    ]);
    const subprograms = await service.getSubprograms();
    expect(subprograms.map((category) => category.moodleId)).toEqual([16]);
    const matrix = await service.getStudentGradesMatrix(2);
    expect(matrix.totalSubprograms).toBe(1);
    expect(matrix.selectionName).toBe('DIPLOMATURA');
  });
});
