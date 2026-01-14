import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, createUserProfile } from '../config/firebase';
import { colors } from '../theme/colors';
import { getAuthErrorMessage } from '../utils/authErrors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(getAuthErrorMessage(err));
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // Criar perfil no Firestore
      await createUserProfile(result.user.uid, email.split('@')[0], email);
    } catch (err) {
      setError(getAuthErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: colors.bg.primary }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        {/* Logo/Title Section */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <Image 
            source={require('../../assets/logo.png')} 
            style={{ width: 80, height: 80, marginBottom: 16 }}
            resizeMode="contain"
          />
          <Text style={{ 
            fontSize: 32, 
            fontWeight: 'bold', 
            color: colors.text.primary,
            marginBottom: 8,
            letterSpacing: -0.5,
          }}>
            Luna
          </Text>
          <Text style={{ 
            fontSize: 18, 
            color: colors.text.secondary,
            fontWeight: '500',
          }}>
            Sua assistente AI
          </Text>
        </View>

        {/* Form */}
        <View style={{ gap: 16 }}>
          <View>
            <TextInput
              style={{
                backgroundColor: colors.bg.secondary,
                color: colors.text.primary,
                padding: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                fontSize: 16,
              }}
              placeholder="Email"
              placeholderTextColor={colors.text.muted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View>
            <TextInput
              style={{
                backgroundColor: colors.bg.secondary,
                color: colors.text.primary,
                padding: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                fontSize: 16,
              }}
              placeholder="Senha"
              placeholderTextColor={colors.text.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          {error ? (
            <View style={{
              backgroundColor: 'rgba(248, 81, 73, 0.1)',
              padding: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: 'rgba(248, 81, 73, 0.3)',
            }}>
              <Text style={{ color: colors.error, fontSize: 14, textAlign: 'center' }}>
                {error}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={{
              backgroundColor: colors.accent.primary,
              padding: 16,
              borderRadius: 12,
              alignItems: 'center',
              marginTop: 8,
              shadowColor: colors.accent.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ 
                color: '#fff', 
                fontSize: 16, 
                fontWeight: '600',
                letterSpacing: 0.5,
              }}>
                Entrar
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: 'transparent',
              padding: 16,
              borderRadius: 12,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.border,
            }}
            onPress={handleSignUp}
            disabled={loading}
          >
            <Text style={{ 
              color: colors.text.secondary, 
              fontSize: 16,
              fontWeight: '500',
            }}>
              Criar conta
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
