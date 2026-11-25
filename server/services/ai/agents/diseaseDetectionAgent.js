import { generateStructuredVisionJSON } from '../geminiService.js';
import {
  buildDiseaseDetectionSystemInstruction,
  buildDiseaseDetectionUserPrompt,
} from '../prompts/diseaseDetectionPrompt.js';
import {
  DISEASE_DETECTION_GEMINI_SCHEMA,
  validateDiseaseDetectionResponse,
} from '../schemas/diseaseDetectionSchema.js';

/**
 * Disease Detection Agent:
 * Analyzes a crop image that has already passed CropValidationAgent with status VALID.
 */
export const runDiseaseDetectionAgent = async ({ imageBuffer, mimeType, crop }) => {
  const rawResult = await generateStructuredVisionJSON({
    imageBuffer,
    mimeType,
    systemInstruction: buildDiseaseDetectionSystemInstruction(crop),
    userPrompt: buildDiseaseDetectionUserPrompt(crop),
    responseSchema: DISEASE_DETECTION_GEMINI_SCHEMA,
    temperature: 0.15,
  });

  return validateDiseaseDetectionResponse(rawResult, crop);
};
