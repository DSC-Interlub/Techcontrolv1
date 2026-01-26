import Dashboard from './pages/Dashboard';
import pcsInternos from './pages/PCs_Internos';
import notebooksExternos from './pages/Notebooks_Externos';
import Reservas from './pages/Reservas';
import Chamados from './pages/Chamados';
import Smartphones from './pages/Smartphones';
import Cameras from './pages/Cameras';
import Coletores from './pages/Coletores';
import canetasVibracao from './pages/Canetas_Vibracao';
import Resumo from './pages/Resumo';
import Importar from './pages/Importar';
import chamadoPublico from './pages/chamado-publico';
import reservaPublica from './pages/reserva-publica';
import acompanharChamado from './pages/acompanhar-chamado';
import Ramais from './pages/Ramais';
import Colaboradores from './pages/Colaboradores';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "PCs_Internos": pcsInternos,
    "Notebooks_Externos": notebooksExternos,
    "Reservas": Reservas,
    "Chamados": Chamados,
    "Smartphones": Smartphones,
    "Cameras": Cameras,
    "Coletores": Coletores,
    "Canetas_Vibracao": canetasVibracao,
    "Resumo": Resumo,
    "Importar": Importar,
    "chamado-publico": chamadoPublico,
    "reserva-publica": reservaPublica,
    "acompanhar-chamado": acompanharChamado,
    "Ramais": Ramais,
    "Colaboradores": Colaboradores,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};