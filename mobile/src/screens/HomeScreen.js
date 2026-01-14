import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { colors } from '../theme/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';

export default function HomeScreen() {
  const { user, profile } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Image 
            source={require('../../assets/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.headerText}>
            <Text style={styles.title}>Luna</Text>
            <Text style={styles.subtitle}>Sua assistente AI</Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Card */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>
            Bem-vindo{profile?.name ? `, ${profile.name}` : ''}!
          </Text>
          <Text style={styles.welcomeSubtitle}>
            Estamos felizes em tê-lo aqui
          </Text>
        </View>

        {/* Plan Card */}
        {profile?.plan && (
          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <Text style={styles.planLabel}>Seu Plano</Text>
              <View style={styles.planBadge}>
                <Text style={styles.planText}>{profile.plan.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.planDescription}>
              {profile.plan === 'eclipse' && 'Acesso completo a todos os recursos'}
              {profile.plan === 'nexus' && 'Acesso premium com recursos avançados'}
              {profile.plan === 'spark' && 'Plano gratuito com recursos básicos'}
            </Text>
          </View>
        )}

        {/* Quick Info */}
        <View style={styles.quickInfoCard}>
          <Text style={styles.quickInfoTitle}>💡 Dica</Text>
          <Text style={styles.quickInfoText}>
            Use a aba "Chats" para iniciar uma nova conversa ou continuar conversas anteriores.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 40,
    height: 40,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  welcomeCard: {
    backgroundColor: colors.bg.secondary,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  planCard: {
    backgroundColor: colors.bg.secondary,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  planBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.bg.tertiary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent.primary,
  },
  planText: {
    fontSize: 11,
    color: colors.accent.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  planDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  quickInfoCard: {
    backgroundColor: colors.bg.secondary,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  quickInfoText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});
