/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 */
import { lazy } from 'react';
import __Layout from './Layout.jsx';

// Lazy loaded pages to enable code splitting and reduce initial bundle size
const avaliacoesEquipamentos = lazy(() => import('./pages/Avaliacoes_Equipamentos'));
const Cameras = lazy(() => import('./pages/Cameras'));
const canetasVibracao = lazy(() => import('./pages/Canetas_Vibracao'));
const Chamados = lazy(() => import('./pages/Chamados'));
const Colaboradores = lazy(() => import('./pages/Colaboradores'));
const Coletores = lazy(() => import('./pages/Coletores'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Home = lazy(() => import('./pages/Home'));
const projetosTerceiros = lazy(() => import('./pages/ProjetosTerceiros'));
const notebooksExternos = lazy(() => import('./pages/Notebooks_Externos'));
const pcsInternos = lazy(() => import('./pages/PCs_Internos'));
const Ramais = lazy(() => import('./pages/Ramais'));
const Reservas = lazy(() => import('./pages/Reservas'));
const Resumo = lazy(() => import('./pages/Resumo'));
const Smartphones = lazy(() => import('./pages/Smartphones'));
const Tablets = lazy(() => import('./pages/Tablets'));
const Usuarios = lazy(() => import('./pages/Usuarios'));
const acompanharChamado = lazy(() => import('./pages/acompanhar-chamado'));
const chamadoPublico = lazy(() => import('./pages/chamado-publico'));
const portalChamados = lazy(() => import('./pages/portal-chamados'));
const portalEquipamentos = lazy(() => import('./pages/portal-equipamentos'));
const portalLogin = lazy(() => import('./pages/portal-login'));
const portalRamais = lazy(() => import('./pages/portal-ramais'));
const portalReservas = lazy(() => import('./pages/portal-reservas'));
const portalSala = lazy(() => import('./pages/portal-sala'));
const portal = lazy(() => import('./pages/portal'));
const reservaPublica = lazy(() => import('./pages/reserva-publica'));
const reservaSalaPublica = lazy(() => import('./pages/reserva-sala-publica'));
const salaTreinamento = lazy(() => import('./pages/sala-treinamento'));
const Comunicados = lazy(() => import('./pages/Comunicados'));
const portalComunicados = lazy(() => import('./pages/portal-comunicados'));
const portalRequisicoes = lazy(() => import('./pages/portal-requisicoes'));
const aprovacaoDiretor = lazy(() => import('./pages/aprovacao-diretor'));
const Login = lazy(() => import('./pages/Login'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const RequisicaoCompras = lazy(() => import('./pages/RequisicaoCompras'));
const CentrosCusto = lazy(() => import('./pages/CentrosCusto'));
const Painel_Maquinas = lazy(() => import('./pages/Painel_Maquinas'));

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
    "reset-password": ResetPassword,
    "RequisicaoCompras": RequisicaoCompras,
    "CentrosCusto": CentrosCusto,
    "Painel_Maquinas": Painel_Maquinas,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};