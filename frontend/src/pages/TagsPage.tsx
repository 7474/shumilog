import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { Tag } from '@/models';
import { TagForm } from '@/components/TagForm';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | undefined>(undefined);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const response = await api.tags.$get();
      if (!response.ok) {
        throw new Error('Failed to fetch tags');
      }
      const data = await response.json();
      setTags(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleSuccess = () => {
    setShowForm(false);
    setSelectedTag(undefined);
    fetchTags();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this tag?')) {
      try {
        const response = await api.tags[':id'].$delete({ param: { id } });
        if (!response.ok) {
          throw new Error('Failed to delete tag');
        }
        fetchTags();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      }
    }
  };

  const handleEdit = (tag: Tag) => {
    setSelectedTag(tag);
    setShowForm(true);
  };

  const handleAddNew = () => {
    setSelectedTag(undefined);
    setShowForm(true);
  };

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Tags</h1>
        <Button onClick={handleAddNew}>Create Tag</Button>
      </div>

      {showForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{selectedTag ? 'Edit Tag' : 'Create Tag'}</CardTitle>
          </CardHeader>
          <CardContent>
            <TagForm tag={selectedTag} onSuccess={handleSuccess} />
            <Button
              variant="ghost"
              onClick={() => setShowForm(false)}
              className="mt-4"
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      {tags.length === 0 && !showForm ? (
        <div className="text-center text-gray-500">No tags found.</div>
      ) : (
        <div className="space-y-4">
          {tags.map((tag) => (
            <Card key={tag.id}>
              <CardContent className="p-4 flex justify-between items-center">
                <span className="font-medium">{tag.name}</span>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(tag)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(tag.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
