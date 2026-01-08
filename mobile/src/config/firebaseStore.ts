/**
 * Luna Mobile Firebase Configuration
 * Clean Version: Removed all problematic imports to resolve Metro build errors.
 */

import { initializeApp } from 'firebase/app';
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    User
} from 'firebase/auth';
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc
} from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCosp9qvfflDF3hFFvmbg5ei4a6v8NCfA0",
    authDomain: "luna-8787d.firebaseapp.com",
    projectId: "luna-8787d",
    storageBucket: "luna-8787d.firebasestorage.app",
    messagingSenderId: "1068126871324",
    appId: "1:1068126871324:web:6f4bfc6e06a333c73564d9",
    measurementId: "G-NBE3E0TMCY"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    preferences: {
        tone: string;
        theme: string;
        language: string;
    };
    is_premium: boolean;
    plan: string;
    created_at: Date;
    updated_at: Date;
}

export const loginWithEmail = async (email: string, password: string) => {
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: result.user };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const registerWithEmail = async (email: string, password: string, displayName: string) => {
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await createUserProfile(result.user.uid, displayName, email);
        return { success: true, user: result.user };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const logout = async () => {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    try {
        if (!uid) return null;
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { ...docSnap.data(), id: docSnap.id } as UserProfile;
        }
        return null;
    } catch (error) {
        console.warn("[FIREBASE] Profile not available:", error);
        return null;
    }
};

export const createUserProfile = async (uid: string, name: string, email: string) => {
    try {
        const profile = {
            name: name,
            email: email,
            preferences: {
                tone: "friendly",
                theme: "dark",
                language: "pt-BR"
            },
            is_premium: false,
            plan: 'spark',
            created_at: new Date(),
            updated_at: new Date()
        };

        await setDoc(doc(db, "users", uid), profile);
        return true;
    } catch (error) {
        console.error("Error creating profile:", error);
        return false;
    }
};

export const updateUserProfile = async (uid: string, updates: Partial<UserProfile>) => {
    try {
        const docRef = doc(db, "users", uid);
        await updateDoc(docRef, {
            ...updates,
            updated_at: new Date()
        });
        return true;
    } catch (error) {
        console.error("Error updating profile:", error);
        return false;
    }
};

export const onAuthChange = (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
};

export default app;
