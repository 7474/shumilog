import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Log } from '@/models';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content_md: z.string().min(1, 'Content is required'),
});

type LogFormValues = z.infer<typeof formSchema>;

interface LogFormProps {
  log?: Log;
  initialContent?: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function LogForm({ log, initialContent, onSuccess, onCancel }: LogFormProps) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LogFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: log?.title ?? '',
      content_md: log?.content_md ?? initialContent ?? '',
    },
  });

  const onSubmit = async (values: LogFormValues) => {
    try {
      setError(null);
      const response = log
        ? await api.logs[':id'].$put({ param: { id: log.id }, json: values })
        : await api.logs.$post({ json: values });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save log');
      }
      onSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700 font-semibold">タイトル</FormLabel>
              <FormControl>
                <Input 
                  placeholder="ログのタイトルを入力してください..." 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fresh-500 focus:border-transparent transition-all"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="content_md"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700 font-semibold">内容</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="趣味の体験を詳しく記録しましょう..."
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fresh-500 focus:border-transparent transition-all resize-y"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-3 pt-2">
          <Button 
            type="submit"
            className="btn-fresh"
          >
            {log ? '✏️ ログを更新' : '✨ ログを作成'}
          </Button>
          {onCancel && (
            <Button 
              type="button" 
              onClick={onCancel}
              variant="outline"
              className="border-gray-300 hover:bg-gray-50"
            >
              ✕ キャンセル
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
