// Sidebar component
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib';
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
  ChevronRight,
  FileText,
  TableIcon,
} from 'lucide-react';
import type { RoleCode } from '@/types';

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
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    // Auto-expand if we're on a child route
    '/admin/grades': location.pathname.startsWith('/admin/grades'),
  });

  // Detectar dashboard actual basado en la ruta
  const getCurrentDashboard = (): RoleCode | null => {
    if (location.pathname.startsWith('/admin')) return 'ADMIN';
    if (location.pathname.startsWith('/teacher')) return 'TEACHER';
    if (location.pathname.startsWith('/student')) return 'STUDENT';
    return null;
  };

  const currentDashboard = getCurrentDashboard();

  // Filtrar items según el dashboard actual (no según todos los roles)
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
    return item.children.some((child) => location.pathname === child.href);
  };

  const renderNavItem = (item: NavItem) => {
    // If item has children, render as collapsible
    if (item.children && item.children.length > 0) {
      const isExpanded = expandedMenus[item.href] || isChildActive(item);
      const hasActiveChild = isChildActive(item);

      return (
        <div key={item.href}>
          <button
            onClick={() => toggleMenu(item.href)}
            className={cn(
              'flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium rounded-lg mx-2 transition-colors',
              hasActiveChild
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100',
            )}
            style={{ width: 'calc(100% - 1rem)' }}
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {item.label}
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {item.children.map((child) => (
                <NavLink
                  key={child.href}
                  to={child.href}
                  end
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg mx-2 transition-colors',
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100',
                    )
                  }
                >
                  <child.icon className="h-4 w-4 flex-shrink-0" />
                  {child.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Regular nav item without children
    return (
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
    );
  };

  const renderNavItems = (items: NavItem[], title?: string) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-6">
        {title && (
          <h3 className="px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {title}
          </h3>
        )}
        <nav className="space-y-1">{items.map(renderNavItem)}</nav>
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
            <span className="text-xl font-bold text-gray-900">
              KNOROOMS EDU
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation - Solo muestra items del dashboard actual */}
        <div className="py-4 overflow-y-auto h-[calc(100%-4rem)]">
          {renderNavItems(currentItems)}
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
