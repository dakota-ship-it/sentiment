import {
    collection,
    addDoc,
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
import { ClientProfile, AnalysisResult, TranscriptData } from "../types";

// Collection References
const clientsRef = collection(db, "clients");
const analysesRef = collection(db, "analyses");

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
                orderBy("date", "desc"),
                limit(5)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => doc.data() as DBAnalysis);
        } catch (error) {
            console.error("Error fetching history:", error);
            throw error;
        }
    }
};
