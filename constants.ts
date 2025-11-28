import { FamilyMember, AppConfig } from './types';

// Base definitions for styles (Hardcoded styles, but names are now dynamic)
export const FAMILY_STYLES: Record<string, Omit<FamilyMember, 'id' | 'name'>> = {
  'child1': { 
    role: 'child', 
    gradient: 'from-cyan-400 to-blue-400',
    shadowColor: 'shadow-blue-200'
  },
  'child2': { 
    role: 'child', 
    gradient: 'from-orange-300 to-red-300',
    shadowColor: 'shadow-orange-200'
  },
  'child3': { 
    role: 'child', 
    gradient: 'from-purple-300 to-indigo-300',
    shadowColor: 'shadow-purple-200'
  },
  'me': { 
    role: 'parent', 
    gradient: 'from-pink-400 to-rose-400',
    shadowColor: 'shadow-pink-200'
  },
};

export const INITIAL_CONFIG: AppConfig = {
  members: {
    'child1': { id: 'child1', name: 'Orison', visible: true },
    'child2': { id: 'child2', name: 'Alison', visible: true },
    'child3': { id: 'child3', name: 'Bobie', visible: true },
    'me': { id: 'me', name: 'Mama', visible: true },
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