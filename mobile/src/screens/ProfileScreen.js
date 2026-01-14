/**
 * ProfileScreen
 * =============
 * Tela de perfil do usuário - Design premium e minimalista
 */

import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { signOut } from 'firebase/auth';
import { colors } from '../theme/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { auth, updateUserProfile } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, profile, refreshProfile } = useAuth();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(profile?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Sincroniza o nome editado quando o perfil é atualizado
  useEffect(() => {
    if (!isEditingName && profile?.name) {
      setEditedName(profile.name);
    }
  }, [profile?.name, isEditingName]);

  const handleSaveName = useCallback(async () => {
    if (!editedName.trim()) {
      Alert.alert('Erro', 'O nome não pode estar vazio');
      return;
    }

    if (editedName === profile?.name) {
      setIsEditingName(false);
      return;
    }

    setIsSaving(true);
    try {
      const success = await updateUserProfile(user.uid, { name: editedName.trim() });
      if (success) {
        setIsEditingName(false);
        // Recarrega o perfil para atualizar a UI
        await refreshProfile();
      } else {
        Alert.alert('Erro', 'Não foi possível salvar o nome');
        setEditedName(profile?.name || '');
      }
    } catch (error) {
      console.error('Erro ao salvar nome:', error);
      Alert.alert('Erro', 'Não foi possível salvar o nome');
      setEditedName(profile?.name || '');
    } finally {
      setIsSaving(false);
    }
  }, [editedName, profile?.name, user?.uid]);

  const handleCancelEdit = useCallback(() => {
    setEditedName(profile?.name || '');
    setIsEditingName(false);
  }, [profile?.name]);

  const handleLogout = useCallback(async () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await signOut(auth);
              // A navegação será redirecionada automaticamente pelo AuthContext
            } catch (error) {
              console.error('Erro ao fazer logout:', error);
              Alert.alert('Erro', 'Não foi possível fazer logout');
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  }, []);

  const getPlanDisplayName = (plan) => {
    const plans = {
      eclipse: 'Eclipse',
      nexus: 'Nexus',
      spark: 'Spark',
    };
    return plans[plan] || plan;
  };

  const getPlanColor = (plan) => {
    const planColors = {
      eclipse: colors.accent.primary,
      nexus: '#a855f7',
      spark: colors.text.muted,
    };
    return planColors[plan] || colors.text.muted;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Perfil</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={48} color={colors.accent.primary} />
            </View>
            {/* Badge de plano */}
            {profile?.plan && (
              <View style={[styles.planBadge, { backgroundColor: getPlanColor(profile.plan) }]}>
                <Text style={styles.planBadgeText}>
                  {getPlanDisplayName(profile.plan)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Informações do Perfil */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações</Text>

          {/* Nome */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <View style={styles.infoLabelContainer}>
                <Ionicons name="person-outline" size={20} color={colors.text.secondary} />
                <Text style={styles.infoLabel}>Nome</Text>
              </View>
              {!isEditingName && (
                <Pressable
                  onPress={() => setIsEditingName(true)}
                  style={styles.editButton}
                  android_ripple={{ color: colors.bg.secondary, borderless: true }}
                >
                  <Ionicons name="pencil" size={18} color={colors.accent.primary} />
                </Pressable>
              )}
            </View>
            {isEditingName ? (
              <View style={styles.editContainer}>
                <TextInput
                  style={styles.nameInput}
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder="Seu nome"
                  placeholderTextColor={colors.text.muted}
                  autoFocus
                  editable={!isSaving}
                />
                <View style={styles.editActions}>
                  <Pressable
                    onPress={handleCancelEdit}
                    style={styles.cancelButton}
                    disabled={isSaving}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSaveName}
                    style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color={colors.text.primary} />
                    ) : (
                      <Text style={styles.saveButtonText}>Salvar</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            ) : (
              <Text style={styles.infoValue}>
                {profile?.name || user?.displayName || 'Sem nome'}
              </Text>
            )}
          </View>

          {/* Email */}
          <View style={styles.infoCard}>
            <View style={styles.infoLabelContainer}>
              <Ionicons name="mail-outline" size={20} color={colors.text.secondary} />
              <Text style={styles.infoLabel}>Email</Text>
            </View>
            <Text style={styles.infoValue}>{user?.email || 'Não disponível'}</Text>
          </View>

          {/* Plano */}
          {profile?.plan && (
            <View style={styles.infoCard}>
              <View style={styles.infoLabelContainer}>
                <Ionicons name="diamond-outline" size={20} color={colors.text.secondary} />
                <Text style={styles.infoLabel}>Plano</Text>
              </View>
              <View style={styles.planInfo}>
                <Text style={[styles.infoValue, { color: getPlanColor(profile.plan) }]}>
                  {getPlanDisplayName(profile.plan)}
                </Text>
                {profile.plan === 'spark' && (
                  <Pressable style={styles.upgradeButton}>
                    <Text style={styles.upgradeButtonText}>Fazer upgrade</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Configurações */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configurações</Text>

          <Pressable
            style={styles.settingItem}
            android_ripple={{ color: colors.bg.secondary }}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={22} color={colors.text.secondary} />
              <Text style={styles.settingLabel}>Notificações</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
          </Pressable>

          <Pressable
            style={styles.settingItem}
            android_ripple={{ color: colors.bg.secondary }}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="language-outline" size={22} color={colors.text.secondary} />
              <Text style={styles.settingLabel}>Idioma</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>Português (BR)</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
            </View>
          </Pressable>

          <Pressable
            style={styles.settingItem}
            android_ripple={{ color: colors.bg.secondary }}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="help-circle-outline" size={22} color={colors.text.secondary} />
              <Text style={styles.settingLabel}>Ajuda e Suporte</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
          </Pressable>
        </View>

        {/* Logout Button */}
        <Pressable
          style={[styles.logoutButton, isLoggingOut && styles.logoutButtonDisabled]}
          onPress={handleLogout}
          disabled={isLoggingOut}
          android_ripple={{ color: colors.error + '20' }}
        >
          {isLoggingOut ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={22} color={colors.error} />
              <Text style={styles.logoutText}>Sair</Text>
            </>
          )}
        </Pressable>

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Luna Mobile v1.0.0</Text>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.bg.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.bg.tertiary,
  },
  planBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.bg.primary,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.bg.primary,
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  infoCard: {
    backgroundColor: colors.bg.secondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editButton: {
    padding: 4,
    borderRadius: 8,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 4,
  },
  editContainer: {
    marginTop: 8,
  },
  nameInput: {
    backgroundColor: colors.bg.tertiary,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.accent.primary,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.bg.primary,
  },
  planInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  upgradeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.accent.primary + '20',
    borderWidth: 1,
    borderColor: colors.accent.primary,
  },
  upgradeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent.primary,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bg.secondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.bg.secondary,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.error + '40',
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  versionText: {
    fontSize: 12,
    color: colors.text.muted,
  },
});
