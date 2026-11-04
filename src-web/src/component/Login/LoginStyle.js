import styled from "@emotion/styled";

const LoginStyle = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 100vh;
    min-height: 100svh;
    padding: 20px;
    box-sizing: border-box;

    .loginCard {
        width: 100%;
        max-width: 360px;
        padding: 28px 24px;
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        box-shadow: var(--shadow-md);
        box-sizing: border-box;
    }

    .loginTitle {
        margin: 0;
        font-size: 1.4rem;
        font-weight: 600;
        color: var(--text-primary);
        text-align: center;
    }

    .loginSubtitle {
        margin: 8px 0 22px;
        font-size: 0.86rem;
        line-height: 1.6;
        color: var(--text-secondary);
        text-align: center;
    }

    .loginField {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .loginLabel {
        font-size: 0.82rem;
        font-weight: 500;
        color: var(--text-secondary);
    }

    .loginInput {
        width: 100%;
        box-sizing: border-box;
        padding: 9px 11px;
        font-size: 0.92rem;
        border: 1px solid var(--border-input);
        border-radius: var(--radius);
        color: var(--text-primary);
        background: var(--bg-input);
        outline: none;
        transition: border-color 0.15s;

        &:focus {
            border-color: var(--accent);
        }
    }

    .loginButton {
        width: 100%;
        margin-top: 18px;
        padding: 9px 16px;
        font-size: 0.9rem;
        font-weight: 500;
        font-family: inherit;
        color: var(--text-accent);
        background: var(--accent);
        border: 1px solid transparent;
        border-radius: var(--radius);
        cursor: pointer;
        transition: opacity 0.15s;

        &:hover {
            opacity: 0.85;
            background: var(--accent);
        }

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }

    .loginError {
        margin: 12px 0 0;
        font-size: 0.82rem;
        line-height: 1.5;
        color: var(--danger);
        text-align: center;
        word-break: break-word;
    }

    .loginFooter {
        margin-top: 18px;
        font-size: 0.75rem;
        color: var(--text-tertiary);
        text-align: center;
    }
`;

export default LoginStyle;
