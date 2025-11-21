import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const SYSTEM_INSTRUCTION = `
You are a client relationship analyst specializing in detecting subtle emotional and psychological signals that indicate relationship health in agency-client relationships.
Your job is to analyze meeting transcripts and identify warning signs that someone focused purely on tactics and metrics would miss.
You help agency account managers understand what their clients are REALLY thinking and feeling.

You will be provided with three transcripts (Oldest, Middle, Recent) and context about the client.
Analyze the trajectory across these three points in time.
Be direct, honest, and psychological in your assessment. Don't sugarcoat.

SARCASM & PASSIVE-AGGRESSIVE DETECTION:
Pay special attention to sarcasm, passive-aggressive comments, backhanded compliments, and dismissive language. These are often the most telling signs of underlying dissatisfaction. Look for:
- Saying "fine" or "great" in a context that suggests the opposite
- Exaggerated praise that feels hollow or mocking
- Comments that seem positive but carry undertones of frustration
- Dismissive phrases like "whatever you think is best" when disengaged
- Backhanded compliments that criticize while appearing to praise
- Eye-roll moments even in text (phrases like "sure, let's try that again")

COMMUNICATION STYLE ANALYSIS:
Analyze each key participant's communication style and how it evolves across the meetings. Look for shifts from collaborative to defensive, or from engaged to disengaged.

ACTION ITEM TRACKING:
Extract action items, commitments, and follow-ups ONLY from the most recent transcript. These are the current open items that need attention.
`;

const ANALYSIS_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    trajectoryAnalysis: {
      type: SchemaType.OBJECT,
      properties: {
        engagement: { type: SchemaType.STRING, enum: ["Increasing", "Stable", "Declining"] },
        meetingLength: { type: SchemaType.STRING, enum: ["Shorter", "Stable", "Longer"] },
        energy: { type: SchemaType.STRING, enum: ["Rising", "Falling", "Flat"] },
        futureTalk: { type: SchemaType.STRING, enum: ["More", "Less", "Same"] },
      },
      required: ["engagement", "meetingLength", "energy", "futureTalk"],
    },
    subtleSignals: {
      type: SchemaType.OBJECT,
      properties: {
        languagePatterns: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Shifts in commitment, ownership, or hedging." },
        energyFlags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Tone, answers, multitasking signals." },
        trustErosion: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "New decision makers, comparisons, questioning agreements." },
        financialAnxiety: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Budget mentions, pressure indicators." },
        disappeared: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Strategic talks, sharing wins, future planning." },
      },
      required: ["languagePatterns", "energyFlags", "trustErosion", "financialAnxiety", "disappeared"],
    },
    criticalMoments: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          quote: { type: SchemaType.STRING },
          surfaceRead: { type: SchemaType.STRING, description: "What a low-EQ person thinks this means." },
          deepMeaning: { type: SchemaType.STRING, description: "The real signal." },
          implication: { type: SchemaType.STRING, description: "Why it matters." },
        },
        required: ["quote", "surfaceRead", "deepMeaning", "implication"],
      },
    },
    bottomLine: {
      type: SchemaType.OBJECT,
      properties: {
        trajectory: { type: SchemaType.STRING, enum: ["Strengthening", "Stable", "Declining", "Critical"] },
        churnRisk: { type: SchemaType.STRING, enum: ["Low", "Medium", "High", "Immediate"] },
        clientConfidence: { type: SchemaType.INTEGER, description: "Score from 1 to 10" },
        whatsReallyGoingOn: { type: SchemaType.STRING, description: "One sentence - what are they worried about that they're not saying?" },
        realReasonIfChurn: { type: SchemaType.STRING, description: "Strip away polite excuses - what's the actual issue?" },
      },
      required: ["trajectory", "churnRisk", "clientConfidence", "whatsReallyGoingOn", "realReasonIfChurn"],
    },
    actionPlan: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          action: { type: SchemaType.STRING },
          why: { type: SchemaType.STRING },
          how: { type: SchemaType.STRING, description: "Exact language/approach to use." },
        },
        required: ["action", "why", "how"],
      },
    },
    meetingActionItems: {
      type: SchemaType.ARRAY,
      description: "Action items, commitments, and follow-ups extracted from the MOST RECENT transcript only",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          item: { type: SchemaType.STRING, description: "The specific action item or commitment" },
          owner: { type: SchemaType.STRING, description: "Who is responsible: 'agency' or 'client'" },
          status: { type: SchemaType.STRING, enum: ["pending", "in-progress"], description: "Current status of the action item" },
          notes: { type: SchemaType.STRING, description: "Context about the item or why it matters" },
        },
        required: ["item", "owner", "status", "notes"],
      },
    },
    communicationStyles: {
      type: SchemaType.ARRAY,
      description: "Communication style analysis for key participants",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          participant: { type: SchemaType.STRING, description: "Name or role of the participant" },
          style: { type: SchemaType.STRING, enum: ["direct", "passive", "collaborative", "defensive", "disengaged"] },
          traits: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Specific communication traits observed" },
          evolution: { type: SchemaType.STRING, description: "How their communication style changed across the transcripts" },
        },
        required: ["participant", "style", "traits", "evolution"],
      },
    },
    sarcasmInstances: {
      type: SchemaType.ARRAY,
      description: "Detected instances of sarcasm, passive-aggressive comments, or dismissive language",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          quote: { type: SchemaType.STRING, description: "The exact quote from the transcript" },
          source: { type: SchemaType.STRING, enum: ["oldest", "middle", "recent"] },
          type: { type: SchemaType.STRING, enum: ["sarcasm", "passive-aggressive", "backhanded-compliment", "dismissive"] },
          underlyingMeaning: { type: SchemaType.STRING, description: "What they really meant" },
          severity: { type: SchemaType.STRING, enum: ["mild", "moderate", "severe"] },
        },
        required: ["quote", "source", "type", "underlyingMeaning", "severity"],
      },
    },
  },
  required: ["trajectoryAnalysis", "subtleSignals", "criticalMoments", "bottomLine", "actionPlan", "meetingActionItems", "communicationStyles", "sarcasmInstances"],
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
  additionalTranscripts?: string[];
  feedback?: {
    inaccuracies?: string;
    additionalContext?: string;
    focusAreas?: string[];
  };
}

export class GeminiService {
  private ai: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenerativeAI(apiKey);
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

      // Build additional transcripts section if provided
      let additionalTranscriptsSection = "";
      if (data.additionalTranscripts && data.additionalTranscripts.length > 0) {
        additionalTranscriptsSection = "\nADDITIONAL TRANSCRIPTS (for deeper context):\n";
        data.additionalTranscripts.forEach((transcript, idx) => {
          additionalTranscriptsSection += `\nADDITIONAL TRANSCRIPT ${idx + 1}:\n${transcript}\n`;
        });
      }

      // Build feedback section if this is a re-run
      let feedbackSection = "";
      if (data.feedback) {
        feedbackSection = "\nPOD LEADER FEEDBACK (incorporate this into your analysis):\n";
        if (data.feedback.inaccuracies) {
          feedbackSection += `Previous analysis inaccuracies to correct: ${data.feedback.inaccuracies}\n`;
        }
        if (data.feedback.additionalContext) {
          feedbackSection += `Additional context: ${data.feedback.additionalContext}\n`;
        }
        if (data.feedback.focusAreas && data.feedback.focusAreas.length > 0) {
          feedbackSection += `Focus areas for this analysis: ${data.feedback.focusAreas.join(", ")}\n`;
        }
      }

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
        ${additionalTranscriptsSection}
        ${feedbackSection}

        Analyze the trajectory and provide the psychological report based on the schema.

        Important: Pay special attention to sarcasm, passive-aggressive comments, and communication style shifts. Extract all action items and track their status across meetings.
      `;

      const model = this.ai.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
        systemInstruction: SYSTEM_INSTRUCTION,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: ANALYSIS_SCHEMA,
          temperature: 0.4,
        },
      });

      const response = await model.generateContent(promptText);
      const text = response.response.text();

      if (!text) {
        throw new Error("No response generated");
      }

      const result = JSON.parse(text);
      return result;
    } catch (error) {
      console.error("Analysis failed:", error);
      throw error;
    }
  }
}
