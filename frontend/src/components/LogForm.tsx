import { useState, useRef } from 'react';
import { PenLine, Loader2 } from 'lucide-react';
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
import { Log } from '@/api-types';
import { ImageUpload } from './ImageUpload';
import { MarkdownToolbar } from './MarkdownToolbar';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content_md: z.string().min(1, 'Content is required'),
  is_public: z.boolean(),
});

type LogFormValues = z.infer<typeof formSchema>;

interface LogFormProps {
  log?: Log;
  initialContent?: string;
  onSuccess: (logId?: string) => void;
  onCancel?: () => void;
}

export function LogForm({ log, initialContent, onSuccess, onCancel: _onCancel }: LogFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const form = useForm<LogFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: log?.title ?? '',
      content_md: log?.content_md ?? initialContent ?? '',
      is_public: log?.is_public ?? true,
    },
  });

  const handleImagesChange = (files: File[]) => {
    setSelectedImages(files);
  };

  const uploadImages = async (logId: string) => {
    if (selectedImages.length === 0) return;

    setUploadingImages(true);
    try {
      // Use configured API base URL to ensure requests go to the correct backend
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

      for (let i = 0; i < selectedImages.length; i++) {
        const file = selectedImages[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('display_order', i.toString());

        const response = await fetch(`${baseUrl}/logs/${logId}/images`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to upload ${file.name}`);
        }
      }
    } finally {
      setUploadingImages(false);
    }
  };

  const onSubmit = async (values: LogFormValues) => {
    try {
      setError(null);
      setIsSubmitting(true);
      const result = log
        ? await api.PUT('/logs/{logId}', {
            params: { path: { logId: log.id } },
            body: values,
          })
        : await api.POST('/logs', {
            body: values,
          });

      if (result.error || !result.data) {
        throw new Error((result.error as any)?.error || 'Failed to save log');
      }

      const resultLog = result.data;

      // Upload images if needed
      if (selectedImages.length > 0) {
        const logId = log ? log.id : resultLog.id;
        await uploadImages(logId);
      }

      // Pass the log ID to onSuccess (either existing log ID or newly created log ID)
      onSuccess(log ? log.id : resultLog.id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              <div className="space-y-2">
                <FormControl>
                  <Textarea
                    placeholder="趣味の体験を詳しく記録しましょう..."
                    rows={8}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fresh-500 focus:border-transparent transition-all resize-y"
                    {...field}
                    ref={(e) => {
                      field.ref(e);
                      contentTextareaRef.current = e;
                    }}
                  />
                </FormControl>
                <MarkdownToolbar
                  textareaRef={contentTextareaRef}
                  onValueChange={(value) => form.setValue('content_md', value)}
                  getValue={() => form.getValues('content_md')}
                />
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <ImageUpload
          logId={log?.id}
          onImagesChange={handleImagesChange}
          existingImages={log?.images?.map((img) => ({
            id: img.id,
            file_name: img.file_name,
            url: `/api/logs/${log.id}/images/${img.id}`,
          }))}
        />
        <div className="flex gap-3 pt-4">
          <Button type="submit" className="btn-fresh" disabled={isSubmitting || uploadingImages}>
            {isSubmitting || uploadingImages ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                {uploadingImages ? '画像をアップロード中...' : log ? '更新中...' : '作成中...'}
              </>
            ) : log ? (
              <>
                <PenLine size={16} className="mr-2" />
                ログを更新
              </>
            ) : (
              <>
                <PenLine size={16} className="mr-2" />
                ログを作成
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
