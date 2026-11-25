import mongoose from 'mongoose';
import { SUPPORTED_CROPS } from '../config/constants.js';

const batchImageItemSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true },
    fileName: { type: String, required: true, trim: true },
    mimeType: { type: String, default: null },
    sizeBytes: { type: Number, default: 0 },
    imageUrl: { type: String, default: null },
    imagePublicId: { type: String, default: null },
    processingStatus: {
      type: String,
      enum: ['ANALYZED', 'REJECTED', 'NOT_PROCESSED', 'FAILED'],
      required: true,
    },
    validationStatus: { type: String, required: true },
    crop: {
      type: String,
      enum: [...SUPPORTED_CROPS, null],
      default: null,
    },
    diseaseStatus: {
      type: String,
      enum: ['HEALTHY', 'DISEASED', 'UNCERTAIN', 'REJECTED', 'NOT_PROCESSED'],
      required: true,
    },
    diseaseName: { type: String, default: null },
    confidence: { type: Number, min: 0, max: 100, default: null },
    severity: { type: String, default: null },
    estimatedAffectedAreaPercent: { type: Number, min: 0, max: 100, default: null },
    symptoms: { type: [String], default: [] },
    visualEvidence: { type: [String], default: [] },
    diseaseExplanation: { type: String, default: null },
    possibleCauses: { type: [String], default: [] },
    managementRecommendations: { type: [String], default: [] },
    treatmentGuidance: { type: [String], default: [] },
    preventiveMeasures: { type: [String], default: [] },
    summary: { type: String, default: null },
    rejectionReason: { type: String, default: null },
    errorCode: { type: String, default: null },
    validation: { type: mongoose.Schema.Types.Mixed, default: null },
    diseaseAnalysis: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const multiImageAnalysisSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    batchId: {
      type: String,
      required: [true, 'Batch ID is required'],
      unique: true,
      index: true,
    },
    analysisType: {
      type: String,
      default: 'multi_image_analysis',
      immutable: true,
    },
    processingStatus: {
      type: String,
      enum: ['COMPLETED', 'COMPLETED_WITH_REJECTIONS', 'PARTIAL_QUOTA_EXCEEDED'],
      required: true,
    },
    quotaExceeded: {
      type: Boolean,
      default: false,
    },
    quotaErrorMessage: {
      type: String,
      default: null,
    },
    summary: {
      totalUploaded: { type: Number, required: true },
      successfullyAnalyzed: { type: Number, required: true },
      rejected: { type: Number, required: true },
      notProcessed: { type: Number, required: true },
      healthy: { type: Number, required: true },
      diseased: { type: Number, required: true },
      uncertain: { type: Number, required: true },
      healthyPercentage: { type: Number, required: true },
      diseasedPercentage: { type: Number, required: true },
      cropDistribution: { type: mongoose.Schema.Types.Mixed, default: {} },
      diseaseDistribution: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    items: {
      type: [batchImageItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

multiImageAnalysisSchema.index({ user: 1, createdAt: -1 });

const MultiImageAnalysis = mongoose.model(
  'MultiImageAnalysis',
  multiImageAnalysisSchema
);

export default MultiImageAnalysis;
