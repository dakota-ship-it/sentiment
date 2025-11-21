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
    meetingActionItems: {
      type: Type.ARRAY,
      description: "Action items, commitments, and follow-ups extracted from the MOST RECENT transcript only",
      items: {
        type: Type.OBJECT,
        properties: {
          item: { type: Type.STRING, description: "The specific action item or commitment" },
          owner: { type: Type.STRING, description: "Who is responsible: 'agency' or 'client'" },
          status: { type: Type.STRING, enum: ["pending", "in-progress"], description: "Current status of the action item" },
          notes: { type: Type.STRING, description: "Context about the item or why it matters" },
        },
        required: ["item", "owner", "status", "notes"],
      },
    },
    communicationStyles: {
      type: Type.ARRAY,
      description: "Communication style analysis for key participants",
      items: {
        type: Type.OBJECT,
        properties: {
          participant: { type: Type.STRING, description: "Name or role of the participant" },
          style: { type: Type.STRING, enum: ["direct", "passive", "collaborative", "defensive", "disengaged"] },
          traits: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific communication traits observed" },
          evolution: { type: Type.STRING, description: "How their communication style changed across the transcripts" },
        },
        required: ["participant", "style", "traits", "evolution"],
      },
    },
    sarcasmInstances: {
      type: Type.ARRAY,
      description: "Detected instances of sarcasm, passive-aggressive comments, or dismissive language",
      items: {
        type: Type.OBJECT,
        properties: {
          quote: { type: Type.STRING, description: "The exact quote from the transcript" },
          source: { type: Type.STRING, enum: ["oldest", "middle", "recent"] },
          type: { type: Type.STRING, enum: ["sarcasm", "passive-aggressive", "backhanded-compliment", "dismissive"] },
          underlyingMeaning: { type: Type.STRING, description: "What they really meant" },
          severity: { type: Type.STRING, enum: ["mild", "moderate", "severe"] },
        },
        required: ["quote", "source", "type", "underlyingMeaning", "severity"],
      },
    },
  },
  required: ["trajectoryAnalysis", "subtleSignals", "criticalMoments", "bottomLine", "actionPlan", "meetingActionItems", "communicationStyles", "sarcasmInstances"],
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

    // Build historical context section (rolling summary from previous analyses)
    let historicalSection = "";
    if (data.historicalContext) {
      historicalSection = `
HISTORICAL RELATIONSHIP CONTEXT (Summary of ${data.historicalContext.totalPreviousMeetings} previous meetings):
${data.historicalContext.cumulativeSummary}

Overall Trajectory Trend: ${data.historicalContext.trajectoryTrend}

Key Historical Moments to Remember:
${data.historicalContext.keyHistoricalMoments.map((m, i) => `${i + 1}. ${m}`).join('\n')}

Use this historical context to identify long-term patterns and compare current behavior to past behavior.
`;
    }

    // Construct the prompt content
    const promptText = `
      Here is the data for analysis:

      ${contextSection}
      ${historicalSection}

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
      ${data.historicalContext ? 'Compare current patterns to the historical context provided.' : ''}
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

// Generate a cumulative summary to update the rolling history
// This compresses the current analysis + existing summary into a new summary
export const generateCumulativeSummary = async (
  analysisResult: AnalysisResult,
  existingSummary: string | null,
  totalMeetings: number
): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API key not configured");

    const ai = new GoogleGenAI({ apiKey });

    const promptText = existingSummary ? `
      You are maintaining a rolling summary of a client relationship over time.

      EXISTING SUMMARY (from ${totalMeetings} previous meetings):
      ${existingSummary}

      NEW ANALYSIS RESULTS TO INCORPORATE:
      - Current Trajectory: ${analysisResult.bottomLine.trajectory}
      - Current Churn Risk: ${analysisResult.bottomLine.churnRisk}
      - Client Confidence: ${analysisResult.bottomLine.clientConfidence}/10
      - What's Really Going On: ${analysisResult.bottomLine.whatsReallyGoingOn}
      - Potential Churn Reason: ${analysisResult.bottomLine.realReasonIfChurn}

      Key Signals Detected:
      - Language Patterns: ${analysisResult.subtleSignals.languagePatterns.join('; ')}
      - Energy Flags: ${analysisResult.subtleSignals.energyFlags.join('; ')}
      - Trust Erosion: ${analysisResult.subtleSignals.trustErosion.join('; ')}

      Critical Moments:
      ${analysisResult.criticalMoments.map(m => `"${m.quote}" - ${m.deepMeaning}`).join('\n')}

      Create an UPDATED cumulative summary (max 500 words) that:
      1. Preserves important historical patterns from the existing summary
      2. Integrates the new findings
      3. Notes any changes in trajectory or sentiment over time
      4. Highlights persistent issues vs new concerns
      5. Maintains chronological awareness (this is now meeting ${totalMeetings + 1})

      The summary should be useful for future analysis sessions to understand the full history without reading all transcripts.
    ` : `
      Create an initial relationship summary based on this first analysis:

      - Trajectory: ${analysisResult.bottomLine.trajectory}
      - Churn Risk: ${analysisResult.bottomLine.churnRisk}
      - Client Confidence: ${analysisResult.bottomLine.clientConfidence}/10
      - What's Really Going On: ${analysisResult.bottomLine.whatsReallyGoingOn}
      - Potential Churn Reason: ${analysisResult.bottomLine.realReasonIfChurn}

      Key Signals:
      - Language Patterns: ${analysisResult.subtleSignals.languagePatterns.join('; ')}
      - Energy Flags: ${analysisResult.subtleSignals.energyFlags.join('; ')}

      Critical Moments:
      ${analysisResult.criticalMoments.map(m => `"${m.quote}" - ${m.deepMeaning}`).join('\n')}

      Create a concise summary (max 300 words) capturing the baseline state of this relationship. This will be used as context for future analyses.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptText,
      config: {
        temperature: 0.3, // Low temperature for consistent summaries
      },
    });

    return response.text || "Unable to generate summary.";
  } catch (error) {
    console.error("Summary generation failed:", error);
    // Return a basic summary on failure
    return `Analysis ${totalMeetings + 1}: ${analysisResult.bottomLine.trajectory} trajectory, ${analysisResult.bottomLine.churnRisk} churn risk. Key issue: ${analysisResult.bottomLine.whatsReallyGoingOn}`;
  }
};
