import styled from "styled-components";

const Card = styled.div`
    box-sizing: border-box;
    display: flex;
    min-width: 200px;
    padding: 20px 24px;
    margin: 0 0 16px;
    flex-grow: ${props => props.fillSpace === true ? 1 : 0};
    flex-direction: column;

    background-color: var(--bg-card);
    border: 1px solid var(--outline-variant);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    overflow: hidden;

    & > h1, & > h2, & > h3, & > h4, & > h5, & > h6 {
        margin: 4px auto;
    }

    form {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        justify-content: center;
    }
`
export default Card;
