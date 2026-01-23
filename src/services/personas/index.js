import { defaultPersona } from './default';
import { businessPersona } from './business';
import { healthPersona } from './health';

export const PERSONAS = {
    [defaultPersona.id]: defaultPersona,
    [businessPersona.id]: businessPersona,
    [healthPersona.id]: healthPersona,
};

export const DEFAULT_PERSONA_ID = defaultPersona.id;

/**
 * Obtém os dados de uma persona pelo ID
 * @param {string} id - ID da persona (default, business, health)
 * @returns {Object} Dados da persona ou default se não encontrar
 */
export const getPersona = (id) => {
    return PERSONAS[id] || PERSONAS[DEFAULT_PERSONA_ID];
};

/**
 * Lista todas as personas disponíveis (para o seletor na UI)
 */
export const getAllPersonas = () => {
    return Object.values(PERSONAS);
};
