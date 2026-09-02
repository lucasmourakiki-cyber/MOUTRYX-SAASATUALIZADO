import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BarChart3,
  Download,
  Calendar,
  Layers,
  DollarSign,
  TrendingUp,
  FileText,
  Printer,
  Sparkles,
  Users,
  Sprout,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { downloadElementAsPdf, printDirect, openPrintableTab } from '../../utils/printHelper';
import { getTemporalContext } from '../../utils/temporalEngine';

export const ReportsView: React.FC = () => {
  const { metrics, serviceOrders, accountsReceivable, accountsPayable, pilots, pilotCommissions = [], currentCompany } = useApp();
  const temporal = getTemporalContext();

  const [reportType, setReportType] = useState<'operacional' | 'financeiro' | 'safra' | 'pilotos'>('operacional');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Dynamic calculations for Safra report (using completed operations & actual sprayed hectares)
  const cropStats = React.useMemo(() => {
    const map = new Map<string, { crop: string; totalHa: number; revenue: number; estimatedCost: number; count: number }>();
    (serviceOrders || []).forEach((os) => {
      if (os.status === 'cancelado') return;
      const isCompleted = os.status === 'concluido' || os.status === 'faturado' || os.status === 'pago';
      const cropName = os.crop || 'Outras';
      const current = map.get(cropName) || { crop: cropName, totalHa: 0, revenue: 0, estimatedCost: 0, count: 0 };
      if (isCompleted && typeof os.actualAreaSprayedHa === 'number' && os.actualAreaSprayedHa > 0) {
        current.totalHa += os.actualAreaSprayedHa;
      }
      if (isCompleted) {
        current.revenue += os.finalAmount || 0;
      }
      current.estimatedCost += os.estimatedCost || 0;
      current.count += 1;
      map.set(cropName, current);
    });
    return Array.from(map.values());
  }, [serviceOrders]);

  // Dynamic calculations for Pilot productivity report (using completed operations)
  const pilotStats = React.useMemo(() => {
    return (pilots || []).map((p) => {
      const pilotOS = (serviceOrders || []).filter((os) => os.pilotId === p.id && os.status !== 'cancelado');
      const completedPilotOS = pilotOS.filter((os) => os.status === 'concluido' || os.status === 'faturado' || os.status === 'pago');
      const totalHa = completedPilotOS.reduce((acc, os) => {
        const ha = typeof os.actualAreaSprayedHa === 'number' && os.actualAreaSprayedHa > 0 ? os.actualAreaSprayedHa : 0;
        return acc + ha;
      }, 0);
      const totalHours = completedPilotOS.reduce((acc, os) => acc + (os.flightHoursRecorded || 0), 0);
      const pComms = (pilotCommissions || []).filter((c) => c.pilotId === p.id);
      const totalCommission = pComms.reduce((acc, c) => acc + (c.commissionAmount || 0), 0);
      const paidCommission = pComms
        .filter((c) => c.status === 'paga')
        .reduce((acc, c) => acc + (c.commissionAmount || 0), 0);
      return {
        id: p.id,
        name: p.name,
        anacCode: p.anacCode || 'ANAC-N/A',
        totalOS: pilotOS.length,
        totalHa,
        totalHours,
        totalCommission,
        paidCommission,
      };
    });
  }, [pilots, serviceOrders, pilotCommissions]);

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (reportType === 'operacional') {
      csvContent += 'Numero_OS,Cliente,Propriedade,Cultura,Area_Planejada_ha,Area_Aplicada_Real_ha,Piloto,Drone,Volume_Calda_L_ha,Status\n';
      serviceOrders.forEach((os) => {
        const caldaVol = os.products?.[0]?.volumeCaldaLPerHa || 10;
        const actualHa = typeof os.actualAreaSprayedHa === 'number' && os.actualAreaSprayedHa > 0 ? os.actualAreaSprayedHa : '';
        csvContent += `"${os.osNumber}","${os.clientName}","${os.propertyName}","${os.crop}",${os.areaHa},"${actualHa}","${os.pilotName}","${os.droneModel}",${caldaVol},"${os.status}"\n`;
      });
    } else if (reportType === 'financeiro') {
      csvContent += 'Numero_OS,Cliente,Valor_Faturado,Custo_Estimado_OS,Margem_Estimada_R$,Margem_Estimada_Percent,Status\n';
      serviceOrders.forEach((os) => {
        const net = (os.finalAmount || 0) - (os.estimatedCost || 0);
        const marginPct = os.finalAmount > 0 ? ((net / os.finalAmount) * 100).toFixed(1) : '0';
        csvContent += `"${os.osNumber}","${os.clientName}",${os.finalAmount},${os.estimatedCost || 0},${net},${marginPct}%,"${os.status}"\n`;
      });
    } else if (reportType === 'safra') {
      csvContent += 'Cultura,Total_Hectares_Realizados,Faturamento_Realizado_R$,Custo_Estimado_OS_R$,Margem_Estimada_R$,Qtd_Missoes\n';
      cropStats.forEach((c) => {
        const net = c.revenue - c.estimatedCost;
        csvContent += `"${c.crop}",${c.totalHa.toFixed(1)},${c.revenue},${c.estimatedCost},${net},${c.count}\n`;
      });
    } else if (reportType === 'pilotos') {
      csvContent += 'Piloto,Codigo_ANAC,Missoes_Totais,Hectares_Realizados,Horas_Voo,Comissao_Total_R$,Comissao_Paga_R$\n';
      pilotStats.forEach((p) => {
        csvContent += `"${p.name}","${p.anacCode}",${p.totalOS},${p.totalHa.toFixed(1)},${p.totalHours.toFixed(1)},${p.totalCommission},${p.paidCommission}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Relatorio_MOUTRYX_${reportType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-[#05521F]" />
            <h1 className="text-xl sm:text-2xl font-black text-[#111827]">Relatórios & Análise de Safras</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Exportação de dados operacionais, comparativo de safras e fechamentos gerenciais
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold transition-colors shadow-xs cursor-pointer"
          >
            <Download className="h-4 w-4" /> Exportar Planilha (CSV)
          </button>
          <button
            onClick={() => openPrintableTab('printable-report', `Relatório ${reportType.toUpperCase()} - MOUTRYX`)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer"
            title="Abrir em nova aba do navegador"
          >
            <ExternalLink className="h-4 w-4" /> Nova Aba
          </button>
          <button
            onClick={() => printDirect('printable-report', `Relatório ${reportType.toUpperCase()}`)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 cursor-pointer shadow-xs"
            title="Imprimir relatório em formato A4"
          >
            <Printer className="h-4 w-4 text-[#05521F]" /> Imprimir
          </button>
          <button
            disabled={isGeneratingPdf}
            onClick={async () => {
              setIsGeneratingPdf(true);
              await downloadElementAsPdf('printable-report', { filename: `Relatorio-${reportType.toUpperCase()}` });
              setIsGeneratingPdf(false);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-[#05521F] hover:bg-[#2E7D32] disabled:bg-slate-400 text-white px-4 py-2 text-xs font-black shadow-xs transition-colors cursor-pointer border border-[#05521F]/30"
            title="Baixar arquivo PDF no seu computador"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Gerando PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" /> Baixar PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Report Types Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
        <button
          onClick={() => setReportType('operacional')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            reportType === 'operacional'
              ? 'border-[#05521F] bg-emerald-50/50 shadow-xs'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <Layers className="h-5 w-5 text-[#05521F] mb-2" />
          <h4 className="font-extrabold text-sm text-[#111827]">Operacional</h4>
          <p className="text-xs text-slate-500 mt-0.5">Hectares, culturas e talhões</p>
        </button>

        <button
          onClick={() => setReportType('financeiro')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            reportType === 'financeiro'
              ? 'border-[#05521F] bg-emerald-50/50 shadow-xs'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <DollarSign className="h-5 w-5 text-emerald-600 mb-2" />
          <h4 className="font-extrabold text-sm text-[#111827]">Financeiro</h4>
          <p className="text-xs text-slate-500 mt-0.5">Faturamento, custos e margem</p>
        </button>

        <button
          onClick={() => setReportType('safra')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            reportType === 'safra'
              ? 'border-[#05521F] bg-emerald-50/50 shadow-xs'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <Calendar className="h-5 w-5 text-purple-600 mb-2" />
          <h4 className="font-extrabold text-sm text-[#111827]">Safra {temporal.lastYear}/{temporal.currentYear}</h4>
          <p className="text-xs text-slate-500 mt-0.5">Evolução por cultura</p>
        </button>

        <button
          onClick={() => setReportType('pilotos')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            reportType === 'pilotos'
              ? 'border-[#05521F] bg-emerald-50/50 shadow-xs'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <TrendingUp className="h-5 w-5 text-amber-600 mb-2" />
          <h4 className="font-extrabold text-sm text-[#111827]">Pilotos & Comissões</h4>
          <p className="text-xs text-slate-500 mt-0.5">Produtividade por piloto</p>
        </button>
      </div>

      {/* Report Data Table Preview */}
      <div id="printable-report" className="printable-document rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-black text-base text-[#111827]">
              Relatório Gerencial: {reportType.toUpperCase()}
            </h3>
            <p className="text-xs text-slate-500">
              {currentCompany.tradeName || currentCompany.name} • CNPJ: {currentCompany.cnpj || 'Não informado'}
            </p>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            {reportType === 'safra'
              ? `${cropStats.length} culturas consolidadas`
              : reportType === 'pilotos'
              ? `${pilotStats.length} pilotos registrados`
              : `${serviceOrders.length} ordens de serviço`} • Emissão: {new Date().toLocaleDateString('pt-BR')}
          </span>
        </div>

        <div className="overflow-x-auto">
          {/* 1. OPERATIONAL TABLE */}
          {reportType === 'operacional' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">OS</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Propriedade</th>
                  <th className="py-2.5 px-3">Cultura</th>
                  <th className="py-2.5 px-3">Área Plan. (ha)</th>
                  <th className="py-2.5 px-3">Área Real (ha)</th>
                  <th className="py-2.5 px-3">Piloto</th>
                  <th className="py-2.5 px-3">Drone</th>
                  <th className="py-2.5 px-3">Calda</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {serviceOrders.map((os) => {
                  const actualHa = typeof os.actualAreaSprayedHa === 'number' && os.actualAreaSprayedHa > 0 ? os.actualAreaSprayedHa : null;
                  return (
                    <tr key={os.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-[#05521F]">{os.osNumber}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{os.clientName}</td>
                      <td className="py-2.5 px-3 text-slate-600">{os.propertyName}</td>
                      <td className="py-2.5 px-3 text-slate-600">{os.crop}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">{os.areaHa} ha</td>
                      <td className="py-2.5 px-3 font-bold text-[#05521F]">{actualHa !== null ? `${actualHa.toFixed(1)} ha` : '--'}</td>
                      <td className="py-2.5 px-3 text-slate-700">{os.pilotName}</td>
                      <td className="py-2.5 px-3 text-slate-600">{os.droneModel}</td>
                      <td className="py-2.5 px-3 text-slate-600">{(os.products?.[0]?.volumeCaldaLPerHa) || 10} L/ha</td>
                      <td className="py-2.5 px-3">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                          {os.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* 2. FINANCIAL TABLE */}
          {reportType === 'financeiro' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">OS</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Cultura</th>
                  <th className="py-2.5 px-3 text-right">Faturamento</th>
                  <th className="py-2.5 px-3 text-right">Custo Estimado (OS)</th>
                  <th className="py-2.5 px-3 text-right">Margem Prevista</th>
                  <th className="py-2.5 px-3 text-right">Margem Prev. %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {serviceOrders.map((os) => {
                  const net = (os.finalAmount || 0) - (os.estimatedCost || 0);
                  const marginPct = os.finalAmount > 0 ? (net / os.finalAmount) * 100 : 0;
                  return (
                    <tr key={os.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-[#05521F]">{os.osNumber}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{os.clientName}</td>
                      <td className="py-2.5 px-3 text-slate-600">{os.crop}</td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900">
                        R$ {(os.finalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-700 font-semibold">
                        R$ {(os.estimatedCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                        R$ {net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-700">
                        {marginPct.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* 3. SAFRA TABLE */}
          {reportType === 'safra' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Cultura</th>
                  <th className="py-2.5 px-3">Total de Aplicações</th>
                  <th className="py-2.5 px-3">Área Total Aplicada (ha)</th>
                  <th className="py-2.5 px-3 text-right">Faturamento Realizado</th>
                  <th className="py-2.5 px-3 text-right">Custo Estimado (OS)</th>
                  <th className="py-2.5 px-3 text-right">Margem Prevista</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cropStats.map((c) => {
                  const net = c.revenue - c.estimatedCost;
                  return (
                    <tr key={c.crop} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-[#111827]">{c.crop}</td>
                      <td className="py-2.5 px-3 text-slate-600">{c.count} missões</td>
                      <td className="py-2.5 px-3 font-extrabold text-[#05521F]">{c.totalHa.toFixed(1)} ha</td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900">
                        R$ {c.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-700 font-semibold">
                        R$ {c.estimatedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                        R$ {net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* 4. PILOTS TABLE */}
          {reportType === 'pilotos' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Piloto Responsável</th>
                  <th className="py-2.5 px-3">Registro ANAC</th>
                  <th className="py-2.5 px-3">Missões (OS)</th>
                  <th className="py-2.5 px-3">Área Aplicada</th>
                  <th className="py-2.5 px-3">Horas Voo</th>
                  <th className="py-2.5 px-3 text-right">Comissões Geradas</th>
                  <th className="py-2.5 px-3 text-right">Comissões Pagas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pilotStats.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-[#111827]">{p.name}</td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono">{p.anacCode}</td>
                    <td className="py-2.5 px-3 font-semibold">{p.totalOS} OSs</td>
                    <td className="py-2.5 px-3 font-bold text-[#05521F]">{p.totalHa.toFixed(1)} ha</td>
                    <td className="py-2.5 px-3 text-slate-700">{p.totalHours.toFixed(1)}h</td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900">
                      R$ {p.totalCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                      R$ {p.paidCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
