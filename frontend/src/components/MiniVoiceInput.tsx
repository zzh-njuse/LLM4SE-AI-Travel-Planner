import { useState, useEffect } from 'react';
import axios from 'axios';
import { XFYunSpeechRecognizer } from '../services/xfyun';

interface MiniVoiceInputProps {
  onResult: (text: string) => void;
  placeholder?: string;
}

/**
 * 迷你语音输入按钮 - 用于单个字段的语音输入
 */
export default function MiniVoiceInput({ onResult, placeholder }: MiniVoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [recognizer, setRecognizer] = useState<XFYunSpeechRecognizer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // 尝试从后端获取科大讯飞配置（与 VoiceInput 保持一致）
    const fetchConfig = async () => {
      try {
        const resp = await axios.get('http://localhost:8081/api/v1/config/xfyun');
        const config = resp.data;
        if (config && config.appId && config.apiKey && config.apiSecret) {
          setRecognizer(new XFYunSpeechRecognizer(config));
        } else {
          setError('后端未配置科大讯飞语音识别参数');
        }
      } catch (err) {
        console.error('获取科大讯飞配置失败:', err);
        setError('无法获取语音识别配置，请检查后端服务');
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const startRecording = async () => {
    if (isLoading) {
      return;
    }

    if (!recognizer) {
      // 兼容旧有行为：给出提示，但也在 UI 中显示错误
      alert(error || '请先在顶部配置科大讯飞语音识别参数');
      return;
    }

    setIsRecording(true);
    setRecognizedText('');

    try {
      await recognizer.startRecognition(
        (result) => {
          setRecognizedText(result.text);
          if (result.isFinal) {
            onResult(result.text);
          }
        },
        (errorMsg) => {
          console.error('语音识别错误:', errorMsg);
          setIsRecording(false);
        }
      );
    } catch (err: any) {
      console.error('启动录音失败:', err);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognizer) {
      recognizer.stopRecognition();
      if (recognizedText) {
        onResult(recognizedText);
      }
    }
    setIsRecording(false);
  };

  return (
    <button
      type="button"
      onClick={isRecording ? stopRecording : startRecording}
      className={`voice-btn ${isRecording ? 'recording' : ''}`}
      title={placeholder || '点击语音输入'}
    >
      {isRecording ? '🔴' : '🎤'}
    </button>
  );
}
