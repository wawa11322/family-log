export interface FamilyMember {
  id: string;
  name: string;
  role: 'parent' | 'child';
  // Deprecated in favor of MemberConfig styles, kept for legacy type safety if needed
  gradient?: string; 
  shadowColor?: string;
}

export interface Task {
  id: string;
  title: string;
}

export type TaskDefinitions = Record<string, Task[]>;

export interface TaskLog {
  completed: boolean;
  details: string;
  // Stores the name of the task at the moment of completion to preserve history
  recordedTitle?: string;
}

export interface DailyLogData {
  fixedTasks: Record<string, TaskLog | boolean>;
  customTasks: string[]; 
  mood: string;
}

export interface DayRecord {
  [memberId: string]: DailyLogData;
}

export interface AppData {
  [date: string]: DayRecord;
}

// Configuration types
export interface MemberConfig {
  id: string;
  name: string;
  birthDate?: string; // YYYY-MM-DD
  subtitle?: string; // Manual override (e.g. "Forever 18")
  visible: boolean;
  themeColor?: string; // Hex color for card background
  backgroundImage?: string; // Base64 image string
  textColor?: string; // Text color to ensure contrast
}

export interface AppConfig {
  tasks: Record<string, Task[]>;
  members: Record<string, MemberConfig>;
  // Custom app title
  appTitle?: string;
  // Global customization
  globalBackgroundColor?: string;
  globalBackgroundImage?: string; // Base64 image string
}