/**
 * 从自然语言中提取旅行规划信息
 */

interface ParsedTripData {
  destination?: string;
  startDate?: string;
  endDate?: string;
  duration?: number; // 天数
  participants?: number;
  budget?: number;
  preferences?: string;
}

/**
 * 从文本中提取日期
 */
export function extractDates(text: string): { startDate?: string; endDate?: string; duration?: number } {
  const result: { startDate?: string; endDate?: string; duration?: number } = {};
  
  // 匹配天数: "3天", "五天", "三天四夜"
  const durationPatterns = [
    /(\d+)天/,
    /([一二三四五六七八九十]+)天/,
    /(\d+)天(\d+)夜/
  ];
  
  for (const pattern of durationPatterns) {
    const match = text.match(pattern);
    if (match) {
      const daysStr = match[1];
      result.duration = chineseNumberToArabic(daysStr);
      break;
    }
  }
  
  // 匹配具体日期: "11月15日", "2025-11-15", "11-15"
  const datePatterns = [
    /(\d{4})[年\-](\d{1,2})[月\-](\d{1,2})[日号]?/g,
    /(\d{1,2})[月\-](\d{1,2})[日号]?/g
  ];
  
  const dates: string[] = [];
  for (const pattern of datePatterns) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      if (match[3]) {
        // YYYY-MM-DD 格式
        const year = match[1];
        const month = match[2].padStart(2, '0');
        const day = match[3].padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
      } else if (match[2]) {
        // MM-DD 格式,使用当前年份
        const year = new Date().getFullYear();
        const month = match[1].padStart(2, '0');
        const day = match[2].padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
      }
    }
  }
  
  if (dates.length >= 2) {
    result.startDate = dates[0];
    result.endDate = dates[1];
  } else if (dates.length === 1 && result.duration) {
    // 只有开始日期和天数,计算结束日期
    result.startDate = dates[0];
    const start = new Date(dates[0]);
    start.setDate(start.getDate() + result.duration - 1);
    result.endDate = start.toISOString().split('T')[0];
  }
  
  return result;
}

/**
 * 从文本中提取目的地
 */
export function extractDestination(text: string): string | undefined {
  // 匹配"去xxx", "到xxx", "想去xxx"
  const patterns = [
    /(?:去|到|想去|前往)([^，。,\s去到]{2,6}?)(?:玩|旅游|游玩|看看|转转|，|。|$|\s)/,
    /([^，。,\s]{2,6}?)(?:游|旅行|之旅|行程)/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return undefined;
}

/**
 * 从文本中提取人数
 */
export function extractParticipants(text: string): number | undefined {
  // 匹配"2个人", "两个人", "三人", "一家四口", "2人", "仨人"
  const patterns = [
    /(\d+)\s*个?\s*人/,  // 支持"2个人"、"2人"、"2 个人"(带空格)
    /([一二三四五六七八九十两仨]+)\s*个?\s*人/,  // 支持"两个人"、"二人"、"仨人"
    /一家\s*(\d+)\s*口/,
    /一家\s*([一二三四五六七八九十]+)\s*口/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return chineseNumberToArabic(match[1]);
    }
  }
  
  return undefined;
}

/**
 * 从文本中提取预算
 */
export function extractBudget(text: string): number | undefined {
  // 匹配"3000元", "预算5000", "三千块"
  const patterns = [
    /(?:预算|花费|费用|总共|大概|约)?\s?(\d+)\s?(?:元|块|rmb|¥)/i,
    /(?:预算|花费|费用)?\s?([一二三四五六七八九十百千万]+)\s?(?:元|块)/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return chineseNumberToArabic(match[1]);
    }
  }
  
  return undefined;
}

/**
 * 从文本中提取偏好
 */
export function extractPreferences(text: string): string | undefined {
  // 匹配"喜欢xxx", "爱好xxx", "偏好xxx"
  const patterns = [
    /(?:喜欢|爱好|偏好|想看|想玩|感兴趣)([^，。,]{2,20})/g,
  ];
  
  const preferences: string[] = [];
  for (const pattern of patterns) {
    const matches = Array.from(text.matchAll(pattern));
    for (const match of matches) {
      preferences.push(match[1].trim());
    }
  }
  
  return preferences.length > 0 ? preferences.join('、') : undefined;
}

/**
 * 将中文数字转换为阿拉伯数字
 */
function chineseNumberToArabic(chinese: string): number {
  // 如果已经是数字,直接返回
  if (/^\d+$/.test(chinese)) {
    return parseInt(chinese, 10);
  }
  
  // 特殊口语数字
  if (chinese === '仨') return 3;
  
  const chineseMap: { [key: string]: number } = {
    '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4,  // 添加"两"的支持
    '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
    '十': 10, '百': 100, '千': 1000, '万': 10000
  };
  
  let result = 0;
  let temp = 0;
  let unit = 1;
  
  for (let i = chinese.length - 1; i >= 0; i--) {
    const char = chinese[i];
    const value = chineseMap[char];
    
    if (value === undefined) continue;
    
    if (value >= 10) {
      // 单位
      if (value > unit) {
        unit = value;
        if (temp === 0) temp = 1;
      }
    } else {
      // 数字
      temp = value;
    }
    
    if (temp > 0 && (i === 0 || chineseMap[chinese[i - 1]] === undefined || chineseMap[chinese[i - 1]] >= 10)) {
      result += temp * unit;
      temp = 0;
      unit = 1;
    }
  }
  
  return result || parseInt(chinese, 10) || 0;
}

/**
 * 解析自然语言输入,提取所有旅行信息
 */
export function parseTripInput(text: string): ParsedTripData {
  if (!text || !text.trim()) {
    return {};
  }
  
  const result: ParsedTripData = {};
  
  // 提取各个字段
  const destination = extractDestination(text);
  if (destination) result.destination = destination;
  
  const dates = extractDates(text);
  if (dates.startDate) result.startDate = dates.startDate;
  if (dates.endDate) result.endDate = dates.endDate;
  if (dates.duration) result.duration = dates.duration;
  
  const participants = extractParticipants(text);
  if (participants) result.participants = participants;
  
  const budget = extractBudget(text);
  if (budget) result.budget = budget;
  
  const preferences = extractPreferences(text);
  if (preferences) result.preferences = preferences;
  
  return result;
}
