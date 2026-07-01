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
import projetosTerceiros from './pages/ProjetosTerceiros';
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
import portalChamados from './pages/portal-chamados';
import portalEquipamentos from './pages/portal-equipamentos';
import portalLogin from './pages/portal-login';
import portalRamais from './pages/portal-ramais';
import portalReservas from './pages/portal-reservas';
import portalSala from './pages/portal-sala';
import portal from './pages/portal';
import reservaPublica from './pages/reserva-publica';
import reservaSalaPublica from './pages/reserva-sala-publica';
import salaTreinamento from './pages/sala-treinamento';
import Comunicados from './pages/Comunicados';
import portalComunicados from './pages/portal-comunicados';
import portalRequisicoes from './pages/portal-requisicoes';
import aprovacaoDiretor from './pages/aprovacao-diretor';
import Login from './pages/Login';
import RequisicaoCompras from './pages/RequisicaoCompras';
import CentrosCusto from './pages/CentrosCusto';
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
    "ProjetosTerceiros": projetosTerceiros,
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
    "portal-chamados": portalChamados,
    "portal-equipamentos": portalEquipamentos,
    "portal-login": portalLogin,
    "portal-ramais": portalRamais,
    "portal-reservas": portalReservas,
    "portal-sala": portalSala,
    "portal": portal,
    "reserva-publica": reservaPublica,
    "reserva-sala-publica": reservaSalaPublica,
    "sala-treinamento": salaTreinamento,
    "Comunicados": Comunicados,
    "portal-comunicados": portalComunicados,
    "portal-requisicoes": portalRequisicoes,
    "aprovacao-diretor": aprovacaoDiretor,
    "login": Login,
    "RequisicaoCompras": RequisicaoCompras,
    "CentrosCusto": CentrosCusto,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};