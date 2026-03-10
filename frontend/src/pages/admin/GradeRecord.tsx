// Admin Grade Record Page - Generate grade records for users
import { useState, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gradesApi } from '@/api';
import {
  Card,
  CardContent,
  Badge,
  Spinner,
  Input,
  Button,
} from '@/components/ui';
import {
  Search,
  FileText,
  User,
  Download,
  GraduationCap,
  Printer,
} from 'lucide-react';

interface UserSearchResult {
  id: number;
  email: string;
  displayName: string | null;
  moodleUserId: number | null;
}

interface CourseWithPeriod {
  periodId: number | null;
  periodName: string;
  periodCode: string;
  courseMoodleId: number;
  courseName: string;
  courseShortname: string;
  totalGrade: number | null;
  comment: string | null;
  gradeItems: {
    itemMoodleId: number;
    itemName: string;
    grade: number | null;
    gradeMax: number | null;
  }[];
  sumGrade: number;
  sumMax: number;
}

// Convert grade to equivalence
const getEquivalence = (grade: number | null): string => {
  if (grade === null) return '-';
  if (grade >= 90) return 'A';
  if (grade >= 80) return 'B';
  if (grade >= 70) return 'C';
  if (grade >= 60) return 'D';
  return 'F';
};

// Calculate cumulative index
const calculateCumulativeIndex = (
  courses: CourseWithPeriod[],
): number => {
  const gradedCourses = courses.filter((c) => c.totalGrade !== null && c.totalGrade !== undefined);
  if (gradedCourses.length === 0) return 0;
  const sum = gradedCourses.reduce((acc, c) => {
    const grade = parseFloat(String(c.totalGrade || 0));
    return acc + (isNaN(grade) ? 0 : grade);
  }, 0);
  const avg = sum / gradedCourses.length;
  return isNaN(avg) ? 0 : Math.round(avg * 10) / 10;
};

export default function AdminGradeRecord() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showSearch, setShowSearch] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  // Search users
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['search-users-grades', searchQuery],
    queryFn: () => gradesApi.searchUsersForGrades(searchQuery, 10),
    enabled: searchQuery.length >= 2,
  });

  // Get user grades
  const { data: userGrades, isLoading: gradesLoading } = useQuery({
    queryKey: ['user-all-grades', selectedUserId],
    queryFn: () => gradesApi.getAllGradesForUser(selectedUserId!),
    enabled: !!selectedUserId,
  });

  // Flatten courses from periods for the grade record table
  const allCourses = useMemo((): CourseWithPeriod[] => {
    if (!userGrades?.periods) return [];
    return userGrades.periods.flatMap((period) =>
      period.courses.map((course) => ({
        ...course,
        periodId: period.periodId,
        periodName: period.periodName,
        periodCode: period.periodCode,
      }))
    );
  }, [userGrades?.periods]);

  const handleSelectUser = (user: UserSearchResult) => {
    setSelectedUserId(user.id);
    setShowSearch(false);
    setSearchQuery('');
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const styles = `
      <style>
        @page { size: letter; margin: 1in; }
        body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { font-size: 18pt; font-weight: bold; margin: 0; }
        .header h2 { font-size: 12pt; font-weight: normal; font-style: italic; margin: 5px 0; }
        .header h3 { font-size: 14pt; font-weight: bold; margin-top: 20px; text-decoration: underline; }
        .info { margin: 20px 0; }
        .info p { margin: 5px 0; }
        .info span { font-weight: normal; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #333; padding: 8px; text-align: left; }
        th { background-color: #f0f0f0; font-weight: bold; }
        td.center { text-align: center; }
        .cumulative { text-align: right; margin: 20px 0; font-weight: bold; }
        .footer { margin-top: 60px; text-align: center; }
        .footer .signature { margin-top: 40px; }
        .footer .line { border-top: 1px solid #333; width: 200px; margin: 0 auto; }
        .footer p { margin: 5px 0; }
        .page-note { text-align: center; margin: 20px 0; font-style: italic; }
        .doc-id { position: fixed; bottom: 20px; right: 20px; font-size: 10pt; }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Record de Notas - ${userGrades?.user.displayName || userGrades?.user.email}</title>
          ${styles}
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const today = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).replace(/\//g, '_');

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="h-7 w-7 text-blue-600" />
          Record de Notas
        </h1>
        <p className="text-gray-600 mt-1">
          Genera el record de notas oficial de un estudiante
        </p>
      </div>

      {/* Search Section */}
      {showSearch && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Search className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-semibold">Buscar Estudiante</h3>
            </div>
            <div className="relative">
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            {/* Search Results */}
            {searchLoading && searchQuery.length >= 2 && (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            )}

            {searchResults && searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                {searchResults.map((user: UserSearchResult) => (
                  <div
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.displayName || user.email}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      ID: {user.moodleUserId || user.id}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {searchResults && searchResults.length === 0 && searchQuery.length >= 2 && (
              <p className="text-center text-gray-500 py-4">
                No se encontraron usuarios
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Selected User & Record */}
      {selectedUserId && (
        <>
          {/* User Info Bar */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <GraduationCap className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {userGrades?.user.displayName || userGrades?.user.email || 'Cargando...'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {userGrades?.user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedUserId(null);
                      setShowSearch(true);
                    }}
                  >
                    Cambiar Usuario
                  </Button>
                  <Button onClick={handlePrint} disabled={gradesLoading}>
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir Record
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grade Record Preview */}
          {gradesLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : userGrades ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Vista Previa del Record</h3>
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar PDF
                  </Button>
                </div>

                {/* Print Content */}
                <div
                  ref={printRef}
                  className="bg-white p-8 border rounded-lg"
                  style={{ fontFamily: "'Times New Roman', Times, serif" }}
                >
                  {/* Header */}
                  <div className="header text-center mb-8">
                    <h1 className="text-xl font-bold">
                      ESCUELA DE FORMACION BIBLICA
                    </h1>
                    <h2 className="text-sm italic">
                      Formando lideres para la obra de Dios
                    </h2>
                    <h3 className="text-lg font-bold mt-6 underline">
                      RECORD DE NOTAS
                    </h3>
                    <p className="text-sm mt-2">TEOLOGIA</p>
                  </div>

                  {/* Student Info */}
                  <div className="info mb-6">
                    <p>
                      <strong>Nombres y Apellidos:</strong>{' '}
                      <span>{userGrades.user.displayName || userGrades.user.email}</span>
                    </p>
                    <p>
                      <strong>Cedula de identidad:</strong>{' '}
                      <span>{userGrades.user.email.split('@')[0]}</span>
                    </p>
                    <p>
                      <strong>Fecha de Expedicion:</strong>{' '}
                      <span>{today}</span>
                    </p>
                  </div>

                  {/* Grades Table */}
                  <table className="w-full border-collapse mb-6">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-4 py-2 text-left">
                          Clave
                        </th>
                        <th className="border border-gray-300 px-4 py-2 text-left">
                          Nombre Asignatura
                        </th>
                        <th className="border border-gray-300 px-4 py-2 text-center">
                          Ciclo
                        </th>
                        <th className="border border-gray-300 px-4 py-2 text-center">
                          NF
                        </th>
                        <th className="border border-gray-300 px-4 py-2 text-center">
                          EQ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {allCourses.length > 0 ? (
                        allCourses.map((course, idx) => (
                          <tr key={idx}>
                            <td className="border border-gray-300 px-4 py-2">
                              {course.courseShortname}
                            </td>
                            <td className="border border-gray-300 px-4 py-2">
                              {course.courseName}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              {course.periodCode || '-'}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center font-semibold">
                              {course.totalGrade !== null ? course.totalGrade : 0}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-center">
                              {getEquivalence(course.totalGrade)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className="border border-gray-300 px-4 py-8 text-center text-gray-500"
                          >
                            No hay cursos registrados
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Cumulative Index */}
                  <div className="cumulative text-right mb-8">
                    <p>
                      <strong>Indice acumulado:</strong>
                    </p>
                    <p className="text-xl font-bold">
                      {calculateCumulativeIndex(allCourses)}
                    </p>
                  </div>

                  {/* Page Note */}
                  <p className="page-note text-center italic text-sm mb-8">
                    Este record consta de una pagina
                  </p>

                  {/* Footer/Signature */}
                  <div className="footer text-center mt-16">
                    <div className="signature">
                      <div
                        className="line"
                        style={{
                          borderTop: '1px solid #333',
                          width: '200px',
                          margin: '0 auto',
                        }}
                      ></div>
                      <p className="font-semibold mt-2">Grace Heredia</p>
                      <p className="text-sm">Directora de Registro</p>
                    </div>
                  </div>

                  {/* Document ID */}
                  <p
                    className="doc-id text-right text-xs text-gray-500 mt-8"
                    style={{ fontSize: '10pt' }}
                  >
                    EFB {Date.now().toString().slice(-10)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      {/* Empty State */}
      {!selectedUserId && !showSearch && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">
              Selecciona un estudiante para generar su record de notas
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setShowSearch(true)}
            >
              Buscar Estudiante
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
