import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

export function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();

  const handleLogin = () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    window.location.href = `${baseUrl}/api/auth/twitter`;
  };

  if (isLoading) {
    return (
      <div>
        <div>
          <div></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div>
      <div>
        <Card>
          <CardHeader>
            <div>
              <span>S</span>
            </div>
            <div>
              <CardTitle>
                Welcome to Shumilog
              </CardTitle>
              <CardDescription>
                Your personal hobby content logger
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div>
              <Button onClick={handleLogin}>
                <span>🐦</span>
                Login with X
              </Button>
              <div>
                <p>
                  Connect with your X account to start logging your hobbies
                </p>
                <div>
                  <span>📝 Log experiences</span>
                  <span>•</span>
                  <span>🏷️ Organize with tags</span>
                  <span>•</span>
                  <span>📱 Mobile-friendly</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
