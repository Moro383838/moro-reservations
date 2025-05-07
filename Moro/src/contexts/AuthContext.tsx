
import React, { createContext, useState, useEffect, useContext } from 'react';
import { toast } from '@/components/ui/sonner';
import { authAPI } from '@/lib/api';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage for logged in user on initial load
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      // Call the actual authentication API
      const { user: userData, token } = await authAPI.login(email, password);
      
      // Create a user object from the response
      const authenticatedUser = {
        id: userData._id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email
      };
      
      // Store user and token in local storage
      localStorage.setItem('user', JSON.stringify(authenticatedUser));
      localStorage.setItem('token', token);
      
      setUser(authenticatedUser);
      toast.success('تم تسجيل الدخول بنجاح');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء تسجيل الدخول');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (firstName: string, lastName: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      // Call the actual registration API
      const { user: userData, token } = await authAPI.register({ firstName, lastName, email, password });
      
      // Create user object from response
      const authenticatedUser = {
        id: userData._id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email
      };
      
      // Store user and token in local storage
      localStorage.setItem('user', JSON.stringify(authenticatedUser));
      localStorage.setItem('token', token);
      
      setUser(authenticatedUser);
      
      toast.success('تم إنشاء الحساب بنجاح');
    } catch (error) {
      console.error('Signup error:', error);
      toast.error(error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء الحساب');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    toast.info('تم تسجيل الخروج');
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isLoading, 
        login, 
        signup, 
        logout, 
        isAuthenticated: !!user 
      }}
    >
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
