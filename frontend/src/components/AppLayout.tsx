import { Outlet } from 'react-router-dom';
import { Header } from '@/components/Header';

export function AppLayout() {
  return (
    <div className="app-container">
      <Header />
      <main className="container-mobile py-6 space-y-8">
        <Outlet />
      </main>
    </div>
  );
}
