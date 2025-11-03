/**
 * 科大讯飞语音识别服务
 * 文档：https://www.xfyun.cn/doc/asr/voicedictation/API.html
 */

interface XFYunConfig {
  appId: string;
  apiKey: string;
  apiSecret: string;
}

interface RecognitionResult {
  text: string;
  isFinal: boolean;
}

export class XFYunSpeechRecognizer {
  private config: XFYunConfig;
  private socket: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private isRecording = false;
  private onResult: ((result: RecognitionResult) => void) | null = null;
  private onError: ((error: string) => void) | null = null;
  private isFirstFrame = true; // 标记是否是第一帧音频
  private allText = ''; // 累积所有识别到的句子
  private currentSentence = ''; // 当前正在识别的句子
  private lastSn = 0; // 上一次的序号,用于检测新句子

  constructor(config: XFYunConfig) {
    this.config = config;
  }

  /**
   * 开始语音识别
   */
  async startRecognition(
    onResult: (result: RecognitionResult) => void,
    onError: (error: string) => void
  ): Promise<void> {
    this.onResult = onResult;
    this.onError = onError;
    this.isFirstFrame = true; // 重置首帧标记
    this.allText = ''; // 清空累积文本
    this.currentSentence = ''; // 清空当前句子
    this.lastSn = 0; // 重置序号

    try {
      // 请求麦克风权限
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 创建 WebSocket 连接
      await this.connectWebSocket();
      
      // 开始录音
      this.startRecording(stream);
    } catch (error: any) {
      this.handleError('无法访问麦克风：' + error.message);
    }
  }

  /**
   * 停止语音识别
   */
  stopRecognition(): void {
    this.isRecording = false;

    // 清理音频处理器
    if ((this as any).processor) {
      (this as any).processor.disconnect();
    }

    if (this.audioContext) {
      this.audioContext.close();
    }

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      // 发送结束帧 - 只需要data参数,status=2
      this.socket.send(JSON.stringify({
        data: {
          status: 2, // 2 表示最后一帧
          format: 'audio/L16;rate=16000',
          encoding: 'raw',
          audio: '' // 最后一帧音频可以为空
        }
      }));
      
      console.log('发送结束帧');
      
      setTimeout(() => {
        if (this.socket) {
          this.socket.close(1000); // 正常关闭,错误码1000
          this.socket = null;
        }
      }, 1000);
    }
  }

  /**
   * 连接 WebSocket
   */
  private async connectWebSocket(): Promise<void> {
    const url = await this.getWebSocketUrl();
    
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        console.log('WebSocket 连接成功');
        resolve();
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket 错误:', error);
        reject(new Error('WebSocket 连接失败'));
      };

      this.socket.onclose = (event) => {
        console.log('WebSocket 连接关闭, code:', event.code, 'reason:', event.reason);
      };
    });
  }

  /**
   * 生成 WebSocket URL（带鉴权）
   */
  private async getWebSocketUrl(): Promise<string> {
    const { appId, apiKey, apiSecret } = this.config;
    const url = 'wss://iat-api.xfyun.cn/v2/iat';
    const host = 'iat-api.xfyun.cn';
    const path = '/v2/iat';
    const date = new Date().toUTCString();
    
    console.log('=== 开始生成WebSocket URL ===');
    console.log('APPID:', appId);
    console.log('API Key:', apiKey);
    console.log('Date:', date);
    
    // 构建签名原文
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
    console.log('签名原文:\n', signatureOrigin);
    
    // 计算签名
    const signature = await this.hmacSHA256(apiSecret, signatureOrigin);
    console.log('签名结果(base64):', signature);
    
    // 构建 authorization
    const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
    console.log('Authorization原文:', authorizationOrigin);
    
    const authorization = btoa(authorizationOrigin);
    console.log('Authorization(base64):', authorization);

    // 构建完整 URL
    const params = new URLSearchParams({
      authorization,
      date,
      host
    });

    const finalUrl = `${url}?${params.toString()}`;
    console.log('最终URL:', finalUrl);
    console.log('=== URL生成完成 ===');

    return finalUrl;
  }

  /**
   * HMAC-SHA256 签名
   */
  private async hmacSHA256(secret: string, message: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(message);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }

  /**
   * 开始录音
   */
  private startRecording(stream: MediaStream): void {
    this.isRecording = true;
    this.audioContext = new AudioContext({ sampleRate: 16000 });
    const source = this.audioContext.createMediaStreamSource(stream);
    
    // 使用 ScriptProcessor 处理音频
    const processor = this.audioContext.createScriptProcessor(8192, 1, 1);
    
    source.connect(processor);
    processor.connect(this.audioContext.destination);

    processor.onaudioprocess = (e) => {
      if (!this.isRecording || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
        return;
      }

      const inputData = e.inputBuffer.getChannelData(0);
      const pcmData = this.convertToPCM16(inputData);
      const base64Audio = this.arrayBufferToBase64(pcmData);
      
      // 发送音频数据帧
      if (this.isFirstFrame) {
        // 第一帧:包含完整参数
        const firstFrame = {
          common: {
            app_id: this.config.appId
          },
          business: {
            language: 'zh_cn',
            domain: 'iat',
            accent: 'mandarin',
            vad_eos: 10000, // 延长到10秒,避免短暂停顿就结束
            ptt: 0, // 关闭标点符号,避免自动添加句号
            dwa: 'wpgs'
          },
          data: {
            status: 0, // 0 表示第一帧音频
            format: 'audio/L16;rate=16000',
            encoding: 'raw',
            audio: base64Audio
          }
        };
        this.socket.send(JSON.stringify(firstFrame));
        this.isFirstFrame = false;
        console.log('发送第一帧音频数据');
      } else {
        // 后续帧:只包含data参数
        const frame = {
          data: {
            status: 1, // 1 表示中间音频
            format: 'audio/L16;rate=16000',
            encoding: 'raw',
            audio: base64Audio
          }
        };
        this.socket.send(JSON.stringify(frame));
      }
    };

    // 保存 processor 以便后续清理
    (this as any).processor = processor;
  }

  /**
   * 转换为 PCM16
   */
  private convertToPCM16(samples: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(samples.length * 2);
    const view = new DataView(buffer);
    
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    
    return buffer;
  }

  /**
   * ArrayBuffer 转 Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const binary = String.fromCharCode(...new Uint8Array(buffer));
    return btoa(binary);
  }

  /**
   * 处理识别结果
   */
  private handleMessage(data: string): void {
    try {
      const result = JSON.parse(data);
      
      console.log('收到识别结果:', result);
      
      if (result.code !== 0) {
        this.handleError(`识别错误: ${result.message}`);
        return;
      }

      if (result.data && result.data.result) {
        const ws = result.data.result.ws;
        const sn = result.data.result.sn; // 序号
        const ls = result.data.result.ls; // 是否是最后一片结果
        const status = result.data.status; // 0:第一块, 1:中间, 2:最后
        
        let text = '';
        
        // 拼接当前帧的所有词
        ws.forEach((item: any) => {
          item.cw.forEach((word: any) => {
            text += word.w;
          });
        });

        console.log(`sn=${sn}, ls=${ls}, status=${status}, text="${text}"`);
        
        // 如果是空文本或只有标点符号,跳过
        if (!text || text.trim() === '' || text === '。' || text === '?' || text === '!' || text === '，') {
          console.log('⏭️ 跳过空文本或标点符号:', text);
          
          // 如果是会话结束(status=2),需要保存最后一句话
          if (status === 2 && this.currentSentence) {
            console.log('✅ 会话结束,保存最后一句:', this.currentSentence);
            this.allText += this.currentSentence;
            this.currentSentence = '';
          }
          
          // 返回已累积的文本
          if (this.onResult) {
            this.onResult({
              text: this.allText,
              isFinal: status === 2
            });
          }
          return;
        }
        
        // 检测新句子开始:
        // 1. sn重置 (sn < lastSn)
        // 2. 文本长度突然变短 (表示开始了新的内容)
        if (this.currentSentence && 
            (sn < this.lastSn || text.length < this.currentSentence.length * 0.5)) {
          console.log('🔄 检测到新句子开始,保存上一句:', this.currentSentence);
          this.allText += this.currentSentence;
          this.currentSentence = '';
        }
        this.lastSn = sn;
        
        // 正常的识别文本,更新当前句子
        // 科大讯飞返回的是累积结果,直接替换currentSentence
        this.currentSentence = text;
        
        // 返回当前的完整内容(已累积的 + 正在识别的)
        const fullText = this.allText + this.currentSentence;
        
        console.log('📤 返回完整文本:', fullText);
        
        if (this.onResult) {
          this.onResult({
            text: fullText,  // 所有累积的文本
            isFinal: false  // 这里永远不是最终结果,因为status=2时会走空文本分支
          });
        }
      }
    } catch (error: any) {
      this.handleError('解析识别结果失败: ' + error.message);
    }
  }

  /**
   * 错误处理
   */
  private handleError(message: string): void {
    console.error('语音识别错误:', message);
    if (this.onError) {
      this.onError(message);
    }
    this.stopRecognition();
  }
}

/**
 * 从后端获取科大讯飞配置
 */
export async function getXFYunConfigFromBackend(): Promise<XFYunConfig | null> {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return null;
    }

    const response = await fetch('http://localhost:8081/api/v1/config/xfyun', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return null;
    }

    const config = await response.json();
    return config;
  } catch (error) {
    console.error('获取科大讯飞配置失败:', error);
    return null;
  }
}

/**
 * 从 localStorage 获取配置(已废弃,保留向后兼容)
 */
export function getXFYunConfig(): XFYunConfig | null {
  const appId = localStorage.getItem('xfyun_app_id');
  const apiKey = localStorage.getItem('xfyun_api_key');
  const apiSecret = localStorage.getItem('xfyun_api_secret');

  if (!appId || !apiKey || !apiSecret) {
    return null;
  }

  return { appId, apiKey, apiSecret };
}

/**
 * 保存配置到 localStorage(已废弃,保留向后兼容)
 */
export function saveXFYunConfig(config: XFYunConfig): void {
  localStorage.setItem('xfyun_app_id', config.appId);
  localStorage.setItem('xfyun_api_key', config.apiKey);
  localStorage.setItem('xfyun_api_secret', config.apiSecret);
}

