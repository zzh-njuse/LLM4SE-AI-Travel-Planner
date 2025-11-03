const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081/api/v1';

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserDto {
  id: number;
  email: string;
  displayName: string;
  authProvider: string;
}

export interface AuthResponse {
  token: string;
  user: UserDto;
}

export const authApi = {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || '注册失败');
      }
      
      return result;
    } catch (error: any) {
      // 如果是网络错误（Failed to fetch）
      if (error.message === 'Failed to fetch') {
        throw new Error('无法连接到服务器，请确保后端服务正在运行');
      }
      throw error;
    }
  },

  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || '登录失败');
      }
      
      return result;
    } catch (error: any) {
      // 如果是网络错误（Failed to fetch）
      if (error.message === 'Failed to fetch') {
        throw new Error('无法连接到服务器，请确保后端服务正在运行');
      }
      throw error;
    }
  },
};

export const tokenStorage = {
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  },
  
  setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  },
  
  removeToken(): void {
    localStorage.removeItem('auth_token');
  },
  
  getUser(): UserDto | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
  
  setUser(user: UserDto): void {
    localStorage.setItem('user', JSON.stringify(user));
  },
  
  removeUser(): void {
    localStorage.removeItem('user');
  },
};
