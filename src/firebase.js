/**
 * Luna Firebase Configuration (Frontend)
 * =======================================
 * Configuração do Firebase para autenticação no React.
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs, query, orderBy, limit, deleteDoc } from 'firebase/firestore';

// =============================================================================
// CONFIGURAÇÃO DO FIREBASE
// =============================================================================

const firebaseConfig = {
    apiKey: "AIzaSyCosp9qvfflDF3hFFvmbg5ei4a6v8NCfA0",
    authDomain: "luna-8787d.firebaseapp.com",
    projectId: "luna-8787d",
    storageBucket: "luna-8787d.firebasestorage.app",
    messagingSenderId: "1068126871324",
    appId: "1:1068126871324:web:6f4bfc6e06a333c73564d9",
    measurementId: "G-NBE3E0TMCY"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Provider para login com Google
export const googleProvider = new GoogleAuthProvider();

// =============================================================================
// FUNÇÕES DE AUTENTICAÇÃO
// =============================================================================

/**
 * Login com email e senha
 */
export const loginWithEmail = async (email, password) => {
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: result.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Registro com email e senha
 */
export const registerWithEmail = async (email, password, displayName) => {
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);

        // Criar perfil no Firestore
        await createUserProfile(result.user.uid, displayName, email);

        return { success: true, user: result.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Login com Google
 */
export const loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);

        // Verificar se o perfil já existe, senão criar
        const profile = await getUserProfile(result.user.uid);
        if (!profile) {
            await createUserProfile(
                result.user.uid,
                result.user.displayName || "Usuário",
                result.user.email
            );
        }

        return { success: true, user: result.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Logout
 */
export const logout = async () => {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// =============================================================================
// FUNÇÕES DE PERFIL
// =============================================================================

/**
 * Buscar perfil do usuário
 */
export const getUserProfile = async (uid) => {
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { ...docSnap.data(), id: docSnap.id };
        }
        return null;
    } catch (error) {
        // Se Firestore estiver offline ou sem permissão, continua sem perfil
        console.warn("[FIREBASE] Perfil não disponível (configure as regras do Firestore):", error.code);
        return null;
    }
};

/**
 * Criar perfil do usuário
 */
export const createUserProfile = async (uid, name, email) => {
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
        console.error("Erro ao criar perfil:", error);
        return false;
    }
};

/**
 * Atualizar perfil do usuário
 */
export const updateUserProfile = async (uid, updates) => {
    try {
        const docRef = doc(db, "users", uid);
        await updateDoc(docRef, {
            ...updates,
            updated_at: new Date()
        });
        return true;
    } catch (error) {
        console.error("Erro ao atualizar perfil:", error);
        return false;
    }
};

// =============================================================================
// FUNÇÕES DE CHATS
// =============================================================================

/**
 * Salvar chat no Firebase
 */
export const saveChatToFirebase = async (uid, chatId, title, messages) => {
    try {
        const chatRef = doc(db, "users", uid, "chats", chatId);
        const chatSnap = await getDoc(chatRef);

        const chatData = {
            title: title,
            messages: messages,
            updated_at: new Date()
        };

        if (!chatSnap.exists()) {
            chatData.created_at = new Date();
        }

        await setDoc(chatRef, chatData, { merge: true });
        return true;
    } catch (error) {
        console.error("Erro ao salvar chat:", error);
        return false;
    }
};

/**
 * Listar chats do usuário
 */
export const getUserChats = async (uid, maxChats = 50) => {
    try {
        const chatsRef = collection(db, "users", uid, "chats");
        const q = query(chatsRef, orderBy("updated_at", "desc"), limit(maxChats));
        const querySnapshot = await getDocs(q);

        const chats = [];
        querySnapshot.forEach((doc) => {
            chats.push({ id: doc.id, ...doc.data() });
        });

        return chats;
    } catch (error) {
        console.error("Erro ao listar chats:", error);
        return [];
    }
};

/**
 * Deletar chat
 */
export const deleteChatFromFirebase = async (uid, chatId) => {
    try {
        await deleteDoc(doc(db, "users", uid, "chats", chatId));
        return true;
    } catch (error) {
        console.error("Erro ao deletar chat:", error);
        return false;
    }
};

// =============================================================================
// LISTENER DE AUTENTICAÇÃO
// =============================================================================

/**
 * Observar mudanças no estado de autenticação
 */
export const onAuthChange = (callback) => {
    return onAuthStateChanged(auth, callback);
};

export default app;
