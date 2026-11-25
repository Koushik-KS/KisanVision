import mongoose from 'mongoose';
import { SUPPORTED_CROPS } from '../config/constants.js';
import DiseaseAnalysis from '../models/DiseaseAnalysis.js';
import MultiImageAnalysis from '../models/MultiImageAnalysis.js';
import PlantIdentification from '../models/PlantIdentification.js';
import { deleteCloudinaryAssets } from '../services/cloudinary/cloudinaryService.js';
import AppError from '../utils/AppError.js';
import { sendSuccess } from '../utils/apiResponse.js';

const TYPE_ALIASES = {
  all: 'all',
  disease: 'disease_detection',
  disease_detection: 'disease_detection',
  plant: 'plant_identification',
  plant_identification: 'plant_identification',
  multi: 'multi_image_analysis',
  multi_image_analysis: 'multi_image_analysis',
};

const VALID_DETAIL_TYPES = [
  'disease_detection',
  'plant_identification',
  'multi_image_analysis',
];

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeTypeFilter = (rawType) => {
  if (!rawType) return 'all';
  const normalized = TYPE_ALIASES[String(rawType).trim().toLowerCase()];
  if (!normalized) {
    throw new AppError(
      'Invalid analysis type filter. Use all, disease_detection, plant_identification, or multi_image_analysis.',
      400,
      'INVALID_TYPE_FILTER'
    );
  }
  return normalized;
};

const normalizeCropFilter = (rawCrop) => {
  if (!rawCrop || String(rawCrop).trim().toLowerCase() === 'all') {
    return null;
  }
  const matched = SUPPORTED_CROPS.find(
    (crop) => crop.toLowerCase() === String(rawCrop).trim().toLowerCase()
  );
  if (!matched) {
    throw new AppError(
      'Invalid crop filter. Choose one of Coffee, Black Pepper, Ginger, Cardamom, or Arecanut.',
      400,
      'INVALID_CROP_FILTER'
    );
  }
  return matched;
};

const buildDateRangeFilter = (dateStr) => {
  if (!dateStr) return null;
  const cleaned = String(dateStr).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    throw new AppError(
      'Invalid date format. Expected YYYY-MM-DD.',
      400,
      'INVALID_DATE_FILTER'
    );
  }
  const start = new Date(`${cleaned}T00:00:00.000Z`);
  const end = new Date(`${cleaned}T23:59:59.999Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new AppError('Invalid calendar date.', 400, 'INVALID_DATE_FILTER');
  }
  return { $gte: start, $lte: end };
};

const formatDiseaseSummaryItem = (doc) => ({
  id: doc._id.toString(),
  analysisType: 'disease_detection',
  title:
    doc.status === 'DISEASED' && doc.diseaseName
      ? doc.diseaseName
      : doc.status === 'HEALTHY'
        ? 'Healthy Plant'
        : 'Inconclusive Assessment',
  crop: doc.crop,
  status: doc.status,
  severity: doc.severity,
  confidence: doc.confidence,
  resultSummary:
    doc.aiResult?.diseaseAnalysis?.summary ||
    (doc.status === 'HEALTHY'
      ? `${doc.crop} shows no visible disease symptoms.`
      : `${doc.diseaseName || 'Condition'} (${doc.severity || 'Assessed'})`),
  thumbnailUrl: doc.imageUrl || null,
  imageCount: 1,
  batchSummary: null,
  imageStorageStatus: doc.imageStorageStatus || null,
  createdAt: doc.createdAt,
});

const formatPlantSummaryItem = (doc) => ({
  id: doc._id.toString(),
  analysisType: 'plant_identification',
  title: doc.commonName || doc.crop || 'Plant Identification',
  crop: doc.crop || doc.commonName || 'Supported Crop',
  scientificName: doc.scientificName || null,
  status: doc.status,
  confidence: doc.confidence,
  resultSummary:
    doc.aiResult?.plantIdentification?.plantDescription ||
    `${doc.commonName || 'Plant'}${doc.scientificName ? ` (${doc.scientificName})` : ''}`,
  thumbnailUrl: doc.imageUrl || null,
  imageCount: 1,
  batchSummary: null,
  imageStorageStatus: doc.imageStorageStatus || null,
  createdAt: doc.createdAt,
});

const formatMultiSummaryItem = (doc) => {
  const crops = Object.keys(doc.summary?.cropDistribution || {});
  const cropDisplay =
    crops.length > 0
      ? crops.join(', ')
      : `${doc.summary?.totalUploaded || doc.items?.length || 0} Image Batch`;
  const firstImage = (doc.items || []).find((i) => i.imageUrl)?.imageUrl || null;

  return {
    id: doc._id.toString(),
    batchId: doc.batchId,
    analysisType: 'multi_image_analysis',
    title: `Batch (${doc.summary?.totalUploaded || 0} images)`,
    crop: cropDisplay,
    status: doc.processingStatus,
    confidence: null,
    resultSummary: `${doc.summary?.successfullyAnalyzed || 0} analyzed, ${doc.summary?.healthy || 0} healthy, ${doc.summary?.diseased || 0} diseased, ${doc.summary?.rejected || 0} rejected`,
    thumbnailUrl: firstImage,
    imageCount: doc.summary?.totalUploaded || doc.items?.length || 0,
    batchSummary: doc.summary || null,
    createdAt: doc.createdAt,
  };
};

const fetchUserStats = async (userId) => {
  const [
    totalDisease,
    diseasedDetections,
    healthyDetections,
    plantIdentifications,
    multiImageBatches,
  ] = await Promise.all([
    DiseaseAnalysis.countDocuments({ user: userId }),
    DiseaseAnalysis.countDocuments({ user: userId, status: 'DISEASED' }),
    DiseaseAnalysis.countDocuments({ user: userId, status: 'HEALTHY' }),
    PlantIdentification.countDocuments({ user: userId }),
    MultiImageAnalysis.countDocuments({ user: userId }),
  ]);

  return {
    totalAnalyses: totalDisease + plantIdentifications + multiImageBatches,
    diseaseDetections: totalDisease,
    diseasedDetections,
    healthyDetections,
    plantIdentifications,
    multiImageBatches,
  };
};

const findOwnedRecordAcrossCollections = async (userId, id, explicitType = null) => {
  const typesToCheck = explicitType ? [explicitType] : VALID_DETAIL_TYPES;

  for (const type of typesToCheck) {
    if (type === 'disease_detection') {
      const doc = await DiseaseAnalysis.findOne({ _id: id, user: userId }).lean();
      if (doc) return { analysisType: 'disease_detection', doc };
    } else if (type === 'plant_identification') {
      const doc = await PlantIdentification.findOne({ _id: id, user: userId }).lean();
      if (doc) return { analysisType: 'plant_identification', doc };
    } else if (type === 'multi_image_analysis') {
      const doc = await MultiImageAnalysis.findOne({ _id: id, user: userId }).lean();
      if (doc) return { analysisType: 'multi_image_analysis', doc };
    }
  }

  return null;
};

const serializeDetailRecord = (analysisType, doc) => {
  if (analysisType === 'disease_detection') {
    return {
      id: doc._id.toString(),
      analysisType: 'disease_detection',
      crop: doc.crop,
      status: doc.status,
      diseaseName: doc.diseaseName,
      confidence: doc.confidence,
      severity: doc.severity,
      estimatedAffectedAreaPercent: doc.estimatedAffectedAreaPercent,
      imageUrl: doc.imageUrl || null,
      imagePublicId: doc.imagePublicId || null,
      imageStorageStatus: doc.imageStorageStatus || null,
      imageMetadata: doc.imageMetadata || null,
      aiResult: doc.aiResult,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  if (analysisType === 'plant_identification') {
    return {
      id: doc._id.toString(),
      analysisType: 'plant_identification',
      crop: doc.crop,
      status: doc.status,
      commonName: doc.commonName,
      scientificName: doc.scientificName,
      confidence: doc.confidence,
      imageUrl: doc.imageUrl || null,
      imagePublicId: doc.imagePublicId || null,
      imageStorageStatus: doc.imageStorageStatus || null,
      imageMetadata: doc.imageMetadata || null,
      aiResult: doc.aiResult,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  return {
    id: doc._id.toString(),
    batchId: doc.batchId,
    analysisType: 'multi_image_analysis',
    processingStatus: doc.processingStatus,
    quotaExceeded: doc.quotaExceeded,
    quotaErrorMessage: doc.quotaErrorMessage,
    summary: doc.summary,
    items: doc.items || [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

/**
 * GET /api/history
 * Returns unified paginated history records across Disease Detection, Plant Identification,
 * and Multi Image Analysis strictly owned by req.user.id.
 */
export const getUnifiedHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const typeFilter = normalizeTypeFilter(req.query.type);
    const cropFilter = normalizeCropFilter(req.query.crop);
    const statusFilterRaw = req.query.status
      ? String(req.query.status).trim().toLowerCase()
      : 'all';
    const searchRaw = req.query.search ? String(req.query.search).trim().slice(0, 100) : '';
    const dateRange = buildDateRangeFilter(req.query.date);

    const rawPage = req.query.page !== undefined ? Number(req.query.page) : 1;
    const rawLimit = req.query.limit !== undefined ? Number(req.query.limit) : 10;
    if (!Number.isInteger(rawPage) || rawPage < 1 || rawPage > 10000) {
      throw new AppError('Page must be a positive integer.', 400, 'INVALID_PAGINATION');
    }
    if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 50) {
      throw new AppError('Limit must be an integer between 1 and 50.', 400, 'INVALID_PAGINATION');
    }

    const searchRegex = searchRaw ? new RegExp(escapeRegex(searchRaw), 'i') : null;
    const baseQuery = { user: userId };
    if (dateRange) {
      baseQuery.createdAt = dateRange;
    }

    const queryPromises = [];

    // Disease Detection query
    if (typeFilter === 'all' || typeFilter === 'disease_detection') {
      const dq = { ...baseQuery };
      if (cropFilter) dq.crop = cropFilter;
      if (statusFilterRaw !== 'all') {
        dq.status = statusFilterRaw.toUpperCase();
      }
      if (searchRegex) {
        dq.$or = [
          { crop: searchRegex },
          { diseaseName: searchRegex },
          { 'aiResult.diseaseAnalysis.summary': searchRegex },
        ];
      }
      queryPromises.push(
        DiseaseAnalysis.find(dq)
          .sort({ createdAt: -1 })
          .lean()
          .then((rows) => rows.map(formatDiseaseSummaryItem))
      );
    }

    // Plant Identification query
    if (typeFilter === 'all' || typeFilter === 'plant_identification') {
      const pq = { ...baseQuery };
      if (cropFilter) pq.crop = cropFilter;
      if (statusFilterRaw !== 'all') {
        pq.status = statusFilterRaw.toUpperCase();
      }
      if (searchRegex) {
        pq.$or = [
          { crop: searchRegex },
          { commonName: searchRegex },
          { scientificName: searchRegex },
          { 'aiResult.plantIdentification.plantDescription': searchRegex },
        ];
      }
      queryPromises.push(
        PlantIdentification.find(pq)
          .sort({ createdAt: -1 })
          .lean()
          .then((rows) => rows.map(formatPlantSummaryItem))
      );
    }

    // Multi Image Analysis query
    if (typeFilter === 'all' || typeFilter === 'multi_image_analysis') {
      const mq = { ...baseQuery };
      if (cropFilter) {
        mq['items.crop'] = cropFilter;
      }
      if (statusFilterRaw !== 'all') {
        const upperStatus = statusFilterRaw.toUpperCase();
        if (['HEALTHY', 'DISEASED', 'UNCERTAIN', 'REJECTED', 'NOT_PROCESSED'].includes(upperStatus)) {
          mq['items.diseaseStatus'] = upperStatus;
        } else {
          mq.processingStatus = upperStatus;
        }
      }
      if (searchRegex) {
        mq.$or = [
          { 'items.crop': searchRegex },
          { 'items.diseaseName': searchRegex },
          { 'items.fileName': searchRegex },
        ];
      }
      queryPromises.push(
        MultiImageAnalysis.find(mq)
          .sort({ createdAt: -1 })
          .lean()
          .then((rows) => rows.map(formatMultiSummaryItem))
      );
    }

    const [groupedResults, stats] = await Promise.all([
      Promise.all(queryPromises),
      fetchUserStats(userId),
    ]);

    const combined = groupedResults
      .flat()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalItems = combined.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / rawLimit));
    const safePage = Math.min(rawPage, totalPages);
    const startIdx = (safePage - 1) * rawLimit;
    const records = combined.slice(startIdx, startIdx + rawLimit);

    return sendSuccess(res, {
      statusCode: 200,
      message: 'History records retrieved successfully.',
      data: {
        records,
        pagination: {
          page: safePage,
          limit: rawLimit,
          totalItems,
          totalPages,
          hasNextPage: safePage < totalPages,
          hasPrevPage: safePage > 1,
        },
        stats,
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/history/:type/:id (and /api/history/:id)
 * Returns saved record details strictly owned by req.user.id without invoking Gemini.
 */
export const getHistoryDetail = async (req, res, next) => {
  try {
    const { id, type } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid history record ID.', 400, 'INVALID_ID'));
    }

    let explicitType = null;
    if (type !== undefined) {
      const normalized = TYPE_ALIASES[String(type).trim().toLowerCase()];
      if (!normalized || normalized === 'all') {
        return next(new AppError('Invalid analysis type.', 400, 'INVALID_ANALYSIS_TYPE'));
      }
      explicitType = normalized;
    }

    const found = await findOwnedRecordAcrossCollections(req.user.id, id, explicitType);
    if (!found) {
      return next(new AppError('History record not found.', 404, 'RECORD_NOT_FOUND'));
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'History record details retrieved.',
      data: {
        record: serializeDetailRecord(found.analysisType, found.doc),
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * DELETE /api/history/:type/:id (and /api/history/:id)
 * Verifies ownership, permanently deletes associated Cloudinary assets FIRST,
 * then removes the MongoDB document only after Cloudinary deletion succeeds.
 */
export const deleteHistoryRecord = async (req, res, next) => {
  try {
    const { id, type } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid history record ID.', 400, 'INVALID_ID'));
    }

    let explicitType = null;
    if (type !== undefined) {
      const normalized = TYPE_ALIASES[String(type).trim().toLowerCase()];
      if (!normalized || normalized === 'all') {
        return next(new AppError('Invalid analysis type.', 400, 'INVALID_ANALYSIS_TYPE'));
      }
      explicitType = normalized;
    }

    const found = await findOwnedRecordAcrossCollections(req.user.id, id, explicitType);
    if (!found) {
      return next(new AppError('History record not found.', 404, 'RECORD_NOT_FOUND'));
    }

    const { analysisType, doc } = found;
    const publicIdsToDelete =
      analysisType === 'multi_image_analysis'
        ? (doc.items || []).map((item) => item.imagePublicId).filter(Boolean)
        : [doc.imagePublicId].filter(Boolean);

    // Delete Cloudinary assets belonging strictly to this record BEFORE deleting DB row
    const cloudinaryDeletion = await deleteCloudinaryAssets(publicIdsToDelete);

    if (analysisType === 'disease_detection') {
      await DiseaseAnalysis.deleteOne({ _id: doc._id, user: req.user.id });
    } else if (analysisType === 'plant_identification') {
      await PlantIdentification.deleteOne({ _id: doc._id, user: req.user.id });
    } else {
      await MultiImageAnalysis.deleteOne({ _id: doc._id, user: req.user.id });
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'History record and associated Cloudinary image assets permanently deleted.',
      data: {
        deletedId: doc._id.toString(),
        analysisType,
        deletedPublicIds: publicIdsToDelete,
        cloudinary: {
          requestedCount: cloudinaryDeletion.requestedCount,
          deletedCount: cloudinaryDeletion.deletedCount,
          notFoundCount: cloudinaryDeletion.notFoundCount,
        },
      },
    });
  } catch (err) {
    return next(err);
  }
};
