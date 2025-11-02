import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTripDetail, deleteTrip, Trip } from '../services/trip';
import '../styles.css';

export default function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadTripDetail(parseInt(id));
    }
  }, [id]);

  const loadTripDetail = async (tripId: number) => {
    try {
      setLoading(true);
      const data = await getTripDetail(tripId);
      setTrip(data);
      setError('');
    } catch (err: any) {
      console.error('加载行程详情失败:', err);
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
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#2c3e50' }}>
              💰 预算概览
            </h3>
            
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
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2c3e50' }}>
                  ¥{trip.budgetSummary.totalBudget.toLocaleString()}
                </p>
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

        {/* 详细行程 */}
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#2c3e50' }}>
            📋 详细行程
          </h2>

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
                {items.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      gap: '1rem',
                      padding: '1rem',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      borderLeft: '3px solid #4a90e2'
                    }}
                  >
                    {/* 时间 */}
                    <div style={{ minWidth: '120px' }}>
                      <p style={{ 
                        fontSize: '1rem', 
                        fontWeight: 'bold', 
                        color: '#2c3e50' 
                      }}>
                        {item.startTime}
                        {item.endTime && ` - ${item.endTime}`}
                      </p>
                    </div>

                    {/* 内容 */}
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        marginBottom: '0.5rem'
                      }}>
                        <span style={{ fontSize: '1.2rem' }}>
                          {getTypeIcon(item.type)}
                        </span>
                        <h4 style={{ fontSize: '1.1rem', color: '#2c3e50' }}>
                          {item.title}
                        </h4>
                        <span style={{
                          fontSize: '0.8rem',
                          padding: '0.2rem 0.6rem',
                          backgroundColor: '#e3f2fd',
                          color: '#1976d2',
                          borderRadius: '10px'
                        }}>
                          {getTypeText(item.type)}
                        </span>
                      </div>

                      <p style={{ 
                        fontSize: '0.9rem', 
                        color: '#666',
                        marginBottom: '0.3rem'
                      }}>
                        📍 {item.location}
                      </p>

                      {item.description && (
                        <p style={{ 
                          fontSize: '0.95rem', 
                          color: '#555',
                          marginBottom: '0.3rem'
                        }}>
                          {item.description}
                        </p>
                      )}

                      {item.notes && (
                        <p style={{ 
                          fontSize: '0.85rem', 
                          color: '#888',
                          fontStyle: 'italic'
                        }}>
                          💡 {item.notes}
                        </p>
                      )}
                    </div>

                    {/* 费用 */}
                    <div style={{ minWidth: '100px', textAlign: 'right' }}>
                      <p style={{ 
                        fontSize: '1.1rem', 
                        fontWeight: 'bold', 
                        color: '#e67e22' 
                      }}>
                        ¥{item.estimatedCost.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
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
