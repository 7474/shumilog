import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { User } from '@/api-types';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const verifyUser = useCallback(async () => {
    try {
      const res = await api.users.me.$get();
      if (res.ok) {
        const userData = await res.json();
        setIsAuthenticated(true);
        setUser(userData);
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
