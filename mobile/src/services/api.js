/**
 * Luna API Client
 * ================
 * Cliente HTTP para comunicação com o backend.
 */

import { API_CONFIG } from '../config/api';
import { auth } from '../config/firebase';

/**
 * Faz uma requisição HTTP autenticada
 */
async function fetchWithAuth(url, options = {}) {
  const user = auth.currentUser;
  let token = null;

  // Obtém o token do Firebase Auth
  if (user) {
    try {
      token = await user.getIdToken();
    } catch (error) {
      console.error('Erro ao obter token:', error);
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Adiciona token de autenticação se disponível
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fullUrl = url.startsWith('http') ? url : `${API_CONFIG.BASE_URL}${url}`;

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    // Re-lança o erro sem logar - deixa o componente decidir como tratar
    throw error;
  }
}

/**
 * API Client
 */
export const api = {
  /**
   * GET request
   */
  async get(endpoint, options = {}) {
    return fetchWithAuth(endpoint, {
      method: 'GET',
      ...options,
    });
  },

  /**
   * POST request
   */
  async post(endpoint, data, options = {}) {
    return fetchWithAuth(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  },

  /**
   * PUT request
   */
  async put(endpoint, data, options = {}) {
    return fetchWithAuth(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    });
  },

  /**
   * DELETE request
   */
  async delete(endpoint, options = {}) {
    return fetchWithAuth(endpoint, {
      method: 'DELETE',
      ...options,
    });
  },

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  },
};

export default api;