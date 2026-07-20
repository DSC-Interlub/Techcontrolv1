import { Suspense } from 'react';
import './App.css';
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import NavigationTracker from '@/lib/NavigationTracker';
import { pagesConfig } from './pages.config';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PublicOnlyRoute from '@/components/auth/PublicOnlyRoute';
import AprovacaoDiretor from './pages/aprovacao-diretor';
import { Loader2 } from 'lucide-react';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-950">
    <Loader2 className="w-10 h-10 animate-spin text-teal-400" />
  </div>
);

const PUBLIC_PAGES = [
  'login',
  'reset-password',
  'portal-login',
  'portal',
  'portal-chamados',
  'portal-reservas',
  'portal-sala',
  'portal-equipamentos',
  'portal-ramais',
  'portal-requisicoes',
  'portal-comunicados',
  'acompanhar-chamado',
  'chamado-publico',
  'reserva-publica',
  'reserva-sala-publica',
  'aprovacao-diretor',
];

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <Routes>
            {/* Rota Raiz (/) -> Protegida, redireciona para /login se não logado */}
            <Route path="/" element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingFallback />}>
                  <LayoutWrapper currentPageName={mainPageKey}>
                    <MainPage />
                  </LayoutWrapper>
                </Suspense>
              </ProtectedRoute>
            } />

            {/* Rotas Dinâmicas registradas em PAGES */}
            {Object.entries(Pages).map(([pathKey, Page]) => {
              const isPublic = PUBLIC_PAGES.includes(pathKey) || PUBLIC_PAGES.includes(pathKey.toLowerCase());
              const isLoginRoute = pathKey === 'login' || pathKey === 'Login';

              let element = (
                <Suspense fallback={<LoadingFallback />}>
                  <LayoutWrapper currentPageName={pathKey}>
                    <Page />
                  </LayoutWrapper>
                </Suspense>
              );

              if (isLoginRoute) {
                element = <PublicOnlyRoute>{element}</PublicOnlyRoute>;
              } else if (!isPublic) {
                element = <ProtectedRoute>{element}</ProtectedRoute>;
              }

              const routes = [pathKey];
              if (pathKey.toLowerCase() !== pathKey) {
                routes.push(pathKey.toLowerCase());
              }

              return routes.map((r) => (
                <Route key={r} path={`/${r}`} element={element} />
              ));
            })}

            {/* Rota estática de aprovação do diretor */}
            <Route path="/aprovacao-diretor" element={<AprovacaoDiretor />} />
            
            {/* Fallback 404 */}
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;