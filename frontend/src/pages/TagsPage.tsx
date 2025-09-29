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
import { useAuth } from '@/hooks/useAuth';

export function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | undefined>(undefined);
  const { isAuthenticated } = useAuth();

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
        alert(err instanceof Error ? err.message : 'Failed to delete tag');
      }
    }
  };

  const handleEdit = (tag: Tag) => {
    setSelectedTag(tag);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedTag(undefined);
  };

  if (!isAuthenticated) {
    return <div>Please log in to view tags.</div>;
  }

  if (loading) {
    return (
      <div>
        <div>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div>Error: {error}</div>
        <Button onClick={fetchTags}>Retry</Button>
      </div>
    );
  }

  return (
    <div>
      <div>
        <h1>Tags</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Create New Tag'}
        </Button>
      </div>

      {showForm && (
        <div>
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedTag ? 'Edit Tag' : 'Create New Tag'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TagForm
                tag={selectedTag}
                onSuccess={handleSuccess}
                onCancel={handleCancel}
              />
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        {tags.length === 0 ? (
          <Card>
            <CardContent>
              <div>
                <div>
                  <span>🏷️</span>
                </div>
                <h3>No tags yet</h3>
                <p>Create your first tag to organize your logs!</p>
                <Button onClick={() => setShowForm(true)}>
                  Create First Tag
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div>
            {tags.map((tag) => (
              <Card key={tag.id}>
                <CardHeader>
                  <div>
                    <CardTitle>
                      {tag.name}
                    </CardTitle>
                    <div>
                      <Button onClick={() => handleEdit(tag)}>
                        Edit
                      </Button>
                      <Button onClick={() => handleDelete(tag.id.toString())}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p>{tag.description || 'No description'}</p>
                  <div>
                    <small>
                      Created: {new Date(tag.created_at).toLocaleDateString()}
                    </small>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}