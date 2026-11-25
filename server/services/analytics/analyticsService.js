import mongoose from 'mongoose';
import { SUPPORTED_CROPS } from '../../config/constants.js';
import DiseaseAnalysis from '../../models/DiseaseAnalysis.js';
import MultiImageAnalysis from '../../models/MultiImageAnalysis.js';
import PlantIdentification from '../../models/PlantIdentification.js';
import AppError from '../../utils/AppError.js';

export const COUNTING_DEFINITIONS = {
  totalAnalyses:
    'Count of distinct analysis sessions: Disease Detection runs + Plant Identification runs + Multi Image Analysis batches (no batch/image double counting).',
  totalImagesProcessed:
    'Count of all individual images submitted across Disease Detection (1 each), Plant Identification (1 each), and Multi Image batches (sum of uploaded images).',
  healthOutcomes:
    'Counts of individual evaluated leaf/plant results across single Disease Detection analyses and ANALYZED batch images only (EXCLUDES rejected and not-processed items).',
};

const toObjectId = (userId) => {
  if (userId instanceof mongoose.Types.ObjectId) {
    return userId;
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('Invalid authenticated user reference.', 400, 'INVALID_USER_ID');
  }
  return new mongoose.Types.ObjectId(userId);
};

const getCutoffDate = (days) => {
  const cutoff = new Date();
  cutoff.setUTCHours(0, 0, 0, 0);
  cutoff.setUTCDate(cutoff.getUTCDate() - (days - 1));
  return cutoff;
};

const formatDateKey = (date, granularity) => {
  const iso = date.toISOString();
  return granularity === 'monthly' ? iso.slice(0, 7) : iso.slice(0, 10);
};

/**
 * Runs efficient MongoDB aggregations strictly scoped to one authenticated user ID.
 */
export const getUserAnalyticsBundle = async (
  userId,
  { days = 30, granularity = 'daily', recentLimit = 6 } = {}
) => {
  const userObjectId = toObjectId(userId);

  const safeDays = Math.min(Math.max(Number(days) || 30, 1), 365);
  const safeGranularity = granularity === 'monthly' ? 'monthly' : 'daily';
  const safeRecentLimit = Math.min(Math.max(Number(recentLimit) || 6, 1), 25);
  const dateFormat = safeGranularity === 'monthly' ? '%Y-%m' : '%Y-%m-%d';
  const activityCutoff = getCutoffDate(safeDays);

  const [diseaseAgg, plantAgg, multiAgg, recentDisease, recentPlant, recentMulti] =
    await Promise.all([
      DiseaseAnalysis.aggregate([
        { $match: { user: userObjectId } },
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  healthy: {
                    $sum: { $cond: [{ $eq: ['$status', 'HEALTHY'] }, 1, 0] },
                  },
                  diseased: {
                    $sum: { $cond: [{ $eq: ['$status', 'DISEASED'] }, 1, 0] },
                  },
                  uncertain: {
                    $sum: { $cond: [{ $eq: ['$status', 'UNCERTAIN'] }, 1, 0] },
                  },
                },
              },
            ],
            byCrop: [
              { $match: { crop: { $in: SUPPORTED_CROPS } } },
              {
                $group: {
                  _id: '$crop',
                  count: { $sum: 1 },
                  healthy: {
                    $sum: { $cond: [{ $eq: ['$status', 'HEALTHY'] }, 1, 0] },
                  },
                  diseased: {
                    $sum: { $cond: [{ $eq: ['$status', 'DISEASED'] }, 1, 0] },
                  },
                  uncertain: {
                    $sum: { $cond: [{ $eq: ['$status', 'UNCERTAIN'] }, 1, 0] },
                  },
                },
              },
            ],
            byDisease: [
              {
                $match: {
                  status: 'DISEASED',
                  diseaseName: { $type: 'string', $ne: '' },
                },
              },
              {
                $group: {
                  _id: { crop: '$crop', diseaseName: '$diseaseName' },
                  count: { $sum: 1 },
                  avgConfidence: { $avg: '$confidence' },
                },
              },
            ],
            byPeriod: [
              { $match: { createdAt: { $gte: activityCutoff } } },
              {
                $group: {
                  _id: {
                    $dateToString: { format: dateFormat, date: '$createdAt' },
                  },
                  diseaseDetections: { $sum: 1 },
                },
              },
            ],
          },
        },
      ]),
      PlantIdentification.aggregate([
        { $match: { user: userObjectId } },
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  identified: {
                    $sum: { $cond: [{ $eq: ['$status', 'IDENTIFIED'] }, 1, 0] },
                  },
                  uncertain: {
                    $sum: { $cond: [{ $eq: ['$status', 'UNCERTAIN'] }, 1, 0] },
                  },
                },
              },
            ],
            byCrop: [
              { $match: { crop: { $in: SUPPORTED_CROPS } } },
              {
                $group: {
                  _id: '$crop',
                  count: { $sum: 1 },
                },
              },
            ],
            byPeriod: [
              { $match: { createdAt: { $gte: activityCutoff } } },
              {
                $group: {
                  _id: {
                    $dateToString: { format: dateFormat, date: '$createdAt' },
                  },
                  plantIdentifications: { $sum: 1 },
                },
              },
            ],
          },
        },
      ]),
      MultiImageAnalysis.aggregate([
        { $match: { user: userObjectId } },
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  batches: { $sum: 1 },
                  uploadedImages: { $sum: '$summary.totalUploaded' },
                  analyzedImages: { $sum: '$summary.successfullyAnalyzed' },
                  rejectedImages: { $sum: '$summary.rejected' },
                  notProcessedImages: { $sum: '$summary.notProcessed' },
                  healthy: { $sum: '$summary.healthy' },
                  diseased: { $sum: '$summary.diseased' },
                  uncertain: { $sum: '$summary.uncertain' },
                },
              },
            ],
            byCrop: [
              { $unwind: '$items' },
              {
                $match: {
                  'items.processingStatus': 'ANALYZED',
                  'items.crop': { $in: SUPPORTED_CROPS },
                },
              },
              {
                $group: {
                  _id: '$items.crop',
                  count: { $sum: 1 },
                  healthy: {
                    $sum: {
                      $cond: [{ $eq: ['$items.diseaseStatus', 'HEALTHY'] }, 1, 0],
                    },
                  },
                  diseased: {
                    $sum: {
                      $cond: [{ $eq: ['$items.diseaseStatus', 'DISEASED'] }, 1, 0],
                    },
                  },
                  uncertain: {
                    $sum: {
                      $cond: [{ $eq: ['$items.diseaseStatus', 'UNCERTAIN'] }, 1, 0],
                    },
                  },
                },
              },
            ],
            byDisease: [
              { $unwind: '$items' },
              {
                $match: {
                  'items.processingStatus': 'ANALYZED',
                  'items.diseaseStatus': 'DISEASED',
                  'items.diseaseName': { $type: 'string', $ne: '' },
                },
              },
              {
                $group: {
                  _id: { crop: '$items.crop', diseaseName: '$items.diseaseName' },
                  count: { $sum: 1 },
                  avgConfidence: { $avg: '$items.confidence' },
                },
              },
            ],
            byPeriod: [
              { $match: { createdAt: { $gte: activityCutoff } } },
              {
                $group: {
                  _id: {
                    $dateToString: { format: dateFormat, date: '$createdAt' },
                  },
                  multiImageBatches: { $sum: 1 },
                  batchImagesUploaded: { $sum: '$summary.totalUploaded' },
                },
              },
            ],
          },
        },
      ]),
      DiseaseAnalysis.find({ user: userObjectId })
        .sort({ createdAt: -1 })
        .limit(safeRecentLimit)
        .select('crop status diseaseName confidence severity imageUrl createdAt')
        .lean(),
      PlantIdentification.find({ user: userObjectId })
        .sort({ createdAt: -1 })
        .limit(safeRecentLimit)
        .select('crop status commonName scientificName confidence imageUrl createdAt')
        .lean(),
      MultiImageAnalysis.find({ user: userObjectId })
        .sort({ createdAt: -1 })
        .limit(safeRecentLimit)
        .select('batchId processingStatus summary items.imageUrl createdAt')
        .lean(),
    ]);

  // 1. Overview Totals (strictly consistent, zero double counting)
  const dTotals = diseaseAgg[0]?.totals?.[0] || {};
  const pTotals = plantAgg[0]?.totals?.[0] || {};
  const mTotals = multiAgg[0]?.totals?.[0] || {};

  const diseaseDetectionCount = dTotals.total || 0;
  const plantIdentificationCount = pTotals.total || 0;
  const multiImageBatchCount = mTotals.batches || 0;
  const totalAnalyses =
    diseaseDetectionCount + plantIdentificationCount + multiImageBatchCount;

  const totalImagesProcessed =
    diseaseDetectionCount +
    plantIdentificationCount +
    (mTotals.uploadedImages || 0);

  const healthyResults = (dTotals.healthy || 0) + (mTotals.healthy || 0);
  const diseasedResults = (dTotals.diseased || 0) + (mTotals.diseased || 0);
  const uncertainResults =
    (dTotals.uncertain || 0) +
    (pTotals.uncertain || 0) +
    (mTotals.uncertain || 0);
  const rejectedImages = mTotals.rejectedImages || 0;
  const notProcessedImages = mTotals.notProcessedImages || 0;

  const overview = {
    totalAnalyses,
    diseaseDetections: diseaseDetectionCount,
    plantIdentifications: plantIdentificationCount,
    multiImageBatches: multiImageBatchCount,
    totalImagesProcessed,
    healthyDetections: healthyResults,
    diseasedDetections: diseasedResults,
    uncertainResults,
    rejectedImages,
    notProcessedImages,
    identifiedPlants: pTotals.identified || 0,
  };

  // 2. Crop Analytics across all 5 strictly supported crops
  const cropMap = new Map(
    SUPPORTED_CROPS.map((crop) => [
      crop,
      {
        crop,
        totalCount: 0,
        diseaseDetectionCount: 0,
        plantIdentificationCount: 0,
        multiImageItemCount: 0,
        healthyCount: 0,
        diseasedCount: 0,
        uncertainCount: 0,
      },
    ])
  );

  for (const row of diseaseAgg[0]?.byCrop || []) {
    const entry = cropMap.get(row._id);
    if (!entry) continue;
    entry.diseaseDetectionCount = row.count || 0;
    entry.totalCount += row.count || 0;
    entry.healthyCount += row.healthy || 0;
    entry.diseasedCount += row.diseased || 0;
    entry.uncertainCount += row.uncertain || 0;
  }

  for (const row of plantAgg[0]?.byCrop || []) {
    const entry = cropMap.get(row._id);
    if (!entry) continue;
    entry.plantIdentificationCount = row.count || 0;
    entry.totalCount += row.count || 0;
  }

  for (const row of multiAgg[0]?.byCrop || []) {
    const entry = cropMap.get(row._id);
    if (!entry) continue;
    entry.multiImageItemCount = row.count || 0;
    entry.totalCount += row.count || 0;
    entry.healthyCount += row.healthy || 0;
    entry.diseasedCount += row.diseased || 0;
    entry.uncertainCount += row.uncertain || 0;
  }

  const cropAnalytics = Array.from(cropMap.values());

  // 3. Disease Analytics (from DISEASED results only; never fabricates counts)
  const diseaseKeyMap = new Map();
  const mergeDiseaseRows = (rows) => {
    for (const row of rows || []) {
      const crop = row._id?.crop || 'Unknown';
      const diseaseName = String(row._id?.diseaseName || '').trim();
      if (!diseaseName) continue;
      const key = `${crop}::${diseaseName.toLowerCase()}`;
      const existing = diseaseKeyMap.get(key);
      const count = row.count || 0;
      const avgConf = typeof row.avgConfidence === 'number' ? row.avgConfidence : null;

      if (!existing) {
        diseaseKeyMap.set(key, {
          crop,
          diseaseName,
          count,
          confidenceSum: avgConf !== null ? avgConf * count : 0,
          confidenceWeight: avgConf !== null ? count : 0,
        });
      } else {
        existing.count += count;
        if (avgConf !== null) {
          existing.confidenceSum += avgConf * count;
          existing.confidenceWeight += count;
        }
      }
    }
  };

  mergeDiseaseRows(diseaseAgg[0]?.byDisease);
  mergeDiseaseRows(multiAgg[0]?.byDisease);

  const diseaseDistribution = Array.from(diseaseKeyMap.values())
    .map((item) => ({
      crop: item.crop,
      diseaseName: item.diseaseName,
      count: item.count,
      avgConfidence:
        item.confidenceWeight > 0
          ? Math.round(item.confidenceSum / item.confidenceWeight)
          : null,
    }))
    .sort((a, b) => b.count - a.count);

  const cropDiseaseBreakdown = SUPPORTED_CROPS.map((crop) => ({
    crop,
    diseases: diseaseDistribution
      .filter((d) => d.crop === crop)
      .map(({ diseaseName, count, avgConfidence }) => ({
        diseaseName,
        count,
        avgConfidence,
      })),
  })).filter((entry) => entry.diseases.length > 0);

  const healthDistribution = [
    { name: 'Healthy', count: healthyResults },
    { name: 'Diseased', count: diseasedResults },
    { name: 'Uncertain', count: uncertainResults },
  ];

  const diseaseAnalytics = {
    healthyCount: healthyResults,
    diseasedCount: diseasedResults,
    uncertainDiseaseCount: (dTotals.uncertain || 0) + (mTotals.uncertain || 0),
    mostFrequentDisease: diseaseDistribution.length > 0 ? diseaseDistribution[0] : null,
    diseaseDistribution,
    cropDiseaseBreakdown,
    healthDistribution,
  };

  // 4. Activity Over Time (empty array when user has 0 records so charts never fabricate points)
  const periodMap = new Map();
  const upsertPeriod = (periodKey) => {
    if (!periodMap.has(periodKey)) {
      periodMap.set(periodKey, {
        date: periodKey,
        diseaseDetections: 0,
        plantIdentifications: 0,
        multiImageBatches: 0,
        totalAnalyses: 0,
      });
    }
    return periodMap.get(periodKey);
  };

  for (const row of diseaseAgg[0]?.byPeriod || []) {
    const bucket = upsertPeriod(row._id);
    bucket.diseaseDetections = row.diseaseDetections || 0;
    bucket.totalAnalyses += bucket.diseaseDetections;
  }
  for (const row of plantAgg[0]?.byPeriod || []) {
    const bucket = upsertPeriod(row._id);
    bucket.plantIdentifications = row.plantIdentifications || 0;
    bucket.totalAnalyses += bucket.plantIdentifications;
  }
  for (const row of multiAgg[0]?.byPeriod || []) {
    const bucket = upsertPeriod(row._id);
    bucket.multiImageBatches = row.multiImageBatches || 0;
    bucket.totalAnalyses += bucket.multiImageBatches;
  }

  let timeline = [];
  if (periodMap.size > 0 && safeGranularity === 'daily' && safeDays <= 90) {
    // Fill zero-count days only within the active user's queried window when records exist
    const cursor = new Date(activityCutoff);
    const today = new Date();
    today.setUTCHours(23, 59, 59, 999);
    while (cursor <= today) {
      const key = formatDateKey(cursor, 'daily');
      timeline.push(
        periodMap.get(key) || {
          date: key,
          diseaseDetections: 0,
          plantIdentifications: 0,
          multiImageBatches: 0,
          totalAnalyses: 0,
        }
      );
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  } else if (periodMap.size > 0) {
    timeline = Array.from(periodMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }

  const analysisTypeDistribution = [
    { name: 'Disease Detection', type: 'disease_detection', count: diseaseDetectionCount },
    { name: 'Plant Identification', type: 'plant_identification', count: plantIdentificationCount },
    { name: 'Multi Image Batch', type: 'multi_image_analysis', count: multiImageBatchCount },
  ];

  const activityAnalytics = {
    days: safeDays,
    granularity: safeGranularity,
    hasActivity: totalAnalyses > 0,
    timeline,
    analysisTypeDistribution,
  };

  // 5. Recent Activity normalized for direct linking to History detail view
  const normalizedRecent = [
    ...recentDisease.map((doc) => ({
      id: doc._id.toString(),
      analysisType: 'disease_detection',
      crop: doc.crop,
      title:
        doc.status === 'DISEASED' && doc.diseaseName
          ? doc.diseaseName
          : doc.status === 'HEALTHY'
            ? 'Healthy Plant'
            : 'Inconclusive Assessment',
      status: doc.status,
      confidence: doc.confidence,
      thumbnailUrl: doc.imageUrl || null,
      createdAt: doc.createdAt,
    })),
    ...recentPlant.map((doc) => ({
      id: doc._id.toString(),
      analysisType: 'plant_identification',
      crop: doc.crop || doc.commonName || 'Supported Crop',
      title: doc.commonName || doc.crop || 'Plant Identification',
      status: doc.status,
      confidence: doc.confidence,
      thumbnailUrl: doc.imageUrl || null,
      createdAt: doc.createdAt,
    })),
    ...recentMulti.map((doc) => {
      const crops = Object.keys(doc.summary?.cropDistribution || {});
      return {
        id: doc._id.toString(),
        analysisType: 'multi_image_analysis',
        crop: crops.length > 0 ? crops.join(', ') : `${doc.summary?.totalUploaded || 0} Images`,
        title: `Batch (${doc.summary?.totalUploaded || 0} images) — ${doc.summary?.successfullyAnalyzed || 0} analyzed`,
        status: doc.processingStatus,
        confidence: null,
        thumbnailUrl: (doc.items || []).find((i) => i.imageUrl)?.imageUrl || null,
        createdAt: doc.createdAt,
      };
    }),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, safeRecentLimit);

  return {
    overview,
    countingDefinitions: COUNTING_DEFINITIONS,
    cropAnalytics,
    diseaseAnalytics,
    activityAnalytics,
    recentActivity: normalizedRecent,
  };
};
