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
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fresh-400 to-sky-500 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-gray-900">Shumilog</h1>
              <p className="text-sm text-gray-600">Your hobby logger</p>
            </div>
          </Link>
          
          <nav className="flex items-center space-x-2">
            {isAuthenticated ? (
              <div className="flex items-center space-x-2">
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
                <Button 
                  onClick={handleLogout}
                  variant="outline" 
                  size="sm"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <span className="hidden sm:inline">Logout</span>
                  <span className="sm:hidden">🚪</span>
                </Button>
              </div>
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