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
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Tags</h1>
        <Button onClick={handleAddNew} size="lg">
          Create Tag
        </Button>
      </div>

      {showForm && (
        <Card className="mb-8 shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl">
              {selectedTag ? 'Edit Tag' : 'Create New Tag'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TagForm tag={selectedTag} onSuccess={handleSuccess} />
            <Button
              variant="ghost"
              onClick={() => setShowForm(false)}
              className="mt-4 text-gray-600"
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      {tags.length === 0 && !showForm ? (
        <div className="text-center text-gray-500 py-16">
          <p className="text-xl">No tags found.</p>
          <p>Add one to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {tags.map((tag) => (
            <Card key={tag.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4 flex justify-between items-center">
                <span className="font-semibold text-lg text-gray-800">
                  {tag.name}
                </span>
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
