export interface FamilyMember {
  id: string;
  name: string;
  role: 'parent' | 'child';
  // We will store tailwind class strings for gradients
  gradient: string; 
  shadowColor: string;
}

export interface Task {
  id: string;
  title: string;
  // Icon removed as per request
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
  visible: boolean;
}

export interface AppConfig {
  tasks: Record<string, Task[]>;
  members: Record<string, MemberConfig>;
  // Custom app title
  appTitle?: string;
}