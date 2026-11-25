import mongoose from 'mongoose';
import { SUPPORTED_CROPS } from '../config/constants.js';

const plantIdentificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    analysisType: {
      type: String,
      default: 'plant_identification',
      immutable: true,
    },
    crop: {
      type: String,
      enum: [...SUPPORTED_CROPS, null],
      default: null,
    },
    status: {
      type: String,
      enum: ['IDENTIFIED', 'UNCERTAIN'],
      required: [true, 'Identification status is required'],
    },
    commonName: {
      type: String,
      trim: true,
      default: null,
    },
    scientificName: {
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
    imageStorageStatus: {
      type: String,
      enum: ['STORED', 'NOT_CONFIGURED', 'UPLOAD_FAILED', null],
      default: null,
    },
    imageStorageError: {
      type: String,
      default: null,
    },
    imageMetadata: {
      mimeType: {
        type: String,
        default: null,
      },
      sizeBytes: {
        type: Number,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

plantIdentificationSchema.index({ user: 1, createdAt: -1 });
plantIdentificationSchema.index({ user: 1, crop: 1, createdAt: -1 });
plantIdentificationSchema.index({ user: 1, status: 1, createdAt: -1 });

const PlantIdentification = mongoose.model(
  'PlantIdentification',
  plantIdentificationSchema
);

export default PlantIdentification;
