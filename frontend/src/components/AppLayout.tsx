import { Outlet } from 'react-router-dom';
import { Header } from '@/components/Header';

export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-fresh">
      <Header />
      <main className="flex-grow animate-fade-in">
        <div className="container mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
