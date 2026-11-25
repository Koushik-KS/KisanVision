import multer from 'multer';
import { MAX_BATCH_IMAGES, MAX_IMAGE_SIZE_BYTES } from '../config/constants.js';
import AppError from '../utils/AppError.js';
import { validateUploadedImageFile } from '../utils/imageValidator.js';

const storage = multer.memoryStorage();

const singleUpload = multer({
  storage,
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
    files: 1,
  },
});

const batchUpload = multer({
  storage,
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
    files: MAX_BATCH_IMAGES,
  },
});

/**
 * Handle single image multipart/form-data upload and normalize Multer errors.
 */
export const uploadSingleImage = (fieldName = 'image') => {
  const middleware = singleUpload.single(fieldName);

  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (!err) {
        return next();
      }

      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            new AppError(
              'Uploaded image exceeds the maximum 10 MB size limit.',
              413,
              'FILE_TOO_LARGE'
            )
          );
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
          return next(
            new AppError(
              `Expected a single file under the "${fieldName}" field.`,
              400,
              'INVALID_UPLOAD_FIELD'
            )
          );
        }
        return next(new AppError(err.message, 400, 'UPLOAD_ERROR'));
      }

      return next(err);
    });
  };
};

/**
 * Handle up to 5 images multipart/form-data batch upload and enforce server-side limits.
 */
export const uploadBatchImages = (
  fieldName = 'images',
  maxFiles = MAX_BATCH_IMAGES
) => {
  const middleware = batchUpload.array(fieldName, maxFiles);

  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (!err) {
        return next();
      }

      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            new AppError(
              'One or more uploaded images exceed the 10 MB size limit.',
              413,
              'FILE_TOO_LARGE'
            )
          );
        }
        if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(
            new AppError(
              `Maximum ${maxFiles} images allowed per batch under the "${fieldName}" field.`,
              400,
              'TOO_MANY_FILES'
            )
          );
        }
        return next(new AppError(err.message, 400, 'UPLOAD_ERROR'));
      }

      return next(err);
    });
  };
};

/**
 * Validate single uploaded image buffer, MIME type, size, and binary signature.
 */
export const validateUploadedImage = (req, _res, next) => {
  try {
    req.validatedImage = validateUploadedImageFile(req.file);
    return next();
  } catch (err) {
    return next(err);
  }
};

/**
 * Validate every uploaded file in a batch independently without rejecting valid files
 * if another file in the same batch fails binary validation.
 * Rejects the request with 400 if zero valid files exist or limits are exceeded.
 */
export const validateBatchImages = (req, _res, next) => {
  const files = req.files || [];

  if (!files.length) {
    return next(
      new AppError(
        'Please upload between 1 and 5 images for batch analysis.',
        400,
        'IMAGES_REQUIRED'
      )
    );
  }

  if (files.length > MAX_BATCH_IMAGES) {
    return next(
      new AppError(
        `Maximum ${MAX_BATCH_IMAGES} images allowed per batch.`,
        400,
        'TOO_MANY_FILES'
      )
    );
  }

  const validatedItems = files.map((file, index) => {
    const fileName = file.originalname || `image-${index + 1}`;
    try {
      const validated = validateUploadedImageFile(file);
      return {
        binaryValid: true,
        index,
        fileName,
        buffer: validated.buffer,
        mimeType: validated.mimeType,
        size: validated.size,
      };
    } catch (err) {
      return {
        binaryValid: false,
        index,
        fileName,
        mimeType: file.mimetype || null,
        size: file.size || 0,
        errorCode: err.code || 'INVALID_IMAGE',
        reason: err.message,
      };
    }
  });

  const validCount = validatedItems.filter((item) => item.binaryValid).length;
  if (validCount === 0) {
    return next(
      new AppError(
        validatedItems[0]?.reason || 'All uploaded files failed image validation.',
        400,
        validatedItems[0]?.errorCode || 'INVALID_BATCH_FILES'
      )
    );
  }

  req.validatedBatchImages = validatedItems;
  return next();
};
