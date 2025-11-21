import {
    collection,
    addDoc, setDoc,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    orderBy,
    limit,
    Timestamp
} from "firebase/firestore";
import { db } from "./firebase";
import { ClientProfile, AnalysisResult, TranscriptData, ClientRelationshipHistory } from "../types";

// Collection References
const clientsRef = collection(db, "clients");
const analysesRef = collection(db, "analyses");
const clientMappingsRef = collection(db, "client_mappings");
const transcriptQueuesRef = collection(db, "transcript_queues");
const notificationPrefsRef = collection(db, "notification_preferences");
const relationshipHistoryRef = collection(db, "relationship_history");

// Types for DB
interface DBClient extends ClientProfile {
    ownerId: string;
}

interface DBAnalysis {
    clientId: string;
    ownerId: string;
    date: Timestamp;
    result: AnalysisResult;
    transcriptData: TranscriptData;
}

// Fathom Integration Types
export interface ClientMeetingMapping {
    clientId: string;
    participantEmails?: string[];
    titlePattern?: string;
    fathomMeetingIds?: string[];
    autoDetect?: boolean;
}

export interface NotificationPreferences {
    clientId: string;
    podLeaderEmail: string;
    notifyOnNewTranscript?: boolean;
    notifyOnAutoAnalysis?: boolean;
    slackWebhookUrl?: string;
}

export interface TranscriptQueue {
    clientId: string;
    transcripts: Array<{
        fathomMeetingId: string;
        transcript: string;
        meetingDate: string;
        meetingTitle: string;
        addedAt: number;
        sequence: 'oldest' | 'middle' | 'recent';
    }>;
    lastProcessed?: number;
    autoAnalysisEnabled: boolean;
}

export const dbService = {
    // Get all clients (shared across organization)
    getClients: async (): Promise<ClientProfile[]> => {
        try {
            const snapshot = await getDocs(clientsRef);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClientProfile));
        } catch (error) {
            console.error("Error fetching clients:", error);
            // Return empty array instead of throwing to prevent blank screen
            return [];
        }
    },

    // Add a new client
    addClient: async (userId: string, client: Omit<ClientProfile, "id" | "createdAt">): Promise<ClientProfile> => {
        try {
            const newClient = {
                ...client,
                ownerId: userId,
                createdAt: Date.now()
            };
            const docRef = await addDoc(clientsRef, newClient);
            return { id: docRef.id, ...newClient };
        } catch (error) {
            console.error("Error adding client:", error);
            throw error;
        }
    },

    // Update a client
    updateClient: async (clientId: string, updates: Partial<ClientProfile>): Promise<void> => {
        try {
            const docRef = doc(db, "clients", clientId);
            await updateDoc(docRef, updates);
        } catch (error) {
            console.error("Error updating client:", error);
            throw error;
        }
    },

    // Save an analysis result
    saveAnalysis: async (userId: string, clientId: string, result: AnalysisResult, transcriptData: TranscriptData): Promise<string> => {
        try {
            const newAnalysis: DBAnalysis = {
                clientId,
                ownerId: userId,
                date: Timestamp.now(),
                result,
                transcriptData
            };
            const docRef = await addDoc(analysesRef, newAnalysis);
            return docRef.id;
        } catch (error) {
            console.error("Error saving analysis:", error);
            throw error;
        }
    },

    // Get analysis history for a client
    getAnalysisHistory: async (clientId: string): Promise<DBAnalysis[]> => {
        try {
            const q = query(
                analysesRef,
                where("clientId", "==", clientId),
                limit(5)
            );
            const snapshot = await getDocs(q);
            // Sort in memory instead of in query
            const results = snapshot.docs.map(doc => doc.data() as DBAnalysis);
            return results.sort((a, b) => b.date.toMillis() - a.date.toMillis());
        } catch (error) {
            console.error("Error fetching history:", error);
            return [];
        }
    },

    // ============ Fathom Integration Methods ============

    // Get client meeting mapping
    getClientMapping: async (clientId: string): Promise<ClientMeetingMapping | null> => {
        try {
            const docRef = doc(db, "client_mappings", clientId);
            const docSnap = await getDocs(query(collection(db, "client_mappings"), where("clientId", "==", clientId)));
            if (docSnap.empty) {
                return null;
            }
            return docSnap.docs[0].data() as ClientMeetingMapping;
        } catch (error) {
            console.error("Error fetching client mapping:", error);
            return null;
        }
    },

    // Set client meeting mapping
    setClientMapping: async (mapping: ClientMeetingMapping): Promise<void> => {
        try {
            const docRef = doc(db, "client_mappings", mapping.clientId);
            await updateDoc(docRef, mapping as any).catch(async () => {
                // If document doesn't exist, create it
                await setDoc(docRef, mapping as any);
            });
        } catch (error) {
            console.error("Error setting client mapping:", error);
            throw error;
        }
    },

    // Get notification preferences
    getNotificationPreferences: async (clientId: string): Promise<NotificationPreferences | null> => {
        try {
            const docRef = doc(db, "notification_preferences", clientId);
            const docSnap = await getDocs(query(collection(db, "notification_preferences"), where("clientId", "==", clientId)));
            if (docSnap.empty) {
                return null;
            }
            return docSnap.docs[0].data() as NotificationPreferences;
        } catch (error) {
            console.error("Error fetching notification preferences:", error);
            return null;
        }
    },

    // Set notification preferences
    setNotificationPreferences: async (prefs: NotificationPreferences): Promise<void> => {
        try {
            const docRef = doc(db, "notification_preferences", prefs.clientId);
            await updateDoc(docRef, prefs as any).catch(async () => {
                // If document doesn't exist, create it
                await setDoc(docRef, prefs as any);
            });
        } catch (error) {
            console.error("Error setting notification preferences:", error);
            throw error;
        }
    },

    // Get transcript queue
    getTranscriptQueue: async (clientId: string): Promise<TranscriptQueue | null> => {
        try {
            const docRef = doc(db, "transcript_queues", clientId);
            const docSnap = await getDocs(query(collection(db, "transcript_queues"), where("clientId", "==", clientId)));
            if (docSnap.empty) {
                return null;
            }
            return docSnap.docs[0].data() as TranscriptQueue;
        } catch (error) {
            console.error("Error fetching transcript queue:", error);
            return null;
        }
    },

    // ============ Relationship History Methods (Rolling Summary) ============

    // Get relationship history for a client
    getRelationshipHistory: async (clientId: string): Promise<ClientRelationshipHistory | null> => {
        try {
            const docRef = doc(db, "relationship_history", clientId);
            const docSnap = await getDocs(query(relationshipHistoryRef, where("clientId", "==", clientId)));
            if (docSnap.empty) {
                return null;
            }
            return docSnap.docs[0].data() as ClientRelationshipHistory;
        } catch (error) {
            console.error("Error fetching relationship history:", error);
            return null;
        }
    },

    // Save or update relationship history
    saveRelationshipHistory: async (history: ClientRelationshipHistory): Promise<void> => {
        try {
            const docRef = doc(db, "relationship_history", history.clientId);
            await setDoc(docRef, {
                ...history,
                lastUpdated: Date.now()
            });
        } catch (error) {
            console.error("Error saving relationship history:", error);
            throw error;
        }
    },

    // Update cumulative summary after an analysis
    updateRelationshipHistoryFromAnalysis: async (
        clientId: string,
        analysisResult: AnalysisResult,
        newSummaryText: string
    ): Promise<void> => {
        try {
            const existing = await dbService.getRelationshipHistory(clientId);
            const now = new Date().toISOString();

            const updated: ClientRelationshipHistory = existing ? {
                ...existing,
                cumulativeSummary: newSummaryText,
                // Add new trajectory point
                trajectoryHistory: [
                    ...existing.trajectoryHistory,
                    {
                        date: now,
                        trajectory: analysisResult.bottomLine.trajectory,
                        churnRisk: analysisResult.bottomLine.churnRisk,
                        confidence: analysisResult.bottomLine.clientConfidence
                    }
                ].slice(-50), // Keep last 50 data points
                // Update key moments - keep top 15 most significant
                keyMoments: [
                    ...existing.keyMoments,
                    ...analysisResult.criticalMoments.slice(0, 3).map(m => ({
                        date: now,
                        quote: m.quote,
                        significance: m.deepMeaning,
                        sentiment: 'negative' as const // Simplified
                    }))
                ].slice(-15),
                // Update participant profiles
                participantProfiles: analysisResult.communicationStyles?.map(cs => {
                    const existingProfile = existing.participantProfiles.find(p => p.name === cs.participant);
                    return {
                        name: cs.participant,
                        currentStyle: cs.style,
                        styleHistory: [
                            ...(existingProfile?.styleHistory || []),
                            { date: now, style: cs.style }
                        ].slice(-20),
                        notes: cs.evolution
                    };
                }) || existing.participantProfiles,
                totalMeetingsAnalyzed: existing.totalMeetingsAnalyzed + 1,
                lastAnalysisDate: now,
                lastUpdated: Date.now()
            } : {
                // Create new history
                clientId,
                cumulativeSummary: newSummaryText,
                keyMoments: analysisResult.criticalMoments.slice(0, 3).map(m => ({
                    date: now,
                    quote: m.quote,
                    significance: m.deepMeaning,
                    sentiment: 'negative' as const
                })),
                actionItemHistory: analysisResult.meetingActionItems?.map(ai => ({
                    item: ai.item,
                    dateIdentified: now,
                    status: ai.status as 'completed' | 'pending' | 'dropped',
                    owner: ai.owner
                })) || [],
                trajectoryHistory: [{
                    date: now,
                    trajectory: analysisResult.bottomLine.trajectory,
                    churnRisk: analysisResult.bottomLine.churnRisk,
                    confidence: analysisResult.bottomLine.clientConfidence
                }],
                participantProfiles: analysisResult.communicationStyles?.map(cs => ({
                    name: cs.participant,
                    currentStyle: cs.style,
                    styleHistory: [{ date: now, style: cs.style }],
                    notes: cs.evolution
                })) || [],
                totalMeetingsAnalyzed: 1,
                firstAnalysisDate: now,
                lastAnalysisDate: now,
                lastUpdated: Date.now()
            };

            await dbService.saveRelationshipHistory(updated);
        } catch (error) {
            console.error("Error updating relationship history:", error);
            throw error;
        }
    }
};
