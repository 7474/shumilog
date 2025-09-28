import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';

export function Header() {
  const { clearAuth } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const res = await api.auth.logout.$post();
      if (res.ok) {
        clearAuth();
        navigate('/login');
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <header className="bg-white/80 backdrop-blur-sm shadow-soft border-b border-primary-100 sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center p-4">
        <Link to="/" className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent hover:from-primary-500 hover:to-secondary-500 transition-all duration-300">
          Shumilog
        </Link>
        <nav className="flex items-center space-x-2">
          <Link to="/logs">
            <Button variant="ghost" className="text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-all duration-200">
              Logs
            </Button>
          </Link>
          <Link to="/tags">
            <Button variant="ghost" className="text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-all duration-200">
              Tags
            </Button>
          </Link>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="border-primary-200 text-primary-700 hover:bg-primary-50 hover:border-primary-300 transition-all duration-200"
          >
            Logout
          </Button>
        </nav>
      </div>
    </header>
  );
}
