import { Type } from '@google/genai';
import { SUPPORTED_CROPS, UNSUPPORTED_CROP_MESSAGE } from '../../../config/constants.js';
import AppError from '../../../utils/AppError.js';

export const VALIDATION_STATUSES = [
  'VALID',
  'UNSUPPORTED_CROP',
  'NOT_A_PLANT',
  'UNCLEAR_IMAGE',
  'UNCERTAIN',
];

export const IMAGE_QUALITIES = ['GOOD', 'FAIR', 'POOR'];

const STATUS_MESSAGES = {
  UNSUPPORTED_CROP: UNSUPPORTED_CROP_MESSAGE,
  NOT_A_PLANT:
    'Image Not Recognized. Please upload a clear leaf or plant image of Coffee, Black Pepper, Ginger, Cardamom, or Arecanut to continue.',
  UNCLEAR_IMAGE:
    'Unable to Identify Crop. The uploaded image could not be reliably identified. Please upload a clearer image showing the plant leaves.',
  UNCERTAIN:
    'Unable to reliably identify the crop from this image. Please upload a clearer, closer photo showing the plant leaves.',
};

/**
 * Gemini SDK structured output schema for Crop Validation Agent.
 */
export const CROP_VALIDATION_GEMINI_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    status: {
      type: Type.STRING,
      enum: VALIDATION_STATUSES,
      description: 'Validation outcome category.',
    },
    isPlant: {
      type: Type.BOOLEAN,
      description: 'Whether a plant or leaf is visibly present in the image.',
    },
    isSupportedCrop: {
      type: Type.BOOLEAN,
      description:
        'True only if the crop reliably matches Coffee, Black Pepper, Ginger, Cardamom, or Arecanut.',
    },
    crop: {
      type: Type.STRING,
      nullable: true,
      description:
        'Exact supported crop name (Coffee, Black Pepper, Ginger, Cardamom, or Arecanut), or null if unsupported/not a plant/unclear/uncertain.',
    },
    confidence: {
      type: Type.INTEGER,
      description: 'Model confidence percentage between 0 and 100.',
    },
    imageQuality: {
      type: Type.STRING,
      enum: IMAGE_QUALITIES,
      description: 'Visual clarity assessment: GOOD, FAIR, or POOR.',
    },
    reason: {
      type: Type.STRING,
      nullable: true,
      description:
        'Brief visual explanation for rejection or uncertainty, or null when status is VALID.',
    },
  },
  required: [
    'status',
    'isPlant',
    'isSupportedCrop',
    'crop',
    'confidence',
    'imageQuality',
    'reason',
  ],
};

const normalizeSupportedCrop = (cropValue) => {
  if (typeof cropValue !== 'string') return null;
  const cleaned = cropValue.trim().toLowerCase();
  const match = SUPPORTED_CROPS.find((item) => item.toLowerCase() === cleaned);
  return match || null;
};

/**
 * Strictly validate and normalize raw Gemini output on the backend.
 * Never trusts raw AI output without verifying types, enums, bounds, and crop constraints.
 */
export const validateCropValidationResponse = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new AppError(
      'AI returned an invalid validation structure.',
      502,
      'AI_MALFORMED_RESPONSE'
    );
  }

  const { status, isPlant, isSupportedCrop, crop, confidence, imageQuality, reason } = raw;

  if (!VALIDATION_STATUSES.includes(status)) {
    throw new AppError(
      'AI returned an unrecognized validation status.',
      502,
      'AI_MALFORMED_RESPONSE'
    );
  }

  if (typeof isPlant !== 'boolean' || typeof isSupportedCrop !== 'boolean') {
    throw new AppError(
      'AI returned invalid boolean validation flags.',
      502,
      'AI_MALFORMED_RESPONSE'
    );
  }

  if (!IMAGE_QUALITIES.includes(imageQuality)) {
    throw new AppError(
      'AI returned an invalid image quality assessment.',
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
  const canonicalCrop = normalizeSupportedCrop(crop);
  const cleanedReason =
    typeof reason === 'string' && reason.trim().length > 0 ? reason.trim() : null;

  let finalStatus = status;
  let finalCrop = canonicalCrop;
  let finalIsPlant = isPlant;
  let finalIsSupported = isSupportedCrop;
  let finalReason = cleanedReason;

  // Enforce strict domain invariants so raw AI inconsistencies never leak through
  if (finalStatus === 'VALID') {
    if (!finalIsPlant) {
      finalStatus = 'NOT_A_PLANT';
    } else if (!finalIsSupported || !finalCrop) {
      finalStatus = 'UNSUPPORTED_CROP';
    } else if (imageQuality === 'POOR') {
      finalStatus = 'UNCLEAR_IMAGE';
      finalReason =
        finalReason || 'Image quality is too poor for reliable downstream analysis.';
    } else if (normalizedConfidence < 55) {
      finalStatus = 'UNCERTAIN';
      finalReason =
        finalReason || 'Crop identification confidence is too low to proceed reliably.';
    }
  }

  if (finalStatus !== 'VALID') {
    finalCrop = null;
    finalIsSupported = false;
    if (finalStatus === 'NOT_A_PLANT') {
      finalIsPlant = false;
    }
  }

  const message =
    finalStatus === 'VALID'
      ? `${finalCrop} plant identified and image is suitable for further analysis.`
      : STATUS_MESSAGES[finalStatus];

  return {
    success: true,
    agent: 'CropValidationAgent',
    status: finalStatus,
    isPlant: finalIsPlant,
    isSupportedCrop: finalIsSupported,
    crop: finalCrop,
    confidence: normalizedConfidence,
    imageQuality,
    message,
    reason: finalStatus === 'VALID' ? null : finalReason,
  };
};
