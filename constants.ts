import { AppConfig } from './types';

// Helper to calculate a rough birthdate for initial data
// This ensures the demo data looks correct regardless of when the user first opens the app
const getPastDate = (years: number, months: number) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  d.setMonth(d.getMonth() - months);
  return d.toISOString().split('T')[0];
};

export const INITIAL_CONFIG: AppConfig = {
  appTitle: '人生積木屋',
  globalBackgroundColor: '#fffbeb', // amber-50 equivalent
  members: {
    'child1': { 
      id: 'child1', 
      name: 'Orison', 
      // Approx 9y8m -> Grade 4
      birthDate: getPastDate(9, 8),
      visible: true,
      themeColor: '#22d3ee', // cyan-400
    },
    'child2': { 
      id: 'child2', 
      name: 'Alison', 
      // Approx 7y2m -> Grade 2 (adjusted to ensure grade calculation falls into Grade 2)
      birthDate: getPastDate(7, 2),
      visible: true,
      themeColor: '#fb923c', // orange-400
    },
    'child3': { 
      id: 'child3', 
      name: 'Bobie', 
      // Approx 5y -> Kindergarten (Da-Ban)
      birthDate: getPastDate(5, 6),
      visible: true,
      themeColor: '#818cf8', // indigo-400
    },
    'me': { 
      id: 'me', 
      name: 'Mama', 
      subtitle: '永遠的 18 歲', // Manual override example
      visible: true,
      themeColor: '#f472b6', // pink-400
    },
  },
  tasks: {
    'child1': [
      { id: 'piano', title: '練鋼琴' },
      { id: 'english', title: 'Zookeeper 英文' },
      { id: 'news', title: '世界新聞' },
      { id: 'chinese', title: '中文書閱讀' },
    ],
    'child2': [
      { id: 'magazine', title: '國語週刊' },
      { id: 'piano', title: '練鋼琴' },
      { id: 'chinese_book', title: '中文書' },
      { id: 'english_book', title: '英文書' },
    ],
    'child3': [
      { id: 'bus', title: '公車板拼圖' },
      { id: 'draw', title: '畫畫' },
      { id: 'blocks', title: '積木時間' },
    ],
    'me': [
      { id: 'gym', title: '健身' },
      { id: 'swim', title: '游泳' },
      { id: 'read', title: '看書' },
      { id: 'work', title: '工作進度' },
    ]
  }
};

export const INITIAL_DAILY_DATA = {
  fixedTasks: {},
  customTasks: [],
  mood: '',
};