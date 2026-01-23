/**
 * Mapeia códigos de erro do Firebase para chaves de tradução do i18next.
 * O formato da chave é 'auth.errors.firebase.[codigo]'
 */
export const getAuthErrorKey = (errorCode) => {
    if (!errorCode) return 'auth.errors.generic_error';

    // Extrair o código puro se vier no formato total do Firebase (ex: auth/user-not-found)
    const code = errorCode.includes('/') ? errorCode.split('/')[1] : errorCode;

    const knownErrors = [
        'user-not-found',
        'wrong-password',
        'email-already-in-use',
        'invalid-credential',
        'too-many-requests',
        'network-request-failed',
        'user-disabled',
        'operation-not-allowed',
        'invalid-email',
        'weak-password'
    ];

    if (knownErrors.includes(code)) {
        return `auth.errors.firebase.${code}`;
    }

    return 'auth.errors.generic_error';
};
