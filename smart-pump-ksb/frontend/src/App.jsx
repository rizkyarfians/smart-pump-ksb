import { Navigate, Route, Routes } from 'react-router-dom';

import ProtectedRoute from './components/auth/ProtectedRoute';

import DashboardLayout from './layouts/DashboardLayout';

import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ModbusSettings from './pages/ModbusSettings';
import DataLogging from './pages/DataLogging';  
import PumpDetails from './pages/PumpDetails';
import LiveView from './pages/LiveView';
import AdminUsers from './pages/AdminUsers';
import CameraSettings from './pages/CameraSettings';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        
        <Route index element={<Dashboard />} />
        <Route path="live-view" element={<LiveView />} />
        <Route path="settings/modbus" element={<ModbusSettings />} />
        <Route path="settings/camera" element={<CameraSettings />} />
<Route path="data-logging" element={<DataLogging />} />
      <Route path="pump-details" element={<PumpDetails />} />
      <Route path="admin/users" element={<AdminUsers />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}