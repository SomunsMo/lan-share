import React, {useState} from 'react';
import {useTranslation} from "react-i18next";
import LoginStyle from "./LoginStyle.js";
import {loginAPI} from "../../service/auth.js";

function Login({onSuccess}) {
    const {t} = useTranslation();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;

        if (!password) {
            setError(t('web.auth.passwordRequired'));
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            await loginAPI(password);
            onSuccess();
        } catch (err) {
            setError(err?.message || t('web.auth.loginFailed'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <LoginStyle>
            <form className="loginCard" onSubmit={handleSubmit}>
                <h1 className="loginTitle">LAN Share</h1>
                <p className="loginSubtitle">{t('web.auth.subtitle')}</p>

                <div className="loginField">
                    <label className="loginLabel" htmlFor="accessPassword">{t('web.auth.passwordLabel')}</label>
                    <input
                        id="accessPassword"
                        className="loginInput"
                        type="password"
                        autoComplete="current-password"
                        autoFocus
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('web.auth.passwordPlaceholder')}
                    />
                </div>

                <button className="loginButton" type="submit" disabled={submitting}>
                    {submitting ? t('web.auth.submitting') : t('web.auth.submit')}
                </button>

                {error && <p className="loginError">{error}</p>}

                <p className="loginFooter">{t('web.auth.footer')}</p>
            </form>
        </LoginStyle>
    );
}

export default Login;
