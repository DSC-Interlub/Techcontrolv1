import Dashboard from './pages/Dashboard';
import pcsInternos from './pages/PCs_Internos';
import notebooksExternos from './pages/Notebooks_Externos';
import reservaPublica from './pages/Reserva_Publica';
import chamadoPublico from './pages/Chamado_Publico';
import Reservas from './pages/Reservas';
import Chamados from './pages/Chamados';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "PCs_Internos": pcsInternos,
    "Notebooks_Externos": notebooksExternos,
    "Reserva_Publica": reservaPublica,
    "Chamado_Publico": chamadoPublico,
    "Reservas": Reservas,
    "Chamados": Chamados,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};