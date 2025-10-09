import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { User } from '@/api-types';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const verifyUser = useCallback(async () => {
    try {
      const { data, error } = await api.GET('/users/me', {});
      if (!error && data) {
        setIsAuthenticated(true);
        setUser(data);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    verifyUser();
  }, [verifyUser]);

  const clearAuth = useCallback(() => {
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  return { isAuthenticated, isLoading, user, clearAuth, verifyUser };
}
