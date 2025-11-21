import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

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
        languagePatterns: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Notable shifts in commitment, ownership, or hedging (both positive and negative)." },
        energyFlags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Signals in tone, responsiveness, multitasking, or enthusiasm." },
        trustConcerns: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Moments that may indicate emerging doubts (new decision makers, comparisons, repeated clarifications)." },
        financialAnxiety: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Budget pressure, cash flow concerns, or risk sensitivity mentioned or implied." },
        positiveSignals: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Evidence of trust, partnership, or long-term thinking that is still present." },
      },
      required: ["languagePatterns", "energyFlags", "trustConcerns", "financialAnxiety", "positiveSignals"],
    },
    criticalMoments: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          quote: { type: SchemaType.STRING },
          surfaceRead: { type: SchemaType.STRING, description: "What someone focused only on metrics might think this means." },
          deepMeaning: { type: SchemaType.STRING, description: "Your more nuanced interpretation. Use 'likely / may / could' language." },
          implication: { type: SchemaType.STRING, description: "Why it matters for relationship health and what it suggests might happen next." },
          confidence: { type: SchemaType.STRING, enum: ["Low", "Medium", "High"], description: "How confident you are in this interpretation." },
          type: { type: SchemaType.STRING, description: "Label the moment, e.g. 'trust', 'strategy', 'financial', 'communication'." },
        },
        required: ["quote", "surfaceRead", "deepMeaning", "implication", "confidence"],
      },
    },
    bottomLine: {
      type: SchemaType.OBJECT,
      properties: {
        trajectory: { type: SchemaType.STRING, enum: ["Strengthening", "Stable", "Declining", "Critical"] },
        churnRisk: { type: SchemaType.STRING, enum: ["Low", "Medium", "High", "Immediate"] },
        clientConfidence: { type: SchemaType.INTEGER, description: "Score from 1 to 10 (your best estimate of their confidence in the partnership)." },
        confidenceInAssessment: { type: SchemaType.STRING, enum: ["Low", "Medium", "High"], description: "How confident you are in your overall read, based on clarity and consistency of signals." },
        whatsReallyGoingOn: { type: SchemaType.STRING, description: "One sentence: the core tension or worry from the client's perspective. Phrase as a hypothesis (e.g. 'They're probably worried that…')." },
        likelyUnderlyingDriverIfChurn: { type: SchemaType.STRING, description: "If they were to pause or leave, what would most likely be the main driver from their perspective? Phrase as a hypothesis, not a judgment." },
      },
      required: ["trajectory", "churnRisk", "clientConfidence", "confidenceInAssessment", "whatsReallyGoingOn", "likelyUnderlyingDriverIfChurn"],
    },
    actionPlan: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          action: { type: SchemaType.STRING },
          why: { type: SchemaType.STRING },
          how: { type: SchemaType.STRING, description: "Exact language/approach to use. Phrase as collaborative and respectful (e.g. 'Can we align on…', 'Would it be helpful if we…')." },
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
    blindSpotsForYourPersonality: {
      type: SchemaType.OBJECT,
      description: "Personality-based blind spots that the pod leader might have when analyzing this client relationship",
      properties: {
        overview: { type: SchemaType.STRING, description: "Brief overview of what the pod leader's personality type might naturally overlook in this specific analysis" },
        specificBlindSpots: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Specific signals in these transcripts that this personality type might miss or underweight" },
        whatToWatchFor: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "Concrete things for this personality type to pay extra attention to" },
      },
      required: ["overview", "specificBlindSpots", "whatToWatchFor"],
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

interface PodLeaderProfile {
  id: string;
  name: string;
  email: string;
  pod?: string;
  personalitySummary?: string;
  createdAt: number;
  updatedAt: number;
}

export class GeminiService {
  private ai: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenerativeAI(apiKey);
  }

  async analyzeRelationship(data: TranscriptData, podLeaderProfile?: PodLeaderProfile | null): Promise<any> {
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
        ${podLeaderProfile?.personalitySummary ? 'CRITICAL: Include the blindSpotsForYourPersonality section based on the pod leader personality profile provided above.' : ''}
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
