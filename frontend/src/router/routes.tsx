// Route configuration
import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleGuard } from './RoleGuard';
import { GuestRoute } from './GuestRoute';
import { MainLayout } from '@/components/layout';
import { AuthLayout } from '@/components/layout';

// Lazy load pages for code splitting
// Auth pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'));

// Student pages
const StudentDashboard = lazy(() => import('@/pages/student/Dashboard'));
const StudentGrades = lazy(() => import('@/pages/student/Grades'));
const StudentCourses = lazy(() => import('@/pages/student/Courses'));
const StudentReEnrolment = lazy(() => import('@/pages/student/ReEnrolment'));
// const StudentTranscripts = lazy(() => import('@/pages/student/Transcripts'));

// Teacher pages
const TeacherDashboard = lazy(() => import('@/pages/teacher/Dashboard'));
const TeacherCourses = lazy(() => import('@/pages/teacher/Courses'));
const TeacherGradeEntry = lazy(() => import('@/pages/teacher/GradeEntry'));
const TeacherGrades = lazy(() => import('@/pages/teacher/TeacherGrades'));

// Admin pages
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('@/pages/admin/Users'));
const AdminCourses = lazy(() => import('@/pages/admin/Courses'));
const AdminCourseDetail = lazy(() => import('@/pages/admin/CourseDetail'));
const AdminGrades = lazy(() => import('@/pages/admin/Grades'));
const AdminUserGrades = lazy(() => import('@/pages/admin/UserGrades'));
const AdminGradeRecord = lazy(() => import('@/pages/admin/GradeRecord'));
const AdminPeriods = lazy(() => import('@/pages/admin/Periods'));
const AdminReEnrolments = lazy(() => import('@/pages/admin/ReEnrolments'));
// const AdminTranscripts = lazy(() => import('@/pages/admin/Transcripts'));
const AdminSync = lazy(() => import('@/pages/admin/Sync'));
const AdminAudit = lazy(() => import('@/pages/admin/Audit'));
const AdminCreateCourse = lazy(() => import('@/pages/admin/CreateCourse'));

// Shared pages
const ProfilePage = lazy(() => import('@/pages/shared/Profile'));
const NotFoundPage = lazy(() => import('@/pages/shared/NotFound'));

export const routes: RouteObject[] = [
  // Guest routes (login, register) with AuthLayout
  {
    element: <GuestRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
          { index: true, path: '/', element: <LoginPage /> },
        ],
      },
    ],
  },

  // Protected routes (require authentication) with MainLayout
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          // Shared routes (all authenticated users)
          { path: '/profile', element: <ProfilePage /> },

          // Student routes
          {
            path: '/student',
            element: <RoleGuard allowedRoles={['STUDENT', 'ADMIN']} />,
            children: [
              { index: true, element: <StudentDashboard /> },
              { path: 'grades', element: <StudentGrades /> },
              { path: 'courses', element: <StudentCourses /> },
              { path: 'reenrolment', element: <StudentReEnrolment /> },
              // { path: 'transcripts', element: <StudentTranscripts /> }, // Temporalmente oculto
            ],
          },

          // Teacher routes
          {
            path: '/teacher',
            element: <RoleGuard allowedRoles={['TEACHER', 'ADMIN']} />,
            children: [
              { index: true, element: <TeacherDashboard /> },
              { path: 'courses', element: <TeacherCourses /> },
              {
                path: 'courses/:courseId/grades',
                element: <TeacherGradeEntry />,
              },
              {
                path: 'courses/:courseId/grades/:itemId',
                element: <TeacherGradeEntry />,
              },
              { path: 'grades/:courseId', element: <TeacherGrades /> },
            ],
          },

          // Admin routes
          {
            path: '/admin',
            element: <RoleGuard allowedRoles={['ADMIN']} />,
            children: [
              { index: true, element: <AdminDashboard /> },
              { path: 'users', element: <AdminUsers /> },
              { path: 'courses', element: <AdminCourses /> },
              { path: 'courses/create', element: <AdminCreateCourse /> },
              { path: 'courses/:courseId', element: <AdminCourseDetail /> },
              { path: 'grades', element: <AdminGrades /> },
              { path: 'grades/user', element: <AdminUserGrades /> },
              { path: 'grades/record', element: <AdminGradeRecord /> },
              { path: 'periods', element: <AdminPeriods /> },
              { path: 'reenrolments', element: <AdminReEnrolments /> },
              // { path: 'transcripts', element: <AdminTranscripts /> }, // Temporalmente oculto
              { path: 'sync', element: <AdminSync /> },
              { path: 'audit', element: <AdminAudit /> },
            ],
          },
        ],
      },
    ],
  },

  // 404
  { path: '*', element: <NotFoundPage /> },
];

export default routes;
