import * as React from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import {
    GoogleAuthProvider,
    signInWithCredential,
} from 'firebase/auth';
import { auth, createUserProfile, getUserProfile } from '../config/firebaseStore';
import { Alert } from 'react-native';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

export const useGoogleAuth = () => {
    // Usamos uma URL fixa do Proxy da Expo para garantir compatibilidade com o Google Cloud
    // O usuário é 'anonymous' porque está rodando no Expo Go sem login na CLI
    const redirectUri = "https://auth.expo.io/@anonymous/luna-mobile";

    const [request, response, promptAsync] = Google.useAuthRequest({
        // Substitua pelos seus IDs REAIS do console do Google Cloud
        androidClientId: "SEU_ANDROID_CLIENT_ID.apps.googleusercontent.com",
        iosClientId: "SEU_IOS_CLIENT_ID.apps.googleusercontent.com",
        webClientId: "529601808898-nmlorgto19a1smpagh6vj33mn4b1g2qi.apps.googleusercontent.com",
        redirectUri: redirectUri
    });

    const [isLoading, setIsLoading] = React.useState(false);

    React.useEffect(() => {
        console.log("==================================================");
        console.log("[GOOGLE AUTH] Usando Redirect URI Fixa:", redirectUri);
        console.log("⚠️ ADICIONE NO GOOGLE CLOUD:", redirectUri);
        console.log("==================================================");

        if (response?.type === 'success') {
            const { id_token } = response.params;
            console.log("[GOOGLE AUTH] Login success.");
            handleGoogleSignIn(id_token);
        } else if (response?.type === 'error') {
            console.error("[GOOGLE AUTH] Error response:", response.error);
            Alert.alert('Erro Google', 'O Google recusou a conexão (Erro 400). Verifique se a URL https://auth.expo.io/@anonymous/luna-mobile está autorizada no Console.');
        }
    }, [response]);

    const handleGoogleSignIn = async (idToken: string) => {
        if (!idToken) return;
        setIsLoading(true);
        try {
            const credential = GoogleAuthProvider.credential(idToken);
            console.log("[GOOGLE AUTH] Connected. Getting profile...");
            const result = await signInWithCredential(auth, credential);

            const existingProfile = await getUserProfile(result.user.uid);
            if (!existingProfile) {
                await createUserProfile(
                    result.user.uid,
                    result.user.displayName || 'Usuário Google',
                    result.user.email || ''
                );
            }
        } catch (error: any) {
            console.error("[GOOGLE AUTH] Firebase Error:", error);
            Alert.alert('Erro Firebase', error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        login: () => {
            promptAsync();
        },
        isLoading,
        isReady: !!request,
    };
};
