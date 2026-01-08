import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    SafeAreaView,
    Platform,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { theme } from '../theme';
import { GlassBox } from '../components/GlassBox';
import { MessageSquare, Sparkles, Code, BookOpen, History, LogOut } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const { profile, user, logout } = useAuth();
    const [input, setInput] = useState('');

    const displayName = profile?.name || user?.email?.split('@')[0] || 'Explorador';

    const handleLogout = () => {
        Alert.alert(
            'Sair',
            'Deseja realmente sair da conta?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Sair', style: 'destructive', onPress: () => logout() },
            ]
        );
    };

    const suggestions = [
        { id: '1', title: 'Explique me Quantum Physics', icon: <Sparkles size={20} color={theme.colors.accent} /> },
        { id: '2', title: 'Ideia de App Mobile', icon: <MessageSquare size={20} color={theme.colors.accent} /> },
        { id: '3', title: 'Ajuda com Debugging React', icon: <Code size={20} color={theme.colors.accent} /> },
        { id: '4', title: 'Resuma este livro...', icon: <BookOpen size={20} color={theme.colors.accent} /> },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Bom dia, {displayName}</Text>
                        <Text style={styles.subtitle}>Como posso ajudar hoje?</Text>
                    </View>
                    <TouchableOpacity style={styles.profileButton} onPress={handleLogout}>
                        <View style={styles.avatar}>
                            <LogOut size={20} color="#fff" />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Suggestion Cards */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Sugestões</Text>
                    <Sparkles size={16} color={theme.colors.textSecondary} />
                </View>

                <View style={styles.grid}>
                    {suggestions.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.cardWrapper}
                            onPress={() => navigation.navigate('Chat', { chatId: undefined })}
                        >
                            <GlassBox style={styles.card}>
                                <View style={styles.iconContainer}>{item.icon}</View>
                                <Text style={styles.cardText} numberOfLines={2}>{item.title}</Text>
                            </GlassBox>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Recent Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Atividade Recente</Text>
                    <History size={16} color={theme.colors.textSecondary} />
                </View>

                <TouchableOpacity onPress={() => navigation.navigate('Chat', { chatId: '123' })}>
                    <GlassBox style={styles.recentItem}>
                        <MessageSquare size={18} color={theme.colors.textSecondary} />
                        <View style={styles.recentTextContainer}>
                            <Text style={styles.recentTitle}>Primeira conversa com Luna</Text>
                            <Text style={styles.recentTime}>Agora mesmo</Text>
                        </View>
                    </GlassBox>
                </TouchableOpacity>
            </ScrollView>

            {/* Floating Bottom Input Bar */}
            <View style={styles.bottomContainer}>
                <GlassBox style={styles.inputBar}>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Comece uma nova conversa..."
                        placeholderTextColor={theme.colors.textMuted}
                        value={input}
                        onChangeText={setInput}
                        onSubmitEditing={() => navigation.navigate('Chat', { chatId: undefined })}
                    />
                    <TouchableOpacity
                        style={styles.sendButton}
                        onPress={() => navigation.navigate('Chat', { chatId: undefined })}
                    >
                        <Sparkles size={20} color="#fff" />
                    </TouchableOpacity>
                </GlassBox>
            </View>
            {Platform.OS === 'android' && <View style={{ height: 40 }} />}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        padding: theme.spacing.lg,
        paddingBottom: 120,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
        marginTop: Platform.OS === 'android' ? 20 : 0,
    },
    greeting: {
        fontSize: 24,
        fontWeight: '700',
        color: theme.colors.text,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    profileButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.surfaceSecondary,
        padding: 2,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    avatar: {
        flex: 1,
        borderRadius: 20,
        backgroundColor: theme.colors.error + '40', // Semi-transparent error color for logout
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: theme.spacing.md,
        marginTop: theme.spacing.lg,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    cardWrapper: {
        width: '48%',
    },
    card: {
        padding: theme.spacing.md,
        height: 120,
        justifyContent: 'space-between',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(88, 166, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardText: {
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: '600',
    },
    recentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        gap: 12,
    },
    recentTextContainer: {
        flex: 1,
    },
    recentTitle: {
        color: theme.colors.text,
        fontSize: 15,
        fontWeight: '600',
    },
    recentTime: {
        color: theme.colors.textMuted,
        fontSize: 12,
        marginTop: 2,
    },
    bottomContainer: {
        position: 'absolute',
        bottom: theme.spacing.xl,
        left: theme.spacing.lg,
        right: theme.spacing.lg,
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        paddingLeft: 20,
        height: 56,
        borderRadius: 28,
    },
    textInput: {
        flex: 1,
        color: theme.colors.text,
        fontSize: 15,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.accentSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default HomeScreen;
