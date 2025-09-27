import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { Tag } from '@/models';
import { TagForm } from '@/components/TagForm';
import { Button } from '@/components/ui/button';

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

  if (loading && !tags.length) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Tags</h1>
        <Button onClick={handleAddNew}>Create Tag</Button>
      </div>

      {showForm && (
        <div className="mb-8">
          <TagForm tag={selectedTag} onSuccess={handleSuccess} />
          <Button variant="ghost" onClick={() => setShowForm(false)} className="mt-4">
            Cancel
          </Button>
        </div>
      )}

      <ul>
        {tags.map((tag) => (
          <li key={tag.id} className="mb-2 p-2 border rounded flex justify-between items-center">
            <span>{tag.name}</span>
            <div>
              <Button variant="outline" size="sm" onClick={() => handleEdit(tag)} className="mr-2">
                Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(tag.id)}>
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
