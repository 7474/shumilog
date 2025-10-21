import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, X } from 'lucide-react';
import { api } from '@/services/api';
import { User } from '@/api-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOgp } from '@/hooks/useOgp';

export function ProfileEditPage() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError, response } = await api.GET('/users/me', {});
      if (fetchError || !data) {
        if (response?.status === 401) {
          navigate('/login');
          return;
        }
        throw new Error('ユーザー情報の取得に失敗しました');
      }
      setUser(data);
      setDisplayName(data.display_name);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!displayName.trim()) {
      setError('表示名を入力してください');
      return;
    }

    if (displayName.length > 100) {
      setError('表示名は100文字以内で入力してください');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const { data, error: updateError, response } = await api.PUT('/users/me', {
        body: {
          display_name: displayName
        }
      });
      
      if (updateError || !data) {
        if (response?.status === 401) {
          navigate('/login');
          return;
        }
        throw new Error('プロフィールの更新に失敗しました');
      }

      // 更新成功後、マイログページに戻る
      navigate('/my/logs');
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  // OGPメタデータの設定
  useOgp({
    title: 'プロフィール編集',
    description: 'プロフィール情報を編集',
    url: window.location.href,
    type: 'website',
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fresh-500"></div>
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4 text-center">
        <X size={48} className="text-red-500" />
        <h2 className="text-xl font-bold text-red-600">エラーが発生しました</h2>
        <p className="text-gray-600">{error || 'ユーザー情報を取得できませんでした'}</p>
        <Button onClick={() => navigate('/my/logs')} variant="outline">
          マイログに戻る
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">プロフィール編集</h1>
          <p className="text-gray-600 mt-1">表示名を変更できます</p>
        </div>
      </div>

      {/* エラーメッセージ */}
      {error && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* プロフィール編集フォーム */}
      <Card className="card-fresh">
        <CardHeader>
          <CardTitle>ユーザー情報</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Twitter ユーザー名（読み取り専用） */}
            <div className="space-y-2">
              <Label htmlFor="twitter_username">X (Twitter) ユーザー名</Label>
              <Input
                id="twitter_username"
                type="text"
                value={user.twitter_username || ''}
                disabled
                className="bg-gray-100 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500">Xアカウントに紐づいています（変更不可）</p>
            </div>

            {/* 表示名 */}
            <div className="space-y-2">
              <Label htmlFor="display_name">
                表示名 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="display_name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="表示名を入力"
                maxLength={100}
                required
              />
              <p className="text-xs text-gray-500">
                {displayName.length}/100文字
              </p>
            </div>

            {/* アバター画像（読み取り専用） */}
            {user.avatar_url && (
              <div className="space-y-2">
                <Label>プロフィール画像</Label>
                <div className="flex items-center space-x-4">
                  <img
                    src={user.avatar_url}
                    alt={user.display_name}
                    className="w-16 h-16 rounded-full"
                  />
                  <p className="text-xs text-gray-500">Xアカウントのプロフィール画像が使用されます</p>
                </div>
              </div>
            )}

            {/* ボタン */}
            <div className="flex gap-3">
              <Button
                type="submit"
                className="btn-fresh"
                disabled={saving || displayName === user.display_name}
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    保存中...
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    保存
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/my/logs')}
                disabled={saving}
              >
                <X size={16} className="mr-2" />
                キャンセル
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
