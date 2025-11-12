import axios from 'axios';
import { Router, Request, Response } from 'express';

const router = Router();

const TRIP_SERVICE_URL = process.env.TRIP_SERVICE_URL || 'http://localhost:8081';

/**
 * 获取高德地图配置
 */
router.get('/amap', async (_req: Request, res: Response) => {
  try {
    const response = await axios.get(`${TRIP_SERVICE_URL}/api/v1/config/amap`);
    res.json(response.data);
  } catch (error: any) {
    console.error('获取高德地图配置失败:', error.message);
    res.status(500).json({ error: '获取配置失败' });
  }
});

/**
 * 获取科大讯飞配置
 */
router.get('/xfyun', async (_req: Request, res: Response) => {
  try {
    const response = await axios.get(`${TRIP_SERVICE_URL}/api/v1/config/xfyun`);
    res.json(response.data);
  } catch (error: any) {
    console.error('获取科大讯飞配置失败:', error.message);
    res.status(500).json({ error: '获取配置失败' });
  }
});

export default router;
