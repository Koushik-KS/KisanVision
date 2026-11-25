import { Type } from '@google/genai';
import { SUPPORTED_CROPS } from '../../../config/constants.js';
import AppError from '../../../utils/AppError.js';

export const DISEASE_STATUSES = ['HEALTHY', 'DISEASED', 'UNCERTAIN'];
export const SEVERITY_LEVELS = ['None', 'Mild', 'Moderate', 'Severe', 'Uncertain'];

export const UNCERTAIN_DISEASE_MESSAGE =
  'Unable to identify the disease reliably from this image. Please upload a clearer image.';

/**
 * Gemini SDK structured output schema for Disease Detection Agent.
 */
export const DISEASE_DETECTION_GEMINI_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    crop: {
      type: Type.STRING,
      description: 'Crop name matching the validated crop.',
    },
    status: {
      type: Type.STRING,
      enum: DISEASE_STATUSES,
      description: 'Plant health classification: HEALTHY, DISEASED, or UNCERTAIN.',
    },
    diseaseName: {
      type: Type.STRING,
      nullable: true,
      description:
        'Common name of the identified disease when status is DISEASED, otherwise null.',
    },
    confidence: {
      type: Type.INTEGER,
      description: 'AI visual assessment confidence percentage from 0 to 100.',
    },
    visualEvidence: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Specific visual observations in the image supporting the result.',
    },
    symptoms: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Visible disease symptoms on leaves/stems/fruits, or empty list if healthy.',
    },
    severity: {
      type: Type.STRING,
      enum: SEVERITY_LEVELS,
      description: 'Severity level: None, Mild, Moderate, Severe, or Uncertain.',
    },
    estimatedAffectedAreaPercent: {
      type: Type.INTEGER,
      nullable: true,
      description:
        'Approximate percentage (0-100) of visible plant area showing symptoms when estimable; 0 if healthy; null if uncertain or not estimable.',
    },
    diseaseExplanation: {
      type: Type.STRING,
      description: 'Clear explanation of the disease or healthy plant observations.',
    },
    possibleCauses: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        'Possible causes or contributing environmental factors (clearly non-confirmed visual possibilities).',
    },
    managementRecommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Practical field management recommendations.',
    },
    treatmentGuidance: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        'Conservative treatment guidance when disease is reliably identified; empty if healthy or uncertain.',
    },
    preventiveMeasures: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Preventive agricultural practices for this crop.',
    },
    summary: {
      type: Type.STRING,
      description: 'Concise, farmer-friendly summary of the assessment.',
    },
  },
  required: [
    'crop',
    'status',
    'diseaseName',
    'confidence',
    'visualEvidence',
    'symptoms',
    'severity',
    'estimatedAffectedAreaPercent',
    'diseaseExplanation',
    'possibleCauses',
    'managementRecommendations',
    'treatmentGuidance',
    'preventiveMeasures',
    'summary',
  ],
};

const cleanStringArray = (value, fieldName) => {
  if (!Array.isArray(value)) {
    throw new AppError(
      `AI returned an invalid ${fieldName} list.`,
      502,
      'AI_MALFORMED_RESPONSE'
    );
  }
  return value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
};

const cleanRequiredString = (value, fieldName) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(
      `AI returned a missing or invalid ${fieldName}.`,
      502,
      'AI_MALFORMED_RESPONSE'
    );
  }
  return value.trim();
};

/**
 * Strictly validate and normalize Disease Detection Agent output on the backend.
 */
export const validateDiseaseDetectionResponse = (raw, expectedCrop) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new AppError(
      'AI returned an invalid disease analysis structure.',
      502,
      'AI_MALFORMED_RESPONSE'
    );
  }

  if (!SUPPORTED_CROPS.includes(expectedCrop)) {
    throw new AppError(
      'Disease analysis cannot run for an unsupported crop.',
      400,
      'UNSUPPORTED_CROP'
    );
  }

  const {
    status,
    diseaseName,
    confidence,
    visualEvidence,
    symptoms,
    severity,
    estimatedAffectedAreaPercent,
    diseaseExplanation,
    possibleCauses,
    managementRecommendations,
    treatmentGuidance,
    preventiveMeasures,
    summary,
  } = raw;

  if (!DISEASE_STATUSES.includes(status)) {
    throw new AppError(
      'AI returned an unrecognized disease status.',
      502,
      'AI_MALFORMED_RESPONSE'
    );
  }

  if (!SEVERITY_LEVELS.includes(severity)) {
    throw new AppError(
      'AI returned an invalid severity level.',
      502,
      'AI_MALFORMED_RESPONSE'
    );
  }

  if (
    typeof confidence !== 'number' ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 100
  ) {
    throw new AppError(
      'AI returned an out-of-range confidence score.',
      502,
      'AI_MALFORMED_RESPONSE'
    );
  }

  let normalizedArea = null;
  if (estimatedAffectedAreaPercent !== null && estimatedAffectedAreaPercent !== undefined) {
    if (
      typeof estimatedAffectedAreaPercent !== 'number' ||
      !Number.isFinite(estimatedAffectedAreaPercent) ||
      estimatedAffectedAreaPercent < 0 ||
      estimatedAffectedAreaPercent > 100
    ) {
      throw new AppError(
        'AI returned an invalid affected area estimate.',
        502,
        'AI_MALFORMED_RESPONSE'
      );
    }
    normalizedArea = Math.round(estimatedAffectedAreaPercent);
  }

  const normalizedConfidence = Math.round(confidence);
  const cleanedEvidence = cleanStringArray(visualEvidence, 'visualEvidence');
  const cleanedSymptoms = cleanStringArray(symptoms, 'symptoms');
  const cleanedCauses = cleanStringArray(possibleCauses, 'possibleCauses');
  const cleanedManagement = cleanStringArray(
    managementRecommendations,
    'managementRecommendations'
  );
  const cleanedTreatment = cleanStringArray(treatmentGuidance, 'treatmentGuidance');
  const cleanedPrevention = cleanStringArray(preventiveMeasures, 'preventiveMeasures');
  let cleanedExplanation = cleanRequiredString(diseaseExplanation, 'diseaseExplanation');
  let cleanedSummary = cleanRequiredString(summary, 'summary');

  let finalStatus = status;
  let finalDiseaseName =
    typeof diseaseName === 'string' && diseaseName.trim() ? diseaseName.trim() : null;
  let finalSeverity = severity;
  let finalArea = normalizedArea;

  // Enforce domain invariants so forced or contradictory outputs are corrected
  if (finalStatus === 'DISEASED') {
    const looksUncertainName =
      !finalDiseaseName ||
      ['unknown', 'uncertain', 'none', 'n/a'].includes(finalDiseaseName.toLowerCase());

    if (looksUncertainName || normalizedConfidence < 50) {
      finalStatus = 'UNCERTAIN';
    } else if (finalSeverity === 'None') {
      finalSeverity = 'Uncertain';
    }
  }

  if (finalStatus === 'HEALTHY') {
    finalDiseaseName = null;
    finalSeverity = 'None';
    finalArea = 0;
  }

  if (finalStatus === 'UNCERTAIN') {
    finalDiseaseName = null;
    finalSeverity = 'Uncertain';
    finalArea = null;
    cleanedSummary = UNCERTAIN_DISEASE_MESSAGE;
    if (!cleanedExplanation) {
      cleanedExplanation = UNCERTAIN_DISEASE_MESSAGE;
    }
  }

  return {
    success: true,
    agent: 'DiseaseDetectionAgent',
    crop: expectedCrop,
    status: finalStatus,
    diseaseName: finalDiseaseName,
    confidence: normalizedConfidence,
    visualEvidence: cleanedEvidence,
    symptoms: finalStatus === 'HEALTHY' ? [] : cleanedSymptoms,
    severity: finalSeverity,
    estimatedAffectedAreaPercent: finalArea,
    diseaseExplanation: cleanedExplanation,
    possibleCauses: finalStatus === 'HEALTHY' ? [] : cleanedCauses,
    managementRecommendations: cleanedManagement,
    treatmentGuidance: finalStatus === 'DISEASED' ? cleanedTreatment : [],
    preventiveMeasures: cleanedPrevention,
    summary: cleanedSummary,
  };
};
