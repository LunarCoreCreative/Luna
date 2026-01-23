import { useState, useEffect } from 'react';

/**
 * Hook para detectar tamanho da janela e breakpoints responsivos
 */
export const useWindowSize = () => {
    const [windowSize, setWindowSize] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 1920,
        height: typeof window !== 'undefined' ? window.innerHeight : 1080,
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        // Adicionar listener
        window.addEventListener('resize', handleResize);
        
        // Chamar uma vez para garantir valores iniciais
        handleResize();

        // Cleanup
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Breakpoints
    const isMobile = windowSize.width < 768;
    const isTablet = windowSize.width >= 768 && windowSize.width < 1024;
    const isDesktop = windowSize.width >= 1024;
    const isLargeDesktop = windowSize.width >= 1440;

    return {
        ...windowSize,
        isMobile,
        isTablet,
        isDesktop,
        isLargeDesktop,
    };
};
