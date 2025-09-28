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
  onSuccess: () => void;
}

export function LogForm({ log, onSuccess }: LogFormProps) {
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
        ? await api.logs[':id'].$put({ param: { id: log.id }, json: values })
        : await api.logs.$post({ json: values });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save log');
      }
      onSuccess();
    } catch (error) {
      console.error(error);
      // Optionally, you can set an error state here to display in the UI
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-primary-700 font-semibold">Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter a descriptive title for your log..." {...field} />
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
              <FormLabel className="text-primary-700 font-semibold">Content</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Share your hobby experience in detail..." 
                  className="min-h-[160px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full md:w-auto">
          {log ? 'Update Log' : 'Create Log'}
        </Button>
      </form>
    </Form>
  );
}
