import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Helper to fetch image and convert to base64
const toBase64 = async (url) => {
  if (!url) return null;
  try {
    const response = await fetch(url);
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

export const generateFichasTecnicasPDF = async (fichas, quotationData) => {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;
  let cursorY = 0;

  // --- Colores ---
  const primaryColor = '#007BFF'; // Azul brillante
  const blackColor = '#000000';
  const whiteColor = '#ffffff';
  const grayColor = '#444444';
  const lightGrayColor = '#F5F5F5';
  
  const addHeader = async () => {
    cursorY = 15;
    // Logo
    if (quotationData.logo) {
      const logoBase64 = await toBase64(quotationData.logo);
      if (logoBase64) {
        const logoWidth = 45;
        const imgProps = doc.getImageProperties(logoBase64);
        const logoHeight = (imgProps.height * logoWidth) / imgProps.width;
        doc.addImage(logoBase64, 'PNG', pageWidth - margin - logoWidth, 15, logoWidth, logoHeight);
      }
    }

    // Client Info
    doc.setFontSize(9);
    doc.setTextColor(grayColor);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE:', margin, cursorY);
    doc.text('EMPRESA:', margin, cursorY + 5);
    doc.text('PROYECTO:', margin, cursorY + 10);
    doc.text('FECHA:', margin, cursorY + 15);

    doc.setFont('helvetica', 'normal');
    doc.text(quotationData.client || 'N/A', margin + 21, cursorY);
    doc.text(quotationData.company || 'N/A', margin + 21, cursorY + 5);
    doc.text(quotationData.project || 'N/A', margin + 21, cursorY + 10);
    const now = new Date();
    const formattedDate = format(now, "dd MMMM, yyyy", { locale: es });
    doc.text(formattedDate, margin + 21, cursorY + 15);
    
    // Title
    cursorY += 25; // More space for title
    doc.setFillColor(primaryColor);
    doc.rect(margin, cursorY, pageWidth - (margin * 2), 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(whiteColor);
    doc.text('FICHAS TÉCNICAS', margin + 4, cursorY + 9);
    cursorY += 17;
  };
  
  await addHeader();

  for (let i = 0; i < fichas.length; i++) {
    const ficha = fichas[i];

    if (i > 0) {
        cursorY += 10;
    }
    
    const estimatedHeight = 20 + (ficha.image ? 60 : 0) + (ficha.technical_data.length * 8) + (ficha.components.length * 8);
    if (cursorY + estimatedHeight > pageHeight - margin) {
      doc.addPage();
      await addHeader();
    }
    
    // Ficha Title (like "GENERAL" group)
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(blackColor);
    doc.text(ficha.tabTitle.toUpperCase(), margin, cursorY);
    cursorY += 6;
    
    // Image
    if (ficha.image) {
      const imageBase64 = await toBase64(ficha.image);
      if (imageBase64) {
        const imgProps = doc.getImageProperties(imageBase64);
        const imgWidth = 80;
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
        if (cursorY + imgHeight > pageHeight - margin - 20) {
          doc.addPage();
          await addHeader();
        }
        doc.addImage(imageBase64, 'PNG', (pageWidth - imgWidth) / 2, cursorY, imgWidth, imgHeight);
        cursorY += imgHeight + 10;
      }
    }
    
    const renderTable = async (title, data, headers) => {
        if (!data || data.length === 0) return;
        
        const tableHeaderHeight = 7;
        const tableBodyHeight = data.length * 8; 
        if (cursorY + tableHeaderHeight + tableBodyHeight > pageHeight - margin) {
             doc.addPage();
             await addHeader();
        }

        doc.setFillColor(blackColor);
        doc.rect(margin, cursorY, (pageWidth - margin * 2) * 0.7, tableHeaderHeight, 'F');
        doc.setFillColor(primaryColor);
        doc.rect(margin + (pageWidth - margin * 2) * 0.7, cursorY, (pageWidth - margin * 2) * 0.3, tableHeaderHeight, 'F');
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(whiteColor);
        doc.text(headers[0].toUpperCase(), margin + 4, cursorY + 5);
        doc.text(headers[1].toUpperCase(), pageWidth - margin - 4, cursorY + 5, { align: 'right' });
        
        cursorY += tableHeaderHeight;

        doc.autoTable({
            body: data,
            theme: 'plain',
            styles: { fontSize: 9, cellPadding: { top: 2, right: 4, bottom: 2, left: 4 }, textColor: grayColor },
            columnStyles: { 
                0: { cellWidth: (pageWidth - margin * 2) * 0.7 }, 
                1: { cellWidth: (pageWidth - margin * 2) * 0.3, halign: 'right' } 
            },
            margin: { left: margin, right: margin },
            startY: cursorY,
            didParseCell: (data) => {
                if (data.cell.section === 'body') {
                    data.cell.styles.fillColor = data.row.index % 2 === 0 ? whiteColor : lightGrayColor;
                }
            }
        });

        cursorY = doc.autoTable.previous.finalY;
    };
    
    const technicalBody = ficha.technical_data.map(item => [`• ${item.label}`, `${item.value} ${item.unit || ''}`]);
    await renderTable(ficha.technicalDataTitle, technicalBody, ['Datos Técnicos', 'Valor']);
    
    cursorY += 10;

    const componentsBody = ficha.components.map(item => [`• ${item.label}`, item.value]);
    await renderTable(ficha.componentsTitle, componentsBody, ['Componentes', 'Marca/Valor']);
  }
  
  doc.setFillColor(primaryColor);
  doc.rect(0, doc.internal.pageSize.height - 10, doc.internal.pageSize.width, 10, 'F');

  doc.save(`Fichas_Tecnicas_${quotationData.project.replace(/\s/g, '_')}.pdf`);
};