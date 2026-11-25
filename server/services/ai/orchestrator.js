import { SUPPORTED_CROPS } from '../../config/constants.js';
import AppError from '../../utils/AppError.js';
import { runCropValidationAgent } from './agents/cropValidationAgent.js';
import { runDiseaseDetectionAgent } from './agents/diseaseDetectionAgent.js';
import { runMultiImageAgent } from './agents/multiImageAgent.js';
import { runPlantIdentificationAgent } from './agents/plantIdentificationAgent.js';
import { runWeatherIntelligenceAgent } from './agents/weatherAgent.js';

export const AI_TASKS = {
  CROP_VALIDATION: 'CROP_VALIDATION',
  DISEASE_DETECTION: 'DISEASE_DETECTION',
  PLANT_IDENTIFICATION: 'PLANT_IDENTIFICATION',
  MULTI_IMAGE_ANALYSIS: 'MULTI_IMAGE_ANALYSIS',
  WEATHER_INTELLIGENCE: 'WEATHER_INTELLIGENCE',
};

const isValidationAccepted = (validation) =>
  Boolean(
    validation &&
      validation.status === 'VALID' &&
      validation.isPlant &&
      validation.isSupportedCrop &&
      SUPPORTED_CROPS.includes(validation.crop)
  );

/**
 * Central AI Orchestrator:
 * Routes requests to specialized agents, enforces crop validation before any downstream analysis,
 * and returns normalized structured responses.
 */
export const orchestrateAIWorkflow = async (taskType, payload, deps = {}) => {
  const { imageBuffer, mimeType, items } = payload || {};
  const validateCrop = deps.validateCropAgent || runCropValidationAgent;
  const detectDisease = deps.detectDiseaseAgent || runDiseaseDetectionAgent;
  const identifyPlant = deps.identifyPlantAgent || runPlantIdentificationAgent;
  const analyzeWeather = deps.weatherIntelligenceAgent || runWeatherIntelligenceAgent;

  if (taskType === AI_TASKS.CROP_VALIDATION) {
    if (!imageBuffer || !mimeType) {
      throw new AppError(
        'Valid image buffer and MIME type are required for AI orchestration.',
        400,
        'INVALID_ORCHESTRATOR_INPUT'
      );
    }
    return validateCrop({ imageBuffer, mimeType });
  }

  if (taskType === AI_TASKS.DISEASE_DETECTION) {
    if (!imageBuffer || !mimeType) {
      throw new AppError(
        'Valid image buffer and MIME type are required for disease detection.',
        400,
        'INVALID_ORCHESTRATOR_INPUT'
      );
    }

    // Step 1: Always validate crop eligibility and image clarity first
    const validation = await validateCrop({ imageBuffer, mimeType });

    if (!isValidationAccepted(validation)) {
      return {
        validation,
        diseaseAnalysis: null,
        executedDiseaseAgent: false,
      };
    }

    // Step 2: Execute Disease Detection Agent only for validated supported crops
    const diseaseAnalysis = await detectDisease({
      imageBuffer,
      mimeType,
      crop: validation.crop,
    });

    return {
      validation,
      diseaseAnalysis,
      executedDiseaseAgent: true,
    };
  }

  if (taskType === AI_TASKS.PLANT_IDENTIFICATION) {
    if (!imageBuffer || !mimeType) {
      throw new AppError(
        'Valid image buffer and MIME type are required for plant identification.',
        400,
        'INVALID_ORCHESTRATOR_INPUT'
      );
    }

    // Step 1: Always validate crop eligibility and image clarity first
    const validation = await validateCrop({ imageBuffer, mimeType });

    if (!isValidationAccepted(validation)) {
      return {
        validation,
        plantIdentification: null,
        executedPlantAgent: false,
      };
    }

    // Step 2: Execute Plant Identification Agent only for validated supported crops
    const plantIdentification = await identifyPlant({
      imageBuffer,
      mimeType,
      crop: validation.crop,
    });

    return {
      validation,
      plantIdentification,
      executedPlantAgent: true,
    };
  }

  if (taskType === AI_TASKS.MULTI_IMAGE_ANALYSIS) {
    return runMultiImageAgent({
      items,
      runSingleImageAnalysis: (singlePayload) =>
        orchestrateAIWorkflow(AI_TASKS.DISEASE_DETECTION, singlePayload, deps),
    });
  }

  if (taskType === AI_TASKS.WEATHER_INTELLIGENCE) {
    return analyzeWeather(payload);
  }

  throw new AppError(
    `AI workflow "${taskType}" is not implemented in this phase.`,
    501,
    'WORKFLOW_NOT_IMPLEMENTED'
  );
};
