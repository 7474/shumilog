import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tag } from '@/models';

const formSchema = z.object({
  name: z.string().min(1, 'Tag name is required'),
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
    },
  });

  const onSubmit = async (values: TagFormValues) => {
    try {
      const response = tag
        ? await api.tags[":id"].$put({ param: { id: tag.id }, json: values })
        : await api.tags.$post({ json: values });

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
