/**
 * Luna Firebase Configuration (Mobile)
 * =====================================
 * Configuração do Firebase para React Native com Expo.
 */

import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, getDocs, query, orderBy, limit, deleteDoc } from 'firebase/firestore';

// Configuração do Firebase (mesma do app web)
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

// Inicializar Auth com AsyncStorage para persistência
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Inicializar Firestore
export const db = getFirestore(app);

// =============================================================================
// FUNÇÕES DE PERFIL (FIRESTORE)
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
    console.warn("[FIREBASE] Erro ao buscar perfil:", error.code);
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

export default app;
