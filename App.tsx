import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Check, 
  Plus, 
  Trash2, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight,
  Edit3,
  X,
  Calendar as CalendarIcon,
  Settings,
  Download,
  Upload,
  Copy,
  CheckCircle2,
  Moon,
  Sun
} from 'lucide-react';
import { FAMILY_STYLES, INITIAL_CONFIG, INITIAL_DAILY_DATA } from './constants';
import { AppData, DailyLogData, AppConfig, TaskLog } from './types';
import { generateDailySummary } from './services/geminiService';

const STORAGE_KEY = 'family_log_data_v3';
const CONFIG_KEY = 'family_log_config_v3';
const THEME_KEY = 'family_log_theme';

// Helper to format date YYYY-MM-DD
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export default function App() {
  // --- STATE ---
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [data, setData] = useState<AppData>({});
  const [config, setConfig] = useState<AppConfig>(INITIAL_CONFIG);
  
  // Views: 'daily' | 'calendar' | 'settings'
  const [currentView, setCurrentView] = useState<'daily' | 'calendar' | 'settings'>('daily');

  // Theme
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Interaction State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  
  // Modals / Editing
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  
  // Task Editing
  const [editingTask, setEditingTask] = useState<{ memberId: string, id: string, title: string, details: string } | null>(null);
  
  // Custom Task Input
  const [addingCustomTask, setAddingCustomTask] = useState<string | null>(null);
  const [newCustomTaskText, setNewCustomTaskText] = useState('');

  // Member Name Editing
  const [editingMemberName, setEditingMemberName] = useState<{ id: string, name: string } | null>(null);

  // Sync State
  const [importCode, setImportCode] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // --- PERSISTENCE ---
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    const savedConfig = localStorage.getItem(CONFIG_KEY);
    const savedTheme = localStorage.getItem(THEME_KEY);
    
    if (savedData) {
      try {
        setData(JSON.parse(savedData));
      } catch (e) {
        console.error("Failed to parse saved data", e);
      }
    }

    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(prev => ({
            members: { ...prev.members, ...parsed.members },
            tasks: { ...prev.tasks, ...parsed.tasks }
        }));
      } catch (e) {
        console.error("Failed to parse saved config", e);
      }
    }

    if (savedTheme === 'dark') {
        setIsDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (Object.keys(data).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data]);

  useEffect(() => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }, [config]);

  // Theme Effect
  useEffect(() => {
      const root = window.document.documentElement;
      const body = window.document.body;
      if (isDarkMode) {
          root.classList.add('dark');
          localStorage.setItem(THEME_KEY, 'dark');
          // Update meta theme-color for mobile browsers
          document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#030712');
          body.style.backgroundColor = '#030712';
      } else {
          root.classList.remove('dark');
          localStorage.setItem(THEME_KEY, 'light');
          document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#fefce8');
          body.style.backgroundColor = '#fefce8';
      }
  }, [isDarkMode]);

  // --- HELPERS ---
  const dateKey = useMemo(() => formatDate(currentDate), [currentDate]);

  const getMemberData = (memberId: string): DailyLogData => {
    return data[dateKey]?.[memberId] || { ...INITIAL_DAILY_DATA, fixedTasks: {}, customTasks: [] };
  };

  const getTaskState = (memberId: string, taskId: string): TaskLog => {
    const raw = getMemberData(memberId).fixedTasks?.[taskId];
    if (typeof raw === 'boolean') {
      return { completed: raw, details: '' };
    }
    if (raw) return raw;
    return { completed: false, details: '' };
  };

  const getSortedMemberIds = () => {
    return Object.keys(config.members);
  };

  const getBarColor = (mid: string) => {
    switch(mid) {
        case 'child1': return 'bg-cyan-400';
        case 'child2': return 'bg-orange-400';
        case 'child3': return 'bg-indigo-400';
        case 'me': return 'bg-pink-400';
        default: return 'bg-gray-400';
    }
  };

  // --- DATA OPERATIONS ---
  const handleDateChange = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
    setAiSummary(null);
  };

  const updateMemberData = (memberId: string, updates: Partial<DailyLogData>) => {
    setData(prev => ({
      ...prev,
      [dateKey]: {
        ...(prev[dateKey] || {}),
        [memberId]: {
          ...getMemberData(memberId),
          ...updates
        }
      }
    }));
  };

  const toggleFixedTask = (memberId: string, taskId: string) => {
    const currentState = getTaskState(memberId, taskId);
    updateMemberData(memberId, {
      fixedTasks: {
        ...getMemberData(memberId).fixedTasks,
        [taskId]: {
          ...currentState,
          completed: !currentState.completed
        }
      }
    });
  };

  // Robust Long Press Logic
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef<{x: number, y: number} | null>(null);
  const isLongPressTriggeredRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent, memberId: string, taskId: string) => {
    isLongPressTriggeredRef.current = false;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    touchStartPosRef.current = { x: clientX, y: clientY };

    longPressTimerRef.current = setTimeout(() => {
        isLongPressTriggeredRef.current = true;
        const currentState = getTaskState(memberId, taskId);
        const currentDef = config.tasks[memberId]?.find(t => t.id === taskId);
        setEditingTask({
            memberId,
            id: taskId,
            title: currentDef?.title || '',
            details: currentState.details
        });
        if (navigator.vibrate) navigator.vibrate(50);
    }, 600);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!touchStartPosRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const moveX = Math.abs(clientX - touchStartPosRef.current.x);
    const moveY = Math.abs(clientY - touchStartPosRef.current.y);

    if (moveX > 10 || moveY > 10) {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        touchStartPosRef.current = null;
    }
  };

  const handleTouchEnd = (e: React.MouseEvent | React.TouchEvent, memberId: string, taskId: string) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    if (!isLongPressTriggeredRef.current && touchStartPosRef.current) {
        toggleFixedTask(memberId, taskId);
    }
    touchStartPosRef.current = null;
  };

  const saveTaskEdit = () => {
    if (!editingTask) return;
    const { memberId, id, title, details } = editingTask;

    setConfig(prev => ({
        ...prev,
        tasks: {
            ...prev.tasks,
            [memberId]: prev.tasks[memberId].map(t => t.id === id ? { ...t, title } : t)
        }
    }));

    const currentState = getTaskState(memberId, id);
    updateMemberData(memberId, {
      fixedTasks: {
        ...getMemberData(memberId).fixedTasks,
        [id]: {
          ...currentState,
          details
        }
      }
    });

    setEditingTask(null);
  };

  const saveMemberName = () => {
      if(!editingMemberName) return;
      setConfig(prev => ({
          ...prev,
          members: {
              ...prev.members,
              [editingMemberName.id]: {
                  ...prev.members[editingMemberName.id],
                  name: editingMemberName.name
              }
          }
      }));
      setEditingMemberName(null);
  };

  const handleAddCustomTask = (memberId: string) => {
    if (!newCustomTaskText.trim()) return;
    const currentCustom = getMemberData(memberId).customTasks || [];
    updateMemberData(memberId, {
      customTasks: [...currentCustom, newCustomTaskText.trim()]
    });
    setNewCustomTaskText('');
    setAddingCustomTask(null);
  };

  const handleRemoveCustomTask = (memberId: string, index: number) => {
    const newTasks = [...(getMemberData(memberId).customTasks || [])];
    newTasks.splice(index, 1);
    updateMemberData(memberId, { customTasks: newTasks });
  };

  const handleUpdateMood = (memberId: string, mood: string) => {
    updateMemberData(memberId, { mood });
  };

  const handleGenerateSummary = async () => {
    const dayData = data[dateKey];
    if (!dayData || Object.keys(dayData).length === 0) {
        alert("今天還沒有任何紀錄喔！");
        return;
    }

    setIsGenerating(true);
    try {
      const summary = await generateDailySummary(dateKey, dayData, config.tasks, config.members);
      setAiSummary(summary || "無法生成摘要");
      setShowSummaryModal(true);
    } catch (error) {
      console.error(error);
      alert("AI 生成失敗，請檢查網路或 API Key。");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
      const exportObj = { data, config };
      const str = JSON.stringify(exportObj);
      navigator.clipboard.writeText(str).then(() => {
          alert("資料已複製到剪貼簿！請將代碼發送到其他裝置並貼上。");
      }).catch(err => {
          console.error("Clipboard failed", err);
          alert("複製失敗，請手動選取並複製代碼 (可能因瀏覽器安全性限制)。");
      });
  };

  const handleImport = () => {
      try {
          const parsed = JSON.parse(importCode);
          if (parsed.data && parsed.config) {
              setData(parsed.data);
              setConfig(parsed.config);
              setImportStatus('success');
              setTimeout(() => setImportStatus('idle'), 2000);
          } else {
              throw new Error("Invalid format");
          }
      } catch (e) {
          setImportStatus('error');
      }
  };

  // --- PROGRESS CALC ---
  const familyProgress = useMemo(() => {
    let totalTasks = 0;
    let completedTasks = 0;
    
    getSortedMemberIds().forEach(mid => {
      const mTasks = config.tasks[mid] || [];
      totalTasks += mTasks.length;
      const mData = getMemberData(mid);
      mTasks.forEach(t => {
        const state = mData.fixedTasks?.[t.id];
        if (state === true || (typeof state === 'object' && state.completed)) {
          completedTasks++;
        }
      });
    });

    return totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  }, [data, dateKey, config]);

  const getMemberProgress = (memberId: string, dateStr = dateKey) => {
    const mDefs = config.tasks[memberId] || [];
    const mData = data[dateStr]?.[memberId] || { fixedTasks: {} };
    if (mDefs.length === 0) return 0;
    
    let completed = 0;
    mDefs.forEach(t => {
       const state = mData.fixedTasks?.[t.id];
       if (state === true || (typeof state === 'object' && state.completed)) {
         completed++;
       }
    });
    return Math.round((completed / mDefs.length) * 100);
  };

  // --- RENDER VIEWS ---

  const renderDailyView = () => (
      <main className="max-w-md mx-auto px-4 py-6 space-y-10">
        {getSortedMemberIds().map(memberId => {
            const memberConfig = config.members[memberId];
            const memberStyle = FAMILY_STYLES[memberId] || FAMILY_STYLES['child1'];
            const progress = getMemberProgress(memberId);
            const mTasks = config.tasks[memberId] || [];
            const mData = getMemberData(memberId);
            const completedCount = mTasks.filter(t => {
                const s = mData.fixedTasks?.[t.id];
                return s === true || (typeof s === 'object' && s.completed);
            }).length;

            return (
                <div key={memberId} className="space-y-4">
                    {/* Member Header Card */}
                    <div className={`
                        relative overflow-hidden rounded-3xl p-6 text-white shadow-lg ${memberStyle.shadowColor} dark:shadow-none
                        bg-gradient-to-br ${memberStyle.gradient} transition-transform
                    `}>
                        <div className="flex justify-between items-center relative z-10">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="text-3xl font-bold">{memberConfig.name}</h2>
                                    <button 
                                        onClick={() => setEditingMemberName({ id: memberId, name: memberConfig.name })}
                                        className="p-1.5 bg-white/20 rounded-full hover:bg-white/40 transition-colors"
                                    >
                                        <Edit3 className="w-4 h-4 text-white" />
                                    </button>
                                </div>
                                <p className="text-white/90 font-medium text-sm">{completedCount} / {mTasks.length} 完成</p>
                            </div>
                            
                            {/* Circular Progress */}
                            <div className="relative w-16 h-16 flex items-center justify-center">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                    <path className="text-white/30" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                    <path className="text-white transition-all duration-1000 ease-out" strokeDasharray={`${progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                                </svg>
                                <span className="absolute text-sm font-bold">{progress}%</span>
                            </div>
                        </div>

                        <div className="mt-5 bg-white/30 h-1.5 rounded-full overflow-hidden">
                             <div className="h-full bg-white transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>

                    {/* Task List */}
                    <div className="space-y-3">
                        {mTasks.map(task => {
                            const state = getTaskState(memberId, task.id);
                            return (
                                <div
                                    key={task.id}
                                    onMouseDown={(e) => handleTouchStart(e, memberId, task.id)}
                                    onMouseMove={handleTouchMove}
                                    onMouseUp={(e) => handleTouchEnd(e, memberId, task.id)}
                                    onTouchStart={(e) => handleTouchStart(e, memberId, task.id)}
                                    onTouchMove={handleTouchMove}
                                    onTouchEnd={(e) => handleTouchEnd(e, memberId, task.id)}
                                    onContextMenu={(e) => e.preventDefault()}
                                    className={`
                                        w-full rounded-2xl p-4 flex items-center justify-between shadow-sm border 
                                        transition-all cursor-pointer select-none
                                        ${state.completed 
                                            ? 'bg-indigo-50/30 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800' 
                                            : 'bg-white border-gray-100 dark:bg-gray-900 dark:border-gray-800'}
                                        active:scale-[0.98]
                                    `}
                                >
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className={`
                                            w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors
                                            ${state.completed 
                                                ? 'bg-indigo-500 border-indigo-500' 
                                                : 'border-gray-300 dark:border-gray-600'}
                                        `}>
                                            {state.completed && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                                        </div>
                                        <div className="flex flex-col items-start min-w-0">
                                            <div className="flex items-center gap-2 font-bold text-lg leading-tight break-words text-gray-700 dark:text-gray-200">
                                                <span>{task.title}</span>
                                            </div>
                                            {state.details && (
                                                <div className="text-xs text-indigo-500 dark:text-indigo-400 font-medium text-left mt-1 break-all">
                                                    {state.details}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Extras */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-1 shadow-sm border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
                        {/* Custom Tasks */}
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                    <Sparkles className="w-3 h-3" /> 今日不一樣
                                </h3>
                                <button 
                                    onClick={() => setAddingCustomTask(memberId)}
                                    className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 p-1.5 rounded-lg transition-colors"
                                >
                                    <Plus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                </button>
                            </div>
                            
                            {addingCustomTask === memberId && (
                                <div className="flex gap-2 mb-3 animate-in fade-in slide-in-from-top-2">
                                    <input 
                                        autoFocus
                                        type="text" 
                                        className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        placeholder="輸入特別事項..."
                                        value={newCustomTaskText}
                                        onChange={(e) => setNewCustomTaskText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTask(memberId)}
                                    />
                                    <button onClick={() => handleAddCustomTask(memberId)} className="text-indigo-600 dark:text-indigo-400 text-sm font-medium">新增</button>
                                </div>
                            )}

                            <div className="space-y-2">
                                {(mData.customTasks || []).map((t, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 text-amber-900 dark:text-amber-100 text-sm">
                                        <span>{t}</span>
                                        <button onClick={() => handleRemoveCustomTask(memberId, idx)} className="text-amber-300 hover:text-amber-600 dark:hover:text-amber-200">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Mood */}
                        <div className="p-4">
                            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-3">
                                ❤️ 心情小語
                            </h3>
                            <textarea
                                rows={2}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-300 outline-none resize-none transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600"
                                placeholder={`今天 ${memberConfig.name} 心情如何？`}
                                value={mData.mood || ''}
                                onChange={(e) => handleUpdateMood(memberId, e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            );
        })}
      </main>
  );

  const renderCalendarView = () => {
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
        <div className="max-w-md mx-auto px-4 py-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">歷史紀錄</h2>
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => {
                        const d = new Date(currentDate);
                        d.setMonth(d.getMonth() - 1);
                        setCurrentDate(d);
                    }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-700 dark:text-gray-300">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="font-bold text-lg text-gray-800 dark:text-white">
                        {currentDate.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' })}
                    </span>
                    <button onClick={() => {
                        const d = new Date(currentDate);
                        d.setMonth(d.getMonth() + 1);
                        setCurrentDate(d);
                    }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-700 dark:text-gray-300">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium mb-2">
                    {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                        <div key={d} className="text-gray-400 dark:text-gray-500 py-2">{d}</div>
                    ))}
                </div>
                
                <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                    {daysArray.map(day => {
                        const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                        const dStr = formatDate(d);
                        const hasData = !!data[dStr];
                        const isSelected = dStr === formatDate(currentDate);
                        const isToday = dStr === formatDate(new Date());

                        return (
                            <button 
                                key={day}
                                onClick={() => {
                                    setCurrentDate(d);
                                    setCurrentView('daily');
                                }}
                                className={`
                                    relative aspect-square rounded-xl flex flex-col items-center justify-between py-1.5 transition-all
                                    ${isSelected 
                                        ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-gray-900 z-10' 
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'}
                                `}
                            >
                                <span className={`text-sm font-medium ${isToday ? 'text-white bg-indigo-500 w-6 h-6 rounded-full flex items-center justify-center shadow-sm' : isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                    {day}
                                </span>
                                
                                <div className="flex items-end justify-center gap-[2px] h-4 w-full px-1">
                                    {getSortedMemberIds().map(mid => {
                                        const p = getMemberProgress(mid, dStr);
                                        const barColor = getBarColor(mid);
                                        const height = p > 0 ? `${Math.max(p, 15)}%` : '0%';
                                        
                                        return (
                                            <div 
                                                key={mid} 
                                                className={`w-1.5 rounded-t-sm ${p > 0 ? barColor : (hasData ? 'bg-gray-100 dark:bg-gray-800' : 'bg-transparent')}`}
                                                style={{ height: height }}
                                            />
                                        );
                                    })}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 justify-center">
                 {getSortedMemberIds().map(mid => (
                     <div key={mid} className="flex items-center gap-1.5">
                         <div className={`w-3 h-3 rounded-full ${getBarColor(mid)}`} />
                         <span className="text-xs text-gray-500 dark:text-gray-400">{config.members[mid].name}</span>
                     </div>
                 ))}
            </div>
        </div>
    );
  };

  const renderSettingsView = () => (
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">同步與設定</h2>
        
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 space-y-6">
            <div>
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2 text-gray-800 dark:text-gray-200">
                    <Download className="w-5 h-5 text-indigo-500"/> 匯出資料 (備份)
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    點擊按鈕複製您的所有資料代碼。您可以將此代碼貼到另一台裝置上進行同步。
                </p>
                <button 
                    onClick={handleExport}
                    className="w-full py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-xl font-bold text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex items-center justify-center gap-2"
                >
                    <Copy className="w-4 h-4" /> 複製資料代碼
                </button>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800 pt-6">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2 text-gray-800 dark:text-gray-200">
                    <Upload className="w-5 h-5 text-teal-500"/> 匯入資料 (還原)
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    在此貼上來自其他裝置的資料代碼。<strong>注意：這將覆蓋當前資料。</strong>
                </p>
                <textarea 
                    value={importCode}
                    onChange={(e) => setImportCode(e.target.value)}
                    placeholder="貼上資料代碼..."
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs font-mono h-24 mb-3 focus:ring-2 focus:ring-teal-500/20 outline-none text-gray-800 dark:text-gray-200"
                />
                <button 
                    onClick={handleImport}
                    className={`w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-colors
                        ${importStatus === 'success' ? 'bg-green-500' : importStatus === 'error' ? 'bg-red-500' : 'bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600'}
                    `}
                >
                    {importStatus === 'success' ? <CheckCircle2 className="w-4 h-4"/> : null}
                    {importStatus === 'success' ? '匯入成功！' : importStatus === 'error' ? '格式錯誤' : '開始匯入'}
                </button>
            </div>
        </div>
      </div>
  );

  return (
    <div className={`min-h-screen pb-20 font-sans select-none transition-colors duration-300 ${isDarkMode ? 'bg-gray-950 text-gray-100' : 'bg-yellow-50 text-gray-800'}`}>
      
      {/* --- Sticky Header --- */}
      <div className={`sticky top-0 z-20 backdrop-blur-md shadow-sm border-b transition-colors duration-300 ${isDarkMode ? 'bg-gray-900/90 border-gray-800' : 'bg-white/90 border-gray-100'}`}>
        <div className="max-w-md mx-auto px-6 py-4">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight font-[Noto Sans TC] text-gray-900 dark:text-white">FamilyLog</h1>
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-medium text-sm">
                        {currentView === 'daily' ? (
                            <>
                            <button onClick={() => handleDateChange(-1)} className="hover:text-gray-900 dark:hover:text-gray-200 p-1"><ChevronLeft className="w-5 h-5"/></button>
                            <span className="min-w-[100px] text-center">{currentDate.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short' })}</span>
                            <button onClick={() => handleDateChange(1)} className="hover:text-gray-900 dark:hover:text-gray-200 p-1"><ChevronRight className="w-5 h-5"/></button>
                            </>
                        ) : currentView === 'calendar' ? (
                            <span>月曆總覽</span>
                        ) : (
                            <span>設定</span>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                     <button 
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className={`p-2.5 rounded-full transition-colors ${isDarkMode ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-amber-100 text-amber-500 hover:bg-amber-200'}`}
                    >
                        {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    </button>
                     <button 
                        onClick={() => setCurrentView(v => v === 'settings' ? 'daily' : 'settings')}
                        className={`p-2.5 rounded-full transition-colors ${currentView === 'settings' ? 'bg-gray-200 dark:bg-gray-700' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >
                        <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    <button 
                        onClick={() => setCurrentView(v => v === 'calendar' ? 'daily' : 'calendar')}
                        className={`p-2.5 rounded-full transition-colors ${currentView === 'calendar' ? 'bg-gray-200 dark:bg-gray-700' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    >
                        <CalendarIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    {currentView === 'daily' && (
                        <button 
                            onClick={handleGenerateSummary}
                            disabled={isGenerating}
                            className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-full transition-colors relative"
                        >
                            {isGenerating ? <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/> : <Sparkles className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />}
                        </button>
                    )}
                </div>
            </div>
            
            {/* Family Progress (Only in Daily View) */}
            {currentView === 'daily' && (
                <div className="mt-4">
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">全家進度</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">{familyProgress}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-500 ease-out"
                            style={{ width: `${familyProgress}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
      </div>

      {currentView === 'daily' && renderDailyView()}
      {currentView === 'calendar' && renderCalendarView()}
      {currentView === 'settings' && renderSettingsView()}

      {/* --- Task Edit Modal --- */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm shadow-2xl p-6 space-y-5 border border-transparent dark:border-gray-800">
            <div className="flex justify-between items-center pb-2">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-500" />
                編輯項目
              </h3>
              <button onClick={() => setEditingTask(null)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  項目名稱 (修改後會永久變更)
                </label>
                <input 
                  type="text" 
                  value={editingTask.title}
                  onChange={(e) => setEditingTask(prev => prev ? { ...prev, title: e.target.value } : null)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-lg font-medium text-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  今日詳細備註
                </label>
                <textarea 
                  rows={3}
                  value={editingTask.details}
                  onChange={(e) => setEditingTask(prev => prev ? { ...prev, details: e.target.value } : null)}
                  placeholder="例如：讀了第5章、練了哈農..."
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none text-gray-800 dark:text-white"
                />
              </div>
            </div>

            <button 
                onClick={saveTaskEdit}
                className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
            >
                儲存變更
            </button>
          </div>
        </div>
      )}

      {/* --- Member Name Edit Modal --- */}
      {editingMemberName && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm shadow-2xl p-6 space-y-5 border border-transparent dark:border-gray-800">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">修改名字</h3>
            <input 
              type="text" 
              value={editingMemberName.name}
              onChange={(e) => setEditingMemberName(prev => prev ? { ...prev, name: e.target.value } : null)}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-lg text-gray-800 dark:text-white"
            />
            <div className="flex gap-2">
                <button onClick={() => setEditingMemberName(null)} className="flex-1 py-3 text-gray-500 dark:text-gray-400 font-bold">取消</button>
                <button onClick={saveMemberName} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none">確定</button>
            </div>
          </div>
        </div>
      )}

      {/* --- AI Summary Modal --- */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-transparent dark:border-gray-800">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                <Sparkles className="w-5 h-5" /> 家庭日報
              </h3>
              <button 
                onClick={() => setShowSummaryModal(false)}
                className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
            <div className="p-8 overflow-y-auto whitespace-pre-line leading-loose text-gray-700 dark:text-gray-300 text-lg">
               {aiSummary}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}