// Admin Grades Summary - Simple table view of all grades for a user
import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gradesApi } from '@/api';
import {
  Card,
  CardContent,
  Spinner,
  Input,
  Label,
} from '@/components/ui';
import {
  User,
  Search,
  BookOpen,
  GraduationCap,
  MessageSquare,
  TrendingUp,
  CheckCircle,
  TableIcon,
} from 'lucide-react';

interface UserSearchResult {
  id: number;
  email: string;
  displayName: string | null;
  moodleUserId: number | null;
}

export default function GradesSummary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search users
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['search-users-grades-summary', debouncedQuery],
    queryFn: () => gradesApi.searchUsersForGrades(debouncedQuery, 10),
    enabled: debouncedQuery.length >= 2,
  });

  // Get user grades
  const { data: userData, isLoading: gradesLoading } = useQuery({
    queryKey: ['user-all-grades-summary', selectedUserId],
    queryFn: () => gradesApi.getAllGradesForUser(selectedUserId!),
    enabled: !!selectedUserId,
  });

  // Calculate statistics
  const stats = useMemo(() => {
    if (!userData?.courses)
      return { totalCourses: 0, gradedCourses: 0, avgGrade: null };

    const totalCourses = userData.courses.length;
    const gradedCourses = userData.courses.filter(
      (c) => c.totalGrade !== null,
    ).length;
    const avgGrade =
      gradedCourses > 0
        ? userData.courses
            .filter((c) => c.totalGrade !== null)
            .reduce((sum, c) => sum + (c.totalGrade || 0), 0) / gradedCourses
        : null;

    return { totalCourses, gradedCourses, avgGrade };
  }, [userData?.courses]);

  const handleSelectUser = (user: UserSearchResult) => {
    setSelectedUserId(user.id);
    setSearchQuery(user.displayName || user.email);
    setShowDropdown(false);
  };

  const getGradeColor = (grade: number | null) => {
    if (grade === null) return 'text-gray-400';
    if (grade >= 90) return 'text-green-600 font-semibold';
    if (grade >= 70) return 'text-blue-600 font-semibold';
    if (grade >= 60) return 'text-yellow-600 font-semibold';
    return 'text-red-600 font-semibold';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <TableIcon className="h-7 w-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Resumen de Notas
            </h1>
            <p className="text-gray-600">
              Vista rapida de todas las calificaciones de un usuario
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Label className="mb-2 block">Buscar Usuario</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                  if (e.target.value.length < 2) {
                    setSelectedUserId(null);
                  }
                }}
                onFocus={() => setShowDropdown(true)}
                className="pl-10"
              />
            </div>

            {/* Search Dropdown */}
            {showDropdown && debouncedQuery.length >= 2 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {searchLoading ? (
                  <div className="flex justify-center py-4">
                    <Spinner className="h-5 w-5" />
                  </div>
                ) : searchResults && searchResults.length > 0 ? (
                  searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                      onClick={() => handleSelectUser(user)}
                    >
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
                  ))
                ) : (
                  <div className="py-4 text-center text-gray-500">
                    No se encontraron usuarios
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Info and Table */}
      {selectedUserId && userData && (
        <>
          {/* User Card */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <User className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {userData.user.displayName || userData.user.email}
                    </h2>
                    <p className="text-gray-500">{userData.user.email}</p>
                  </div>
                </div>
                {/* Mini Stats */}
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-gray-600">
                      {stats.totalCourses} cursos
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600">
                      {stats.gradedCourses} calificados
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-gray-600">
                      Promedio: {stats.avgGrade !== null ? stats.avgGrade.toFixed(1) : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grades Table */}
          {gradesLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : userData.courses.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Curso
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Periodo
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-28">
                          Nota Total
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Comentario
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {userData.courses.map((course) => (
                        <tr
                          key={`${course.courseMoodleId}-${course.periodId}`}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-purple-500 flex-shrink-0" />
                              <div>
                                <p className="font-medium text-gray-900">
                                  {course.courseName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {course.courseShortname}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-700">
                              {course.periodName || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={getGradeColor(course.totalGrade)}>
                              {course.totalGrade !== null
                                ? course.totalGrade
                                : '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {course.comment ? (
                              <div className="flex items-start gap-2">
                                <MessageSquare className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-gray-600">
                                  {course.comment}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">
                  Este usuario no tiene calificaciones registradas
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Empty state when no user selected */}
      {!selectedUserId && (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">
              Busca un usuario para ver el resumen de sus calificaciones
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Escribe al menos 2 caracteres para comenzar la busqueda
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
