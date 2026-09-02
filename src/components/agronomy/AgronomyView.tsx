import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { FitossanitarioProduct, ProductClass } from '../../types';
import {
  FlaskConical,
  Search,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Plane,
  Sprout,
  Info,
  Layers,
  FileCheck,
  Plus,
  X,
  Edit,
  Power,
  AlertCircle,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const AgronomyView: React.FC = () => {
  const { products, crops, addProduct, updateProduct, toggleProductStatus, activeTab: globalTab } = useApp();

  const [activeTab, setActiveTab] = useState<'defensivos' | 'culturas'>(() => {
    return globalTab === 'culturas' ? 'culturas' : 'defensivos';
  });

  React.useEffect(() => {
    if (globalTab === 'culturas') setActiveTab('culturas');
    else if (globalTab === 'defensivos' || globalTab === 'culturas_produtos') setActiveTab('defensivos');
  }, [globalTab]);

  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'ativo' | 'inativo'>('all');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<FitossanitarioProduct | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form State
  const [commercialName, setCommercialName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [activeIngredient, setActiveIngredient] = useState('');
  const [productClass, setProductClass] = useState<ProductClass>('Fungicida');
  const [unit, setUnit] = useState<'L' | 'kg' | 'mL' | 'g'>('L');
  const [formulation, setFormulation] = useState('SC (Suspensão Concentrada)');
  const [mapaRegistration, setMapaRegistration] = useState('');
  const [chemicalGroup, setChemicalGroup] = useState('');
  const [toxicologicalClass, setToxicologicalClass] = useState('IV - Pouco Tóxico');
  const [environmentalClass, setEnvironmentalClass] = useState('III - Perigoso');
  const [authorizedCropsInput, setAuthorizedCropsInput] = useState('Soja, Milho, Algodão');
  const [targetPestsInput, setTargetPestsInput] = useState('Ferrugem-asiática, Mancha-alvo');
  const [recommendedDoseRange, setRecommendedDoseRange] = useState('0.4 a 0.6 L/ha');
  const [defaultVolumeCalda, setDefaultVolumeCalda] = useState(10);
  const [safetyIntervalDays, setSafetyIntervalDays] = useState(14);
  const [droneApplicationRecommended, setDroneApplicationRecommended] = useState(true);
  const [notes, setNotes] = useState('');

  const openAddModal = () => {
    setEditingProduct(null);
    setCommercialName('');
    setManufacturer('');
    setActiveIngredient('');
    setProductClass('Fungicida');
    setUnit('L');
    setFormulation('SC (Suspensão Concentrada)');
    setMapaRegistration('');
    setChemicalGroup('');
    setToxicologicalClass('IV - Pouco Tóxico');
    setEnvironmentalClass('III - Perigoso');
    setAuthorizedCropsInput('Soja, Milho, Algodão');
    setTargetPestsInput('Ferrugem-asiática, Mancha-alvo');
    setRecommendedDoseRange('0.4 a 0.6 L/ha');
    setDefaultVolumeCalda(10);
    setSafetyIntervalDays(14);
    setDroneApplicationRecommended(true);
    setNotes('');
    setValidationError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: FitossanitarioProduct) => {
    setEditingProduct(product);
    setCommercialName(product.commercialName);
    setManufacturer(product.manufacturer || '');
    setActiveIngredient(product.activeIngredient || '');
    setProductClass(product.productClass || 'Fungicida');
    setUnit((product.unit as 'L' | 'kg' | 'mL' | 'g') || 'L');
    setFormulation(product.formulation || 'SC (Suspensão Concentrada)');
    setMapaRegistration(product.mapaRegistration || '');
    setChemicalGroup(product.chemicalGroup || '');
    setToxicologicalClass(product.toxicologicalClass || 'IV - Pouco Tóxico');
    setEnvironmentalClass(product.environmentalClass || 'III - Perigoso');
    setAuthorizedCropsInput(Array.isArray(product.authorizedCrops) ? product.authorizedCrops.join(', ') : 'Soja, Milho');
    setTargetPestsInput(Array.isArray(product.targetPests) ? product.targetPests.join(', ') : 'Pragas Gerais');
    setRecommendedDoseRange(product.recommendedDoseRange || '0.5 L/ha');
    setDefaultVolumeCalda(product.defaultVolumeCaldaLPerHa || 10);
    setSafetyIntervalDays(product.safetyIntervalDays || 14);
    setDroneApplicationRecommended(product.droneApplicationRecommended !== false);
    setNotes(product.notes || '');
    setValidationError(null);
    setIsModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const cleanName = commercialName.trim();
    if (!cleanName) {
      setValidationError('O Nome Comercial do produto é obrigatório.');
      return;
    }

    // Check for duplicate names (case-insensitive)
    const isDuplicate = products.some(
      (p) =>
        p.commercialName.trim().toLowerCase() === cleanName.toLowerCase() &&
        (!editingProduct || p.id !== editingProduct.id)
    );

    if (isDuplicate) {
      setValidationError(`Já existe um produto cadastrado com o nome "${cleanName}". Escolha um nome exclusivo.`);
      return;
    }

    const authorizedCrops = authorizedCropsInput
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const targetPests = targetPestsInput
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        commercialName: cleanName,
        manufacturer: manufacturer.trim() || 'Fabricante Nacional',
        activeIngredient: activeIngredient.trim() || 'Ingrediente Ativo Registrado',
        productClass,
        unit,
        formulation: formulation.trim() || 'SC',
        mapaRegistration: mapaRegistration.trim() || editingProduct.mapaRegistration || '000000',
        chemicalGroup: chemicalGroup.trim() || undefined,
        toxicologicalClass,
        environmentalClass,
        authorizedCrops: authorizedCrops.length > 0 ? authorizedCrops : ['Geral'],
        targetPests: targetPests.length > 0 ? targetPests : ['Geral'],
        recommendedDoseRange: recommendedDoseRange.trim() || 'Conforme receituário',
        defaultVolumeCaldaLPerHa: defaultVolumeCalda || 10,
        safetyIntervalDays: Number(safetyIntervalDays) || 14,
        droneApplicationRecommended,
        notes: notes.trim(),
      });
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
    } else {
      addProduct({
        commercialName: cleanName,
        manufacturer: manufacturer.trim() || 'Fabricante Nacional',
        activeIngredient: activeIngredient.trim() || 'Ingrediente Ativo Registrado',
        productClass,
        unit,
        formulation: formulation.trim() || 'SC',
        mapaRegistration: mapaRegistration.trim() || `MAPA-${Math.floor(1000 + Math.random() * 9000)}/26`,
        chemicalGroup: chemicalGroup.trim() || undefined,
        toxicologicalClass,
        environmentalClass,
        authorizedCrops: authorizedCrops.length > 0 ? authorizedCrops : ['Soja', 'Milho'],
        targetPests: targetPests.length > 0 ? targetPests : ['Pragas Gerais'],
        recommendedDoseRange: recommendedDoseRange.trim() || '0.5 L/ha',
        defaultVolumeCaldaLPerHa: defaultVolumeCalda || 10,
        safetyIntervalDays: Number(safetyIntervalDays) || 14,
        droneApplicationRecommended,
        officialSource: 'Cadastro Manual',
        status: 'ativo',
        notes: notes.trim() || 'Cadastrado manualmente no catálogo da empresa.',
      });
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
    }

    setIsModalOpen(false);
  };

  const filteredProducts = products.filter((p) => {
    if (filterClass !== 'all' && p.productClass !== filterClass) return false;
    if (filterStatus === 'ativo' && p.status === 'inativo') return false;
    if (filterStatus === 'inativo' && p.status !== 'inativo') return false;
    if (
      search &&
      !p.commercialName?.toLowerCase().includes(search.toLowerCase()) &&
      !p.activeIngredient?.toLowerCase().includes(search.toLowerCase()) &&
      !p.manufacturer?.toLowerCase().includes(search.toLowerCase()) &&
      !p.mapaRegistration?.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-[#05521F]" />
            <h1 className="text-xl sm:text-2xl font-black text-[#111827]">
              Culturas & Produtos Fitossanitários
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Catálogo agronômico, base oficial AGROFIT/MAPA, cadastro manual e dosagens para Ordens de Serviço
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white px-4 py-2 text-xs font-bold transition-colors shadow-md cursor-pointer border border-[#05521F]/30"
          >
            <Plus className="h-4 w-4" /> Adicionar Produto
          </button>
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-2 rounded-xl">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> AGROFIT 2026
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('defensivos')}
          className={`pb-3 text-xs font-bold transition-colors border-b-2 cursor-pointer ${
            activeTab === 'defensivos' ? 'border-[#05521F] text-[#05521F]' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Produtos & Agroquímicos ({products.length})
        </button>

        <button
          onClick={() => setActiveTab('culturas')}
          className={`pb-3 text-xs font-bold transition-colors border-b-2 cursor-pointer ${
            activeTab === 'culturas' ? 'border-[#05521F] text-[#05521F]' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Culturas Agrícolas ({crops.length})
        </button>
      </div>

      {/* TAB 1: DEFENSIVOS (AGROFIT & MANUAL) */}
      {activeTab === 'defensivos' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por produto comercial, princípio ativo, fabricante, MAPA..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#05521F]"
                />
              </div>

              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="all">Todas as Classes</option>
                <option value="Fungicida">Fungicidas</option>
                <option value="Herbicida">Herbicidas</option>
                <option value="Inseticida">Inseticidas</option>
                <option value="Biológico">Biológicos</option>
                <option value="Adjuvante">Adjuvantes</option>
                <option value="Fertilizante Foliar">Fertilizantes Foliares</option>
                <option value="Regulador de Crescimento">Reguladores de Crescimento</option>
                <option value="Outro">Outros</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'ativo' | 'inativo')}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="all">Todos os Status</option>
                <option value="ativo">Apenas Ativos</option>
                <option value="inativo">Apenas Inativos</option>
              </select>
            </div>

            <span className="text-xs text-slate-500 font-semibold">{filteredProducts.length} produtos exibidos</span>
          </div>

          {/* Products Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
                <FlaskConical className="h-10 w-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">Nenhum produto encontrado</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Ajuste os filtros de busca ou clique em "+ Adicionar Produto" para registrar um novo defensivo.
                </p>
                <button
                  onClick={openAddModal}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white px-4 py-2 text-xs font-bold transition-colors shadow-sm cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Adicionar Produto
                </button>
              </div>
            ) : (
              filteredProducts.map((p) => (
                <div
                  key={p.id}
                  className={`rounded-2xl border bg-white p-5 shadow-xs transition-all space-y-3 ${
                    p.status === 'inativo' ? 'border-slate-300 opacity-60 bg-slate-50/50' : 'border-slate-200 hover:border-[#05521F]/50'
                  }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">
                          {p.productClass?.toUpperCase() || 'DEFENSIVO'}
                        </span>
                        {p.mapaRegistration && (
                          <span className="bg-emerald-50 text-[#05521F] text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-100">
                            MAPA: {p.mapaRegistration}
                          </span>
                        )}
                        <span className="text-[10px] font-medium text-slate-500">
                          {p.manufacturer}
                        </span>
                      </div>
                      
                      <h3 className="font-black text-base text-[#111827] mt-1.5 flex items-center gap-2">
                        {p.commercialName}
                        {p.status === 'inativo' && (
                          <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                            Inativo
                          </span>
                        )}
                      </h3>
                      <p className="text-xs font-semibold text-[#05521F] mt-0.5">
                        I.A.: {p.activeIngredient || 'Não informado'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => openEditModal(p)}
                        title="Editar produto"
                        className="p-1.5 text-slate-500 hover:text-[#05521F] hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleProductStatus(p.id)}
                        title={p.status === 'inativo' ? 'Ativar produto' : 'Desativar produto'}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          p.status === 'inativo'
                            ? 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            : 'text-emerald-600 hover:text-rose-600 hover:bg-rose-50'
                        }`}
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 text-[9px] font-bold uppercase block">Dose Sugerida</span>
                      <span className="font-extrabold text-[#05521F] mt-0.5 block truncate">
                        {p.recommendedDoseRange || `0.5 ${p.unit || 'L'}/ha`}
                      </span>
                    </div>

                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 text-[9px] font-bold uppercase block">Volume Drone</span>
                      <span className="font-bold text-slate-800 mt-0.5 block">
                        {p.defaultVolumeCaldaLPerHa || 10} L/ha
                      </span>
                    </div>

                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 text-[9px] font-bold uppercase block">Carência</span>
                      <span className="font-bold text-slate-800 mt-0.5 block">
                        {p.safetyIntervalDays || 14} dias
                      </span>
                    </div>

                    <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 text-[9px] font-bold uppercase block">Unidade</span>
                      <span className="font-bold text-slate-800 mt-0.5 block">
                        {p.unit || 'L'}
                      </span>
                    </div>
                  </div>

                  {/* Authorized Crops & Target Pests */}
                  <div className="text-xs space-y-1.5 pt-2 border-t border-slate-100">
                    {p.authorizedCrops && p.authorizedCrops.length > 0 && (
                      <p className="text-slate-600">
                        <strong className="text-slate-800 font-bold">Culturas:</strong> {p.authorizedCrops.join(', ')}
                      </p>
                    )}
                    {p.targetPests && p.targetPests.length > 0 && (
                      <p className="text-slate-600">
                        <strong className="text-slate-800 font-bold">Alvos / Pragas:</strong> {p.targetPests.join(', ')}
                      </p>
                    )}
                    {p.notes && (
                      <p className="text-slate-500 text-[11px] italic bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                        {p.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CULTURAS */}
      {activeTab === 'culturas' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {crops.map((c) => (
            <div key={c.id} className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black text-base text-[#111827]">{c.name}</h3>
                  <p className="text-xs text-slate-500">Ciclo padrão: {c.standardCycleDays} dias</p>
                </div>
                <span className="bg-emerald-100 text-[#05521F] text-xs font-bold px-2 py-0.5 rounded">
                  {c.category}
                </span>
              </div>

              <div className="text-xs text-slate-600 pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-700 block mb-1">Pragas Comuns:</span>
                <div className="flex flex-wrap gap-1">
                  {c.commonPests.map((p, idx) => (
                    <span key={idx} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] border">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: CADASTRO / EDIÇÃO DE PRODUTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white p-6 shadow-2xl overflow-y-auto space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-[#05521F] font-black text-base">
                <FlaskConical className="h-5 w-5" />
                {editingProduct ? 'Editar Produto Fitossanitário' : 'Cadastrar Novo Produto Fitossanitário'}
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {validationError && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nome Comercial <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Fox Xpro, Priori Top, Premio..."
                    value={commercialName}
                    onChange={(e) => {
                      setCommercialName(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    className="w-full rounded-xl border border-slate-300 p-2.5 font-semibold text-slate-800 focus:outline-hidden focus:border-[#05521F]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fabricante / Registrante</label>
                  <input
                    type="text"
                    placeholder="Ex: Bayer, Syngenta, FMC, Corteva, BASF..."
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 font-semibold text-slate-800 focus:outline-hidden focus:border-[#05521F]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Princípio Ativo (I.A.)</label>
                  <input
                    type="text"
                    placeholder="Ex: Trifloxistrobina + Protioconazol"
                    value={activeIngredient}
                    onChange={(e) => setActiveIngredient(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 font-semibold text-slate-800 focus:outline-hidden focus:border-[#05521F]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Classe do Produto</label>
                  <select
                    value={productClass}
                    onChange={(e) => setProductClass(e.target.value as ProductClass)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 font-semibold text-slate-800 focus:outline-hidden focus:border-[#05521F]"
                  >
                    <option value="Fungicida">Fungicida</option>
                    <option value="Herbicida">Herbicida</option>
                    <option value="Inseticida">Inseticida</option>
                    <option value="Biológico">Biológico</option>
                    <option value="Adjuvante">Adjuvante</option>
                    <option value="Fertilizante Foliar">Fertilizante Foliar</option>
                    <option value="Regulador de Crescimento">Regulador de Crescimento</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Unidade de Medida</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as 'L' | 'mL' | 'kg' | 'g')}
                    className="w-full rounded-xl border border-slate-300 p-2.5 font-semibold text-slate-800 focus:outline-hidden focus:border-[#05521F]"
                  >
                    <option value="L">Litros (L)</option>
                    <option value="mL">Mililitros (mL)</option>
                    <option value="kg">Quilos (kg)</option>
                    <option value="g">Gramas (g)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nº Registro MAPA</label>
                  <input
                    type="text"
                    placeholder="Ex: 012218 (MAPA)"
                    value={mapaRegistration}
                    onChange={(e) => setMapaRegistration(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 font-semibold text-slate-800 focus:outline-hidden focus:border-[#05521F]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Formulação</label>
                  <input
                    type="text"
                    placeholder="Ex: SC, EC, WG, SL..."
                    value={formulation}
                    onChange={(e) => setFormulation(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 font-semibold text-slate-800 focus:outline-hidden focus:border-[#05521F]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Dose Recomendada</label>
                  <input
                    type="text"
                    placeholder="Ex: 0.4 a 0.5 L/ha"
                    value={recommendedDoseRange}
                    onChange={(e) => setRecommendedDoseRange(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 font-semibold text-slate-800 focus:outline-hidden focus:border-[#05521F]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Volume Calda Drone (L/ha)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={defaultVolumeCalda}
                    onChange={(e) => setDefaultVolumeCalda(Number(e.target.value) || 10)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 font-semibold text-slate-800 focus:outline-hidden focus:border-[#05521F]"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Intervalo de Segurança (Carência em dias)</label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={safetyIntervalDays}
                    onChange={(e) => setSafetyIntervalDays(Number(e.target.value) || 0)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 font-semibold text-slate-800 focus:outline-hidden focus:border-[#05521F]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Culturas Autorizadas (separadas por vírgula)</label>
                <input
                  type="text"
                  placeholder="Ex: Soja, Milho, Algodão, Cana-de-Açúcar"
                  value={authorizedCropsInput}
                  onChange={(e) => setAuthorizedCropsInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-semibold text-slate-800 focus:outline-hidden focus:border-[#05521F]"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Alvos / Pragas Controladas (separados por vírgula)</label>
                <input
                  type="text"
                  placeholder="Ex: Ferrugem Asiática, Mancha Alvo, Helicoverpa, Lagarta do Cartucho"
                  value={targetPestsInput}
                  onChange={(e) => setTargetPestsInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-semibold text-slate-800 focus:outline-hidden focus:border-[#05521F]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Classificação Toxicológica</label>
                  <select
                    value={toxicologicalClass}
                    onChange={(e) => setToxicologicalClass(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 font-semibold text-slate-800 focus:outline-hidden focus:border-[#05521F]"
                  >
                    <option value="I - Extremamente Tóxico">I - Extremamente Tóxico (Faixa Vermelha)</option>
                    <option value="II - Altamente Tóxico">II - Altamente Tóxico (Faixa Amarela)</option>
                    <option value="III - Moderadamente Tóxico">III - Moderadamente Tóxico (Faixa Azul)</option>
                    <option value="IV - Pouco Tóxico">IV - Pouco Tóxico (Faixa Verde)</option>
                    <option value="V - Improvável de Causar Dano">V - Improvável de Causar Dano (Faixa Branca)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Classificação Ambiental</label>
                  <select
                    value={environmentalClass}
                    onChange={(e) => setEnvironmentalClass(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 font-semibold text-slate-800 focus:outline-hidden focus:border-[#05521F]"
                  >
                    <option value="I - Altamente Perigoso">I - Altamente Perigoso (Classe I)</option>
                    <option value="II - Muito Perigoso">II - Muito Perigoso (Classe II)</option>
                    <option value="III - Perigoso">III - Perigoso (Classe III)</option>
                    <option value="IV - Pouco Perigoso">IV - Pouco Perigoso (Classe IV)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Observações Técnicas / Recomendações</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Respeitar condições de vento (< 15 km/h) e umidade relativa (> 50%)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-semibold text-slate-800 focus:outline-hidden focus:border-[#05521F]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 font-bold text-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white px-5 py-2.5 font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-colors border border-[#05521F]/30"
                >
                  <CheckCircle2 className="h-4 w-4" /> {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
