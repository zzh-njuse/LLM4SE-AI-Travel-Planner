import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import { tokenStorage } from './services/auth'

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [user, setUser] = useState(tokenStorage.getUser());

  useEffect(() => {
    // Simple client-side routing based on hash
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || 'home';
      setCurrentPage(hash);
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleLogout = () => {
    tokenStorage.removeToken();
    tokenStorage.removeUser();
    setUser(null);
    window.location.hash = 'login';
  };

  // Render based on current page
  if (currentPage === 'login') {
    return <Login />;
  }

  if (currentPage === 'register') {
    return <Register />;
  }

  // Home page
  return (
    <div style={{padding: 20}}>
      <h1>AI 旅行规划助手</h1>
      
      {user ? (
        <div>
          <p>欢迎，{user.displayName}！</p>
          <button onClick={handleLogout}>退出登录</button>
        </div>
      ) : (
        <div>
          <p>请先<a href="#login">登录</a>或<a href="#register">注册</a></p>
        </div>
      )}

      <h2>即将推出的功能：</h2>
      <ul>
        <li>语音输入旅行偏好</li>
        <li>AI 智能生成行程</li>
        <li>预算管理</li>
        <li>地图可视化</li>
      </ul>
    </div>
  );
}
