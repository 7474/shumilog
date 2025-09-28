import { useState } from 'react';
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
}

export function TagForm({ tag, onSuccess }: TagFormProps) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<TagFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: tag?.name ?? '',
      description: tag?.description ?? '',
    },
  });

  const onSubmit = async (values: TagFormValues) => {
    try {
      // Clean up the payload - remove empty optional fields
      const payload: any = {
        name: values.name,
      };
      
      if (values.description && values.description.trim()) {
        payload.description = values.description.trim();
      }

      const response = tag
        ? await api.tags[":id"].$put({ param: { id: tag.id }, json: payload })
        : await api.tags.$post({ json: payload });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save tag');
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-primary-700 font-semibold">Tag Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter a descriptive tag name..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-primary-700 font-semibold">Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Optional description for this tag... Use #{tagName} or #tagName to create associations with related tags."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <div className="text-sm text-gray-600 mt-1">
                <p>💡 <strong>Tip:</strong> Use hashtag patterns like <code className="bg-gray-100 px-1 rounded">#anime</code>, <code className="bg-gray-100 px-1 rounded">#gaming</code>, or <code className="bg-gray-100 px-1 rounded">#ゲーム</code> to automatically create associations with related tags.</p>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}
        <Button type="submit" className="w-full md:w-auto">
          {tag ? 'Update Tag' : 'Create Tag'}
        </Button>
      </form>
    </Form>
  );
}
