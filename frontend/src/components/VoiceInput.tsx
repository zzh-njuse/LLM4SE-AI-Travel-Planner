import { useState, useEffect } from 'react';
import { XFYunSpeechRecognizer, getXFYunConfig, saveXFYunConfig } from '../services/xfyun';

interface VoiceInputProps {
  onResult: (text: string) => void;
  placeholder?: string;
}

export default function VoiceInput({ onResult, placeholder }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);
  const [recognizer, setRecognizer] = useState<XFYunSpeechRecognizer | null>(null);

  const [config, setConfig] = useState({
    appId: '',
    apiKey: '',
    apiSecret: ''
  });

  useEffect(() => {
    // 检查是否已有配置,并加载到表单
    const savedConfig = getXFYunConfig();
    if (savedConfig) {
      setHasConfig(true);
      setConfig(savedConfig); // 加载已保存的配置到表单
      setRecognizer(new XFYunSpeechRecognizer(savedConfig));
    }
  }, []);

  const handleSaveConfig = () => {
    if (!config.appId || !config.apiKey || !config.apiSecret) {
      setError('请填写完整的配置信息');
      setSuccessMsg('');
      return;
    }

    saveXFYunConfig(config);
    setRecognizer(new XFYunSpeechRecognizer(config));
    setHasConfig(true);
    setShowConfig(false);
    setError('');
    setSuccessMsg('✅ 配置已保存成功!');
    
    // 3秒后清除成功提示
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const startRecording = async () => {
    if (!recognizer) {
      setShowConfig(true);
      setError('请先配置科大讯飞语音识别参数');
      return;
    }

    setIsRecording(true);
    setRecognizedText('');
    setError('');

    try {
      await recognizer.startRecognition(
        (result) => {
          // 科大讯飞返回的是完整句子,直接替换而不是累加
          setRecognizedText(result.text);
          
          // 只在识别完成时才传递最终结果
          if (result.isFinal) {
            onResult(result.text);
          }
        },
        (errorMsg) => {
          setError(errorMsg);
          setIsRecording(false);
        }
      );
    } catch (err: any) {
      setError(err.message || '启动录音失败');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognizer) {
      recognizer.stopRecognition();
      // 不在这里调用 onResult,等待 isFinal: true 的回调
    }
    setIsRecording(false);
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isRecording && !recognizer}
          style={{
            padding: '0.8rem 1.5rem',
            fontSize: '1rem',
            fontWeight: 'bold',
            backgroundColor: isRecording ? '#e74c3c' : '#4a90e2',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            opacity: (isRecording && !recognizer) ? 0.6 : 1
          }}
        >
          {isRecording ? (
            <>
              <span style={{ 
                display: 'inline-block',
                width: '8px',
                height: '8px',
                backgroundColor: 'white',
                borderRadius: '50%',
                animation: 'pulse 1s infinite'
              }}></span>
              停止录音
            </>
          ) : (
            <>🎤 开始语音输入</>
          )}
        </button>

        <button
          type="button"
          onClick={() => setShowConfig(!showConfig)}
          style={{
            padding: '0.8rem 1.5rem',
            fontSize: '0.9rem',
            backgroundColor: hasConfig ? '#f8f9fa' : 'transparent',
            color: hasConfig ? '#27ae60' : '#4a90e2',
            border: `1px solid ${hasConfig ? '#27ae60' : '#4a90e2'}`,
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}
        >
          {hasConfig ? '✅ 修改配置' : '⚙️ 配置语音识别'}
        </button>
      </div>

      {isRecording && recognizedText && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: '#e3f2fd',
          borderRadius: '8px',
          fontSize: '0.95rem',
          color: '#1976d2'
        }}>
          <strong>识别中：</strong> {recognizedText}
        </div>
      )}

      {error && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: '#fee',
          borderRadius: '8px',
          fontSize: '0.9rem',
          color: '#c33'
        }}>
          ❌ {error}
        </div>
      )}

      {successMsg && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: '#d4edda',
          borderRadius: '8px',
          fontSize: '0.9rem',
          color: '#155724',
          border: '1px solid #c3e6cb'
        }}>
          {successMsg}
        </div>
      )}

      {showConfig && (
        <div style={{
          marginTop: '1rem',
          padding: '1.5rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #ddd'
        }}>
          <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>科大讯飞语音识别配置</h3>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
            请在 <a href="https://console.xfyun.cn/" target="_blank" rel="noopener noreferrer" style={{ color: '#4a90e2' }}>科大讯飞开放平台</a> 创建应用并获取以下参数
          </p>
          
          {hasConfig && (
            <div style={{
              padding: '0.8rem',
              backgroundColor: '#fff3cd',
              borderRadius: '4px',
              marginBottom: '1rem',
              fontSize: '0.85rem',
              color: '#856404',
              border: '1px solid #ffeaa7'
            }}>
              💡 <strong>提示:</strong> 如果连接失败(错误码1006),请检查API Key和API Secret是否填反了
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              APPID
            </label>
            <input
              type="text"
              value={config.appId}
              onChange={(e) => setConfig({ ...config, appId: e.target.value })}
              placeholder="例如：5f9abc12"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              API Key
            </label>
            <input
              type="text"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="例如：a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              API Secret
            </label>
            <input
              type="password"
              value={config.apiSecret}
              onChange={(e) => setConfig({ ...config, apiSecret: e.target.value })}
              placeholder="例如：q1w2e3r4t5y6u7i8o9p0a1s2d3f4g5h6"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleSaveConfig}
              style={{
                padding: '0.6rem 1.2rem',
                fontSize: '0.9rem',
                backgroundColor: '#4a90e2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              保存配置
            </button>
            <button
              type="button"
              onClick={() => setShowConfig(false)}
              style={{
                padding: '0.6rem 1.2rem',
                fontSize: '0.9rem',
                backgroundColor: 'transparent',
                color: '#666',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
