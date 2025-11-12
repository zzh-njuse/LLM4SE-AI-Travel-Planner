import React, { useEffect, useRef, useState } from 'react';
import { loadAmapScript, getAmapConfig, saveAmapConfig, AmapConfig } from '../services/amap';

interface MapLocation {
  lng: number;
  lat: number;
  name: string;
  type?: 'hotel' | 'attraction' | 'restaurant' | 'other';
  id?: number; // 添加唯一 ID，支持重复地点
  dayIndex?: number; // 记录是第几天
}

interface MapViewProps {
  locations?: MapLocation[];
  center?: { lng: number; lat: number };
  zoom?: number;
  showRoute?: boolean;
}

const MapView: React.FC<MapViewProps> = ({ 
  locations = [], 
  center,
  zoom = 12,
  showRoute = false 
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<AmapConfig>({
    key: '',
    securityJsCode: ''
  });

  // 初始化地图配置
  useEffect(() => {
    const savedConfig = getAmapConfig();
    if (savedConfig) {
      setConfig(savedConfig);
      initMap(savedConfig);
    } else {
      setError('请先配置高德地图 API Key');
    }
  }, []);

  // 当 locations 变化时更新标记
  useEffect(() => {
    if (isLoaded && mapRef.current && locations.length > 0) {
      updateMarkers();
      if (showRoute && locations.length >= 2) {
        drawRoute();
      }
    }
  }, [locations, isLoaded, showRoute]);

  const initMap = async (mapConfig: AmapConfig) => {
    if (!mapConfig.key) {
      setError('API Key 不能为空');
      return;
    }

    try {
      setError('');
      await loadAmapScript(mapConfig.key, mapConfig.securityJsCode);
      
      if (!mapContainerRef.current) return;

      const AMap = (window as any).AMap;
      
      // 计算地图中心点
      let mapCenter = center;
      // 验证 center 的有效性
      if (mapCenter && (isNaN(mapCenter.lng) || isNaN(mapCenter.lat))) {
        mapCenter = undefined;
      }
      if (!mapCenter && locations.length > 0) {
        const firstValid = locations.find(loc => !isNaN(loc.lng) && !isNaN(loc.lat));
        if (firstValid) {
          mapCenter = firstValid;
        }
      }
      if (!mapCenter) {
        mapCenter = { lng: 116.397428, lat: 39.90923 }; // 默认北京
      }

      // 创建地图实例 - 使用简化配置
      const map = new AMap.Map(mapContainerRef.current, {
        zoom: zoom,
        center: [mapCenter.lng, mapCenter.lat]
      });

      mapRef.current = map;
      
      // 等待地图完全加载后再添加标记
      map.on('complete', () => {
        setIsLoaded(true);
        
        // 如果有位置数据,添加标记
        if (locations.length > 0) {
          updateMarkers();
          if (showRoute && locations.length >= 2) {
            drawRoute();
          }
        }
      });
    } catch (err: any) {
      setError(err.message || '地图初始化失败');
      console.error('地图初始化失败:', err);
    }
  };

  const updateMarkers = () => {
    if (!mapRef.current) return;

    const AMap = (window as any).AMap;

    // 清除旧标记
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // 过滤掉无效的坐标
    const validLocations = locations.filter(loc => {
      const isValid = loc && 
                     typeof loc.lng === 'number' && 
                     typeof loc.lat === 'number' && 
                     !isNaN(loc.lng) && 
                     !isNaN(loc.lat) &&
                     loc.lng >= -180 && loc.lng <= 180 &&
                     loc.lat >= -90 && loc.lat <= 90;
      
      return isValid;
    });

    if (validLocations.length === 0) {
      console.warn('没有有效的位置数据可以显示在地图上');
      return;
    }

    // 创建新标记
    const markers = validLocations.map((location) => {
      const icon = getMarkerIcon(location.type);
      
      // 先验证坐标再创建 Marker
      if (!location.lng || !location.lat || isNaN(location.lng) || isNaN(location.lat)) {
        console.error('跳过无效坐标的标记:', location);
        return null;
      }
      
      const marker = new AMap.Marker({
        position: [location.lng, location.lat],
        title: location.name,
        icon: icon,
        label: {
          content: `<div style="background: white; padding: 4px 8px; border-radius: 4px; border: 1px solid #ccc; font-size: 12px;">${location.name}</div>`,
          direction: 'top'
        }
      });

      marker.setMap(mapRef.current);
      
      // 添加点击事件
      marker.on('click', () => {
        const infoWindow = new AMap.InfoWindow({
          content: `<div style="padding: 10px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px;">${location.name}</h3>
            <p style="margin: 0; color: #666;">经度: ${location.lng.toFixed(6)}</p>
            <p style="margin: 4px 0 0 0; color: #666;">纬度: ${location.lat.toFixed(6)}</p>
            ${location.dayIndex !== undefined ? `<p style="margin: 4px 0 0 0; color: #666;">第 ${location.dayIndex} 天</p>` : ''}
          </div>`
        });
        infoWindow.open(mapRef.current, [location.lng, location.lat]);
      });

      return marker;
    }).filter((marker): marker is NonNullable<typeof marker> => marker !== null); // 过滤掉 null 值

    markersRef.current = markers;

    // 自动调整视野以包含所有标记
    if (markers.length > 0) {
      mapRef.current.setFitView();
    }
  };

  const getMarkerIcon = (type?: string): string => {
    // 根据类型返回不同的图标 URL
    const iconBase = 'https://webapi.amap.com/theme/v1.3/markers/n/mark_';
    switch (type) {
      case 'hotel':
        return iconBase + 'b1.png';
      case 'attraction':
        return iconBase + 'r1.png';
      case 'restaurant':
        return iconBase + 'g1.png';
      default:
        return iconBase + 'b1.png';
    }
  };

  const drawRoute = async () => {
    if (!mapRef.current || locations.length < 2) {
      console.warn('无法绘制路线：位置数据不足或地图未加载');
      return;
    }

    const AMap = (window as any).AMap;
    
    console.log('开始绘制路线，总位置数:', locations.length);
    console.log('原始位置数据:', locations);

    // 过滤掉无效的坐标
    const validLocations = locations.filter(loc => {
      if (!loc) {
        console.warn('位置为空');
        return false;
      }
      if (typeof loc.lng !== 'number' || typeof loc.lat !== 'number') {
        console.warn('坐标类型错误:', loc);
        return false;
      }
      if (isNaN(loc.lng) || isNaN(loc.lat)) {
        console.warn('坐标是 NaN:', loc);
        return false;
      }
      if (loc.lng < -180 || loc.lng > 180 || loc.lat < -90 || loc.lat > 90) {
        console.warn('坐标超出范围:', loc);
        return false;
      }
      return true;
    });

    console.log('有效位置数:', validLocations.length);
    console.log('有效位置数据:', validLocations);

    if (validLocations.length < 2) {
      console.warn('没有足够的有效位置数据来绘制路线(需要至少2个点)');
      return;
    }

    try {
      // 创建驾车路线规划实例
      const driving = new AMap.Driving({
        map: mapRef.current,
        panel: 'route-panel'
      });

      // 规划多点路线
      const waypoints = validLocations.slice(1, -1).map(loc => new AMap.LngLat(loc.lng, loc.lat));
      const origin = new AMap.LngLat(validLocations[0].lng, validLocations[0].lat);
      const destination = new AMap.LngLat(validLocations[validLocations.length - 1].lng, validLocations[validLocations.length - 1].lat);

      driving.search(origin, destination, { waypoints }, (status: string, result: any) => {
        if (status === 'complete') {
          console.log('路线规划成功', result);
        } else {
          console.error('路线规划失败，状态:', status, '结果:', result);
          // 添加调试信息
          if (result && result.info) {
            console.error('错误信息:', result.info);
          }
        }
      });
    } catch (err) {
      console.error('绘制路线失败:', err);
    }
  };

  const handleSaveConfig = () => {
    if (!config.key) {
      setError('API Key 不能为空');
      return;
    }

    saveAmapConfig(config);
    initMap(config);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {error && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '10px 20px',
          backgroundColor: '#fee',
          color: '#c33',
          borderRadius: '4px',
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          {error}
        </div>
      )}
      
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      
      {showRoute && locations.length >= 2 && (
        <div
          id="route-panel"
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '300px',
            maxHeight: '500px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            overflow: 'auto',
            padding: '10px',
            zIndex: 999
          }}
        />
      )}
    </div>
  );
};

export default MapView;
