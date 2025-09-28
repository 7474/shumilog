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
import { Link } from 'react-router-dom';
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
    return (
      <div className="p-4 sm:p-6 min-h-[400px] flex items-center justify-center">
        <div className="text-center animate-pulse">
          <div className="w-12 h-12 bg-primary-200 rounded-full mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading tags...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <Card className="border-red-200 bg-red-50/80">
          <CardContent className="p-6">
            <p className="text-red-600">Error: {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:justify-between sm:items-start">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
            {isAuthenticated ? 'Your Tags' : 'Hobby Tags'}
          </h1>
          <p className="text-neutral-600 text-base sm:text-lg leading-relaxed">
            {isAuthenticated 
              ? 'Organize your hobbies with custom tags' 
              : 'Explore hobby categories and interests'
            }
          </p>
        </div>
        {isAuthenticated && (
          <Button 
            onClick={handleAddNew} 
            size="lg" 
            className="shrink-0 shadow-gentle hover:shadow-medium self-start"
          >
            <span className="mr-2">🏷️</span>
            Create Tag
          </Button>
        )}
      </div>

      {/* Form Section - Only for authenticated users */}
      {isAuthenticated && showForm && (
        <Card className="mb-8 shadow-gentle border-primary-100/60 animate-slide-up">
          <CardHeader className="bg-gradient-to-r from-primary-50/80 to-secondary-50/80 rounded-t-2xl">
            <CardTitle className="text-xl sm:text-2xl text-primary-800 flex items-center">
              <span className="mr-2">{selectedTag ? '✏️' : '🏷️'}</span>
              {selectedTag ? 'Edit Tag' : 'Create New Tag'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 sm:p-8">
            <TagForm tag={selectedTag} onSuccess={handleSuccess} />
            <Button
              variant="ghost"
              onClick={() => setShowForm(false)}
              className="mt-6 text-neutral-600 hover:bg-neutral-50"
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Login prompt for unauthenticated users with no tags */}
      {!isAuthenticated && tags.length === 0 && !showForm && (
        <div className="text-center py-16 sm:py-20 animate-fade-in">
          <div className="mb-8">
            <div className="mx-auto w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-3xl flex items-center justify-center mb-6 shadow-soft">
              <span className="text-4xl sm:text-5xl">🏷️</span>
            </div>
          </div>
          <div className="space-y-3 max-w-md mx-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-800">No tags yet</h2>
            <p className="text-base text-neutral-600 leading-relaxed">
              Be the first to create tags to organize hobby content!
            </p>
            <div className="pt-4">
              <Link to="/login">
                <Button size="lg" className="shadow-gentle hover:shadow-medium">
                  <span className="mr-2">🔑</span>
                  Login to Create Tags
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Empty state for authenticated users */}
      {isAuthenticated && tags.length === 0 && !showForm && (
        <div className="text-center py-16 sm:py-20 animate-fade-in">
          <div className="mb-8">
            <div className="mx-auto w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-3xl flex items-center justify-center mb-6 shadow-soft">
              <span className="text-4xl sm:text-5xl">🏷️</span>
            </div>
          </div>
          <div className="space-y-3 max-w-md mx-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-800">No tags yet</h2>
            <p className="text-base text-neutral-600 leading-relaxed">
              Create tags to organize and categorize your hobbies
            </p>
            <div className="pt-4">
              <Button onClick={handleAddNew} size="lg" className="shadow-gentle hover:shadow-medium">
                <span className="mr-2">🏷️</span>
                Create Your First Tag
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Content Section */}
      {tags.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 animate-fade-in">
          {tags.map((tag, index) => (
            <Card 
              key={tag.id} 
              className="hover:shadow-medium transition-all duration-300 group hover:-translate-y-1 animate-scale-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-6 flex flex-col justify-between min-h-[140px] sm:min-h-[160px]">
                <div className="mb-4 flex-grow">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">🏷️</span>
                    <div className="w-3 h-3 bg-gradient-to-br from-primary-400 to-secondary-400 rounded-full shadow-soft group-hover:shadow-medium transition-all duration-200"></div>
                  </div>
                  <h3 className="font-bold text-lg text-neutral-900 group-hover:text-primary-600 transition-colors duration-200 leading-tight">
                    {tag.name}
                  </h3>
                  {tag.description && (
                    <p className="text-neutral-600 text-sm mt-1 line-clamp-2">
                      {tag.description}
                    </p>
                  )}
                </div>
                {isAuthenticated && (
                  <div className="flex items-center space-x-2 mt-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(tag)}
                      className="hover:bg-primary-50 hover:border-primary-300 flex-1 text-xs"
                    >
                      <span className="mr-1">✏️</span>
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(tag.id)}
                      className="flex-1 text-xs"
                    >
                      <span className="mr-1">🗑️</span>
                      Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
