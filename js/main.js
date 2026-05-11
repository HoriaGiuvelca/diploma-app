import { appConfig, setAppConfig, setFeedbackToken, loadStoredToken } from './config.js';
import { initFeedback, showFeedbackStep, hideFeedbackStep, setupFeedbackFormListener } from './feedback.js';
import { initCanvas, setupNameInputValidation } from './canvas.js';
import { showDiplomaStep, hideDiplomaStep, setupDownloadButton, setupEmailButton } from './diploma.js';

async function init() {
  // Initialize canvas
  initCanvas();
  setupNameInputValidation();

  // Initialize feedback
  const feedbackResult = await initFeedback();
  if (feedbackResult.hasToken) {
    setFeedbackToken(feedbackResult.token);
  }

  // Setup event listeners
  setupFeedbackFormListener();
  setupDownloadButton();
  setupEmailButton();

  // Show appropriate step
  if (feedbackResult.hasToken && appConfig.enableFeedbackGate) {
    hideFeedbackStep();
    showDiplomaStep();
  } else if (appConfig.enableFeedbackGate) {
    showFeedbackStep();
    hideDiplomaStep();
  } else {
    hideFeedbackStep();
    showDiplomaStep();
  }
}

// Start the application
document.addEventListener('DOMContentLoaded', init);
