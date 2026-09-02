import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { APPLICATION_SERVICE_TYPES } from '../../types';
import { FileCheck2, X, AlertTriangle, MapPin, Calculator, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface NewQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialClientId?: string;
  initialData?: {
    crop?: string;
    areaHa?: number;
    pricePerHa?: number;
    serviceType?: string;
    notes?: string;
  };
}

export const NewQuoteModal: React.FC<NewQuoteModalProps> = ({
  isOpen,
  onClose,
  initialClientId,
  initialData,
}) => {
  const { clients, properties, talhoes, pilots, drones, crops, addQuote } = useApp();

  const [clientId, setClientId] = useState<string>('');
  const [propertyId, setPropertyId] = useState<string>('');
  const [talhaoName, setTalhaoName] = useState<string>('');
  const [pilotAssignedId, setPilotAssignedId] = useState<string>('');
  const [droneModelPreferred, setDroneModelPreferred] = useState<string>('');
  const [serviceType, setServiceType] = useState<string>('FUNGICIDA');
  const [customServiceType, setCustomServiceType] = useState<string>('');
  const [isCustomServiceType, setIsCustomServiceType] = useState<boolean>(false);
  const [crop, setCrop] = useState<string>('Soja');
  const [customCrop, setCustomCrop] = useState<string>('');
  const [isCustomCrop, setIsCustomCrop] = useState<boolean>(false);
  const [areaHa, setAreaHa] = useState<number>(100);
  const [pricePerHa, setPricePerHa] = useState<number>(65);
  const [displacementFee, setDisplacementFee] = useState<number>(0);
  const [additionalFees, setAdditionalFees] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [validUntil, setValidUntil] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [paymentTerms, setPaymentTerms] = useState<string>('30 dias após aplicação ou safra');
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleServiceTypeSelect = (selected: string) => {
    if (selected === 'OUTRO') {
      setIsCustomServiceType(true);
      setServiceType('OUTRO');
    } else {
      setIsCustomServiceType(false);
      setServiceType(selected);
      setCustomServiceType('');
    }
  };

  const handleCropSelect = (selected: string) => {
    if (selected === 'Outra' || selected === 'Outros') {
      setIsCustomCrop(true);
      setCrop('Outra');
    } else {
      setIsCustomCrop(false);
      setCrop(selected);
      setCustomCrop('');
    }
  };

  const applyCropFromSelection = (targetCrop?: string) => {
    const target = targetCrop || 'Soja';
    const found = crops.find((c) => c.name.toLowerCase() === target.toLowerCase());
    if (found) {
      setCrop(found.name);
      setIsCustomCrop(false);
      setCustomCrop('');
    } else {
      setIsCustomCrop(true);
      setCrop('Outra');
      setCustomCrop(target);
    }
  };

  // Initialize or synchronize selections when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      if (clients.length > 0) {
        const targetClient =
          (initialClientId && clients.find((c) => c.id === initialClientId)) ||
          clients[0];
        setClientId(targetClient.id);

        const clientProps = properties.filter((p) => p.clientId === targetClient.id);
        if (clientProps.length > 0) {
          const initialProp = clientProps[0];
          setPropertyId(initialProp.id);

          const propTalhoes = talhoes.filter((t) => t.propertyId === initialProp.id);
          if (propTalhoes.length > 0) {
            setTalhaoName(propTalhoes[0].name);
            applyCropFromSelection(initialData?.crop || propTalhoes[0].crop || 'Soja');
            setAreaHa(initialData?.areaHa || propTalhoes[0].areaHa || 100);
          } else {
            setTalhaoName('');
            if (initialData?.crop) applyCropFromSelection(initialData.crop);
            if (initialData?.areaHa) setAreaHa(initialData.areaHa);
          }
        } else {
          setPropertyId('');
          setTalhaoName('');
          if (initialData?.crop) applyCropFromSelection(initialData.crop);
          if (initialData?.areaHa) setAreaHa(initialData.areaHa);
        }
      }

      if (initialData) {
        if (initialData.serviceType) {
          const found = APPLICATION_SERVICE_TYPES.find(
            (st) => st.toLowerCase() === initialData.serviceType?.toLowerCase()
          );
          if (found) {
            setServiceType(found);
            setIsCustomServiceType(false);
            setCustomServiceType('');
          } else {
            setServiceType('OUTRO');
            setIsCustomServiceType(true);
            setCustomServiceType(initialData.serviceType);
          }
        }
        if (initialData.pricePerHa) setPricePerHa(initialData.pricePerHa);
        if (initialData.notes) setNotes(initialData.notes);
      }

      if (pilots.length > 0) {
        setPilotAssignedId(pilots[0].id);
      }
      if (drones.length > 0) {
        setDroneModelPreferred(drones[0].model);
      }
    }
  }, [isOpen, initialClientId, initialData, clients, properties, talhoes, pilots, drones, crops]);

  // When Client changes
  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId);
    setErrorMessage(null);
    const clientProps = properties.filter((p) => p.clientId === newClientId);
    if (clientProps.length > 0) {
      const newProp = clientProps[0];
      setPropertyId(newProp.id);
      const propTalhoes = talhoes.filter((t) => t.propertyId === newProp.id);
      if (propTalhoes.length > 0) {
        setTalhaoName(propTalhoes[0].name);
        applyCropFromSelection(propTalhoes[0].crop || crop);
        setAreaHa(propTalhoes[0].areaHa || areaHa);
      } else {
        setTalhaoName('');
      }
    } else {
      setPropertyId('');
      setTalhaoName('');
    }
  };

  // When Property changes
  const handlePropertyChange = (newPropertyId: string) => {
    setPropertyId(newPropertyId);
    setErrorMessage(null);
    const propTalhoes = talhoes.filter((t) => t.propertyId === newPropertyId);
    if (propTalhoes.length > 0) {
      setTalhaoName(propTalhoes[0].name);
      applyCropFromSelection(propTalhoes[0].crop || crop);
      setAreaHa(propTalhoes[0].areaHa || areaHa);
    } else {
      setTalhaoName('');
    }
  };

  if (!isOpen) return null;

  const client = clients.find((c) => c.id === clientId);
  const clientProperties = properties.filter((p) => p.clientId === clientId);
  const property = properties.find((p) => p.id === propertyId && p.clientId === clientId);
  const propertyTalhoes = talhoes.filter((t) => t.propertyId === propertyId);
  const pilot = pilots.find((p) => p.id === pilotAssignedId);

  // Financial Calculations
  const subtotal = areaHa * pricePerHa;
  const finalAmount = Math.max(0, subtotal + displacementFee + additionalFees - discount);
  const estimatedCost = areaHa * 20 + displacementFee * 0.4;
  const estimatedMargin = Math.max(0, finalAmount - estimatedCost);
  const estimatedMarginPercent = finalAmount > 0 ? Number(((estimatedMargin / finalAmount) * 100).toFixed(1)) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!client) {
      setErrorMessage('Selecione um cliente cadastrado.');
      return;
    }
    if (!property) {
      setErrorMessage('Selecione uma fazenda/propriedade do cliente.');
      return;
    }
    if (!areaHa || areaHa <= 0) {
      setErrorMessage('Informe uma área válida maior que 0 hectares.');
      return;
    }
    if (pricePerHa < 0) {
      setErrorMessage('O preço por hectare não pode ser negativo.');
      return;
    }
    if (!validUntil) {
      setErrorMessage('Informe a data de validade da proposta comercial.');
      return;
    }

    const finalCrop = isCustomCrop ? (customCrop.trim() || 'Outra') : (crop || 'Soja');
    const finalServiceType = isCustomServiceType
      ? (customServiceType.trim() || 'OUTRO')
      : (serviceType || 'FUNGICIDA');

    setIsSubmitting(true);
    try {
      await addQuote({
        clientId: client.id,
        clientName: client.name,
        clientWhatsapp: client.whatsapp || client.phone || '',
        propertyId: property.id,
        propertyName: property.name,
        talhaoName: talhaoName.trim() || undefined,
        serviceType: finalServiceType,
        crop: finalCrop,
        areaHa,
        pricePerHa,
        subtotal,
        displacementFee,
        additionalFees,
        discount,
        finalAmount,
        validUntil,
        status: 'rascunho',
        paymentTerms,
        pilotAssignedId: pilot?.id,
        pilotAssignedName: pilot?.name,
        droneModelPreferred: droneModelPreferred || undefined,
        estimatedCost,
        estimatedMargin,
        estimatedMarginPercent,
        notes: notes.trim() || undefined,
      });

      confetti({ particleCount: 65, spread: 60, origin: { y: 0.7 } });
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao salvar orçamento no servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white p-6 shadow-2xl overflow-y-auto space-y-4 text-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-[#05521F] font-black text-base">
            <FileCheck2 className="h-5 w-5" /> Criar Novo Orçamento Comercial
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-bold animate-shake">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* CLIENTE & FAZENDA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Cliente <span className="text-rose-500">*</span>
              </label>
              <select
                value={clientId}
                onChange={(e) => handleClientChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 font-semibold text-slate-800"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city}/{c.state})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Propriedade / Fazenda <span className="text-rose-500">*</span>
              </label>
              <select
                value={propertyId}
                onChange={(e) => handlePropertyChange(e.target.value)}
                disabled={clientProperties.length === 0}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 font-semibold text-slate-800 disabled:bg-slate-100"
              >
                {clientProperties.length === 0 ? (
                  <option value="">Cliente sem fazendas</option>
                ) : (
                  clientProperties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.city}/{p.state})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* TALHÃO, TIPO DE SERVIÇO & CULTURA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Talhão de Referência</label>
              {propertyTalhoes.length > 0 ? (
                <select
                  value={talhaoName}
                  onChange={(e) => {
                    setTalhaoName(e.target.value);
                    const t = propertyTalhoes.find((item) => item.name === e.target.value);
                    if (t) {
                      if (t.crop) applyCropFromSelection(t.crop);
                      if (t.areaHa) setAreaHa(t.areaHa);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 font-semibold"
                >
                  <option value="">Selecionar Talhão...</option>
                  {propertyTalhoes.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name} ({t.areaHa} ha)
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={talhaoName}
                  onChange={(e) => setTalhaoName(e.target.value)}
                  placeholder="Ex: Talhão 01 - Sede"
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-semibold"
                />
              )}
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Tipo de Aplicação <span className="text-rose-500">*</span>
              </label>
              <select
                value={isCustomServiceType ? 'OUTRO' : serviceType}
                onChange={(e) => handleServiceTypeSelect(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 font-bold text-slate-800 bg-white"
              >
                {APPLICATION_SERVICE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              {isCustomServiceType && (
                <div className="mt-2">
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Digite o tipo de serviço:</label>
                  <input
                    type="text"
                    value={customServiceType}
                    onChange={(e) => setCustomServiceType(e.target.value)}
                    placeholder="Ex: Aplicação Foliar Biológica"
                    className="w-full rounded-xl border border-emerald-400 p-2 text-sm font-semibold text-slate-800 bg-emerald-50/40"
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Cultura Agrícola</label>
              <select
                value={isCustomCrop ? 'Outra' : crop}
                onChange={(e) => handleCropSelect(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 font-semibold text-slate-800 bg-white"
              >
                {crops.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.icon ? `${c.icon} ` : ''}{c.name}
                  </option>
                ))}
                <option value="Outra">➕ Outra (digitar)</option>
              </select>

              {isCustomCrop && (
                <div className="mt-2">
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Digite a cultura:</label>
                  <input
                    type="text"
                    value={customCrop}
                    onChange={(e) => setCustomCrop(e.target.value)}
                    placeholder="Ex: Erva-mate, Noz-pecã"
                    className="w-full rounded-xl border border-emerald-400 p-2 text-sm font-semibold text-slate-800 bg-emerald-50/40"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>

          {/* PILOTO & DRONE PREFERENCIAIS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Piloto Previsto (Opcional)</label>
              <select
                value={pilotAssignedId}
                onChange={(e) => setPilotAssignedId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 font-medium"
              >
                <option value="">Alocar no momento da OS</option>
                {pilots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.commissionModel})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Modelo de Drone Sugerido</label>
              <select
                value={droneModelPreferred}
                onChange={(e) => setDroneModelPreferred(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 font-medium"
              >
                <option value="">Qualquer drone disponível</option>
                {drones.map((d) => (
                  <option key={d.id} value={d.model}>
                    {d.model} ({d.assetTag})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* VALORES E CUSTOS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Área (ha) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={areaHa === 0 ? '' : areaHa}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const cleanStr = e.target.value.replace(/^0+(?=\d)/, '');
                  const num = cleanStr === '' ? 0 : parseFloat(cleanStr);
                  setAreaHa(isNaN(num) ? 0 : num);
                }}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 font-black text-slate-800 text-sm"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Preço / ha (R$) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={pricePerHa === 0 ? '' : pricePerHa}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const cleanStr = e.target.value.replace(/^0+(?=\d)/, '');
                  const num = cleanStr === '' ? 0 : parseFloat(cleanStr);
                  setPricePerHa(isNaN(num) ? 0 : num);
                }}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 font-black text-slate-800 text-sm"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Deslocamento (R$)</label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0"
                value={displacementFee === 0 ? '' : displacementFee}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const cleanStr = e.target.value.replace(/^0+(?=\d)/, '');
                  const num = cleanStr === '' ? 0 : parseFloat(cleanStr);
                  setDisplacementFee(isNaN(num) ? 0 : num);
                }}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 font-bold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Desconto (R$)</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={discount === 0 ? '' : discount}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const cleanStr = e.target.value.replace(/^0+(?=\d)/, '');
                  const num = cleanStr === '' ? 0 : parseFloat(cleanStr);
                  setDiscount(isNaN(num) ? 0 : num);
                }}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 font-bold"
              />
            </div>
          </div>

          {/* VALIDADE & CONDIÇÕES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Validade da Proposta <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 font-semibold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Condição de Pagamento</label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 font-semibold"
              />
            </div>
          </div>

          {/* MARGEM & TOTAL PREVIEW */}
          <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-wrap justify-between items-center text-xs gap-3">
            <div>
              <span className="text-emerald-800 text-[10px] uppercase font-bold block">Valor Total da Proposta</span>
              <span className="text-xl font-black text-emerald-900">
                R$ {finalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-500 block">
                Subtotal: R$ {subtotal.toFixed(2)} • Deslocamento: R$ {displacementFee.toFixed(2)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-emerald-800 text-[10px] uppercase font-bold block">Margem Líquida Estimada</span>
              <span className="font-black text-emerald-700 text-sm">
                R$ {estimatedMargin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({estimatedMarginPercent}%)
              </span>
              <span className="text-[10px] text-slate-500 block">Custo Operacional Est.: R$ {estimatedCost.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white px-5 py-2.5 text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer border border-[#05521F]/30 disabled:opacity-50"
            >
              <FileCheck2 className="h-4 w-4" /> {isSubmitting ? 'Salvando no Servidor...' : 'Salvar Orçamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
