import { MAX_BATCH_IMAGES } from '../../../config/constants.js';
import AppError from '../../../utils/AppError.js';
import { calculateBatchSummary } from '../schemas/multiImageSchema.js';

const buildRejectedBinaryItem = (item) => ({
  index: item.index,
  fileName: item.fileName,
  mimeType: item.mimeType || null,
  sizeBytes: item.size || 0,
  imageUrl: null,
  imagePublicId: null,
  processingStatus: 'REJECTED',
  validationStatus: item.errorCode || 'INVALID_FILE',
  crop: null,
  diseaseStatus: 'REJECTED',
  diseaseName: null,
  confidence: null,
  severity: null,
  estimatedAffectedAreaPercent: null,
  symptoms: [],
  visualEvidence: [],
  diseaseExplanation: null,
  possibleCauses: [],
  managementRecommendations: [],
  treatmentGuidance: [],
  preventiveMeasures: [],
  summary: null,
  rejectionReason: item.reason || 'Invalid image file.',
  errorCode: item.errorCode || 'INVALID_FILE',
  validation: null,
  diseaseAnalysis: null,
});

const buildNotProcessedItem = (item, reason, errorCode = 'NOT_PROCESSED', validationStatus = 'NOT_PROCESSED') => ({
  index: item.index,
  fileName: item.fileName,
  mimeType: item.mimeType || null,
  sizeBytes: item.size || 0,
  imageUrl: null,
  imagePublicId: null,
  processingStatus: 'NOT_PROCESSED',
  validationStatus,
  crop: null,
  diseaseStatus: 'NOT_PROCESSED',
  diseaseName: null,
  confidence: null,
  severity: null,
  estimatedAffectedAreaPercent: null,
  symptoms: [],
  visualEvidence: [],
  diseaseExplanation: null,
  possibleCauses: [],
  managementRecommendations: [],
  treatmentGuidance: [],
  preventiveMeasures: [],
  summary: null,
  rejectionReason: reason,
  errorCode,
  validation: null,
  diseaseAnalysis: null,
});

/**
 * Multi Image Analysis Agent:
 * Processes up to 5 images sequentially via the single-image Crop Validation -> Disease Detection
 * orchestrator workflow, halting further Gemini calls immediately if quota/rate limits are reached.
 */
export const runMultiImageAgent = async ({ items, runSingleImageAnalysis }) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError(
      'At least one image is required for multi-image analysis.',
      400,
      'IMAGES_REQUIRED'
    );
  }

  if (items.length > MAX_BATCH_IMAGES) {
    throw new AppError(
      `Maximum ${MAX_BATCH_IMAGES} images allowed per batch.`,
      400,
      'TOO_MANY_FILES'
    );
  }

  const results = [];
  let quotaExceeded = false;
  let quotaErrorMessage = null;

  for (const item of items) {
    if (!item.binaryValid) {
      results.push(buildRejectedBinaryItem(item));
      continue;
    }

    if (quotaExceeded) {
      results.push(
        buildNotProcessedItem(
          item,
          'Not processed because Gemini AI quota or rate limit was exceeded earlier in this batch.',
          'QUOTA_STOPPED',
          'NOT_PROCESSED'
        )
      );
      continue;
    }

    try {
      const outcome = await runSingleImageAnalysis({
        imageBuffer: item.buffer,
        mimeType: item.mimeType,
      });

      if (!outcome.executedDiseaseAgent || !outcome.diseaseAnalysis) {
        results.push({
          index: item.index,
          fileName: item.fileName,
          mimeType: item.mimeType,
          sizeBytes: item.size,
          imageUrl: null,
          imagePublicId: null,
          processingStatus: 'REJECTED',
          validationStatus: outcome.validation.status,
          crop: null,
          diseaseStatus: 'REJECTED',
          diseaseName: null,
          confidence: outcome.validation.confidence,
          severity: null,
          estimatedAffectedAreaPercent: null,
          symptoms: [],
          visualEvidence: [],
          diseaseExplanation: null,
          possibleCauses: [],
          managementRecommendations: [],
          treatmentGuidance: [],
          preventiveMeasures: [],
          summary: null,
          rejectionReason:
            outcome.validation.reason || outcome.validation.message,
          errorCode: outcome.validation.status,
          validation: outcome.validation,
          diseaseAnalysis: null,
        });
        continue;
      }

      const { validation, diseaseAnalysis } = outcome;
      results.push({
        index: item.index,
        fileName: item.fileName,
        mimeType: item.mimeType,
        sizeBytes: item.size,
        imageUrl: null,
        imagePublicId: null,
        processingStatus: 'ANALYZED',
        validationStatus: validation.status,
        crop: diseaseAnalysis.crop,
        diseaseStatus: diseaseAnalysis.status,
        diseaseName: diseaseAnalysis.diseaseName,
        confidence: diseaseAnalysis.confidence,
        severity: diseaseAnalysis.severity,
        estimatedAffectedAreaPercent:
          diseaseAnalysis.estimatedAffectedAreaPercent,
        symptoms: diseaseAnalysis.symptoms,
        visualEvidence: diseaseAnalysis.visualEvidence,
        diseaseExplanation: diseaseAnalysis.diseaseExplanation,
        possibleCauses: diseaseAnalysis.possibleCauses,
        managementRecommendations: diseaseAnalysis.managementRecommendations,
        treatmentGuidance: diseaseAnalysis.treatmentGuidance,
        preventiveMeasures: diseaseAnalysis.preventiveMeasures,
        summary: diseaseAnalysis.summary,
        rejectionReason: null,
        errorCode: null,
        validation,
        diseaseAnalysis,
      });
    } catch (err) {
      if (err?.code === 'AI_RATE_LIMIT' || err?.statusCode === 429) {
        quotaExceeded = true;
        quotaErrorMessage =
          err.message ||
          'AI service rate limit or quota exceeded. Please try again later.';
        results.push(
          buildNotProcessedItem(
            item,
            quotaErrorMessage,
            'AI_RATE_LIMIT',
            'AI_RATE_LIMIT'
          )
        );
        continue;
      }

      if (err?.code === 'AI_NOT_CONFIGURED' || err?.code === 'AI_AUTH_ERROR') {
        throw err;
      }

      results.push({
        ...buildNotProcessedItem(
          item,
          err.message || 'Unable to analyze this image.',
          err.code || 'AI_SERVICE_ERROR',
          err.code || 'AI_SERVICE_ERROR'
        ),
        processingStatus: 'FAILED',
      });
    }
  }

  const summary = calculateBatchSummary(results);
  const processingStatus = quotaExceeded
    ? 'PARTIAL_QUOTA_EXCEEDED'
    : summary.rejected > 0 || summary.notProcessed > 0
      ? 'COMPLETED_WITH_REJECTIONS'
      : 'COMPLETED';

  return {
    agent: 'MultiImageAnalysisAgent',
    processingStatus,
    quotaExceeded,
    quotaErrorMessage,
    summary,
    items: results,
  };
};
