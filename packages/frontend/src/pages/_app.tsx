import type { AppProps } from 'next/app';
import { useState, useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

import '@/styles/globals.css';
import '@/styles/animations.css';
import '@/styles/components.css';

import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { AccessibilityProvider } from '@/contexts/AccessibilityContext';

import Layout from '@/components/Layout/Layout';
import ErrorBoundary from '@/components/ErrorBoundary/ErrorBoundary';
import LoadingBar from '@/components/Loading/LoadingBar';

// Configure NProgress
NProgress.configure({ 
  showSpinner: false,
  minimum: 0.1,
  easing: 'ease',
  speed: 500,
});

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

function MyApp({ Component, pageProps, router }: AppProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Handle route changes
    const handleStart = () => {
      setIsLoading(true);
      NProgress.start();
    };

    const handleComplete = () => {
      setIsLoading(false);
      NProgress.done();
    };

    const handleError = () => {
      setIsLoading(false);
      NProgress.done();
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleError);

    // Initialize theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);

    // Apply theme class to document
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Cleanup
    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleError);
    };
  }, [router]);

  // Check if page should use layout
  const useLayout = Component !== Login && Component !== Register && Component !== ForgotPassword;

  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <NotificationProvider>
              <WebSocketProvider>
                <AccessibilityProvider>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={router.route}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {useLayout ? (
                        <Layout>
                          <Component {...pageProps} />
                        </Layout>
                      ) : (
                        <Component {...pageProps} />
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {/* Loading bar */}
                  {isLoading && <LoadingBar />}

                  {/* Toast notifications */}
                  <Toaster
                    position="top-right"
                    toastOptions={{
                      duration: 4000,
                      style: {
                        background: theme === 'dark' ? '#1f2937' : '#ffffff',
                        color: theme === 'dark' ? '#ffffff' : '#000000',
                        border: theme === 'dark' ? '1px solid #374151' : '1px solid #e5e7eb',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                      },
                      success: {
                        iconTheme: {
                          primary: '#10b981',
                          secondary: '#ffffff',
                        },
                      },
                      error: {
                        iconTheme: {
                          primary: '#ef4444',
                          secondary: '#ffffff',
                        },
                      },
                    }}
                  />

                  {/* React Query DevTools - only in development */}
                  {process.env.NODE_ENV === 'development' && (
                    <ReactQueryDevtools initialIsOpen={false} />
                  )}
                </AccessibilityProvider>
              </WebSocketProvider>
            </NotificationProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

// Import components dynamically to avoid SSR issues
const Login = dynamic(() => import('@/pages/auth/login'), { ssr: false });
const Register = dynamic(() => import('@/pages/auth/register'), { ssr: false });
const ForgotPassword = dynamic(() => import('@/pages/auth/forgot-password'), { ssr: false });

export default MyApp;