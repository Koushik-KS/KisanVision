import { generateStructuredVisionJSON } from '../geminiService.js';
import {
  CROP_VALIDATION_SYSTEM_INSTRUCTION,
  CROP_VALIDATION_USER_PROMPT,
} from '../prompts/cropValidationPrompt.js';
import {
  CROP_VALIDATION_GEMINI_SCHEMA,
  validateCropValidationResponse,
} from '../schemas/cropValidationSchema.js';

/**
 * Crop Validation Agent:
 * Determines if an image depicts a clear, identifiable plant from the 5 supported crops.
 */
export const runCropValidationAgent = async ({ imageBuffer, mimeType }) => {
  const rawResult = await generateStructuredVisionJSON({
    imageBuffer,
    mimeType,
    systemInstruction: CROP_VALIDATION_SYSTEM_INSTRUCTION,
    userPrompt: CROP_VALIDATION_USER_PROMPT,
    responseSchema: CROP_VALIDATION_GEMINI_SCHEMA,
    temperature: 0.1,
  });

  return validateCropValidationResponse(rawResult);
};
