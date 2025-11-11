import Dashboard from './pages/Dashboard';
import pcsInternos from './pages/PCs_Internos';
import notebooksExternos from './pages/Notebooks_Externos';
import reservaPublica from './pages/Reserva_Publica';
import chamadoPublico from './pages/Chamado_Publico';
import Reservas from './pages/Reservas';
import Chamados from './pages/Chamados';
import Smartphones from './pages/Smartphones';
import Cameras from './pages/Cameras';
import Coletores from './pages/Coletores';
import canetasVibracao from './pages/Canetas_Vibracao';
import Resumo from './pages/Resumo';
import Importar from './pages/Importar';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "PCs_Internos": pcsInternos,
    "Notebooks_Externos": notebooksExternos,
    "Reserva_Publica": reservaPublica,
    "Chamado_Publico": chamadoPublico,
    "Reservas": Reservas,
    "Chamados": Chamados,
    "Smartphones": Smartphones,
    "Cameras": Cameras,
    "Coletores": Coletores,
    "Canetas_Vibracao": canetasVibracao,
    "Resumo": Resumo,
    "Importar": Importar,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};