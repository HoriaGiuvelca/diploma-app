import {
  appConfig, feedbackToken, DOM, setFeedbackToken, loadStoredToken
} from './config.js';
import { submitFeedback, loadAppConfig } from './api.js';
import { drawPreview } from './canvas.js';

export async function initFeedback() {
  // Load config
  const config = await loadAppConfig();
  if (config) {
    Object.assign(appConfig, config);
  }

  // Build form
  if (appConfig.feedbackQuestions.length > 0) {
    buildDynamicFeedbackForm();
  }

  // Show/hide email section
  DOM.emailSection.style.display = appConfig.enableEmailFeature ? '' : 'none';

  // Check for stored token
  const storedToken = loadStoredToken();
  if (storedToken && appConfig.enableFeedbackGate) {
    return { hasToken: true, token: storedToken };
  }

  return { hasToken: false };
}

export function buildDynamicFeedbackForm() {
  DOM.questionsContainer.innerHTML = '';

  appConfig.feedbackQuestions.forEach((question, idx) => {
    const questionBlock = document.createElement('div');
    questionBlock.className = 'question-block';

    const questionTitle = document.createElement('span');
    questionTitle.className = 'question-title';
    questionTitle.textContent = `${idx + 1}. ${question.text}`;
    questionBlock.appendChild(questionTitle);

    question.options.forEach((option) => {
      const label = document.createElement('label');
      label.className = 'radio-option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = question.id;
      input.value = option;
      input.required = true;
      label.appendChild(input);
      label.appendChild(document.createTextNode(' ' + option));
      questionBlock.appendChild(label);
    });

    DOM.questionsContainer.appendChild(questionBlock);
  });
}

export function showFeedbackStatus(message, type) {
  DOM.feedbackStatus.textContent = message;
  DOM.feedbackStatus.className = 'feedback-status' + (type ? ' ' + type : '');
}

export function showFeedbackStep() {
  DOM.feedbackStep.hidden = false;
}

export function hideFeedbackStep() {
  DOM.feedbackStep.hidden = true;
}

export function setupFeedbackFormListener() {
  DOM.feedbackForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!appConfig.enableFeedbackGate) {
      setFeedbackToken(null);
      DOM.feedbackStep.hidden = true;
      DOM.diplomaStep.hidden = false;
      drawPreview();
      DOM.nameInput.focus();
      return;
    }

    // Collect responses
    const responses = {};
    for (const question of appConfig.feedbackQuestions) {
      const input = DOM.feedbackForm.elements[question.id];
      if (!input || !input.value) {
        const questionCount = appConfig.feedbackQuestions.length;
        const questionLabel = questionCount === 1 ? 'întrebare' : 'întrebări';
        showFeedbackStatus(`Te rugăm să răspunzi la toate cele ${questionCount} ${questionLabel}.`, 'error');
        return { success: false };
      }
      responses[question.id] = input.value;
    }

    DOM.feedbackSubmitBtn.disabled = true;
    DOM.feedbackSubmitBtn.textContent = 'Se trimite...';
    showFeedbackStatus('');

    try {
      const result = await submitFeedback(responses);
      showFeedbackStatus('Mulțumim pentru feedback! Poți genera diploma.', 'success');
      setFeedbackToken(result.token);
      DOM.feedbackStep.hidden = true;
      DOM.diplomaStep.hidden = false;
      drawPreview();
      DOM.nameInput.focus();
      return;
    } catch (error) {
      showFeedbackStatus(error.message || 'A apărut o eroare la trimitere.', 'error');
      return;
    } finally {
      DOM.feedbackSubmitBtn.disabled = false;
      DOM.feedbackSubmitBtn.textContent = 'Trimite feedback și continuă';
    }
  });
}
