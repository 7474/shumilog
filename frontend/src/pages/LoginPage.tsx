import { Button } from '@/components/ui/button';

export function LoginPage() {
  const handleLogin = () => {
    // Redirect to the backend's Twitter authentication endpoint
    window.location.href = '/api/auth/twitter';
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Welcome to Shumilog</h1>
        <p className="mb-6">Please log in to continue.</p>
        <Button onClick={handleLogin}>
          Login with Twitter
        </Button>
      </div>
    </div>
  );
}
