import { useState } from 'react';
import { XFYunSpeechRecognizer, getXFYunConfig } from '../services/xfyun';

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
  const [recognizer] = useState<XFYunSpeechRecognizer | null>(() => {
    const config = getXFYunConfig();
    return config ? new XFYunSpeechRecognizer(config) : null;
  });

  const startRecording = async () => {
    if (!recognizer) {
      alert('请先在顶部配置科大讯飞语音识别参数');
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
