import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme';
import { GlassBox } from '../components/GlassBox';
import { LogIn, UserPlus, Mail, Lock, Chrome } from 'lucide-react-native';
import { loginWithEmail, registerWithEmail } from '../config/firebaseStore';
import { useGoogleAuth } from '../hooks/useGoogleAuth';

const LoginScreen = () => {
    const navigation = useNavigation<any>();
    const { login: googleLogin, isLoading: isGoogleLoading } = useGoogleAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRegister, setIsRegister] = useState(false);

    const handleEmailAuth = async () => {
        if (!email || !password) {
            Alert.alert('Erro', 'Preencha todos os campos');
            return;
        }

        setIsLoading(true);
        try {
            const result = isRegister
                ? await registerWithEmail(email, password, 'Usuário Luna')
                : await loginWithEmail(email, password);

            if (result.success) {
                // navigation.replace('Home'); // O NavigationContainer no navigation/index.tsx cuida disso automaticamente agora
            } else {
                Alert.alert('Erro de Autenticação', result.error || 'Verifique suas credenciais');
            }
        } catch (error) {
            Alert.alert('Erro', 'Ocorreu um erro inesperado');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await googleLogin();
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível iniciar o login com Google');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.content}>
                    <View style={styles.logoContainer}>
                        <Text style={styles.logo}>🌙</Text>
                        <Text style={styles.title}>Luna</Text>
                        <Text style={styles.subtitle}>Sua assistente inteligente, em qualquer lugar.</Text>
                    </View>

                    <GlassBox style={styles.form}>
                        <View style={styles.inputWrapper}>
                            <Mail size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Email"
                                placeholderTextColor={theme.colors.textMuted}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.inputWrapper}>
                            <Lock size={18} color={theme.colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Senha"
                                placeholderTextColor={theme.colors.textMuted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={true}
                            />
                        </View>
                    </GlassBox>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={handleEmailAuth}
                        disabled={isLoading || isGoogleLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.buttonText}>
                                    {isRegister ? 'Criar Conta' : 'Entrar na Conta'}
                                </Text>
                                {isRegister ? <UserPlus size={20} color="#fff" /> : <LogIn size={20} color="#fff" />}
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.googleButton}
                        onPress={handleGoogleLogin}
                        disabled={isLoading || isGoogleLoading}
                    >
                        {isGoogleLoading ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <ActivityIndicator color={theme.colors.text} />
                                <Text style={styles.googleButtonText}>Conectando...</Text>
                            </View>
                        ) : (
                            <>
                                <Chrome size={20} color={theme.colors.text} />
                                <Text style={styles.googleButtonText}>Entrar com Google</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => setIsRegister(!isRegister)}
                    >
                        <Text style={styles.secondaryButtonText}>
                            {isRegister ? 'Já tenho uma conta' : 'Não tem conta? Registre-se'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        flex: 1,
        padding: theme.spacing.xl,
        justifyContent: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 48,
    },
    logo: {
        fontSize: 64,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: theme.colors.text,
        marginTop: 8,
    },
    subtitle: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 20,
    },
    form: {
        paddingVertical: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 56,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: theme.colors.text,
        fontSize: 16,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.borderLight,
        marginLeft: 44,
    },
    primaryButton: {
        backgroundColor: theme.colors.accentSecondary,
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginTop: 24,
        elevation: 4,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    googleButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginTop: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    googleButtonText: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        alignItems: 'center',
        marginTop: 24,
    },
    secondaryButtonText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
});

export default LoginScreen;
