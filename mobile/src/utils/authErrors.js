/**
 * Tradução de erros do Firebase Auth para português
 */
export const getAuthErrorMessage = (error) => {
  const code = error?.code || error;
  
  const errorMessages = {
    // Erros comuns
    'auth/invalid-email': 'Email inválido',
    'auth/user-disabled': 'Esta conta foi desabilitada',
    'auth/user-not-found': 'Usuário não encontrado',
    'auth/wrong-password': 'Senha incorreta',
    'auth/email-already-in-use': 'Este email já está em uso',
    'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres',
    'auth/operation-not-allowed': 'Operação não permitida',
    'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde',
    'auth/network-request-failed': 'Erro de conexão. Verifique sua internet',
    'auth/invalid-credential': 'Credenciais inválidas',
    'auth/invalid-verification-code': 'Código de verificação inválido',
    'auth/invalid-verification-id': 'ID de verificação inválido',
    'auth/code-expired': 'Código expirado',
    'auth/session-expired': 'Sessão expirada',
  };

  return errorMessages[code] || error?.message || 'Erro ao autenticar. Tente novamente';
};
