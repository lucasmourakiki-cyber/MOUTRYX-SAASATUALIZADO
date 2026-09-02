import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  X,
  Users,
  MapPin,
  Plane,
  ClipboardList,
  FileText,
  DollarSign,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const GlobalSearchModal: React.FC = () => {
  const {
    isSearchOpen,
    setIsSearchOpen,
    searchQuery,
    setSearchQuery,
    clients,
    properties,
    talhoes,
    drones,
    pilots,
    serviceOrders,
    quotes,
    accountsReceivable,
    documents,
    setActiveTab,
  } = useApp();

  const [filterType, setFilterType] = useState<string>('all');

  // Keyboard shortcut listener for Ctrl+K / Cmd+K and Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(!isSearchOpen);
      }
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setIsSearchOpen]);

  if (!isSearchOpen) return null;

  const query = searchQuery.toLowerCase().trim();

  // Search Results
  const results: Array<{
    id: string;
    type: 'client' | 'property' | 'talhao' | 'drone' | 'pilot' | 'os' | 'quote' | 'finance' | 'doc';
    title: string;
    subtitle: string;
    extra?: string;
    tab: string;
  }> = [];

  if (query.length > 0) {
    // Clients
    clients.forEach((c) => {
      if (c.name.toLowerCase().includes(query) || c.contactName.toLowerCase().includes(query) || c.city.toLowerCase().includes(query)) {
        results.push({
          id: c.id,
          type: 'client',
          title: c.name,
          subtitle: `Cliente • ${c.city}/${c.state} • ${c.totalHectares} ha`,
          extra: c.phone,
          tab: 'clientes',
        });
      }
    });

    // Properties
    properties.forEach((p) => {
      if (p.name.toLowerCase().includes(query) || p.clientName.toLowerCase().includes(query) || p.city.toLowerCase().includes(query)) {
        results.push({
          id: p.id,
          type: 'property',
          title: p.name,
          subtitle: `Propriedade de ${p.clientName} • ${p.totalAreaHa} ha`,
          extra: `${p.city}/${p.state}`,
          tab: 'clientes',
        });
      }
    });

    // Talhões
    talhoes.forEach((t) => {
      if (t.name.toLowerCase().includes(query) || t.crop.toLowerCase().includes(query) || t.propertyName.toLowerCase().includes(query)) {
        results.push({
          id: t.id,
          type: 'talhao',
          title: t.name,
          subtitle: `Talhão • ${t.crop} • ${t.areaHa} ha (${t.propertyName})`,
          extra: t.cropStage,
          tab: 'talhoes',
        });
      }
    });

    // Drones
    drones.forEach((d) => {
      if (d.model.toLowerCase().includes(query) || d.assetTag.toLowerCase().includes(query) || d.serialNumber.toLowerCase().includes(query)) {
        results.push({
          id: d.id,
          type: 'drone',
          title: `${d.model} (${d.assetTag})`,
          subtitle: `Drone • ${d.flightHours}h voo • ${d.accumulatedHectares} ha acumulados`,
          extra: d.status.toUpperCase(),
          tab: 'drones',
        });
      }
    });

    // Pilots
    pilots.forEach((p) => {
      if (p.name.toLowerCase().includes(query) || p.cpf.includes(query) || p.city.toLowerCase().includes(query)) {
        results.push({
          id: p.id,
          type: 'pilot',
          title: p.name,
          subtitle: `Piloto • ${p.contractType.toUpperCase()} • ${p.commissionModel}`,
          extra: `${p.totalHectaresSprayed} ha aplicados`,
          tab: 'pilotos',
        });
      }
    });

    // Service Orders (OS)
    serviceOrders.forEach((os) => {
      if (os.osNumber.toLowerCase().includes(query) || os.clientName.toLowerCase().includes(query) || os.serviceType.toLowerCase().includes(query) || os.crop.toLowerCase().includes(query)) {
        results.push({
          id: os.id,
          type: 'os',
          title: `${os.osNumber} - ${os.clientName}`,
          subtitle: `OS • ${os.serviceType} • ${os.areaHa} ha • R$ ${os.finalAmount.toFixed(2)}`,
          extra: os.status.toUpperCase(),
          tab: 'ordens_servico',
        });
      }
    });

    // Quotes
    quotes.forEach((q) => {
      if (q.quoteNumber.toLowerCase().includes(query) || q.clientName.toLowerCase().includes(query) || q.serviceType.toLowerCase().includes(query)) {
        results.push({
          id: q.id,
          type: 'quote',
          title: `${q.quoteNumber} - ${q.clientName}`,
          subtitle: `Orçamento • ${q.areaHa} ha • R$ ${q.finalAmount.toFixed(2)}`,
          extra: q.status.toUpperCase(),
          tab: 'orcamentos',
        });
      }
    });

    // Accounts Receivable
    accountsReceivable.forEach((r) => {
      if (r.clientName.toLowerCase().includes(query) || r.osNumber.toLowerCase().includes(query) || r.description.toLowerCase().includes(query)) {
        results.push({
          id: r.id,
          type: 'finance',
          title: `R$ ${r.amount.toFixed(2)} - ${r.clientName}`,
          subtitle: `Conta a Receber • ${r.osNumber} • Vence: ${r.dueDate}`,
          extra: r.status.toUpperCase(),
          tab: 'financeiro',
        });
      }
    });

    // Documents
    documents.forEach((doc) => {
      if (doc.title.toLowerCase().includes(query) || doc.category.toLowerCase().includes(query)) {
        results.push({
          id: doc.id,
          type: 'doc',
          title: doc.title,
          subtitle: `Documento • ${doc.category} • ${doc.relatedName || ''}`,
          extra: doc.status.toUpperCase(),
          tab: 'documentos',
        });
      }
    });
  }

  const filteredResults = filterType === 'all' ? results : results.filter((r) => r.type === filterType);

  const getIcon = (type: string) => {
    switch (type) {
      case 'client':
        return <Users className="h-4 w-4 text-[#05521F]" />;
      case 'property':
        return <MapPin className="h-4 w-4 text-[#0B6B32]" />;
      case 'talhao':
        return <MapPin className="h-4 w-4 text-[#2E7D32]" />;
      case 'drone':
        return <Plane className="h-4 w-4 text-[#05521F]" />;
      case 'pilot':
        return <Users className="h-4 w-4 text-[#E6A817]" />;
      case 'os':
        return <ClipboardList className="h-4 w-4 text-[#64748B]" />;
      case 'quote':
        return <FileText className="h-4 w-4 text-[#05521F]" />;
      case 'finance':
        return <DollarSign className="h-4 w-4 text-[#16A34A]" />;
      default:
        return <FileText className="h-4 w-4 text-[#64748B]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-slate-900/40 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl rounded-2xl border border-[#E2E8E5] bg-white shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-[#E2E8E5] px-4 py-3.5 bg-white">
          <Search className="h-5 w-5 text-[#64748B]" />
          <input
            type="text"
            placeholder="Digite para buscar em toda a plataforma MOUTRYX..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-sm text-[#111827] placeholder-[#64748B] focus:outline-hidden"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="p-1 text-[#64748B] hover:text-[#111827] cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setIsSearchOpen(false)}
            className="rounded-lg border border-[#E2E8E5] bg-[#F0F4F1] px-2 py-1 text-[11px] text-[#64748B] hover:bg-[#E8F3EC] cursor-pointer"
          >
            ESC
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 border-b border-[#E2E8E5] bg-[#F6F8F7] px-4 py-2 overflow-x-auto text-xs">
          {[
            { id: 'all', label: 'Tudo' },
            { id: 'client', label: 'Clientes' },
            { id: 'talhao', label: 'Talhões' },
            { id: 'os', label: 'Ordens de Serviço' },
            { id: 'quote', label: 'Orçamentos' },
            { id: 'drone', label: 'Drones' },
            { id: 'pilot', label: 'Pilotos' },
            { id: 'finance', label: 'Financeiro' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setFilterType(pill.id)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors shrink-0 cursor-pointer ${
                filterType === pill.id
                  ? 'bg-[#05521F] text-white font-bold border border-[#05521F]'
                  : 'text-[#374151] hover:bg-[#E8F3EC] hover:text-[#05521F]'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 bg-[#F6F8F7]">
          {query.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#64748B]">
              <Sparkles className="mx-auto h-8 w-8 text-[#05521F] mb-2 opacity-90" />
              <p className="font-semibold text-[#111827]">Pesquisa Global Rápida</p>
              <p className="mt-1 text-[#64748B]">
                Experimente buscar por <span className="text-[#05521F] font-semibold">"Fazenda São João"</span>,{' '}
                <span className="text-[#05521F] font-semibold">"T100"</span>, <span className="text-[#05521F] font-semibold">"João"</span> ou{' '}
                <span className="text-[#05521F] font-semibold">"OS-2026"</span>.
              </p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#64748B]">
              <Search className="mx-auto h-8 w-8 text-[#64748B] mb-2" />
              <p className="font-semibold text-[#111827]">Nenhum resultado encontrado</p>
              <p className="mt-1 text-[#64748B]">Tente buscar por termos mais genéricos ou verifique a ortografia.</p>
            </div>
          ) : (
            filteredResults.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                onClick={() => {
                  setActiveTab(item.tab);
                  setIsSearchOpen(false);
                }}
                className="flex items-center justify-between rounded-xl border border-[#E2E8E5] bg-white p-3 hover:bg-[#E8F3EC] hover:border-[#B7D8C1] transition-all cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F0F4F1] border border-[#E2E8E5]">
                    {getIcon(item.type)}
                  </div>
                  <div>
                    <p className="font-semibold text-[#111827] text-xs group-hover:text-[#05521F] transition-colors">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-[#64748B]">{item.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item.extra && (
                    <span className="rounded bg-[#F0F4F1] px-2 py-0.5 text-[10px] font-mono text-[#374151] border border-[#E2E8E5]">
                      {item.extra}
                    </span>
                  )}
                  <ArrowRight className="h-4 w-4 text-[#64748B] group-hover:text-[#05521F] group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#E2E8E5] bg-white px-4 py-2.5 text-[11px] text-[#64748B] flex items-center justify-between">
          <span>
            Pressione <kbd className="rounded border border-[#E2E8E5] bg-[#F0F4F1] px-1 py-0.5 text-[10px] text-[#111827]">ESC</kbd> para sair
          </span>
          <span className="text-[#05521F] font-semibold">{filteredResults.length} resultados</span>
        </div>
      </div>
    </div>
  );
};
