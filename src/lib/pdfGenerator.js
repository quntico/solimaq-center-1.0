import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Helper to fetch image and convert to base64
const toBase64 = async (url) => {
  try {
    if (!url) return null;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
};

const formatCurrency = (value, currency = 'USD') => {
  if (typeof value !== 'number' || isNaN(value)) return currency === 'USD' ? '$0.00' : '$0.00 MXN';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(value);
};

const addClientHeader = async (doc, quotationData, margin) => {
  const pageWidth = doc.internal.pageSize.width;

  // Logo SMQ
  const logoUrl = '/smq-logo.png'; // Assumes file is in public folder
  try {
    const logoBase64 = await toBase64(logoUrl);
    if (logoBase64) {
      const logoWidth = 85; // Approx 3cm
      const logoHeight = 85; // Approx 3cm
      const logoX = (pageWidth - logoWidth) / 2;
      doc.addImage(logoBase64, 'PNG', logoX, 20, logoWidth, logoHeight);
    }
  } catch (e) {
    console.error("Could not add logo to PDF:", e);
  }

  let cursorY = 120; // Start text after logo

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  const clientInfo = [
    { label: 'CLIENTE:', value: quotationData.client || 'N/A' },
    { label: 'EMPRESA:', value: quotationData.company || 'SMQ' },
    { label: 'PROYECTO:', value: quotationData.project || 'N/A' },
  ];

  let leftCursorY = cursorY;
  clientInfo.forEach(info => {
    doc.text(info.label, margin, leftCursorY);
    doc.setFont('helvetica', 'normal');
    doc.text(info.value, margin + 55, leftCursorY);
    doc.setFont('helvetica', 'bold');
    leftCursorY += 12;
  });

  const dateLabel = 'FECHA:';
  const dateText = format(new Date(), "dd 'de' MMMM, yyyy", { locale: es });
  const dateLabelWidth = doc.getStringUnitWidth(dateLabel) * doc.getFontSize() / doc.internal.scaleFactor;
  const dateTextWidth = doc.getStringUnitWidth(dateText) * doc.getFontSize() / doc.internal.scaleFactor;
  const dateBlockX = pageWidth - margin - dateTextWidth - dateLabelWidth - 5;

  doc.setFont('helvetica', 'bold');
  doc.text(dateLabel, dateBlockX, cursorY);
  doc.setFont('helvetica', 'normal');
  doc.text(dateText, dateBlockX + dateLabelWidth + 5, cursorY);

  return leftCursorY;
};

const addFooter = (doc) => {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  const text = "SMQ INTERNACIONAL - DIRECCIÓN DE VENTAS";
  doc.text(text, pageWidth / 2, pageHeight - 25, { align: 'center' });
};

export const generateCotizadorPDF = async (pdfData) => {
  const { quotationData, costConfig, calculatedCosts, subtotals } = pdfData;
  const { costoMaquina, totalOpcionales, utilidad_usd, comision_usd, comision_mxn, subtotalBeforeProfit } = subtotals;

  const doc = new jsPDF('p', 'pt', 'a4');
  const brandColor = '#0052CC';
  const textColor = [0, 0, 0];
  const headerTextColor = [255, 255, 255];
  const alternateRowColor = [245, 245, 245];
  const margin = 30;

  let cursorY = await addClientHeader(doc, quotationData, margin);
  cursorY += 10;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(brandColor);
  doc.text('RADIOGRAFÍA DE COTIZACIÓN', doc.internal.pageSize.width / 2, cursorY, { align: 'center' });
  cursorY += 20;

  const tableStyles = (specificMargin) => ({
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 4,
      textColor: textColor,
      lineColor: [220, 220, 220],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: brandColor,
      textColor: headerTextColor,
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: alternateRowColor,
    },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
    },
    margin: specificMargin,
  });

  const addSectionTitle = (title, y, x = margin) => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(brandColor);
    doc.text(title, x, y);
    return y + 15;
  };

  cursorY = addSectionTitle('Costos Directos', cursorY);
  const costosBody = [
    ['Costo China (USD)', formatCurrency(costConfig.costo_china)],
    ['Incoterm', costConfig.incoterm],
    ['Costo Terrestre China (USD)', formatCurrency(costConfig.costo_terrestre_china)],
    ['Marítimo (USD)', formatCurrency(costConfig.maritimo)],
    ['Terrestre Nacional (USD)', formatCurrency(costConfig.terrestre_nacional)],
    ['Instalación (USD)', formatCurrency(costConfig.instalacion)],
    [{ content: 'Costo Máquina (Subtotal)', styles: { fillColor: alternateRowColor, fontStyle: 'bold' } }, { content: formatCurrency(costoMaquina), styles: { fillColor: alternateRowColor, fontStyle: 'bold' } }],
  ];
  doc.autoTable({ head: [['Concepto', 'Valor']], body: costosBody, startY: cursorY, ...tableStyles({ left: margin, right: margin }) });
  cursorY = doc.autoTable.previous.finalY + 15;

  if (costConfig.optionals && costConfig.optionals.length > 0) {
    cursorY = addSectionTitle('Opcionales', cursorY);
    const opcionalesBody = costConfig.optionals.map(opt => {
      const cost = Number(opt.cost) || 0;
      const factor = Number(opt.factor) || 1.6;
      const sellingPrice = cost * factor;
      return [opt.name, formatCurrency(cost), formatCurrency(sellingPrice)];
    });

    // Calculate totals
    const totalCost = costConfig.optionals.reduce((sum, opt) => sum + (Number(opt.cost) || 0), 0);
    const totalSellingPrice = costConfig.optionals.reduce((sum, opt) => sum + ((Number(opt.cost) || 0) * (Number(opt.factor) || 1.6)), 0);

    opcionalesBody.push([
      { content: 'Total Opcionales', styles: { fillColor: alternateRowColor, fontStyle: 'bold' } },
      { content: formatCurrency(totalCost), styles: { fillColor: alternateRowColor, fontStyle: 'bold' } },
      { content: formatCurrency(totalSellingPrice), styles: { fillColor: alternateRowColor, fontStyle: 'bold' } }
    ]);

    doc.autoTable({
      head: [['Descripción', 'Costo (USD)', 'Precio Venta (USD)']],
      body: opcionalesBody,
      startY: cursorY,
      ...tableStyles({ left: margin, right: margin }),
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right' },
        2: { halign: 'right' },
      },
    });
    cursorY = doc.autoTable.previous.finalY + 15;
  }

  const pageWidth = doc.internal.pageSize.width;
  const gap = 10;
  const leftColumnX = margin;
  const rightColumnX = pageWidth / 2 + gap / 2;
  const columnWidth = pageWidth / 2 - margin - gap / 2;

  const formatCalculationParam = (param, value_usd) => {
    if (param.type === 'percent') {
      return `${param.value.toFixed(2)}% (${formatCurrency(value_usd)})`;
    }
    return `${formatCurrency(param.value, param.type)} (${formatCurrency(value_usd)})`;
  };

  let paramsCursorY = addSectionTitle('Parámetros de Cálculo', cursorY, leftColumnX);
  const paramsBody = [
    ['Utilidad', formatCalculationParam(costConfig.utilidad, utilidad_usd)],
    ['Comisión', formatCalculationParam(costConfig.comision, comision_usd)],
    ['Impuestos de Importación', `${costConfig.impuestos_percent}%`],
    ['Tipo de Cambio (USD a MXN)', formatCurrency(costConfig.tipo_cambio, 'MXN')],
  ];
  doc.autoTable({
    head: [['Parámetro', 'Valor']],
    body: paramsBody,
    startY: paramsCursorY,
    ...tableStyles({ left: leftColumnX, right: pageWidth - leftColumnX - columnWidth })
  });
  const paramsFinalY = doc.autoTable.previous.finalY;

  let resumenCursorY = addSectionTitle('Resumen Financiero', cursorY, rightColumnX);
  const resumenBody = [
    ['Subtotal', formatCurrency(subtotalBeforeProfit)],
    ['Utilidad', formatCurrency(utilidad_usd)],
    ['Comisión', `${formatCurrency(comision_usd)} (${formatCurrency(comision_mxn, 'MXN')})`],
    ['Precio Venta (USD)', formatCurrency(calculatedCosts.precio_venta)],
    ['Precio Venta (MXN)', formatCurrency(calculatedCosts.precio_venta_mxn, 'MXN')],
    ['I.V.A. (16%)', `${formatCurrency(calculatedCosts.iva)} (${formatCurrency(calculatedCosts.iva_mxn, 'MXN')})`],
    [{ content: 'TOTAL (USD)', styles: { fontStyle: 'bold', textColor: brandColor, fontSize: 9 } }, { content: formatCurrency(calculatedCosts.neto), styles: { fontStyle: 'bold', textColor: brandColor, fontSize: 9 } }],
    [{ content: 'TOTAL (MXN)', styles: { fontStyle: 'bold', textColor: brandColor, fontSize: 9 } }, { content: formatCurrency(calculatedCosts.neto_mxn, 'MXN'), styles: { fontStyle: 'bold', textColor: brandColor, fontSize: 9 } }],
    [{ content: 'Factor', styles: { fontStyle: 'bold', fontSize: 9 } }, { content: calculatedCosts.factor.toFixed(2), styles: { fontStyle: 'bold', fontSize: 9 } }],
  ];
  doc.autoTable({
    head: [['Concepto', 'Valor']],
    body: resumenBody,
    startY: resumenCursorY,
    ...tableStyles({ left: rightColumnX, right: margin })
  });
  const resumenFinalY = doc.autoTable.previous.finalY;

  cursorY = Math.max(paramsFinalY, resumenFinalY) + 20;

  addFooter(doc);
  doc.save(`Radiografia_Cotizacion_${quotationData.project.replace(/\s/g, '_')}_${format(new Date(), "yyyyMMdd")}.pdf`);
};


export const generateFichasTecnicasPDF = async (fichas, quotationData) => {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;

  const margin = 20;
  let cursorY = margin;

  const addFichaHeader = async () => {
    // Black Header Background (Reverted to 30mm as requested, with maximized logo)
    const headerHeight = 30;
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');

    // Logo
    let logoAdded = false;
    if (quotationData.logo) {
      const logoBase64 = await toBase64(quotationData.logo);
      if (logoBase64) {
        const imgProps = doc.getImageProperties(logoBase64);
        // Maximize logo within 30mm header
        // User liked the large logo, so we fill the 30mm header almost entirely.
        const maxHeight = 28; // Leaves 1mm padding top/bottom
        const maxWidth = 150;

        let logoWidth = imgProps.width;
        let logoHeight = imgProps.height;

        // Scale to fit constraints
        const ratio = Math.min(maxWidth / logoWidth, maxHeight / logoHeight);
        logoWidth *= ratio;
        logoHeight *= ratio;

        // Center vertically in header
        const logoY = (headerHeight - logoHeight) / 2;

        doc.addImage(logoBase64, 'PNG', margin, logoY, logoWidth, logoHeight);
        logoAdded = true;
      }
    }

    // Fallback Logo Text if no image
    if (!logoAdded) {
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 160, 255); // Cyan-ish Blue
      doc.text('SMQ', margin, 20);
    }

    // Header Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 100, 255); // Blue
    // Align vertically roughly with logo center (approx Y=20 for 30mm height)
    doc.text('FICHAS TÉCNICAS', pageWidth - margin, 20, { align: 'right' });

    // Client Info Section
    cursorY = headerHeight + 10; // Start 1cm below header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    const lineHeight = 5; // Compact line height

    doc.text(`Cliente: ${quotationData.client || 'N/A'}`, margin, cursorY);
    cursorY += lineHeight;
    doc.text(`Proyecto: ${quotationData.project || 'N/A'}`, margin, cursorY);
    cursorY += lineHeight;

    const now = new Date();
    const formattedDate = format(now, "d 'de' MMMM 'de' yyyy", { locale: es });
    doc.text(`Fecha: ${formattedDate}`, margin, cursorY);

    cursorY += 15; // Space before content
  };

  await addFichaHeader();

  for (const ficha of fichas) {
    // Check space for Title + Image (approx)
    if (cursorY > pageHeight - 100) {
      doc.addPage();
      await addFichaHeader();
    }

    // Ficha Title
    doc.setFontSize(11); // Slightly smaller font for thinner bar
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255); // White text for title bar

    // Title Bar Background (Reduced height to 8mm)
    const titleBarHeight = 8;
    doc.setFillColor(59, 130, 246); // Blue-500
    // Draw rect starting at cursorY
    doc.rect(margin, cursorY, pageWidth - (margin * 2), titleBarHeight, 'F');

    // Text centered vertically in the bar (approx +5.5 for 8mm height)
    doc.text(ficha.tabTitle, margin + 5, cursorY + 5.5);
    cursorY += titleBarHeight + 10; // Move cursor past bar + spacing

    // Image
    if (ficha.image) {
      const imageBase64 = await toBase64(ficha.image);
      if (imageBase64) {
        const imgProps = doc.getImageProperties(imageBase64);
        const imgWidth = 120;
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

        if (cursorY + imgHeight > pageHeight - margin) {
          doc.addPage();
          await addFichaHeader();
        }

        doc.addImage(imageBase64, 'PNG', (pageWidth - imgWidth) / 2, cursorY, imgWidth, imgHeight);
        cursorY += imgHeight + 15;
      }
    }

    const fichaTableStyles = {
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246], // Blue header
        textColor: 255,
        fontStyle: 'bold',
        halign: 'left',
        fontSize: 10
      },
      bodyStyles: {
        textColor: 50,
        cellPadding: 4,
        fontSize: 9
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251] // Very light gray
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: '40%' },
        1: { cellWidth: 'auto' }
      },
      margin: { left: margin, right: margin },
    };

    // Technical Data Table
    if (ficha.technical_data && ficha.technical_data.length > 0) {
      if (cursorY > pageHeight - 60) {
        doc.addPage();
        await addFichaHeader();
      }

      // Section Title removed to be cleaner, or keep it? 
      // Let's keep it simple as per "Propuesta" style which is clean tables.
      // But we need to distinguish Tech Data vs Components if both exist.
      // Let's use the table header for that.

      const technicalBody = ficha.technical_data.map(item => [item.label, `${item.value} ${item.unit || ''}`]);

      doc.autoTable({
        head: [[ficha.technicalDataTitle || 'Descripción', 'Valor']], // Use generic headers or specific? Image shows "Descripción | Potencia | Importe"
        body: technicalBody,
        startY: cursorY,
        ...fichaTableStyles,
      });
      cursorY = doc.autoTable.previous.finalY + 20;
    }

    // Components Table
    if (ficha.components && ficha.components.length > 0) {
      if (cursorY > pageHeight - 60) {
        doc.addPage();
        await addFichaHeader();
      }

      const componentsBody = ficha.components.map(item => [item.label, item.value]);

      doc.autoTable({
        head: [[ficha.componentsTitle || 'Componente', 'Detalle']],
        body: componentsBody,
        startY: cursorY,
        ...fichaTableStyles,
      });
      cursorY = doc.autoTable.previous.finalY + 20;
    }

    cursorY += 10; // Extra spacing between Fichas
  }

  addFooter(doc);
  doc.save(`Fichas_Tecnicas_${quotationData.project.replace(/\s/g, '_')}.pdf`);
};