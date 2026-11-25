import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  getStoredToken,
  setOnUnauthorized,
  setStoredToken,
} from '../services/api';
import {
  changeUserPassword,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  updateUserProfile,
} from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => getStoredToken());
  const [authLoading, setAuthLoading] = useState(() => Boolean(getStoredToken()));

  const clearSession = useCallback(() => {
    setStoredToken('');
    setToken('');
    setUser(null);
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => {
      clearSession();
    });
    return () => setOnUnauthorized(null);
  }, [clearSession]);

  const fetchCurrentUser = useCallback(async () => {
    const activeToken = getStoredToken();
    if (!activeToken) {
      setUser(null);
      setAuthLoading(false);
      return null;
    }

    setAuthLoading(true);
    try {
      const res = await getCurrentUser();
      const loadedUser = res?.data?.user || null;
      setUser(loadedUser);
      return loadedUser;
    } catch {
      clearSession();
      return null;
    } finally {
      setAuthLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setAuthLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const register = useCallback(async (payload) => {
    const res = await registerUser(payload);
    const { user: newUser, token: newToken } = res.data;
    setStoredToken(newToken);
    setToken(newToken);
    setUser(newUser);
    return res;
  }, []);

  const login = useCallback(async (payload) => {
    const res = await loginUser(payload);
    const { user: loggedUser, token: newToken } = res.data;
    setStoredToken(newToken);
    setToken(newToken);
    setUser(loggedUser);
    return res;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (getStoredToken()) {
        await logoutUser();
      }
    } catch {
      // Clear local session even if backend call fails
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const updateProfile = useCallback(async (payload) => {
    const res = await updateUserProfile(payload);
    if (res?.data?.user) {
      setUser(res.data.user);
    }
    return res;
  }, []);

  const changePassword = useCallback(async (payload) => {
    const res = await changeUserPassword(payload);
    if (res?.data?.token) {
      setStoredToken(res.data.token);
      setToken(res.data.token);
    }
    if (res?.data?.user) {
      setUser(res.data.user);
    }
    return res;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        authLoading,
        register,
        login,
        logout,
        refreshUser: fetchCurrentUser,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
