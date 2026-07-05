import styled from "@emotion/styled";

const AboutStyle = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    padding: 40px 0;
    gap: 48px;

    .hero {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 16px;
    }

    .hero-icon {
        width: 96px;
        height: 96px;
        border-radius: var(--radius-lg);
        overflow: hidden;
        box-shadow: var(--shadow-md);
    }

    .hero-icon img {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
    }

    .hero-title {
        font-size: 32px;
        font-weight: 700;
        letter-spacing: -0.01em;
        color: var(--on-surface);
    }

    .hero-version {
        display: inline-block;
        padding: 4px 12px;
        background: var(--surface-container);
        color: var(--on-surface-variant);
        border-radius: var(--radius-full);
        font-size: 12px;
        font-weight: 500;
        letter-spacing: 0.02em;
        border: 1px solid var(--outline-variant);
    }

    .bento-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        width: 100%;
        max-width: 600px;
    }

    @media (max-width: 768px) {
        .bento-grid {
            grid-template-columns: 1fr;
        }
    }

    .info-card {
        background: var(--surface-container-lowest);
        border: 1px solid var(--outline-variant);
        border-radius: var(--radius-md);
        padding: 24px;
        box-shadow: var(--shadow-sm);
    }

    .info-card-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 16px;
    }

    .info-card-header svg {
        width: 20px;
        height: 20px;
        fill: none;
        stroke: var(--primary);
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .info-card-header h3 {
        font-size: 18px;
        font-weight: 600;
        color: var(--on-surface);
    }

    .info-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .info-label {
        font-size: 12px;
        font-weight: 500;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--on-surface-variant);
    }

    .info-value {
        font-size: 14px;
        color: var(--on-surface);
    }

    .info-value a {
        color: var(--primary);
        text-decoration: none;
    }

    .info-value a:hover {
        text-decoration: underline;
    }

    .license-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: var(--surface-container-high);
        color: var(--on-surface);
        border-radius: var(--radius);
        border: 1px solid var(--outline-variant);
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: text-decoration var(--dur-fast) var(--ease);
    }

    .license-badge:hover {
        text-decoration: underline;
    }

    .license-svg {
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

    .tech-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    .tech-tag {
        padding: 4px 10px;
        background: var(--surface-container);
        color: var(--on-surface-variant);
        border-radius: var(--radius);
        font-size: 12px;
        font-weight: 500;
        border: 1px solid var(--outline-variant);
    }

    .cta-area {
        width: 100%;
        max-width: 400px;
        margin-top: -24px;
    }

    .cta-button {
        width: 100%;
        padding: 14px 24px;
        background: var(--primary);
        color: var(--on-primary);
        border: none;
        border-radius: var(--radius);
        font-size: 14px;
        font-weight: 500;
        letter-spacing: 0.02em;
        cursor: pointer;
        transition: background-color var(--dur-fast) var(--ease);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }

    .cta-button:hover {
        background: color-mix(in srgb, var(--primary) 90%, transparent);
    }

    .cta-button:active {
        transform: scale(0.97);
    }

    .cta-button svg {
        width: 18px;
        height: 18px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
    }

`;

export default AboutStyle;
