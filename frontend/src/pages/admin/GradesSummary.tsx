// Admin Grades Summary - Detailed view of all grades for a user grouped by period
import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gradesApi } from '@/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  Input,
  Label,
} from '@/components/ui';
import {
  User,
  Search,
  BookOpen,
  GraduationCap,
  TrendingUp,
  CheckCircle,
  TableIcon,
  Calendar,
  ChevronDown,
  ChevronRight,
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
  grade: number | null;
  gradeMax: number | null;
}

interface Course {
  courseMoodleId: number;
  courseName: string;
  courseShortname: string;
  totalGrade: number | null;
  comment: string | null;
  gradeItems: GradeItem[];
  sumGrade: number;
  sumMax: number;
}

interface Period {
  periodId: number | null;
  periodName: string;
  periodCode: string;
  courses: Course[];
}

interface UserGradesData {
  user: {
    id: number;
    email: string;
    displayName: string | null;
    moodleUserId: number | null;
  };
  periods: Period[];
}

export default function GradesSummary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

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
  const { data: userData, isLoading: gradesLoading } = useQuery<UserGradesData>({
    queryKey: ['user-all-grades-summary', selectedUserId],
    queryFn: () => gradesApi.getAllGradesForUser(selectedUserId!),
    enabled: !!selectedUserId,
  });

  // Calculate statistics
  const stats = useMemo(() => {
    if (!userData?.periods)
      return { totalCourses: 0, gradedCourses: 0, avgGrade: null };

    let totalCourses = 0;
    let gradedCourses = 0;
    let totalGradeSum = 0;

    for (const period of userData.periods) {
      for (const course of period.courses) {
        totalCourses++;
        if (course.totalGrade !== null) {
          gradedCourses++;
          totalGradeSum += course.totalGrade;
        }
      }
    }

    const avgGrade = gradedCourses > 0 ? totalGradeSum / gradedCourses : null;
    return { totalCourses, gradedCourses, avgGrade };
  }, [userData?.periods]);

  const handleSelectUser = (user: UserSearchResult) => {
    setSelectedUserId(user.id);
    setSearchQuery(user.displayName || user.email);
    setShowDropdown(false);
    setExpandedCourses(new Set());
  };

  const toggleCourse = (courseKey: string) => {
    setExpandedCourses((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(courseKey)) {
        newSet.delete(courseKey);
      } else {
        newSet.add(courseKey);
      }
      return newSet;
    });
  };

  const getGradeColor = (grade: number | null, max: number | null = 10) => {
    if (grade === null) return 'text-gray-400';
    const percentage = max && max > 0 ? (grade / max) * 100 : grade;
    if (percentage >= 90) return 'text-green-600 font-semibold';
    if (percentage >= 70) return 'text-blue-600 font-semibold';
    if (percentage >= 60) return 'text-yellow-600 font-semibold';
    return 'text-red-600 font-semibold';
  };

  const formatGrade = (grade: number | null, max: number | null) => {
    if (grade === null) return '-';
    if (max !== null && max > 0) {
      return `${grade}/${max}`;
    }
    return String(grade);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <TableIcon className="h-7 w-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Calificaciones por Usuario
            </h1>
            <p className="text-gray-600">
              Vista detallada de todas las calificaciones de un usuario
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

      {/* User Info and Tables */}
      {selectedUserId && userData && (
        <>
          {/* User Card */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
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
                      {stats.gradedCourses} con nota final
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-gray-600">
                      Promedio: {stats.avgGrade !== null ? stats.avgGrade.toFixed(2) : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grades by Period */}
          {gradesLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : userData.periods.length > 0 ? (
            <div className="space-y-6">
              {userData.periods.map((period) => (
                <Card key={period.periodId ?? 'no-period'}>
                  <CardHeader className="bg-gray-50 border-b">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="h-5 w-5 text-indigo-600" />
                      {period.periodName}
                      {period.periodCode && (
                        <span className="text-sm font-normal text-gray-500">
                          ({period.periodCode})
                        </span>
                      )}
                      <span className="ml-auto text-sm font-normal text-gray-500">
                        {period.courses.length} curso{period.courses.length !== 1 ? 's' : ''}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-gray-200">
                      {period.courses.map((course) => {
                        const courseKey = `${period.periodId}-${course.courseMoodleId}`;
                        const isExpanded = expandedCourses.has(courseKey);
                        const hasGradeItems = course.gradeItems.length > 0;

                        return (
                          <div key={courseKey}>
                            {/* Course Row */}
                            <div
                              className={`flex items-center gap-4 p-4 ${hasGradeItems ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                              onClick={() => hasGradeItems && toggleCourse(courseKey)}
                            >
                              {hasGradeItems ? (
                                isExpanded ? (
                                  <ChevronDown className="h-5 w-5 text-gray-400" />
                                ) : (
                                  <ChevronRight className="h-5 w-5 text-gray-400" />
                                )
                              ) : (
                                <div className="w-5" />
                              )}
                              <BookOpen className="h-5 w-5 text-purple-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">
                                  {course.courseName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {course.courseShortname}
                                </p>
                              </div>
                              <div className="flex items-center gap-6 text-sm">
                                <div className="text-center min-w-[80px]">
                                  <p className="text-xs text-gray-500 uppercase">Acumulado</p>
                                  <p className={getGradeColor(course.sumGrade, course.sumMax)}>
                                    {course.sumGrade}/{course.sumMax}
                                  </p>
                                </div>
                                <div className="text-center min-w-[80px]">
                                  <p className="text-xs text-gray-500 uppercase">Total</p>
                                  <p className={getGradeColor(course.totalGrade, 10)}>
                                    {course.totalGrade !== null ? course.totalGrade : '0'}
                                  </p>
                                </div>
                                {course.comment && (
                                  <div className="max-w-[200px]">
                                    <p className="text-xs text-gray-500 uppercase">Comentario</p>
                                    <p className="text-gray-600 truncate" title={course.comment}>
                                      {course.comment}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Grade Items (expanded) */}
                            {isExpanded && hasGradeItems && (
                              <div className="bg-gray-50 px-4 pb-4">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-left text-xs text-gray-500 uppercase">
                                      <th className="py-2 pl-10">Item</th>
                                      <th className="py-2 text-right pr-4">Nota</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {course.gradeItems.map((item) => (
                                      <tr key={item.itemMoodleId} className="bg-white">
                                        <td className="py-2 pl-10 text-gray-700">
                                          {item.itemName}
                                        </td>
                                        <td className="py-2 text-right pr-4">
                                          <span className={getGradeColor(item.grade, item.gradeMax)}>
                                            {formatGrade(item.grade, item.gradeMax)}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
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
