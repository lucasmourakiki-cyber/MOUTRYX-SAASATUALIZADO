import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ReceiptNote, ReceiptCategory, ReimbursementStatus } from '../../types';
import { getTemporalContext } from '../../utils/temporalEngine';
import {
  Camera,
  Upload,
  Sparkles,
  Receipt,
  Fuel,
  Utensils,
  ShoppingCart,
  Wrench,
  Hotel,
  Ticket,
  FileText,
  CheckCircle2,
  Clock,
  DollarSign,
  Search,
  Plus,
  Trash2,
  Download,
  AlertCircle,
  RefreshCw,
  Eye,
  Check,
  X,
  User,
  Calendar,
  Layers,
  ChevronRight,
  Filter,
} from 'lucide-react';

export const ReceiptsView: React.FC = () => {
  const {
    receiptNotes,
    addReceiptNote,
    updateReceiptNote,
    deleteReceiptNote,
    approveReceiptReimbursement,
    markReceiptAsReimbursed,
    batchApproveReimbursements,
    scanReceiptWithAI,
    getPilotMonthlyExpenses,
    pilots,
    currentCompany,
    currentUserRole,
    activeTab: globalTab,
  } = useApp();

  // Filters & Selected State
  const temporal = useMemo(() => getTemporalContext(), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    // If there are receipt notes, check if current month has notes or fallback to most recent note month
    const currentMonth = getTemporalContext().currentMonthStr;
    return currentMonth;
  });

  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    monthsSet.add(temporal.currentMonthStr);
    monthsSet.add(temporal.previousMonthStr);
    
    // Add past 6 months dynamically
    const baseDate = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthsSet.add(mStr);
    }

    // Add any months that exist in receipt notes
    receiptNotes.forEach((n) => {
      if (n.date && n.date.length >= 7) {
        monthsSet.add(n.date.substring(0, 7));
      }
    });

    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    return Array.from(monthsSet)
      .sort((a, b) => b.localeCompare(a))
      .map((mStr) => {
        const [year, month] = mStr.split('-');
        const monthIndex = parseInt(month, 10) - 1;
        const label = `${monthNames[monthIndex] || month} / ${year}`;
        return { value: mStr, label };
      });
  }, [temporal, receiptNotes]);
  const [activeTab, setActiveTab] = useState<'pilotos' | 'todas'>(() => {
    return globalTab === 'todas' ? 'todas' : 'pilotos';
  });

  useEffect(() => {
    if (globalTab === 'todas') {
      setActiveTab('todas');
    } else if (globalTab === 'pilotos_notinhas') {
      setActiveTab('pilotos');
    }
  }, [globalTab]);
  const [selectedPilotFilter, setSelectedPilotFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal State for New Receipt / Scanner
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanConfidence, setScanConfidence] = useState<number | null>(null);
  const [needsReview, setNeedsReview] = useState<boolean>(false);
  const [reviewReasons, setReviewReasons] = useState<string[]>([]);
  const [extractedItems, setExtractedItems] = useState<{ description: string; quantity: number; unitPrice: number; totalPrice: number }[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Form State for Receipt
  const [formData, setFormData] = useState<{
    pilotId: string;
    establishmentName: string;
    cnpj: string;
    date: string;
    time: string;
    category: ReceiptCategory;
    totalAmount: number;
    paymentMethod: ReceiptNote['paymentMethod'];
    reimbursementStatus: ReimbursementStatus;
    fuelLiters: number;
    fuelPricePerL: number;
    fuelType: 'diesel_s10' | 'gasolina_comum' | 'gasolina_aditivada' | 'etanol' | 'oleo_2t' | 'outro';
    fuelVehicle: 'gerador_recarga' | 'caminhonete_apoio' | 'tanque_campo' | 'outro';
    notes: string;
    serviceOrderId: string;
  }>({
    pilotId: pilots[0]?.id || '',
    establishmentName: '',
    cnpj: '',
    date: new Date().toISOString().split('T')[0],
    time: '12:00',
    category: 'alimentacao',
    totalAmount: 0,
    paymentMethod: 'pix_piloto',
    reimbursementStatus: 'pendente',
    fuelLiters: 0,
    fuelPricePerL: 6.0,
    fuelType: 'diesel_s10',
    fuelVehicle: 'gerador_recarga',
    notes: '',
    serviceOrderId: '',
  });

  // Modal for Viewing Receipt Photo / Full Details
  const [viewingReceipt, setViewingReceipt] = useState<ReceiptNote | null>(null);

  // Video Element Ref for Web Camera
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Pilot Monthly Expense Data
  const monthlyPilotSummaries = useMemo(() => {
    return getPilotMonthlyExpenses(selectedMonth);
  }, [getPilotMonthlyExpenses, selectedMonth, receiptNotes]);

  // Total summary aggregates for this month
  const monthlyTotals = useMemo(() => {
    const totalSpent = monthlyPilotSummaries.reduce((sum, p) => sum + p.totalSpent, 0);
    const fuelSpent = monthlyPilotSummaries.reduce((sum, p) => sum + p.fuelSpent, 0);
    const fuelLiters = monthlyPilotSummaries.reduce((sum, p) => sum + p.fuelLiters, 0);
    const foodSpent = monthlyPilotSummaries.reduce((sum, p) => sum + p.foodSpent, 0);
    const marketSpent = monthlyPilotSummaries.reduce((sum, p) => sum + p.marketSpent, 0);
    const pendingReimb = monthlyPilotSummaries.reduce((sum, p) => sum + p.reimbursementPending, 0);
    const paidReimb = monthlyPilotSummaries.reduce((sum, p) => sum + p.reimbursementPaid, 0);
    const notesCount = monthlyPilotSummaries.reduce((sum, p) => sum + p.totalNotesCount, 0);

    return {
      totalSpent,
      fuelSpent,
      fuelLiters,
      foodSpent,
      marketSpent,
      pendingReimb,
      paidReimb,
      notesCount,
    };
  }, [monthlyPilotSummaries]);

  // Filtered List of Receipts
  const filteredReceipts = useMemo(() => {
    return receiptNotes.filter((note) => {
      const matchMonth = !selectedMonth || (note.date || '').startsWith(selectedMonth);
      const matchPilot = selectedPilotFilter === 'all' || note.pilotId === selectedPilotFilter;
      const matchCat = selectedCategoryFilter === 'all' || note.category === selectedCategoryFilter;
      const matchStatus = selectedStatusFilter === 'all' || note.reimbursementStatus === selectedStatusFilter;
      const matchSearch =
        !searchTerm ||
        note.establishmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.pilotName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (note.notes && note.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (note.cnpj && note.cnpj.includes(searchTerm));

      return matchMonth && matchPilot && matchCat && matchStatus && matchSearch;
    });
  }, [receiptNotes, selectedMonth, selectedPilotFilter, selectedCategoryFilter, selectedStatusFilter, searchTerm]);

  // Camera & Image Compression Helpers
  const compressImageToDataUrl = (fileOrDataUrl: File | string): Promise<string> => {
    return new Promise((resolve) => {
      if (typeof fileOrDataUrl === 'string' && (fileOrDataUrl.startsWith('http://') || fileOrDataUrl.startsWith('https://'))) {
        return resolve(fileOrDataUrl);
      }

      const processSrc = (src: string) => {
        const img = new Image();
        img.onload = () => {
          const MAX_DIM = 1280;
          let { width, height } = img;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.82);
            resolve(compressed);
          } else {
            resolve(src);
          }
        };
        img.onerror = () => resolve(src);
        img.src = src;
      };

      if (typeof fileOrDataUrl === 'string') {
        processSrc(fileOrDataUrl);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const rawResult = e.target?.result as string;
          processSrc(rawResult);
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(fileOrDataUrl);
      }
    });
  };

  // Camera Management
  const startCamera = async () => {
    setIsCameraOpen(true);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Erro ao abrir câmera:', err);
      setCameraError('Câmera indisponível no navegador. Você pode selecionar uma imagem da galeria.');
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const MAX_DIM = 1280;
    let width = videoRef.current.videoWidth || 1280;
    let height = videoRef.current.videoHeight || 720;
    if (width > MAX_DIM || height > MAX_DIM) {
      if (width > height) {
        height = Math.round((height * MAX_DIM) / width);
        width = MAX_DIM;
      } else {
        width = Math.round((width * MAX_DIM) / height);
        height = MAX_DIM;
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(videoRef.current, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      setScannedImage(dataUrl);
      stopCamera();
      processReceiptWithAI(dataUrl);
    }
  };

  // File Upload Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressedDataUrl = await compressImageToDataUrl(file);
      if (compressedDataUrl) {
        setScannedImage(compressedDataUrl);
        processReceiptWithAI(compressedDataUrl);
      }
    }
  };

  // Process Receipt with AI OCR
  const processReceiptWithAI = async (base64Image: string, testPreset?: string) => {
    if (isScanning) return;
    setIsScanning(true);
    setReviewReasons([]);
    setNeedsReview(false);
    try {
      const activePilot = pilots.find((p) => p.id === formData.pilotId) || (pilots.length > 0 ? pilots[0] : null);
      const result = await scanReceiptWithAI(base64Image, 'image/jpeg', {
        pilotHint: activePilot?.name || 'Equipe de Campo',
        notesHint: testPreset || '',
      });

      if (result && result.data) {
        const d = result.data;
        const isFuel = d.category === 'combustivel';
        setScanConfidence(d.confidenceScore || 96);
        setExtractedItems(d.items || []);
        setNeedsReview(Boolean(d.needsReview));
        setReviewReasons(d.reviewReasons || []);
        
        setFormData((prev) => ({
          ...prev,
          establishmentName: d.establishmentName || prev.establishmentName || (d.category === 'alimentacao' ? 'Restaurante & Refeições' : 'Comprovante Fiscal'),
          cnpj: d.cnpj || prev.cnpj || '',
          date: d.date || prev.date,
          time: d.time || prev.time || '12:30',
          category: d.category || 'alimentacao',
          totalAmount: d.totalAmount !== undefined ? d.totalAmount : prev.totalAmount || 0,
          paymentMethod: d.paymentMethod || prev.paymentMethod || 'pix_piloto',
          reimbursementStatus: d.reimbursementStatus || 'pendente',
          fuelLiters: isFuel && d.fuelDetails?.liters ? d.fuelDetails.liters : 0,
          fuelPricePerL: isFuel && d.fuelDetails?.pricePerLiter ? d.fuelDetails.pricePerLiter : 6.0,
          fuelType: isFuel && d.fuelDetails?.fuelType ? d.fuelDetails.fuelType : 'diesel_s10',
          fuelVehicle: isFuel && d.fuelDetails?.vehicleOrEquipment ? d.fuelDetails.vehicleOrEquipment : 'gerador_recarga',
          notes: d.notes || (d.category === 'alimentacao' ? 'Consumação / Refeição da equipe em campo.' : 'Comprovante processado por DRONE IA Vision.'),
        }));
      }
    } catch (err) {
      console.error('Erro na extração IA:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // Quick Preset Samples for 1-Click Testing
  const handleUsePresetSample = (type: 'diesel' | 'almoco' | 'mercado') => {
    let mockImg = '';
    let hint = '';
    if (type === 'diesel') {
      mockImg = 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80';
      hint = 'diesel posto gerador recarga bateria';
    } else if (type === 'almoco') {
      mockImg = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80';
      hint = 'consumacao almoço restaurante refeicao equipe campo marmita';
    } else {
      mockImg = 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600&auto=format&fit=crop&q=80';
      hint = 'supermercado agua mineral isotônico gelo mantimentos';
    }
    setScannedImage(mockImg);
    processReceiptWithAI(mockImg, hint);
  };

  const openNewReceiptModal = (initialPilotId?: string) => {
    const defaultPilotId = initialPilotId || (selectedPilotFilter !== 'all' ? selectedPilotFilter : pilots[0]?.id) || '';
    setFormData({
      pilotId: defaultPilotId,
      establishmentName: '',
      cnpj: '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      category: 'alimentacao',
      totalAmount: 0,
      paymentMethod: 'pix_piloto',
      reimbursementStatus: 'pendente',
      fuelLiters: 0,
      fuelPricePerL: 6.0,
      fuelType: 'diesel_s10',
      fuelVehicle: 'gerador_recarga',
      notes: '',
      serviceOrderId: '',
    });
    setScannedImage(null);
    setScanConfidence(null);
    setNeedsReview(false);
    setReviewReasons([]);
    setExtractedItems([]);
    setIsModalOpen(true);
  };

  // Save Scanned/Form Receipt
  const handleSaveReceipt = () => {
    if (!formData.establishmentName?.trim() || formData.totalAmount <= 0) {
      alert('Informe o estabelecimento e o valor da despesa.');
      return;
    }

    const assignedPilot = pilots.find((p) => p.id === formData.pilotId);
    const resolvedPilotId = assignedPilot ? assignedPilot.id : (pilots.length === 0 ? '' : (formData.pilotId || ''));
    const resolvedPilotName = assignedPilot
      ? assignedPilot.name
      : pilots.length === 0
      ? 'Equipe de Campo (Sem piloto associado)'
      : formData.pilotId
      ? 'Piloto'
      : 'Equipe de Campo (Sem piloto associado)';

    const notePayload: Omit<ReceiptNote, 'id' | 'createdAt'> = {
      companyId: currentCompany.id,
      pilotId: resolvedPilotId,
      pilotName: resolvedPilotName,
      establishmentName: formData.establishmentName.trim(),
      cnpj: formData.cnpj?.trim() || '',
      date: formData.date || new Date().toISOString().split('T')[0],
      time: formData.time || '12:00',
      category: formData.category,
      totalAmount: Number(formData.totalAmount) || 0,
      paymentMethod: formData.paymentMethod || 'pix_piloto',
      reimbursementStatus: formData.reimbursementStatus || 'pendente',
      imageUrl: scannedImage || undefined,
      fuelDetails:
        formData.category === 'combustivel'
          ? {
              fuelType: formData.fuelType,
              liters: Number(formData.fuelLiters) || 0,
              pricePerLiter: Number(formData.fuelPricePerL) || 0,
              vehicleOrEquipment: formData.fuelVehicle,
            }
          : undefined,
      items: extractedItems.length > 0
        ? extractedItems
        : [
            {
              description:
                formData.category === 'combustivel'
                  ? 'Abastecimento em Campo'
                  : formData.category === 'alimentacao'
                  ? 'Consumação / Refeição'
                  : 'Despesa Operacional',
              quantity: 1,
              unitPrice: Number(formData.totalAmount) || 0,
              totalPrice: Number(formData.totalAmount) || 0,
            },
          ],
      confidenceScore: scanConfidence || 96,
      notes: formData.notes?.trim() || '',
      relatedOsId: formData.serviceOrderId || undefined,
    };

    addReceiptNote(notePayload);

    // Reset Form & Close Modal
    setScannedImage(null);
    setScanConfidence(null);
    setNeedsReview(false);
    setReviewReasons([]);
    setExtractedItems([]);
    setIsModalOpen(false);
  };

  const getCategoryBadge = (cat: ReceiptCategory) => {
    switch (cat) {
      case 'combustivel':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Fuel className="w-3 h-3 text-amber-600" /> Combustível
          </span>
        );
      case 'alimentacao':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Utensils className="w-3 h-3 text-emerald-600" /> Alimentação
          </span>
        );
      case 'mercado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <ShoppingCart className="w-3 h-3 text-blue-600" /> Mercado
          </span>
        );
      case 'manutencao_pecas':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
            <Wrench className="w-3 h-3 text-purple-600" /> Peças / Oficina
          </span>
        );
      case 'hospedagem':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
            <Hotel className="w-3 h-3 text-indigo-600" /> Hospedagem
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            <FileText className="w-3 h-3" /> Outro
          </span>
        );
    }
  };

  const getStatusBadge = (status: ReimbursementStatus) => {
    switch (status) {
      case 'pendente':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> Pendente
          </span>
        );
      case 'aprovado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-3 h-3" /> Aprovado
          </span>
        );
      case 'reembolsado':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check className="w-3 h-3" /> Pago
          </span>
        );
      case 'corporativo':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            Corporativo
          </span>
        );
      default:
        return <span className="text-xs text-slate-500">{status}</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. TOP HEADER & PRIMARY ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Notinhas & Despesas</h1>
            <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800">
              OCR Inteligente
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro de abastecimento, alimentação e reembolsos de pilotos em campo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent outline-none cursor-pointer text-slate-800 font-bold"
            >
              {availableMonths.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Upload / Camera */}
          <button
            onClick={() => {
              openNewReceiptModal();
              startCamera();
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Camera className="w-4 h-4 text-amber-400" />
            <span>Tirar Foto</span>
          </button>

          {/* Add Receipt Button */}
          <button
            onClick={() => {
              openNewReceiptModal();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white text-xs font-extrabold transition-all shadow-xs cursor-pointer border border-[#05521F]/30"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Despesa</span>
          </button>
        </div>
      </div>

      {/* 2. SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Total no Mês</span>
            <Receipt className="w-4 h-4 text-slate-400" />
          </div>
          <p className="mt-2 text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            R$ {monthlyTotals.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">{monthlyTotals.notesCount} comprovantes lançados</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-600 font-semibold">
            <span>Combustível (Geradores)</span>
            <Fuel className="w-4 h-4 text-amber-500" />
          </div>
          <p className="mt-2 text-xl sm:text-2xl font-black text-amber-900 tracking-tight">
            R$ {monthlyTotals.fuelSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-[11px] text-amber-700 font-semibold">{monthlyTotals.fuelLiters.toFixed(1)} Litros (Diesel)</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-600 font-semibold">
            <span>Alimentação & Apoio</span>
            <Utensils className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-xl sm:text-2xl font-black text-emerald-900 tracking-tight">
            R$ {(monthlyTotals.foodSpent + monthlyTotals.marketSpent).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Refeições, água e compras</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-purple-600 font-semibold">
              <span>Reembolso Pendente</span>
              <Clock className="w-4 h-4 text-purple-500" />
            </div>
            <p className="mt-2 text-xl sm:text-2xl font-black text-purple-900 tracking-tight">
              R$ {monthlyTotals.pendingReimb.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          {monthlyTotals.pendingReimb > 0 && currentUserRole !== 'piloto' && (
            <button
              onClick={() => batchApproveReimbursements(undefined, selectedMonth)}
              className="mt-2 text-left text-[11px] font-bold text-purple-700 hover:text-purple-900 hover:underline"
            >
              Aprovar todos os reembolsos →
            </button>
          )}
        </div>
      </div>

      {/* 3. TABS: PILOTOS & EXTRATO GERAL */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 pt-3">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('pilotos')}
              className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'pilotos'
                  ? 'border-[#05521F] text-[#05521F]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Por Piloto ({monthlyPilotSummaries.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('todas')}
              className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'todas'
                  ? 'border-[#05521F] text-[#05521F]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Extrato Completo ({filteredReceipts.length})</span>
            </button>
          </div>

          {activeTab === 'pilotos' && (
            <button
              onClick={() => {
                const csvContent =
                  'Piloto,Total Gasto (R$),Combustivel (R$),Litros,Alimentacao (R$),Mercado (R$),Pendente Reembolso (R$)\n' +
                  monthlyPilotSummaries
                    .map(
                      (p) =>
                        `"${p.pilotName}",${p.totalSpent},${p.fuelSpent},${p.fuelLiters},${p.foodSpent},${p.marketSpent},${p.reimbursementPending}`
                    )
                    .join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `relatorio_despesas_pilotos_${selectedMonth}.csv`;
                link.click();
              }}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
          )}
        </div>

        {/* TAB 1: PILOT REPORTS */}
        {activeTab === 'pilotos' && (
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {monthlyPilotSummaries.map((pilotSum) => {
                const pilotObj = pilots.find((p) => p.id === pilotSum.pilotId);
                const pilotNotes = receiptNotes.filter(
                  (n) => (n.pilotId === pilotSum.pilotId || n.pilotName.includes(pilotSum.pilotName)) && n.date.startsWith(selectedMonth)
                );

                return (
                  <div
                    key={pilotSum.pilotId}
                    className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4.5 flex flex-col justify-between hover:border-slate-300 transition-all"
                  >
                    <div>
                      {/* Pilot Info Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xs">
                            {pilotSum.pilotName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-extrabold text-xs text-slate-900">{pilotSum.pilotName}</p>
                            <p className="text-[10px] text-slate-500">{pilotObj?.licenseCAAR || 'Piloto'} • {pilotSum.totalNotesCount} despesas</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Total</span>
                          <span className="text-sm font-black text-slate-900">
                            R$ {pilotSum.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Itemized Categories */}
                      <div className="mt-3 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-100">
                          <span className="text-amber-900 font-medium flex items-center gap-1">
                            <Fuel className="w-3.5 h-3.5 text-amber-600" /> Combustível:
                          </span>
                          <span className="font-bold text-amber-950">
                            R$ {pilotSum.fuelSpent.toFixed(2)} ({pilotSum.fuelLiters.toFixed(1)} L)
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                          <span className="text-emerald-900 font-medium flex items-center gap-1">
                            <Utensils className="w-3.5 h-3.5 text-emerald-600" /> Alimentação & Mercado:
                          </span>
                          <span className="font-bold text-emerald-950">
                            R$ {(pilotSum.foodSpent + pilotSum.marketSpent).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Reimbursement Stats */}
                      <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs">
                        <span className="text-slate-500">
                          A Reembolsar: <strong className="text-amber-700 font-bold">R$ {pilotSum.reimbursementPending.toFixed(2)}</strong>
                        </span>
                        <span className="text-emerald-700 font-bold text-[11px]">
                          {pilotSum.reimbursementPaid > 0 ? `R$ ${pilotSum.reimbursementPaid.toFixed(2)} pago` : 'Zero pago'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedPilotFilter(pilotSum.pilotId);
                          setActiveTab('todas');
                        }}
                        className="flex-1 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 text-center transition-colors"
                      >
                        Ver Notinhas
                      </button>

                      {pilotSum.reimbursementPending > 0 && currentUserRole !== 'piloto' && (
                        <button
                          onClick={() => batchApproveReimbursements(pilotSum.pilotId, selectedMonth)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition-colors"
                        >
                          Aprovar R$ {pilotSum.reimbursementPending.toFixed(0)}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: ALL RECEIPTS TABLE */}
        {activeTab === 'todas' && (
          <div className="p-5 space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por posto, piloto ou CNPJ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 outline-none"
                  />
                </div>

                {/* Pilot Filter */}
                <select
                  value={selectedPilotFilter}
                  onChange={(e) => setSelectedPilotFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="all">Todos os Pilotos</option>
                  {pilots.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                {/* Category Filter */}
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="all">Todas as Categorias</option>
                  <option value="combustivel">Combustível</option>
                  <option value="alimentacao">Alimentação</option>
                  <option value="mercado">Mercado / Gelo</option>
                  <option value="manutencao_pecas">Peças & Oficina</option>
                  <option value="hospedagem">Hospedagem</option>
                  <option value="outro">Outros</option>
                </select>

                {/* Status Filter */}
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="all">Todos os Status</option>
                  <option value="pendente">Pendente</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="reembolsado">Pago / Reembolsado</option>
                  <option value="corporativo">Corporativo</option>
                </select>
              </div>

              <span className="text-xs text-slate-500 font-semibold">
                {filteredReceipts.length} itens
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3.5">Foto</th>
                    <th className="py-3 px-3.5">Data / Piloto</th>
                    <th className="py-3 px-3.5">Estabelecimento</th>
                    <th className="py-3 px-3.5">Categoria</th>
                    <th className="py-3 px-3.5">Detalhes</th>
                    <th className="py-3 px-3.5 text-right">Valor</th>
                    <th className="py-3 px-3.5 text-center">Status</th>
                    <th className="py-3 px-3.5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReceipts.map((note) => (
                    <tr key={note.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Photo Thumbnail */}
                      <td className="py-2.5 px-3.5">
                        <div
                          onClick={() => setViewingReceipt(note)}
                          className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer relative group flex items-center justify-center"
                        >
                          {note.imageUrl ? (
                            <img
                              src={note.imageUrl}
                              alt={note.establishmentName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Receipt className="w-4 h-4 text-slate-400" />
                          )}
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                            <Eye className="w-3 h-3" />
                          </div>
                        </div>
                      </td>

                      {/* Date & Pilot */}
                      <td className="py-2.5 px-3.5">
                        <span className="font-bold text-slate-900 block">{note.date}</span>
                        <span className="text-[11px] text-slate-500">{note.pilotName}</span>
                      </td>

                      {/* Establishment */}
                      <td className="py-2.5 px-3.5">
                        <p className="font-bold text-slate-900 truncate max-w-[180px]">{note.establishmentName}</p>
                        <p className="text-[10px] text-slate-400">{note.cnpj || 'Cupom Fiscal'}</p>
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3.5">{getCategoryBadge(note.category)}</td>

                      {/* Details / Fuel */}
                      <td className="py-2.5 px-3.5">
                        {note.fuelDetails ? (
                          <span className="text-amber-900 font-bold">
                            {note.fuelDetails.liters}L ({note.fuelDetails.fuelType.replace('_', ' ').toUpperCase()})
                          </span>
                        ) : (
                          <span className="text-slate-600 truncate max-w-[160px] block">{note.notes || '-'}</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-2.5 px-3.5 text-right font-black text-slate-900">
                        R$ {note.totalAmount.toFixed(2)}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3.5 text-center">{getStatusBadge(note.reimbursementStatus)}</td>

                      {/* Actions */}
                      <td className="py-2.5 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {note.reimbursementStatus === 'pendente' && currentUserRole !== 'piloto' && (
                            <button
                              onClick={() => approveReceiptReimbursement(note.id)}
                              title="Aprovar Reembolso"
                              className="p-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {note.reimbursementStatus === 'aprovado' && currentUserRole !== 'piloto' && (
                            <button
                              onClick={() => markReceiptAsReimbursed(note.id)}
                              title="Marcar como Liquidado"
                              className="p-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => setViewingReceipt(note)}
                            title="Ver Detalhes"
                            className="p-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => deleteReceiptNote(note.id)}
                            title="Excluir"
                            className="p-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredReceipts.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Nenhum comprovante encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 4. MODAL: NOVA NOTINHA & SCANNER IA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-sm">Lançar Notinha com IA OCR</span>
              </div>
              <button
                onClick={() => {
                  stopCamera();
                  setIsModalOpen(false);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Top Upload / Camera / Sample Row */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                {/* Image Capture Box */}
                <div className="sm:col-span-5 flex flex-col">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 aspect-[4/3] relative overflow-hidden flex items-center justify-center">
                    {isCameraOpen ? (
                      <div className="w-full h-full relative">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                        <button
                          onClick={capturePhoto}
                          className="absolute bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-amber-500 text-slate-950 font-bold text-xs shadow-md"
                        >
                          Capturar
                        </button>
                      </div>
                    ) : scannedImage ? (
                      <div className="w-full h-full relative">
                        <img src={scannedImage} alt="Comprovante" className="w-full h-full object-contain bg-slate-900" />
                        {isScanning && (
                          <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center text-white gap-2 p-2">
                            <RefreshCw className="w-6 h-6 text-amber-400 animate-spin" />
                            <span className="text-xs font-bold">Lendo Cupom Fiscal com IA...</span>
                          </div>
                        )}
                        <button
                          onClick={() => setScannedImage(null)}
                          className="absolute top-2 right-2 p-1 rounded-full bg-slate-900/80 text-white hover:bg-red-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center p-3">
                        <Camera className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                        <span className="text-xs font-semibold text-slate-600 block">Fotografe ou envie a notinha</span>
                        <div className="flex gap-2 justify-center mt-2">
                          <button
                            onClick={startCamera}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold"
                          >
                            Câmera
                          </button>
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
                          >
                            Galeria
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  {/* 1-Click Samples */}
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <span>Amostras de Teste:</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUsePresetSample('diesel')}
                        className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold"
                      >
                        Diesel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUsePresetSample('almoco')}
                        className="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold"
                      >
                        Almoço
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUsePresetSample('mercado')}
                        className="px-2 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold"
                      >
                        Mercado
                      </button>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="sm:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Piloto *</label>
                    <select
                      value={formData.pilotId}
                      onChange={(e) => setFormData({ ...formData, pilotId: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-semibold text-slate-900 outline-none"
                    >
                      {pilots.length === 0 ? (
                        <option value="">Equipe de Campo (Sem piloto associado)</option>
                      ) : (
                        <>
                          {pilots.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                          <option value="">Equipe de Campo (Sem piloto associado)</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Data *</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-semibold text-slate-900 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 block mb-1">Estabelecimento / Posto *</label>
                    <input
                      type="text"
                      placeholder="Ex: Posto Ipiranga Rota da Soja"
                      value={formData.establishmentName}
                      onChange={(e) => setFormData({ ...formData, establishmentName: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-semibold text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Categoria *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => {
                        const newCat = e.target.value as ReceiptCategory;
                        setFormData({
                          ...formData,
                          category: newCat,
                          fuelLiters: newCat === 'combustivel' ? (formData.fuelLiters || 40) : 0,
                        });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-semibold text-slate-900 outline-none"
                    >
                      <option value="alimentacao">🍽️ Alimentação / Consumação</option>
                      <option value="combustivel">⛽ Combustível (Gerador)</option>
                      <option value="mercado">🛒 Mercado & Gelo</option>
                      <option value="manutencao_pecas">🔧 Peças & Oficina</option>
                      <option value="hospedagem">🏨 Hospedagem</option>
                      <option value="outro">📄 Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Valor Total (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.totalAmount || ''}
                      onChange={(e) => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-black text-slate-900 outline-none"
                    />
                  </div>

                  {/* Human Review Attention Banner */}
                  {reviewReasons.length > 0 && (
                    <div className="sm:col-span-2 p-2.5 rounded-xl bg-amber-50/90 border border-amber-300/80 text-amber-950">
                      <span className="text-[11px] font-bold flex items-center gap-1.5 text-amber-900">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        Conferência Recomendada pela IA:
                      </span>
                      <ul className="mt-1 space-y-0.5 text-[11px] text-amber-900 list-disc list-inside">
                        {reviewReasons.map((reason, rIdx) => (
                          <li key={rIdx} className="leading-snug">{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Extracted Items Breakdown Preview */}
                  {extractedItems.length > 0 && (
                    <div className="sm:col-span-2 p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Itens Detectados no Cupom ({extractedItems.length}):
                        </span>
                        {scanConfidence && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-200/70 text-emerald-800 font-bold">
                            IA: {scanConfidence}% precisão
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                        {extractedItems.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[11px] text-emerald-950 bg-white/70 px-2 py-0.5 rounded border border-emerald-100">
                            <span className="truncate max-w-[200px] font-medium">{item.quantity}x {item.description}</span>
                            <span className="font-bold text-emerald-900">R$ {item.totalPrice.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.category === 'combustivel' && (
                    <div className="sm:col-span-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-amber-800 block">Litros</span>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.fuelLiters || ''}
                          onChange={(e) => {
                            const l = parseFloat(e.target.value) || 0;
                            setFormData({
                              ...formData,
                              fuelLiters: l,
                              totalAmount: Math.round(l * formData.fuelPricePerL * 100) / 100,
                            });
                          }}
                          className="w-20 px-2 py-1 rounded bg-white border border-amber-300 text-xs font-bold text-amber-950"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-amber-800 block">R$ / Litro</span>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.fuelPricePerL || ''}
                          onChange={(e) => {
                            const p = parseFloat(e.target.value) || 0;
                            setFormData({
                              ...formData,
                              fuelPricePerL: p,
                              totalAmount: Math.round(formData.fuelLiters * p * 100) / 100,
                            });
                          }}
                          className="w-20 px-2 py-1 rounded bg-white border border-amber-300 text-xs font-bold text-amber-950"
                        />
                      </div>

                      <div className="flex-1">
                        <span className="text-[10px] font-bold text-amber-800 block">Tipo</span>
                        <select
                          value={formData.fuelType}
                          onChange={(e) => setFormData({ ...formData, fuelType: e.target.value as 'diesel_s10' | 'gasolina_comum' | 'gasolina_aditivada' | 'etanol' | 'oleo_2t' | 'outro' })}
                          className="w-full px-2 py-1 rounded bg-white border border-amber-300 text-xs font-bold text-amber-950"
                        >
                          <option value="diesel_s10">Diesel S-10 (Gerador)</option>
                          <option value="gasolina_comum">Gasolina Comum</option>
                          <option value="etanol">Etanol</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Pagamento</label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as 'cartao_corporativo' | 'dinheiro_piloto' | 'pix_piloto' | 'cartao_pessoal_piloto' | 'faturado_empresa' | 'outro' })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-semibold text-slate-900 outline-none"
                    >
                      <option value="dinheiro_piloto">💵 Dinheiro Piloto (Reembolsar)</option>
                      <option value="pix_piloto">⚡ PIX Piloto (Reembolsar)</option>
                      <option value="cartao_corporativo">💳 Cartão Corporativo</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Situação</label>
                    <select
                      value={formData.reimbursementStatus}
                      onChange={(e) => setFormData({ ...formData, reimbursementStatus: e.target.value as ReimbursementStatus })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-semibold text-slate-900 outline-none"
                    >
                      <option value="pendente">⏳ Pendente</option>
                      <option value="aprovado">✅ Aprovado</option>
                      <option value="reembolsado">💰 Liquidado / Pago</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setIsModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveReceipt}
                className="px-5 py-2 rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer border border-[#05521F]/30"
              >
                <Check className="w-4 h-4" /> Salvar Despesa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: DETALHES DO COMPROVANTE */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-xs">{viewingReceipt.establishmentName}</span>
              </div>
              <button onClick={() => setViewingReceipt(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl overflow-hidden bg-slate-100 aspect-[3/4] flex items-center justify-center border border-slate-200">
                {viewingReceipt.imageUrl ? (
                  <img src={viewingReceipt.imageUrl} alt="Notinha" className="w-full h-full object-contain" />
                ) : (
                  <Receipt className="w-10 h-10 text-slate-300" />
                )}
              </div>

              <div className="space-y-2.5">
                <div>
                  <span className="text-[10px] text-slate-400 block">Piloto</span>
                  <span className="font-bold text-slate-900 text-sm">{viewingReceipt.pilotName}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Data</span>
                  <span className="font-semibold text-slate-800">{viewingReceipt.date}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Categoria</span>
                  <div className="mt-0.5">{getCategoryBadge(viewingReceipt.category)}</div>
                </div>

                {viewingReceipt.fuelDetails && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 text-[11px]">
                    <strong>{viewingReceipt.fuelDetails.liters} Litros</strong> de {viewingReceipt.fuelDetails.fuelType.replace('_', ' ').toUpperCase()} (R$ {viewingReceipt.fuelDetails.pricePerLiter.toFixed(2)}/L)
                  </div>
                )}

                <div>
                  <span className="text-[10px] text-slate-400 block">Valor Total</span>
                  <span className="text-lg font-black text-slate-900">
                    R$ {viewingReceipt.totalAmount.toFixed(2)}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Status</span>
                  <div className="mt-0.5">{getStatusBadge(viewingReceipt.reimbursementStatus)}</div>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  deleteReceiptNote(viewingReceipt.id);
                  setViewingReceipt(null);
                }}
                className="text-red-600 text-xs font-bold flex items-center gap-1 hover:underline"
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir
              </button>

              <div className="flex gap-2">
                {viewingReceipt.reimbursementStatus === 'pendente' && currentUserRole !== 'piloto' && (
                  <button
                    onClick={() => {
                      approveReceiptReimbursement(viewingReceipt.id);
                      setViewingReceipt({ ...viewingReceipt, reimbursementStatus: 'aprovado' });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                  >
                    Aprovar
                  </button>
                )}

                {viewingReceipt.reimbursementStatus === 'aprovado' && currentUserRole !== 'piloto' && (
                  <button
                    onClick={() => {
                      markReceiptAsReimbursed(viewingReceipt.id);
                      setViewingReceipt({ ...viewingReceipt, reimbursementStatus: 'reembolsado' });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                  >
                    Marcar como Pago
                  </button>
                )}

                <button
                  onClick={() => setViewingReceipt(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
