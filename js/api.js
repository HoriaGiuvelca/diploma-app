import { API, appConfig } from './config.js';

export async function loadAppConfig() {
  try {
    const response = await fetch(API.CONFIG, { cache: 'no-store' });
    if (!response.ok) {
      console.error('[loadAppConfig] HTTP error:', response.status);
      return null;
    }
    const data = await response.json();
    return {
      enableEmailFeature: Boolean(data?.enableEmailFeature),
      enableFeedbackGate: !(data?.enableFeedbackGate === false),
      feedbackQuestions: data?.feedbackQuestions || []
    };
  } catch (error) {
    console.error('[loadAppConfig] error:', error?.message);
    return null;
  }
}

export async function submitFeedback(responses) {
  try {
    const response = await fetch(API.FEEDBACK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responses })
    });

    if (!response.ok) {
      let message = 'Nu am putut salva feedback-ul.';
      try {
        const errorData = await response.json();
        if (errorData?.error) message = errorData.error;
      } catch (e) {
        // Keep default message
      }
      throw new Error(message);
    }

    const data = await response.json();
    return { ok: true, token: data.token };
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      throw new Error('Serverul nu răspunde. Încearcă din nou.');
    }
    throw error;
  }
}

export async function generateDiploma(name, canvasImageBase64, feedbackToken) {
  try {
    const response = await fetch(API.GENERATE_DIPLOMA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        canvasImageBase64,
        feedbackToken
      })
    });

    if (!response.ok) {
      let message = 'Eroare la generarea diplomei.';
      try {
        const errorData = await response.json();
        if (errorData?.error) message = errorData.error;
      } catch (e) {
        // Keep default message
      }
      throw new Error(message);
    }

    return await response.blob();
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      throw new Error('Serverul nu răspunde. Încearcă din nou.');
    }
    throw error;
  }
}

export async function sendDiplomaEmail(name, email, pdfBase64, feedbackToken, fileName) {
  try {
    const response = await fetch(API.SEND_EMAIL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        fileName,
        pdfBase64,
        feedbackToken
      })
    });

    if (!response.ok) {
      let message = 'Eroare la trimiterea email-ului.';
      try {
        const errorData = await response.json();
        if (errorData?.error) message = errorData.error;
      } catch (e) {
        // Keep default message
      }
      throw new Error(message);
    }

    return { ok: true };
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      throw new Error('Serverul nu răspunde. Încearcă din nou.');
    }
    throw error;
  }
}
