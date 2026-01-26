import Cameras from './pages/Cameras';
import canetasVibracao from './pages/Canetas_Vibracao';
import Chamados from './pages/Chamados';
import Colaboradores from './pages/Colaboradores';
import Coletores from './pages/Coletores';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import Importar from './pages/Importar';
import notebooksExternos from './pages/Notebooks_Externos';
import pcsInternos from './pages/PCs_Internos';
import Ramais from './pages/Ramais';
import Reservas from './pages/Reservas';
import Resumo from './pages/Resumo';
import Smartphones from './pages/Smartphones';
import acompanharChamado from './pages/acompanhar-chamado';
import chamadoPublico from './pages/chamado-publico';
import reservaPublica from './pages/reserva-publica';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Cameras": Cameras,
    "Canetas_Vibracao": canetasVibracao,
    "Chamados": Chamados,
    "Colaboradores": Colaboradores,
    "Coletores": Coletores,
    "Dashboard": Dashboard,
    "Home": Home,
    "Importar": Importar,
    "Notebooks_Externos": notebooksExternos,
    "PCs_Internos": pcsInternos,
    "Ramais": Ramais,
    "Reservas": Reservas,
    "Resumo": Resumo,
    "Smartphones": Smartphones,
    "acompanhar-chamado": acompanharChamado,
    "chamado-publico": chamadoPublico,
    "reserva-publica": reservaPublica,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};