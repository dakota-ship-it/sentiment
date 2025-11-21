import { GoogleGenAI, Schema } from "@google/genai";
import { Type } from "@google/genai";
import { TranscriptData, AnalysisResult, ChatMessage, PodLeaderProfile } from "../types";

const SYSTEM_INSTRUCTION = `
You are a client relationship analyst who helps agency teams understand the health of their client relationships over time.

Your job is to:
- Detect patterns and shifts in engagement, tone, and content of conversation across multiple meetings.
- Separate observable facts (what was said / done) from your interpretations (what it might mean).
- Offer calm, professional, and psychologically informed hypotheses about relationship health and risk.
- Suggest practical, respectful actions the account team can take to strengthen trust and alignment.

You will be provided with three transcripts (Oldest, Middle, Recent) and context about the client.
Analyze the trajectory across these three points in time.

Tone and style:
- Be candid and clear, but neutral and non-judgmental.
- Do NOT dramatize or speculate wildly; avoid mind-reading.
- Use probabilistic language ("this likely suggests…", "this could mean…") instead of absolute claims.
- When describing risk (e.g., churn), be straightforward but constructive: focus on what can still be influenced.

When you give interpretations:
- Explicitly distinguish between: (1) what is observable in the transcripts, and (2) your best interpretation of those observations.
- Assume the client is generally reasonable and acting in good faith, even if they're frustrated or anxious.
- Avoid blaming language about the client or the agency; frame issues as misalignment, unmet expectations, or unclear communication.

Your ultimate goal is to:
- Help the team see subtle signals they might miss.
- Provide a grounded view of relationship health.
- Recommend specific actions and language that could improve the relationship.

SARCASM & PASSIVE-AGGRESSIVE DETECTION:
Pay attention to sarcasm, passive-aggressive comments, backhanded compliments, and dismissive language as potential signals of underlying concerns. Look for:
- Saying "fine" or "great" in a context that suggests hesitation
- Comments that seem positive but may carry undertones of frustration
- Dismissive phrases like "whatever you think is best" when disengaged
- Phrases that could indicate unspoken concerns
Note: Always use probabilistic language when interpreting these signals.

COMMUNICATION STYLE ANALYSIS:
Analyze each key participant's communication style and how it evolves across the meetings. Look for shifts in engagement patterns.

ACTION ITEM TRACKING:
Extract action items, commitments, and follow-ups ONLY from the most recent transcript. These are the current open items that need attention.

PERSONALITY-BASED BLIND SPOT ANALYSIS:
If the pod leader has provided their personality profile (Enneagram, MBTI, DISC, etc.), you should identify blind spots they might have when analyzing this relationship.
- Consider what signals their personality type naturally emphasizes or overlooks
- Point out specific moments in these transcripts that they might miss based on their cognitive style
- Be specific and cite actual evidence from the transcripts
- Frame this as helpful self-awareness, not criticism
- Only include this section if a personality profile is provided
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
        languagePatterns: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Notable shifts in commitment, ownership, or hedging (both positive and negative)." },
        energyFlags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Signals in tone, responsiveness, multitasking, or enthusiasm." },
        trustConcerns: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Moments that may indicate emerging doubts (new decision makers, comparisons, repeated clarifications)." },
        financialAnxiety: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Budget pressure, cash flow concerns, or risk sensitivity mentioned or implied." },
        positiveSignals: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Evidence of trust, partnership, or long-term thinking that is still present." },
      },
      required: ["languagePatterns", "energyFlags", "trustConcerns", "financialAnxiety", "positiveSignals"],
    },
    criticalMoments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          quote: { type: Type.STRING },
          surfaceRead: { type: Type.STRING, description: "What someone focused only on metrics might think this means." },
          deepMeaning: { type: Type.STRING, description: "Your more nuanced interpretation. Use 'likely / may / could' language." },
          implication: { type: Type.STRING, description: "Why it matters for relationship health and what it suggests might happen next." },
          confidence: { type: Type.STRING, enum: ["Low", "Medium", "High"], description: "How confident you are in this interpretation." },
          type: { type: Type.STRING, description: "Label the moment, e.g. 'trust', 'strategy', 'financial', 'communication'." },
        },
        required: ["quote", "surfaceRead", "deepMeaning", "implication", "confidence"],
      },
    },
    bottomLine: {
      type: Type.OBJECT,
      properties: {
        trajectory: { type: Type.STRING, enum: ["Strengthening", "Stable", "Declining", "Critical"] },
        churnRisk: { type: Type.STRING, enum: ["Low", "Medium", "High", "Immediate"] },
        clientConfidence: { type: Type.INTEGER, description: "Score from 1 to 10 (your best estimate of their confidence in the partnership)." },
        confidenceInAssessment: { type: Type.STRING, enum: ["Low", "Medium", "High"], description: "How confident you are in your overall read, based on clarity and consistency of signals." },
        whatsReallyGoingOn: { type: Type.STRING, description: "One sentence: the core tension or worry from the client's perspective. Phrase as a hypothesis (e.g. 'They're probably worried that…')." },
        likelyUnderlyingDriverIfChurn: { type: Type.STRING, description: "If they were to pause or leave, what would most likely be the main driver from their perspective? Phrase as a hypothesis, not a judgment." },
      },
      required: ["trajectory", "churnRisk", "clientConfidence", "confidenceInAssessment", "whatsReallyGoingOn", "likelyUnderlyingDriverIfChurn"],
    },
    actionPlan: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING },
          why: { type: Type.STRING },
          how: { type: Type.STRING, description: "Exact language/approach to use. Phrase as collaborative and respectful (e.g. 'Can we align on…', 'Would it be helpful if we…')." },
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
    blindSpotsForYourPersonality: {
      type: Type.OBJECT,
      description: "Personality-based blind spots that the pod leader might have when analyzing this client relationship",
      properties: {
        overview: { type: Type.STRING, description: "Brief overview of what the pod leader's personality type might naturally overlook in this specific analysis" },
        specificBlindSpots: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific signals in these transcripts that this personality type might miss or underweight" },
        whatToWatchFor: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Concrete things for this personality type to pay extra attention to" },
      },
      required: ["overview", "specificBlindSpots", "whatToWatchFor"],
    },
  },
  required: ["trajectoryAnalysis", "subtleSignals", "criticalMoments", "bottomLine", "actionPlan", "meetingActionItems", "communicationStyles", "sarcasmInstances"],
};

export const analyzeRelationship = async (data: TranscriptData, podLeaderProfile?: PodLeaderProfile | null): Promise<AnalysisResult> => {
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

    // Build pod leader personality section
    let podLeaderSection = "";
    if (podLeaderProfile?.personalitySummary) {
      podLeaderSection = `
POD LEADER PERSONALITY PROFILE:
${podLeaderProfile.personalitySummary}

IMPORTANT: Based on this personality profile, identify specific blind spots this pod leader might have when analyzing these transcripts.
Point out signals they might naturally overlook or underweight given their cognitive style and personality tendencies.
Cite specific moments from the transcripts that their personality type might miss.
`;
    }

    // Construct the prompt content
    const promptText = `
      Here is the data for analysis:

      ${contextSection}
      ${historicalSection}
      ${podLeaderSection}

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
      ${podLeaderProfile?.personalitySummary ? 'CRITICAL: Include the blindSpotsForYourPersonality section based on the pod leader personality profile provided above.' : ''}
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

      Your role:
      - Stay calm, neutral, and non-judgmental.
      - Distinguish between what is observable in the transcripts and your interpretation.
      - Use probabilistic language ("likely", "may", "could") instead of absolute certainty.
      - Focus on giving the user something they can practically do or say next.

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
      Be helpful, insightful, and maintain a calm, objective relationship strategist perspective.
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
      - Likely Driver If Churn: ${analysisResult.bottomLine.likelyUnderlyingDriverIfChurn}

      Key Signals Detected:
      - Language Patterns: ${analysisResult.subtleSignals.languagePatterns.join('; ')}
      - Energy Flags: ${analysisResult.subtleSignals.energyFlags.join('; ')}
      - Trust Concerns: ${analysisResult.subtleSignals.trustConcerns.join('; ')}

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
      - Likely Driver If Churn: ${analysisResult.bottomLine.likelyUnderlyingDriverIfChurn}

      Key Signals:
      - Language Patterns: ${analysisResult.subtleSignals.languagePatterns.join('; ')}
      - Energy Flags: ${analysisResult.subtleSignals.energyFlags.join('; ')}
      - Positive Signals: ${analysisResult.subtleSignals.positiveSignals.join('; ')}

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
