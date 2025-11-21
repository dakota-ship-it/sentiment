import {
    collection,
    addDoc, setDoc,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    limit,
    Timestamp
} from "firebase/firestore";
import { db } from "./firebase";
import { ClientProfile, AnalysisResult, TranscriptData } from "../types";

// Collection References
const clientsRef = collection(db, "clients");
const analysesRef = collection(db, "analyses");

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
            const mappingData: Partial<ClientMeetingMapping> = {
                clientId: mapping.clientId,
                participantEmails: mapping.participantEmails,
                titlePattern: mapping.titlePattern,
                fathomMeetingIds: mapping.fathomMeetingIds,
                autoDetect: mapping.autoDetect
            };
            await updateDoc(docRef, mappingData).catch(async () => {
                // If document doesn't exist, create it
                await setDoc(docRef, mappingData);
            });
        } catch (error) {
            console.error("Error setting client mapping:", error);
            throw error;
        }
    },

    // Get notification preferences
    getNotificationPreferences: async (clientId: string): Promise<NotificationPreferences | null> => {
        try {
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
            const prefsData: Partial<NotificationPreferences> = {
                clientId: prefs.clientId,
                podLeaderEmail: prefs.podLeaderEmail,
                notifyOnNewTranscript: prefs.notifyOnNewTranscript,
                notifyOnAutoAnalysis: prefs.notifyOnAutoAnalysis,
                slackWebhookUrl: prefs.slackWebhookUrl
            };
            await updateDoc(docRef, prefsData).catch(async () => {
                // If document doesn't exist, create it
                await setDoc(docRef, prefsData);
            });
        } catch (error) {
            console.error("Error setting notification preferences:", error);
            throw error;
        }
    },

    // Get transcript queue
    getTranscriptQueue: async (clientId: string): Promise<TranscriptQueue | null> => {
        try {
            const docSnap = await getDocs(query(collection(db, "transcript_queues"), where("clientId", "==", clientId)));
            if (docSnap.empty) {
                return null;
            }
            return docSnap.docs[0].data() as TranscriptQueue;
        } catch (error) {
            console.error("Error fetching transcript queue:", error);
            return null;
        }
    }
};
