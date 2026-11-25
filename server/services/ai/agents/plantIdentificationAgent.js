import { generateStructuredVisionJSON } from '../geminiService.js';
import {
  buildPlantIdentificationSystemInstruction,
  buildPlantIdentificationUserPrompt,
} from '../prompts/plantIdentificationPrompt.js';
import {
  PLANT_IDENTIFICATION_GEMINI_SCHEMA,
  validatePlantIdentificationResponse,
} from '../schemas/plantIdentificationSchema.js';

/**
 * Plant Identification Agent:
 * Identifies botanical details for a crop image already verified as VALID by CropValidationAgent.
 */
export const runPlantIdentificationAgent = async ({ imageBuffer, mimeType, crop }) => {
  const rawResult = await generateStructuredVisionJSON({
    imageBuffer,
    mimeType,
    systemInstruction: buildPlantIdentificationSystemInstruction(crop),
    userPrompt: buildPlantIdentificationUserPrompt(crop),
    responseSchema: PLANT_IDENTIFICATION_GEMINI_SCHEMA,
    temperature: 0.15,
  });

  return validatePlantIdentificationResponse(rawResult, crop);
};
