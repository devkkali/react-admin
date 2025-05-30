import type { ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RolesPermissions from './pages/RolesPermissions';
import UserRoles from './pages/UserRoles';
import PMDashboard from './pages/PMDashboard';

type PrivateRouteProps = { children: ReactNode };
function PrivateRoute({ children }: PrivateRouteProps) {
  return localStorage.getItem('token')
    ? <>{children}</>
    : <Navigate to="/" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/roles-permissions"
        element={
          <PrivateRoute>
            <RolesPermissions />
          </PrivateRoute>
        }
      />
      <Route
        path="/users/:id/roles"
        element={
          <PrivateRoute>
            <UserRoles />
          </PrivateRoute>
        }
      />
      {/* pm-manager */}
      <Route
        path="/pm-dashboard"
        element={
          <PrivateRoute>
            <PMDashboard />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
