// Sidebar component
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib';
import { useAuth } from '@/context';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  RefreshCw,
  Users,
  Calendar,
  Database,
  FileSearch,
  GraduationCap,
  X,
  UserSearch,
} from 'lucide-react';
import type { RoleCode } from '@/types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: RoleCode[];
}

const navItems: NavItem[] = [
  // Student
  {
    label: 'Dashboard',
    href: '/student',
    icon: LayoutDashboard,
    roles: ['STUDENT'],
  },
  {
    label: 'Mis Cursos',
    href: '/student/courses',
    icon: BookOpen,
    roles: ['STUDENT'],
  },
  {
    label: 'Calificaciones',
    href: '/student/grades',
    icon: ClipboardList,
    roles: ['STUDENT'],
  },
  {
    label: 'Reinscripción',
    href: '/student/reenrolment',
    icon: RefreshCw,
    roles: ['STUDENT'],
  },
  // Temporalmente oculto
  // {
  //   label: 'Constancias',
  //   href: '/student/transcripts',
  //   icon: FileText,
  //   roles: ['STUDENT'],
  // },

  // Teacher
  {
    label: 'Dashboard',
    href: '/teacher',
    icon: LayoutDashboard,
    roles: ['TEACHER'],
  },
  {
    label: 'Mis Cursos',
    href: '/teacher/courses',
    icon: BookOpen,
    roles: ['TEACHER'],
  },

  // Admin
  {
    label: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    roles: ['ADMIN'],
  },
  {
    label: 'Usuarios',
    href: '/admin/users',
    icon: Users,
    roles: ['ADMIN'],
  },
  {
    label: 'Cursos',
    href: '/admin/courses',
    icon: BookOpen,
    roles: ['ADMIN'],
  },
  {
    label: 'Calificaciones',
    href: '/admin/grades',
    icon: ClipboardList,
    roles: ['ADMIN'],
  },
  {
    label: 'Calif. por Usuario',
    href: '/admin/grades/user',
    icon: UserSearch,
    roles: ['ADMIN'],
  },
  {
    label: 'Períodos',
    href: '/admin/periods',
    icon: Calendar,
    roles: ['ADMIN'],
  },
  {
    label: 'Reinscripciones',
    href: '/admin/reenrolments',
    icon: RefreshCw,
    roles: ['ADMIN'],
  },
  // Temporalmente oculto
  // {
  //   label: 'Constancias',
  //   href: '/admin/transcripts',
  //   icon: FileText,
  //   roles: ['ADMIN'],
  // },
  {
    label: 'Sincronización',
    href: '/admin/sync',
    icon: Database,
    roles: ['ADMIN'],
  },
  {
    label: 'Auditoría',
    href: '/admin/audit',
    icon: FileSearch,
    roles: ['ADMIN'],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { roles, hasAnyRole } = useAuth();

  // Filter items based on user's roles
  const filteredItems = navItems.filter((item) =>
    item.roles.some((role) => roles.includes(role)),
  );

  // Group items by role for multi-role users
  const studentItems = filteredItems.filter((item) =>
    item.roles.includes('STUDENT'),
  );
  const teacherItems = filteredItems.filter((item) =>
    item.roles.includes('TEACHER'),
  );
  const adminItems = filteredItems.filter((item) =>
    item.roles.includes('ADMIN'),
  );

  const renderNavItems = (items: NavItem[], title?: string) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-6">
        {title && (
          <h3 className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {title}
          </h3>
        )}
        <nav className="space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href.split('/').length <= 2}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg mx-2 transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100',
                )
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">MODDLE</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="py-4 overflow-y-auto h-[calc(100%-4rem)]">
          {/* Show sections based on roles */}
          {hasAnyRole(['ADMIN']) &&
            adminItems.length > 0 &&
            renderNavItems(
              adminItems,
              roles.length > 1 ? 'Administración' : undefined,
            )}
          {hasAnyRole(['TEACHER']) &&
            !hasAnyRole(['ADMIN']) &&
            teacherItems.length > 0 &&
            renderNavItems(
              teacherItems,
              roles.length > 1 ? 'Profesor' : undefined,
            )}
          {hasAnyRole(['STUDENT']) &&
            !hasAnyRole(['ADMIN', 'TEACHER']) &&
            studentItems.length > 0 &&
            renderNavItems(
              studentItems,
              roles.length > 1 ? 'Estudiante' : undefined,
            )}

          {/* For users with multiple roles (excluding admin who sees all) */}
          {hasAnyRole(['TEACHER']) &&
            hasAnyRole(['STUDENT']) &&
            !hasAnyRole(['ADMIN']) && (
              <>
                {renderNavItems(teacherItems, 'Profesor')}
                {renderNavItems(studentItems, 'Estudiante')}
              </>
            )}
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
