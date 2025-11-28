import { GoogleGenAI } from "@google/genai";
import { AppData, TaskDefinitions, MemberConfig } from "../types";

export const generateDailySummary = async (
  date: string, 
  dayData: AppData[string], 
  taskDefs: TaskDefinitions,
  members: Record<string, MemberConfig>
) => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Format data for the prompt
  let promptData = `日期: ${date}\n\n`;

  Object.values(members).forEach(member => {
    if (!member.visible) return;

    const data = dayData[member.id];
    if (!data) return;

    const memberTasks = taskDefs[member.id] || [];
    const getTaskTitle = (id: string) => memberTasks.find(t => t.id === id)?.title || id;

    promptData += `成員: ${member.name}\n`;
    
    // Fixed Tasks
    const completedTasks = Object.entries(data.fixedTasks)
      .map(([id, value]) => {
        // Handle legacy boolean or new object structure
        const isCompleted = typeof value === 'boolean' ? value : value.completed;
        const details = typeof value === 'object' ? value.details : '';
        
        if (isCompleted) {
          let taskStr = getTaskTitle(id);
          if (details) taskStr += ` (${details})`;
          return taskStr;
        }
        return null;
      })
      .filter(Boolean)
      .join(", ");

    promptData += `- 完成的日常打卡: ${completedTasks || "無"}\n`;

    // Custom Tasks
    promptData += `- 特別做的事情: ${data.customTasks.length > 0 ? data.customTasks.join(", ") : "無"}\n`;

    // Mood
    promptData += `- 心情小語: ${data.mood || "未填寫"}\n\n`;
  });

  const prompt = `
    你是一個溫馨的家庭 AI 助手。根據以下提供的家庭成員今日打卡紀錄，生成一篇溫暖、鼓勵性強的「家庭日報」。
    
    要求：
    1. 總結大家今天的努力，如果有「日常打卡」的備註細節（括號內的內容），請適當融入內容中。
    2. 特別提到每個人做的「特別事情」和「心情」。
    3. 語氣要溫馨、活潑，適合全家人一起看。
    4. 使用繁體中文。
    5. 如果有人心情不好，給予適當的安慰；如果有人很有成就，給予大大的讚賞。

    ${promptData}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Error generating summary:", error);
    throw error;
  }
};