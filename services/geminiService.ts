import { GoogleGenAI, Schema } from "@google/genai";
import { Type } from "@google/genai";
import { TranscriptData, AnalysisResult, ChatMessage } from "../types";

const SYSTEM_INSTRUCTION = `
You are a client relationship analyst specializing in detecting subtle emotional and psychological signals that indicate relationship health in agency-client relationships. 
Your job is to analyze meeting transcripts and identify warning signs that someone focused purely on tactics and metrics would miss.
You help agency account managers understand what their clients are REALLY thinking and feeling.

You will be provided with three transcripts (Oldest, Middle, Recent) and context about the client.
Analyze the trajectory across these three points in time.
Be direct, honest, and psychological in your assessment. Don't sugarcoat.
`;

const ANALYSIS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    trajectoryAnalysis: {
      type: Type.OBJECT,
      properties: {
        engagement: { type: Type.STRING, enum: ["Increasing", "Stable", "Declining"] },
        meetingLength: { type: Type.STRING, enum: ["Shorter", "Stable", "Longer"] },
        energy: { type: Type.STRING, enum: ["Rising", "Falling", "Flat"] },
        futureTalk: { type: Type.STRING, enum: ["More", "Less", "Same"] },
      },
      required: ["engagement", "meetingLength", "energy", "futureTalk"],
    },
    subtleSignals: {
      type: Type.OBJECT,
      properties: {
        languagePatterns: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Shifts in commitment, ownership, or hedging." },
        energyFlags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Tone, answers, multitasking signals." },
        trustErosion: { type: Type.ARRAY, items: { type: Type.STRING }, description: "New decision makers, comparisons, questioning agreements." },
        financialAnxiety: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Budget mentions, pressure indicators." },
        disappeared: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Strategic talks, sharing wins, future planning." },
      },
      required: ["languagePatterns", "energyFlags", "trustErosion", "financialAnxiety", "disappeared"],
    },
    criticalMoments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          quote: { type: Type.STRING },
          surfaceRead: { type: Type.STRING, description: "What a low-EQ person thinks this means." },
          deepMeaning: { type: Type.STRING, description: "The real signal." },
          implication: { type: Type.STRING, description: "Why it matters." },
        },
        required: ["quote", "surfaceRead", "deepMeaning", "implication"],
      },
    },
    bottomLine: {
      type: Type.OBJECT,
      properties: {
        trajectory: { type: Type.STRING, enum: ["Strengthening", "Stable", "Declining", "Critical"] },
        churnRisk: { type: Type.STRING, enum: ["Low", "Medium", "High", "Immediate"] },
        clientConfidence: { type: Type.INTEGER, description: "Score from 1 to 10" },
        whatsReallyGoingOn: { type: Type.STRING, description: "One sentence - what are they worried about that they're not saying?" },
        realReasonIfChurn: { type: Type.STRING, description: "Strip away polite excuses - what's the actual issue?" },
      },
      required: ["trajectory", "churnRisk", "clientConfidence", "whatsReallyGoingOn", "realReasonIfChurn"],
    },
    actionPlan: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING },
          why: { type: Type.STRING },
          how: { type: Type.STRING, description: "Exact language/approach to use." },
        },
        required: ["action", "why", "how"],
      },
    },
  },
  required: ["trajectoryAnalysis", "subtleSignals", "criticalMoments", "bottomLine", "actionPlan"],
};

export const analyzeRelationship = async (data: TranscriptData): Promise<AnalysisResult> => {
  try {
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      throw new Error("API key not configured. Please set GEMINI_API_KEY in your .env.local file.");
    }

    const ai = new GoogleGenAI({ apiKey });

    // Build Context String
    let contextSection = "CONTEXT & BACKGROUND:\n";
    if (data.clientProfile) {
      contextSection += `Client Name: ${data.clientProfile.name}\n`;
      contextSection += `Average Spend: ${data.clientProfile.monthlySpend}\n`;
      contextSection += `Relationship Duration: ${data.clientProfile.duration}\n`;
      contextSection += `Client Profile Notes: ${data.clientProfile.notes}\n`;
    }
    contextSection += `Additional User Notes: ${data.context || "None provided."}\n`;

    // Construct the prompt content
    const promptText = `
      Here is the data for analysis:
      
      ${contextSection}
      
      TRANSCRIPT 1 (OLDEST - 3 meetings ago):
      ${data.oldest}
      
      TRANSCRIPT 2 (MIDDLE - 2 meetings ago):
      ${data.middle}
      
      TRANSCRIPT 3 (RECENT - Most recent meeting):
      ${data.recent}
      
      Analyze the trajectory and provide the psychological report based on the schema.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptText,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_SCHEMA,
        temperature: 0.4,
      },
    });

    if (!response.text) {
      throw new Error("No response generated");
    }

    const result = JSON.parse(response.text) as AnalysisResult;
    return result;
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

export const askFollowUpQuestion = async (
  data: TranscriptData,
  analysisResult: AnalysisResult,
  history: ChatMessage[],
  question: string
): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API key not configured");

    const ai = new GoogleGenAI({ apiKey });

    // Build context similar to analysis
    let contextSection = "CONTEXT & BACKGROUND:\n";
    if (data.clientProfile) {
      contextSection += `Client Name: ${data.clientProfile.name}\n`;
      contextSection += `Average Spend: ${data.clientProfile.monthlySpend}\n`;
      contextSection += `Relationship Duration: ${data.clientProfile.duration}\n`;
      contextSection += `Client Profile Notes: ${data.clientProfile.notes}\n`;
    }
    contextSection += `Additional User Notes: ${data.context || "None provided."}\n`;

    const promptText = `
      You are an expert client relationship analyst. You have just analyzed a set of meeting transcripts and provided a report.
      Now the user is asking a follow-up question to dig deeper.
      
      HERE IS THE DATA YOU ANALYZED:
      ${contextSection}
      
      TRANSCRIPT 1 (OLDEST): ${data.oldest}
      TRANSCRIPT 2 (MIDDLE): ${data.middle}
      TRANSCRIPT 3 (RECENT): ${data.recent}
      
      HERE IS YOUR PREVIOUS ANALYSIS SUMMARY:
      - Trajectory: ${analysisResult.bottomLine.trajectory}
      - Churn Risk: ${analysisResult.bottomLine.churnRisk}
      - Real Issue: ${analysisResult.bottomLine.whatsReallyGoingOn}
      
      CONVERSATION HISTORY:
      ${history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}
      
      USER QUESTION: "${question}"
      
      Answer the user's question directly, citing specific quotes or patterns from the transcripts if possible. 
      Be helpful, insightful, and keep the "relationship psychologist" persona. 
      Keep your answer concise (under 150 words) unless asked for a detailed breakdown.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptText,
      config: {
        temperature: 0.5,
      },
    });

    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Chat failed:", error);
    throw error;
  }
};
