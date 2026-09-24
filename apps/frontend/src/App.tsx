import { ReactNode, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { api, getToken, setToken } from './lib/api';
import { User } from './types';
import { AppShell } from './components/layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Reports from './pages/Reports';
import UsersPage from './pages/Users';
import Categories from './pages/Categories';
import Printing from './pages/Printing';
import Audit from './pages/Audit';
import Settings from './pages/Settings';

function isAdmin(user: User | null) {
  return user?.roles?.some((item) => item.role.name === 'ADMIN') ?? false;
}

function hasPermission(user: User | null, permission: string) {
  return isAdmin(user) || user?.permissions?.includes(permission) === true;
}

function PermissionRoute({
  user,
  permission,
  children,
  fallback = '/sales/new',
}: {
  user: User;
  permission: string;
  children: ReactNode;
  fallback?: string;
}) {
  return hasPermission(user, permission) ? (
    <>{children}</>
  ) : (
    <Navigate to={fallback} replace />
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      const token = getToken();

      if (!token) {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const response = await api.get('/auth/me');
        if (mounted) {
          setUser(response.data);
        }
      } catch {
        setToken(null);
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  // Navigation happens only after React has committed the authenticated user.
  // This prevents the login route from rendering once with user=null and
  // immediately redirecting back to /login before the state update commits.
  useEffect(() => {
    if (!user || location.pathname !== '/login') return;

    const destination = isAdmin(user) ? '/dashboard' : '/sales/new';
    navigate(destination, { replace: true });
  }, [user, location.pathname, navigate]);

  const handleLogin = (nextUser: User) => {
    setUser(nextUser);
  };

  if (loading) {
    return (
      <div className="boot">
        <div className="brand-mark">TM</div>
        <span>Cargando TutiMami POS...</span>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <div className="boot">
              <div className="brand-mark">TM</div>
              <span>Entrando a TutiMami POS...</span>
            </div>
          ) : (
            <Login onLogin={handleLogin} />
          )
        }
      />

      <Route
        element={
          user ? (
            <AppShell user={user} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route
          path="/dashboard"
          element={
            <PermissionRoute user={user!} permission="dashboard.view">
              <Dashboard />
            </PermissionRoute>
          }
        />
        <Route
          path="/sales/new"
          element={
            <PermissionRoute user={user!} permission="sales.create">
              <POS />
            </PermissionRoute>
          }
        />
        <Route
          path="/sales"
          element={
            <PermissionRoute user={user!} permission="sales.view">
              <Sales />
            </PermissionRoute>
          }
        />
        <Route
          path="/products"
          element={
            <PermissionRoute user={user!} permission="products.view">
              <Products />
            </PermissionRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <PermissionRoute user={user!} permission="customers.view">
              <Customers />
            </PermissionRoute>
          }
        />
        <Route
          path="/inventory"
          element={
            <PermissionRoute user={user!} permission="inventory.view">
              <Inventory />
            </PermissionRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <PermissionRoute user={user!} permission="reports.view">
              <Reports />
            </PermissionRoute>
          }
        />
        <Route
          path="/users"
          element={
            <PermissionRoute user={user!} permission="users.view">
              <UsersPage />
            </PermissionRoute>
          }
        />
        <Route
          path="/categories"
          element={
            <PermissionRoute user={user!} permission="categories.view">
              <Categories />
            </PermissionRoute>
          }
        />
        <Route
          path="/printing"
          element={
            <PermissionRoute user={user!} permission="receipts.print">
              <Printing />
            </PermissionRoute>
          }
        />
        <Route
          path="/audit"
          element={
            <PermissionRoute user={user!} permission="audit.view">
              <Audit />
            </PermissionRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PermissionRoute user={user!} permission="settings.view">
              <Settings />
            </PermissionRoute>
          }
        />
        <Route
          path="*"
          element={
            <Navigate
              to={isAdmin(user) ? '/dashboard' : '/sales/new'}
              replace
            />
          }
        />
      </Route>
    </Routes>
  );
}
