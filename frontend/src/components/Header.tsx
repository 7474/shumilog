import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';

export function Header() {
  const { isAuthenticated, clearAuth } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const res = await api.auth.logout.$post();
      if (res.ok) {
        clearAuth();
        navigate('/');
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <header className="mobile-header">
      <div className="container-mobile py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 text-decoration-none">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fresh-400 to-sky-500 flex items-center justify-center shadow-lg p-1.5">
              <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M9 8 C9 7.5 9.5 7 10 7 L22 7 C22.5 7 23 7.5 23 8 L23 24 C23 24.5 22.5 25 22 25 L10 25 C9.5 25 9 24.5 9 24 Z" fill="white" opacity="0.95"/>
                <line x1="12" y1="11" x2="20" y2="11" stroke="#0ea5e9" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="12" y1="14" x2="20" y2="14" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="12" y1="17" x2="18" y2="17" stroke="#0ea5e9" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="12" y1="20" x2="17" y2="20" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M20 7 L20 13 L18 11.5 L16 13 L16 7 Z" fill="#06aedd" opacity="0.8"/>
              </svg>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-gray-900">Shumilog</h1>
              <p className="text-sm text-gray-600">Your hobby logger</p>
            </div>
          </Link>
          
          <nav className="flex items-center space-x-2">
            <Link to="/logs">
              <Button variant="ghost" size="sm" className="text-gray-700 hover:text-fresh-600">
                <span className="hidden sm:inline">Logs</span>
                <span className="sm:hidden">📝</span>
              </Button>
            </Link>
            <Link to="/tags">
              <Button variant="ghost" size="sm" className="text-gray-700 hover:text-sky-600">
                <span className="hidden sm:inline">Tags</span>
                <span className="sm:hidden">🏷️</span>
              </Button>
            </Link>
            {isAuthenticated ? (
              <Button 
                onClick={handleLogout}
                variant="outline" 
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">🚪</span>
              </Button>
            ) : (
              <Link to="/login">
                <Button className="btn-fresh">
                  <span className="hidden sm:inline">Login</span>
                  <span className="sm:hidden">🔑</span>
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}