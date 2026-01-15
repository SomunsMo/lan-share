import styled from "styled-components";

const Card = styled.div`
    box-sizing: border-box;
    display: flex;
    min-width: 200px;
    min-height: 240px;
    padding: 10px 15px;
    margin: 10px;
    flex-grow: ${props => props.fillSpace === true ? 1 : 0};
    flex-direction: column;

    background-color: white;
    border-radius: 5px;

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

    .cardTips {
        padding: 0;
        margin: 0;
        color: dimgrey;
        font-size: small;
        text-align: left;
    }

    .cardTips::before {
        content: "说明：";
    }

`
export default Card;