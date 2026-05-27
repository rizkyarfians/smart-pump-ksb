import { Outlet } from 'react-router-dom';

import Header from '../components/dashboard/Header';

export default function DashboardLayout() {
  return (
    <div className="flex h-screen min-h-0 flex-col bg-slate-100">
      <Header />

      <main className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}