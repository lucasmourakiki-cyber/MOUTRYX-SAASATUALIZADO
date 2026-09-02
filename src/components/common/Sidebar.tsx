import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { MoutryxLogo } from './MoutryxLogo';
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Smartphone,
  Plane,
  Users,
  Percent,
  Sprout,
  FileCheck2,
  Wallet,
  Receipt,
  BarChart3,
  Bot,
  Building,
  X,
  Target,
  Building2,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  visible: boolean;
  badge?: string;
  highlight?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user: authUser } = useAuth();
  const {
    activeTab,
    setActiveTab,
    currentUserRole,
    setIsFieldMode,
    currentCompany,
    companies,
    setCurrentCompanyId,
  } = useApp();

  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const companyRef = useRef<HTMLDivElement>(null);

  // Close company dropdown when activeTab changes
  useEffect(() => {
    setIsCompanyDropdownOpen(false);
  }, [activeTab]);

  // Outside click listener for company dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (isCompanyDropdownOpen && companyRef.current && !companyRef.current.contains(target)) {
        setIsCompanyDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isCompanyDropdownOpen]);

  const handleNavClick = (tab: string) => {
    setIsCompanyDropdownOpen(false);
    setActiveTab(tab);
    if (tab === 'modo_campo') {
      setIsFieldMode(true);
    }
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  // Check role-based visibility restrictions
  const isPilot = currentUserRole === 'piloto';
  const isFinancial = currentUserRole === 'financeiro';

  const navSections: NavSection[] = [
    {
      title: 'VISÃO GERAL & COMERCIAL',
      items: [
        { id: 'dashboard', label: 'Dashboard Geral', icon: LayoutDashboard, visible: true },
        { id: 'reativa', label: '🎯 MOUTRYX REATIVA', icon: Target, visible: !isPilot, highlight: true, badge: '2.0' },
        { id: 'orcamentos', label: 'Orçamentos & Propostas', icon: FileCheck2, visible: !isPilot },
      ],
    },
    {
      title: 'OPERAÇÃO & CAMPO',
      items: [
        { id: 'ordens_servico', label: 'Ordens de Serviço (OS)', icon: ClipboardList, visible: true },
        { id: 'modo_campo', label: 'Modo Campo (Piloto)', icon: Smartphone, visible: true, badge: 'Campo' },
        { id: 'agenda', label: 'Agenda & Escala de Voos', icon: Calendar, visible: true },
        { id: 'drones', label: 'Drones, Baterias & Frota', icon: Plane, visible: !isFinancial },
        { id: 'pilotos', label: 'Pilotos & Equipe', icon: Users, visible: !isPilot },
      ],
    },
    {
      title: 'AGRONÔMICO & CADASTROS',
      items: [
        { id: 'clientes', label: 'Clientes, Fazendas & Talhões', icon: Users, visible: true },
        { id: 'defensivos', label: 'Agronômico & AGROFIT (MAPA)', icon: Sprout, visible: true },
      ],
    },
    {
      title: 'FINANCEIRO & ACERTOS',
      items: [
        { id: 'financeiro', label: 'Contas & Fluxo de Caixa', icon: Wallet, visible: !isPilot },
        { id: 'notinhas', label: 'Notinhas & OCR Despesas', icon: Receipt, visible: true, badge: 'OCR' },
        { id: 'comissoes', label: 'Comissões de Pilotos', icon: Percent, visible: true },
      ],
    },
    {
      title: 'INTELIGÊNCIA & GESTÃO',
      items: [
        { id: 'copiloto', label: 'Copiloto & Inteligência IA', icon: Bot, visible: true },
        { id: 'relatorios', label: 'Relatórios & Exportações', icon: BarChart3, visible: !isPilot },
        { id: 'empresa', label: 'Configurações da Empresa', icon: Building, visible: currentUserRole === 'proprietario' || currentUserRole === 'super_admin' || currentUserRole === 'administrador' },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-[#E2E8E5] bg-white text-[#111827] shadow-xs transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header inside sidebar */}
        <div className="flex h-16 items-center justify-between border-b border-[#E2E8E5] px-4">
          <MoutryxLogo
            variant="horizontal"
            size="md"
            onClick={() => handleNavClick('dashboard')}
          />

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F0F4F1] hover:text-[#111827] lg:hidden cursor-pointer"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Company Switcher in Sidebar */}
        <div ref={companyRef} className="px-3 pt-3 pb-1 border-b border-[#E2E8E5]">
          <button
            onClick={() => setIsCompanyDropdownOpen(!isCompanyDropdownOpen)}
            className="flex w-full items-center justify-between rounded-xl bg-[#F0F4F1] px-3 py-2 text-xs font-semibold text-[#263238] border border-[#E2E8E5] hover:bg-[#E8F3EC] hover:border-[#B7D8C1] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 text-[#05521F] shrink-0" />
              <span className="truncate">{currentCompany.tradeName || currentCompany.name}</span>
            </div>
            {authUser?.role === 'super_admin' ? (
              <span className="rounded bg-purple-100 px-1 py-0.2 text-[8px] font-bold text-purple-700 border border-purple-200">
                Master
              </span>
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A] shrink-0" />
            )}
            <ChevronDown className={`h-3.5 w-3.5 text-[#718096] shrink-0 transition-transform ${isCompanyDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isCompanyDropdownOpen && (
            <div className="mt-2 space-y-1.5 rounded-xl bg-white p-2 border border-[#E2E8E5] shadow-xl animate-fadeIn">
              <div className="flex items-center justify-between px-1 py-0.5">
                <span className="text-[10px] font-bold text-[#718096] uppercase tracking-wider">
                  Alternar Empresa (Tenant)
                </span>
                {authUser?.role === 'super_admin' ? (
                  <span className="text-[8px] font-bold text-purple-700 bg-purple-50 px-1 rounded border border-purple-200">
                    Master
                  </span>
                ) : (
                  <span className="text-[8px] font-bold text-[#05521F] bg-[#E8F3EC] px-1 rounded border border-[#B7D8C1]">
                    SaaS
                  </span>
                )}
              </div>

              {authUser?.role === 'super_admin' ? (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {companies.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setCurrentCompanyId(c.id);
                        setIsCompanyDropdownOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                        c.id === currentCompany.id
                          ? 'bg-[#E8F3EC] text-[#05521F] font-bold'
                          : 'text-[#52636B] hover:bg-[#F0F4F1] hover:text-[#263238]'
                      }`}
                    >
                      <div className="truncate">
                        <p className="truncate font-medium">{c.name}</p>
                        <p className="text-[9px] text-[#718096]">{c.city}/{c.state}</p>
                      </div>
                      {c.id === currentCompany.id && <CheckCircle2 className="h-3.5 w-3.5 text-[#05521F] shrink-0" />}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <div className="rounded-lg bg-[#E8F3EC] p-2 text-[#263238] font-medium border border-[#B7D8C1]">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-xs truncate text-[#05521F]">{currentCompany.name}</p>
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#16A34A] shrink-0 ml-1" />
                    </div>
                    <p className="text-[9px] text-[#718096] mt-0.5">
                      {currentCompany.city}/{currentCompany.state} {currentCompany.cnpj ? `• CNPJ: ${currentCompany.cnpj}` : ''}
                    </p>
                    <span className="inline-block mt-1 text-[8px] font-bold text-[#05521F] bg-white px-1.5 py-0.5 rounded border border-[#B7D8C1]">
                      ✓ Empresa Vinculada
                    </span>
                  </div>

                  <div className="rounded-lg bg-[#F0F4F1] p-2 text-[9px] text-[#718096] border border-[#E2E8E5]">
                    <p className="font-semibold text-[#263238]">🔒 Ambiente Exclusivo</p>
                    <p className="text-[#718096] mt-0.5 leading-relaxed">
                      Sua assinatura dá acesso direto e exclusivo ao seu tenant.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin">
          {navSections.map((section, sIdx) => {
            const visibleItems = section.items.filter((item) => item.visible);
            if (visibleItems.length === 0) return null;

            return (
              <div key={sIdx} className="space-y-1">
                <p className="px-3 text-[10px] font-bold text-[#718096] uppercase tracking-wider">
                  {section.title}
                </p>
                <div className="space-y-0.5 mt-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-[#E8F3EC] text-[#05521F] font-bold border border-[#B7D8C1] shadow-2xs'
                            : item.highlight
                            ? 'text-[#263238] hover:bg-[#F0F4F1] hover:text-[#05521F]'
                            : 'text-[#52636B] hover:bg-[#F0F4F1] hover:text-[#263238]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon
                            className={`h-4 w-4 ${
                              isActive ? 'text-[#0B6B32]' : item.highlight ? 'text-[#05521F]' : 'text-[#718096]'
                            }`}
                          />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold border ${
                            isActive
                              ? 'bg-[#05521F] text-white border-[#05521F]'
                              : 'bg-[#E8F3EC] text-[#05521F] border-[#B7D8C1]'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                        {item.highlight && !isActive && (
                          <span className="flex h-1.5 w-1.5 rounded-full bg-[#05521F]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="border-t border-[#E2E8E5] p-3 text-center bg-[#F6F8F7]">
          <div className="rounded-xl bg-white p-2.5 border border-[#E2E8E5] text-[10px] shadow-2xs">
            <span className="font-bold text-[#263238] block tracking-wide">Agro Intelligence</span>
            <span className="text-[#718096] block mt-0.5 font-medium">MAPA & ANAC Compliance</span>
          </div>
        </div>
      </aside>
    </>
  );
};
