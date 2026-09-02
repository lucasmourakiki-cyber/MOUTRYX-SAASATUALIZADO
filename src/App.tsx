import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './components/auth/LoginView';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { MoutryxLogo } from './components/common/MoutryxLogo';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { DroneIAIntelligenceModal } from './components/ai/DroneIAIntelligenceModal';
import { DashboardView } from './components/dashboard/DashboardView';
import { ServiceOrdersView } from './components/operations/ServiceOrdersView';
import { CalendarScheduleView } from './components/operations/CalendarScheduleView';
import { FieldModeView } from './components/operations/FieldModeView';
import { FleetManagementView } from './components/fleet/FleetManagementView';
import { PilotsView } from './components/pilots/PilotsView';
import { CommissionsView } from './components/commissions/CommissionsView';
import { ClientsAndPropertiesView } from './components/clients/ClientsAndPropertiesView';
import { AgronomyView } from './components/agronomy/AgronomyView';
import { QuotesView } from './components/commercial/QuotesView';
import { FinancialView } from './components/financial/FinancialView';
import { ReceiptsView } from './components/receipts/ReceiptsView';
import { ReportsView } from './components/reports/ReportsView';
import { AdminView } from './components/admin/AdminView';
import { MoutryxReativaView } from './components/reactiva/MoutryxReativaView';
import { NewOSModal } from './components/modals/NewOSModal';
import { NewQuoteModal } from './components/modals/NewQuoteModal';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { activeTab, setActiveTab, isFieldMode, setCurrentUserRole, setCurrentCompanyId } = useApp();

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isIntelligenceModalOpen, setIsIntelligenceModalOpen] = useState(false);
  const [intelligenceInitialTab, setIntelligenceInitialTab] = useState<'intelligence' | 'copilot' | 'recommendations'>('intelligence');
  const [isNewOSModalOpen, setIsNewOSModalOpen] = useState(false);
  const [isNewQuoteModalOpen, setIsNewQuoteModalOpen] = useState(false);
  const [initialQuoteClientId, setInitialQuoteClientId] = useState<string | undefined>(undefined);
  const [initialQuoteData, setInitialQuoteData] = useState<{
    crop?: string;
    areaHa?: number;
    pricePerHa?: number;
    serviceType?: string;
    notes?: string;
  } | undefined>(undefined);

  // Sync authenticated user role and company with AppContext
  useEffect(() => {
    if (user) {
      if (user.role) {
        setCurrentUserRole(user.role);
      }
      if (user.companyId) {
        setCurrentCompanyId(user.companyId);
      }
    }
  }, [user, setCurrentUserRole, setCurrentCompanyId]);

  const handleOpenNewQuote = (
    clientId?: string,
    quoteData?: {
      crop?: string;
      areaHa?: number;
      pricePerHa?: number;
      serviceType?: string;
      notes?: string;
    }
  ) => {
    setInitialQuoteClientId(clientId);
    setInitialQuoteData(quoteData);
    setIsNewQuoteModalOpen(true);
  };

  const handleOpenCopilot = () => {
    setIntelligenceInitialTab('copilot');
    setIsIntelligenceModalOpen(true);
  };

  const handleOpenIntelligence = () => {
    setIntelligenceInitialTab('intelligence');
    setIsIntelligenceModalOpen(true);
  };

  const handleOpenRecommendations = () => {
    setIntelligenceInitialTab('recommendations');
    setIsIntelligenceModalOpen(true);
  };

  useEffect(() => {
    if (activeTab === 'drone_intelligence' || activeTab === 'drone_score') {
      setIntelligenceInitialTab('intelligence');
      setIsIntelligenceModalOpen(true);
    } else if (activeTab === 'copiloto') {
      setIntelligenceInitialTab('copilot');
      setIsIntelligenceModalOpen(true);
    } else if (activeTab === 'recomendacoes') {
      setIntelligenceInitialTab('recommendations');
      setIsIntelligenceModalOpen(true);
    }
  }, [activeTab]);

  const handleCloseIntelligenceModal = () => {
    setIsIntelligenceModalOpen(false);
    if (
      activeTab === 'copiloto' ||
      activeTab === 'drone_intelligence' ||
      activeTab === 'drone_score' ||
      activeTab === 'recomendacoes'
    ) {
      setActiveTab('dashboard');
    }
  };

  // Loading state while checking active session
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gradient-to-br from-[#111827] via-[#111827] to-[#111827] text-white">
        <div className="flex flex-col items-center gap-4">
          <MoutryxLogo variant="stacked" size="lg" />
          <div className="flex items-center gap-2.5 text-xs text-[#667085] font-medium">
            <div className="h-4 w-4 border-2 border-[#05521F] border-t-transparent rounded-full animate-spin" />
            <span>Iniciando ambiente seguro MOUTRYX...</span>
          </div>
        </div>
      </div>
    );
  }

  // If user is not authenticated, display the login / registration portal
  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F6F8F7] font-sans antialiased text-[#263238]">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <Header
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onOpenNewOS={() => setIsNewOSModalOpen(true)}
          onOpenNewQuote={() => handleOpenNewQuote()}
          onOpenCopilot={handleOpenCopilot}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 lg:pb-0">
          {/* Dynamic Active Tab Router with Safe Fallback */}
          {(() => {
            switch (activeTab) {
              case 'dashboard':
              case 'drone_intelligence':
              case 'copiloto':
              case 'drone_score':
              case 'recomendacoes':
                return (
                  <DashboardView
                    onOpenCopilot={handleOpenCopilot}
                    onOpenIntelligence={handleOpenIntelligence}
                    onOpenNewOS={() => setIsNewOSModalOpen(true)}
                    onOpenNewQuote={() => handleOpenNewQuote()}
                  />
                );

              case 'reativa':
                return <MoutryxReativaView onOpenNewQuote={handleOpenNewQuote} />;

              case 'ordens_servico':
              case 'os':
                return <ServiceOrdersView onOpenNewOS={() => setIsNewOSModalOpen(true)} />;

              case 'agenda':
              case 'calendario':
                return <CalendarScheduleView onOpenNewOS={() => setIsNewOSModalOpen(true)} />;

              case 'modo_campo':
                return <FieldModeView />;

              case 'drones':
              case 'baterias':
              case 'manutencoes':
              case 'manutencao':
              case 'frota':
                return <FleetManagementView />;

              case 'pilotos':
              case 'equipe':
                return <PilotsView />;

              case 'comissoes':
                return <CommissionsView />;

              case 'clientes':
              case 'propriedades':
              case 'talhoes':
              case 'fazendas':
                return <ClientsAndPropertiesView />;

              case 'defensivos':
              case 'culturas':
              case 'culturas_produtos':
              case 'agronomico':
              case 'agrofit':
                return <AgronomyView />;

              case 'orcamentos':
              case 'propostas':
              case 'comercial':
                return <QuotesView onOpenNewQuote={() => handleOpenNewQuote()} />;

              case 'notinhas':
              case 'recibos':
              case 'despesas':
              case 'todas':
              case 'pilotos_notinhas':
              case 'comprovantes':
                return <ReceiptsView />;

              case 'financeiro':
              case 'receber':
              case 'pagar':
              case 'rentabilidade':
              case 'contas_receber':
              case 'contas_pagar':
              case 'fluxo_caixa':
              case 'caixa':
              case 'visao_geral':
                return <FinancialView />;

              case 'relatorios':
              case 'exportacoes':
                return <ReportsView />;

              case 'empresa':
              case 'permissoes':
              case 'documentos':
              case 'auditoria':
              case 'configuracoes':
              case 'admin':
                return <AdminView />;

              default:
                return (
                  <DashboardView
                    onOpenCopilot={handleOpenCopilot}
                    onOpenIntelligence={handleOpenIntelligence}
                    onOpenNewOS={() => setIsNewOSModalOpen(true)}
                    onOpenNewQuote={() => handleOpenNewQuote()}
                  />
                );
            }
          })()}
        </main>

        {/* Mobile Fixed Bottom Navigation */}
        <MobileBottomNav
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onOpenCopilot={handleOpenCopilot}
        />
      </div>

      {/* Global Modals */}
      <GlobalSearchModal />

      <DroneIAIntelligenceModal
        isOpen={isIntelligenceModalOpen}
        onClose={handleCloseIntelligenceModal}
        initialTab={intelligenceInitialTab}
      />

      <NewOSModal
        isOpen={isNewOSModalOpen}
        onClose={() => setIsNewOSModalOpen(false)}
      />

      <NewQuoteModal
        isOpen={isNewQuoteModalOpen}
        onClose={() => {
          setIsNewQuoteModalOpen(false);
          setInitialQuoteClientId(undefined);
          setInitialQuoteData(undefined);
        }}
        initialClientId={initialQuoteClientId}
        initialData={initialQuoteData}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}
