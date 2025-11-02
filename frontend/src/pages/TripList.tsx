import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserTrips, deleteTrip, Trip } from '../services/trip';
import '../styles.css';

export default function TripList() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const data = await getUserTrips();
      setTrips(data);
      setError('');
    } catch (err: any) {
      console.error('加载行程失败:', err);
      setError(err.response?.data?.error || '加载行程失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`确定要删除行程"${title}"吗？`)) {
      return;
    }

    try {
      await deleteTrip(id);
      setTrips(trips.filter(t => t.id !== id));
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

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'draft': '草稿',
      'generating': '生成中...',
      'generated': '已生成',
      'confirmed': '已确认'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      'draft': '#999',
      'generating': '#e67e22',
      'generated': '#27ae60',
      'confirmed': '#3498db'
    };
    return colorMap[status] || '#999';
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

  return (
    <div className="container">
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <h1>我的行程</h1>
          <button
            onClick={() => navigate('/trips/new')}
            style={{
              padding: '0.8rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 'bold',
              backgroundColor: '#4a90e2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            ✨ 创建新行程
          </button>
        </div>

        {error && (
          <div style={{ 
            padding: '1rem', 
            backgroundColor: '#fee', 
            color: '#c33',
            borderRadius: '8px',
            marginBottom: '2rem'
          }}>
            {error}
          </div>
        )}

        {trips.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '4rem 2rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '12px'
          }}>
            <p style={{ fontSize: '1.5rem', color: '#999', marginBottom: '1rem' }}>
              📭 您还没有创建任何行程
            </p>
            <p style={{ color: '#666', marginBottom: '2rem' }}>
              点击上方按钮，让 AI 为您规划一次精彩的旅行吧！
            </p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '1.5rem'
          }}>
            {trips.map(trip => (
              <div
                key={trip.id}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div onClick={() => navigate(`/trips/${trip.id}`)}>
                  {/* 状态标签 */}
                  <div style={{ marginBottom: '0.8rem' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.3rem 0.8rem',
                      fontSize: '0.85rem',
                      backgroundColor: getStatusColor(trip.status) + '20',
                      color: getStatusColor(trip.status),
                      borderRadius: '12px',
                      fontWeight: 'bold'
                    }}>
                      {getStatusText(trip.status)}
                    </span>
                  </div>

                  {/* 标题和目的地 */}
                  <h3 style={{ 
                    fontSize: '1.3rem', 
                    marginBottom: '0.5rem',
                    color: '#2c3e50'
                  }}>
                    {trip.title}
                  </h3>
                  <p style={{ 
                    fontSize: '1rem', 
                    color: '#666',
                    marginBottom: '1rem'
                  }}>
                    📍 {trip.destination}
                  </p>

                  {/* 日期 */}
                  <p style={{ 
                    fontSize: '0.9rem', 
                    color: '#888',
                    marginBottom: '1rem'
                  }}>
                    📅 {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                  </p>

                  {/* 预算摘要 */}
                  <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem'
                    }}>
                      <span style={{ color: '#666' }}>预算总额</span>
                      <span style={{ fontWeight: 'bold', color: '#2c3e50' }}>
                        ¥{trip.budgetSummary.totalBudget.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem'
                    }}>
                      <span style={{ color: '#666' }}>预计花费</span>
                      <span style={{ fontWeight: 'bold', color: '#e67e22' }}>
                        ¥{trip.budgetSummary.estimatedCost.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between'
                    }}>
                      <span style={{ color: '#666' }}>剩余预算</span>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: trip.budgetSummary.remaining >= 0 ? '#27ae60' : '#e74c3c'
                      }}>
                        ¥{trip.budgetSummary.remaining.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 删除按钮 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(trip.id, trip.title);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    fontSize: '0.9rem',
                    backgroundColor: 'transparent',
                    color: '#e74c3c',
                    border: '1px solid #e74c3c',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  🗑️ 删除行程
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
