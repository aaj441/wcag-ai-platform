import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  organizations?: Array<{
    id: string;
    name: string;
    slug: string;
    plan: string;
    role: string;
    joinedAt: string;
  }>;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

interface RegisterData {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  | { type: 'CLEAR_ERROR' };

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const router = useRouter();

  // Set up axios interceptors
  useEffect(() => {
    // Request interceptor
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const token = Cookies.get('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await refreshToken();
            const token = Cookies.get('token');
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axios(originalRequest);
          } catch (refreshError) {
            logout();
            router.push('/auth/login');
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [router]);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const token = Cookies.get('token');
      const refreshTokenCookie = Cookies.get('refreshToken');

      if (token && refreshTokenCookie) {
        try {
          const response = await axios.get('/api/v1/auth/validate');
          if (response.data.success) {
            dispatch({
              type: 'AUTH_SUCCESS',
              payload: {
                user: response.data.data.user,
                token,
              },
            });
          } else {
            throw new Error('Invalid token');
          }
        } catch (error) {
          logout();
        }
      } else {
        dispatch({ type: 'AUTH_LOGOUT' });
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    dispatch({ type: 'AUTH_START' });

    try {
      const response = await axios.post('/api/v1/auth/login', {
        email,
        password,
      });

      if (response.data.success) {
        const { user, accessToken, refreshToken } = response.data.data;

        // Set cookies
        Cookies.set('token', accessToken, {
          expires: 7,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
        });
        Cookies.set('refreshToken', refreshToken, {
          expires: 30,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
        });

        dispatch({
          type: 'AUTH_SUCCESS',
          payload: { user, token: accessToken },
        });

        toast.success('Login successful!');
        
        // Redirect to intended page or dashboard
        const redirect = router.query.redirect as string;
        router.push(redirect || '/dashboard');
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const register = async (userData: RegisterData): Promise<void> => {
    dispatch({ type: 'AUTH_START' });

    try {
      const response = await axios.post('/api/v1/auth/register', userData);

      if (response.data.success) {
        const { user, accessToken, refreshToken } = response.data.data;

        // Set cookies
        Cookies.set('token', accessToken, {
          expires: 7,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
        });
        Cookies.set('refreshToken', refreshToken, {
          expires: 30,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
        });

        dispatch({
          type: 'AUTH_SUCCESS',
          payload: { user, token: accessToken },
        });

        toast.success('Registration successful! Welcome aboard!');
        router.push('/dashboard');
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  const logout = (): void => {
    // Remove cookies
    Cookies.remove('token');
    Cookies.remove('refreshToken');

    // Call logout endpoint
    axios.post('/api/v1/auth/logout').catch(() => {
      // Ignore errors during logout
    });

    dispatch({ type: 'AUTH_LOGOUT' });
    toast.success('Logged out successfully');
    router.push('/auth/login');
  };

  const refreshToken = async (): Promise<void> => {
    const refreshTokenCookie = Cookies.get('refreshToken');

    if (!refreshTokenCookie) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post('/api/v1/auth/refresh', {
        refreshToken: refreshTokenCookie,
      });

      if (response.data.success) {
        const { accessToken } = response.data.data;

        Cookies.set('token', accessToken, {
          expires: 7,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
        });

        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user: state.user!,
            token: accessToken,
          },
        });
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      logout();
      throw error;
    }
  };

  const updateProfile = async (userData: Partial<User>): Promise<void> => {
    try {
      const response = await axios.put('/api/v1/users/profile', userData);

      if (response.data.success) {
        dispatch({
          type: 'UPDATE_USER',
          payload: response.data.data,
        });
        toast.success('Profile updated successfully!');
      } else {
        throw new Error(response.data.message || 'Profile update failed');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Profile update failed';
      toast.error(errorMessage);
      throw error;
    }
  };

  const forgotPassword = async (email: string): Promise<void> => {
    try {
      const response = await axios.post('/api/v1/auth/forgot-password', { email });

      if (response.data.success) {
        toast.success('Password reset link sent to your email!');
      } else {
        throw new Error(response.data.message || 'Failed to send reset link');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to send reset link';
      toast.error(errorMessage);
      throw error;
    }
  };

  const resetPassword = async (token: string, password: string): Promise<void> => {
    try {
      const response = await axios.post('/api/v1/auth/reset-password', {
        token,
        password,
      });

      if (response.data.success) {
        toast.success('Password reset successfully!');
        router.push('/auth/login');
      } else {
        throw new Error(response.data.message || 'Password reset failed');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Password reset failed';
      toast.error(errorMessage);
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    try {
      const response = await axios.post('/api/v1/auth/change-password', {
        currentPassword,
        newPassword,
      });

      if (response.data.success) {
        toast.success('Password changed successfully!');
      } else {
        throw new Error(response.data.message || 'Password change failed');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Password change failed';
      toast.error(errorMessage);
      throw error;
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshToken,
    updateProfile,
    forgotPassword,
    resetPassword,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;