import { createContext, useContext, useState, useCallback, useEffect, useRef, useLayoutEffect } from 'react';
import { resolveReducedMotion } from "../../utils/motion.js";
import {
    ToastContainerWrapper,
    ToastItemOuter,
    ToastItemInner,
    ToastBar,
    ToastMessage,
    ToastCloseBtn,
} from './style';

const ToastContext = createContext(null);

let nextId = 0;

// 与 --dur-mid 保持一致，确保退出动画播完再卸载
const EXIT_DURATION = 260;


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

    // Remove exiting toasts from DOM after exit animation completes
    useEffect(() => {
        const exitingToasts = toasts.filter(t => t.phase === 'exiting');
        if (exitingToasts.length === 0) return;

        // 减弱动效下 CSS 已把动画压到 0.01ms，不必再为不可见的退场占 260ms
        const exitDuration = resolveReducedMotion() ? 0 : EXIT_DURATION;
        const timers = exitingToasts.map(t =>
            setTimeout(() => removeToast(t.id), exitDuration)
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
        const inner = innerRef.current;
        if (!inner || toast.phase !== 'visible') return;

        const updateHeight = () => setHeight(inner.scrollHeight);
        updateHeight();

        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(updateHeight);
        observer.observe(inner);
        return () => observer.disconnect();
    }, [toast.phase]);

    const isExiting = toast.phase === 'exiting';

    return (
        <ToastItemOuter $exiting={isExiting} $height={height}>
            <ToastItemInner ref={innerRef} $type={toast.type} $exiting={isExiting}>
                <ToastBar $type={toast.type} />
                <ToastMessage>{toast.message}</ToastMessage>
                <ToastCloseBtn onClick={() => onClose(toast.id)}>×</ToastCloseBtn>
            </ToastItemInner>
        </ToastItemOuter>
    );
}
