import { createContext, useContext, useState, useCallback, useEffect, useRef, useLayoutEffect } from 'react';
import {
    ToastContainerWrapper,
    ToastItemOuter,
    ToastItemInner,
    ToastIcon,
    ToastMessage,
    ToastCloseBtn,
} from './style';

const ToastContext = createContext(null);

let nextId = 0;

const ICONS = {
    success: '\u2713',
    error: '\u2717',
    warning: '\u26A0',
    info: '\u2139',
};

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const dismissToast = useCallback((id) => {
        setToasts(prev => {
            const toast = prev.find(t => t.id === id);
            if (!toast || toast.phase !== 'visible') return prev;

            // Clear auto-dismiss timer
            if (toast._timer) clearTimeout(toast._timer);

            return prev.map(t =>
                t.id === id ? { ...t, phase: 'exiting' } : t
            );
        });
    }, []);

    const showToast = useCallback(({ message, type = 'info', duration = 3000 }) => {
        const id = ++nextId;
        const timer = setTimeout(() => dismissToast(id), duration);
        setToasts(prev => [...prev, { id, message, type, duration, phase: 'visible', _timer: timer }]);
        return id;
    }, [dismissToast]);

    // Handle exiting → collapsing transition
    useEffect(() => {
        const exitingToasts = toasts.filter(t => t.phase === 'exiting');
        if (exitingToasts.length === 0) return;

        const timers = exitingToasts.map(t =>
            setTimeout(() => {
                setToasts(prev => prev.map(toast =>
                    toast.id === t.id ? { ...toast, phase: 'collapsing' } : toast
                ));
            }, 300)
        );
        return () => timers.forEach(clearTimeout);
    }, [toasts]);

    // Handle collapsing → remove transition
    useEffect(() => {
        const collapsingToasts = toasts.filter(t => t.phase === 'collapsing');
        if (collapsingToasts.length === 0) return;

        const timers = collapsingToasts.map(t =>
            setTimeout(() => removeToast(t.id), 300)
        );
        return () => timers.forEach(clearTimeout);
    }, [toasts, removeToast]);

    return (
        <ToastContext.Provider value={{ showToast, dismissToast }}>
            {children}
            <ToastContainer toasts={toasts} onClose={dismissToast} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within a ToastProvider');
    return context;
}

function ToastContainer({ toasts, onClose }) {
    return (
        <ToastContainerWrapper>
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} onClose={onClose} />
            ))}
        </ToastContainerWrapper>
    );
}

function ToastItem({ toast, onClose }) {
    const [height, setHeight] = useState(null);
    const innerRef = useRef(null);

    useLayoutEffect(() => {
        if (innerRef.current && toast.phase === 'visible') {
            setHeight(innerRef.current.scrollHeight);
        }
    }, [toast.phase]);

    const isExiting = toast.phase === 'exiting';
    const isCollapsing = toast.phase === 'collapsing';

    return (
        <ToastItemOuter $collapsing={isCollapsing} $height={height}>
            <ToastItemInner ref={innerRef} $type={toast.type} $exiting={isExiting}>
                <ToastIcon $type={toast.type}>{ICONS[toast.type] || ICONS.info}</ToastIcon>
                <ToastMessage>{toast.message}</ToastMessage>
                <ToastCloseBtn onClick={() => onClose(toast.id)}>✕</ToastCloseBtn>
            </ToastItemInner>
        </ToastItemOuter>
    );
}
