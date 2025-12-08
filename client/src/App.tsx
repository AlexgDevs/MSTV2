import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { HomePage } from './pages/HomePage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { MasterDashboardPage } from './pages/master/MasterDashboardPage';
import { ServiceDetailPage } from './pages/services/ServiceDetailPage';
import { ServicesPage } from './pages/services/ServicesPage';

// Компонент-обертка для инициализации auth
const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { checkAuth, isLoading } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await checkAuth();
      } catch (error) {
        // Игнорируем ошибки при проверке - это нормально, если пользователь не авторизован
        console.log('Auth check failed:', error);
      } finally {
        setIsInitialized(true);
      }
    };
    
    initializeAuth();
  }, []); // Убираем checkAuth из зависимостей, чтобы не вызывать повторно

  // Показываем загрузку пока не завершилась инициализация
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#3e3e42] border-t-[#007acc] rounded-full animate-spin"></div>
          <div className="text-lg text-[#cccccc] font-medium">Загрузка...</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Компоненты для маршрутов
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/auth/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthInitializer>
        <Routes>
          {/* Public routes */}
          <Route path="/auth/login" element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } />
          

          <Route path="/services/:serviceId" element={<ServiceDetailPage />} />

          <Route path="/auth/register" element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          } />

          <Route path="/auth/verify-email" element={
            <ProtectedRoute>
              <VerifyEmailPage />
            </ProtectedRoute>
          } />
          
          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout>
                <HomePage />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/services" element={
            <ProtectedRoute>
              <Layout>
                <ServicesPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout>
                <ProfilePage />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/master" element={
            <ProtectedRoute>
              <Layout>
                <MasterDashboardPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthInitializer>
    </BrowserRouter>
  );
}

export default App;