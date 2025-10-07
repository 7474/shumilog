import { Navigate } from 'react-router-dom';
import { Twitter, FileText, Tag, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

export function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();

  const handleLogin = () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    window.location.href = `${baseUrl}/api/auth/twitter`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fresh-500"></div>
        <p className="text-gray-600">認証情報を確認中...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md px-4">
        <Card className="card-fresh">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-fresh-400 to-sky-500 flex items-center justify-center shadow-lg mx-auto">
              <span className="text-white font-bold text-2xl">S</span>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold text-gray-900">Shumilogへようこそ</CardTitle>
              <CardDescription className="text-gray-600">
                あなた専用の趣味ログサービス
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <Button onClick={handleLogin} className="btn-fresh w-full py-3 text-base font-medium">
                <Twitter className="mr-2" size={18} />X (Twitter) でログイン
              </Button>

              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Xアカウントで簡単ログイン、趣味活動を記録しましょう
                </p>
                <div className="flex flex-col space-y-2 text-xs text-gray-500">
                  <span className="flex items-center justify-center space-x-2">
                    <FileText size={14} />
                    <span>体験を記録</span>
                  </span>
                  <span className="flex items-center justify-center space-x-2">
                    <Tag size={14} />
                    <span>タグで整理</span>
                  </span>
                  <span className="flex items-center justify-center space-x-2">
                    <Smartphone size={14} />
                    <span>モバイル対応</span>
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
