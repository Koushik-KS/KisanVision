import { MAX_BATCH_IMAGES, SUPPORTED_CROPS } from '../../../config/constants.js';
import AppError from '../../../utils/AppError.js';

/**
 * Compute real batch summary statistics strictly from actual image results.
 * Healthy/Diseased percentages use only successfully analyzed HEALTHY + DISEASED images
 * as the denominator; UNCERTAIN, REJECTED, and NOT_PROCESSED images are excluded.
 */
export const calculateBatchSummary = (items) => {
  if (!Array.isArray(items)) {
    throw new AppError('Batch items must be an array.', 500, 'BATCH_SUMMARY_ERROR');
  }

  if (items.length > MAX_BATCH_IMAGES) {
    throw new AppError(
      `Batch cannot exceed ${MAX_BATCH_IMAGES} images.`,
      400,
      'TOO_MANY_FILES'
    );
  }

  let successfullyAnalyzed = 0;
  let rejected = 0;
  let notProcessed = 0;
  let healthy = 0;
  let diseased = 0;
  let uncertain = 0;

  const cropCounts = {};
  const diseaseCounts = {};

  for (const item of items) {
    if (item.processingStatus === 'ANALYZED') {
      successfullyAnalyzed += 1;

      if (item.crop && SUPPORTED_CROPS.includes(item.crop)) {
        cropCounts[item.crop] = (cropCounts[item.crop] || 0) + 1;
      }

      if (item.diseaseStatus === 'HEALTHY') {
        healthy += 1;
      } else if (item.diseaseStatus === 'DISEASED') {
        diseased += 1;
        if (item.diseaseName) {
          diseaseCounts[item.diseaseName] =
            (diseaseCounts[item.diseaseName] || 0) + 1;
        }
      } else if (item.diseaseStatus === 'UNCERTAIN') {
        uncertain += 1;
      }
    } else if (item.processingStatus === 'REJECTED') {
      rejected += 1;
    } else {
      notProcessed += 1;
    }
  }

  const denominator = healthy + diseased;
  const healthyPercentage =
    denominator > 0 ? Number(((healthy / denominator) * 100).toFixed(1)) : 0;
  const diseasedPercentage =
    denominator > 0 ? Number(((diseased / denominator) * 100).toFixed(1)) : 0;

  return {
    totalUploaded: items.length,
    successfullyAnalyzed,
    rejected,
    notProcessed,
    healthy,
    diseased,
    uncertain,
    healthyPercentage,
    diseasedPercentage,
    cropDistribution: cropCounts,
    diseaseDistribution: diseaseCounts,
  };
};
