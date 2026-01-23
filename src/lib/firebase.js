/**
 * Luna Firebase Configuration (Frontend)
 * =======================================
 * Configuração do Firebase para autenticação no React.
 */

import { initializeApp } from 'firebase/app';
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithCredential,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    sendEmailVerification,
    indexedDBLocalPersistence,
    setPersistence,
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs, query, orderBy, limit, deleteDoc } from 'firebase/firestore';

/**
 * Enviar e-mail de verificação
 */
export const sendVerificationEmail = async (user) => {
    try {
        await sendEmailVerification(user);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Enviar e-mail de recuperação de senha
 */
export const sendPasswordReset = async (email) => {
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// =====================================
// CONFIGURAÇÃO DO FIREBASE
// =====================================

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

// Configurar persistência para Electron de forma assíncrona para não bloquear
// Isso é feito em background para não atrasar o startup
setPersistence(auth, indexedDBLocalPersistence).catch((err) => {
  console.warn('[Firebase] Erro ao configurar persistência (não crítico):', err);
});

// Provider para login com Google
export const googleProvider = new GoogleAuthProvider();

// =====================================
// FUNÇÕES DE AUTENTICAÇÃO
// =====================================

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
 * Detectar se está rodando no Electron
 */
const isElectron = () => {
    return typeof window !== 'undefined' &&
        typeof window.electronAPI !== 'undefined' &&
        typeof window.electronAPI.startGoogleLogin === 'function';
};

/**
 * Login com Google (via navegador do sistema no Electron)
 */
export const loginWithGoogle = async () => {
    try {
        let user;

        if (isElectron()) {
            // Fluxo Electron: OAuth via navegador do sistema
            console.log('[Firebase] Iniciando login Google via Electron...');

            // Chamar o main process para iniciar o OAuth
            const oauthResult = await window.electronAPI.startGoogleLogin();

            if (!oauthResult.success || !oauthResult.idToken) {
                throw new Error(oauthResult.error || 'Falha no login com Google');
            }

            // Criar credencial do Google com o ID token recebido
            const credential = GoogleAuthProvider.credential(oauthResult.idToken, oauthResult.accessToken);

            // Fazer login no Firebase com a credencial
            const result = await signInWithCredential(auth, credential);
            user = result.user;
            console.log('[Firebase] Login via Electron concluído:', user.email);
        } else {
            // Fluxo Web: popup normal
            console.log('[Firebase] Iniciando login Google via popup...');
            const result = await signInWithPopup(auth, googleProvider);
            user = result.user;
        }

        // Verificar se o perfil já existe, senão criar
        const profile = await getUserProfile(user.uid);
        if (!profile) {
            await createUserProfile(
                user.uid,
                user.displayName || "Usuário",
                user.email
            );
        }

        return { success: true, user };
    } catch (error) {
        console.error("!!! ERRO NO LOGIN GOOGLE !!!", error);
        // Alertar o erro para que possamos ver no Electron (devTools) ou UI
        if (typeof window !== 'undefined') {
            console.error("Firebase Error Details:", {
                code: error.code,
                message: error.message,
                stack: error.stack
            });
        }
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
        console.log('[Firebase] Buscando perfil para UID:', uid);
        const docRef = doc(db, "users", uid);

        // Timeout reduzido para 5s (mais rápido)
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout ao buscar perfil do Firestore')), 5000)
        );

        const docSnap = await Promise.race([
            getDoc(docRef),
            timeoutPromise
        ]);

        if (docSnap.exists()) {
            const profileData = { ...docSnap.data(), id: docSnap.id };
            console.log('[Firebase] ✅ Perfil encontrado:', profileData.name || profileData.email);
            return profileData;
        }
        console.log('[Firebase] ⚠️ Perfil não existe no Firestore para UID:', uid);
        return null;
    } catch (error) {
        // Se Firestore estiver offline ou sem permissão, continua sem perfil
        if (error.message === 'Timeout ao buscar perfil do Firestore') {
            console.warn("[FIREBASE] ⚠️ Timeout ao buscar perfil (5s) - continuando sem perfil");
        } else {
            console.error("[FIREBASE] ❌ Erro ao buscar perfil:", error.code, error.message);
            console.error("[FIREBASE] Stack:", error.stack);
        }
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
            termsAcceptedAt: null,
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

/**
 * Aceitar Termos de Uso
 */
export const acceptTermsOfService = async (uid) => {
    try {
        const docRef = doc(db, "users", uid);
        await updateDoc(docRef, {
            termsAcceptedAt: new Date(),
            updated_at: new Date()
        });
        return { success: true };
    } catch (error) {
        console.error("Erro ao aceitar termos:", error);
        return { success: false, error: error.message };
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
        console.log('[Firebase] Buscando chats para UID:', uid);
        const chatsRef = collection(db, "users", uid, "chats");
        const q = query(chatsRef, orderBy("updated_at", "desc"), limit(maxChats));
        const querySnapshot = await getDocs(q);

        const chats = [];
        querySnapshot.forEach((doc) => {
            chats.push({ id: doc.id, ...doc.data() });
        });

        console.log(`[Firebase] ✅ Encontrados ${chats.length} chats no Firestore`);
        return chats;
    } catch (error) {
        console.error("[Firebase] ❌ Erro ao listar chats:", error);
        console.error("[Firebase] Error code:", error.code);
        console.error("[Firebase] Error message:", error.message);
        // Retornar array vazio em caso de erro (permite que o app continue funcionando)
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
