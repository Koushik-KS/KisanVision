import crypto from 'node:crypto';
import mongoose from 'mongoose';
import DiseaseAnalysis from '../models/DiseaseAnalysis.js';
import MultiImageAnalysis from '../models/MultiImageAnalysis.js';
import PlantIdentification from '../models/PlantIdentification.js';
import { AI_TASKS, orchestrateAIWorkflow } from '../services/ai/orchestrator.js';
import {
  deleteCloudinaryAssets,
  uploadImageIfConfigured,
} from '../services/cloudinary/cloudinaryService.js';
import AppError from '../utils/AppError.js';
import { sendError, sendSuccess } from '../utils/apiResponse.js';

/**
 * POST /api/ai/validate-crop
 * Validates an uploaded image through the AI Orchestrator and Crop Validation Agent.
 */
export const validateCrop = async (req, res, next) => {
  try {
    const { buffer, mimeType } = req.validatedImage;

    const result = await orchestrateAIWorkflow(AI_TASKS.CROP_VALIDATION, {
      imageBuffer: buffer,
      mimeType,
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: result.message,
      data: {
        agent: result.agent,
        status: result.status,
        isPlant: result.isPlant,
        isSupportedCrop: result.isSupportedCrop,
        crop: result.crop,
        confidence: result.confidence,
        imageQuality: result.imageQuality,
        message: result.message,
        reason: result.reason,
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/ai/disease-detection
 * Runs Crop Validation Agent first via the Orchestrator; if VALID, runs Disease Detection Agent
 * and saves the validated analysis result to MongoDB for the authenticated user.
 */
export const detectDisease = async (req, res, next) => {
  let uploadedPublicId = null;
  try {
    const { buffer, mimeType, size } = req.validatedImage;

    const result = await orchestrateAIWorkflow(AI_TASKS.DISEASE_DETECTION, {
      imageBuffer: buffer,
      mimeType,
    });

    if (!result.executedDiseaseAgent || !result.diseaseAnalysis) {
      return sendSuccess(res, {
        statusCode: 200,
        message: result.validation.message,
        data: {
          validation: result.validation,
          diseaseAnalysis: null,
          record: null,
        },
      });
    }

    const storageResult = await uploadImageIfConfigured({
      imageBuffer: buffer,
      mimeType,
      userId: req.user.id,
      category: 'disease-detection',
    });
    uploadedPublicId = storageResult.imagePublicId;

    const { diseaseAnalysis, validation } = result;

    const savedRecord = await DiseaseAnalysis.create({
      user: req.user.id,
      crop: diseaseAnalysis.crop,
      status: diseaseAnalysis.status,
      diseaseName: diseaseAnalysis.diseaseName,
      confidence: diseaseAnalysis.confidence,
      severity: diseaseAnalysis.severity,
      estimatedAffectedAreaPercent: diseaseAnalysis.estimatedAffectedAreaPercent,
      aiResult: {
        validation,
        diseaseAnalysis,
      },
      imageUrl: storageResult.imageUrl,
      imagePublicId: storageResult.imagePublicId,
      imageStorageStatus: storageResult.storageStatus,
      imageStorageError: storageResult.storageError,
      imageMetadata: {
        mimeType,
        sizeBytes: size,
      },
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: diseaseAnalysis.summary,
      data: {
        validation,
        diseaseAnalysis,
        record: {
          id: savedRecord._id.toString(),
          imageUrl: savedRecord.imageUrl,
          imagePublicId: savedRecord.imagePublicId,
          storageStatus: savedRecord.imageStorageStatus,
          storageError: savedRecord.imageStorageError,
          createdAt: savedRecord.createdAt,
        },
      },
    });
  } catch (err) {
    if (uploadedPublicId) {
      await deleteCloudinaryAssets([uploadedPublicId]).catch(() => {});
    }
    return next(err);
  }
};

/**
 * GET /api/ai/disease-detection
 * Returns the authenticated user's saved disease detection records.
 */
export const getDiseaseAnalyses = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const records = await DiseaseAnalysis.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Disease detection records retrieved',
      data: {
        records: records.map((item) => ({
          id: item._id.toString(),
          crop: item.crop,
          status: item.status,
          diseaseName: item.diseaseName,
          confidence: item.confidence,
          severity: item.severity,
          estimatedAffectedAreaPercent: item.estimatedAffectedAreaPercent,
          imageUrl: item.imageUrl,
          aiResult: item.aiResult,
          createdAt: item.createdAt,
        })),
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/ai/disease-detection/:id
 * Returns a single disease detection record owned by the authenticated user.
 */
export const getDiseaseAnalysisById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid analysis record ID.', 400, 'INVALID_ID'));
    }

    const record = await DiseaseAnalysis.findOne({ _id: id, user: req.user.id }).lean();
    if (!record) {
      return next(
        new AppError('Disease analysis record not found.', 404, 'RECORD_NOT_FOUND')
      );
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Disease analysis record retrieved',
      data: {
        record: {
          id: record._id.toString(),
          crop: record.crop,
          status: record.status,
          diseaseName: record.diseaseName,
          confidence: record.confidence,
          severity: record.severity,
          estimatedAffectedAreaPercent: record.estimatedAffectedAreaPercent,
          imageUrl: record.imageUrl,
          aiResult: record.aiResult,
          createdAt: record.createdAt,
        },
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/ai/plant-identification
 * Runs Crop Validation Agent first via the Orchestrator; if VALID, runs Plant Identification Agent
 * and saves the validated identification record to MongoDB for the authenticated user.
 */
export const identifyPlant = async (req, res, next) => {
  let uploadedPublicId = null;
  try {
    const { buffer, mimeType, size } = req.validatedImage;

    const result = await orchestrateAIWorkflow(AI_TASKS.PLANT_IDENTIFICATION, {
      imageBuffer: buffer,
      mimeType,
    });

    if (!result.executedPlantAgent || !result.plantIdentification) {
      return sendSuccess(res, {
        statusCode: 200,
        message: result.validation.message,
        data: {
          validation: result.validation,
          plantIdentification: null,
          record: null,
        },
      });
    }

    const storageResult = await uploadImageIfConfigured({
      imageBuffer: buffer,
      mimeType,
      userId: req.user.id,
      category: 'plant-identification',
    });
    uploadedPublicId = storageResult.imagePublicId;

    const { plantIdentification, validation } = result;

    const savedRecord = await PlantIdentification.create({
      user: req.user.id,
      crop: plantIdentification.crop,
      status: plantIdentification.status,
      commonName: plantIdentification.commonName,
      scientificName: plantIdentification.scientificName,
      confidence: plantIdentification.confidence,
      aiResult: {
        validation,
        plantIdentification,
      },
      imageUrl: storageResult.imageUrl,
      imagePublicId: storageResult.imagePublicId,
      imageStorageStatus: storageResult.storageStatus,
      imageStorageError: storageResult.storageError,
      imageMetadata: {
        mimeType,
        sizeBytes: size,
      },
    });

    return sendSuccess(res, {
      statusCode: 200,
      message:
        plantIdentification.status === 'IDENTIFIED'
          ? `${plantIdentification.commonName} identified successfully.`
          : plantIdentification.plantDescription,
      data: {
        validation,
        plantIdentification,
        record: {
          id: savedRecord._id.toString(),
          imageUrl: savedRecord.imageUrl,
          imagePublicId: savedRecord.imagePublicId,
          storageStatus: savedRecord.storageStatus,
          storageError: savedRecord.storageError,
          createdAt: savedRecord.createdAt,
        },
      },
    });
  } catch (err) {
    if (uploadedPublicId) {
      await deleteCloudinaryAssets([uploadedPublicId]).catch(() => {});
    }
    return next(err);
  }
};

/**
 * GET /api/ai/plant-identification
 * Returns the authenticated user's saved plant identification records.
 */
export const getPlantIdentifications = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const records = await PlantIdentification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Plant identification records retrieved',
      data: {
        records: records.map((item) => ({
          id: item._id.toString(),
          crop: item.crop,
          status: item.status,
          commonName: item.commonName,
          scientificName: item.scientificName,
          confidence: item.confidence,
          imageUrl: item.imageUrl,
          imageMetadata: item.imageMetadata,
          aiResult: item.aiResult,
          createdAt: item.createdAt,
        })),
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/ai/plant-identification/:id
 * Returns a single plant identification record owned by the authenticated user.
 */
export const getPlantIdentificationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid identification record ID.', 400, 'INVALID_ID'));
    }

    const record = await PlantIdentification.findOne({
      _id: id,
      user: req.user.id,
    }).lean();

    if (!record) {
      return next(
        new AppError('Plant identification record not found.', 404, 'RECORD_NOT_FOUND')
      );
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Plant identification record retrieved',
      data: {
        record: {
          id: record._id.toString(),
          crop: record.crop,
          status: record.status,
          commonName: record.commonName,
          scientificName: record.scientificName,
          confidence: record.confidence,
          imageUrl: record.imageUrl,
          imageMetadata: record.imageMetadata,
          aiResult: record.aiResult,
          createdAt: record.createdAt,
        },
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/ai/multi-image-analysis
 * Processes 1-5 images independently via the AI Orchestrator, persists batch results
 * in MongoDB, and stops additional Gemini requests cleanly if quota is exceeded.
 */
export const analyzeBatch = async (req, res, next) => {
  const uploadedPublicIds = [];
  try {
    const items = req.validatedBatchImages;
    const batchResult = await orchestrateAIWorkflow(AI_TASKS.MULTI_IMAGE_ANALYSIS, {
      items,
    });

    const itemsWithStorage = await Promise.all(
      batchResult.items.map(async (item) => {
        const source = items.find((src) => src.index === item.index);
        if (!source?.buffer) return item;

        const storageResult = await uploadImageIfConfigured({
          imageBuffer: source.buffer,
          mimeType: source.mimeType,
          userId: req.user.id,
          category: 'multi-image-analysis',
        });

        if (storageResult.imagePublicId) {
          uploadedPublicIds.push(storageResult.imagePublicId);
        }

        return {
          ...item,
          imageUrl: storageResult.imageUrl,
          imagePublicId: storageResult.imagePublicId,
          imageStorageStatus: storageResult.storageStatus,
          imageStorageError: storageResult.storageError,
        };
      })
    );

    const batchId = crypto.randomUUID();
    const savedBatch = await MultiImageAnalysis.create({
      user: req.user.id,
      batchId,
      processingStatus: batchResult.processingStatus,
      quotaExceeded: batchResult.quotaExceeded,
      quotaErrorMessage: batchResult.quotaErrorMessage,
      summary: batchResult.summary,
      items: itemsWithStorage,
    });

    const responsePayload = {
      id: savedBatch._id.toString(),
      batchId: savedBatch.batchId,
      processingStatus: savedBatch.processingStatus,
      quotaExceeded: savedBatch.quotaExceeded,
      quotaErrorMessage: savedBatch.quotaErrorMessage,
      summary: savedBatch.summary,
      items: savedBatch.items,
      createdAt: savedBatch.createdAt,
    };

    if (
      batchResult.quotaExceeded &&
      batchResult.summary.successfullyAnalyzed === 0
    ) {
      return sendError(res, {
        statusCode: 429,
        message:
          batchResult.quotaErrorMessage ||
          'Gemini AI quota or rate limit exceeded. Remaining images were not processed.',
        error: {
          code: 'AI_RATE_LIMIT',
          batch: responsePayload,
        },
      });
    }

    const statusCode = batchResult.quotaExceeded ? 207 : 200;
    const message = batchResult.quotaExceeded
      ? 'Batch partially completed before Gemini AI quota was reached.'
      : 'Multi-image batch analysis completed.';

    return sendSuccess(res, {
      statusCode,
      message,
      data: {
        batch: responsePayload,
      },
    });
  } catch (err) {
    if (uploadedPublicIds.length > 0) {
      await deleteCloudinaryAssets(uploadedPublicIds).catch(() => {});
    }
    return next(err);
  }
};

/**
 * GET /api/ai/multi-image-analysis
 * Returns the authenticated user's saved multi-image batch records.
 */
export const getMultiImageAnalyses = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const records = await MultiImageAnalysis.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Multi-image analysis batches retrieved',
      data: {
        batches: records.map((item) => ({
          id: item._id.toString(),
          batchId: item.batchId,
          processingStatus: item.processingStatus,
          quotaExceeded: item.quotaExceeded,
          quotaErrorMessage: item.quotaErrorMessage,
          summary: item.summary,
          items: item.items,
          createdAt: item.createdAt,
        })),
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/ai/multi-image-analysis/:id
 * Returns a single multi-image batch owned by the authenticated user (lookup by _id or batchId).
 */
export const getMultiImageAnalysisById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId
      ? { _id: id, user: req.user.id }
      : { batchId: id, user: req.user.id };

    const record = await MultiImageAnalysis.findOne(query).lean();
    if (!record) {
      return next(
        new AppError('Multi-image analysis batch not found.', 404, 'RECORD_NOT_FOUND')
      );
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Multi-image analysis batch retrieved',
      data: {
        batch: {
          id: record._id.toString(),
          batchId: record.batchId,
          processingStatus: record.processingStatus,
          quotaExceeded: record.quotaExceeded,
          quotaErrorMessage: record.quotaErrorMessage,
          summary: record.summary,
          items: record.items,
          createdAt: record.createdAt,
        },
      },
    });
  } catch (err) {
    return next(err);
  }
};
