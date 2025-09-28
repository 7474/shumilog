import { Outlet } from 'react-router-dom';
import { Header } from '@/components/Header';

export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-fresh">
      <Header />
      <main className="flex-grow">
        <Outlet />
      </main>
    </div>
  );
}
