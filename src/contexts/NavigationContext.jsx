import React, { createContext, useContext, useState, useCallback } from 'react';

const NavigationContext = createContext(null);

export const NavigationProvider = ({ children }) => {
    const [currentModule, setCurrentModule] = useState('chat');

    const navigateTo = useCallback((moduleName) => {
        setCurrentModule(moduleName);
    }, []);

    const value = {
        currentModule,
        navigateTo,
    };

    return (
        <NavigationContext.Provider value={value}>
            {children}
        </NavigationContext.Provider>
    );
};

export const useNavigation = () => {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error('useNavigation must be used within a NavigationProvider');
    }
    return context;
};

export default NavigationContext;
