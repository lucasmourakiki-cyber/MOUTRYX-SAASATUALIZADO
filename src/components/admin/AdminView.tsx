import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Company, AuditLog, DocumentRecord } from '../../types';
import {
  Building,
  ShieldCheck,
  FolderLock,
  History,
  CheckCircle2,
  AlertTriangle,
  FileText,
  UserCheck,
  Lock,
  Plus,
  Search,
} from 'lucide-react';

export const AdminView: React.FC = () => {
  const {
    currentCompany,
    currentUserRole,
    auditLogs,
    documents,
    activeTab,
  } = useApp();

  const cachedCompany = (() => {
    try { const raw = localStorage.getItem('moutryx_authenticated_company'); const parsed = raw ? JSON.parse(raw) : null; return parsed?.id === currentCompany.id ? parsed : null; } catch { return null; }
  })();
  const companySource = cachedCompany || currentCompany;

  const [companyForm, setCompanyForm] = useState(() => ({
    name: companySource.name || '',
    tradeName: companySource.tradeName || '',
    cnpj: companySource.cnpj || '',
    email: companySource.email || '',
    phone: companySource.phone || '',
    city: companySource.city || '',
    state: companySource.state || '',
  }));
  const [savingCompany, setSavingCompany] = useState(false);
  const [companyMessage, setCompanyMessage] = useState<string | null>(null);

  React.useEffect(() => {
    setCompanyForm({
      name: companySource.name || '',
      tradeName: companySource.tradeName || '',
      cnpj: companySource.cnpj || '',
      email: companySource.email || '',
      phone: companySource.phone || '',
      city: companySource.city || '',
      state: companySource.state || '',
    });
  }, [currentCompany.id]);

  const handleSaveCompany = async () => {
    setSavingCompany(true);
    setCompanyMessage(null);
    try {
      const res = await fetch(`/api/auth/companies/${encodeURIComponent(currentCompany.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: companyForm.name,
          tradeName: companyForm.tradeName,
          document: companyForm.cnpj,
          cnpj: companyForm.cnpj,
          city: companyForm.city,
          state: companyForm.state,
          email: companyForm.email,
          phone: companyForm.phone,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.company) throw new Error(data?.error || 'Não foi possível salvar os dados da empresa.');
      try { localStorage.setItem('moutryx_authenticated_company', JSON.stringify(data.company)); } catch {}
      setCompanyMessage('Dados da empresa salvos com sucesso.');
    } catch (error: any) {
      setCompanyMessage(error?.message || 'Não foi possível salvar os dados da empresa.');
    } finally {
      setSavingCompany(false);
    }
  };

  const [adminTab, setAdminTab] = useState<'empresa' | 'permissoes' | 'documentos' | 'auditoria'>(() => {
    if (activeTab === 'permissoes') return 'permissoes';
    if (activeTab === 'documentos') return 'documentos';
    if (activeTab === 'auditoria') return 'auditoria';
    return 'empresa';
  });

  React.useEffect(() => {
    if (activeTab === 'permissoes') setAdminTab('permissoes');
    else if (activeTab === 'documentos') setAdminTab('documentos');
    else if (activeTab === 'auditoria') setAdminTab('auditoria');
    else if (activeTab === 'empresa') setAdminTab('empresa');
  }, [activeTab]);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building className="h-6 w-6 text-[#05521F]" />
            <h1 className="text-xl sm:text-2xl font-black text-[#111827]">Administração & Governança</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configuração da empresa, controle de permissões por perfil, cofre de documentos e trilha de auditoria
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#05521F] text-white font-black text-xs">88%</div>
          <div><span className="text-[10px] font-bold text-emerald-800 uppercase block">Onboarding da Empresa</span><span className="text-xs font-black text-slate-900">Configuração Quase Completa</span></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-slate-200 gap-4">
        <button onClick={() => setAdminTab('empresa')} className={`pb-3 text-xs font-bold transition-colors border-b-2 cursor-pointer ${adminTab === 'empresa' ? 'border-[#05521F] text-[#05521F]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Dados da Empresa</button>
        <button onClick={() => setAdminTab('permissoes')} className={`pb-3 text-xs font-bold transition-colors border-b-2 cursor-pointer ${adminTab === 'permissoes' ? 'border-[#05521F] text-[#05521F]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Perfis & Permissões</button>
        <button onClick={() => setAdminTab('documentos')} className={`pb-3 text-xs font-bold transition-colors border-b-2 cursor-pointer ${adminTab === 'documentos' ? 'border-[#05521F] text-[#05521F]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Cofre de Documentos ({documents.length})</button>
        <button onClick={() => setAdminTab('auditoria')} className={`pb-3 text-xs font-bold transition-colors border-b-2 cursor-pointer ${adminTab === 'auditoria' ? 'border-[#05521F] text-[#05521F]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>Rastreabilidade & Logs ({auditLogs.length})</button>
      </div>

      {/* TAB 1: EMPRESA */}
      {adminTab === 'empresa' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="font-extrabold text-base text-[#111827] border-b border-slate-100 pb-3">Dados Cadastrais & Fiscais</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div><label className="font-bold text-slate-600 block mb-1">Razão Social</label><input type="text" value={companyForm.name} onChange={(e) => setCompanyForm(f => ({ ...f, name: e.target.value }))} className="w-full rounded-xl border border-slate-300 p-2.5 font-bold" /></div>
              <div><label className="font-bold text-slate-600 block mb-1">Nome Fantasia</label><input type="text" value={companyForm.tradeName} onChange={(e) => setCompanyForm(f => ({ ...f, tradeName: e.target.value }))} className="w-full rounded-xl border border-slate-300 p-2.5 font-bold" /></div>
              <div><label className="font-bold text-slate-600 block mb-1">CNPJ</label><input type="text" value={companyForm.cnpj} onChange={(e) => setCompanyForm(f => ({ ...f, cnpj: e.target.value }))} className="w-full rounded-xl border border-slate-300 p-2.5 font-mono" /></div>
              <div><label className="font-bold text-slate-600 block mb-1">Cidade</label><input type="text" value={companyForm.city} onChange={(e) => setCompanyForm(f => ({ ...f, city: e.target.value }))} className="w-full rounded-xl border border-slate-300 p-2.5" /></div>
              <div><label className="font-bold text-slate-600 block mb-1">Estado (UF)</label><input type="text" maxLength={2} value={companyForm.state} onChange={(e) => setCompanyForm(f => ({ ...f, state: e.target.value.toUpperCase() }))} className="w-full rounded-xl border border-slate-300 p-2.5 font-mono uppercase" /></div>
              <div><label className="font-bold text-slate-600 block mb-1">E-mail Financeiro</label><input type="email" value={companyForm.email} onChange={(e) => setCompanyForm(f => ({ ...f, email: e.target.value }))} className="w-full rounded-xl border border-slate-300 p-2.5" /></div>
              <div><label className="font-bold text-slate-600 block mb-1">WhatsApp Comercial</label><input type="text" value={companyForm.phone} onChange={(e) => setCompanyForm(f => ({ ...f, phone: e.target.value }))} className="w-full rounded-xl border border-slate-300 p-2.5" /></div>
              <div className="sm:col-span-2"><label className="font-bold text-slate-600 block mb-1">Localização da Base Operacional</label><input type="text" value={`${companyForm.city}${companyForm.state ? `/${companyForm.state}` : ''}`} readOnly className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-600" /></div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3">{companyMessage && <span className={`text-xs font-semibold ${companyMessage.includes('sucesso') ? 'text-emerald-700' : 'text-rose-600'}`}>{companyMessage}</span>}<button type="button" onClick={handleSaveCompany} disabled={savingCompany} className="rounded-xl bg-[#05521F] hover:bg-[#2E7D32] disabled:opacity-60 text-white px-5 py-2.5 text-xs font-bold transition-colors cursor-pointer border border-[#05521F]/30">{savingCompany ? 'Salvando...' : 'Salvar Alterações'}</button></div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="font-extrabold text-base text-[#111827] border-b border-slate-100 pb-3">Dados Bancários & PIX</h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200"><span className="text-slate-500 font-semibold block text-[10px]">Banco</span><span className="font-bold text-slate-900 mt-0.5 block">{currentCompany.bankInfo.bankName}</span></div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200"><span className="text-slate-500 font-semibold block text-[10px]">Agência e Conta</span><span className="font-bold text-slate-900 mt-0.5 block">Ag: {currentCompany.bankInfo.agency} • CC: {currentCompany.bankInfo.accountNumber}</span></div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200"><span className="text-emerald-800 font-semibold block text-[10px]">Chave PIX Oficial</span><span className="font-mono font-black text-emerald-900 mt-0.5 block">{currentCompany.bankInfo.pixKey}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PERMISSÕES */}
      {adminTab === 'permissoes' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h3 className="font-extrabold text-base text-[#111827]">Matriz de Perfis & Acessos da Plataforma</h3>
          <p className="text-xs text-slate-500">Controle granular de visualização e edição de módulos</p>
          <div className="overflow-x-auto"><table className="w-full text-left border-collapse text-xs"><thead><tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px]"><th className="p-3">Perfil</th><th className="p-3 text-center">Dashboard</th><th className="p-3 text-center">Ordens de Serviço</th><th className="p-3 text-center">Modo Campo</th><th className="p-3 text-center">Financeiro</th><th className="p-3 text-center">Comissões</th><th className="p-3 text-center">Admin / Config</th></tr></thead><tbody className="divide-y divide-slate-100">
            <tr><td className="p-3 font-bold text-slate-900">Proprietário / Diretor</td><td className="p-3 text-center text-emerald-600 font-bold">✓ Total</td><td className="p-3 text-center text-emerald-600 font-bold">✓ Total</td><td className="p-3 text-center text-emerald-600 font-bold">✓ Total</td><td className="p-3 text-center text-emerald-600 font-bold">✓ Total</td><td className="p-3 text-center text-emerald-600 font-bold">✓ Total</td><td className="p-3 text-center text-emerald-600 font-bold">✓ Total</td></tr>
            <tr><td className="p-3 font-bold text-slate-900">Gestor Operacional</td><td className="p-3 text-center text-emerald-600 font-bold">✓ Total</td><td className="p-3 text-center text-emerald-600 font-bold">✓ Total</td><td className="p-3 text-center text-emerald-600 font-bold">✓ Total</td><td className="p-3 text-center text-slate-400 font-medium">- Restrito</td><td className="p-3 text-center text-emerald-600 font-bold">✓ Aprovar</td><td className="p-3 text-center text-slate-400 font-medium">- Restrito</td></tr>
            <tr><td className="p-3 font-bold text-slate-900">Piloto / Aplicador</td><td className="p-3 text-center text-emerald-600 font-bold">✓ Básico</td><td className="p-3 text-center text-emerald-600 font-bold">✓ Próprias</td><td className="p-3 text-center text-emerald-600 font-bold">✓ Total</td><td className="p-3 text-center text-rose-500 font-medium">✗ Sem Acesso</td><td className="p-3 text-center text-emerald-600 font-bold">✓ Próprias</td><td className="p-3 text-center text-rose-500 font-medium">✗ Sem Acesso</td></tr>
            <tr><td className="p-3 font-bold text-slate-900">Financeiro</td><td className="p-3 text-center text-emerald-600 font-bold">✓ Total</td><td className="p-3 text-center text-emerald-600 font-bold">✓ Leitura</td><td className="p-3 text-center text-rose-500 font-medium">✗ Sem Acesso</td><td className="p-3 text-center text-emerald-600 font-bold">✓ Total</td><td className="p-3 text-center text-emerald-600 font-bold">✓ Baixa/Pagar</td><td className="p-3 text-center text-slate-400 font-medium">- Restrito</td></tr>
          </tbody></table></div>
        </div>
      )}

      {/* TAB 3: COFRE DE DOCUMENTOS */}
      {adminTab === 'documentos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div key={doc.id} className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
              <div className="flex justify-between items-start"><div className="flex items-center gap-2.5"><FileText className="h-5 w-5 text-[#05521F]" /><div><h4 className="font-bold text-sm text-[#111827]">{doc.title}</h4><p className="text-xs text-slate-500">{doc.category} • {doc.relatedName || ''}</p></div></div><span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${doc.status === 'valido' ? 'bg-emerald-100 text-emerald-800' : doc.status === 'vencendo' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>{doc.status}</span></div>
              <div className="text-xs text-slate-600 pt-2 border-t border-slate-100 flex justify-between"><span>Vencimento:</span><span className="font-bold text-slate-800">{doc.expirationDate || 'Sem validade'}</span></div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: AUDITORIA / LOGS */}
      {adminTab === 'auditoria' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <h3 className="font-black text-sm text-[#111827]">Trilha de Rastreabilidade & Auditoria</h3>
          <p className="text-xs text-slate-500">Histórico de ações críticas realizadas por usuários na empresa</p>
          <div className="divide-y divide-slate-100 text-xs">{auditLogs.map((log) => (<div key={log.id} className="py-3 flex items-start justify-between gap-4"><div><p className="font-bold text-slate-900">{log.description}</p><p className="text-slate-500 text-[11px]">Usuário: <strong>{log.userName}</strong> • Ação: {log.action} • Entidade: {log.entityType}</p></div><span className="text-[11px] font-mono text-slate-400 shrink-0">{log.timestamp}</span></div>))}</div>
        </div>
      )}
    </div>
  );
};
