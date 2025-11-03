import { useState, useEffect } from 'react';
import { XFYunSpeechRecognizer } from '../services/xfyun';
import axios from 'axios';

interface VoiceInputProps {
  onResult: (text: string) => void;
  placeholder?: string;
}

export default function VoiceInput({ onResult, placeholder }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [error, setError] = useState('');
  const [recognizer, setRecognizer] = useState<XFYunSpeechRecognizer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 从后端获取科大讯飞配置
    const fetchXFYunConfig = async () => {
      try {
        const response = await axios.get('http://localhost:8081/api/v1/config/xfyun');
        const config = response.data;
        
        if (config.appId && config.apiKey && config.apiSecret) {
          setRecognizer(new XFYunSpeechRecognizer(config));
          setIsLoading(false);
        } else {
          setError('后端未配置科大讯飞语音识别 API');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('获取语音配置失败:', err);
        setError('无法获取语音识别配置,请检查后端服务');
        setIsLoading(false);
      }
    };

    fetchXFYunConfig();
  }, []);

  const startRecording = async () => {
    if (!recognizer) {
      setError('语音识别未初始化,请检查后端配置');
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
          disabled={isLoading || !recognizer}
          style={{
            padding: '0.8rem 1.5rem',
            fontSize: '1rem',
            fontWeight: 'bold',
            backgroundColor: isRecording ? '#e74c3c' : '#4a90e2',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: (isLoading || !recognizer) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            opacity: (isLoading || !recognizer) ? 0.6 : 1
          }}
        >
          {isLoading ? (
            <>⏳ 加载中...</>
          ) : isRecording ? (
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

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
