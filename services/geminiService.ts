import { GoogleGenAI, Schema } from "@google/genai";
import { Type } from "@google/genai";
import { TranscriptData, AnalysisResult, ChatMessage } from "../types";

const SYSTEM_INSTRUCTION = `
You are a client relationship analyst evaluating meeting transcripts to assess relationship health in agency-client relationships.
Your role is to identify patterns in communication, engagement levels, and sentiment changes over time.

You will be provided with three transcripts (Oldest, Middle, Recent) and context about the client.
Analyze the trajectory across these three points in time using objective observations and factual evidence.
Provide balanced, concise insights focused on actionable patterns rather than subjective interpretations.
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
        strengtheningIndicators: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Positive signals: proactive engagement, sharing wins, collaborative language, enthusiasm about future, trust indicators."
        },
        concerningPatterns: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Negative signals: language shifts (hedging, ownership changes), energy drops, trust erosion, financial anxiety, disappeared topics."
        },
      },
      required: ["strengtheningIndicators", "concerningPatterns"],
    },
    criticalMoments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          quote: { type: Type.STRING },
          surfaceRead: { type: Type.STRING, description: "Initial interpretation of the statement." },
          deepMeaning: { type: Type.STRING, description: "Contextual interpretation based on patterns." },
          implication: { type: Type.STRING, description: "Potential impact on the relationship." },
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
        whatsReallyGoingOn: { type: Type.STRING, description: "One concise sentence summarizing the primary concern or underlying dynamic." },
        realReasonIfChurn: { type: Type.STRING, description: "One concise sentence identifying the core issue if relationship is at risk." },
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

      Analyze the trajectory across these three transcripts and provide a BALANCED, objective assessment.

      IMPORTANT - You must identify BOTH:
      1. Strengthening indicators (positive signals, engagement, enthusiasm, trust)
      2. Concerning patterns (warning signs, disengagement, anxiety)

      CHURN RISK CALIBRATION:
      - Low: Client is engaged, shares wins, talks about future, responds promptly. Minor issues are normal.
      - Medium: Some warning signs but still engaged overall. May need attention but not urgent.
      - High: Multiple strong warning signs, clear disengagement, mentions competitors/budget cuts.
      - Immediate: Client has explicitly mentioned leaving, stopped responding, or terminated services.

      Note: Occasional rushed meetings or busy periods are NORMAL and not automatically high risk.
      Focus on sustained patterns across all three transcripts, not isolated incidents.

      Keep insights concise and actionable. Limit each array to 3-5 most significant items.
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
      You are a client relationship analyst. You have analyzed a set of meeting transcripts and provided a report.
      Now the user is asking a follow-up question.

      HERE IS THE DATA YOU ANALYZED:
      ${contextSection}

      TRANSCRIPT 1 (OLDEST): ${data.oldest}
      TRANSCRIPT 2 (MIDDLE): ${data.middle}
      TRANSCRIPT 3 (RECENT): ${data.recent}

      HERE IS YOUR PREVIOUS ANALYSIS SUMMARY:
      - Trajectory: ${analysisResult.bottomLine.trajectory}
      - Churn Risk: ${analysisResult.bottomLine.churnRisk}
      - Primary Concern: ${analysisResult.bottomLine.whatsReallyGoingOn}

      CONVERSATION HISTORY:
      ${history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}

      USER QUESTION: "${question}"

      Answer the user's question directly and objectively, citing specific quotes or patterns from the transcripts when relevant.
      Keep your answer concise (2-3 sentences) unless the question specifically requests detailed analysis.
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
