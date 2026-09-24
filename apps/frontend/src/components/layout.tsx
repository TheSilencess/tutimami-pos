import { ReactNode, useEffect, useState, ComponentType } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  BarChart3,
  Tags,
  ShieldCheck,
  Printer,
  Settings,
  Menu,
  X,
  LogOut,
  Bell,
  Moon,
  Sun,
} from 'lucide-react';
import { api, setToken } from '../lib/api';
import { User } from '../types';

const groups: {
  title: string;
  items: Array<[string, string, ComponentType<{ size?: number }>, string]>;
}[] = [
  {
    title: 'Principal',
    items: [
      ['/dashboard', 'Dashboard', LayoutDashboard, 'dashboard.view'],
      ['/sales/new', 'Punto de venta', ShoppingCart, 'sales.create'],
      ['/sales', 'Ventas', BarChart3, 'sales.view'],
    ],
  },
  {
    title: 'Catálogo',
    items: [
      ['/products', 'Productos', Package, 'products.view'],
      ['/categories', 'Categorías', Tags, 'categories.view'],
      ['/inventory', 'Inventario', Boxes, 'inventory.view'],
      ['/customers', 'Clientes', Users, 'customers.view'],
    ],
  },
  {
    title: 'Administración',
    items: [
      ['/reports', 'Reportes', BarChart3, 'reports.view'],
      ['/users', 'Usuarios', ShieldCheck, 'users.view'],
      ['/printing', 'Impresión', Printer, 'receipts.print'],
      ['/audit', 'Auditoría', ShieldCheck, 'audit.view'],
      ['/settings', 'Configuración', Settings, 'settings.view'],
    ],
  },
];

function getInitialTheme() {
  const saved = localStorage.getItem('tutimami_theme');

  if (saved === 'dark' || saved === 'light') {
    return saved;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function AppShell({
  children,
  user,
}: {
  children?: ReactNode;
  user: User | null;
}) {
  const [mobile, setMobile] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('tutimami_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setToken(null);
      navigate('/login');
    }
  };

  const permissions = user?.permissions || [];
  const isAdmin = user?.roles?.some((item) => item.role.name === 'ADMIN') ?? false;

  // El cajero ve exclusivamente: Punto de venta, Productos y Reportes.
  // Admin conserva acceso completo independientemente de la lista de permisos.
  const cashierNavigation = new Set(['/sales/new', '/products', '/reports']);
  const can = (path: string, permission: string) =>
    isAdmin ||
    (cashierNavigation.has(path) && permissions.includes(permission));

  const visibleGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter(([path, , , permission]) => can(path, permission)),
    }))
    .filter((group) => group.items.length > 0);

  const current = visibleGroups
    .flatMap((group) => group.items)
    .find(
      ([path]) =>
        location.pathname === path ||
        (path !== '/dashboard' && location.pathname.startsWith(path)),
    );

  return (
    <div className="app-shell">
      {mobile && (
        <div
          className="mobile-overlay"
          onClick={() => setMobile(false)}
        />
      )}

      <aside className={`sidebar ${mobile ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">TM</div>

          <div>
            <strong>TutiMami</strong>
            <small>POINT OF SALE</small>
          </div>

          <button
            className="mobile-close"
            type="button"
            onClick={() => setMobile(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="nav-scroll">
          {visibleGroups.map((group) => (
            <div className="nav-group" key={group.title}>
              <div className="nav-label">{group.title}</div>

              {group.items.map(([path, label, Icon]) => (
                <NavLink
                  key={path}
                  to={path}
                  onClick={() => setMobile(false)}
                  className={({ isActive }) =>
                    `nav-item ${
                      isActive ||
                      (path !== '/dashboard' &&
                        location.pathname.startsWith(path))
                        ? 'active'
                        : ''
                    }`
                  }
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </div>

        <div className="sidebar-bottom">
          <div className="user-mini">
            <div className="avatar">
              {(user?.name || 'U').slice(0, 1).toUpperCase()}
            </div>

            <div>
              <strong>{user?.name || 'Usuario'}</strong>
              <small>
                {user?.roles?.[0]?.role.name || 'Usuario'}
              </small>
            </div>
          </div>

          <button
            className="logout"
            type="button"
            onClick={logout}
            title="Cerrar sesión"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu icon-btn"
            type="button"
            onClick={() => setMobile(true)}
          >
            <Menu size={21} />
          </button>

          <div className="crumb">
            <span>{current?.[1] || 'Dashboard'}</span>
            <small>
              TutiMami / {current?.[1] || 'Dashboard'}
            </small>
          </div>

          <div className="top-actions">
            <button
              className="icon-btn theme-toggle"
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              aria-label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              className="icon-btn"
              type="button"
              title="Notificaciones"
              aria-label="Notificaciones"
            >
              <Bell size={19} />
              <i />
            </button>

            <div className="top-user">
              <div className="avatar avatar-sm">
                {(user?.name || 'U').slice(0, 1).toUpperCase()}
              </div>
              <span>{user?.name || 'Usuario'}</span>
            </div>
          </div>
        </header>

        <div className="page-content">{children || <Outlet />}</div>
      </main>
    </div>
  );
}
