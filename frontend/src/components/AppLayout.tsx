import { Outlet, ScrollRestoration } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export function AppLayout() {
  return (
    <div className="app-container flex flex-col min-h-screen">
      <Header />
      <main className="container-mobile py-4 sm:py-6 space-y-6 flex-1">
        <Outlet />
      </main>
      <Footer />
      <ScrollRestoration />
    </div>
  );
}
