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
    <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-6xl">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 space-y-4 md:space-y-0">
        <div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary-700 to-secondary-600 bg-clip-text text-transparent mb-2">
            Tags
          </h1>
          <p className="text-gray-600 text-lg">Organize your hobbies with custom tags</p>
        </div>
        <Button onClick={handleAddNew} size="lg" className="shrink-0">
          Create Tag
        </Button>
      </div>

      {showForm && (
        <Card className="mb-8 shadow-soft border-primary-100">
          <CardHeader className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-t-xl">
            <CardTitle className="text-2xl text-primary-800">
              {selectedTag ? 'Edit Tag' : 'Create New Tag'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <TagForm tag={selectedTag} onSuccess={handleSuccess} />
            <Button
              variant="ghost"
              onClick={() => setShowForm(false)}
              className="mt-6 text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      {tags.length === 0 && !showForm ? (
        <div className="text-center text-gray-500 py-20">
          <div className="mb-6">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-secondary-100 to-accent-100 rounded-full flex items-center justify-center mb-6">
              <span className="text-4xl">🏷️</span>
            </div>
          </div>
          <p className="text-2xl font-semibold mb-2 text-gray-700">No tags found</p>
          <p className="text-lg">Add your first tag to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {tags.map((tag) => (
            <Card key={tag.id} className="hover:shadow-lg transition-all duration-300 group hover:scale-[1.02]">
              <CardContent className="p-6 flex flex-col justify-between min-h-[120px]">
                <div className="mb-4">
                  <span className="font-semibold text-xl text-gray-800 group-hover:text-primary-600 transition-colors duration-200">
                    {tag.name}
                  </span>
                </div>
                <div className="flex items-center space-x-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(tag)}
                    className="hover:bg-primary-50 hover:border-primary-300"
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
