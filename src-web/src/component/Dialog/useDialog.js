import { createContext, useContext } from 'react';

export const DialogContext = createContext(null);

export function useDialog() {
    const context = useContext(DialogContext);
    if (!context) throw new Error('useDialog must be used within a DialogProvider');
    return context;
}