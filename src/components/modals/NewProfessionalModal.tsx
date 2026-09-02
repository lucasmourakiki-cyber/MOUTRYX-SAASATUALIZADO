import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Pilot, ProfessionalType, ProfessionalDocument, CommissionModelType } from '../../types';
import {
  Users,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  User,
  Phone,
  Mail,
  MapPin,
  FileCheck2,
  ShieldCheck,
  Award,
  Briefcase,
  Calendar,
  FileText,
  Percent,
  Upload,
  Eye,
  RefreshCw,
  FileCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  formatCPF,
  formatPhone,
  normalizeDigits,
  formatFileSize,
  fileToBase64,
} from '../../utils/masks';
import { DocumentPreviewModal } from './DocumentPreviewModal';

interface NewProfessionalModalProps {
  isOpen: boolean;
  onClose: () => void;
  pilotToEdit?: Pilot | null;
  initialData?: Pilot | null;
}

export const NewProfessionalModal: React.FC<NewProfessionalModalProps> = ({
  isOpen,
  onClose,
  pilotToEdit,
  initialData,
}) => {
  const activePilot = pilotToEdit || initialData;
  const { addPilot, updatePilot, pilots, currentCompany } = useApp();

  // Basic Info
  const [professionalType, setProfessionalType] = useState<ProfessionalType>('piloto');
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Sorriso');
  const [state, setState] = useState('MT');
  const [status, setStatus] = useState<Pilot['status']>('ativo');

  // Contract & Remuneration
  const [contractType, setContractType] = useState<Pilot['contractType']>('clt');
  const [admissionDate, setAdmissionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [hasFixedSalary, setHasFixedSalary] = useState(false);
  const [fixedSalary, setFixedSalary] = useState<string>('');
  const [hasCommission, setHasCommission] = useState(true);
  const [commissionType, setCommissionType] = useState<CommissionModelType>('por_hectare');
  const [commissionValue, setCommissionValue] = useState<string>('5.00');

  // Contract PDF specific attachment
  const [contractPdfUrl, setContractPdfUrl] = useState<string | undefined>(undefined);
  const [contractPdfName, setContractPdfName] = useState<string | undefined>(undefined);
  const [contractPdfSize, setContractPdfSize] = useState<string | undefined>(undefined);
  const [contractUploadDate, setContractUploadDate] = useState<string | undefined>(undefined);

  // Certifications & Pilot Data
  const [caarNumber, setCaarNumber] = useState('');
  const [caarValidity, setCaarValidity] = useState('');
  const [anacRegistration, setAnacRegistration] = useState('');
  const [anacValidity, setAnacValidity] = useState('');
  const [cnhNumber, setCnhNumber] = useState('');
  const [cnhValidity, setCnhValidity] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [notes, setNotes] = useState('');

  // Documents
  const [documents, setDocuments] = useState<ProfessionalDocument[]>([]);
  const [newDocType, setNewDocType] = useState<string>('caar');
  const [newDocName, setNewDocName] = useState('');
  const [newDocValidity, setNewDocValidity] = useState('');

  // File Upload State & Refs
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const contractFileInputRef = useRef<HTMLInputElement>(null);
  const replacingDocIdRef = useRef<string | null>(null);

  // Preview Modal State
  const [previewDocument, setPreviewDocument] = useState<{
    title: string;
    fileName: string;
    fileUrl?: string;
    fileSize?: string;
    type?: string;
  } | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      if (activePilot) {
        setProfessionalType(activePilot.professionalType || 'piloto');
        setName(activePilot.name || '');
        setCpf(formatCPF(activePilot.cpf || ''));
        setEmail(activePilot.email || '');
        setPhone(formatPhone(activePilot.phone || activePilot.whatsapp || ''));
        setCity(activePilot.city || 'Sorriso');
        setState(activePilot.state || 'MT');
        setStatus(activePilot.status || 'ativo');
        setContractType(activePilot.contractType || 'clt');
        setAdmissionDate((activePilot as any).admissionDate || activePilot.hireDate || new Date().toISOString().split('T')[0]);

        const hasFix =
          activePilot.hasFixedSalary ??
          (activePilot.commissionModel === 'fixo' ||
            activePilot.commissionModel === 'hibrido' ||
            Boolean(activePilot.fixedSalary && activePilot.fixedSalary > 0));
        setHasFixedSalary(hasFix);
        setFixedSalary(activePilot.fixedSalary ? String(activePilot.fixedSalary) : '');

        const hasComm = activePilot.hasCommission ?? (activePilot.commissionModel !== 'fixo');
        setHasCommission(hasComm);

        const cType: CommissionModelType =
          activePilot.commissionType ||
          (activePilot.commissionModel === 'percentual'
            ? 'percentual'
            : activePilot.commissionModel === 'fixo'
            ? 'fixo_por_servico'
            : 'por_hectare');
        setCommissionType(cType);

        const val =
          activePilot.commissionValue ??
          (cType === 'percentual'
            ? activePilot.percentRate
            : cType === 'por_hectare'
            ? activePilot.ratePerHectare
            : activePilot.fixedPerService) ??
          0;
        setCommissionValue(val ? String(val) : '');

        setCaarNumber(activePilot.caarNumber || '');
        setCaarValidity(activePilot.caarValidity || '');
        setAnacRegistration(activePilot.anacCode || (activePilot as any).anacRegistration || '');
        setAnacValidity((activePilot as any).anacValidity || '');
        setCnhNumber(activePilot.cnhNumber || (activePilot as any).cnh || '');
        setCnhValidity(activePilot.cnhValidity || '');
        setEmergencyContact((activePilot as any).emergencyContact || '');
        setNotes(activePilot.notes || '');

        // Contract PDF
        setContractPdfUrl(activePilot.contractPdfUrl);
        setContractPdfName(activePilot.contractPdfName);
        setContractPdfSize((activePilot as any).contractPdfSize);
        setContractUploadDate(activePilot.contractUploadDate);

        // Documents array
        setDocuments(activePilot.documents || []);
      } else {
        // Reset defaults for new entry
        setProfessionalType('piloto');
        setName('');
        setCpf('');
        setEmail('');
        setPhone('');
        setCity('Sorriso');
        setState('MT');
        setStatus('ativo');
        setContractType('clt');
        setAdmissionDate(new Date().toISOString().split('T')[0]);
        setHasFixedSalary(false);
        setFixedSalary('');
        setHasCommission(true);
        setCommissionType('por_hectare');
        setCommissionValue('6.00');
        setCaarNumber('');
        setCaarValidity('');
        setAnacRegistration('');
        setAnacValidity('');
        setCnhNumber('');
        setCnhValidity('');
        setEmergencyContact('');
        setNotes('');
        setContractPdfUrl(undefined);
        setContractPdfName(undefined);
        setContractPdfSize(undefined);
        setContractUploadDate(undefined);
        setDocuments([]);
      }
    }
  }, [isOpen, activePilot]);

  if (!isOpen) return null;

  // File Upload Handlers
  const handleOpenDocFilePicker = (docIdToReplace?: string) => {
    replacingDocIdRef.current = docIdToReplace || null;
    if (docFileInputRef.current) {
      docFileInputRef.current.value = '';
      docFileInputRef.current.click();
    }
  };

  const handleDocFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // File validation: Size <= 10MB
    const MAX_SIZE_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      setErrorMessage('O arquivo selecionado excede o limite máximo de 10 MB. Selecione um arquivo menor.');
      return;
    }

    // Allowed extensions: PDF, JPG, JPEG, PNG
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const fileNameLower = file.name.toLowerCase();
    const isValidExt = validExtensions.some((ext) => fileNameLower.endsWith(ext));
    const isValidMime =
      file.type === 'application/pdf' ||
      file.type === 'image/jpeg' ||
      file.type === 'image/png' ||
      file.type === 'image/jpg';

    if (!isValidExt && !isValidMime) {
      setErrorMessage('Formato de arquivo inválido. Permitido apenas PDF, JPG, JPEG ou PNG.');
      return;
    }

    try {
      setIsProcessingFile(true);
      const base64Data = await fileToBase64(file);
      const formattedSize = formatFileSize(file.size);
      const today = new Date().toISOString().split('T')[0];

      if (replacingDocIdRef.current) {
        // Replace existing document
        const targetId = replacingDocIdRef.current;
        setDocuments((prev) =>
          prev.map((d) => {
            if (d.id === targetId) {
              return {
                ...d,
                fileName: file.name,
                fileUrl: base64Data,
                fileSize: formattedSize,
                uploadDate: today,
              };
            }
            return d;
          })
        );
        replacingDocIdRef.current = null;
        setSuccessMessage(`Documento "${file.name}" substituído com sucesso!`);
      } else {
        // Add new document
        const docTitle = newDocName.trim() || getDocTypeLabel(newDocType);
        const newDoc: ProfessionalDocument = {
          id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: newDocType,
          title: docTitle,
          fileName: file.name,
          fileUrl: base64Data,
          fileSize: formattedSize,
          uploadDate: today,
          expiryDate: newDocValidity.trim() || undefined,
          status: 'valido',
        };

        setDocuments((prev) => [...prev, newDoc]);
        setNewDocName('');
        setNewDocValidity('');
        setSuccessMessage(`Documento "${file.name}" (${formattedSize}) anexado com sucesso!`);
      }
    } catch (err) {
      console.error('Erro ao processar arquivo:', err);
      setErrorMessage('Não foi possível anexar o documento. Tente novamente.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  // Dedicated Contract PDF Handler
  const handleOpenContractPicker = () => {
    if (contractFileInputRef.current) {
      contractFileInputRef.current.value = '';
      contractFileInputRef.current.click();
    }
  };

  const handleContractFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate only PDF
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMessage('Apenas arquivos em formato PDF são permitidos para o contrato.');
      return;
    }

    // Size limit
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('O arquivo de contrato excede o limite máximo de 10 MB.');
      return;
    }

    try {
      setIsProcessingFile(true);
      const base64Data = await fileToBase64(file);
      const formattedSize = formatFileSize(file.size);
      const today = new Date().toISOString().split('T')[0];

      setContractPdfUrl(base64Data);
      setContractPdfName(file.name);
      setContractPdfSize(formattedSize);
      setContractUploadDate(today);

      // Synchronize in documents list as type 'contrato'
      setDocuments((prev) => {
        const withoutContract = prev.filter((d) => d.type !== 'contrato');
        const contractDoc: ProfessionalDocument = {
          id: `doc-contrato-${Date.now()}`,
          type: 'contrato',
          title: 'Contrato de Trabalho / Prestação',
          fileName: file.name,
          fileUrl: base64Data,
          fileSize: formattedSize,
          uploadDate: today,
          status: 'valido',
        };
        return [contractDoc, ...withoutContract];
      });

      setSuccessMessage(`Contrato "${file.name}" (${formattedSize}) anexado com sucesso!`);
    } catch (err) {
      console.error('Erro ao anexar contrato:', err);
      setErrorMessage('Não foi possível anexar o contrato PDF. Tente novamente.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleRemoveContract = () => {
    setContractPdfUrl(undefined);
    setContractPdfName(undefined);
    setContractPdfSize(undefined);
    setContractUploadDate(undefined);
    setDocuments((prev) => prev.filter((d) => d.type !== 'contrato'));
  };

  const handleRemoveDocument = (docId: string) => {
    const docToRemove = documents.find((d) => d.id === docId);
    if (docToRemove?.type === 'contrato') {
      setContractPdfUrl(undefined);
      setContractPdfName(undefined);
      setContractPdfSize(undefined);
      setContractUploadDate(undefined);
    }
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  const getDocTypeLabel = (type: string) => {
    switch (type) {
      case 'caar':
        return 'Certificado CAAR (MAPA)';
      case 'anac':
        return 'Certificado ANAC / SISANT';
      case 'cnh':
        return 'CNH do Condutor';
      case 'cpf':
        return 'CPF / RG';
      case 'contrato':
        return 'Contrato de Trabalho';
      case 'aso':
        return 'Atestado Médico (ASO)';
      default:
        return type.toUpperCase();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isProcessingFile) {
      setErrorMessage('Aguarde o processamento dos arquivos antes de salvar.');
      return;
    }

    if (!name.trim()) {
      setErrorMessage('Informe o nome completo do profissional.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Informe o telefone ou WhatsApp de contato.');
      return;
    }

    // Duplicate CPF validation
    const normalizedCpf = normalizeDigits(cpf);
    if (normalizedCpf.length >= 11) {
      const duplicate = (pilots || []).find((p) => {
        if (activePilot && p.id === activePilot.id) return false;
        return normalizeDigits(p.cpf) === normalizedCpf;
      });

      if (duplicate) {
        setErrorMessage('Já existe um profissional cadastrado com este CPF.');
        return;
      }
    }

    if (hasFixedSalary && (!fixedSalary || Number(fixedSalary) < 0)) {
      setErrorMessage('Informe um valor válido para o salário fixo.');
      return;
    }
    if (hasCommission && (!commissionValue || Number(commissionValue) < 0)) {
      setErrorMessage('Informe um valor válido para a comissão.');
      return;
    }

    // Determine commissionModel for backward compatibility
    let commissionModel: Pilot['commissionModel'] = 'por_hectare';
    if (!hasCommission && hasFixedSalary) {
      commissionModel = 'fixo';
    } else if (hasFixedSalary && hasCommission) {
      commissionModel = 'hibrido';
    } else if (commissionType === 'percentual') {
      commissionModel = 'percentual';
    } else if (commissionType === 'por_hectare') {
      commissionModel = 'por_hectare';
    } else {
      commissionModel = 'por_hectare';
    }

    const numFixedSalary = hasFixedSalary ? Number(fixedSalary) : undefined;
    const numCommissionValue = hasCommission ? Number(commissionValue) : undefined;

    const professionalData = {
      name: name.trim(),
      professionalType,
      role: professionalType,
      cpf: cpf.trim() || undefined,
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '.')}@moutryx.com.br`,
      phone: phone.trim(),
      whatsapp: phone.trim(),
      city: city.trim(),
      state: state.trim().toUpperCase(),
      status,
      contractType,
      hireDate: admissionDate,
      admissionDate,
      hasFixedSalary,
      fixedSalary: numFixedSalary,
      hasCommission,
      commissionType: hasCommission ? commissionType : undefined,
      commissionValue: numCommissionValue,
      commissionModel,
      ratePerHectare: commissionType === 'por_hectare' ? numCommissionValue : undefined,
      percentRate: commissionType === 'percentual' ? numCommissionValue : undefined,
      fixedPerService: commissionType === 'fixo_por_servico' ? numCommissionValue : undefined,
      hybridRatePerHa: commissionType === 'hibrido' ? numCommissionValue : undefined,
      caarNumber: caarNumber.trim() || undefined,
      caarValidity: caarValidity.trim() || undefined,
      caarCertified: Boolean(caarNumber.trim()),
      anacCode: anacRegistration.trim() || undefined,
      anacRegistration: anacRegistration.trim() || undefined,
      anacValidity: anacValidity.trim() || undefined,
      cnhNumber: cnhNumber.trim() || undefined,
      cnhValidity: cnhValidity.trim() || undefined,
      emergencyContact: emergencyContact.trim() || undefined,
      notes: notes.trim() || undefined,
      // Persisted Documents & Contract
      documents,
      contractPdfUrl,
      contractPdfName,
      contractPdfSize,
      contractUploadDate,
    };

    try {
      setIsSubmitting(true);
      if (activePilot) {
        await updatePilot(activePilot.id, professionalData as any);
      } else {
        await addPilot(professionalData as any);
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      }
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar profissional:', err);
      setErrorMessage(err.message || 'Falha ao salvar dados do profissional no servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        id="modal-new-professional"
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto"
      >
        <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto">
          {/* Hidden File Inputs */}
          <input
            ref={docFileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            onChange={handleDocFileSelected}
            className="hidden"
          />
          <input
            ref={contractFileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleContractFileSelected}
            className="hidden"
          />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-[#111827] px-6 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#05521F] text-[#667085] border border-[#05521F]/40">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight">
                  {pilotToEdit ? 'Editar Cadastro de Profissional' : 'Novo Profissional de Campo'}
                </h2>
                <p className="text-xs text-slate-300">
                  Cadastro de Pilotos de Drone e Auxiliares / Caldistas com regras de remuneração e documentos
                </p>
              </div>
            </div>
            <button
              id="btn-close-prof-modal"
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* 1. SELEÇÃO DO TIPO DE PROFISSIONAL */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 block">
                1. Função Operacional *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  id="btn-role-piloto"
                  type="button"
                  onClick={() => setProfessionalType('piloto')}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    professionalType === 'piloto'
                      ? 'border-[#05521F] bg-white ring-2 ring-[#05521F]/20 shadow-xs'
                      : 'border-slate-200 bg-white/60 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black ${
                      professionalType === 'piloto'
                        ? 'bg-[#05521F] text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-sm font-black text-slate-900">PILOTO</span>
                    <span className="text-[11px] text-slate-500">
                      Operador aeroagrícola remoto responsável pela pilotagem e voo
                    </span>
                  </div>
                </button>

                <button
                  id="btn-role-caldista"
                  type="button"
                  onClick={() => setProfessionalType('auxiliar_caldista')}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    professionalType === 'auxiliar_caldista'
                      ? 'border-[#05521F] bg-white ring-2 ring-[#05521F]/20 shadow-xs'
                      : 'border-slate-200 bg-white/60 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black ${
                      professionalType === 'auxiliar_caldista'
                        ? 'bg-[#05521F] text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="block text-sm font-black text-slate-900">AUXILIAR / CALDISTA</span>
                    <span className="text-[11px] text-slate-500">
                      Preparo de calda, gerador, suporte de baterias e logística de campo
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* 2. DADOS PESSOAIS & CONTATO */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <User className="h-4 w-4 text-[#05521F]" /> 2. Dados Pessoais & Contato
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Nome Completo *
                  </label>
                  <input
                    id="input-prof-name"
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo Mendes"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#05521F] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    CPF (com máscara automática)
                  </label>
                  <input
                    id="input-prof-cpf"
                    type="text"
                    placeholder="000.000.000-00"
                    maxLength={14}
                    value={cpf}
                    onChange={(e) => setCpf(formatCPF(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#05521F] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Telefone / WhatsApp *
                  </label>
                  <input
                    id="input-prof-phone"
                    type="text"
                    required
                    placeholder="(66) 99988-7766"
                    maxLength={15}
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#05521F] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    E-mail
                  </label>
                  <input
                    id="input-prof-email"
                    type="email"
                    placeholder="profissional@moutryx.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#05521F] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Status Operacional
                  </label>
                  <select
                    id="select-prof-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Pilot['status'])}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#05521F] focus:outline-hidden"
                  >
                    <option value="ativo">Ativo (Disponível)</option>
                    <option value="em_voo">Em Operação / Campo</option>
                    <option value="folga">Folga / Descanso</option>
                    <option value="afastado">Afastado / Licença</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Cidade Base
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Sorriso"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#05521F] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Estado (UF)
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="MT"
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#05521F] focus:outline-hidden uppercase"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Contato de Emergência
                  </label>
                  <input
                    type="text"
                    placeholder="Nome e Telefone"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#05521F] focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* 3. DADOS PROFISSIONAIS & REMUNERAÇÃO */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-[#05521F]" /> 3. Contratação & Regras de Remuneração
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Modelo de Contrato
                  </label>
                  <select
                    id="select-contract-type"
                    value={contractType}
                    onChange={(e) => setContractType(e.target.value as Pilot['contractType'])}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#05521F] focus:outline-hidden"
                  >
                    <option value="clt">CLT (Carteira Assinada)</option>
                    <option value="pj">PJ (Prestador Pessoa Jurídica)</option>
                    <option value="autonomo">Autônomo / Freelancer</option>
                    <option value="parceria">Parceria / Diarista</option>
                    <option value="estagio">Estágio / Treinamento</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Data de Início / Admissão
                  </label>
                  <input
                    type="date"
                    value={admissionDate}
                    onChange={(e) => setAdmissionDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#05521F] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Seção Contrato Digital PDF */}
              <div className="rounded-xl border border-dashed border-[#05521F]/40 bg-[#F7F8F7] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-[#05521F]" />
                    Contrato Digital de Trabalho (PDF)
                  </span>
                  {!contractPdfUrl ? (
                    <button
                      id="btn-upload-contract-pdf"
                      type="button"
                      onClick={handleOpenContractPicker}
                      className="flex items-center gap-1.5 bg-[#05521F] hover:bg-[#111827] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" /> + ANEXAR CONTRATO PDF
                    </button>
                  ) : null}
                </div>

                {contractPdfUrl ? (
                  <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-300 bg-white text-xs shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-[#05521F]">
                        <FileCheck className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-black text-slate-900 block truncate">
                          {contractPdfName || 'contrato-trabalho.pdf'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {contractPdfSize || 'Documento PDF'} {contractUploadDate ? `• Anexado em ${contractUploadDate}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        id="btn-view-contract-pdf"
                        type="button"
                        onClick={() =>
                          setPreviewDocument({
                            title: 'Contrato de Trabalho',
                            fileName: contractPdfName || 'contrato.pdf',
                            fileUrl: contractPdfUrl,
                            fileSize: contractPdfSize,
                            type: 'contrato',
                          })
                        }
                        className="px-2.5 py-1 text-xs font-bold text-[#05521F] bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" /> Visualizar
                      </button>
                      <button
                        id="btn-replace-contract-pdf"
                        type="button"
                        onClick={handleOpenContractPicker}
                        className="px-2.5 py-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Substituir
                      </button>
                      <button
                        id="btn-delete-contract-pdf"
                        type="button"
                        onClick={handleRemoveContract}
                        className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remover contrato"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    Nenhum contrato PDF anexado no momento. Clique no botão acima para selecionar o arquivo PDF assinado.
                  </p>
                )}
              </div>

              {/* Estrutura de Remuneração Flexível */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                <span className="text-xs font-bold text-slate-700 block">
                  Composição da Remuneração (Fixo, Comissão ou Ambos)
                </span>

                {/* Salário Fixo Checkbox */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      id="checkbox-fixed-salary"
                      type="checkbox"
                      checked={hasFixedSalary}
                      onChange={(e) => setHasFixedSalary(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#05521F] focus:ring-[#05521F]"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      Possui Salário Fixo Mensal
                    </span>
                  </label>

                  {hasFixedSalary && (
                    <div className="pl-6 pt-1 max-w-xs">
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        Valor do Salário Base (R$)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R$</span>
                        <input
                          id="input-fixed-salary-val"
                          type="number"
                          step="0.01"
                          placeholder="Ex: 3500.00"
                          value={fixedSalary}
                          onChange={(e) => setFixedSalary(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs font-bold text-slate-900 focus:border-[#05521F] focus:outline-hidden"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 pt-3 space-y-3">
                  {/* Comissão Checkbox */}
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      id="checkbox-has-commission"
                      type="checkbox"
                      checked={hasCommission}
                      onChange={(e) => setHasCommission(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#05521F] focus:ring-[#05521F]"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      Recebe Comissão por Trabalho / Aplicação Realizada
                    </span>
                  </label>

                  {hasCommission && (
                    <div className="pl-6 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">
                            Regra de Cálculo da Comissão
                          </label>
                          <select
                            id="select-commission-type"
                            value={commissionType}
                            onChange={(e) => setCommissionType(e.target.value as CommissionModelType)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-[#05521F] focus:outline-hidden"
                          >
                            <option value="por_hectare">Valor Fixo por Hectare Aplicado (R$/ha)</option>
                            <option value="percentual">Percentual sobre Faturamento da OS (%)</option>
                            <option value="fixo_por_servico">Valor Fixo por Serviço / OS (R$/OS)</option>
                            <option value="hibrido">Híbrido (Salário + R$/ha)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">
                            {commissionType === 'percentual'
                              ? 'Percentual da Comissão (%)'
                              : commissionType === 'fixo_por_servico'
                              ? 'Valor Fixo por OS (R$)'
                              : 'Valor por Hectare (R$/ha)'}
                          </label>
                          <div className="relative">
                            <input
                              id="input-commission-val"
                              type="number"
                              step="0.01"
                              placeholder="Ex: 5.50"
                              value={commissionValue}
                              onChange={(e) => setCommissionValue(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-[#05521F] focus:outline-hidden"
                            />
                            <span className="absolute right-3 top-2 text-xs font-bold text-slate-500">
                              {commissionType === 'percentual' ? '%' : 'R$'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-[11px] text-emerald-800">
                        <strong>Regra de Liquidação Automática:</strong> A comissão é provisionada na criação da OS e só é <strong>LIBERADA</strong> para pagamento após a liquidação financeira da fatura pelo cliente.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 4. HABILITAÇÕES & CERTIFICAÇÕES (CAAR / ANAC / CNH) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#05521F]" /> 4. Certificações & Documentos Obrigatórios
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Certificado CAAR (MAPA)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: CAAR-MT-2024-884"
                    value={caarNumber}
                    onChange={(e) => setCaarNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#05521F] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Validade do CAAR
                  </label>
                  <input
                    type="date"
                    value={caarValidity}
                    onChange={(e) => setCaarValidity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#05521F] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Registro ANAC / SISANT
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: PP-0091823"
                    value={anacRegistration}
                    onChange={(e) => setAnacRegistration(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#05521F] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Número CNH
                  </label>
                  <input
                    type="text"
                    placeholder="00000000000"
                    value={cnhNumber}
                    onChange={(e) => setCnhNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#05521F] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Validade da CNH
                  </label>
                  <input
                    type="date"
                    value={cnhValidity}
                    onChange={(e) => setCnhValidity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#05521F] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Documentos Anexados & Upload Interativo */}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Documentos & Anexos Digitalizados ({documents.length})
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Permitido PDF, JPG, JPEG e PNG (máximo 10 MB por arquivo)
                    </span>
                  </div>
                </div>

                {/* Lista de Documentos Anexados */}
                {documents.length > 0 && (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#05521F]/10 text-[#05521F]">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-[10px] uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                                {doc.type?.toUpperCase()}
                              </span>
                              <span className="font-bold text-slate-900 truncate">{doc.title}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {doc.fileName} {doc.fileSize ? `• ${doc.fileSize}` : ''}{' '}
                              {doc.expiryDate ? `• Validade: ${doc.expiryDate}` : ''}
                            </p>
                          </div>
                        </div>

                        {/* Botões de Ação para o Documento: Visualizar, Substituir, Excluir */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          <button
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
                            className="px-2.5 py-1 text-xs font-bold text-[#05521F] bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" /> Visualizar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDocFilePicker(doc.id)}
                            className="px-2.5 py-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> Substituir
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveDocument(doc.id)}
                            className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Excluir documento"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Painel de Adição de Novo Documento */}
                <div className="p-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 space-y-3">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    + Selecionar Tipo & Anexar Arquivo
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        Tipo do Documento
                      </label>
                      <select
                        id="select-new-doc-type"
                        value={newDocType}
                        onChange={(e) => setNewDocType(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-hidden"
                      >
                        <option value="caar">Certificado CAAR</option>
                        <option value="anac">Certificado ANAC / SISANT</option>
                        <option value="cnh">CNH do Condutor</option>
                        <option value="cpf">CPF / RG</option>
                        <option value="contrato">Contrato de Trabalho</option>
                        <option value="aso">Atestado Médico (ASO)</option>
                        <option value="outro">Outro Documento</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        Título / Descrição (Opcional)
                      </label>
                      <input
                        id="input-new-doc-name"
                        type="text"
                        placeholder="Ex: CNH Categoria AB"
                        value={newDocName}
                        onChange={(e) => setNewDocName(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        Data de Validade (Opcional)
                      </label>
                      <input
                        id="input-new-doc-validity"
                        type="date"
                        value={newDocValidity}
                        onChange={(e) => setNewDocValidity(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-1">
                    <button
                      id="btn-add-doc-picker"
                      type="button"
                      onClick={() => handleOpenDocFilePicker()}
                      className="flex items-center gap-1.5 bg-[#05521F] hover:bg-[#111827] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <Upload className="h-4 w-4" /> + ADICIONAR DOCUMENTO
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Observações Operacionais
                </label>
                <textarea
                  rows={2}
                  placeholder="Anotações gerais sobre o profissional, restrições, disponibilidade..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#05521F] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Footer Controls */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                id="btn-cancel-prof"
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-submit-prof"
                type="submit"
                disabled={isSubmitting || isProcessingFile}
                className="flex items-center gap-2 px-6 py-2 text-xs font-black text-white bg-[#05521F] hover:bg-[#111827] disabled:opacity-60 disabled:cursor-not-allowed rounded-xl shadow-md transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    {activePilot ? 'Salvar Alterações' : 'Cadastrar Profissional'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={Boolean(previewDocument)}
        onClose={() => setPreviewDocument(null)}
        document={previewDocument}
      />
    </>
  );
};
