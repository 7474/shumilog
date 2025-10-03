import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tag } from '@/models';

const formSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(200, 'Tag name must be 200 characters or fewer'),
  description: z.string().optional(),
});

type TagFormValues = z.infer<typeof formSchema>;

interface TagFormProps {
  tag?: Tag;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function TagForm({ tag, onSuccess, onCancel }: TagFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoadingSupport, setIsLoadingSupport] = useState(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  
  const form = useForm<TagFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: tag?.name ?? '',
      description: tag?.description ?? '',
    },
  });

  const onSubmit = async (values: TagFormValues) => {
    try {
      setError(null);
      const response = tag
        ? await api.tags[':id'].$put({ param: { id: tag.id }, json: values })
        : await api.tags.$post({ json: values });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save tag');
      }
      onSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    }
  };

  const handleGetSupport = async () => {
    const tagName = form.getValues('name');
    
    if (!tagName || tagName.trim().length === 0) {
      setError('タグ名を入力してからサポート機能を使用してください');
      return;
    }

    try {
      setError(null);
      setIsLoadingSupport(true);

      const response = await api.support.tags.$post({
        json: {
          tag_name: tagName,
          support_type: 'wikipedia_summary'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'サポート情報の取得に失敗しました');
      }

      const data = await response.json();
      const currentDescription = form.getValues('description') || '';
      const textarea = descriptionRef.current;
      
      let newDescription: string;
      
      if (textarea && textarea === document.activeElement) {
        // Textarea has focus - insert at cursor position
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        newDescription = 
          currentDescription.substring(0, start) + 
          data.content + 
          currentDescription.substring(end);
        
        // Set the new value
        form.setValue('description', newDescription);
        
        // Set cursor position after inserted content
        setTimeout(() => {
          const newCursorPos = start + data.content.length;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          textarea.focus();
        }, 0);
      } else {
        // No focus on textarea - append with blank line
        if (currentDescription.trim().length > 0) {
          newDescription = currentDescription + '\n\n' + data.content;
        } else {
          newDescription = data.content;
        }
        form.setValue('description', newDescription);
        
        // Set cursor to end
        setTimeout(() => {
          if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(newDescription.length, newDescription.length);
          }
        }, 0);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'サポート情報の取得に失敗しました';
      setError(errorMessage);
    } finally {
      setIsLoadingSupport(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <span className="text-red-500 text-xl">⚠️</span>
            <p className="text-red-700 text-sm flex-1">{error}</p>
          </div>
        )}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-sm font-semibold text-gray-700">🏷️ タグ名</FormLabel>
              <FormControl>
                <Input 
                  placeholder="タグ名を入力してください..." 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-colors bg-white shadow-sm"
                  {...field} 
                />
              </FormControl>
              <FormMessage className="text-sm text-red-600" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel className="text-sm font-semibold text-gray-700">📝 説明（任意）</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGetSupport}
                  disabled={isLoadingSupport}
                  className="text-xs px-3 py-1 h-7 border-sky-200 text-sky-600 hover:bg-sky-50"
                >
                  {isLoadingSupport ? (
                    <>
                      <span className="animate-spin mr-1">⏳</span>
                      取得中...
                    </>
                  ) : (
                    <>
                      💡 Wikipedia要約
                    </>
                  )}
                </Button>
              </div>
              <FormControl>
                <Textarea 
                  ref={descriptionRef}
                  placeholder="このタグが表すものを説明してください..." 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-colors bg-white shadow-sm min-h-[100px] resize-y"
                  {...field} 
                />
              </FormControl>
              <FormMessage className="text-sm text-red-600" />
            </FormItem>
          )}
        />
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button 
            type="submit" 
            className="btn-fresh flex-1 sm:flex-none px-6 py-2.5"
          >
            {tag ? '✏️ タグを更新' : '✨ タグを作成'}
          </Button>
          {onCancel && (
            <Button 
              type="button" 
              onClick={onCancel}
              variant="outline"
              className="flex-1 sm:flex-none px-6 py-2.5 border-gray-300 hover:bg-gray-50"
            >
              ✕ キャンセル
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}