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
    return <div>Loading...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Shumilog</CardTitle>
          <CardDescription>Please log in to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleLogin} className="w-full">
            Login with X
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
