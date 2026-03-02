// Admin User Grades Page - View all grades for a specific user
import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gradesApi } from '@/api';
import {
  Card,
  CardContent,
  Badge,
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
  Calendar,
  TrendingUp,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  FileText,
} from 'lucide-react';

interface UserSearchResult {
  id: number;
  email: string;
  displayName: string | null;
  moodleUserId: number | null;
}

interface GradeItem {
  itemMoodleId: number;
  itemName: string;
  itemType: string | null;
  grade: number | null;
  gradeMax: number | null;
}

interface CourseGrade {
  periodId: number | null;
  periodName: string;
  periodCode: string;
  courseMoodleId: number;
  courseName: string;
  courseShortname: string;
  moodleSumGrade: number | null;
  moodleSumMax: number | null;
  totalGrade: number | null;
  comment: string | null;
  teacherName: string | null;
  gradeItems: GradeItem[];
}

export default function UserGrades() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [expandedCourses, setExpandedCourses] = useState<Set<number>>(
    new Set(),
  );

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

  // Group courses by period
  const coursesByPeriod = useMemo(() => {
    if (!userData?.courses) return [];

    const grouped = new Map<
      number | null,
      {
        period: { id: number | null; name: string; code: string };
        courses: CourseGrade[];
      }
    >();

    for (const course of userData.courses) {
      const periodKey = course.periodId;
      if (!grouped.has(periodKey)) {
        grouped.set(periodKey, {
          period: {
            id: course.periodId,
            name: course.periodName,
            code: course.periodCode,
          },
          courses: [],
        });
      }
      grouped.get(periodKey)!.courses.push(course);
    }

    return Array.from(grouped.values()).sort(
      (a, b) => (b.period.id ?? 0) - (a.period.id ?? 0),
    );
  }, [userData?.courses]);

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
    setExpandedCourses(new Set());
  };

  const toggleCourse = (courseMoodleId: number) => {
    setExpandedCourses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(courseMoodleId)) {
        newSet.delete(courseMoodleId);
      } else {
        newSet.add(courseMoodleId);
      }
      return newSet;
    });
  };

  const getGradeColor = (grade: number | null) => {
    if (grade === null) return 'text-gray-400 bg-gray-50';
    if (grade >= 90) return 'text-green-600 bg-green-50';
    if (grade >= 70) return 'text-blue-600 bg-blue-50';
    if (grade >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getItemTypeLabel = (type: string | null) => {
    if (!type) return 'Item';
    const types: Record<string, string> = {
      mod: 'Actividad',
      course: 'Curso',
      manual: 'Manual',
      category: 'Categoria',
    };
    return types[type] || type;
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

          {/* Courses by Period */}
          {gradesLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : coursesByPeriod.length > 0 ? (
            <div className="space-y-6">
              {coursesByPeriod.map(({ period, courses }) => (
                <Card key={period.id ?? 'no-period'}>
                  <CardContent className="p-0">
                    {/* Period Header */}
                    <div className="flex items-center gap-3 p-4 bg-gray-50 border-b">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Calendar className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {period.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {period.code || 'Sin codigo'}
                        </p>
                      </div>
                      <Badge variant="secondary" className="ml-auto">
                        {courses.length} cursos
                      </Badge>
                    </div>

                    {/* Courses List */}
                    <div className="divide-y">
                      {courses.map((course) => {
                        const isExpanded = expandedCourses.has(
                          course.courseMoodleId,
                        );
                        return (
                          <div key={course.courseMoodleId}>
                            {/* Course Header - Clickable */}
                            <div
                              className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() =>
                                toggleCourse(course.courseMoodleId)
                              }
                            >
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-gray-400" />
                                )}
                                <BookOpen className="h-4 w-4 text-purple-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                  {course.courseName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {course.courseShortname}
                                </p>
                              </div>
                              <div className="flex items-center gap-4">
                                {/* Acumulado */}
                                <div className="text-center">
                                  <p className="text-xs text-gray-500">
                                    Acumulado
                                  </p>
                                  <p className="font-semibold text-gray-700">
                                    {course.moodleSumGrade !== null
                                      ? `${course.moodleSumGrade.toFixed(2)}/${course.moodleSumMax?.toFixed(2)}`
                                      : '-'}
                                  </p>
                                </div>
                                {/* Nota Final */}
                                <div
                                  className={`text-center px-3 py-1 rounded-lg ${getGradeColor(
                                    course.totalGrade,
                                  )}`}
                                >
                                  <p className="text-xs">Total</p>
                                  <p className="font-bold">
                                    {course.totalGrade !== null
                                      ? course.totalGrade
                                      : '-'}
                                  </p>
                                </div>
                                {/* Items count */}
                                <Badge variant="outline" className="text-xs">
                                  {course.gradeItems.length} items
                                </Badge>
                              </div>
                            </div>

                            {/* Expanded: Grade Items Table */}
                            {isExpanded && (
                              <div className="bg-gray-50 border-t px-4 py-3">
                                {course.gradeItems.length > 0 ? (
                                  <div className="bg-white rounded-lg border overflow-hidden">
                                    <table className="w-full">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                            Item
                                          </th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">
                                            Tipo
                                          </th>
                                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase w-32">
                                            Nota
                                          </th>
                                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase w-24">
                                            Max
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-200">
                                        {course.gradeItems.map((item) => (
                                          <tr
                                            key={item.itemMoodleId}
                                            className="hover:bg-gray-50"
                                          >
                                            <td className="px-4 py-2">
                                              <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                                <span className="text-sm text-gray-900">
                                                  {item.itemName}
                                                </span>
                                              </div>
                                            </td>
                                            <td className="px-4 py-2">
                                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                {getItemTypeLabel(
                                                  item.itemType,
                                                )}
                                              </span>
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                              <span
                                                className={`font-semibold ${
                                                  item.grade !== null
                                                    ? 'text-blue-600'
                                                    : 'text-gray-400'
                                                }`}
                                              >
                                                {item.grade !== null
                                                  ? item.grade.toFixed(2)
                                                  : '-'}
                                              </span>
                                            </td>
                                            <td className="px-4 py-2 text-center text-sm text-gray-500">
                                              {item.gradeMax !== null
                                                ? item.gradeMax.toFixed(2)
                                                : '-'}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="text-center py-4 text-gray-500 text-sm">
                                    No hay items de calificacion para este curso
                                  </div>
                                )}

                                {/* Comment and Teacher */}
                                {(course.comment || course.teacherName) && (
                                  <div className="mt-3 p-3 bg-white rounded-lg border">
                                    {course.comment && (
                                      <div className="flex items-start gap-2 mb-2">
                                        <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5" />
                                        <p className="text-sm text-gray-600">
                                          {course.comment}
                                        </p>
                                      </div>
                                    )}
                                    {course.teacherName && (
                                      <p className="text-xs text-gray-500">
                                        Calificado por: {course.teacherName}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
