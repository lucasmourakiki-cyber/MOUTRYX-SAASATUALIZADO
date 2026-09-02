import React, { useState } from 'react';
import {
  HeartHandshake,
  Star,
  Plus,
  ArrowRight,
  MessageCircle,
  Sparkles,
  Building2,
  Users,
  CheckCircle2,
  Calendar,
  Layers,
  Zap,
  TrendingUp,
  X,
  FileText,
} from 'lucide-react';
import {
  PostSaleRecord,
  ReferralItem,
  ReactivationClientSummary,
  Company,
  CommercialOpportunity,
} from '../../types';
import { buildWhatsAppLink } from '../../utils/reactivationEngine';

interface PostSalesAndReferralsViewProps {
  postSales: PostSaleRecord[];
  referrals: ReferralItem[];
  clientSummaries: ReactivationClientSummary[];
  company: Company;
  responsibleName?: string;
  onAddPostSale: (record: PostSaleRecord) => void;
  onAddReferral: (item: ReferralItem) => void;
  onCreateOpportunity: (opp: Partial<CommercialOpportunity>) => void;
}

export const PostSalesAndReferralsView: React.FC<PostSalesAndReferralsViewProps> = ({
  postSales = [],
  referrals = [],
  clientSummaries = [],
  company,
  responsibleName = 'Lucas Moura',
  onAddPostSale,
  onAddReferral,
  onCreateOpportunity,
}) => {
  const [activeTab, setActiveTab] = useState<'pos_venda' | 'venda_cruzada' | 'indicacoes'>('pos_venda');

  // New Post-Sale Record Modal
  const [isPostSaleModalOpen, setIsPostSaleModalOpen] = useState(false);
  const [postSaleForm, setPostSaleForm] = useState({
    clientId: '',
    clientName: '',
    farmName: '',
    serviceDate: new Date().toISOString().split('T')[0],
    crop: 'Soja',
    serviceType: 'Pulverização com Drone',
    areaSprayedHa: 300,
    satisfactionRating: 5,
    feedbackNotes: '',
    nextNeedIdentified: '',
    nextContactScheduled: '',
  });

  // New Referral Modal
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [referralForm, setReferralForm] = useState({
    referrerName: '',
    referredProspectName: '',
    referredFarmName: '',
    referredPhone: '',
    rewardNotes: 'Desconto de 5% no próximo voo',
  });

  // Handle Save Post Sale
  const handleSavePostSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postSaleForm.clientName.trim()) return;

    const newRecord: PostSaleRecord = {
      id: `ps-${Date.now()}`,
      companyId: company.id,
      clientId: postSaleForm.clientId || `client-${Date.now()}`,
      clientName: postSaleForm.clientName,
      farmName: postSaleForm.farmName || `Fazenda ${postSaleForm.clientName}`,
      serviceDate: postSaleForm.serviceDate,
      crop: postSaleForm.crop,
      serviceType: postSaleForm.serviceType,
      areaSprayedHa: Number(postSaleForm.areaSprayedHa) || 300,
      satisfactionRating: postSaleForm.satisfactionRating,
      feedbackNotes: postSaleForm.feedbackNotes,
      nextNeedIdentified: postSaleForm.nextNeedIdentified,
      nextContactScheduled: postSaleForm.nextContactScheduled,
    };

    onAddPostSale(newRecord);
    setIsPostSaleModalOpen(false);
  };

  // Handle Save Referral
  const handleSaveReferral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!referralForm.referrerName.trim() || !referralForm.referredProspectName.trim()) return;

    const newRef: ReferralItem = {
      id: `ref-${Date.now()}`,
      companyId: company.id,
      referrerName: referralForm.referrerName,
      referredProspectName: referralForm.referredProspectName,
      referredFarmName: referralForm.referredFarmName || `Fazenda ${referralForm.referredProspectName}`,
      referredPhone: referralForm.referredPhone || '(66) 99999-0000',
      date: new Date().toISOString().split('T')[0],
      status: 'novo_lead',
      rewardNotes: referralForm.rewardNotes,
    };

    onAddReferral(newRef);
    setIsReferralModalOpen(false);
  };

  // Convert Post Sale to New Opportunity
  const handleConvertPostSaleToOpp = (record: PostSaleRecord) => {
    onCreateOpportunity({
      id: `opp-ps-${Date.now()}`,
      companyId: company.id,
      entityType: 'cliente',
      clientId: record.clientId,
      title: `${record.nextNeedIdentified || 'Nova Aplicação'} - ${record.clientName}`,
      producerName: record.clientName,
      farmName: record.farmName,
      crop: record.crop,
      serviceType: record.nextNeedIdentified || record.serviceType,
      areaHa: record.areaSprayedHa,
      estimatedPotentialValue: record.areaSprayedHa * 45,
      stage: 'interesse',
      opportunityScore: 88,
      nextBestAction: 'Elaborar orçamento para a próxima janela agronômica',
      nextBestActionReason: `Identificada necessidade pós-serviço: ${record.nextNeedIdentified}`,
      isAtRisk: false,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/40 flex items-center gap-1">
              <HeartHandshake className="w-3 h-3 text-violet-400" />
              PÓS-VENDA, EXPANSÃO & INDICAÇÕES
            </span>
          </div>
          <h3 className="text-lg font-black text-white tracking-tight mt-1">
            Ciclo Comercial Contínuo & Fidelização
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
            O serviço não termina com o voo do drone. Colete feedback de qualidade, gere novas vendas cruzadas e transforme clientes em fontes de novos leads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'pos_venda' && (
            <button
              type="button"
              onClick={() => setIsPostSaleModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Pós-Venda</span>
            </button>
          )}

          {activeTab === 'indicacoes' && (
            <button
              type="button"
              onClick={() => setIsReferralModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Indicação</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        {[
          { id: 'pos_venda', label: '✓ Pós-Venda & Satisfação', count: postSales.length },
          { id: 'venda_cruzada', label: '🚀 Oportunidades de Expansão (Cross-Sell)', count: 4 },
          { id: 'indicacoes', label: '🤝 Rede de Indicações', count: referrals.length },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{tab.label}</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-slate-950 text-slate-300">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab 1: Pós-Venda */}
      {activeTab === 'pos_venda' && (
        <div className="space-y-4">
          {postSales.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
              <HeartHandshake className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">Nenhum registro de pós-venda</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Assim que concluir uma aplicação de drone, registre a avaliação do cliente para alimentar o ciclo comercial.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {postSales.map((record) => (
                <div
                  key={record.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <strong className="text-white text-sm font-bold block">{record.clientName}</strong>
                      <span className="text-xs text-emerald-400 font-medium">{record.farmName}</span>
                    </div>

                    {/* Star Rating */}
                    <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= (record.satisfactionRating || 5)
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 flex flex-wrap gap-2">
                    <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      🌾 {record.crop}
                    </span>
                    <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      📐 {record.areaSprayedHa} ha aplicados
                    </span>
                    <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-400">
                      📅 {record.serviceDate}
                    </span>
                  </div>

                  {record.feedbackNotes && (
                    <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 italic">
                      "{record.feedbackNotes}"
                    </p>
                  )}

                  {record.nextNeedIdentified && (
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Próxima Necessidade</span>
                        <strong>{record.nextNeedIdentified}</strong>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleConvertPostSaleToOpp(record)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1 shadow cursor-pointer"
                      >
                        <span>Criar Oportunidade</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Oportunidades de Expansão / Venda Cruzada */}
      {activeTab === 'venda_cruzada' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-300">
            <strong className="text-white block mb-0.5">Como funciona a Venda Cruzada MOUTRYX:</strong>
            O sistema analisa as culturas e histórico cadastrados para sugerir novos serviços de pulverização (ex: quem contratou dessecação de soja pode necessitar de adubação foliar no milho safrinha).
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {clientSummaries.slice(0, 4).map((client) => {
              const suggestedService = client.lastCrop?.toLowerCase().includes('milho')
                ? 'Dessecação Pré-Plantio de Soja'
                : 'Fungicida + Inseticida no Milho Safrinha';

              return (
                <div
                  key={client.clientId}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <strong className="text-white text-sm font-bold block">{client.clientName}</strong>
                      <span className="text-xs text-slate-400">{client.lastPropertyName || 'Fazenda'} • {client.city}</span>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Cliente Ativo
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Sugestão de Expansão</span>
                    <strong className="text-emerald-400 block text-xs">{suggestedService}</strong>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Este cliente já utiliza pulverização com drones. Apresente disponibilidade de frota para esta nova fase.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onCreateOpportunity({
                        id: `opp-cross-${Date.now()}`,
                        companyId: company.id,
                        entityType: 'cliente',
                        clientId: client.clientId,
                        title: `${suggestedService} - ${client.clientName}`,
                        producerName: client.clientName,
                        farmName: client.lastPropertyName || 'Fazenda',
                        crop: client.lastCrop || 'Soja',
                        serviceType: suggestedService,
                        areaHa: client.totalHectares || 450,
                        estimatedPotentialValue: (client.totalHectares || 450) * 45,
                        stage: 'interesse',
                        opportunityScore: 82,
                        nextBestAction: `Apresentar proposta de ${suggestedService}`,
                        nextBestActionReason: 'Oportunidade de expansão de carteira ativa.',
                        isAtRisk: false,
                      });
                    }}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Criar Oportunidade de Expansão</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Rede de Indicações */}
      {activeTab === 'indicacoes' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {referrals.map((ref) => (
              <div
                key={ref.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Indicado por:</span>
                    <strong className="text-white text-sm font-bold">{ref.referrerName}</strong>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    {ref.status.toUpperCase()}
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase block">Novo Produtor Indicado</span>
                  <strong className="text-white block">{ref.referredProspectName}</strong>
                  <span className="text-slate-400 block">{ref.referredFarmName} • {ref.referredPhone}</span>
                </div>

                {ref.rewardNotes && (
                  <div className="text-xs text-amber-300 bg-amber-950/30 p-2 rounded-lg border border-amber-500/30">
                    🎁 Benefício: {ref.rewardNotes}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const url = buildWhatsAppLink(
                      ref.referredPhone,
                      `Olá, ${ref.referredProspectName}! Tudo bem? Sou o ${responsibleName} da ${company.tradeName || company.name}.\n\nO ${ref.referrerName} recomendou nosso trabalho de pulverização com drones agrícolas. Gostaria de entender suas necessidades para a ${ref.referredFarmName}.`
                    );
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                  className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-current" />
                  <span>Contatar Produtor Indicado</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL PÓS-VENDA */}
      {isPostSaleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">Registrar Pós-Venda</h3>
              <button
                type="button"
                onClick={() => setIsPostSaleModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePostSale} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Nome do Cliente *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Fazenda Santa Maria"
                  value={postSaleForm.clientName}
                  onChange={(e) => setPostSaleForm({ ...postSaleForm, clientName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Cultura</label>
                  <input
                    type="text"
                    value={postSaleForm.crop}
                    onChange={(e) => setPostSaleForm({ ...postSaleForm, crop: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Área Aplicada (ha)</label>
                  <input
                    type="number"
                    value={postSaleForm.areaSprayedHa}
                    onChange={(e) => setPostSaleForm({ ...postSaleForm, areaSprayedHa: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Nota de Satisfação (1 a 5 estrelas)</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setPostSaleForm({ ...postSaleForm, satisfactionRating: star })}
                      className="p-1 text-slate-500 hover:text-amber-400"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= postSaleForm.satisfactionRating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Feedback do Produtor</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Excelente cobertura; sem amassamento; produtor satisfeito com a agilidade..."
                  value={postSaleForm.feedbackNotes}
                  onChange={(e) => setPostSaleForm({ ...postSaleForm, feedbackNotes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Próxima Necessidade Identificada</label>
                <input
                  type="text"
                  placeholder="Ex: Dessecação pré-plantio na próxima safra"
                  value={postSaleForm.nextNeedIdentified}
                  onChange={(e) => setPostSaleForm({ ...postSaleForm, nextNeedIdentified: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPostSaleModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs"
                >
                  Salvar Avaliação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOVA INDICAÇÃO */}
      {isReferralModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white">Cadastrar Indicação</h3>
              <button
                type="button"
                onClick={() => setIsReferralModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReferral} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Quem Indicou? *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Rogério Guimarães (Fazenda Boa Esperança)"
                  value={referralForm.referrerName}
                  onChange={(e) => setReferralForm({ ...referralForm, referrerName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Nome do Produtor Indicado *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Barreto"
                  value={referralForm.referredProspectName}
                  onChange={(e) => setReferralForm({ ...referralForm, referredProspectName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="(66) 99999-0000"
                  value={referralForm.referredPhone}
                  onChange={(e) => setReferralForm({ ...referralForm, referredPhone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Benefício / Recompensa</label>
                <input
                  type="text"
                  value={referralForm.rewardNotes}
                  onChange={(e) => setReferralForm({ ...referralForm, rewardNotes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReferralModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs"
                >
                  Salvar Indicação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
