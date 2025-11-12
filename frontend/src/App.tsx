import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import CreateTrip from './pages/CreateTrip'
import TripList from './pages/TripList'
import TripDetail from './pages/TripDetail'
import { tokenStorage } from './services/auth'
import { saveAmapConfig } from './services/amap'

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = tokenStorage.getToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

// Navigation Header
function Header() {
  const location = useLocation();
  const user = tokenStorage.getUser();
  const token = tokenStorage.getToken();

  const handleLogout = () => {
    tokenStorage.removeToken();
    tokenStorage.removeUser();
    window.location.href = '#/login';
    window.location.reload();
  };

  // 在登录和注册页面不显示 Header
  const hideHeaderPaths = ['/login', '/register'];
  if (hideHeaderPaths.includes(location.pathname)) {
    return null;
  }

  // 没有登录不显示 Header
  if (!user || !token) {
    return null;
  }

  return (
    <div style={{
      backgroundColor: '#4a90e2',
      color: 'white',
      padding: '1rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>✈️ AI 旅行规划助手</h2>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          <a href="#/trips" style={{ color: 'white', textDecoration: 'none', fontSize: '1rem', whiteSpace: 'nowrap' }}>
            我的行程
          </a>
          <a href="#/trips/new" style={{ color: 'white', textDecoration: 'none', fontSize: '1rem', whiteSpace: 'nowrap' }}>
            创建新行程
          </a>
        </nav>
      </div>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <span>👤 {user.displayName}</span>
        <button
          onClick={handleLogout}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'transparent',
            color: 'white',
            border: '1px solid white',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          退出
        </button>
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    // 初始化高德地图配置
    initAmapConfig();
  }, []);

  const initAmapConfig = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/v1/config/amap');
      if (!response.ok) {
        console.warn('获取高德地图配置失败');
        return;
      }
      const data = await response.json();
      // 优先使用 Web Service Key（支持路线规划），否则使用普通 Key
      const key = data.webServiceKey || data.key;
      const securityJsCode = data.securityJsCode;
      
      if (key) {
        saveAmapConfig({ 
          key,
          securityJsCode: securityJsCode || undefined
        });
        console.log('✅ 高德地图配置已初始化');
      }
    } catch (error) {
      console.error('初始化高德地图配置失败:', error);
    }
  };

  return (
    <HashRouter>
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f7fa' }}>
        <Header />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/trips/new" element={
            <ProtectedRoute>
              <CreateTrip />
            </ProtectedRoute>
          } />
          
          <Route path="/trips/:id" element={
            <ProtectedRoute>
              <TripDetail />
            </ProtectedRoute>
          } />
          
          <Route path="/trips" element={
            <ProtectedRoute>
              <TripList />
            </ProtectedRoute>
          } />
          
          <Route path="/" element={<Navigate to="/trips" replace />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
