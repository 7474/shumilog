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
    window.location.href = `${baseUrl}/auth/twitter`;
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-extrabold">Shumilog</CardTitle>
          <CardDescription>
            Your personal hobby content logger.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Button onClick={handleLogin} className="w-full text-lg py-6">
            Login with X
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
