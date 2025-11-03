import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTrip, CreateTripRequest } from '../services/trip';
import VoiceInput from '../components/VoiceInput';
import MiniVoiceInput from '../components/MiniVoiceInput';
import { parseTripInput } from '../utils/voiceParser';
import '../styles.css';

export default function CreateTrip() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<CreateTripRequest>({
    destination: '',
    startDate: '',
    endDate: '',
    participants: 1,
    budget: 1000,
    preferences: '',
    rawInput: ''
  });

  useEffect(() => {
    // 检查是否登录
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const trip = await createTrip(formData);
      // 跳转到行程详情页
      navigate(`/trips/${trip.id}`);
    } catch (err: any) {
      console.error('创建行程失败:', err);
      // 如果是 401 错误,说明 token 失效,跳转到登录页
      if (err.response?.status === 401) {
        localStorage.removeItem('auth_token');
        navigate('/login');
        return;
      }
      setError(err.response?.data?.error || err.message || '创建行程失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'participants' || name === 'budget' ? Number(value) : value
    }));
  };

  const handleVoiceResult = (text: string) => {
    // 将语音识别结果添加到 rawInput
    setFormData(prev => ({
      ...prev,
      rawInput: prev.rawInput ? prev.rawInput + ' ' + text : text
    }));
    
    // 智能解析语音输入,自动填充表单字段
    const parsed = parseTripInput(text);
    console.log('解析结果:', parsed);
    
    setFormData(prev => ({
      ...prev,
      destination: parsed.destination || prev.destination,
      startDate: parsed.startDate || prev.startDate,
      endDate: parsed.endDate || prev.endDate,
      participants: parsed.participants || prev.participants,
      budget: parsed.budget || prev.budget,
      preferences: parsed.preferences || prev.preferences
    }));
  };

  // 单个字段的语音输入处理
  const handleFieldVoice = (field: keyof CreateTripRequest, text: string) => {
    console.log(`字段 ${field} 收到语音:`, text);
    
    if (field === 'destination') {
      const parsed = parseTripInput(text);
      setFormData(prev => ({
        ...prev,
        destination: parsed.destination || text.trim()
      }));
    } else if (field === 'startDate') {
      // 只更新出发日期字段
      const parsed = parseTripInput(text);
      if (parsed.startDate) {
        setFormData(prev => ({ ...prev, startDate: parsed.startDate! }));
      }
    } else if (field === 'endDate') {
      // 只更新返回日期字段
      const parsed = parseTripInput(text);
      // 优先使用 endDate,如果没有就用 startDate(因为用户可能只说了一个日期)
      const dateToUse = parsed.endDate || parsed.startDate;
      if (dateToUse) {
        setFormData(prev => ({ ...prev, endDate: dateToUse }));
      }
    } else if (field === 'participants') {
      const parsed = parseTripInput(text);
      setFormData(prev => ({
        ...prev,
        participants: parsed.participants || prev.participants
      }));
    } else if (field === 'budget') {
      const parsed = parseTripInput(text);
      setFormData(prev => ({
        ...prev,
        budget: parsed.budget || prev.budget
      }));
    } else if (field === 'preferences') {
      const parsed = parseTripInput(text);
      setFormData(prev => ({
        ...prev,
        preferences: parsed.preferences || text.trim()
      }));
    }
  };

  return (
    <div className="container">
      <div className="form-container">
        <h1>✨ AI 行程规划</h1>
        <p style={{ color: '#666', marginBottom: '2rem' }}>
          您可以使用语音输入或文字输入告诉我们您的旅行想法
        </p>

        {error && (
          <div style={{ 
            padding: '1rem', 
            backgroundColor: '#fee', 
            color: '#c33',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* 语音输入 */}
          <div className="form-group">
            <label>🎤 语音输入旅行想法</label>
            <VoiceInput onResult={handleVoiceResult} />
          </div>

          {/* 自然语言输入 */}
          <div className="form-group">
            <label>💭 描述您的旅行想法（可选）</label>
            <textarea
              name="rawInput"
              value={formData.rawInput}
              onChange={handleChange}
              placeholder="例如：我想去杭州玩三天，预算3000元，两个人，喜欢自然风光和美食..."
              rows={4}
              style={{ 
                width: '100%', 
                padding: '0.8rem',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '1rem',
                fontFamily: 'inherit'
              }}
            />
            <small style={{ color: '#888', fontSize: '0.85rem' }}>
              提示：使用上方的语音按钮，说出您的旅行计划，识别结果会自动填入此处
            </small>
          </div>

          {/* 目的地 */}
          <div className="form-group">
            <label>📍 目的地 *</label>
            <div className="input-with-voice">
              <input
                type="text"
                name="destination"
                value={formData.destination}
                onChange={handleChange}
                required
                placeholder="例如：杭州"
              />
              <MiniVoiceInput 
                onResult={(text) => handleFieldVoice('destination', text)}
                placeholder="语音输入目的地"
              />
            </div>
          </div>

          {/* 日期范围 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>📅 出发日期 *</label>
              <div className="input-with-voice">
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                />
                <MiniVoiceInput 
                  onResult={(text) => handleFieldVoice('startDate', text)}
                  placeholder="语音输入日期"
                />
              </div>
              <small style={{ color: '#888', fontSize: '0.8rem', display: 'block', marginTop: '0.3rem' }}>
                语音: "11月15日出发"
              </small>
            </div>
            <div className="form-group">
              <label>📅 返回日期 *</label>
              <div className="input-with-voice">
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                />
                <MiniVoiceInput 
                  onResult={(text) => handleFieldVoice('endDate', text)}
                  placeholder="语音输入日期"
                />
              </div>
              <small style={{ color: '#888', fontSize: '0.8rem', display: 'block', marginTop: '0.3rem' }}>
                或说: "玩三天"
              </small>
            </div>
          </div>

          {/* 人数和预算 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>👥 人数 *</label>
              <div className="input-with-voice">
                <input
                  type="number"
                  name="participants"
                  value={formData.participants}
                  onChange={handleChange}
                  required
                  min="1"
                  max="20"
                />
                <MiniVoiceInput 
                  onResult={(text) => handleFieldVoice('participants', text)}
                  placeholder="语音输入人数"
                />
              </div>
              <small style={{ color: '#888', fontSize: '0.8rem', display: 'block', marginTop: '0.3rem' }}>
                语音: "两个人"
              </small>
            </div>
            <div className="form-group">
              <label>💰 预算（元）*</label>
              <div className="input-with-voice">
                <input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  required
                  min="100"
                  step="100"
                />
                <MiniVoiceInput 
                  onResult={(text) => handleFieldVoice('budget', text)}
                  placeholder="语音输入预算"
                />
              </div>
              <small style={{ color: '#888', fontSize: '0.8rem', display: 'block', marginTop: '0.3rem' }}>
                语音: "预算3000元"
              </small>
            </div>
          </div>

          {/* 偏好 */}
          <div className="form-group">
            <label>❤️ 旅行偏好（可选）</label>
            <div className="input-with-voice">
              <input
                type="text"
                name="preferences"
                value={formData.preferences}
                onChange={handleChange}
                placeholder="例如：喜欢自然风光、美食、历史文化..."
              />
              <MiniVoiceInput 
                onResult={(text) => handleFieldVoice('preferences', text)}
                placeholder="语音输入偏好"
              />
            </div>
            <small style={{ color: '#888', fontSize: '0.8rem', display: 'block', marginTop: '0.3rem' }}>
              语音: "喜欢美食和自然风光"
            </small>
          </div>

          {/* 提交按钮 */}
          <button 
            type="submit" 
            className="submit-button"
            disabled={loading}
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              backgroundColor: loading ? '#ccc' : '#4a90e2',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '1rem'
            }}
          >
            {loading ? '🤖 AI 正在规划行程，请稍候...' : '🚀 开始规划'}
          </button>

          {loading && (
            <p style={{ 
              textAlign: 'center', 
              color: '#666',
              marginTop: '1rem'
            }}>
              这通常需要 10-20 秒，请耐心等待...
            </p>
          )}
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button
            onClick={() => navigate('/trips')}
            style={{
              background: 'none',
              border: 'none',
              color: '#4a90e2',
              cursor: 'pointer',
              fontSize: '1rem',
              textDecoration: 'underline',
              whiteSpace: 'nowrap'
            }}
          >
            查看我的行程
          </button>
        </div>
      </div>
    </div>
  );
}
