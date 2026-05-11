import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('smartfinance_token');
    const storedUser = localStorage.getItem('smartfinance_user');

    if (storedToken && storedUser) {
      try {
        const decoded: any = jwtDecode(storedToken);
        // Check if token expired
        if (decoded.exp * 1000 < Date.now()) {
          logout();
        } else {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          setupAxiosInterceptor(storedToken);
        }
      } catch (e) {
        logout();
      }
    }
    setLoading(false);
  }, []);

  const setupAxiosInterceptor = (authToken: string) => {
    axios.interceptors.request.use((config) => {
      config.headers.Authorization = `Bearer ${authToken}`;
      return config;
    });
  };

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('smartfinance_token', newToken);
    localStorage.setItem('smartfinance_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setupAxiosInterceptor(newToken);
  };

  const logout = () => {
    localStorage.removeItem('smartfinance_token');
    localStorage.removeItem('smartfinance_user');
    setToken(null);
    setUser(null);
    // Remove interceptor is hard, simpler to just force reload
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
