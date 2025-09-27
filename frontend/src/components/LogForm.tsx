import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Log } from '@/models';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content_md: z.string().min(1, 'Content is required'),
});

type LogFormValues = z.infer<typeof formSchema>;

interface LogFormProps {
  log?: Log;
  onSuccess: () => void;
}

export function LogForm({ log, onSuccess }: LogFormProps) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LogFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: log?.title ?? '',
      content_md: log?.content_md ?? '',
    },
  });

  const onSubmit = async (values: LogFormValues) => {
    try {
      const response = log
        ? await api.logs[":id"].$put({ param: { id: log.id }, json: values })
        : await api.logs.$post({ json: values });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save log');
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Log title" {...field} />
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
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Input placeholder="Log content" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {error && <p className="text-red-500">{error}</p>}
        <Button type="submit">
          {log ? 'Update' : 'Create'}
        </Button>
      </form>
    </Form>
  );
}
