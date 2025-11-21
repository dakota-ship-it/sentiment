import { getFunctions, httpsCallable } from "firebase/functions";
import { TranscriptData, AnalysisResult, ChatMessage } from "../types";
import { app } from "./firebase";

// Initialize Firebase Functions
const functions = getFunctions(app);

/**
 * Analyze relationship using the backend Cloud Function
 * This keeps the Gemini API key server-side only
 */
export const analyzeRelationship = async (data: TranscriptData): Promise<AnalysisResult> => {
  try {
    const analyzeTranscripts = httpsCallable<{ transcriptData: TranscriptData }, { success: boolean; result: AnalysisResult }>(
      functions,
      'analyzeTranscripts'
    );

    const response = await analyzeTranscripts({ transcriptData: data });

    if (!response.data.success || !response.data.result) {
      throw new Error("Analysis failed - no result returned");
    }

    return response.data.result;
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

/**
 * Ask follow-up questions using the backend Cloud Function
 */
export const askFollowUpQuestion = async (
  _data: TranscriptData,
  _analysisResult: AnalysisResult,
  _history: ChatMessage[],
  _question: string
): Promise<string> => {
  // TODO: Implement follow-up chat via Cloud Function
  // For now, return a placeholder message
  return "Follow-up chat is being migrated to the server. Please try again later.";
};
