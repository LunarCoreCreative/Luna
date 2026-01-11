import { useState, useCallback, useRef } from "react";

/**
 * Hook para gerenciar modais personalizados (alert, confirm, prompt)
 */
export const useModal = () => {
    const [modalState, setModalState] = useState({
        isOpen: false,
        type: null, // 'alert' | 'confirm' | 'prompt'
        title: null,
        message: null,
        defaultValue: null,
        resolve: null
    });
    const resolveRef = useRef(null);

    const showAlert = useCallback((message, title = "Aviso") => {
        return new Promise((resolve) => {
            resolveRef.current = resolve;
            setModalState({
                isOpen: true,
                type: 'alert',
                title,
                message,
                defaultValue: null,
                resolve: resolveRef.current
            });
        });
    }, []);

    const showConfirm = useCallback((message, title = "Confirmação") => {
        return new Promise((resolve) => {
            resolveRef.current = resolve;
            setModalState({
                isOpen: true,
                type: 'confirm',
                title,
                message,
                defaultValue: null,
                resolve: resolveRef.current
            });
        });
    }, []);

    const showPrompt = useCallback((message, defaultValue = "", title = "Entrada") => {
        return new Promise((resolve) => {
            resolveRef.current = resolve;
            setModalState({
                isOpen: true,
                type: 'prompt',
                title,
                message,
                defaultValue,
                resolve: resolveRef.current
            });
        });
    }, []);

    const handleConfirm = useCallback(() => {
        const currentType = modalState.type;
        const currentDefaultValue = modalState.defaultValue;
        
        if (currentType === 'prompt') {
            const input = document.getElementById('modal-prompt-input');
            const value = input ? input.value : currentDefaultValue || null;
            if (resolveRef.current) {
                resolveRef.current(value);
                resolveRef.current = null;
            }
        } else {
            if (resolveRef.current) {
                resolveRef.current(true);
                resolveRef.current = null;
            }
        }
        setModalState({
            isOpen: false,
            type: null,
            title: null,
            message: null,
            defaultValue: null,
            resolve: null
        });
    }, [modalState.type, modalState.defaultValue]);

    const handleCancel = useCallback(() => {
        const currentType = modalState.type;
        
        if (currentType === 'prompt') {
            if (resolveRef.current) {
                resolveRef.current(null);
                resolveRef.current = null;
            }
        } else {
            if (resolveRef.current) {
                resolveRef.current(false);
                resolveRef.current = null;
            }
        }
        setModalState({
            isOpen: false,
            type: null,
            title: null,
            message: null,
            defaultValue: null,
            resolve: null
        });
    }, [modalState.type]);

    const handleInput = useCallback((value) => {
        if (resolveRef.current) {
            resolveRef.current(value);
            resolveRef.current = null;
        }
        setModalState({
            isOpen: false,
            type: null,
            title: null,
            message: null,
            defaultValue: null,
            resolve: null
        });
    }, []);

    return {
        modalState,
        showAlert,
        showConfirm,
        showPrompt,
        handleConfirm,
        handleCancel,
        handleInput
    };
};
