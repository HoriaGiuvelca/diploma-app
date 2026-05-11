// Canvas Configuration
export const IMG_W = 1600;
export const IMG_H = 1131;
export const NAME_X_PCT = 74;   // % from left
export const NAME_Y_PCT = 52;   // % from top
export const FONT_SIZE_DEFAULT = 36;  // px
export const FONT_SIZE_MIN = 24;      // px
export const FONT_FACE = 'Georgia, serif';
export const FONT_COLOR = '#e8d5a3';
export const LINE_WIDTH = IMG_W * 0.41;

// API Configuration
export const API = {
  CONFIG: '/app-config',
  FEEDBACK: '/submit-feedback',
  GENERATE_DIPLOMA: '/generate-diploma',
  SEND_EMAIL: '/send-diploma-email',
  DIPLOMA_IMAGE: '/diploma-image'
};

// Runtime State
export let appConfig = {
  enableEmailFeature: false,
  enableFeedbackGate: true,
  feedbackQuestions: []
};

export let feedbackToken = null;

// DOM Cache
export const DOM = {
  feedbackStep: document.getElementById('feedbackStep'),
  diplomaStep: document.getElementById('diplomaStep'),
  feedbackForm: document.getElementById('feedbackForm'),
  feedbackSubmitBtn: document.getElementById('feedbackSubmitBtn'),
  feedbackStatus: document.getElementById('feedbackStatus'),
  nameInput: document.getElementById('nameInput'),
  emailSection: document.getElementById('emailSection'),
  emailInput: document.getElementById('emailInput'),
  sendBtn: document.getElementById('sendBtn'),
  sendStatus: document.getElementById('sendStatus'),
  downloadBtn: document.getElementById('downloadBtn'),
  questionsContainer: document.getElementById('questionsContainer'),
  previewCanvas: document.getElementById('previewCanvas')
};

export function setAppConfig(config) {
  appConfig = config;
}

export function setFeedbackToken(token) {
  if (token) {
    sessionStorage.setItem('feedbackToken', token);
  } else {
    sessionStorage.removeItem('feedbackToken');
  }
  feedbackToken = token;
}

export function loadStoredToken() {
  return sessionStorage.getItem('feedbackToken');
}
