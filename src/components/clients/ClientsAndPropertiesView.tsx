import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Client, Property, Talhao } from '../../types';
import {
  Users,
  MapPin,
  Plus,
  Search,
  Navigation,
  Phone,
  Mail,
  Layers,
  Compass,
  FileUp,
  Copy,
  Check,
  Building2,
  X,
  Upload,
  Edit2,
  Trash2,
  ShieldCheck,
  Info,
  CheckCircle2,
} from 'lucide-react';

export const BRAZILIAN_UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

export const ClientsAndPropertiesView: React.FC = () => {
  const {
    clients,
    properties,
    talhoes,
    crops,
    addClient,
    updateClient,
    deleteClient,
    addProperty,
    updateProperty,
    deleteProperty,
    addTalhao,
    updateTalhao,
    deleteTalhao,
    currentCompany,
    activeTab: globalTab,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'clientes' | 'propriedades' | 'talhoes'>(() => {
    if (globalTab === 'propriedades' || globalTab === 'fazendas') return 'propriedades';
    if (globalTab === 'talhoes') return 'talhoes';
    return 'clientes';
  });

  useEffect(() => {
    if (globalTab === 'propriedades' || globalTab === 'fazendas') {
      setActiveTab('propriedades');
    } else if (globalTab === 'talhoes') {
      setActiveTab('talhoes');
    } else if (globalTab === 'clientes') {
      setActiveTab('clientes');
    }
  }, [globalTab]);

  const [search, setSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(() => clients[0]?.id || null);
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [cropFilter, setCropFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync selected client if list changes and previous selection is missing
  useEffect(() => {
    if (!selectedClientId && clients.length > 0) {
      setSelectedClientId(clients[0].id);
    } else if (selectedClientId && !clients.some((c) => c.id === selectedClientId)) {
      setSelectedClientId(clients[0]?.id || null);
    }
  }, [clients, selectedClientId]);

  // Modals visibility
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [isNewPropertyOpen, setIsNewPropertyOpen] = useState(false);
  const [isEditPropertyOpen, setIsEditPropertyOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  const [isNewTalhaoOpen, setIsNewTalhaoOpen] = useState(false);
  const [isEditTalhaoOpen, setIsEditTalhaoOpen] = useState(false);
  const [editingTalhao, setEditingTalhao] = useState<Talhao | null>(null);

  const [isImportKmlOpen, setIsImportKmlOpen] = useState(false);

  // ----------------------------------------------------
  // Client Form State (New & Edit)
  // ----------------------------------------------------
  const [clientFormName, setClientFormName] = useState('');
  const [clientFormContact, setClientFormContact] = useState('');
  const [clientFormDoc, setClientFormDoc] = useState('');
  const [clientFormPhone, setClientFormPhone] = useState('');
  const [clientFormEmail, setClientFormEmail] = useState('');
  const [clientFormCity, setClientFormCity] = useState('');
  const [clientFormState, setClientFormState] = useState(''); // Empty by default! NEVER 'MT'
  const [clientFormType, setClientFormType] = useState<'pj' | 'pf'>('pj');
  const [clientFormNotes, setClientFormNotes] = useState('');

  // ----------------------------------------------------
  // Property Form State (New & Edit)
  // ----------------------------------------------------
  const [propFormName, setPropFormName] = useState('');
  const [propFormClientId, setPropFormClientId] = useState('');
  const [propFormManager, setPropFormManager] = useState('');
  const [propFormPhone, setPropFormPhone] = useState('');
  const [propFormCity, setPropFormCity] = useState('');
  const [propFormArea, setPropFormArea] = useState('500');
  const [propFormLat, setPropFormLat] = useState('-12.5422');
  const [propFormLng, setPropFormLng] = useState('-55.7214');
  const [propFormNotes, setPropFormNotes] = useState('');

  // ----------------------------------------------------
  // Talhao Form State (New & Edit) - NO "Estádio da Cultura"
  // ----------------------------------------------------
  const [talhaoFormName, setTalhaoFormName] = useState('');
  const [talhaoFormPropId, setTalhaoFormPropId] = useState('');
  const [talhaoFormCrop, setTalhaoFormCrop] = useState('Soja');
  const [talhaoFormCustomCrop, setTalhaoFormCustomCrop] = useState('');
  const [talhaoFormArea, setTalhaoFormArea] = useState('50');
  const [talhaoFormLat, setTalhaoFormLat] = useState('-12.5422');
  const [talhaoFormLng, setTalhaoFormLng] = useState('-55.7214');
  const [talhaoFormNotes, setTalhaoFormNotes] = useState('');

  // Open New Client Modal
  const handleOpenNewClient = () => {
    setClientFormName('');
    setClientFormContact('');
    setClientFormDoc('');
    setClientFormPhone('');
    setClientFormEmail('');
    setClientFormCity('');
    setClientFormState(''); // Strict empty - user must select explicitly
    setClientFormType('pj');
    setClientFormNotes('');
    setIsNewClientOpen(true);
  };

  // Open Edit Client Modal
  const handleOpenEditClient = (client: Client) => {
    setEditingClient(client);
    setClientFormName(client.name || '');
    setClientFormContact(client.contactName || '');
    setClientFormDoc(client.cpfCnpj || '');
    setClientFormPhone(client.phone || client.whatsapp || '');
    setClientFormEmail(client.email || '');
    setClientFormCity(client.city || '');
    setClientFormState(client.state || ''); // Pull exact registered UF
    setClientFormType(client.type || 'pj');
    setClientFormNotes(client.notes || '');
    setIsEditClientOpen(true);
  };

  // Open New Property Modal
  const handleOpenNewProperty = (preselectedClientId?: string) => {
    const targetClientId = preselectedClientId || selectedClientId || clients[0]?.id || '';
    const selectedClientObj = clients.find((c) => c.id === targetClientId);

    setPropFormName('');
    setPropFormClientId(targetClientId);
    setPropFormManager(selectedClientObj?.contactName || selectedClientObj?.name || '');
    setPropFormPhone(selectedClientObj?.phone || selectedClientObj?.whatsapp || '');
    setPropFormCity(selectedClientObj?.city || '');
    setPropFormArea('500');
    setPropFormLat('-12.5422');
    setPropFormLng('-55.7214');
    setPropFormNotes('');
    setIsNewPropertyOpen(true);
  };

  // Open Edit Property Modal
  const handleOpenEditProperty = (prop: Property) => {
    setEditingProperty(prop);
    setPropFormName(prop.name || '');
    setPropFormClientId(prop.clientId || '');
    setPropFormManager(prop.managerName || '');
    setPropFormPhone(prop.phone || '');
    setPropFormCity(prop.city || '');
    setPropFormArea(String(prop.totalAreaHa || 0));
    setPropFormLat(String(prop.latitude ?? -12.5422));
    setPropFormLng(String(prop.longitude ?? -55.7214));
    setPropFormNotes(prop.notes || '');
    setIsEditPropertyOpen(true);
  };

  // Open New Talhao Modal
  const handleOpenNewTalhao = (preselectedPropId?: string) => {
    const targetPropId = preselectedPropId || (propertyFilter !== 'all' ? propertyFilter : properties[0]?.id || '');
    setTalhaoFormName('');
    setTalhaoFormPropId(targetPropId);
    setTalhaoFormCrop(crops[0]?.name || 'Soja');
    setTalhaoFormCustomCrop('');
    setTalhaoFormArea('50');
    setTalhaoFormLat('-12.5422');
    setTalhaoFormLng('-55.7214');
    setTalhaoFormNotes('');
    setIsNewTalhaoOpen(true);
  };

  // Open Edit Talhao Modal
  const handleOpenEditTalhao = (talhao: Talhao) => {
    setEditingTalhao(talhao);
    setTalhaoFormName(talhao.name || '');
    setTalhaoFormPropId(talhao.propertyId || properties[0]?.id || '');
    const currentCrop = talhao.crop || 'Soja';
    const foundCrop = crops.find((c) => c.name.toLowerCase() === currentCrop.toLowerCase());
    if (foundCrop) {
      setTalhaoFormCrop(foundCrop.name);
      setTalhaoFormCustomCrop('');
    } else {
      setTalhaoFormCrop('Outra');
      setTalhaoFormCustomCrop(currentCrop);
    }
    setTalhaoFormArea(String(talhao.areaHa || 50));
    setTalhaoFormLat(String(talhao.center?.lat ?? -12.5422));
    setTalhaoFormLng(String(talhao.center?.lng ?? -55.7214));
    setTalhaoFormNotes(talhao.notes || '');
    setIsEditTalhaoOpen(true);
  };

  // Handle Save New Client
  const handleSaveNewClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientFormName.trim()) {
      alert('Por favor, informe a Razão Social / Nome Completo do cliente.');
      return;
    }
    if (!clientFormState.trim()) {
      alert('Por favor, selecione a UF do cliente. O campo UF é obrigatório.');
      return;
    }

    try {
      const created = await addClient({
        companyId: currentCompany.id,
        name: clientFormName.trim(),
        contactName: clientFormContact.trim() || clientFormName.trim(),
        cpfCnpj: clientFormDoc.trim(),
        phone: clientFormPhone.trim(),
        whatsapp: clientFormPhone.trim(),
        email: clientFormEmail.trim(),
        city: clientFormCity.trim() || 'Cidade Principal',
        state: clientFormState.trim().toUpperCase(), // Pure selected UF
        address: `${clientFormCity.trim() || 'Cidade'}/${clientFormState.trim().toUpperCase()}`,
        rating: 5,
        type: clientFormType,
        notes: clientFormNotes.trim() || 'Cliente cadastrado no sistema MOUTRYX.',
      });

      setSelectedClientId(created.id);
      setIsNewClientOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Falha ao cadastrar cliente no servidor.');
    }
  };

  // Handle Save Edit Client
  const handleSaveEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    if (!clientFormName.trim()) {
      alert('Por favor, informe a Razão Social / Nome Completo do cliente.');
      return;
    }
    if (!clientFormState.trim()) {
      alert('Por favor, selecione a UF do cliente. O campo UF é obrigatório.');
      return;
    }

    try {
      await updateClient(editingClient.id, {
        name: clientFormName.trim(),
        contactName: clientFormContact.trim() || clientFormName.trim(),
        cpfCnpj: clientFormDoc.trim() || editingClient.cpfCnpj,
        phone: clientFormPhone.trim() || editingClient.phone,
        whatsapp: clientFormPhone.trim() || editingClient.whatsapp,
        email: clientFormEmail.trim() || editingClient.email,
        city: clientFormCity.trim() || editingClient.city,
        state: clientFormState.trim().toUpperCase(), // Updated UF
        address: `${clientFormCity.trim() || editingClient.city}/${clientFormState.trim().toUpperCase()}`,
        type: clientFormType,
        notes: clientFormNotes.trim(),
      });

      setIsEditClientOpen(false);
      setEditingClient(null);
    } catch (err: any) {
      alert(err?.message || 'Falha ao atualizar cliente no servidor.');
    }
  };

  // Handle Save New Property (Inherits UF & Contact from Client)
  const handleSaveNewProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propFormName.trim()) {
      alert('Por favor, informe o Nome da Fazenda / Propriedade.');
      return;
    }
    if (!propFormClientId) {
      alert('Por favor, selecione o Cliente responsável.');
      return;
    }

    const client = clients.find((c) => c.id === propFormClientId);
    if (!client) {
      alert('Cliente selecionado não encontrado.');
      return;
    }

    const lat = parseFloat(propFormLat) || -12.5422;
    const lng = parseFloat(propFormLng) || -55.7214;
    const area = parseFloat(propFormArea) || 500;

    // Direct inheritance from client
    const inheritedState = client.state || '';
    const resolvedPhone = propFormPhone.trim() || client.phone || client.whatsapp || '';
    const resolvedManager = propFormManager.trim() || client.contactName || client.name || 'Responsável Agrícola';
    const resolvedCity = propFormCity.trim() || client.city || 'Sede';

    try {
      await addProperty({
        companyId: client.companyId || currentCompany.id,
        clientId: client.id,
        clientName: client.name,
        name: propFormName.trim(),
        managerName: resolvedManager,
        phone: resolvedPhone,
        city: resolvedCity,
        state: inheritedState, // AUTOMATICALLY INHERITED FROM CLIENT
        address: `${resolvedCity}/${inheritedState}`,
        latitude: lat,
        longitude: lng,
        totalAreaHa: area,
        notes: propFormNotes.trim() || 'Propriedade cadastrada no sistema MOUTRYX.',
      });

      setIsNewPropertyOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Falha ao cadastrar propriedade no servidor.');
    }
  };

  // Handle Save Edit Property
  const handleSaveEditProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty) return;

    const client = clients.find((c) => c.id === propFormClientId) || clients.find((c) => c.id === editingProperty.clientId);
    const lat = parseFloat(propFormLat) || editingProperty.latitude || -12.5422;
    const lng = parseFloat(propFormLng) || editingProperty.longitude || -55.7214;
    const area = parseFloat(propFormArea) || editingProperty.totalAreaHa || 500;

    const inheritedState = client?.state || editingProperty.state || '';
    const resolvedCity = propFormCity.trim() || editingProperty.city || '';

    try {
      await updateProperty(editingProperty.id, {
        name: propFormName.trim(),
        clientId: client?.id || editingProperty.clientId,
        clientName: client?.name || editingProperty.clientName,
        managerName: propFormManager.trim() || editingProperty.managerName,
        phone: propFormPhone.trim() || editingProperty.phone,
        city: resolvedCity,
        state: inheritedState,
        address: `${resolvedCity}/${inheritedState}`,
        latitude: lat,
        longitude: lng,
        totalAreaHa: area,
        notes: propFormNotes.trim(),
      });

      setIsEditPropertyOpen(false);
      setEditingProperty(null);
    } catch (err: any) {
      alert(err?.message || 'Falha ao atualizar propriedade no servidor.');
    }
  };

  // Handle Save New Talhao (NO "Estádio da Cultura")
  const handleSaveNewTalhao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!talhaoFormName.trim()) {
      alert('Por favor, informe o Nome do Talhão / Gleba.');
      return;
    }
    if (!talhaoFormPropId) {
      alert('Por favor, selecione a Fazenda / Propriedade.');
      return;
    }

    const prop = properties.find((p) => p.id === talhaoFormPropId) || properties[0];
    const lat = parseFloat(talhaoFormLat) || -12.5422;
    const lng = parseFloat(talhaoFormLng) || -55.7214;
    const area = parseFloat(talhaoFormArea) || 50;

    // Generate clean bounding polygon around center coordinate
    const polygon = [
      { lat: lat + 0.003, lng: lng - 0.003 },
      { lat: lat + 0.003, lng: lng + 0.003 },
      { lat: lat - 0.003, lng: lng + 0.003 },
      { lat: lat - 0.003, lng: lng - 0.003 },
    ];

    const finalCrop =
      talhaoFormCrop === 'Outra' || talhaoFormCrop === 'Outros'
        ? talhaoFormCustomCrop.trim() || 'Outra'
        : talhaoFormCrop;

    try {
      await addTalhao({
        companyId: prop?.companyId || currentCompany.id,
        propertyId: prop?.id || '',
        propertyName: prop?.name || 'Fazenda',
        clientId: prop?.clientId || '',
        clientName: prop?.clientName || 'Cliente',
        name: talhaoFormName.trim(),
        areaHa: area,
        crop: finalCrop,
        lastApplicationDate: new Date().toISOString().split('T')[0],
        center: { lat, lng },
        polygon,
        notes: talhaoFormNotes.trim() || 'Talhão / Gleba cadastrado no sistema MOUTRYX.',
      });

      setIsNewTalhaoOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Falha ao cadastrar talhão no servidor.');
    }
  };

  // Handle Save Edit Talhao
  const handleSaveEditTalhao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTalhao) return;

    const prop = properties.find((p) => p.id === talhaoFormPropId) || properties.find((p) => p.id === editingTalhao.propertyId);
    const lat = parseFloat(talhaoFormLat) || editingTalhao.center?.lat || -12.5422;
    const lng = parseFloat(talhaoFormLng) || editingTalhao.center?.lng || -55.7214;
    const area = parseFloat(talhaoFormArea) || editingTalhao.areaHa || 50;

    const finalCrop =
      talhaoFormCrop === 'Outra' || talhaoFormCrop === 'Outros'
        ? talhaoFormCustomCrop.trim() || 'Outra'
        : talhaoFormCrop;

    try {
      await updateTalhao(editingTalhao.id, {
        name: talhaoFormName.trim(),
        propertyId: prop?.id || editingTalhao.propertyId,
        propertyName: prop?.name || editingTalhao.propertyName,
        clientId: prop?.clientId || editingTalhao.clientId,
        clientName: prop?.clientName || editingTalhao.clientName,
        crop: finalCrop,
        areaHa: area,
        center: { lat, lng },
        notes: talhaoFormNotes.trim(),
      });

      setIsEditTalhaoOpen(false);
      setEditingTalhao(null);
    } catch (err: any) {
      alert(err?.message || 'Falha ao atualizar talhão no servidor.');
    }
  };

  // Filtered lists
  const filteredClients = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.contactName || '').toLowerCase().includes(q) ||
      (c.city || '').toLowerCase().includes(q) ||
      (c.state || '').toLowerCase().includes(q)
    );
  });

  const filteredProperties = properties.filter((p) => {
    const q = search.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.clientName || '').toLowerCase().includes(q) ||
      (p.city || '').toLowerCase().includes(q) ||
      (p.state || '').toLowerCase().includes(q)
    );
  });

  const filteredTalhoes = talhoes.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch =
      (t.name || '').toLowerCase().includes(q) ||
      (t.propertyName || '').toLowerCase().includes(q) ||
      (t.clientName || '').toLowerCase().includes(q) ||
      (t.crop || '').toLowerCase().includes(q);

    const matchProp = propertyFilter === 'all' || t.propertyId === propertyFilter;
    const matchCrop = cropFilter === 'all' || (t.crop || '').toLowerCase() === cropFilter.toLowerCase();

    return matchSearch && matchProp && matchCrop;
  });

  const selectedClient = clients.find((c) => c.id === selectedClientId) || clients[0];
  const clientProperties = properties.filter((p) => p.clientId === (selectedClient?.id || ''));

  // Active client object currently selected in New/Edit Property modal
  const propertyModalSelectedClient = clients.find((c) => c.id === propFormClientId) || selectedClient;

  const handleCopyCoords = (lat: number, lng: number, id: string) => {
    navigator.clipboard.writeText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCropColorBadge = (cropName: string) => {
    const name = (cropName || '').toLowerCase();
    if (name.includes('milho')) return 'bg-amber-100 text-amber-900 border-amber-300';
    if (name.includes('soja')) return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    if (name.includes('algod')) return 'bg-sky-100 text-sky-900 border-sky-300';
    if (name.includes('cana')) return 'bg-lime-100 text-lime-900 border-lime-300';
    if (name.includes('caf')) return 'bg-orange-100 text-orange-900 border-orange-300';
    if (name.includes('past')) return 'bg-teal-100 text-teal-900 border-teal-300';
    return 'bg-slate-100 text-slate-900 border-slate-300';
  };

  return (
    <div id="clients-talhoes-view" className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-6 w-6 text-[#05521F]" />
            <h1 className="text-xl sm:text-2xl font-black text-[#111827]">
              Clientes, Fazendas & Talhões
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestão hierárquica unificada: Cliente (dados cadastrais & UF oficial) → Fazendas (unidades operacionais) → Glebas & Talhões
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'talhoes' && (
            <>
              <button
                id="btn-import-kml"
                type="button"
                onClick={() => setIsImportKmlOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
              >
                <FileUp className="h-4 w-4 text-emerald-600" />
                Importar KML / SHP
              </button>
              <button
                id="btn-add-talhao"
                type="button"
                onClick={() => handleOpenNewTalhao()}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white transition-colors shadow-xs cursor-pointer border border-[#05521F]/30"
              >
                <Plus className="h-4 w-4" />
                Novo Talhão / Gleba
              </button>
            </>
          )}

          {activeTab === 'propriedades' && (
            <button
              id="btn-add-property"
              type="button"
              onClick={() => handleOpenNewProperty()}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white transition-colors shadow-xs cursor-pointer border border-[#05521F]/30"
            >
              <Plus className="h-4 w-4" />
              Nova Fazenda / Propriedade
            </button>
          )}

          {activeTab === 'clientes' && (
            <button
              id="btn-add-client"
              type="button"
              onClick={handleOpenNewClient}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white transition-colors shadow-xs cursor-pointer border border-[#05521F]/30"
            >
              <Plus className="h-4 w-4" />
              Novo Cliente
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center border-b border-slate-200 gap-4 sm:gap-6 overflow-x-auto no-scrollbar whitespace-nowrap">
        <button
          id="tab-btn-clientes"
          type="button"
          onClick={() => setActiveTab('clientes')}
          className={`pb-3 text-xs font-black transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'clientes'
              ? 'border-[#05521F] text-[#05521F]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="h-4 w-4" />
          Clientes ({clients.length})
        </button>

        <button
          id="tab-btn-propriedades"
          type="button"
          onClick={() => setActiveTab('propriedades')}
          className={`pb-3 text-xs font-black transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'propriedades'
              ? 'border-[#05521F] text-[#05521F]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="h-4 w-4" />
          Fazendas & Propriedades ({properties.length})
        </button>

        <button
          id="tab-btn-talhoes"
          type="button"
          onClick={() => setActiveTab('talhoes')}
          className={`pb-3 text-xs font-black transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'talhoes'
              ? 'border-[#05521F] text-[#05521F]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="h-4 w-4" />
          Glebas & Talhões ({talhoes.length})
        </button>
      </div>

      {/* TAB 1: CLIENTES */}
      {activeTab === 'clientes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client List */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="search-clients-input"
                type="text"
                placeholder="Buscar clientes por nome, contato, cidade ou UF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs focus:outline-hidden focus:border-[#05521F]"
              />
            </div>

            <div className="space-y-2">
              {filteredClients.map((client) => {
                const isSelected = selectedClientId === client.id;
                return (
                  <div
                    key={client.id}
                    id={`client-card-${client.id}`}
                    onClick={() => setSelectedClientId(client.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#05521F] bg-emerald-50/60 shadow-xs ring-1 ring-[#05521F]/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-[#111827]">{client.name}</h4>
                          <span className="text-[11px] font-medium text-slate-500">
                            {client.state ? `(${client.state})` : ''}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {client.contactName} • {client.city}/{client.state}
                        </p>
                      </div>
                      <span className="text-xs font-black text-[#05521F] bg-emerald-100 px-2 py-0.5 rounded-md">
                        {client.totalHectares || 0} ha
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredClients.length === 0 && (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
                  <Users className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">Nenhum cliente encontrado</p>
                  <button
                    type="button"
                    onClick={handleOpenNewClient}
                    className="text-xs font-bold text-[#05521F] hover:underline cursor-pointer"
                  >
                    + Cadastrar novo cliente
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Client 360 Details */}
          {selectedClient ? (
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-black text-lg text-[#111827]">{selectedClient.name}</h3>
                    <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2.5 py-0.5 rounded-md border border-slate-200">
                      UF: {selectedClient.state}
                    </span>
                    <span className="bg-emerald-50 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {selectedClient.type === 'pf' ? 'Produtor Rural (PF)' : 'Pessoa Jurídica (PJ)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Documento: <span className="font-mono text-slate-700">{selectedClient.cpfCnpj || 'Não informado'}</span> • Município:{' '}
                    <span className="font-semibold text-slate-800">{selectedClient.city} - {selectedClient.state}</span>
                  </p>
                </div>

                {/* Edit and Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditClient(selectedClient)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                    Editar Cliente
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm(`Tem certeza que deseja excluir o cliente "${selectedClient.name}"?`)) {
                        try {
                          await deleteClient(selectedClient.id);
                        } catch (err: any) {
                          alert(err?.message || 'Falha ao excluir cliente no servidor.');
                        }
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                    title="Excluir Cliente"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Contact Info (Source of Truth) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1 font-bold text-slate-700">
                    <Info className="h-3.5 w-3.5 text-[#05521F]" /> Dados Cadastrais & Contatos Oficiais
                  </span>
                  <span className="text-[11px] text-[#05521F] font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Fonte Principal para Fazendas
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">
                      Responsável / Titular
                    </span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {selectedClient.contactName || selectedClient.name}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">
                      Telefone / WhatsApp
                    </span>
                    <span className="font-bold text-slate-900 mt-0.5 block flex items-center gap-1">
                      <Phone className="h-3 w-3 text-[#05521F]" /> {selectedClient.phone || selectedClient.whatsapp || 'Não informado'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">
                      E-mail Cadastral
                    </span>
                    <span className="font-bold text-slate-900 mt-0.5 block truncate flex items-center gap-1">
                      <Mail className="h-3 w-3 text-[#05521F]" /> {selectedClient.email || 'Não informado'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Linked Properties */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm text-[#111827] flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-[#05521F]" /> Fazendas Vinculadas ({clientProperties.length})
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Herança cadastral ativa: todas as novas fazendas puxam automaticamente a UF (<strong className="text-slate-800">{selectedClient.state}</strong>) e contatos deste cliente.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenNewProperty(selectedClient.id)}
                    className="text-xs font-bold text-[#05521F] hover:underline flex items-center gap-1 cursor-pointer bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" /> Adicionar Fazenda
                  </button>
                </div>

                {clientProperties.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <Building2 className="h-7 w-7 text-slate-300 mx-auto" />
                    <p className="font-semibold text-slate-700">Nenhuma fazenda cadastrada para este cliente ainda.</p>
                    <button
                      type="button"
                      onClick={() => handleOpenNewProperty(selectedClient.id)}
                      className="text-xs font-bold text-[#05521F] hover:underline cursor-pointer"
                    >
                      + Cadastrar primeira fazenda para {selectedClient.name}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {clientProperties.map((prop) => {
                      const lat = prop.latitude ?? -12.5422;
                      const lng = prop.longitude ?? -55.7214;
                      return (
                        <div
                          key={prop.id}
                          className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 text-xs"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-extrabold text-slate-900 text-sm block">
                                {prop.name}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-600">
                                <span className="font-medium">{prop.city}</span>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-500">UF: {prop.state}</span>
                              </div>
                              <p className="text-slate-500 text-[11px] mt-1">
                                Gerente: <span className="text-slate-800 font-semibold">{prop.managerName || 'Não inf.'}</span> • Tel:{' '}
                                <span className="text-slate-800 font-mono">{prop.phone || 'Não inf.'}</span>
                              </p>
                            </div>
                            <span className="font-extrabold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                              {prop.totalAreaHa} ha
                            </span>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                            <button
                              type="button"
                              onClick={() => handleOpenEditProperty(prop)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <Edit2 className="h-3 w-3" /> Editar
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                window.open(
                                  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
                                  '_blank'
                                )
                              }
                              className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-1.5 font-bold text-[11px] cursor-pointer"
                            >
                              <Navigation className="h-3 w-3" /> Maps
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                window.open(
                                  `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
                                  '_blank'
                                )
                              }
                              className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white py-1.5 font-bold text-[11px] cursor-pointer"
                            >
                              Waze
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="lg:col-span-2 p-12 text-center bg-white rounded-2xl border border-slate-200">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">Selecione um cliente ao lado ou crie um novo</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PROPRIEDADES */}
      {activeTab === 'propriedades' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar fazendas por nome, cliente, cidade ou UF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs focus:outline-hidden focus:border-[#05521F]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProperties.map((prop) => {
              const lat = prop.latitude ?? -12.5422;
              const lng = prop.longitude ?? -55.7214;
              const talhoesCount = talhoes.filter((t) => t.propertyId === prop.id).length;

              return (
                <div
                  key={prop.id}
                  id={`property-card-${prop.id}`}
                  className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black text-[#05521F] uppercase tracking-wider block">
                          Cliente: {prop.clientName}
                        </span>
                        <h3 className="font-black text-base text-[#111827] mt-0.5">{prop.name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
                          <span>{prop.city}</span>
                          <span className="text-slate-400">•</span>
                          <span>UF: {prop.state}</span>
                        </div>
                      </div>
                      <span className="bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-black px-2.5 py-1 rounded-lg">
                        {prop.totalAreaHa} ha
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Responsável / Gerente:</span>
                        <span className="font-bold text-slate-800">{prop.managerName || 'Não informado'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Telefone:</span>
                        <span className="font-mono text-slate-800">{prop.phone || 'Não informado'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Talhões Cadastrados:</span>
                        <span className="font-bold text-[#05521F]">{talhoesCount} talhões</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Coordenadas GPS:</span>
                        <span className="font-mono text-[11px] text-slate-700">
                          {lat.toFixed(4)}, {lng.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenNewTalhao(prop.id)}
                        className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#05521F] border border-emerald-200 py-1.5 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> Adicionar Talhão
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditProperty(prop)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                        title="Editar Propriedade"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm(`Tem certeza que deseja excluir a propriedade "${prop.name}"?`)) {
                            try {
                              await deleteProperty(prop.id);
                            } catch (err: any) {
                              alert(err?.message || 'Falha ao excluir propriedade no servidor.');
                            }
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer"
                        title="Excluir Propriedade"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          window.open(
                            `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
                            '_blank'
                          )
                        }
                        className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <MapPin className="h-3.5 w-3.5" /> Maps
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          window.open(
                            `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
                            '_blank'
                          )
                        }
                        className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <Navigation className="h-3.5 w-3.5" /> Waze
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredProperties.length === 0 && (
              <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
                <Building2 className="h-10 w-10 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">Nenhuma fazenda encontrada</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Cadastre uma fazenda vinculada a um cliente para gerenciar os talhões e operações.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenNewProperty()}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#05521F] text-white hover:bg-[#2E7D32] cursor-pointer border border-[#05521F]/30"
                >
                  <Plus className="h-4 w-4" /> Cadastrar Fazenda
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TALHÕES & GLEBAS COM MAPA VIRTUAL */}
      {activeTab === 'talhoes' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="search-talhoes-input"
                type="text"
                placeholder="Buscar talhão por identificação, fazenda, cliente ou cultura..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs focus:outline-hidden focus:border-[#05521F]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Property filter */}
              <select
                id="filter-property-select"
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
              >
                <option value="all">Todas as Fazendas ({properties.length})</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.clientName})
                  </option>
                ))}
              </select>

              {/* Crop filter */}
              <select
                id="filter-crop-select"
                value={cropFilter}
                onChange={(e) => setCropFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
              >
                <option value="all">Todas as Culturas</option>
                {crops.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Talhões Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTalhoes.map((talhao) => {
              const lat = talhao.center?.lat ?? -12.5422;
              const lng = talhao.center?.lng ?? -55.7214;
              const isCopied = copiedId === talhao.id;

              return (
                <div
                  key={talhao.id}
                  id={`talhao-card-${talhao.id}`}
                  className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-all"
                >
                  {/* Top Graphic Polygon & Info Preview */}
                  <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black uppercase text-emerald-300 tracking-wider">
                          {talhao.propertyName || 'Fazenda'}
                        </span>
                        <h3 className="font-black text-base text-white mt-0.5">{talhao.name}</h3>
                        <span className="text-xs text-slate-300 block mt-0.5">
                          Cliente: {talhao.clientName}
                        </span>
                      </div>

                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-black px-2.5 py-1 rounded-lg backdrop-blur-xs">
                        {talhao.areaHa} ha
                      </span>
                    </div>

                    {/* Crop badge */}
                    <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-700/60">
                      <span
                        className={`font-black px-2.5 py-0.5 rounded-md border text-[11px] ${getCropColorBadge(
                          talhao.crop
                        )}`}
                      >
                        {talhao.crop}
                      </span>

                      <span className="text-[11px] text-slate-300 flex items-center gap-1 font-mono">
                        <Compass className="h-3 w-3 text-emerald-400" />
                        {lat.toFixed(4)}, {lng.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between text-xs">
                    <div className="space-y-2">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                        <div className="flex justify-between text-slate-600">
                          <span>Última Aplicação:</span>
                          <span className="font-bold text-slate-900">
                            {talhao.lastApplicationDate || 'Sem registro recente'}
                          </span>
                        </div>
                        {talhao.soilType && (
                          <div className="flex justify-between text-slate-600">
                            <span>Tipo de Solo / Relevo:</span>
                            <span className="font-bold text-slate-800">{talhao.soilType}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-600">
                          <span>Vértices do Polígono:</span>
                          <span className="font-mono text-slate-700">
                            {(talhao.polygon || []).length} pontos GPS
                          </span>
                        </div>
                      </div>

                      {talhao.notes && (
                        <p className="text-[11px] text-slate-600 italic bg-amber-50/70 p-2.5 rounded-lg border border-amber-100">
                          💡 {talhao.notes}
                        </p>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyCoords(lat, lng, talhao.id)}
                          className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 py-2 text-[11px] font-bold text-slate-700 transition-colors cursor-pointer"
                        >
                          {isCopied ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-600" /> Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 text-slate-400" /> Copiar GPS
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditTalhao(talhao)}
                          className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                          title="Editar Talhão"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm(`Tem certeza que deseja excluir o talhão "${talhao.name}"?`)) {
                              try {
                                await deleteTalhao(talhao.id);
                              } catch (err: any) {
                                alert(err?.message || 'Falha ao excluir talhão no servidor.');
                              }
                            }
                          }}
                          className="px-2.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold transition-colors cursor-pointer"
                          title="Excluir Talhão"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          window.open(
                            `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
                            '_blank'
                          )
                        }
                        className="w-full flex items-center justify-center gap-1 rounded-xl bg-[#05521F] hover:bg-[#2E7D32] text-white py-2 text-[11px] font-bold shadow-xs transition-colors cursor-pointer border border-[#05521F]/30"
                      >
                        <Navigation className="h-3.5 w-3.5" /> Abrir no Google Maps
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredTalhoes.length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <Layers className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Nenhum talhão encontrado</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Tente ajustar os filtros de busca ou cadastre um novo talhão / gleba para mapear a área.
              </p>
              <button
                type="button"
                onClick={() => handleOpenNewTalhao()}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#05521F] text-white hover:bg-[#2E7D32] cursor-pointer border border-[#05521F]/30"
              >
                <Plus className="h-4 w-4" /> Cadastrar Talhão
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOVO / EDITAR CLIENTE */}
      {/* ========================================================================= */}
      {(isNewClientOpen || isEditClientOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#05521F]" />
                <h3 className="font-black text-base text-[#111827]">
                  {isEditClientOpen ? 'Editar Cliente' : 'Novo Cliente'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsNewClientOpen(false);
                  setIsEditClientOpen(false);
                  setEditingClient(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={isEditClientOpen ? handleSaveEditClient : handleSaveNewClient}
              className="space-y-4 text-xs"
            >
              {/* Name & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Razão Social / Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Lucas Moura / Agropecuária Santa Maria"
                    value={clientFormName}
                    onChange={(e) => setClientFormName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 bg-slate-50 focus:outline-hidden focus:border-[#05521F]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Cliente</label>
                  <select
                    value={clientFormType}
                    onChange={(e) => setClientFormType(e.target.value as 'pf' | 'pj')}
                    className="w-full rounded-xl border border-slate-200 p-2.5 bg-slate-50 font-semibold"
                  >
                    <option value="pj">Pessoa Jurídica (PJ)</option>
                    <option value="pf">Produtor Rural (PF)</option>
                  </select>
                </div>
              </div>

              {/* UF (MANDATORY SELECTOR) & City */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                <div>
                  <label className="block font-bold text-emerald-950 mb-1 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#05521F]" /> Estado (UF) *
                  </label>
                  <select
                    id="client-state-select"
                    required
                    value={clientFormState}
                    onChange={(e) => setClientFormState(e.target.value)}
                    className="w-full rounded-xl border-2 border-emerald-400 p-2.5 bg-white font-extrabold text-slate-900 focus:outline-hidden focus:border-[#05521F] cursor-pointer"
                  >
                    <option value="">Selecione a UF</option>
                    {BRAZILIAN_UFS.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Cidade / Município *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Chapecó, Cascavel, Sorriso, Rio Verde..."
                    value={clientFormCity}
                    onChange={(e) => setClientFormCity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 bg-white focus:outline-hidden focus:border-[#05521F]"
                  />
                </div>
              </div>

              {/* Responsible & Document */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Responsável / Titular</label>
                  <input
                    type="text"
                    placeholder="Ex: Lucas Moura"
                    value={clientFormContact}
                    onChange={(e) => setClientFormContact(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 bg-slate-50 focus:outline-hidden focus:border-[#05521F]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">CNPJ / CPF</label>
                  <input
                    type="text"
                    placeholder="Ex: 00.000.000/0001-00 ou 000.000.000-00"
                    value={clientFormDoc}
                    onChange={(e) => setClientFormDoc(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 bg-slate-50 focus:outline-hidden focus:border-[#05521F]"
                  />
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Ex: (49) 99988-7766"
                    value={clientFormPhone}
                    onChange={(e) => setClientFormPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 bg-slate-50 focus:outline-hidden focus:border-[#05521F]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    placeholder="Ex: contato@cliente.com.br"
                    value={clientFormEmail}
                    onChange={(e) => setClientFormEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 bg-slate-50 focus:outline-hidden focus:border-[#05521F]"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Observações Cadastrais</label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais do cliente..."
                  value={clientFormNotes}
                  onChange={(e) => setClientFormNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 bg-slate-50 focus:outline-hidden focus:border-[#05521F]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewClientOpen(false);
                    setIsEditClientOpen(false);
                    setEditingClient(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#05521F] text-white font-black hover:bg-[#2E7D32] shadow-xs cursor-pointer border border-[#05521F]/30"
                >
                  {isEditClientOpen ? 'Atualizar Cliente' : 'Salvar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOVA / EDITAR PROPRIEDADE (HERDA UF E CONTATO DO CLIENTE) */}
      {/* ========================================================================= */}
      {(isNewPropertyOpen || isEditPropertyOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#05521F]" />
                <h3 className="font-black text-base text-[#111827]">
                  {isEditPropertyOpen ? 'Editar Fazenda / Propriedade' : 'Nova Fazenda / Propriedade'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsNewPropertyOpen(false);
                  setIsEditPropertyOpen(false);
                  setEditingProperty(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={isEditPropertyOpen ? handleSaveEditProperty : handleSaveNewProperty}
              className="space-y-4 text-xs"
            >
              {/* 1. Select Client (Source of Truth) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Cliente Proprietário / Responsável *
                </label>
                <select
                  required
                  value={propFormClientId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setPropFormClientId(newId);
                    const chosen = clients.find((c) => c.id === newId);
                    if (chosen) {
                      if (!propFormManager || propFormManager === propertyModalSelectedClient?.contactName) {
                        setPropFormManager(chosen.contactName || chosen.name);
                      }
                      if (!propFormPhone || propFormPhone === propertyModalSelectedClient?.phone) {
                        setPropFormPhone(chosen.phone || chosen.whatsapp);
                      }
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 p-2.5 bg-slate-50 font-bold text-slate-900 focus:outline-hidden focus:border-[#05521F]"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (UF: {c.state || 'N/I'})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Inherited Client Data Banner (UF, Contacts, Responsible) */}
              {propertyModalSelectedClient && (
                <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-emerald-950 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[11px] uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Dados Cadastrais do Cliente (Herdados Automaticamente)
                    </span>
                    <span className="bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-md text-[11px] border border-emerald-200">
                      UF: {propertyModalSelectedClient.state || 'Não informada'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-emerald-800 block text-[10px] uppercase font-bold">UF Oficial:</span>
                      <span className="font-bold text-emerald-950">{propertyModalSelectedClient.state || 'Não informada'}</span>
                    </div>
                    <div>
                      <span className="text-emerald-800 block text-[10px] uppercase font-bold">Responsável Titular:</span>
                      <span className="font-bold text-emerald-950 truncate block">{propertyModalSelectedClient.contactName || propertyModalSelectedClient.name}</span>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-emerald-800 block text-[10px] uppercase font-bold">Contato Telefônico:</span>
                      <span className="font-bold text-emerald-950 truncate block">{propertyModalSelectedClient.phone || propertyModalSelectedClient.whatsapp || 'Não inf.'}</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-emerald-700 italic border-t border-emerald-200/70 pt-1.5 mt-1">
                    ✓ A UF (<strong className="text-emerald-950">{propertyModalSelectedClient.state}</strong>) e os dados de contato pertencem ao cliente e são vinculados à propriedade sem necessidade de redigitação.
                  </p>
                </div>
              )}

              {/* 3. Specific Property Data */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Nome da Fazenda / Propriedade *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Fazenda Santa Inês - Gleba Central"
                    value={propFormName}
                    onChange={(e) => setPropFormName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 bg-slate-50 focus:outline-hidden focus:border-[#05521F]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Área Total (ha) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ex: 850"
                    value={propFormArea}
                    onChange={(e) => setPropFormArea(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 bg-slate-50 focus:outline-hidden focus:border-[#05521F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Município / Localização da Fazenda *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Chapecó, Cascavel, Campo Verde..."
                    value={propFormCity}
                    onChange={(e) => setPropFormCity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 bg-slate-50 focus:outline-hidden focus:border-[#05521F]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Gerente Local (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder={propertyModalSelectedClient?.contactName || 'Ex: Gerente Agrícola'}
                    value={propFormManager}
                    onChange={(e) => setPropFormManager(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 bg-slate-50 focus:outline-hidden focus:border-[#05521F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefone / Rádio Local</label>
                  <input
                    type="text"
                    placeholder={propertyModalSelectedClient?.phone || 'Ex: (00) 00000-0000'}
                    value={propFormPhone}
                    onChange={(e) => setPropFormPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 bg-slate-50 focus:outline-hidden focus:border-[#05521F]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Latitude Central</label>
                  <input
                    type="text"
                    value={propFormLat}
                    onChange={(e) => setPropFormLat(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 bg-slate-50 font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Longitude Central</label>
                  <input
                    type="text"
                    value={propFormLng}
                    onChange={(e) => setPropFormLng(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 bg-slate-50 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observações da Propriedade</label>
                <textarea
                  rows={2}
                  placeholder="Roteiro de acesso, pontos de referência ou observações da fazenda..."
                  value={propFormNotes}
                  onChange={(e) => setPropFormNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 bg-slate-50 focus:outline-hidden focus:border-[#05521F]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewPropertyOpen(false);
                    setIsEditPropertyOpen(false);
                    setEditingProperty(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#05521F] text-white font-black hover:bg-[#2E7D32] shadow-xs cursor-pointer border border-[#05521F]/30"
                >
                  {isEditPropertyOpen ? 'Atualizar Fazenda' : 'Salvar Fazenda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOVO / EDITAR TALHÃO / GLEBA (SEM ESTÁDIO DA CULTURA) */}
      {/* ========================================================================= */}
      {(isNewTalhaoOpen || isEditTalhaoOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#05521F]" />
                <h3 className="font-black text-base text-[#111827]">
                  {isEditTalhaoOpen ? 'Editar Talhão / Gleba' : 'Novo Talhão / Gleba'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsNewTalhaoOpen(false);
                  setIsEditTalhaoOpen(false);
                  setEditingTalhao(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={isEditTalhaoOpen ? handleSaveEditTalhao : handleSaveNewTalhao}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome do Talhão / Identificação *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Talhão 09 - Pivô Sul"
                  value={talhaoFormName}
                  onChange={(e) => setTalhaoFormName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 bg-slate-50 focus:outline-hidden focus:border-[#05521F]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fazenda / Propriedade *</label>
                  <select
                    required
                    value={talhaoFormPropId}
                    onChange={(e) => setTalhaoFormPropId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 bg-slate-50 font-semibold"
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.clientName} - {p.state})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Área (Hectares) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ex: 85.5"
                    value={talhaoFormArea}
                    onChange={(e) => setTalhaoFormArea(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 bg-slate-50 focus:outline-hidden focus:border-[#05521F]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cultura *</label>
                <select
                  required
                  value={talhaoFormCrop}
                  onChange={(e) => {
                    setTalhaoFormCrop(e.target.value);
                    if (e.target.value !== 'Outra' && e.target.value !== 'Outros') {
                      setTalhaoFormCustomCrop('');
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 p-2.5 bg-slate-50 font-semibold"
                >
                  {crops.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.icon ? `${c.icon} ` : ''}{c.name}
                    </option>
                  ))}
                  <option value="Outra">➕ Outra (digitar)</option>
                </select>

                {(talhaoFormCrop === 'Outra' || talhaoFormCrop === 'Outros') && (
                  <div className="mt-2">
                    <label className="block font-semibold text-slate-600 mb-1">Digite a cultura:</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Erva-mate, Melancia, Noz-pecã"
                      value={talhaoFormCustomCrop}
                      onChange={(e) => setTalhaoFormCustomCrop(e.target.value)}
                      className="w-full rounded-xl border border-emerald-400 p-2.5 bg-emerald-50/40 text-slate-800 font-semibold focus:outline-hidden focus:border-[#05521F]"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Latitude Central</label>
                  <input
                    type="text"
                    value={talhaoFormLat}
                    onChange={(e) => setTalhaoFormLat(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 bg-slate-50 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Longitude Central</label>
                  <input
                    type="text"
                    value={talhaoFormLng}
                    onChange={(e) => setTalhaoFormLng(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-2.5 bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observações Operacionais</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Relevo plano, sem obstáculos, rede de energia na divisa oeste..."
                  value={talhaoFormNotes}
                  onChange={(e) => setTalhaoFormNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-2.5 bg-slate-50 focus:outline-hidden focus:border-[#05521F]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewTalhaoOpen(false);
                    setIsEditTalhaoOpen(false);
                    setEditingTalhao(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#05521F] text-white font-black hover:bg-[#2E7D32] shadow-xs cursor-pointer border border-[#05521F]/30"
                >
                  {isEditTalhaoOpen ? 'Atualizar Talhão' : 'Salvar Talhão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: IMPORTAR KML / SHP */}
      {/* ========================================================================= */}
      {isImportKmlOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileUp className="h-5 w-5 text-emerald-600" />
                <h3 className="font-black text-base text-[#111827]">Importar Polígonos (KML / GeoJSON / Shapefile)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImportKmlOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-600">
                Importe os limites de talhões exportados do <strong>DJI Terra</strong>, <strong>Climate FieldView</strong>, <strong>Google Earth</strong> ou sistemas SIG agrícolas.
              </p>

              {/* Drag & Drop mockup */}
              <div className="border-2 border-dashed border-slate-300 hover:border-[#05521F] rounded-2xl p-8 text-center bg-slate-50 transition-colors cursor-pointer space-y-3">
                <Upload className="h-10 w-10 text-[#05521F] mx-auto" />
                <div>
                  <span className="font-bold text-slate-800 block">Arraste seu arquivo .KML, .KMZ ou .GeoJSON aqui</span>
                  <span className="text-slate-400 text-[11px]">ou clique para selecionar do computador</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100 text-emerald-900 space-y-1">
                <span className="font-black flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5" /> Formatos Compatíveis:
                </span>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  • <strong>KML / KMZ</strong>: Polígonos de voo e talhões do Google Earth e DJI Pilot 2.<br />
                  • <strong>GeoJSON / Shapefile (.zip)</strong>: Geometrias de precisão com cálculo de área automática.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsImportKmlOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const targetProp = properties[0];
                    if (!targetProp) {
                      alert('Cadastre primeiro uma fazenda.');
                      return;
                    }
                    addTalhao({
                      companyId: targetProp.companyId || currentCompany.id,
                      propertyId: targetProp.id,
                      propertyName: targetProp.name,
                      clientId: targetProp.clientId,
                      clientName: targetProp.clientName,
                      name: `Talhão KML Importado #${talhoes.length + 1}`,
                      areaHa: 94.5,
                      crop: 'Soja',
                      lastApplicationDate: new Date().toISOString().split('T')[0],
                      center: { lat: -12.544, lng: -55.722 },
                      polygon: [
                        { lat: -12.541, lng: -55.725 },
                        { lat: -12.54, lng: -55.718 },
                        { lat: -12.548, lng: -55.717 },
                        { lat: -12.549, lng: -55.724 },
                      ],
                      notes: 'Polígono importado com sucesso via arquivo KML/DJI Terra.',
                    });
                    setIsImportKmlOpen(false);
                  }}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-black hover:bg-emerald-700 shadow-xs cursor-pointer"
                >
                  Confirmar Importação de Amostra
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
