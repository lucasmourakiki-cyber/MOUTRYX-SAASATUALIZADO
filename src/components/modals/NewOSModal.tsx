import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ServiceProductItem, APPLICATION_SERVICE_TYPES, DROPLET_SIZES, DropletSize } from '../../types';
import {
  ClipboardList,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  Sparkles,
  MapPin,
  Calendar,
  Clock,
  User,
  Plane,
  Edit3,
  Layers,
  CloudSun,
  CreditCard,
  Droplets,
  Wind,
  Thermometer,
  Compass,
  Gauge,
  Ruler,
  SlidersHorizontal,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface NewOSModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewOSModal: React.FC<NewOSModalProps> = ({ isOpen, onClose }) => {
  const {
    clients,
    properties,
    talhoes,
    drones,
    pilots,
    products,
    crops,
    addServiceOrder,
  } = useApp();

  const [clientId, setClientId] = useState<string>('');
  const [propertyId, setPropertyId] = useState<string>('');
  const [talhaoId, setTalhaoId] = useState<string>('');
  const [pilotId, setPilotId] = useState<string>('');
  const [caldistaId, setCaldistaId] = useState<string>('');
  const [droneId, setDroneId] = useState<string>('');
  const [serviceType, setServiceType] = useState<string>('FUNGICIDA');
  const [customServiceType, setCustomServiceType] = useState<string>('');
  const [isCustomServiceType, setIsCustomServiceType] = useState<boolean>(false);
  const [crop, setCrop] = useState<string>('Soja');
  const [customCrop, setCustomCrop] = useState<string>('');
  const [isCustomCrop, setIsCustomCrop] = useState<boolean>(false);
  const [areaHa, setAreaHa] = useState<number>(50);
  const [pricePerHa, setPricePerHa] = useState<number>(65);
  const [displacementFee, setDisplacementFee] = useState<number>(0);
  const [additionalFees, setAdditionalFees] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'BOLETO' | 'CARTÃO' | 'PAGAMENTO SAFRA'>('PIX');
  const [harvestPaymentDate, setHarvestPaymentDate] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [scheduledTime, setScheduledTime] = useState<string>('06:30');
  const [notes, setNotes] = useState<string>('');

  // Parâmetros de Aplicação (manual, valores numéricos reais)
  const [flightSpeedKmH, setFlightSpeedKmH] = useState<string>('');
  const [flightHeightMeters, setFlightHeightMeters] = useState<string>('');
  const [swathWidthMeters, setSwathWidthMeters] = useState<string>('');
  const [caldaVolumeLPerHa, setCaldaVolumeLPerHa] = useState<string>('');
  const [dropletSize, setDropletSize] = useState<string>('');
  
  // Weather conditions (manual, real user inputs only)
  const [weatherTemp, setWeatherTemp] = useState<string>('');
  const [weatherHumidity, setWeatherHumidity] = useState<string>('');
  const [weatherWindSpeed, setWeatherWindSpeed] = useState<string>('');
  const [weatherWindDirection, setWeatherWindDirection] = useState<string>('');
  const [weatherNotes, setWeatherNotes] = useState<string>('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [selectedProducts, setSelectedProducts] = useState<ServiceProductItem[]>([]);

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

  const applyCropFromTalhao = (talhaoCrop?: string) => {
    const target = talhaoCrop || 'Soja';
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

  // Initialize or synchronize selections when modal opens or client list is available
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSelectedProducts([]);
      setFlightSpeedKmH('');
      setFlightHeightMeters('');
      setSwathWidthMeters('');
      setCaldaVolumeLPerHa('');
      setDropletSize('');
      setWeatherTemp('');
      setWeatherHumidity('');
      setWeatherWindSpeed('');
      setWeatherWindDirection('');
      setWeatherNotes('');
      setCaldistaId('');
      if (clients.length > 0) {
        const initialClient = clients[0];
        setClientId(initialClient.id);

        const clientProps = properties.filter((p) => p.clientId === initialClient.id);
        if (clientProps.length > 0) {
          const initialProp = clientProps[0];
          setPropertyId(initialProp.id);

          const propTalhoes = talhoes.filter((t) => t.propertyId === initialProp.id);
          if (propTalhoes.length > 0) {
            const initialTalhao = propTalhoes[0];
            setTalhaoId(initialTalhao.id);
            applyCropFromTalhao(initialTalhao.crop);
            setAreaHa(initialTalhao.areaHa || 0);
          } else {
            setTalhaoId('');
            setAreaHa(0);
          }
        } else {
          setPropertyId('');
          setTalhaoId('');
          setAreaHa(0);
        }
      }

      if (pilots.length > 0) {
        const activePilot = pilots.find((p) => p.status === 'ativo') || pilots[0];
        setPilotId(activePilot.id);
      }

      if (drones.length > 0) {
        const activeDrone = drones.find((d) => d.status === 'disponivel') || drones[0];
        setDroneId(activeDrone.id);
      }
    }
  }, [isOpen, clients, properties, talhoes, pilots, drones, crops]);

  // When Client changes -> update available properties and select first
  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId);
    setErrorMessage(null);
    const clientProps = properties.filter((p) => p.clientId === newClientId);
    if (clientProps.length > 0) {
      const newProp = clientProps[0];
      setPropertyId(newProp.id);
      const propTalhoes = talhoes.filter((t) => t.propertyId === newProp.id);
      if (propTalhoes.length > 0) {
        const newTalhao = propTalhoes[0];
        setTalhaoId(newTalhao.id);
        applyCropFromTalhao(newTalhao.crop);
        setAreaHa(newTalhao.areaHa || 0);
      } else {
        setTalhaoId('');
        setAreaHa(0);
      }
    } else {
      setPropertyId('');
      setTalhaoId('');
      setAreaHa(0);
    }
  };

  // When Property changes -> update available talhoes and select first
  const handlePropertyChange = (newPropertyId: string) => {
    setPropertyId(newPropertyId);
    setErrorMessage(null);
    const propTalhoes = talhoes.filter((t) => t.propertyId === newPropertyId);
    if (propTalhoes.length > 0) {
      const newTalhao = propTalhoes[0];
      setTalhaoId(newTalhao.id);
      applyCropFromTalhao(newTalhao.crop);
      setAreaHa(newTalhao.areaHa || 0);
    } else {
      setTalhaoId('');
      setAreaHa(0);
    }
  };

  // When Talhão changes -> sync crop and area
  const handleTalhaoChange = (newTalhaoId: string) => {
    setTalhaoId(newTalhaoId);
    setErrorMessage(null);
    const talhaoObj = talhoes.find((t) => t.id === newTalhaoId);
    if (talhaoObj) {
      applyCropFromTalhao(talhaoObj.crop);
      const newArea = talhaoObj.areaHa || 0;
      setAreaHa(newArea);
      handleAreaChange(newArea);
    } else {
      setAreaHa(0);
      handleAreaChange(0);
    }
  };

  // When Area changes -> recalculate product totals
  const handleAreaChange = (newArea: number) => {
    setAreaHa(newArea);
    setErrorMessage(null);
    setSelectedProducts((prev) =>
      prev.map((prod) => ({
        ...prod,
        plannedTotalQty: Number((prod.dosePerHa * newArea).toFixed(2)),
      }))
    );
  };

  if (!isOpen) return null;

  const client = clients.find((c) => c.id === clientId);
  const clientProperties = properties.filter((p) => p.clientId === clientId);
  const property = properties.find((p) => p.id === propertyId && p.clientId === clientId);
  const propertyTalhoes = talhoes.filter((t) => t.propertyId === propertyId);
  const talhao = talhoes.find((t) => t.id === talhaoId && t.propertyId === propertyId);
  const pilot = pilots.find((p) => p.id === pilotId);
  const caldista = pilots.find((p) => p.id === caldistaId);
  const drone = drones.find((d) => d.id === droneId);

  // Financial Calculations
  const grossAmount = areaHa * pricePerHa;
  const finalAmount = Math.max(0, grossAmount + displacementFee + additionalFees - discount);
  const estimatedCost = areaHa * 20 + displacementFee * 0.4;
  const netMargin = Math.max(0, finalAmount - estimatedCost);

  // Pilot Commission Calculation
  let calculatedPilotCommission = 0;
  let commissionRuleLabel = 'Sem comissão configurada';

  if (pilot) {
    if (pilot.hasCommission === false && pilot.hasFixedSalary) {
      calculatedPilotCommission = 0;
      commissionRuleLabel = `Salário Fixo (R$ ${(pilot.fixedSalary || 0).toFixed(2)}/mês)`;
    } else if (pilot.commissionType === 'por_hectare' || pilot.commissionModel === 'por_hectare') {
      const rate = pilot.commissionValue ?? pilot.ratePerHectare ?? 0;
      calculatedPilotCommission = areaHa * rate;
      commissionRuleLabel = `R$ ${rate.toFixed(2)}/ha (${areaHa} ha)`;
    } else if (pilot.commissionType === 'percentual' || pilot.commissionModel === 'percentual') {
      const rate = pilot.commissionValue ?? pilot.percentRate ?? 0;
      calculatedPilotCommission = finalAmount * (rate / 100);
      commissionRuleLabel = `${rate}% do serviço (R$ ${finalAmount.toFixed(2)})`;
    } else if (pilot.commissionType === 'fixo_por_servico') {
      const rate = pilot.commissionValue ?? pilot.fixedPerService ?? 0;
      calculatedPilotCommission = rate;
      commissionRuleLabel = `R$ ${rate.toFixed(2)} fixo por OS`;
    } else if (pilot.commissionModel === 'hibrido') {
      const rate = pilot.hybridRatePerHa || 0;
      calculatedPilotCommission = areaHa * rate;
      commissionRuleLabel = `Híbrido: R$ ${rate.toFixed(2)}/ha`;
    } else if (pilot.commissionModel === 'fixo') {
      calculatedPilotCommission = 0;
      commissionRuleLabel = `Salário Fixo (R$ ${(pilot.fixedSalary || 0).toFixed(2)}/mês)`;
    }
  }

  // Caldista / Auxiliar Commission Calculation
  let calculatedCaldistaCommission = 0;
  let caldistaRuleLabel = 'Sem comissão';

  if (caldista) {
    if (caldista.hasCommission === false && caldista.hasFixedSalary) {
      calculatedCaldistaCommission = 0;
      caldistaRuleLabel = `Salário Fixo (R$ ${(caldista.fixedSalary || 0).toFixed(2)}/mês)`;
    } else if (caldista.commissionType === 'por_hectare' || caldista.commissionModel === 'por_hectare') {
      const rate = caldista.commissionValue ?? caldista.ratePerHectare ?? 0;
      calculatedCaldistaCommission = areaHa * rate;
      caldistaRuleLabel = `R$ ${rate.toFixed(2)}/ha (${areaHa} ha)`;
    } else if (caldista.commissionType === 'percentual' || caldista.commissionModel === 'percentual') {
      const rate = caldista.commissionValue ?? caldista.percentRate ?? 0;
      calculatedCaldistaCommission = finalAmount * (rate / 100);
      caldistaRuleLabel = `${rate}% do serviço`;
    } else if (caldista.commissionType === 'fixo_por_servico') {
      const rate = caldista.commissionValue ?? caldista.fixedPerService ?? 0;
      calculatedCaldistaCommission = rate;
      caldistaRuleLabel = `R$ ${rate.toFixed(2)} fixo por OS`;
    } else if (caldista.hasFixedSalary) {
      calculatedCaldistaCommission = 0;
      caldistaRuleLabel = `Salário Fixo (R$ ${(caldista.fixedSalary || 0).toFixed(2)}/mês)`;
    }
  }

  const handleAddProduct = () => {
    const availableProducts = products.filter((p) => p.status !== 'inativo');
    const sourceList = availableProducts.length > 0 ? availableProducts : products;
    if (sourceList.length > 0) {
      const p = sourceList[0];
      setSelectedProducts([
        ...selectedProducts,
        {
          productId: p.id,
          commercialName: p.commercialName,
          activeIngredient: p.activeIngredient || '',
          dosePerHa: 0.5,
          unit: p.unit?.includes('/') ? p.unit : `${p.unit || 'L'}/ha`,
          plannedTotalQty: Number((0.5 * areaHa).toFixed(2)),
          targetPest: (p.targetPests && p.targetPests[0]) || 'Pragas Gerais',
          volumeCaldaLPerHa: p.defaultVolumeCaldaLPerHa || 10,
        },
      ]);
    }
  };

  const handleAddManualProduct = () => {
    setSelectedProducts([
      ...selectedProducts,
      {
        productId: `manual-${Date.now()}`,
        commercialName: '',
        activeIngredient: 'Defensivo Personalizado',
        dosePerHa: 0.5,
        unit: 'L/ha',
        plannedTotalQty: Number((0.5 * areaHa).toFixed(2)),
        targetPest: 'Aplicação Específica',
        volumeCaldaLPerHa: 10,
      },
    ]);
  };

  const handleRemoveProduct = (index: number) => {
    setSelectedProducts(selectedProducts.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Strict Validations with User Feedback
    if (!client) {
      setErrorMessage('Selecione um cliente válido cadastrado no sistema.');
      return;
    }
    if (!property) {
      setErrorMessage('Selecione uma fazenda/propriedade pertencente ao cliente selecionado.');
      return;
    }
    if (!talhao) {
      setErrorMessage('Selecione um talhão cadastrado para a propriedade selecionada.');
      return;
    }
    if (!pilot) {
      setErrorMessage('Selecione um piloto responsável pela execução do voo.');
      return;
    }
    if (!drone) {
      setErrorMessage('Selecione um drone para realizar a aplicação.');
      return;
    }
    if (!areaHa || areaHa <= 0) {
      setErrorMessage('Informe uma área contratada válida maior que zero hectares.');
      return;
    }
    if (pricePerHa < 0) {
      setErrorMessage('O preço por hectare não pode ser negativo.');
      return;
    }
    if (!scheduledDate) {
      setErrorMessage('Defina a data agendada para o serviço.');
      return;
    }
    if (!scheduledTime) {
      setErrorMessage('Defina o horário agendado para o início da operação.');
      return;
    }
    if (paymentMethod === 'PAGAMENTO SAFRA' && !harvestPaymentDate) {
      setErrorMessage('Por favor, informe a data prevista para o pagamento safra.');
      return;
    }

    // Coordinates validation
    const propertyCoords = {
      lat: property.latitude || 0,
      lng: property.longitude || 0,
    };

    const finalServiceType = isCustomServiceType
      ? (customServiceType.trim() || 'OUTRO')
      : (serviceType || 'FUNGICIDA');

    const finalCrop = isCustomCrop ? (customCrop.trim() || 'Outra') : (crop || 'Soja');

    const sanitizedProducts = selectedProducts.map((sp) => ({
      ...sp,
      commercialName: sp.commercialName?.trim() || 'Defensivo Customizado',
      activeIngredient: sp.activeIngredient || 'Calda Fitossanitária',
    }));

    // Application parameters (manual inputs, only include if provided)
    const hasApplicationParams = Boolean(
      flightSpeedKmH.trim() !== '' ||
      flightHeightMeters.trim() !== '' ||
      swathWidthMeters.trim() !== '' ||
      caldaVolumeLPerHa.trim() !== '' ||
      dropletSize.trim() !== ''
    );

    const applicationParameters = hasApplicationParams
      ? {
          flightSpeedKmH: flightSpeedKmH.trim() !== '' ? Number(flightSpeedKmH) : undefined,
          flightHeightMeters: flightHeightMeters.trim() !== '' ? Number(flightHeightMeters) : undefined,
          swathWidthMeters: swathWidthMeters.trim() !== '' ? Number(swathWidthMeters) : undefined,
          caldaVolumeLPerHa: caldaVolumeLPerHa.trim() !== '' ? Number(caldaVolumeLPerHa) : undefined,
          dropletSize: (dropletSize.trim() as DropletSize) || undefined,
        }
      : undefined;

    // Real weather conditions (only include if provided by user)
    const hasWeather = Boolean(
      weatherTemp.trim() ||
      weatherHumidity.trim() ||
      weatherWindSpeed.trim() ||
      weatherWindDirection.trim() ||
      weatherNotes.trim()
    );

    const weatherConditions = hasWeather
      ? {
          temperatureC: weatherTemp.trim()
            ? (weatherTemp.includes('°') ? weatherTemp.trim() : `${weatherTemp.trim()} °C`)
            : undefined,
          humidityPercent: weatherHumidity.trim()
            ? (weatherHumidity.includes('%') ? weatherHumidity.trim() : `${weatherHumidity.trim()} %`)
            : undefined,
          windSpeedKmH: weatherWindSpeed.trim()
            ? (weatherWindSpeed.toLowerCase().includes('km') ? weatherWindSpeed.trim() : `${weatherWindSpeed.trim()} km/h`)
            : undefined,
          windDirection: weatherWindDirection.trim() || undefined,
          notes: weatherNotes.trim() || undefined,
        }
      : undefined;

    const formattedPaymentTerms = paymentMethod === 'PAGAMENTO SAFRA'
      ? (harvestPaymentDate ? `Pagamento Safra (Previsto para ${harvestPaymentDate.split('-').reverse().join('/')})` : 'Pagamento Safra')
      : paymentMethod;

    setIsSubmitting(true);
    try {
      await addServiceOrder({
        clientId: client.id,
        clientName: client.name,
        clientWhatsapp: client.whatsapp || client.phone || '',
        propertyId: property.id,
        propertyName: property.name,
        propertyCoords,
        talhaoId: talhao.id,
        talhaoName: talhao.name,
        crop: finalCrop,
        areaHa,
        serviceType: finalServiceType,
        scheduledDate,
        scheduledTime,
        status: 'agendado',
        pilotId: pilot.id,
        pilotName: pilot.name,
        caldistaId: caldista?.id || undefined,
        caldistaName: caldista?.name || undefined,
        auxiliarId: caldista?.id || undefined,
        auxiliarName: caldista?.name || undefined,
        droneId: drone.id,
        droneModel: drone.model,
        products: sanitizedProducts,
        applicationParameters,
        weatherConditions,
        pricePerHa,
        grossAmount,
        displacementFee,
        additionalFees,
        discount,
        finalAmount,
        estimatedCost,
        netMargin,
        paymentMethod,
        harvestPaymentDate: paymentMethod === 'PAGAMENTO SAFRA' ? harvestPaymentDate : undefined,
        paymentTerms: formattedPaymentTerms,
        calculatedPilotCommission: Math.round(calculatedPilotCommission * 100) / 100,
        calculatedCaldistaCommission: Math.round(calculatedCaldistaCommission * 100) / 100,
        commissionStatus: 'prevista',
        caldistaCommissionStatus: 'prevista',
        clientSigned: false,
        notes: notes.trim() || undefined,
      });

      confetti({ particleCount: 70, spread: 65, origin: { y: 0.7 } });
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Falha ao salvar Ordem de Serviço no servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl max-h-[90vh] rounded-2xl bg-white p-6 shadow-2xl overflow-y-auto space-y-4 text-slate-800">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-[#05521F] font-black text-base">
            <ClipboardList className="h-5 w-5" /> Nova Ordem de Serviço (OS)
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
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
          {/* CLIENT → PROPRIEDADE → TALHÃO */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Cliente <span className="text-rose-500">*</span>
              </label>
              <select
                value={clientId}
                onChange={(e) => handleClientChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 font-semibold text-slate-800 focus:border-[#05521F] focus:outline-hidden"
              >
                {clients.length === 0 ? (
                  <option value="">Nenhum cliente cadastrado</option>
                ) : (
                  clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city}/{c.state})
                    </option>
                  ))
                )}
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
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 font-semibold text-slate-800 focus:border-[#05521F] focus:outline-hidden disabled:bg-slate-100"
              >
                {clientProperties.length === 0 ? (
                  <option value="">Cliente sem fazendas cadastradas</option>
                ) : (
                  clientProperties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.city}/{p.state})
                    </option>
                  ))
                )}
              </select>
              {property && (
                <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {property.latitude && property.longitude
                    ? `GPS: ${property.latitude.toFixed(4)}, ${property.longitude.toFixed(4)}`
                    : 'Sem coordenadas cadastradas'}
                </span>
              )}
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Talhão <span className="text-rose-500">*</span>
              </label>
              <select
                value={talhaoId}
                onChange={(e) => handleTalhaoChange(e.target.value)}
                disabled={propertyTalhoes.length === 0}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 font-semibold text-slate-800 focus:border-[#05521F] focus:outline-hidden disabled:bg-slate-100"
              >
                {propertyTalhoes.length === 0 ? (
                  <option value="">Fazenda sem talhões</option>
                ) : (
                  propertyTalhoes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.areaHa} ha • {t.crop})
                    </option>
                  ))
                )}
              </select>
              {talhao && (
                <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
                  Cadastrado: {talhao.areaHa} ha ({talhao.crop})
                </span>
              )}
            </div>
          </div>

          {/* PILOTO, DRONE & OPERAÇÃO */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Tipo de Aplicação / Serviço <span className="text-rose-500">*</span>
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
                    placeholder="Ex: Aplicação de produto biológico X"
                    className="w-full rounded-xl border border-emerald-400 p-2 text-sm font-semibold text-slate-800 bg-emerald-50/40"
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Piloto Responsável <span className="text-rose-500">*</span>
              </label>
              <select
                value={pilotId}
                onChange={(e) => setPilotId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 font-bold text-slate-800"
              >
                {pilots.length === 0 ? (
                  <option value="">Nenhum piloto cadastrado</option>
                ) : (
                  pilots
                    .filter((p) => !p.professionalType || p.professionalType === 'piloto')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.commissionModel === 'por_hectare' ? `R$ ${(p.ratePerHectare || p.commissionValue || 0).toFixed(2)}/ha` : p.commissionModel === 'percentual' ? `${p.percentRate || p.commissionValue}%` : p.commissionModel})
                      </option>
                    ))
                )}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Auxiliar / Caldista <span className="text-xs font-normal text-slate-500">(Opcional)</span>
              </label>
              <select
                value={caldistaId}
                onChange={(e) => setCaldistaId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 font-semibold text-slate-800 bg-white"
              >
                <option value="">Nenhum auxiliar selecionado</option>
                {pilots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.professionalType === 'auxiliar_caldista' ? '(Caldista)' : '(Piloto)'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Drone Designado <span className="text-rose-500">*</span>
              </label>
              <select
                value={droneId}
                onChange={(e) => setDroneId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 font-bold text-slate-800"
              >
                {drones.length === 0 ? (
                  <option value="">Nenhum drone cadastrado</option>
                ) : (
                  drones.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.model} ({d.assetTag || d.serialNumber})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* AGENDAMENTO & CULTURA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    placeholder="Ex: Erva-mate, Melancia, Noz-pecã"
                    className="w-full rounded-xl border border-emerald-400 p-2 text-sm font-semibold text-slate-800 bg-emerald-50/40"
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Data Agendada <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 font-semibold"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Horário Previsto <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 font-semibold"
              />
            </div>
          </div>

          {/* ÁREA, PREÇO & TAXAS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Área Contratada (ha) <span className="text-rose-500">*</span>
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
                  handleAreaChange(isNaN(num) ? 0 : num);
                }}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 font-black text-slate-800 text-sm"
              />
              {talhao && areaHa > talhao.areaHa && (
                <span className="text-[10px] text-amber-700 font-semibold block mt-1">
                  Área maior que o talhão ({talhao.areaHa} ha)
                </span>
              )}
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Preço / ha (R$)</label>
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
              <label className="font-bold text-slate-700 block mb-1">Taxa Deslocamento (R$)</label>
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

          {/* PRODUTOS FITOSSANITÁRIOS */}
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-800 block text-xs">
                  Defensivos / Calda Fitossanitária (AGROFIT/MAPA)
                </span>
                <span className="text-[10px] text-slate-500">
                  Dosagens planejadas calculadas automaticamente para {areaHa} hectares
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddProduct}
                  className="text-[#05521F] font-bold text-xs flex items-center gap-1 hover:bg-emerald-100 bg-emerald-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer border border-[#05521F]/30"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar do Catálogo
                </button>
                <button
                  type="button"
                  onClick={handleAddManualProduct}
                  className="text-[#05521F] font-bold text-xs flex items-center gap-1 hover:bg-emerald-100 bg-emerald-50 px-2.5 py-1 rounded-lg transition-colors border border-emerald-200 cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" /> + Escrever Manualmente
                </button>
              </div>
            </div>

            {selectedProducts.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic bg-slate-50 p-2.5 rounded-xl text-center">
                Nenhum defensivo adicionado para esta ordem de serviço.
              </p>
            ) : (
              selectedProducts.map((sp, idx) => {
                const isManual = sp.productId.startsWith('manual-') || sp.productId === 'manual';

                return (
                  <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    {isManual ? (
                      <div className="flex-1 flex flex-wrap sm:flex-nowrap items-center gap-1.5 min-w-[200px]">
                        <input
                          type="text"
                          placeholder="Digite o nome do produto / calda..."
                          value={sp.commercialName}
                          onChange={(e) => {
                            const updated = [...selectedProducts];
                            updated[idx] = {
                              ...updated[idx],
                              commercialName: e.target.value,
                            };
                            setSelectedProducts(updated);
                          }}
                          className="flex-1 min-w-[150px] rounded-lg border border-amber-300 bg-amber-50/50 p-1.5 font-bold text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#05521F]"
                        />

                        <select
                          value={sp.unit}
                          onChange={(e) => {
                            const updated = [...selectedProducts];
                            updated[idx] = { ...updated[idx], unit: e.target.value };
                            setSelectedProducts(updated);
                          }}
                          className="rounded-lg border border-slate-300 bg-white p-1.5 text-xs font-semibold text-slate-700 focus:outline-hidden"
                        >
                          <option value="L/ha">L/ha</option>
                          <option value="mL/ha">mL/ha</option>
                          <option value="kg/ha">kg/ha</option>
                          <option value="g/ha">g/ha</option>
                        </select>

                        <button
                          type="button"
                          title="Escolher do Catálogo"
                          onClick={() => {
                            const availableProducts = products.filter((p) => p.status !== 'inativo');
                            const fallback = availableProducts[0] || products[0];
                            if (fallback) {
                              const updated = [...selectedProducts];
                              const selUnit = fallback.unit?.includes('/') ? fallback.unit : `${fallback.unit || 'L'}/ha`;
                              updated[idx] = {
                                ...updated[idx],
                                productId: fallback.id,
                                commercialName: fallback.commercialName,
                                activeIngredient: fallback.activeIngredient || '',
                                unit: selUnit,
                                targetPest: (fallback.targetPests && fallback.targetPests[0]) || 'Pragas Gerais',
                                volumeCaldaLPerHa: fallback.defaultVolumeCaldaLPerHa || 10,
                              };
                              setSelectedProducts(updated);
                            }
                          }}
                          className="p-1.5 bg-white border border-slate-300 text-slate-600 hover:text-[#05521F] hover:bg-emerald-50 rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <Layers className="h-3 w-3 text-[#05521F]" /> Catálogo
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center gap-1.5 min-w-[200px]">
                        <select
                          value={sp.productId}
                          onChange={(e) => {
                            if (e.target.value === 'manual') {
                              const updated = [...selectedProducts];
                              updated[idx] = {
                                ...updated[idx],
                                productId: `manual-${Date.now()}`,
                                commercialName: '',
                                activeIngredient: 'Personalizado',
                                unit: 'L/ha',
                              };
                              setSelectedProducts(updated);
                              return;
                            }

                            const sel = products.find((p) => p.id === e.target.value);
                            if (sel) {
                              const updated = [...selectedProducts];
                              const selUnit = sel.unit?.includes('/') ? sel.unit : `${sel.unit || 'L'}/ha`;
                              updated[idx] = {
                                ...updated[idx],
                                productId: sel.id,
                                commercialName: sel.commercialName,
                                activeIngredient: sel.activeIngredient || '',
                                unit: selUnit,
                                targetPest: (sel.targetPests && sel.targetPests[0]) || 'Pragas Gerais',
                                volumeCaldaLPerHa: sel.defaultVolumeCaldaLPerHa || 10,
                              };
                              setSelectedProducts(updated);
                            }
                          }}
                          className="flex-1 min-w-[140px] rounded-lg border border-slate-300 bg-white p-1.5 font-semibold text-xs text-slate-800"
                        >
                          {products
                            .filter((prod) => prod.status !== 'inativo' || prod.id === sp.productId)
                            .map((prod) => (
                              <option key={prod.id} value={prod.id}>
                                {prod.commercialName} ({prod.productClass}){prod.status === 'inativo' ? ' [Inativo]' : ''}
                              </option>
                            ))}
                          <option value="manual">✍️ Outro (digitar manualmente)...</option>
                        </select>

                        <button
                          type="button"
                          title="Digitar nome de outro produto manualmente"
                          onClick={() => {
                            const updated = [...selectedProducts];
                            updated[idx] = {
                              ...updated[idx],
                              productId: `manual-${Date.now()}`,
                              commercialName: '',
                              activeIngredient: 'Personalizado',
                              unit: 'L/ha',
                            };
                            setSelectedProducts(updated);
                          }}
                          className="p-1.5 bg-white border border-slate-300 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <Edit3 className="h-3 w-3 text-emerald-600" /> Digitar
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 font-bold">Dose:</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0.0"
                        value={sp.dosePerHa || ''}
                        onChange={(e) => {
                          const updated = [...selectedProducts];
                          const doseVal = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          const dose = isNaN(doseVal) ? 0 : doseVal;
                          updated[idx].dosePerHa = dose;
                          updated[idx].plannedTotalQty = Number((dose * areaHa).toFixed(2));
                          setSelectedProducts(updated);
                        }}
                        className="w-20 sm:w-24 rounded-lg border border-slate-300 bg-white p-1.5 text-xs text-center font-bold text-slate-900 focus:outline-hidden focus:border-[#05521F]"
                      />
                      {!isManual && <span className="text-slate-600 font-bold text-[11px]">{sp.unit}</span>}
                    </div>

                    <div className="px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800 text-[11px] font-bold whitespace-nowrap">
                      Total: {sp.plannedTotalQty} {sp.unit.replace('/ha', '')}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveProduct(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* PARÂMETROS DE APLICAÇÃO */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                <SlidersHorizontal className="h-4 w-4 text-[#05521F]" /> Parâmetros de Aplicação
              </div>
              <span className="text-[11px] font-semibold text-slate-400">Configuração de Voo & Pulverização</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
                  <Gauge className="h-3.5 w-3.5 text-slate-500" /> Velocidade de voo
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Ex: 30"
                    value={flightSpeedKmH}
                    onChange={(e) => setFlightSpeedKmH(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 pr-12 font-semibold text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#05521F]"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[11px] font-bold text-slate-400">km/h</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
                  <Ruler className="h-3.5 w-3.5 text-slate-500" /> Altura de voo
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Ex: 4"
                    value={flightHeightMeters}
                    onChange={(e) => setFlightHeightMeters(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 pr-8 font-semibold text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#05521F]"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[11px] font-bold text-slate-400">m</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
                  <Ruler className="h-3.5 w-3.5 text-slate-500" /> Faixa de aplicação
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Ex: 7"
                    value={swathWidthMeters}
                    onChange={(e) => setSwathWidthMeters(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 pr-8 font-semibold text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#05521F]"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[11px] font-bold text-slate-400">m</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
                  <Droplets className="h-3.5 w-3.5 text-slate-500" /> Volume de calda / Vazão
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Ex: 10"
                    value={caldaVolumeLPerHa}
                    onChange={(e) => setCaldaVolumeLPerHa(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 pr-12 font-semibold text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#05521F]"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[11px] font-bold text-slate-400">L/ha</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5 text-slate-500" /> Tamanho de gota
                </label>
                <select
                  value={dropletSize}
                  onChange={(e) => setDropletSize(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 font-semibold text-xs text-slate-800 focus:outline-hidden focus:border-[#05521F]"
                >
                  <option value="">Selecione...</option>
                  {DROPLET_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* FORMA DE PAGAMENTO & CONDIÇÕES */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
              <CreditCard className="h-4 w-4 text-[#05521F]" /> Forma de Pagamento
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Forma de Pagamento <span className="text-rose-500">*</span>
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => {
                    const val = e.target.value as 'PIX' | 'BOLETO' | 'CARTÃO' | 'PAGAMENTO SAFRA';
                    setPaymentMethod(val);
                    if (val !== 'PAGAMENTO SAFRA') {
                      setHarvestPaymentDate('');
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 font-bold text-slate-800 focus:outline-hidden focus:border-[#05521F]"
                >
                  <option value="PIX">PIX</option>
                  <option value="BOLETO">BOLETO</option>
                  <option value="CARTÃO">CARTÃO</option>
                  <option value="PAGAMENTO SAFRA">PAGAMENTO SAFRA</option>
                </select>
              </div>

              {paymentMethod === 'PAGAMENTO SAFRA' && (
                <div className="animate-fadeIn">
                  <label className="font-bold text-emerald-800 block mb-1 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-[#05521F]" />
                    Data Prevista para Pagamento Safra <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={harvestPaymentDate}
                    onChange={(e) => setHarvestPaymentDate(e.target.value)}
                    className="w-full rounded-xl border border-emerald-400 bg-white p-2.5 font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                    required
                  />
                  <span className="text-[10px] text-emerald-700 font-medium mt-0.5 block">
                    Data em que o recebimento da safra está programado
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* CONDIÇÕES CLIMÁTICAS DA APLICAÇÃO (OPCIONAL) */}
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                <CloudSun className="h-4 w-4 text-[#05521F]" /> Condições Climáticas da Aplicação
              </div>
              <span className="text-[11px] font-semibold text-slate-400">Opcional • Não inventa dados</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
                  <Thermometer className="h-3 w-3 text-slate-500" /> Temperatura
                </label>
                <input
                  type="text"
                  placeholder="Ex: 25 °C"
                  value={weatherTemp}
                  onChange={(e) => setWeatherTemp(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2 font-semibold text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#05521F]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
                  <Droplets className="h-3 w-3 text-slate-500" /> Umidade Relativa
                </label>
                <input
                  type="text"
                  placeholder="Ex: 72 %"
                  value={weatherHumidity}
                  onChange={(e) => setWeatherHumidity(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2 font-semibold text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#05521F]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
                  <Wind className="h-3 w-3 text-slate-500" /> Vento
                </label>
                <input
                  type="text"
                  placeholder="Ex: 8 km/h"
                  value={weatherWindSpeed}
                  onChange={(e) => setWeatherWindSpeed(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2 font-semibold text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#05521F]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
                  <Compass className="h-3 w-3 text-slate-500" /> Direção Vento
                </label>
                <input
                  type="text"
                  placeholder="Ex: NE"
                  value={weatherWindDirection}
                  onChange={(e) => setWeatherWindDirection(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2 font-semibold text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#05521F]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Observações Climáticas / Operacionais
              </label>
              <input
                type="text"
                placeholder="Ex: Condições adequadas para aplicação no momento da operação."
                value={weatherNotes}
                onChange={(e) => setWeatherNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white p-2 font-semibold text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#05521F]"
              />
            </div>
          </div>

          {/* OBSERVAÇÕES GERAIS */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Observações Adicionais da OS</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instruções de acesso à fazenda, ponto de recarga de baterias, orientações ao piloto..."
              className="w-full rounded-xl border border-slate-300 p-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#05521F]"
            />
          </div>

          {/* FINANCIAL SUMMARY & PILOT / CALDISTA COMMISSION BOX */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200">
            <div>
              <span className="text-[#111827] text-[10px] uppercase font-bold block">Valor Total do Serviço</span>
              <span className="text-xl font-black text-[#05521F]">
                R$ {finalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Subtotal: R$ {grossAmount.toFixed(2)} • Deslocamento: R$ {displacementFee.toFixed(2)}
              </span>
            </div>

            <div>
              <span className="text-emerald-900 text-[10px] uppercase font-bold block">Comissão do Piloto</span>
              <span className="text-lg font-black text-emerald-700">
                R$ {calculatedPilotCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-emerald-800 font-semibold block mt-0.5">
                {pilot?.name}: {commissionRuleLabel}
              </span>
            </div>

            {caldista && (
              <div>
                <span className="text-emerald-900 text-[10px] uppercase font-bold block">Comissão do Caldista</span>
                <span className="text-lg font-black text-teal-700">
                  R$ {calculatedCaldistaCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-teal-800 font-semibold block mt-0.5">
                  {caldista.name}: {caldistaRuleLabel}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
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
              className="rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white px-5 py-2.5 text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer border border-[#05521F]/30 disabled:opacity-50"
            >
              <ClipboardList className="h-4 w-4" /> {isSubmitting ? 'Salvando no Servidor...' : 'Criar Ordem de Serviço'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
