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
    <div className="flex items-center justify-center min-h-screen bg-gradient-fresh p-4">
      <Card className="w-full max-w-md shadow-lg border-0 bg-white/90">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl font-bold text-white">S</span>
          </div>
          <CardTitle className="text-4xl font-extrabold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
            Shumilog
          </CardTitle>
          <CardDescription className="text-lg text-gray-600">
            Your personal hobby content logger
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <Button onClick={handleLogin} className="w-full text-lg py-6 shadow-soft hover:shadow-lg">
            Login with X
          </Button>
          <p className="text-center text-sm text-gray-500 mt-6">
            Connect with your X account to start logging your hobbies
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
