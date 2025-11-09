import { createRoot } from "react-dom/client"
import "./main.css"
import App from "./App.tsx"
import { BrowserRouter, Route, Routes } from "react-router"
import VisualizationPage from "./visualisation/VisualizationPage.tsx"

createRoot(document.getElementById("root")!).render(
    <BrowserRouter>
        <Routes>
            <Route path={"/"} element={<App />} />
            <Route path={"/visualize"} element={<VisualizationPage />} />
        </Routes>
    </BrowserRouter>,
)
