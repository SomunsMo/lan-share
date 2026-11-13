import React, {useEffect, useState} from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import {useTranslation} from "react-i18next";
import {afterPressFeedback} from "../../utils/clickPop.js";

const MIN_PASSWORD_LEN = 6;

/**
 * 设置/修改访问密码弹窗
 * onSubmit 抛错时错误信息会展示在弹窗内
 */
function PasswordDialog({open, onClose, onSubmit}) {
    const {t} = useTranslation();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            setPassword('');
            setConfirmPassword('');
            setError('');
            setSubmitting(false);
        }
    }, [open]);

    const handleSubmit = async () => {
        if (submitting) return;

        // 与后端一致，按字符数（码点）计算长度
        if ([...password].length < MIN_PASSWORD_LEN) {
            setError(t('settings.dialog.setPassword.tooShort', {min: MIN_PASSWORD_LEN}));
            return;
        }
        if (password !== confirmPassword) {
            setError(t('settings.dialog.setPassword.mismatch'));
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            await onSubmit(password);
            // 等按钮回弹可见再关闭，避免弹窗淡出盖住按下反馈
            afterPressFeedback(onClose);
        } catch (e) {
            setError(e?.message || e?.toString() || t('common.toast.operationFailed'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={submitting ? undefined : onClose}
            maxWidth={false}
            slotProps={{backdrop: {sx: {zIndex: 9000}}}}
            sx={{'& .MuiDialog-paper': {zIndex: 9001, width: {xs: 'calc(100vw - 32px)', sm: 460}, maxWidth: '90vw'}}}
        >
            <DialogTitle>{t('settings.dialog.setPassword.title')}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    fullWidth
                    type="password"
                    autoComplete="new-password"
                    label={t('settings.dialog.setPassword.passwordLabel')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                    sx={{mt: 1}}
                />
                <TextField
                    fullWidth
                    type="password"
                    autoComplete="new-password"
                    label={t('settings.dialog.setPassword.confirmLabel')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                    sx={{mt: 2}}
                />
                {error && (
                    <Typography variant="caption" sx={{display: 'block', mt: 1.5, color: 'var(--danger)'}}>
                        {error}
                    </Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={() => afterPressFeedback(onClose)} disabled={submitting}>{t('common.button.cancel')}</Button>
                <Button variant="contained" onClick={handleSubmit} loading={submitting}>
                    {t('common.button.confirm')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default PasswordDialog;
