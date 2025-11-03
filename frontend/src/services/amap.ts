/**
 * 高德地图服务
 * 负责加载高德地图 API 和管理配置
 */

export interface AmapConfig {
  key: string;
  securityJsCode?: string;
}

const AMAP_CONFIG_KEY = 'amap_config';

/**
 * 保存高德地图配置到 localStorage
 */
export function saveAmapConfig(config: AmapConfig): void {
  localStorage.setItem(AMAP_CONFIG_KEY, JSON.stringify(config));
}

/**
 * 从 localStorage 获取高德地图配置
 */
export function getAmapConfig(): AmapConfig | null {
  const configStr = localStorage.getItem(AMAP_CONFIG_KEY);
  if (!configStr) return null;
  try {
    return JSON.parse(configStr);
  } catch (error) {
    console.error('解析高德地图配置失败:', error);
    return null;
  }
}

/**
 * 加载高德地图 API
 */
export function loadAmapScript(key: string, securityJsCode?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // 如果已经加载过，直接返回
    if ((window as any).AMap) {
      resolve();
      return;
    }

    // 设置安全密钥（如果有）
    if (securityJsCode) {
      (window as any)._AMapSecurityConfig = {
        securityJsCode: securityJsCode
      };
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}&plugin=AMap.Geocoder,AMap.Driving,AMap.Walking,AMap.Riding`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('加载高德地图 API 失败'));
    document.head.appendChild(script);
  });
}

/**
 * 地理编码：地址转坐标
 */
export async function geocodeAddress(address: string): Promise<{ lng: number; lat: number } | null> {
  const AMap = (window as any).AMap;
  if (!AMap) {
    throw new Error('高德地图 API 未加载');
  }

  return new Promise((resolve) => {
    const geocoder = new AMap.Geocoder();
    geocoder.getLocation(address, (status: string, result: any) => {
      if (status === 'complete' && result.geocodes.length > 0) {
        const location = result.geocodes[0].location;
        resolve({ lng: location.lng, lat: location.lat });
      } else {
        console.error('地理编码失败:', address);
        resolve(null);
      }
    });
  });
}

/**
 * 逆地理编码：坐标转地址
 */
export async function reverseGeocode(lng: number, lat: number): Promise<string | null> {
  const AMap = (window as any).AMap;
  if (!AMap) {
    throw new Error('高德地图 API 未加载');
  }

  return new Promise((resolve) => {
    const geocoder = new AMap.Geocoder();
    geocoder.getAddress([lng, lat], (status: string, result: any) => {
      if (status === 'complete' && result.regeocode) {
        resolve(result.regeocode.formattedAddress);
      } else {
        console.error('逆地理编码失败');
        resolve(null);
      }
    });
  });
}

/**
 * 路线规划类型
 */
export enum RouteType {
  DRIVING = 'driving',   // 驾车
  WALKING = 'walking',   // 步行
  RIDING = 'riding',     // 骑行
}

/**
 * 路线规划
 */
export async function planRoute(
  origin: { lng: number; lat: number },
  destination: { lng: number; lat: number },
  type: RouteType = RouteType.DRIVING
): Promise<any> {
  const AMap = (window as any).AMap;
  if (!AMap) {
    throw new Error('高德地图 API 未加载');
  }

  return new Promise((resolve, reject) => {
    let planner: any;
    
    switch (type) {
      case RouteType.DRIVING:
        planner = new AMap.Driving();
        break;
      case RouteType.WALKING:
        planner = new AMap.Walking();
        break;
      case RouteType.RIDING:
        planner = new AMap.Riding();
        break;
      default:
        planner = new AMap.Driving();
    }

    planner.search(
      new AMap.LngLat(origin.lng, origin.lat),
      new AMap.LngLat(destination.lng, destination.lat),
      (status: string, result: any) => {
        if (status === 'complete') {
          resolve(result);
        } else {
          reject(new Error('路线规划失败'));
        }
      }
    );
  });
}
