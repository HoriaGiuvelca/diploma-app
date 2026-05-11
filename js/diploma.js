import { IMG_W, IMG_H, DOM, appConfig, feedbackToken } from './config.js';
import { generateDiploma, sendDiplomaEmail } from './api.js';
import { drawPreview } from './canvas.js';

export function showDiplomaStep() {
  DOM.diplomaStep.hidden = false;
  drawPreview();
  DOM.nameInput.focus();
}

export function hideDiplomaStep() {
  DOM.diplomaStep.hidden = true;
}

export function sanitizeFileName(value) {
  return value.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function createDiplomaPdf() {
  const { jsPDF } = window.jspdf;

  // Match PDF dimensions to image aspect ratio (A4 landscape = 297×210mm)
  const PDF_W = 297;
  const PDF_H = Math.round((IMG_H / IMG_W) * PDF_W);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [PDF_W, PDF_H]
  });

  const imgData = DOM.previewCanvas.toDataURL('image/jpeg', 1.0);
  doc.addImage(imgData, 'JPEG', 0, 0, PDF_W, PDF_H);
  return doc;
}

export function setupDownloadButton() {
  DOM.downloadBtn.addEventListener('click', async () => {
    const name = DOM.nameInput.value.trim();
    if (!name) {
      alert('Introduceți mai întâi un nume.');
      return;
    }

    DOM.downloadBtn.disabled = true;
    DOM.downloadBtn.textContent = 'Se generează...';

    try {
      const canvasImageBase64 = DOM.previewCanvas.toDataURL('image/jpeg', 1.0);
      const pdfBlob = await generateDiploma(name, canvasImageBase64, feedbackToken);

      const safeName = sanitizeFileName(name) || 'Diploma';
      const fileName = `Diploma - ${safeName}.pdf`;
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

      // Try mobile share API first
      const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
          await navigator.share({ files: [pdfFile] });
          return;
        } catch (e) {
          if (e.name === 'AbortError') return;
        }
      }

      // Desktop download
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(error.message || 'A apărut o eroare la generarea diplomei.');
    } finally {
      DOM.downloadBtn.disabled = false;
      DOM.downloadBtn.textContent = '⬇ Descărcare diplomă (PDF)';
    }
  });
}

export function showEmailStatus(message, type) {
  DOM.sendStatus.textContent = message;
  DOM.sendStatus.className = 'send-status' + (type ? ' ' + type : '');
}

export function setupEmailButton() {
  DOM.sendBtn.addEventListener('click', async () => {
    if (!appConfig.enableEmailFeature) return;

    const name = DOM.nameInput.value.trim();
    const email = DOM.emailInput.value.trim();

    if (!name) {
      alert('Introduceți mai întâi un nume.');
      return;
    }
    if (!email) {
      alert('Introduceți adresa de email.');
      return;
    }
    if (!validateEmail(email)) {
      alert('Adresa de email nu este validă.');
      return;
    }

    DOM.sendBtn.disabled = true;
    DOM.sendBtn.textContent = 'Se trimite…';

    try {
      const doc = createDiplomaPdf();
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      const safeName = sanitizeFileName(name) || 'Diploma';
      const fileName = `Diploma - ${safeName}.pdf`;

      await sendDiplomaEmail(name, email, pdfBase64, feedbackToken, fileName);
      showEmailStatus('Diploma a fost trimisă pe email.', 'success');
    } catch (error) {
      showEmailStatus(error.message || 'A apărut o eroare la trimitere.', 'error');
    } finally {
      DOM.sendBtn.disabled = false;
      DOM.sendBtn.textContent = '✉ Trimite diploma pe email';
    }
  });
}
