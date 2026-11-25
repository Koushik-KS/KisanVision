import mongoose from 'mongoose';
import { SUPPORTED_CROPS } from '../config/constants.js';

const diseaseAnalysisSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    analysisType: {
      type: String,
      default: 'disease_detection',
      immutable: true,
    },
    crop: {
      type: String,
      enum: SUPPORTED_CROPS,
      required: [true, 'Supported crop name is required'],
    },
    status: {
      type: String,
      enum: ['HEALTHY', 'DISEASED', 'UNCERTAIN'],
      required: [true, 'Disease analysis status is required'],
    },
    diseaseName: {
      type: String,
      trim: true,
      default: null,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      required: [true, 'Confidence percentage is required'],
    },
    severity: {
      type: String,
      enum: ['None', 'Mild', 'Moderate', 'Severe', 'Uncertain'],
      required: [true, 'Severity level is required'],
    },
    estimatedAffectedAreaPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    aiResult: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Structured AI result is required'],
    },
    imageUrl: {
      type: String,
      default: null,
    },
    imagePublicId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

diseaseAnalysisSchema.index({ user: 1, createdAt: -1 });

const DiseaseAnalysis = mongoose.model('DiseaseAnalysis', diseaseAnalysisSchema);

export default DiseaseAnalysis;
