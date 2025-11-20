import { GoogleGenAI, Schema, Type } from "@google/genai";

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

interface TranscriptData {
  oldest: string;
  middle: string;
  recent: string;
  context: string;
  clientProfile?: {
    name: string;
    monthlySpend: string;
    duration: string;
    notes: string;
  };
}

export class GeminiService {
  private apiKey: string;
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.ai = new GoogleGenAI({ apiKey });
  }

  async analyzeRelationship(data: TranscriptData): Promise<any> {
    try {
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

      const response = await this.ai.models.generateContent({
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

      const result = JSON.parse(response.text);
      return result;
    } catch (error) {
      console.error("Analysis failed:", error);
      throw error;
    }
  }
}
