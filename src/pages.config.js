import Dashboard from './pages/Dashboard';
import pcsInternos from './pages/PCs_Internos';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "PCs_Internos": pcsInternos,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};