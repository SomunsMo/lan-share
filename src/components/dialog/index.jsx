import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DialogOverlay,
    DialogCard,
    DialogHeader,
    DialogBody,
    DialogInput,
    DialogFooter,
    DialogButton,
} from './style';

const DialogContext = createContext(null);

let nextDialogId = 0;

export function DialogProvider({ children }) {
    const [dialogs, setDialogs] = useState([]);
    const resolversRef = useRef(new Map());

    const showDialog = useCallback(({ title, content, buttons, input }) => {
        const id = ++nextDialogId;
        return new Promise((resolve) => {
            resolversRef.current.set(id, resolve);
            setDialogs(prev => [...prev, {
                id,
                title,
                content,
                input: input || null,
                buttons: buttons || (input
                    ? [
                        { label: 'common.button.cancel', value: null },
                        { label: 'common.button.confirm', value: '__confirm_input__', primary: true },
                    ]
                    : [
                        { label: 'common.button.cancel', value: false },
                        { label: 'common.button.confirm', value: true, primary: true },
                    ]
                ),
                exiting: false,
            }]);
        });
    }, []);

    const closeDialog = useCallback((id, value) => {
        const resolver = resolversRef.current.get(id);
        if (resolver) {
            resolver(value);
            resolversRef.current.delete(id);
        }

        // Start exit animation
        setDialogs(prev => prev.map(d =>
            d.id === id ? { ...d, exiting: true } : d
        ));

        // Remove after animation
        setTimeout(() => {
            setDialogs(prev => prev.filter(d => d.id !== id));
        }, 200);
    }, []);

    return (
        <DialogContext.Provider value={{ showDialog }}>
            {children}
            {dialogs.map((dialog, index) => (
                <DialogItem
                    key={dialog.id}
                    dialog={dialog}
                    index={index}
                    closeDialog={closeDialog}
                />
            ))}
        </DialogContext.Provider>
    );
}

function DialogItem({ dialog, index, closeDialog }) {
    const { t } = useTranslation();
    const [inputValue, setInputValue] = useState(dialog.input?.defaultValue || '');
    const inputRef = useRef(null);

    const handleConfirm = () => {
        if (dialog.input && dialog.buttons.some(b => b.value === '__confirm_input__')) {
            closeDialog(dialog.id, inputValue);
        }
    };

    const handleButtonClick = (btn) => {
        if (btn.value === '__confirm_input__') {
            handleConfirm();
        } else {
            closeDialog(dialog.id, btn.value);
        }
    };

    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirm();
        }
    };

    return (
        <DialogOverlay
            $zIndex={9000 + index}
        >
            <DialogCard $exiting={dialog.exiting}>
                {dialog.title && <DialogHeader>{dialog.title}</DialogHeader>}
                <DialogBody>
                    {dialog.content}
                    {dialog.input && (
                        <DialogInput
                            ref={inputRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleInputKeyDown}
                            placeholder={dialog.input.placeholder || ''}
                        />
                    )}
                </DialogBody>
                <DialogFooter>
                    {dialog.buttons.map((btn, btnIndex) => (
                        <DialogButton
                            key={btnIndex}
                            $primary={btn.primary}
                            $danger={btn.danger}
                            onClick={() => handleButtonClick(btn)}
                        >
                            {t(btn.label)}
                        </DialogButton>
                    ))}
                </DialogFooter>
            </DialogCard>
        </DialogOverlay>
    );
}

export function useDialog() {
    const context = useContext(DialogContext);
    if (!context) throw new Error('useDialog must be used within a DialogProvider');
    return context;
}
