import styled from "styled-components";

const SettingsStyle = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
    gap: 16px;
    align-items: start;
    user-select: none;

    .block-title {
        margin: 0 0 12px;
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .options-table {
        width: 100%;
        border-collapse: collapse;

        td {
            padding: 8px 0;
            font-size: 0.9rem;
        }

        td:first-child {
            color: var(--text-primary);
        }
    }

    .table-value {
        text-align: right;
        vertical-align: middle;
    }

    .directory-text {
        cursor: pointer;
        color: var(--accent);
        font-size: 0.84rem;
        max-width: 280px;
        display: inline-block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .directory-text:hover {
        color: var(--accent-hover);
    }

    .port-text {
        cursor: pointer;
        color: var(--accent);
        font-weight: 600;
        font-size: 1rem;
    }

    .port-text:hover {
        color: var(--accent-hover);
    }

    .theme-select {
        cursor: pointer;
        color: var(--text-primary);
        background-color: var(--bg-input);
        border: 1px solid var(--border-input);
        border-radius: var(--radius);
        padding: 0.4em 1.8em 0.4em 0.6em;
        font-size: 0.88rem;
        font-family: inherit;
        outline: none;
        appearance: auto;
        -webkit-appearance: auto;
        -moz-appearance: auto;
        min-width: 120px;
        text-align: left;
    }

    .theme-select:hover {
        border-color: var(--accent);
    }

    .theme-select:focus {
        border-color: var(--accent);
    }

    .option-hint {
        font-size: 0.78rem;
        color: var(--text-tertiary);
        margin: 0;
    }
`

export default SettingsStyle;
