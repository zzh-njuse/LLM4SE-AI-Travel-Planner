import axios from 'axios';

const API_URL = 'http://localhost:8081/api/v1';

export interface CreateTripRequest {
  destination: string;
  startDate: string;
  endDate: string;
  participants: number;
  budget: number;
  preferences?: string;
  rawInput?: string;
}

export interface ItineraryItem {
  dayIndex: number;
  startTime: string;
  endTime: string;
  title: string;
  type: string;
  location: string;
  description: string;
  estimatedCost: number;
  notes?: string;
  coordinates?: {
    lng: number;
    lat: number;
  };
}

export interface BudgetSummary {
  totalBudget: number;
  estimatedCost: number;
  remaining: number;
  breakdown: {
    transport: number;
    accommodation: number;
    food: number;
    attractions: number;
    other: number;
  };
}

export interface Trip {
  id: number;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  participants: number;
  status: string;
  createdAt: string;
  budgetSummary: BudgetSummary;
  itinerary?: ItineraryItem[];
}

/**
 * 创建行程（AI 生成）
 */
export async function createTrip(data: CreateTripRequest): Promise<Trip> {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('未登录，请先登录');
  }
  
  const response = await axios.post(`${API_URL}/trips`, data, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    timeout: 60000 // 60秒超时
  });
  return response.data;
}

/**
 * 获取用户的所有行程
 */
export async function getUserTrips(): Promise<Trip[]> {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('未登录，请先登录');
  }
  const response = await axios.get(`${API_URL}/trips`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.data;
}

/**
 * 获取行程详情
 */
export async function getTripDetail(id: number): Promise<Trip> {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('未登录，请先登录');
  }
  const response = await axios.get(`${API_URL}/trips/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.data;
}

/**
 * 删除行程
 */
export async function deleteTrip(id: number): Promise<void> {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('未登录，请先登录');
  }
  await axios.delete(`${API_URL}/trips/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}

/**
 * 更新行程信息
 */
export async function updateTrip(id: number, data: Partial<Trip>): Promise<Trip> {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('未登录，请先登录');
  }
  const response = await axios.put(`${API_URL}/trips/${id}`, data, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return response.data;
}

/**
 * 更新行程项
 */
export async function updateItineraryItem(tripId: number, itemIndex: number, data: Partial<ItineraryItem>): Promise<Trip> {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('未登录，请先登录');
  }
  const response = await axios.put(`${API_URL}/trips/${tripId}/itinerary/${itemIndex}`, data, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return response.data;
}

/**
 * 删除行程项
 */
export async function deleteItineraryItem(tripId: number, itemIndex: number): Promise<Trip> {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('未登录，请先登录');
  }
  const response = await axios.delete(`${API_URL}/trips/${tripId}/itinerary/${itemIndex}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.data;
}
