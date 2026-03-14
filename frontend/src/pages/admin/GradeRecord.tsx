// Admin Grade Record Page - Generate grade records for users (SEBTI Format)
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
  username: string | null;
  moodleUserId: number | null;
}

interface CourseWithPeriod {
  periodId: number | null;
  periodName: string;
  periodCode: string;
  courseMoodleId: number;
  courseName: string;
  courseShortname: string;
  courseCode: string | null;
  courseSubjectName: string | null;
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

// Generate document number
const generateDocNumber = (): string => {
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  return `SEBTI - ${seq}`;
};

export default function AdminGradeRecord() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showSearch, setShowSearch] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);
  const [docNumber] = useState(generateDocNumber());

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
        @page { size: letter; margin: 0.75in; }
        * { box-sizing: border-box; }
        body {
          font-family: Arial, sans-serif;
          font-size: 11pt;
          margin: 0;
          padding: 0;
          color: #333;
        }
        .container {
          max-width: 100%;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          margin-bottom: 20px;
        }
        .header img {
          max-width: 280px;
          height: auto;
          margin-bottom: 10px;
        }
        .student-info {
          margin: 15px 0 20px 0;
        }
        .student-info p {
          margin: 4px 0;
          font-size: 11pt;
        }
        .student-info strong {
          font-weight: bold;
        }
        .date-line {
          text-align: right;
          margin-bottom: 15px;
        }
        .title-bar {
          background-color: #0d7377;
          color: white;
          padding: 10px 20px;
          text-align: center;
          font-size: 16pt;
          font-weight: bold;
          font-style: italic;
          margin: 20px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        th {
          background-color: #f5f5f5;
          border: 1px solid #ddd;
          padding: 8px 10px;
          text-align: left;
          font-weight: bold;
          font-size: 10pt;
        }
        td {
          border: 1px solid #ddd;
          padding: 6px 10px;
          font-size: 10pt;
        }
        td.center, th.center {
          text-align: center;
        }
        .cumulative-bar {
          background-color: #d4a017;
          color: white;
          padding: 8px 20px;
          text-align: center;
          font-size: 12pt;
          font-weight: bold;
          margin: 20px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .footer {
          margin-top: 40px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
        }
        .footer-left {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .footer-seal img {
          width: 80px;
          height: 80px;
          opacity: 0.8;
          border-radius: 50%;
        }
        .footer-signature {
          text-align: center;
        }
        .footer-signature p {
          margin: 2px 0;
        }
        .footer-signature .name {
          font-weight: bold;
          font-size: 11pt;
        }
        .footer-signature .title {
          font-weight: bold;
          font-size: 10pt;
        }
        .footer-right {
          text-align: right;
        }
        .page-note {
          font-style: italic;
          font-size: 9pt;
          margin-top: 15px;
        }
        .doc-id {
          font-size: 11pt;
          font-weight: bold;
        }
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
    }, 500);
  };

  const today = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

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

                {/* Print Content - SEBTI Format */}
                <div
                  ref={printRef}
                  className="bg-white p-8 border rounded-lg"
                  style={{ fontFamily: "Arial, sans-serif" }}
                >
                  <div className="container">
                    {/* Header with Logo */}
                    <div className="header text-center mb-6">
                      <img
                        src="https://i.imgur.com/BfhxWQH.png"
                        alt="SEBTI Logo"
                        style={{ maxWidth: '280px', height: 'auto', margin: '0 auto' }}
                      />
                    </div>

                    {/* Student Info */}
                    <div className="student-info mb-4">
                      <p>
                        <strong>Nombres y apellidos:</strong>{' '}
                        {userGrades.user.displayName || userGrades.user.email}
                      </p>
                      <p>
                        <strong>Documento Nacional de Identidad:</strong>{' '}
                        {userGrades.user.username || userGrades.user.email.split('@')[0]}
                      </p>
                    </div>

                    {/* Date */}
                    <div className="date-line text-right mb-4">
                      <p><strong>Fecha de expedición:</strong> {today}</p>
                    </div>

                    {/* Title Bar */}
                    <div
                      className="title-bar text-center py-3 mb-4"
                      style={{
                        backgroundColor: '#0d7377',
                        color: 'white',
                        fontWeight: 'bold',
                        fontStyle: 'italic',
                        fontSize: '18px'
                      }}
                    >
                      RECORD DE NOTAS
                    </div>

                    {/* Grades Table */}
                    <table className="w-full border-collapse mb-6">
                      <thead>
                        <tr style={{ backgroundColor: '#f5f5f5' }}>
                          <th className="border border-gray-300 px-4 py-2 text-left font-bold">
                            Clave
                          </th>
                          <th className="border border-gray-300 px-4 py-2 text-left font-bold">
                            Nombre asignatura
                          </th>
                          <th className="border border-gray-300 px-4 py-2 text-center font-bold">
                            Ciclo
                          </th>
                          <th className="border border-gray-300 px-4 py-2 text-center font-bold">
                            NF
                          </th>
                          <th className="border border-gray-300 px-4 py-2 text-center font-bold">
                            EQ
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {allCourses.length > 0 ? (
                          allCourses.map((course, idx) => (
                            <tr key={idx}>
                              <td className="border border-gray-300 px-4 py-2">
                                {course.courseCode || course.courseShortname}
                              </td>
                              <td className="border border-gray-300 px-4 py-2">
                                {course.courseSubjectName || course.courseName}
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

                    {/* Cumulative Index Bar */}
                    <div
                      className="cumulative-bar flex justify-between items-center px-4 py-2 mb-8"
                      style={{
                        backgroundColor: '#d4a017',
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    >
                      <span></span>
                      <span>Índice acumulado</span>
                      <span style={{ fontSize: '16px' }}>{calculateCumulativeIndex(allCourses)}</span>
                    </div>

                    {/* Footer */}
                    <div className="footer flex justify-between items-end mt-12">
                      {/* Left side - Seal and Signature */}
                      <div className="footer-left flex items-center gap-4">
                        <div className="footer-seal">
                          <img
                            src="https://i.imgur.com/BfhxWQH.png"
                            alt="Sello SEBTI"
                            style={{
                              width: '70px',
                              height: '70px',
                              opacity: 0.7,
                              borderRadius: '50%'
                            }}
                          />
                        </div>
                        <div className="footer-signature text-center">
                          <p className="font-bold">Juan Carlos Hernández</p>
                          <p className="font-bold text-sm">Departamento de Registro</p>
                        </div>
                      </div>

                      {/* Right side - Page note and Doc ID */}
                      <div className="footer-right text-right">
                        <p className="page-note text-sm italic mb-2">
                          Este récord consta de una página
                        </p>
                        <p className="doc-id font-bold">
                          {docNumber}
                        </p>
                      </div>
                    </div>
                  </div>
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
