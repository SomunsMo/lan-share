import styled from "@emotion/styled";
import Card from "../Card/Card.js";

export const FileCard = styled(Card)`
    max-height: calc(75vh * 1.5);
`;

const FileSharingStyle = styled.div`
    display: contents;

    .diskSpaceBar {
        padding: 0 0 10px;
        margin-bottom: 10px;
        border-bottom: 1px solid var(--border);
    }

    .diskSpaceInfo {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
        font-size: 0.75rem;
        color: var(--text-secondary);
    }

    .diskSpaceDetail {
        color: var(--text-tertiary);
    }

    .diskSpaceProgress {
        width: 100%;
        height: 4px;
        background-color: var(--bg-progress);
        border-radius: 2px;
        overflow: hidden;
    }

    .diskSpaceProgressFill {
        height: 100%;
        background-color: var(--accent);
        border-radius: 2px;
        transition: width 0.3s ease;
    }

    .errorState {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        text-align: center;
    }

    .errorIcon {
        font-size: 2.5rem;
        margin-bottom: 12px;
        color: var(--warning);
    }

    .errorMessage {
        font-size: 0.9rem;
        color: var(--text-secondary);
        max-width: 360px;
        line-height: 1.6;
    }

    .fileList {
        min-height: 300px;
        margin-bottom: 12px;
        overflow-x: auto;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
    }

    .fileTable {
        width: 100%;
        min-width: 600px;
        text-align: left;
        border-collapse: collapse;
    }

    thead {
        height: 40px;
    }

    th {
        font-weight: 500;
        font-size: 0.82rem;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        padding: 0.65em 0.4em 0.5em;
    }

    .fileItem {
        height: 48px;
        cursor: pointer;
        transition: background-color 0.1s;

        td {
            padding: 0.5em 0.4em;
            font-size: 0.88rem;
        }
    }

    .fileItem:hover {
        background-color: var(--bg-hover);
    }

    .goBackItem {
        height: 36px;
    }

    .goBackLabel {
        font-size: 0.82rem;
        color: var(--text-tertiary);
        user-select: none;
    }

    .goBackItem:hover .goBackLabel {
        color: var(--text-primary);
    }

    .checkbox {
        text-align: center;
    }

    .checkbox input[type="checkbox"] {
        width: 14px;
        height: 14px;
        padding: 0;
        cursor: pointer;
        accent-color: var(--accent);
    }

    .iconImg {
        width: 24px;
        height: 28px;
        margin-right: 6px;
        vertical-align: middle;
        user-select: none;
    }

    .fileName {
        display: inline-block;
        max-width: calc(100% - 32px);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        vertical-align: middle;
        box-sizing: border-box;
        user-select: none;
    }

    /* Action buttons visible always */

    .fileActions {
        display: flex;
        gap: 4px;
        visibility: hidden;
    }

    .fileItem:hover .fileActions {
        visibility: visible;
    }

    .dirActions {
        display: flex;
        gap: 4px;
        visibility: hidden;
    }

    .fileItem:hover .dirActions {
        visibility: visible;
    }

    .fileActions button,
    .dirActions button {
        padding: 3px 10px;
        font-size: 0.75rem;
        background: transparent;
        color: var(--accent);
        border: 1px solid var(--border);
        border-radius: var(--radius);
    }

    .fileActions button:hover,
    .dirActions button:hover {
        background-color: var(--bg-hover);
        border-color: var(--accent);
    }

    .batchActions {
        display: flex;
        gap: 8px;
        justify-content: center;
    }

    .batchActions button {
        font-size: 0.75rem;
        padding: 7px 18px;
        color: var(--text-accent);
        background-color: var(--accent);
    }

    .batchActions button:hover {
        background-color: var(--accent-hover);
    }

    .context-menu {
        position: fixed;
        z-index: 10000;
        background-color: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        box-shadow: var(--shadow-md);
        padding: 4px 0;
        min-width: 110px;
        font-size: 0.82rem;
    }

    .context-menu-item {
        padding: 7px 16px;
        cursor: pointer;
        color: var(--text-primary);
        transition: background-color 0.12s;
    }

    .context-menu-item:hover {
        background-color: var(--bg-hover);
    }

    .context-menu-item-danger {
        color: var(--danger);
    }

    .context-menu-item-danger:hover {
        background-color: var(--bg-danger-hover);
    }

    .detailTable {
        width: 100%;
        border-collapse: collapse;
    }

    .detailTable tr + tr td {
        padding-top: 8px;
    }

    .detailLabel {
        width: 1px;
        white-space: nowrap;
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--text-primary);
        padding: 2px 16px 2px 0;
        vertical-align: top;
    }

    .detailValue {
        font-size: 0.88rem;
        color: var(--text-primary);
        word-break: break-all;
        padding: 2px 0;
        vertical-align: top;
    }

    @media (max-width: 767px) {
        .fileTable {
            min-width: 0;
        }

        .fileList {
            overflow-x: hidden;
        }

        .fileTable td:nth-child(2) {
            white-space: nowrap;
        }

        .fileTable td:nth-child(2) .fileName {
            max-width: calc(100vw - 100px);
        }

        .fileTable th:nth-child(3),
        .fileTable th:nth-child(4),
        .fileTable th:nth-child(5),
        .fileTable td:nth-child(3),
        .fileTable td:nth-child(4),
        .fileTable td:nth-child(5) {
            display: none;
        }
    }
`;

export default FileSharingStyle;
