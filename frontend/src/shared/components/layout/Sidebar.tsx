// Sidebar component
import { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers';
import { cn } from '@/shared/lib';
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
  ChevronDown,
  FileText,
  TableIcon,
  Settings,
  UserRound,
  BookMarked,
  UserCog,
} from 'lucide-react';
import type { RoleCode } from '@/shared/types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: RoleCode[];
  children?: NavItem[];
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
    label: 'Estudiante Usuario',
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
    children: [
      {
        label: 'Por Período',
        href: '/admin/grades',
        icon: ClipboardList,
        roles: ['ADMIN'],
      },
      {
        label: 'Por Usuario',
        href: '/admin/grades/user',
        icon: UserSearch,
        roles: ['ADMIN'],
      },
      {
        label: 'Record de Notas',
        href: '/admin/grades/record',
        icon: FileText,
        roles: ['ADMIN'],
      },
      {
        label: 'Resumen',
        href: '/admin/grades/summary',
        icon: TableIcon,
        roles: ['ADMIN'],
      },
    ],
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
  {
    label: 'Configuración',
    href: '/admin/settings',
    icon: Settings,
    roles: ['ADMIN'],
    children: [
      {
        label: 'Profesores',
        href: '/admin/settings/profesores',
        icon: UserRound,
        roles: ['ADMIN'],
      },
      {
        label: 'Estudiantes',
        href: '/admin/settings/estudiantes',
        icon: Users,
        roles: ['ADMIN'],
      },

      {
        label: 'Usuarios',
        href: '/admin/settings/usuarios',
        icon: UserCog,
        roles: ['ADMIN'],
      },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { roles } = useAuth();

  const defaultRoute = roles.includes('ADMIN')
    ? '/admin'
    : roles.includes('TEACHER')
      ? '/teacher'
      : '/student';

  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    '/admin/grades': location.pathname.startsWith('/admin/grades'),
    '/admin/settings': location.pathname.startsWith('/admin/settings'),
  });

  const getCurrentDashboard = (): RoleCode | null => {
    if (location.pathname.startsWith('/admin')) return 'ADMIN';
    if (location.pathname.startsWith('/teacher')) return 'TEACHER';
    if (location.pathname.startsWith('/student')) return 'STUDENT';
    return null;
  };

  const currentDashboard = getCurrentDashboard();

  const currentItems = navItems.filter((item) =>
    currentDashboard ? item.roles.includes(currentDashboard) : false,
  );

  const toggleMenu = (href: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [href]: !prev[href],
    }));
  };

  const isChildActive = (item: NavItem): boolean => {
    if (!item.children) return false;
    return item.children.some((child) =>
      location.pathname === child.href || location.pathname.startsWith(child.href + '/')
    );
  };

  const renderNavItem = (item: NavItem) => {
    if (item.children && item.children.length > 0) {
      const isExpanded = expandedMenus[item.href] || isChildActive(item);
      const hasActiveChild = isChildActive(item);

      return (
        <div key={item.href} className="mb-[1px]">
          <button
            onClick={() => toggleMenu(item.href)}
            className={cn(
              'group flex items-center justify-between gap-[10px] p-[8px_10px] rounded-lg text-[13.5px] font-medium text-gray-600 cursor-pointer transition-colors w-full text-left hover:bg-violet-50 hover:text-violet-700',
              hasActiveChild ? 'bg-violet-100 text-violet-700 font-semibold' : '',
            )}
          >
            <span className={cn("flex items-center justify-center w-[30px] h-[30px] rounded-[7px] transition-colors shrink-0", hasActiveChild ? 'bg-violet-200' : 'bg-transparent group-hover:bg-violet-200')}>
              <item.icon className="h-[18px] w-[18px]" />
            </span>
            <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
            <ChevronDown
              className={cn(
                'shrink-0 text-gray-400 h-4 w-4 transition-transform duration-200',
                isExpanded ? 'rotate-0' : '-rotate-90',
              )}
            />
          </button>

          <div
            className={cn(
              'overflow-hidden transition-all duration-200',
              isExpanded ? 'max-h-[300px] opacity-100 mt-[2px] pb-[4px]' : 'max-h-0 opacity-0 pointer-events-none',
            )}
          >
            {item.children.map((child) => (
              <NavLink
                key={child.href}
                to={child.href}
                end
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-[8px] p-[7px_10px_7px_40px] rounded-[7px] text-[13px] font-medium transition-colors relative',
                    isActive ? 'bg-violet-100 text-violet-700 font-semibold' : 'text-gray-500 hover:bg-violet-50 hover:text-violet-600',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={cn("flex items-center justify-center w-[22px] h-[22px] rounded-[5px] shrink-0 transition-opacity", isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100')}>
                      <child.icon className="h-[15px] w-[15px]" />
                    </span>
                    <span className="flex-1">{child.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      );
    }

    return (
      <NavLink
        key={item.href}
        to={item.href}
        end={item.href.split('/').length <= 2}
        onClick={onClose}
        className={({ isActive }) =>
          cn('group flex items-center gap-[10px] p-[8px_10px] rounded-lg text-[13.5px] font-medium transition-colors w-full relative', isActive ? 'bg-violet-100 text-violet-700 font-semibold' : 'text-gray-600 hover:bg-violet-50 hover:text-violet-700')
        }
      >
        {({ isActive }) => (
          <>
            <span className={cn("flex items-center justify-center w-[30px] h-[30px] rounded-[7px] transition-colors shrink-0", isActive ? 'bg-violet-200' : 'bg-transparent group-hover:bg-violet-200')}>
              <item.icon className="h-[18px] w-[18px]" />
            </span>
            <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
          </>
        )}
      </NavLink>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-full w-[240px] bg-white flex flex-col',
          'border-r border-gray-100 shadow-[2px_0_20px_rgba(0,0,0,0.06)]',
          'transform transition-transform duration-250 ease-in-out',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-[60px] px-5 border-b border-gray-100 shrink-0">
          <Link
            to={defaultRoute}
            onClick={onClose}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 shadow-md shadow-violet-200">
              <GraduationCap className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-[15px] font-bold text-gray-900 tracking-tight">
              KNOROOMS
            </span>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden flex items-center justify-center h-7 w-7 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {currentItems.map(renderNavItem)}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-100 px-4 py-3">
          <p className="text-[10px] text-gray-300 font-medium tracking-wider uppercase">
            Knorooms EDU v1.0
          </p>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
