/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import avaliacoesEquipamentos from './pages/Avaliacoes_Equipamentos';
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
import Tablets from './pages/Tablets';
import Usuarios from './pages/Usuarios';
import acompanharChamado from './pages/acompanhar-chamado';
import chamadoPublico from './pages/chamado-publico';
import reservaPublica from './pages/reserva-publica';
import salaTreinamento from './pages/sala-treinamento';
import reservaSalaPublica from './pages/reserva-sala-publica';
import portalLogin from './pages/portal-login';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Avaliacoes_Equipamentos": avaliacoesEquipamentos,
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
    "Tablets": Tablets,
    "Usuarios": Usuarios,
    "acompanhar-chamado": acompanharChamado,
    "chamado-publico": chamadoPublico,
    "reserva-publica": reservaPublica,
    "sala-treinamento": salaTreinamento,
    "reserva-sala-publica": reservaSalaPublica,
    "portal-login": portalLogin,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};