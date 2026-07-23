import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from "./App";
import {BrowserRouter} from "react-router";
import initI18n from "./i18n";
import theme from "./theme";

// Initialize i18n before rendering
initI18n().then(() => {
    ReactDOM.createRoot(document.getElementById("root")).render(
        <React.StrictMode>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <BrowserRouter>
                    <App/>
                </BrowserRouter>
            </ThemeProvider>
        </React.StrictMode>,
    );
});
