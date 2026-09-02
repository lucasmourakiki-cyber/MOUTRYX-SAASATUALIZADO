/**
 * MOUTRYX - Print & PDF Export Engine
 * Generates and downloads true A4 PDFs directly without relying on iframe-sandboxed window.print().
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { ServiceOrder, Quote, Company } from '../types';

export interface ExportPdfOptions {
  filename?: string;
  marginMm?: number;
  onStart?: () => void;
  onFinish?: () => void;
  onError?: (err: unknown) => void;
}

/**
 * Downloads any DOM element as a high-resolution PDF file.
 */
export async function downloadElementAsPdf(
  elementId: string,
  options: ExportPdfOptions = {}
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found for PDF export.`);
    return false;
  }

  try {
    options.onStart?.();

    // Render element using html2canvas with resilient settings
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1024,
      onclone: (clonedDoc) => {
        const target = clonedDoc.getElementById(elementId);
        if (target) {
          target.style.transform = 'none';
          target.style.maxHeight = 'none';
          target.style.overflow = 'visible';
        }
      },
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = options.marginMm ?? 10;
    const contentWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * contentWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, 'PNG', margin, position, contentWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight - margin * 2;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, contentWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight - margin * 2;
    }

    const outputFilename = (options.filename || 'Documento-MOUTRYX').replace(/\.pdf$/i, '') + '.pdf';
    pdf.save(outputFilename);

    options.onFinish?.();
    return true;
  } catch (err) {
    console.error('Error generating canvas PDF:', err);
    options.onError?.(err);
    return false;
  }
}

/**
 * Direct Vector PDF Generator for Service Orders (OS)
 * Fast, crisp, lightweight, and 100% reliable in any browser/sandbox environment.
 */
export function generateServiceOrderPdfVector(
  os: ServiceOrder,
  company: Company
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  let y = 14;

  // Header Banner
  doc.setFillColor(18, 60, 42); // #111827 Primary Dark
  doc.rect(10, y, pageWidth - 20, 20, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text((company.tradeName || company.name || 'MOUTRYX AGRO').toUpperCase(), 16, y + 8);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `CNPJ: ${company.cnpj || 'Não informado'} • ${company.city || ''}/${company.state || ''} • Tel: ${company.phone || company.whatsapp || 'Não informado'}`,
    16,
    y + 14
  );

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - 16, y + 8, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(company.email || '', pageWidth - 16, y + 14, { align: 'right' });

  y += 26;

  // Title Box
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(10, y, pageWidth - 20, 14, 2, 2, 'FD');

  doc.setTextColor(23, 33, 28);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('ORDEM DE SERVIÇO DE PULVERIZAÇÃO AÉREA AGRÍCOLA', pageWidth / 2, y + 6, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(47, 107, 63);
  doc.text(os.osNumber, pageWidth / 2, y + 11, { align: 'center' });

  y += 18;

  // Grid: Client Info & Operation Info
  const colWidth = (pageWidth - 24) / 2;

  // Left Card: Cliente & Local
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, y, colWidth, 42, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE & LOCAL', 14, y + 6);

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(os.clientName || 'Não informado', 14, y + 13);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`WhatsApp: ${os.clientWhatsapp || 'Não informado'}`, 14, y + 19);
  doc.text(`Propriedade: ${os.propertyName || 'Não informada'}`, 14, y + 25);
  doc.text(`Talhão / Lote: ${os.talhaoName || 'Geral'}`, 14, y + 31);
  if (os.propertyCoords && (os.propertyCoords.lat || os.propertyCoords.lng)) {
    doc.text(`Coordenadas GPS: ${os.propertyCoords.lat.toFixed(4)}, ${os.propertyCoords.lng.toFixed(4)}`, 14, y + 37);
  }

  // Right Card: Operação
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10 + colWidth + 4, y, colWidth, 42, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DA OPERAÇÃO', 14 + colWidth + 4, y + 6);

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text((os.serviceType || 'PULVERIZAÇÃO AGRÍCOLA').toUpperCase(), 14 + colWidth + 4, y + 13);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  const cropStr = os.crop || 'Não informada';
  const areaUnitStr = os.areaHa === 1 ? 'hectare' : 'hectares';
  doc.text(`Cultura: ${cropStr} • Área: ${os.areaHa} ${areaUnitStr}`, 14 + colWidth + 4, y + 19);

  const rawDate = os.scheduledDate || 'A definir';
  const scheduledTimeStr = os.scheduledTime || 'Não informado';
  doc.text(`Data/Hora Agendada: ${rawDate} às ${scheduledTimeStr}`, 14 + colWidth + 4, y + 25);

  doc.text(`Piloto Responsável: ${os.pilotName || 'Não informado'}`, 14 + colWidth + 4, y + 31);
  doc.text(`Drone / Aeronave: ${os.droneModel || 'Não informado'}`, 14 + colWidth + 4, y + 37);

  y += 46;

  // Flight & Climate Parameters Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, y, pageWidth - 20, 24, 2, 2, 'FD');

  const appParams = os.applicationParameters;
  const speedStr = appParams?.flightSpeedKmH !== undefined ? `${appParams.flightSpeedKmH} km/h` : (os.flightSpeedKmH !== undefined ? `${os.flightSpeedKmH} km/h` : 'Não informado');
  const heightStr = appParams?.flightHeightMeters !== undefined ? `${appParams.flightHeightMeters} m` : (os.flightHeightMeters !== undefined ? `${os.flightHeightMeters} m` : 'Não informado');
  const swathStr = appParams?.swathWidthMeters !== undefined ? `${appParams.swathWidthMeters} m` : (os.swathWidthMeters !== undefined ? `${os.swathWidthMeters} m` : 'Não informado');
  const caldaStr = appParams?.caldaVolumeLPerHa !== undefined ? `${appParams.caldaVolumeLPerHa} L/ha` : (os.products?.[0]?.volumeCaldaLPerHa !== undefined ? `${os.products[0].volumeCaldaLPerHa} L/ha` : 'Não informado');
  const dropletStr = appParams?.dropletSize || 'Não informado';

  doc.setFontSize(7.5);
  doc.setTextColor(47, 107, 63);
  doc.setFont('helvetica', 'bold');
  doc.text('PARÂMETROS DE APLICAÇÃO (VOO & PULVERIZAÇÃO)', 14, y + 4.5);

  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(`Velocidade: ${speedStr}  •  Altura: ${heightStr}  •  Faixa: ${swathStr}  •  Volume de Calda: ${caldaStr}  •  Tamanho de Gota: ${dropletStr}`, 14, y + 9.5);

  // Divider inside card
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y + 12.5, pageWidth - 14, y + 12.5);

  // Weather reporting (honest, no invented numbers)
  const tempStr = os.weatherConditions?.temperatureC || 'Não informado';
  const humStr = os.weatherConditions?.humidityPercent || 'Não informado';
  const windSpeedStr = os.weatherConditions?.windSpeedKmH || 'Não informado';
  const windDirStr = os.weatherConditions?.windDirection ? ` (${os.weatherConditions.windDirection})` : '';

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('CONDIÇÕES CLIMÁTICAS DA APLICAÇÃO', 14, y + 16.5);

  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Temperatura: ${tempStr}  •  Umidade Relativa: ${humStr}  •  Vento: ${windSpeedStr}${windDirStr}`,
    14,
    y + 21
  );

  y += 28;

  // Products Table (AGROFIT/MAPA)
  doc.setFontSize(9);
  doc.setTextColor(23, 33, 28);
  doc.setFont('helvetica', 'bold');
  doc.text('PRODUTOS FITOSSANITÁRIOS E DOSAGENS (AGROFIT/MAPA)', 10, y);

  y += 2;

  const productRows = (os.products || []).map((p) => [
    p.commercialName,
    p.activeIngredient || 'Personalizado',
    p.targetPest || 'Geral',
    `${p.dosePerHa} ${p.unit}/ha`,
    `${p.plannedTotalQty?.toFixed(1) || '-'} ${p.unit.replace('/ha', '')}`,
  ]);

  if (productRows.length === 0) {
    productRows.push(['Não informado', '-', '-', '-', '-']);
  }

  autoTable(doc, {
    startY: y,
    head: [['Produto', 'Ingrediente Ativo', 'Alvo / Finalidade', 'Dose / ha', 'Qtd Planejada']],
    body: productRows,
    theme: 'grid',
    headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    margin: { left: 10, right: 10 },
  });

  // @ts-expect-error autoTable extends jsPDF doc
  y = (doc.lastAutoTable?.finalY || y + 30) + 5;

  // Payment Terms & Financial Summary Box
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(10, y, pageWidth - 20, 18, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(22, 101, 52);
  doc.setFont('helvetica', 'bold');
  doc.text('FORMA DE PAGAMENTO & VALORES', 14, y + 5);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);

  const paymentStr = os.paymentMethod || os.paymentTerms || 'Não informado';
  const harvestDateStr = (os.paymentMethod === 'PAGAMENTO SAFRA' && os.harvestPaymentDate)
    ? ` • Data Prevista Safra: ${os.harvestPaymentDate.split('-').reverse().join('/')}`
    : '';

  doc.text(`Forma: ${paymentStr}${harvestDateStr}`, 14, y + 11);
  doc.text(
    `Preço/ha: R$ ${(os.pricePerHa || 0).toFixed(2)} • Subtotal: R$ ${(os.grossAmount || 0).toFixed(2)}${os.displacementFee ? ` • Deslocamento: R$ ${os.displacementFee.toFixed(2)}` : ''}${os.discount ? ` • Desconto: -R$ ${os.discount.toFixed(2)}` : ''}`,
    14,
    y + 15
  );

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52);
  doc.text(`TOTAL: R$ ${(os.finalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - 14, y + 12, { align: 'right' });

  y += 22;

  // Observations / Operational Notes (if any)
  const weatherNotes = os.weatherConditions?.notes;
  const generalNotes = os.notes;
  if (generalNotes || weatherNotes) {
    doc.setFillColor(254, 252, 232);
    doc.setDrawColor(254, 240, 138);
    doc.roundedRect(10, y, pageWidth - 20, 14, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setTextColor(133, 77, 14);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES OPERACIONAIS & CLIMÁTICAS:', 14, y + 5);

    doc.setFont('helvetica', 'normal');
    const combinedNotes = [
      generalNotes ? `Obs: ${generalNotes}` : '',
      weatherNotes ? `Clima: ${weatherNotes}` : '',
    ].filter(Boolean).join(' | ');

    doc.text(doc.splitTextToSize(combinedNotes, pageWidth - 28), 14, y + 10);
    y += 18;
  }

  // Legal Agronomic Disclaimer
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  const legalText =
    'Declaro que as aplicações foram executadas conforme parâmetros agronômicos, limites de vento e temperatura estipulados pela legislação vigente do MAPA/ANAC para aplicação aérea com RPA. O contratante atesta o recebimento dos serviços de pulverização.';
  doc.text(doc.splitTextToSize(legalText, pageWidth - 20), 10, y);

  y += 14;

  // Signatures
  doc.setDrawColor(148, 163, 184);
  doc.line(20, y + 8, 90, y + 8);
  doc.line(120, y + 8, 190, y + 8);

  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('Assinatura do Piloto Responsável', 55, y + 12, { align: 'center' });
  doc.text('Assinatura do Produtor / Contratante', 155, y + 12, { align: 'center' });

  doc.save(`OS-${os.osNumber}.pdf`);
}

/**
 * Direct Vector PDF Generator for Quotes / Commercial Proposals
 */
export function generateQuotePdfVector(
  quote: Quote,
  company: Company
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  let y = 14;

  // Header Banner
  doc.setFillColor(18, 60, 42);
  doc.rect(10, y, pageWidth - 20, 20, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text((company.tradeName || company.name || 'MOUTRYX AGRO').toUpperCase(), 16, y + 8);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `CNPJ: ${company.cnpj || 'Não informado'} • ${company.city || ''}/${company.state || ''} • Tel: ${company.phone || company.whatsapp || 'Não informado'}`,
    16,
    y + 14
  );

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`PROPOSTA COMERCIAL`, pageWidth - 16, y + 8, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Validade: ${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('pt-BR') : '15 dias'}`, pageWidth - 16, y + 14, { align: 'right' });

  y += 26;

  // Title
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(10, y, pageWidth - 20, 14, 2, 2, 'FD');

  doc.setTextColor(23, 33, 28);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PROPOSTA COMERCIAL DE PULVERIZAÇÃO AGRÍCOLA', pageWidth / 2, y + 6, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(47, 107, 63);
  doc.text(quote.quoteNumber, pageWidth / 2, y + 11, { align: 'center' });

  y += 18;

  // Client Info
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, y, pageWidth - 20, 24, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE & PROPRIEDADE', 14, y + 5);

  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(quote.clientName || 'Cliente', 14, y + 11);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`WhatsApp: ${quote.clientWhatsapp || 'Não informado'}`, 14, y + 17);
  doc.text(`Fazenda / Local: ${quote.propertyName || 'Não informada'}`, 80, y + 17);
  doc.text(`Cultura: ${quote.crop || 'Não informada'}`, 150, y + 17);

  y += 28;

  // Services Table
  doc.setFontSize(9);
  doc.setTextColor(23, 33, 28);
  doc.setFont('helvetica', 'bold');
  doc.text('DISCRIMINAÇÃO DOS SERVIÇOS E VALORES', 10, y);

  y += 2;

  const tableRows = [
    [
      quote.serviceType || 'Pulverização com Drone Agrícola',
      `${quote.areaHa || 0} ha`,
      `R$ ${(quote.pricePerHa || 0).toFixed(2)}`,
      `R$ ${((quote.areaHa || 0) * (quote.pricePerHa || 0)).toFixed(2)}`,
    ],
  ];

  if (quote.displacementFee && quote.displacementFee > 0) {
    tableRows.push(['Taxa de Deslocamento / Mobilização de Equipe', '1 un', `R$ ${quote.displacementFee.toFixed(2)}`, `R$ ${quote.displacementFee.toFixed(2)}`]);
  }

  if (quote.discount && quote.discount > 0) {
    tableRows.push(['Desconto Comercial Concedido', '-', `- R$ ${quote.discount.toFixed(2)}`, `- R$ ${quote.discount.toFixed(2)}`]);
  }

  autoTable(doc, {
    startY: y,
    head: [['Descrição do Serviço', 'Área / Qtd', 'Valor Unitário', 'Total']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
    margin: { left: 10, right: 10 },
  });

  // @ts-expect-error autoTable extends jsPDF doc
  y = (doc.lastAutoTable?.finalY || y + 30) + 6;

  // Grand Total Box
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(pageWidth - 80, y, 70, 16, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(22, 101, 52);
  doc.setFont('helvetica', 'bold');
  doc.text('VALOR TOTAL DA PROPOSTA:', pageWidth - 75, y + 6);

  doc.setFontSize(13);
  doc.text(`R$ ${(quote.finalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - 75, y + 12);

  y += 22;

  // Payment Conditions & Notes
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, y, pageWidth - 20, 20, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('CONDIÇÕES DE PAGAMENTO E OBSERVAÇÕES', 14, y + 5);

  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(`Forma de Pagamento: ${quote.paymentTerms || 'A combinar / 30 dias'}`, 14, y + 11);
  if (quote.notes) {
    doc.text(`Obs: ${quote.notes}`, 14, y + 16);
  }

  y += 28;

  // Signatures
  doc.setDrawColor(148, 163, 184);
  doc.line(20, y + 8, 90, y + 8);
  doc.line(120, y + 8, 190, y + 8);

  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text(company.tradeName || 'MOUTRYX AGRO', 55, y + 12, { align: 'center' });
  doc.text('De Acordo do Contratante', 155, y + 12, { align: 'center' });

  doc.save(`Proposta-${quote.quoteNumber}.pdf`);
}

/**
 * Direct print trigger on the main window with sandbox detection
 */
export function printDirect(elementId?: string, title?: string): void {
  // Check if running inside a sandboxed iframe
  const isInsideIframe = window.self !== window.top;
  
  if (isInsideIframe && elementId) {
    // If inside sandboxed iframe, open dedicated printable tab to avoid "Ignored call to print() sandbox" warning
    openPrintableTab(elementId, title || 'Documento MOUTRYX');
    return;
  }

  try {
    window.print();
  } catch (e) {
    console.warn('window.print() not available in this environment, opening tab instead:', e);
    if (elementId) {
      openPrintableTab(elementId, title || 'Documento MOUTRYX');
    }
  }
}

/**
 * Opens a clean, standalone printable document in a new browser tab.
 */
export function openPrintableTab(elementId: string, title: string = 'Documento MOUTRYX'): void {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found.`);
    return;
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4 portrait; margin: 12mm 15mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #111827;
      background: #FFFFFF;
      padding: 24px;
      max-width: 820px;
      margin: 0 auto;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    .gap-2 { gap: 0.5rem; }
    .gap-3 { gap: 0.75rem; }
    .gap-4 { gap: 1rem; }
    .grid { display: grid; }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .font-black { font-weight: 900; }
    .uppercase { text-transform: uppercase; }
    .text-xs { font-size: 8.5pt; }
    .text-sm { font-size: 10pt; }
    .text-base { font-size: 11.5pt; }
    .text-lg { font-size: 13pt; }
    .p-3 { padding: 0.75rem; }
    .p-4 { padding: 1rem; }
    .border { border: 1px solid #cbd5e1; }
    .rounded-xl { border-radius: 0.75rem; }
    .rounded-2xl { border-radius: 1rem; }
    .bg-slate-50 { background-color: #f8fafc; }
    .bg-slate-100 { background-color: #f1f5f9; }
    .text-slate-500 { color: #64748b; }
    .text-slate-700 { color: #334155; }
    .text-slate-800 { color: #1e293b; }
    table { width: 100%; border-collapse: collapse; margin: 0.5rem 0; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 8.5pt; text-align: left; }
    th { background: #f1f5f9; font-weight: bold; }
    .top-actions {
      margin-bottom: 24px;
      padding: 14px 18px;
      background: #111827;
      color: #FFFFFF;
      border-radius: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .print-btn {
      background: #05521F;
      color: white;
      border: 1px solid #05521F;
      padding: 9px 18px;
      border-radius: 8px;
      font-weight: bold;
      cursor: pointer;
      font-size: 13px;
    }
    @media print {
      .top-actions { display: none !important; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="top-actions">
    <div>
      <strong style="font-size: 15px;">MOUTRYX — Documento Oficial</strong>
      <div style="font-size: 12px; color: #667085; margin-top: 2px;">
        Clique no botão para imprimir ou salvar como PDF no seu computador.
      </div>
    </div>
    <button class="print-btn" onclick="window.print()">Imprimir / Salvar PDF</button>
  </div>
  <div class="print-container">
    ${element.innerHTML}
  </div>
</body>
</html>
  `;

  const printWindow = window.open('', '_blank');
  if (!printWindow) throw new Error('Não foi possível abrir a janela de impressão.');
  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
}
