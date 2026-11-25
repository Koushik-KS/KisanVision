import { Type } from '@google/genai';
import { SUPPORTED_CROPS } from '../../../config/constants.js';
import AppError from '../../../utils/AppError.js';

export const IDENTIFICATION_STATUSES = ['IDENTIFIED', 'UNCERTAIN'];

export const UNCERTAIN_PLANT_MESSAGE =
  'Unable to identify the plant reliably from this image. Please upload a clearer image showing the plant leaves or structure.';

/**
 * Gemini SDK structured output schema for Plant Identification Agent.
 */
export const PLANT_IDENTIFICATION_GEMINI_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    status: {
      type: Type.STRING,
      enum: IDENTIFICATION_STATUSES,
      description: 'Identification outcome: IDENTIFIED or UNCERTAIN.',
    },
    crop: {
      type: Type.STRING,
      nullable: true,
      description:
        'Canonical supported crop name (Coffee, Black Pepper, Ginger, Cardamom, or Arecanut) when IDENTIFIED, or null when UNCERTAIN.',
    },
    commonName: {
      type: Type.STRING,
      nullable: true,
      description: 'Common name of the plant when IDENTIFIED, or null when UNCERTAIN.',
    },
    scientificName: {
      type: Type.STRING,
      nullable: true,
      description:
        'Reliable scientific name when known with confidence, otherwise null.',
    },
    confidence: {
      type: Type.INTEGER,
      description: 'AI identification confidence percentage between 0 and 100.',
    },
    plantDescription: {
      type: Type.STRING,
      description: 'Clear botanical description of the identified crop.',
    },
    visualCharacteristics: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Visual identifying features observable in the image.',
    },
    keyTraits: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Key botanical traits (growth habit, leaf form, stem/fruit cues).',
    },
    suitableGrowingInfo: {
      type: Type.STRING,
      nullable: true,
      description:
        'Reliable growing conditions or regions when applicable, otherwise null.',
    },
    agriculturalImportance: {
      type: Type.STRING,
      description: 'Explanation of the agricultural and economic importance of this crop.',
    },
    commonUses: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Common agricultural, culinary, or commercial uses.',
    },
    usefulCropInfo: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Helpful general crop and cultivation information.',
    },
  },
  required: [
    'status',
    'crop',
    'commonName',
    'scientificName',
    'confidence',
    'plantDescription',
    'visualCharacteristics',
    'keyTraits',
    'suitableGrowingInfo',
    'agriculturalImportance',
    'commonUses',
    'usefulCropInfo',
  ],
};

const normalizeSupportedCrop = (cropValue) => {
  if (typeof cropValue !== 'string') return null;
  const cleaned = cropValue.trim().toLowerCase();
  const match = SUPPORTED_CROPS.find((item) => item.toLowerCase() === cleaned);
  return match || null;
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
 * Strictly validate and normalize Plant Identification Agent output on the backend.
 */
export const validatePlantIdentificationResponse = (raw, expectedCrop) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new AppError(
      'AI returned an invalid plant identification structure.',
      502,
      'AI_MALFORMED_RESPONSE'
    );
  }

  if (!SUPPORTED_CROPS.includes(expectedCrop)) {
    throw new AppError(
      'Plant identification cannot run for an unsupported crop.',
      400,
      'UNSUPPORTED_CROP'
    );
  }

  const {
    status,
    crop,
    commonName,
    scientificName,
    confidence,
    plantDescription,
    visualCharacteristics,
    keyTraits,
    suitableGrowingInfo,
    agriculturalImportance,
    commonUses,
    usefulCropInfo,
  } = raw;

  if (!IDENTIFICATION_STATUSES.includes(status)) {
    throw new AppError(
      'AI returned an unrecognized plant identification status.',
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

  const normalizedConfidence = Math.round(confidence);

  // Reject unsupported crop names or contradictions returned by raw AI
  if (crop !== null && crop !== undefined) {
    const canonical = normalizeSupportedCrop(crop);
    if (!canonical) {
      throw new AppError(
        'AI returned an unsupported crop name during plant identification.',
        502,
        'AI_MALFORMED_RESPONSE'
      );
    }
    if (status === 'IDENTIFIED' && canonical !== expectedCrop) {
      throw new AppError(
        'AI returned an inconsistent crop identification.',
        502,
        'AI_MALFORMED_RESPONSE'
      );
    }
  }

  const cleanedVisualTraits = cleanStringArray(
    visualCharacteristics,
    'visualCharacteristics'
  );
  const cleanedKeyTraits = cleanStringArray(keyTraits, 'keyTraits');
  const cleanedUses = cleanStringArray(commonUses, 'commonUses');
  const cleanedUsefulInfo = cleanStringArray(usefulCropInfo, 'usefulCropInfo');
  let cleanedDescription = cleanRequiredString(plantDescription, 'plantDescription');
  let cleanedImportance = cleanRequiredString(
    agriculturalImportance,
    'agriculturalImportance'
  );

  let finalStatus = status;
  let finalCrop = status === 'IDENTIFIED' ? normalizeSupportedCrop(crop) || expectedCrop : null;
  let finalCommonName =
    typeof commonName === 'string' && commonName.trim() ? commonName.trim() : null;
  let finalScientificName =
    typeof scientificName === 'string' && scientificName.trim()
      ? scientificName.trim()
      : null;
  let finalGrowingInfo =
    typeof suitableGrowingInfo === 'string' && suitableGrowingInfo.trim()
      ? suitableGrowingInfo.trim()
      : null;

  if (finalStatus === 'IDENTIFIED') {
    const missingCommon =
      !finalCommonName ||
      ['unknown', 'uncertain', 'none', 'n/a'].includes(finalCommonName.toLowerCase());

    if (missingCommon || normalizedConfidence < 50) {
      finalStatus = 'UNCERTAIN';
    }
  }

  if (finalStatus === 'UNCERTAIN') {
    finalCrop = null;
    finalCommonName = null;
    finalScientificName = null;
    finalGrowingInfo = null;
    cleanedDescription = UNCERTAIN_PLANT_MESSAGE;
    cleanedImportance =
      'Reliable crop identification is required before agricultural importance details can be provided.';
  }

  return {
    success: true,
    agent: 'PlantIdentificationAgent',
    status: finalStatus,
    crop: finalCrop,
    commonName: finalCommonName,
    scientificName: finalScientificName,
    confidence: normalizedConfidence,
    plantDescription: cleanedDescription,
    visualCharacteristics: finalStatus === 'UNCERTAIN' ? [] : cleanedVisualTraits,
    keyTraits: finalStatus === 'UNCERTAIN' ? [] : cleanedKeyTraits,
    suitableGrowingInfo: finalGrowingInfo,
    agriculturalImportance: cleanedImportance,
    commonUses: finalStatus === 'UNCERTAIN' ? [] : cleanedUses,
    usefulCropInfo: finalStatus === 'UNCERTAIN' ? [] : cleanedUsefulInfo,
  };
};
