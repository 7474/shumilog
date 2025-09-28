import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const verifyUser = useCallback(async () => {
    try {
      const res = await api.users.me.$get();
      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    verifyUser();
  }, [verifyUser]);

  const clearAuth = useCallback(() => {
    setIsAuthenticated(false);
  }, []);

  return { isAuthenticated, isLoading, clearAuth, verifyUser };
}
