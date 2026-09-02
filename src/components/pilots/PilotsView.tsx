import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Pilot, ProfessionalType } from '../../types';
import {
  Users,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Award,
  FileCheck2,
  DollarSign,
  Phone,
  Mail,
  ShieldCheck,
  Plane,
  Edit2,
  Trash2,
  FileText,
  Briefcase,
  Layers,
  MapPin,
  Calendar,
  Eye,
} from 'lucide-react';
import { NewProfessionalModal } from '../modals/NewProfessionalModal';
import { DocumentPreviewModal } from '../modals/DocumentPreviewModal';

export const PilotsView: React.FC = () => {
  const { pilots, serviceOrders, pilotCommissions, deletePilot } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState<'all' | ProfessionalType>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Pilot | null>(null);
  const [previewDocument, setPreviewDocument] = useState<{
    title: string;
    fileName: string;
    fileUrl?: string;
    fileSize?: string;
    type?: string;
    expiryDate?: string;
    uploadDate?: string;
  } | null>(null);

  const filteredPilots = pilots.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (roleFilter !== 'all') {
      const type = p.professionalType || 'piloto';
      if (type !== roleFilter) return false;
    }
    if (
      search &&
      !p.name.toLowerCase().includes(search.toLowerCase()) &&
      !p.city.toLowerCase().includes(search.toLowerCase()) &&
      !p.contractType.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const totalPilots = pilots.filter((p) => (!p.professionalType || p.professionalType === 'piloto')).length;
  const totalCaldistas = pilots.filter((p) => p.professionalType === 'auxiliar_caldista').length;

  const handleOpenCreate = () => {
    setEditingProfessional(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pilot: Pilot) => {
    setEditingProfessional(pilot);
    setIsModalOpen(true);
  };

  const handleDelete = (pilot: Pilot) => {
    if (window.confirm(`Tem certeza que deseja excluir o profissional ${pilot.name}?`)) {
      deletePilot(pilot.id);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-[#05521F]" />
            <h1 className="text-xl sm:text-2xl font-black text-[#111827]">Pilotos & Equipe de Campo</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Cadastro de Pilotos e Auxiliares/Caldistas, regras de remuneração (Fixo / Comissão) e habilitações (CAAR / ANAC / CNH)
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white px-4 py-2.5 text-xs font-black shadow-md transition-all cursor-pointer border border-[#05521F]/30 shrink-0"
        >
          <Plus className="h-4 w-4" /> NOVO PROFISSIONAL
        </button>
      </div>

      {/* Role Tabs and KPI summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => setRoleFilter('all')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            roleFilter === 'all'
              ? 'bg-[#111827] text-white border-[#05521F]'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">Toda a Equipe</span>
          <span className="text-xl font-black block mt-0.5">{pilots.length}</span>
          <span className="text-[11px] opacity-75">Pilotos + Auxiliares/Caldistas</span>
        </button>

        <button
          onClick={() => setRoleFilter('piloto')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            roleFilter === 'piloto'
              ? 'bg-emerald-800 text-white border-emerald-500'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">Pilotos Agrícolas</span>
          <span className="text-xl font-black block mt-0.5">{totalPilots}</span>
          <span className="text-[11px] opacity-75">Operadores com CAAR / ANAC</span>
        </button>

        <button
          onClick={() => setRoleFilter('auxiliar_caldista')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            roleFilter === 'auxiliar_caldista'
              ? 'bg-teal-800 text-white border-teal-500'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">Auxiliares / Caldistas</span>
          <span className="text-xl font-black block mt-0.5">{totalCaldistas}</span>
          <span className="text-[11px] opacity-75">Preparo de calda e apoio de solo</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por profissional, cidade, contrato..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-[#05521F] focus:outline-hidden"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="all">Todos os Status</option>
            <option value="ativo">Ativo</option>
            <option value="em_voo">Em Operação</option>
            <option value="folga">Folga</option>
            <option value="afastado">Afastado</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>

        <span className="text-xs text-slate-500 font-semibold">{filteredPilots.length} profissionais listados</span>
      </div>

      {/* Pilots Grid or Empty State */}
      {filteredPilots.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
          <Users className="h-10 w-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">Nenhum profissional encontrado</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Não foram localizados registros com os filtros atuais.
          </p>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#05521F] text-white px-4 py-2 text-xs font-bold shadow-xs hover:bg-[#2E7D32] transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Cadastrar Profissional
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPilots.map((pilot) => {
            const isCaldista = pilot.professionalType === 'auxiliar_caldista';
            const totalPaidCommissions = pilotCommissions
              .filter((c) => c.pilotId === pilot.id && c.status === 'paga')
              .reduce((sum, c) => sum + (c.commissionAmount || 0), 0);

            // Remuneration description
            let remSummary = '';
            if (pilot.hasFixedSalary && pilot.hasCommission) {
              remSummary = `Fixo (R$ ${(pilot.fixedSalary || 0).toFixed(2)}) + Comissão`;
            } else if (pilot.hasFixedSalary) {
              remSummary = `Fixo R$ ${(pilot.fixedSalary || 0).toFixed(2)}/mês`;
            } else if (pilot.hasCommission) {
              if (pilot.commissionType === 'por_hectare') {
                remSummary = `Comissão R$ ${(pilot.commissionValue ?? pilot.ratePerHectare ?? 0).toFixed(2)}/ha`;
              } else if (pilot.commissionType === 'percentual') {
                remSummary = `Comissão ${pilot.commissionValue ?? pilot.percentRate ?? 0}% do serviço`;
              } else if (pilot.commissionType === 'fixo_por_servico') {
                remSummary = `Comissão R$ ${(pilot.commissionValue ?? pilot.fixedPerService ?? 0).toFixed(2)} por OS`;
              } else {
                remSummary = 'Comissionado';
              }
            } else {
              remSummary = 'Sem remuneração cadastrada';
            }

            return (
              <div
                key={pilot.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-[#05521F]/50 transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl font-black text-sm text-white shadow-xs ${
                          isCaldista
                            ? 'bg-gradient-to-br from-teal-600 to-teal-800'
                            : 'bg-gradient-to-br from-[#05521F] to-[#111827]'
                        }`}
                      >
                        {pilot.name.split(' ').map((n) => n[0]).join('').substring(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-extrabold text-sm text-[#111827]">{pilot.name}</h3>
                        </div>
                        <p className="text-[11px] text-slate-500">{pilot.city}/{pilot.state}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                          pilot.status === 'ativo'
                            ? 'bg-emerald-100 text-emerald-800'
                            : pilot.status === 'em_voo'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {pilot.status.replace(/_/g, ' ')}
                      </span>
                      <span
                        className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-sm ${
                          isCaldista
                            ? 'bg-teal-50 text-teal-700 border border-teal-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isCaldista ? 'Auxiliar / Caldista' : 'Piloto Agrícola'}
                      </span>
                    </div>
                  </div>

                  {/* Badges / Contract & Remuneration */}
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap gap-1.5 text-[11px]">
                      <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                        <Briefcase className="h-3 w-3 text-slate-500" />
                        {pilot.contractType?.toUpperCase() || 'CLT'}
                      </span>
                      <span className="bg-emerald-50 text-[#05521F] font-bold px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-emerald-600" />
                        {remSummary}
                      </span>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 font-semibold block text-[10px] uppercase">
                        {isCaldista ? 'Área Apoiada' : 'Hectares Aplicados'}
                      </span>
                      <span className="font-black text-sm text-slate-900 mt-0.5 block">
                        {pilot.totalHectaresSprayed || 0} ha
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 font-semibold block text-[10px] uppercase">Comissões Pagas</span>
                      <span className="font-black text-sm text-emerald-700 mt-0.5 block">
                        R$ {totalPaidCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Certifications & Habilitações */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                    {!isCaldista && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> CAAR:
                        </span>
                        <span className="font-bold text-slate-800">{pilot.caarNumber || 'Não informado'}</span>
                      </div>
                    )}
                    {pilot.anacCode && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 flex items-center gap-1">
                          <Plane className="h-3.5 w-3.5 text-blue-600" /> ANAC / DECEA:
                        </span>
                        <span className="font-bold text-slate-800">{pilot.anacCode}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>CNH:</span>
                      <span className="font-medium text-slate-700">{pilot.cnhNumber || 'Não informado'} {pilot.cnhCategory ? `(${pilot.cnhCategory})` : ''}</span>
                    </div>
                    {pilot.documents && pilot.documents.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold">
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3 text-slate-400" /> Documentos:
                          </span>
                          <span className="text-emerald-700 font-bold">{pilot.documents.length} anexo(s)</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {pilot.documents.map((doc) => (
                            <button
                              key={doc.id}
                              type="button"
                              onClick={() =>
                                setPreviewDocument({
                                  title: doc.title,
                                  fileName: doc.fileName,
                                  fileUrl: doc.fileUrl,
                                  fileSize: doc.fileSize,
                                  type: doc.type,
                                  expiryDate: doc.expiryDate,
                                  uploadDate: doc.uploadDate,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#05521F] text-[10px] font-bold transition-colors cursor-pointer"
                              title={`Visualizar documento: ${doc.title}`}
                            >
                              <Eye className="h-2.5 w-2.5" />
                              <span className="truncate max-w-[120px]">{doc.title}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {pilot.contractPdfUrl && (
                      <div className="pt-1.5 flex items-center justify-between text-[11px]">
                        <span className="text-slate-600 flex items-center gap-1 font-semibold">
                          <FileCheck2 className="h-3 w-3 text-emerald-600" /> Contrato:
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewDocument({
                              title: 'Contrato de Trabalho',
                              fileName: pilot.contractPdfName || 'contrato.pdf',
                              fileUrl: pilot.contractPdfUrl,
                              fileSize: (pilot as any).contractPdfSize,
                              type: 'contrato',
                              uploadDate: pilot.contractUploadDate,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#05521F] text-[10px] font-bold transition-colors cursor-pointer"
                          title="Visualizar contrato PDF"
                        >
                          <Eye className="h-2.5 w-2.5" /> Ver PDF
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Contact info */}
                  <div className="text-xs text-slate-600 space-y-1">
                    {pilot.phone && (
                      <p className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-slate-400" /> {pilot.phone}
                      </p>
                    )}
                    {pilot.email && (
                      <p className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-slate-400" /> {pilot.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenEdit(pilot)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-[#05521F] hover:bg-emerald-50 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button
                    onClick={() => handleDelete(pilot)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer"
                    title="Excluir profissional"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New / Edit Professional Modal */}
      {isModalOpen && (
        <NewProfessionalModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingProfessional(null);
          }}
          initialData={editingProfessional || undefined}
        />
      )}

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={Boolean(previewDocument)}
        onClose={() => setPreviewDocument(null)}
        document={previewDocument}
      />
    </div>
  );
};
