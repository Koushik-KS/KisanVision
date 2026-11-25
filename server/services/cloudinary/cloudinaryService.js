import crypto from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import env from '../../config/env.js';
import AppError from '../../utils/AppError.js';

const DEFAULT_CLOUDINARY_TIMEOUT_MS = 25000;
const BASE_FOLDER = 'kisanvision';

let configuredSignature = null;

/**
 * Checks whether all required Cloudinary credentials are present in server env.
 */
export const isCloudinaryConfigured = () =>
  Boolean(
    env.cloudinaryCloudName &&
      env.cloudinaryApiKey &&
      env.cloudinaryApiSecret
  );

/**
 * Configures and returns the Cloudinary v2 client when credentials are present.
 * Never logs or exposes API keys or secrets.
 */
const getConfiguredClient = () => {
  if (!isCloudinaryConfigured()) {
    throw new AppError(
      'Cloudinary image storage is not configured on the server.',
      503,
      'CLOUDINARY_NOT_CONFIGURED'
    );
  }

  const nextSignature = `${env.cloudinaryCloudName}:${env.cloudinaryApiKey.slice(0, 4)}:${env.cloudinaryApiSecret.length}`;
  if (configuredSignature !== nextSignature) {
    cloudinary.config({
      cloud_name: env.cloudinaryCloudName,
      api_key: env.cloudinaryApiKey,
      api_secret: env.cloudinaryApiSecret,
      secure: true,
    });
    configuredSignature = nextSignature;
  }

  return cloudinary;
};

/**
 * Returns non-sensitive Cloudinary readiness metadata for diagnostics/health checks.
 */
export const getCloudinaryStatus = () => ({
  configured: isCloudinaryConfigured(),
  hasCloudName: Boolean(env.cloudinaryCloudName),
  hasApiKey: Boolean(env.cloudinaryApiKey),
  hasApiSecret: Boolean(env.cloudinaryApiSecret),
  rootFolder: BASE_FOLDER,
});

const sanitizeFolderSegment = (segment, fallback = 'general') => {
  const cleaned = String(segment || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || fallback;
};

const scrubCloudinaryError = (err) => {
  const rawMessage = err?.message || err?.error?.message || 'Cloudinary operation failed.';
  const safeParts = [
    env.cloudinaryApiKey,
    env.cloudinaryApiSecret,
    env.cloudinaryCloudName,
  ].filter(Boolean);

  let sanitized = String(rawMessage);
  for (const secret of safeParts) {
    if (secret && sanitized.includes(secret)) {
      sanitized = sanitized.split(secret).join('[REDACTED]');
    }
  }
  return sanitized;
};

/**
 * Uploads an already-validated image buffer to Cloudinary under a user-scoped KisanVision folder.
 */
export const uploadImageBuffer = async (
  {
    imageBuffer,
    mimeType,
    userId,
    category = 'analyses',
    timeoutMs = DEFAULT_CLOUDINARY_TIMEOUT_MS,
  },
  deps = {}
) => {
  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    throw new AppError('Valid image buffer is required for Cloudinary upload.', 400, 'INVALID_UPLOAD_BUFFER');
  }

  const client = deps.cloudinaryClient || getConfiguredClient();
  const safeUserSegment = sanitizeFolderSegment(userId, 'anonymous');
  const safeCategorySegment = sanitizeFolderSegment(category, 'analyses');
  const folder = `${BASE_FOLDER}/${safeUserSegment}/${safeCategorySegment}`;
  const bufferDigest = crypto
    .createHash('sha256')
    .update(imageBuffer)
    .digest('hex')
    .slice(0, 10);
  const uniqueSuffix = crypto.randomBytes(4).toString('hex');
  const publicIdName = `kv_${Date.now()}_${bufferDigest}_${uniqueSuffix}`;

  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(
        new AppError(
          'Cloudinary image upload timed out. Please try again.',
          504,
          'CLOUDINARY_TIMEOUT'
        )
      );
    }, timeoutMs);

    const uploadOptions = {
      folder,
      public_id: publicIdName,
      resource_type: 'image',
      overwrite: false,
      unique_filename: false,
      use_filename: false,
      timeout: timeoutMs,
      tags: ['kisanvision', safeCategorySegment, `user_${safeUserSegment}`],
      context: mimeType ? { mime_type: String(mimeType) } : undefined,
    };

    const uploadStream = client.uploader.upload_stream(uploadOptions, (err, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (err) {
        const httpCode = err?.http_code;
        if (httpCode === 401 || httpCode === 403) {
          return reject(
            new AppError(
              'Cloudinary credentials are invalid or unauthorized.',
              502,
              'CLOUDINARY_AUTH_ERROR'
            )
          );
        }
        return reject(
          new AppError(
            `Cloudinary image upload failed: ${scrubCloudinaryError(err)}`,
            502,
            'CLOUDINARY_UPLOAD_FAILED'
          )
        );
      }

      if (!result?.secure_url || !result?.public_id) {
        return reject(
          new AppError(
            'Cloudinary upload returned an incomplete asset response.',
            502,
            'CLOUDINARY_INVALID_RESPONSE'
          )
        );
      }

      return resolve({
        imageUrl: result.secure_url,
        imagePublicId: result.public_id,
        bytes: result.bytes ?? imageBuffer.length,
        format: result.format || null,
        width: result.width ?? null,
        height: result.height ?? null,
      });
    });

    uploadStream.on('error', (streamErr) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(
        new AppError(
          `Cloudinary upload stream error: ${scrubCloudinaryError(streamErr)}`,
          502,
          'CLOUDINARY_UPLOAD_FAILED'
        )
      );
    });

    uploadStream.end(imageBuffer);
  });
};

/**
 * Best-effort wrapper for AI workflows: uploads valid buffers to Cloudinary without fabricating URLs.
 * Returns structured storage status so AI workflows can proceed or report storage errors accurately.
 */
export const uploadImageIfConfigured = async (
  { imageBuffer, mimeType, userId, category = 'analyses' },
  deps = {}
) => {
  if (!isCloudinaryConfigured() && !deps.cloudinaryClient) {
    return {
      imageUrl: null,
      imagePublicId: null,
      storageStatus: 'NOT_CONFIGURED',
      storageError: 'Cloudinary credentials are not configured on the server.',
    };
  }

  try {
    const uploaded = await uploadImageBuffer(
      { imageBuffer, mimeType, userId, category },
      deps
    );
    return {
      imageUrl: uploaded.imageUrl,
      imagePublicId: uploaded.imagePublicId,
      storageStatus: 'STORED',
      storageError: null,
    };
  } catch (err) {
    if (env.nodeEnv === 'development') {
      console.error('[Cloudinary Upload Notice]', err.code || err.message);
    }
    return {
      imageUrl: null,
      imagePublicId: null,
      storageStatus: 'UPLOAD_FAILED',
      storageError: err.message || 'Cloudinary image upload failed.',
    };
  }
};

/**
 * Permanently destroys a single Cloudinary image asset by publicId with 1 transient retry.
 */
export const deleteCloudinaryAsset = async (publicId, deps = {}) => {
  if (!publicId || typeof publicId !== 'string') {
    return { publicId: null, status: 'SKIPPED' };
  }

  const client = deps.cloudinaryClient || getConfiguredClient();
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await client.uploader.destroy(publicId, {
        invalidate: true,
        resource_type: 'image',
      });

      const outcome = response?.result;
      if (outcome === 'ok') {
        return { publicId, status: 'DELETED' };
      }
      if (outcome === 'not found') {
        return { publicId, status: 'NOT_FOUND' };
      }

      throw new AppError(
        `Unexpected Cloudinary deletion outcome ("${outcome || 'unknown'}") for asset.`,
        502,
        'CLOUDINARY_DELETE_FAILED'
      );
    } catch (err) {
      if (err instanceof AppError && attempt >= maxAttempts) {
        throw err;
      }
      if (attempt >= maxAttempts) {
        throw new AppError(
          `Failed to delete Cloudinary asset: ${scrubCloudinaryError(err)}`,
          502,
          'CLOUDINARY_DELETE_FAILED'
        );
      }
    }
  }

  throw new AppError('Failed to delete Cloudinary asset.', 502, 'CLOUDINARY_DELETE_FAILED');
};

/**
 * Permanently deletes all unique Cloudinary public IDs belonging to a record.
 * Never reports success if any asset deletion fails.
 */
export const deleteCloudinaryAssets = async (publicIds, deps = {}) => {
  const uniqueIds = Array.from(
    new Set(
      (Array.isArray(publicIds) ? publicIds : [publicIds]).filter(
        (id) => typeof id === 'string' && id.trim().length > 0
      )
    )
  );

  if (uniqueIds.length === 0) {
    return {
      requestedCount: 0,
      deletedCount: 0,
      notFoundCount: 0,
      results: [],
    };
  }

  // Verify credentials up front before deleting any asset
  const client = deps.cloudinaryClient || getConfiguredClient();

  const results = [];
  const failures = [];

  for (const publicId of uniqueIds) {
    try {
      const itemResult = await deleteCloudinaryAsset(publicId, { cloudinaryClient: client });
      results.push(itemResult);
    } catch (err) {
      failures.push({ publicId, message: err.message });
    }
  }

  if (failures.length > 0) {
    throw new AppError(
      `Unable to permanently delete ${failures.length} of ${uniqueIds.length} Cloudinary asset(s). Record was kept intact to prevent orphaned assets.`,
      502,
      'CLOUDINARY_DELETE_PARTIAL_FAILURE'
    );
  }

  return {
    requestedCount: uniqueIds.length,
    deletedCount: results.filter((r) => r.status === 'DELETED').length,
    notFoundCount: results.filter((r) => r.status === 'NOT_FOUND').length,
    results,
  };
};
