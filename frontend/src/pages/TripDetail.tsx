import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTripDetail, deleteTrip, updateTrip, updateItineraryItem, deleteItineraryItem, addItineraryItem, Trip, ItineraryItem } from '../services/trip';
import MapView from '../components/MapView';
import '../styles.css';

export default function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all'); // 新增：按天数选择
  
  // 编辑状态
  const [editingBudget, setEditingBudget] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [tempBudget, setTempBudget] = useState(0);
  const [tempItem, setTempItem] = useState<ItineraryItem | null>(null);
  
  // 添加新日程项的状态
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemData, setNewItemData] = useState({
    dayIndex: 1,
    startTime: '09:00',
    endTime: '10:00',
    title: '',
    type: 'attraction',
    location: '',
    description: '',
    estimatedCost: 0,
    notes: ''
  });

  useEffect(() => {
    // 检查是否登录
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/login');
      return;
    }
    if (id) {
      loadTripDetail(parseInt(id));
    }
  }, [id, navigate]);

  const loadTripDetail = async (tripId: number) => {
    try {
      setLoading(true);
      const data = await getTripDetail(tripId);
      setTrip(data);
      setError('');
    } catch (err: any) {
      console.error('加载行程详情失败:', err);
      // 如果是 401 错误,说明 token 失效,跳转到登录页
      if (err.response?.status === 401) {
        localStorage.removeItem('auth_token');
        navigate('/login');
        return;
      }
      setError(err.response?.data?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!trip || !window.confirm(`确定要删除行程"${trip.title}"吗？`)) {
      return;
    }

    try {
      await deleteTrip(trip.id);
      navigate('/trips');
    } catch (err: any) {
      alert(err.response?.data?.error || '删除失败');
    }
  };

  // 开始编辑预算
  const startEditBudget = () => {
    if (trip) {
      setTempBudget(trip.budgetSummary.totalBudget);
      setEditingBudget(true);
    }
  };

  // 保存预算
  const saveBudget = async () => {
    if (!trip || tempBudget <= 0) {
      alert('请输入有效的预算金额');
      return;
    }

    try {
      const updated = await updateTrip(trip.id, {
        ...trip,
        budgetSummary: {
          ...trip.budgetSummary,
          totalBudget: tempBudget,
          remaining: tempBudget - trip.budgetSummary.estimatedCost
        }
      });
      setTrip(updated);
      setEditingBudget(false);
    } catch (err: any) {
      alert(err.response?.data?.error || '保存失败');
    }
  };

  // 取消编辑预算
  const cancelEditBudget = () => {
    setEditingBudget(false);
    setTempBudget(0);
  };

  // 开始编辑行程项
  const startEditItem = (item: ItineraryItem, index: number) => {
    setTempItem({ ...item });
    setEditingItemId(index);
  };

  // 保存行程项
  const saveItem = async (index: number) => {
    if (!trip || !tempItem) return;

    try {
      const updated = await updateItineraryItem(trip.id, index, tempItem);
      setTrip(updated);
      setEditingItemId(null);
      setTempItem(null);
    } catch (err: any) {
      alert(err.response?.data?.error || '保存失败');
    }
  };

  // 取消编辑行程项
  const cancelEditItem = () => {
    setEditingItemId(null);
    setTempItem(null);
  };

  // 删除行程项
  const handleDeleteItem = async (index: number) => {
    if (!trip || !window.confirm('确定要删除这个行程项吗？')) {
      return;
    }

    try {
      const updated = await deleteItineraryItem(trip.id, index);
      setTrip(updated);
    } catch (err: any) {
      alert(err.response?.data?.error || '删除失败');
    }
  };

  // 添加行程项
  const handleAddItem = async () => {
    if (!trip) {
      alert('行程数据未加载');
      return;
    }

    if (!newItemData.title.trim()) {
      alert('请输入标题');
      return;
    }

    if (!newItemData.location.trim()) {
      alert('请输入地点/地址');
      return;
    }

    try {
      const updated = await addItineraryItem(trip.id, newItemData as ItineraryItem);
      setTrip(updated);
      setShowAddItem(false);
      // 重置表单
      setNewItemData({
        dayIndex: 1,
        startTime: '09:00',
        endTime: '10:00',
        title: '',
        type: 'attraction',
        location: '',
        description: '',
        estimatedCost: 0,
        notes: ''
      });
    } catch (err: any) {
      alert(err.response?.data?.error || '添加失败');
    }
  };

  // 更新临时行程项字段
  const updateTempItemField = (field: keyof ItineraryItem, value: any) => {
    if (tempItem) {
      setTempItem({ ...tempItem, [field]: value });
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getTypeIcon = (type: string) => {
    const iconMap: { [key: string]: string } = {
      'attraction': '🎯',
      'restaurant': '🍽️',
      'hotel': '🏨',
      'transport': '🚗',
      'other': '📌'
    };
    return iconMap[type] || '📌';
  };

  const getTypeText = (type: string) => {
    const textMap: { [key: string]: string } = {
      'attraction': '景点',
      'restaurant': '餐饮',
      'hotel': '住宿',
      'transport': '交通',
      'other': '其他'
    };
    return textMap[type] || type;
  };

  // 按天分组行程
  const groupByDay = () => {
    if (!trip?.itinerary) return [];
    
    const grouped: { [key: number]: typeof trip.itinerary } = {};
    trip.itinerary.forEach(item => {
      if (!grouped[item.dayIndex]) {
        grouped[item.dayIndex] = [];
      }
      grouped[item.dayIndex].push(item);
    });

    return Object.keys(grouped)
      .map(key => parseInt(key))
      .sort((a, b) => a - b)
      .map(dayIndex => ({
        day: dayIndex,
        items: grouped[dayIndex]
      }));
  };

  // 提取地图位置数据
  const getMapLocations = () => {
    if (!trip?.itinerary) return [];
    
    let filteredItinerary = trip.itinerary;
    
    // 如果选择了特定天数，则只显示该天的地点
    if (selectedDay !== 'all') {
      filteredItinerary = trip.itinerary.filter(item => item.dayIndex === selectedDay);
    }
    
    return filteredItinerary
      .map((item, index) => {
        // 确保坐标是有效的数字
        const lng = item.coordinates?.lng;
        const lat = item.coordinates?.lat;
        
        // 严格验证坐标有效性
        if (
          typeof lng !== 'number' || 
          typeof lat !== 'number' || 
          isNaN(lng) || 
          isNaN(lat) ||
          lng === 0 || 
          lat === 0
        ) {
          return null;
        }
        
        return {
          lng,
          lat,
          name: item.title,
          type: item.type as 'hotel' | 'attraction' | 'restaurant' | 'other',
          id: index, // 添加唯一标识符，支持重复地点
          dayIndex: item.dayIndex // 记录是第几天
        };
      })
      .filter((loc): loc is NonNullable<typeof loc> => loc !== null); // 过滤掉无效坐标
  };

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '1.2rem', color: '#666' }}>加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '1.2rem', color: '#e74c3c', marginBottom: '1rem' }}>
            {error || '行程不存在'}
          </p>
          <button
            onClick={() => navigate('/trips')}
            style={{
              padding: '0.8rem 1.5rem',
              fontSize: '1rem',
              backgroundColor: '#4a90e2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            返回行程列表
          </button>
        </div>
      </div>
    );
  }

  const dayGroups = groupByDay();

  return (
    <div className="container">
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
        {/* 返回按钮 */}
        <button
          onClick={() => navigate('/trips')}
          style={{
            padding: '0.6rem 1.2rem',
            fontSize: '0.95rem',
            backgroundColor: 'transparent',
            color: '#4a90e2',
            border: '1px solid #4a90e2',
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '1.5rem'
          }}
        >
          ← 返回列表
        </button>

        {/* 行程头部 */}
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          border: '1px solid #e0e0e0',
          marginBottom: '2rem'
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#2c3e50' }}>
            {trip.title}
          </h1>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '0.5rem' }}>
              📍 目的地：{trip.destination}
            </p>
            <p style={{ fontSize: '1rem', color: '#888' }}>
              📅 {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
            </p>
            <p style={{ fontSize: '1rem', color: '#888' }}>
              👥 人数：{trip.participants} 人
            </p>
          </div>

          {/* 预算概览 */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '1.5rem',
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              marginBottom: '1rem',
              gap: '0.8rem'
            }}>
              <h3 style={{ fontSize: '1.2rem', margin: 0, color: '#2c3e50' }}>
                💰 预算概览
              </h3>
              {!editingBudget && (
                <button
                  onClick={startEditBudget}
                  style={{
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.9rem',
                    backgroundColor: '#4a90e2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  ✏️ 编辑预算
                </button>
              )}
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div>
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.3rem' }}>
                  预算总额
                </p>
                {editingBudget ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="number"
                      value={tempBudget}
                      onChange={(e) => setTempBudget(Number(e.target.value))}
                      style={{
                        fontSize: '1.2rem',
                        padding: '0.3rem',
                        border: '2px solid #4a90e2',
                        borderRadius: '4px',
                        width: '120px'
                      }}
                    />
                    <button
                      onClick={saveBudget}
                      style={{
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.8rem',
                        backgroundColor: '#27ae60',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      ✓
                    </button>
                    <button
                      onClick={cancelEditBudget}
                      style={{
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.8rem',
                        backgroundColor: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2c3e50' }}>
                    ¥{trip.budgetSummary.totalBudget.toLocaleString()}
                  </p>
                )}
              </div>
              <div>
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.3rem' }}>
                  预计花费
                </p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#e67e22' }}>
                  ¥{trip.budgetSummary.estimatedCost.toLocaleString()}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.3rem' }}>
                  剩余预算
                </p>
                <p style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold', 
                  color: trip.budgetSummary.remaining >= 0 ? '#27ae60' : '#e74c3c'
                }}>
                  ¥{trip.budgetSummary.remaining.toLocaleString()}
                </p>
              </div>
            </div>

            {/* 预算分类 */}
            <h4 style={{ fontSize: '1rem', marginBottom: '0.8rem', color: '#666' }}>
              分类明细
            </h4>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(5, 1fr)', 
              gap: '0.8rem'
            }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: '#666' }}>🚗 交通</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#3498db' }}>
                  ¥{trip.budgetSummary.breakdown.transport.toLocaleString()}
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: '#666' }}>🏨 住宿</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#9b59b6' }}>
                  ¥{trip.budgetSummary.breakdown.accommodation.toLocaleString()}
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: '#666' }}>🍽️ 餐饮</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#e67e22' }}>
                  ¥{trip.budgetSummary.breakdown.food.toLocaleString()}
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: '#666' }}>🎯 景点</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#27ae60' }}>
                  ¥{trip.budgetSummary.breakdown.attractions.toLocaleString()}
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: '#666' }}>📌 其他</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#95a5a6' }}>
                  ¥{trip.budgetSummary.breakdown.other.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* 地图显示切换 */}
          <div style={{ marginBottom: '1rem' }}>
            <button
              onClick={() => setShowMap(!showMap)}
              style={{
                padding: '0.8rem 1.5rem',
                fontSize: '1rem',
                backgroundColor: showMap ? '#4a90e2' : 'transparent',
                color: showMap ? 'white' : '#4a90e2',
                border: '1px solid #4a90e2',
                borderRadius: '6px',
                cursor: 'pointer',
                marginRight: '1rem'
              }}
            >
              {showMap ? '🗺️ 隐藏地图' : '🗺️ 显示地图'}
            </button>
          </div>

          {/* 删除按钮 */}
          <button
            onClick={handleDelete}
            style={{
              padding: '0.8rem 1.5rem',
              fontSize: '1rem',
              backgroundColor: 'transparent',
              color: '#e74c3c',
              border: '1px solid #e74c3c',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            🗑️ 删除此行程
          </button>
        </div>

        {/* 地图视图 */}
        {showMap && (
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid #e0e0e0',
            marginBottom: '2rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h2 style={{ fontSize: '1.5rem', margin: 0, color: '#2c3e50' }}>
                🗺️ 地图视图
              </h2>
              
              {/* 天数选择下拉框 */}
              {trip?.itinerary && trip.itinerary.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label htmlFor="day-select" style={{ color: '#2c3e50', fontWeight: '500' }}>
                    选择行程：
                  </label>
                  <select
                    id="day-select"
                    value={selectedDay}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedDay(value === 'all' ? 'all' : parseInt(value));
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      border: '1px solid #ccc',
                      backgroundColor: '#fff',
                      color: '#2c3e50',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: '500'
                    }}
                  >
                    <option value="all">所有天数</option>
                    {Array.from(
                      new Set(trip.itinerary.map(item => item.dayIndex))
                    ).sort((a, b) => a - b).map(day => (
                      <option key={day} value={day}>
                        第 {day} 天
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            
            {(() => {
              const mapLocations = getMapLocations();
              // 只有在选择单个天数时才显示路线规划
              const shouldShowRoute = selectedDay !== 'all';
              
              return mapLocations.length > 0 ? (
                <div style={{ height: '600px', width: '100%' }}>
                  <MapView
                    locations={mapLocations}
                    center={mapLocations[0]}
                    zoom={12}
                    showRoute={shouldShowRoute}
                  />
                </div>
              ) : (
                <div style={{
                  padding: '3rem',
                  textAlign: 'center',
                  color: '#999',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px'
                }}>
                  <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>📍 暂无位置信息</p>
                  <p style={{ fontSize: '0.9rem' }}>
                    当前行程项目没有坐标数据,无法在地图上显示。
                    <br />
                    请运行数据库脚本 backend/test-map-coordinates.sql 添加测试坐标。
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* 详细行程 */}
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#2c3e50' }}>
            📋 详细行程
          </h2>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <button
              onClick={() => setShowAddItem(!showAddItem)}
              style={{
                padding: '0.6rem 1.2rem',
                backgroundColor: '#27ae60',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                transition: 'background-color 0.3s'
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#229954')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#27ae60')}
            >
              {showAddItem ? '✕ 取消' : '＋ 添加日程'}
            </button>
          </div>

          {/* 添加新日程项表单 */}
          {showAddItem && (
            <div style={{
              backgroundColor: '#f0f8ff',
              padding: '1.5rem',
              borderRadius: '12px',
              border: '2px solid #3498db',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ fontSize: '1.2rem', marginTop: 0, color: '#2c3e50' }}>
                ➕ 添加新日程项
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1rem'
              }}>
                {/* 天数 */}
                <div>
                  <label style={{ fontWeight: '500', color: '#2c3e50' }}>第几天 *</label>
                  <select
                    value={newItemData.dayIndex}
                    onChange={(e) => setNewItemData({ ...newItemData, dayIndex: parseInt(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      marginTop: '0.3rem'
                    }}
                  >
                    {trip?.itinerary && Array.from(
                      new Set(trip.itinerary.map(item => item.dayIndex))
                    ).sort((a, b) => a - b).map(day => (
                      <option key={day} value={day}>第 {day} 天</option>
                    ))}
                  </select>
                </div>

                {/* 类型 */}
                <div>
                  <label style={{ fontWeight: '500', color: '#2c3e50' }}>类型</label>
                  <select
                    value={newItemData.type}
                    onChange={(e) => setNewItemData({ ...newItemData, type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      marginTop: '0.3rem'
                    }}
                  >
                    <option value="attraction">景点</option>
                    <option value="restaurant">餐厅</option>
                    <option value="hotel">酒店</option>
                    <option value="transport">交通</option>
                    <option value="other">其他</option>
                  </select>
                </div>

                {/* 开始时间 */}
                <div>
                  <label style={{ fontWeight: '500', color: '#2c3e50' }}>开始时间</label>
                  <input
                    type="time"
                    value={newItemData.startTime}
                    onChange={(e) => setNewItemData({ ...newItemData, startTime: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      marginTop: '0.3rem'
                    }}
                  />
                </div>

                {/* 结束时间 */}
                <div>
                  <label style={{ fontWeight: '500', color: '#2c3e50' }}>结束时间</label>
                  <input
                    type="time"
                    value={newItemData.endTime}
                    onChange={(e) => setNewItemData({ ...newItemData, endTime: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      marginTop: '0.3rem'
                    }}
                  />
                </div>
              </div>

              {/* 标题 */}
              <div style={{ marginTop: '1rem' }}>
                <label style={{ fontWeight: '500', color: '#2c3e50' }}>标题 *</label>
                <input
                  type="text"
                  value={newItemData.title}
                  onChange={(e) => setNewItemData({ ...newItemData, title: e.target.value })}
                  placeholder="请输入日程标题"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    marginTop: '0.3rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* 地点/地址 */}
              <div style={{ marginTop: '1rem' }}>
                <label style={{ fontWeight: '500', color: '#2c3e50' }}>地点/地址 * (会自动更新地图)</label>
                <input
                  type="text"
                  value={newItemData.location}
                  onChange={(e) => setNewItemData({ ...newItemData, location: e.target.value })}
                  placeholder="请输入具体地址，如：北京市朝阳区XXX"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    marginTop: '0.3rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* 描述 */}
              <div style={{ marginTop: '1rem' }}>
                <label style={{ fontWeight: '500', color: '#2c3e50' }}>描述</label>
                <textarea
                  value={newItemData.description}
                  onChange={(e) => setNewItemData({ ...newItemData, description: e.target.value })}
                  placeholder="请输入日程描述"
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    marginTop: '0.3rem',
                    boxSizing: 'border-box',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* 成本和备注 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginTop: '1rem'
              }}>
                <div>
                  <label style={{ fontWeight: '500', color: '#2c3e50' }}>预估成本 (元)</label>
                  <input
                    type="number"
                    value={newItemData.estimatedCost}
                    onChange={(e) => setNewItemData({ ...newItemData, estimatedCost: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      marginTop: '0.3rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontWeight: '500', color: '#2c3e50' }}>备注</label>
                  <input
                    type="text"
                    value={newItemData.notes}
                    onChange={(e) => setNewItemData({ ...newItemData, notes: e.target.value })}
                    placeholder="添加备注（可选）"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      marginTop: '0.3rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* 提交按钮 */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                marginTop: '1.5rem'
              }}>
                <button
                  onClick={handleAddItem}
                  style={{
                    padding: '0.6rem 1.2rem',
                    backgroundColor: '#27ae60',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}
                >
                  ✓ 确认添加
                </button>
                <button
                  onClick={() => setShowAddItem(false)}
                  style={{
                    padding: '0.6rem 1.2rem',
                    backgroundColor: '#95a5a6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}
                >
                  ✕ 取消
                </button>
              </div>
            </div>
          )}

          {dayGroups.map(({ day, items }) => (
            <div
              key={day}
              style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid #e0e0e0',
                marginBottom: '1.5rem'
              }}
            >
              <h3 style={{ 
                fontSize: '1.3rem', 
                marginBottom: '1.2rem',
                color: '#4a90e2',
                borderLeft: '4px solid #4a90e2',
                paddingLeft: '1rem'
              }}>
                第 {day} 天
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {items.map((item, itemIdx) => {
                  const globalIndex = trip.itinerary!.findIndex(i => i === item);
                  const isEditing = editingItemId === globalIndex;
                  const displayItem = isEditing && tempItem ? tempItem : item;
                  
                  return (
                    <div
                      key={itemIdx}
                      style={{
                        display: 'flex',
                        gap: '1rem',
                        padding: '1rem',
                        backgroundColor: isEditing ? '#fff3cd' : '#f8f9fa',
                        borderRadius: '8px',
                        borderLeft: `3px solid ${isEditing ? '#ffc107' : '#4a90e2'}`
                      }}
                    >
                      {/* 时间区域 */}
                      <div style={{ minWidth: '140px' }}>
                        {isEditing ? (
                          <div>
                            <input
                              type="time"
                              value={displayItem.startTime}
                              onChange={(e) => updateTempItemField('startTime', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '0.3rem',
                                marginBottom: '0.3rem',
                                border: '1px solid #ccc',
                                borderRadius: '4px'
                              }}
                            />
                            <input
                              type="time"
                              value={displayItem.endTime}
                              onChange={(e) => updateTempItemField('endTime', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '0.3rem',
                                border: '1px solid #ccc',
                                borderRadius: '4px'
                              }}
                            />
                          </div>
                        ) : (
                          <p style={{ 
                            fontSize: '1rem', 
                            fontWeight: 'bold', 
                            color: '#2c3e50',
                            margin: 0
                          }}>
                            {displayItem.startTime}
                            {displayItem.endTime && ` - ${displayItem.endTime}`}
                          </p>
                        )}
                      </div>

                      {/* 内容 */}
                      <div style={{ flex: 1 }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <input
                              type="text"
                              value={displayItem.title}
                              onChange={(e) => updateTempItemField('title', e.target.value)}
                              placeholder="标题"
                              style={{
                                padding: '0.5rem',
                                fontSize: '1rem',
                                border: '1px solid #ccc',
                                borderRadius: '4px'
                              }}
                            />
                            <input
                              type="text"
                              value={displayItem.location}
                              onChange={(e) => updateTempItemField('location', e.target.value)}
                              placeholder="地点"
                              style={{
                                padding: '0.5rem',
                                fontSize: '0.9rem',
                                border: '1px solid #ccc',
                                borderRadius: '4px'
                              }}
                            />
                            <textarea
                              value={displayItem.description}
                              onChange={(e) => updateTempItemField('description', e.target.value)}
                              placeholder="描述"
                              rows={2}
                              style={{
                                padding: '0.5rem',
                                fontSize: '0.9rem',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                resize: 'vertical'
                              }}
                            />
                            <input
                              type="text"
                              value={displayItem.notes || ''}
                              onChange={(e) => updateTempItemField('notes', e.target.value)}
                              placeholder="备注"
                              style={{
                                padding: '0.5rem',
                                fontSize: '0.85rem',
                                border: '1px solid #ccc',
                                borderRadius: '4px'
                              }}
                            />
                          </div>
                        ) : (
                          <>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '0.5rem',
                              marginBottom: '0.5rem'
                            }}>
                              <span style={{ fontSize: '1.2rem' }}>
                                {getTypeIcon(displayItem.type)}
                              </span>
                              <h4 style={{ fontSize: '1.1rem', color: '#2c3e50' }}>
                                {displayItem.title}
                              </h4>
                              <span style={{
                                fontSize: '0.8rem',
                                padding: '0.2rem 0.6rem',
                                backgroundColor: '#e3f2fd',
                                color: '#1976d2',
                                borderRadius: '10px'
                              }}>
                                {getTypeText(displayItem.type)}
                              </span>
                            </div>

                            <p style={{ 
                              fontSize: '0.9rem', 
                              color: '#666',
                              marginBottom: '0.3rem'
                            }}>
                              📍 {displayItem.location}
                            </p>

                            {displayItem.description && (
                              <p style={{ 
                                fontSize: '0.95rem', 
                                color: '#555',
                                marginBottom: '0.3rem'
                              }}>
                                {displayItem.description}
                              </p>
                            )}

                            {displayItem.notes && (
                              <p style={{ 
                                fontSize: '0.85rem', 
                                color: '#888',
                                fontStyle: 'italic'
                              }}>
                                💡 {displayItem.notes}
                              </p>
                            )}
                          </>
                        )}
                      </div>

                      {/* 费用和按钮区域 */}
                      <div style={{ minWidth: '120px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                        {isEditing ? (
                          <div>
                            <input
                              type="number"
                              value={displayItem.estimatedCost}
                              onChange={(e) => updateTempItemField('estimatedCost', Number(e.target.value))}
                              style={{
                                width: '100px',
                                padding: '0.3rem',
                                fontSize: '1rem',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                marginBottom: '0.5rem'
                              }}
                            />
                            <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => saveItem(globalIndex)}
                                style={{
                                  padding: '0.3rem 0.6rem',
                                  fontSize: '0.8rem',
                                  backgroundColor: '#27ae60',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                ✓ 保存
                              </button>
                              <button
                                onClick={cancelEditItem}
                                style={{
                                  padding: '0.3rem 0.6rem',
                                  fontSize: '0.8rem',
                                  backgroundColor: '#95a5a6',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                ✕ 取消
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p style={{ 
                              fontSize: '1.1rem', 
                              fontWeight: 'bold', 
                              color: '#e67e22',
                              margin: 0
                            }}>
                              ¥{displayItem.estimatedCost.toLocaleString()}
                            </p>
                            
                            {/* 编辑/删除按钮 */}
                            <div style={{
                              display: 'flex',
                              gap: '0.3rem'
                            }}>
                              <button
                                onClick={() => startEditItem(item, globalIndex)}
                                style={{
                                  padding: '0.3rem 0.5rem',
                                  fontSize: '0.75rem',
                                  backgroundColor: '#4a90e2',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteItem(globalIndex)}
                                style={{
                                  padding: '0.3rem 0.5rem',
                                  fontSize: '0.75rem',
                                  backgroundColor: '#e74c3c',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                🗑️
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {dayGroups.length === 0 && (
            <div style={{
              backgroundColor: 'white',
              padding: '3rem',
              borderRadius: '12px',
              border: '1px solid #e0e0e0',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '1.1rem', color: '#999' }}>
                暂无行程安排
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
