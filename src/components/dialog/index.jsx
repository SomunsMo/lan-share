import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import DialogContentText from '@mui/material/DialogContentText';

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
            }]);
        });
    }, []);

    const closeDialog = useCallback((id, value) => {
        const resolver = resolversRef.current.get(id);
        if (resolver) {
            resolver(value);
            resolversRef.current.delete(id);
        }
        setDialogs(prev => prev.filter(d => d.id !== id));
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

    const handleClose = (result) => {
        closeDialog(dialog.id, result);
    };

    const handleConfirm = () => {
        if (dialog.input && dialog.buttons.some(b => b.value === '__confirm_input__')) {
            handleClose(inputValue);
        }
    };

    const handleButtonClick = (btn) => {
        if (btn.value === '__confirm_input__') {
            handleConfirm();
        } else {
            handleClose(btn.value);
        }
    };

    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirm();
        }
    };

    return (
        <Dialog
            open={true}
            onClose={() => handleClose(false)}
            slotProps={{
                backdrop: {
                    sx: { zIndex: 9000 + index }
                }
            }}
            sx={{ '& .MuiDialog-paper': { zIndex: 9001 + index } }}
        >
            {dialog.title && <DialogTitle>{dialog.title}</DialogTitle>}
            <DialogContent>
                {typeof dialog.content === 'string' ? (
                    <DialogContentText>{dialog.content}</DialogContentText>
                ) : (
                    dialog.content
                )}
                {dialog.input && (
                    <TextField
                        inputRef={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        placeholder={dialog.input.placeholder || ''}
                        fullWidth
                        variant="standard"
                        sx={{ mt: 1 }}
                    />
                )}
            </DialogContent>
            <DialogActions>
                {dialog.buttons.map((btn, btnIndex) => (
                    <Button
                        key={btnIndex}
                        variant={btn.primary ? 'contained' : 'text'}
                        color={btn.danger ? 'error' : 'primary'}
                        onClick={() => handleButtonClick(btn)}
                    >
                        {t(btn.label)}
                    </Button>
                ))}
            </DialogActions>
        </Dialog>
    );
}

export function useDialog() {
    const context = useContext(DialogContext);
    if (!context) throw new Error('useDialog must be used within a DialogProvider');
    return context;
}
