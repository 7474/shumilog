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
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto flex justify-between items-center p-4">
        <Link to="/" className="text-xl font-bold">
          Shumilog
        </Link>
        <nav className="flex items-center space-x-4">
          <Link to="/logs">
            <Button variant="ghost">Logs</Button>
          </Link>
          <Link to="/tags">
            <Button variant="ghost">Tags</Button>
          </Link>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </nav>
      </div>
    </header>
  );
}
