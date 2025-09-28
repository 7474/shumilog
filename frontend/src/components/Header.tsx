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
    <header className="bg-white/90 backdrop-blur-md shadow-soft border-b border-primary-100/60 sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center py-3 px-4 sm:py-4">
        <Link 
          to="/" 
          className="flex items-center space-x-2 group"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-soft group-hover:shadow-medium transition-all duration-200">
            <span className="text-lg font-bold text-white">S</span>
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent group-hover:from-primary-500 group-hover:to-primary-600 transition-all duration-200 hidden sm:block">
            Shumilog
          </span>
        </Link>
        
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link to="/logs">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-secondary-700 hover:bg-primary-50 hover:text-primary-700 transition-all duration-200 min-w-[44px] h-[44px] px-3 sm:px-4"
            >
              <span className="hidden sm:inline">Logs</span>
              <span className="sm:hidden">📝</span>
            </Button>
          </Link>
          <Link to="/tags">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-secondary-700 hover:bg-primary-50 hover:text-primary-700 transition-all duration-200 min-w-[44px] h-[44px] px-3 sm:px-4"
            >
              <span className="hidden sm:inline">Tags</span>
              <span className="sm:hidden">🏷️</span>
            </Button>
          </Link>
          
          {isAuthenticated ? (
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="border-primary-200 text-primary-700 hover:bg-primary-50 hover:border-primary-300 transition-all duration-200 min-w-[44px] h-[44px] px-3 sm:px-4 ml-2"
            >
              <span className="hidden sm:inline">Logout</span>
              <span className="sm:hidden">🚪</span>
            </Button>
          ) : (
            <Link to="/login">
              <Button
                variant="default"
                size="sm"
                className="bg-primary-600 hover:bg-primary-700 text-white transition-all duration-200 min-w-[44px] h-[44px] px-3 sm:px-4 ml-2 shadow-gentle hover:shadow-medium"
              >
                <span className="hidden sm:inline">Login</span>
                <span className="sm:hidden">🔑</span>
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
