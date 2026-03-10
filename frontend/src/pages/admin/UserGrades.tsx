// Admin User Grades Page - View all grades for a specific user in a single table
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
  Clock,
} from 'lucide-react';

interface UserSearchResult {
  id: number;
  email: string;
  displayName: string | null;
  moodleUserId: number | null;
}

export default function UserGrades() {
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
    queryKey: ['search-users-grades', debouncedQuery],
    queryFn: () => gradesApi.searchUsersForGrades(debouncedQuery, 10),
    enabled: debouncedQuery.length >= 2,
  });

  // Get user grades
  const { data: userData, isLoading: gradesLoading } = useQuery({
    queryKey: ['user-all-grades', selectedUserId],
    queryFn: () => gradesApi.getAllGradesForUser(selectedUserId!),
    enabled: !!selectedUserId,
  });

  // Flatten courses from periods for easier table display
  const allCourses = useMemo(() => {
    if (!userData?.periods) return [];
    return userData.periods.flatMap((period) =>
      period.courses.map((course) => ({
        ...course,
        periodId: period.periodId,
        periodName: period.periodName,
        periodCode: period.periodCode,
      }))
    );
  }, [userData?.periods]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (allCourses.length === 0)
      return { totalCourses: 0, gradedCourses: 0, avgGrade: null };

    const totalCourses = allCourses.length;
    const gradedCourses = allCourses.filter(
      (c) => c.totalGrade !== null,
    ).length;
    const avgGrade =
      gradedCourses > 0
        ? allCourses
            .filter((c) => c.totalGrade !== null)
            .reduce((sum, c) => sum + (c.totalGrade || 0), 0) / gradedCourses
        : null;

    return { totalCourses, gradedCourses, avgGrade };
  }, [allCourses]);

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
        <h1 className="text-2xl font-bold text-gray-900">
          Calificaciones por Usuario
        </h1>
        <p className="text-gray-600 mt-1">
          Busca un usuario para ver todas sus calificaciones detalladas
        </p>
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

      {/* User Info and Stats */}
      {selectedUserId && userData && (
        <>
          {/* User Card */}
          <Card className="mb-6">
            <CardContent className="p-4">
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
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <BookOpen className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Cursos</p>
                    <p className="text-xl font-bold text-purple-600">
                      {stats.totalCourses}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Calificados</p>
                    <p className="text-xl font-bold text-green-600">
                      {stats.gradedCourses}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pendientes</p>
                    <p className="text-xl font-bold text-orange-600">
                      {stats.totalCourses - stats.gradedCourses}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Promedio</p>
                    <p className="text-xl font-bold text-blue-600">
                      {stats.avgGrade !== null
                        ? stats.avgGrade.toFixed(1)
                        : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Grades Table */}
          {gradesLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : allCourses.length > 0 ? (
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
                      {allCourses.map((course) => (
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
              Busca un usuario para ver sus calificaciones
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
