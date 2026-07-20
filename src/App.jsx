import { Suspense } from 'react';
import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
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

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <Routes>
            <Route path="/" element={
              <Suspense fallback={<LoadingFallback />}>
                <LayoutWrapper currentPageName={mainPageKey}>
                  <MainPage />
                </LayoutWrapper>
              </Suspense>
            } />
            {Object.entries(Pages).map(([path, Page]) => (
              <Route
                key={path}
                path={`/${path}`}
                element={
                  <Suspense fallback={<LoadingFallback />}>
                    <LayoutWrapper currentPageName={path}>
                      <Page />
                    </LayoutWrapper>
                  </Suspense>
                }
              />
            ))}
            {/* Página pública para aprovação do diretor via e-mail */}
            <Route path="/aprovacao-diretor" element={<AprovacaoDiretor />} />
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App