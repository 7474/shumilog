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
      <div className="flex items-center justify-center min-h-screen bg-gradient-fresh">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-primary-200 rounded-full mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-fresh p-4">
      <div className="w-full max-w-md animate-slide-up">
        <Card className="shadow-large border-0 bg-white/95">
          <CardHeader className="text-center space-y-6 pb-8">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mb-2 shadow-medium">
              <span className="text-3xl font-bold text-white">S</span>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                Welcome to Shumilog
              </CardTitle>
              <CardDescription className="text-lg text-secondary-600 leading-relaxed">
                Your personal hobby content logger
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-8 sm:px-8">
            <div className="space-y-6">
              <Button 
                onClick={handleLogin} 
                className="w-full sm:w-auto text-base py-6 shadow-gentle hover:shadow-medium px-8 sm:px-12"
                size="lg"
              >
                <span className="mr-2">🐦</span>
                Login with X
              </Button>
              <div className="text-center space-y-2">
                <p className="text-sm text-secondary-500">
                  Connect with your X account to start logging your hobbies
                </p>
                <div className="flex items-center justify-center space-x-2 text-xs text-secondary-400">
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
