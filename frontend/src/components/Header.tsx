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
    <header>
      <div>
        <Link to="/">
          <div>
            <span>S</span>
          </div>
          <div>
            <h1>Shumilog</h1>
            <p>Your hobby logger</p>
          </div>
        </Link>
        
        <nav>
          {isAuthenticated ? (
            <div>
              <Link to="/logs">
                <Button>Logs</Button>
              </Link>
              <Link to="/tags">
                <Button>Tags</Button>
              </Link>
              <Button onClick={handleLogout}>
                Logout
              </Button>
            </div>
          ) : (
            <Link to="/login">
              <Button>Login</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}