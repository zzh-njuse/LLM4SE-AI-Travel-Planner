import axios from 'axios';
import { Request, Response } from 'express';

const TRIP_SERVICE_URL = process.env.TRIP_SERVICE_URL || 'http://localhost:8081';

/**
 * 创建行程（AI 生成）
 */
export async function createTrip(req: Request, res: Response) {
  try {
    console.log('收到创建行程请求:', {
      body: req.body,
      hasAuth: !!req.headers.authorization,
      authHeader: req.headers.authorization?.substring(0, 20) + '...'
    });

    const response = await axios.post(
      `${TRIP_SERVICE_URL}/api/v1/trips`,
      req.body,
      {
        headers: {
          'Authorization': req.headers.authorization || '',
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60秒超时，AI 生成需要时间
      }
    );

    res.json(response.data);
  } catch (error: any) {
    console.error('创建行程失败:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      stack: error.stack
    });
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: '行程服务不可用: ' + error.message });
    }
  }
}

/**
 * 获取用户的所有行程
 */
export async function getUserTrips(req: Request, res: Response) {
  try {
    const response = await axios.get(
      `${TRIP_SERVICE_URL}/api/v1/trips`,
      {
        headers: {
          'Authorization': req.headers.authorization || ''
        }
      }
    );

    res.json(response.data);
  } catch (error: any) {
    console.error('获取行程列表失败:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: '行程服务不可用' });
    }
  }
}

/**
 * 获取行程详情
 */
export async function getTripDetail(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const response = await axios.get(
      `${TRIP_SERVICE_URL}/api/v1/trips/${id}`,
      {
        headers: {
          'Authorization': req.headers.authorization || ''
        }
      }
    );

    res.json(response.data);
  } catch (error: any) {
    console.error('获取行程详情失败:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: '行程服务不可用' });
    }
  }
}

/**
 * 删除行程
 */
export async function deleteTrip(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const response = await axios.delete(
      `${TRIP_SERVICE_URL}/api/v1/trips/${id}`,
      {
        headers: {
          'Authorization': req.headers.authorization || ''
        }
      }
    );

    res.status(200).json({ message: '删除成功' });
  } catch (error: any) {
    console.error('删除行程失败:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: '行程服务不可用' });
    }
  }
}
