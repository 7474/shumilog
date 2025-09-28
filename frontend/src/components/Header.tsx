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
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto flex justify-between items-center p-4">
        <Link to="/" className="text-2xl font-bold text-gray-800">
          Shumilog
        </Link>
        <nav className="flex items-center space-x-2">
          <Link to="/logs">
            <Button variant="ghost" className="text-gray-600 hover:bg-gray-100">
              Logs
            </Button>
          </Link>
          <Link to="/tags">
            <Button variant="ghost" className="text-gray-600 hover:bg-gray-100">
              Tags
            </Button>
          </Link>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Logout
          </Button>
        </nav>
      </div>
    </header>
  );
}
