import { useEffect, useRef, useState } from 'react';
import {
  FiAlertCircle,
  FiCamera,
  FiImage,
  FiTrash2,
  FiUploadCloud,
  FiX,
} from 'react-icons/fi';
import Button from './Button';
import { formatBytes, validateImageFile } from '../../utils/fileValidation';
import { MAX_BATCH_IMAGES } from '../../utils/constants';

const ImageUploader = ({
  multiple = false,
  maxFiles = MAX_BATCH_IMAGES,
  files = [],
  onFilesChange,
  title = 'Upload Crop Image',
  hint = 'Drag and drop or browse (JPG, JPEG, PNG, WEBP up to 10 MB)',
  primaryActionLabel,
  onPrimaryAction,
  actionDisabled = false,
  actionLoading = false,
}) => {
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const handleIncomingFiles = (incomingList) => {
    setValidationError('');
    const incoming = Array.from(incomingList || []);
    if (!incoming.length) return;

    const validEntries = [];
    const errors = [];

    for (const file of incoming) {
      const check = validateImageFile(file);
      if (!check.valid) {
        errors.push(check.error);
      } else {
        validEntries.push({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          file,
          previewUrl: URL.createObjectURL(file),
        });
      }
    }

    if (errors.length) {
      setValidationError(errors[0]);
    }

    if (!validEntries.length) return;

    if (multiple) {
      const combined = [...files, ...validEntries];
      if (combined.length > maxFiles) {
        setValidationError(`Maximum ${maxFiles} images allowed per batch.`);
        const trimmed = combined.slice(0, maxFiles);
        combined.slice(maxFiles).forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
        onFilesChange(trimmed);
      } else {
        onFilesChange(combined);
      }
    } else {
      files.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
      onFilesChange([validEntries[0]]);
    }
  };

  const handleRemoveFile = (id) => {
    const target = files.find((item) => item.id === id);
    if (target) {
      URL.revokeObjectURL(target.previewUrl);
    }
    onFilesChange(files.filter((item) => item.id !== id));
    setValidationError('');
  };

  const handleClearAll = () => {
    files.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    onFilesChange([]);
    setValidationError('');
  };

  const openCamera = async () => {
    setCameraError('');
    setCameraOpen(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera capture is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setCameraError(err.message || 'Unable to access camera permission.');
    }
  };

  const closeCamera = () => {
    stopCameraStream();
    setCameraOpen(false);
    setCameraError('');
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const capturedFile = new File([blob], `camera-capture-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        handleIncomingFiles([capturedFile]);
        closeCamera();
      },
      'image/jpeg',
      0.92
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        multiple={multiple}
        style={{ display: 'none' }}
        onChange={(e) => {
          handleIncomingFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {(!files.length || multiple) && (
        <div
          className={`kv-dropzone ${isDragging ? 'dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleIncomingFiles(e.dataTransfer.files);
          }}
        >
          <div className="kv-dropzone-icon">
            <FiImage size={24} />
          </div>
          <div className="kv-dropzone-title">{title}</div>
          <div className="kv-dropzone-hint">{hint}</div>

          <div className="kv-upload-actions">
            <Button
              variant="primary"
              size="sm"
              icon={FiUploadCloud}
              onClick={() => inputRef.current?.click()}
            >
              {multiple ? 'Choose Images' : 'Choose Image'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={FiCamera}
              onClick={openCamera}
            >
              Open Camera
            </Button>
          </div>
        </div>
      )}

      {validationError && (
        <div className="kv-alert kv-alert-danger" role="alert">
          <FiAlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{validationError}</span>
        </div>
      )}

      {!multiple && files.length === 1 && (
        <div className="kv-preview-box">
          <img
            src={files[0].previewUrl}
            alt={files[0].file.name}
            className="kv-preview-img"
          />
          <div className="kv-preview-meta">
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {files[0].file.name} ({formatBytes(files[0].file.size)})
            </span>
            <Button
              variant="ghost"
              size="sm"
              icon={FiTrash2}
              onClick={() => handleRemoveFile(files[0].id)}
            >
              Remove
            </Button>
          </div>
        </div>
      )}

      {multiple && files.length > 0 && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              Selected Images ({files.length} / {maxFiles})
            </span>
            <Button variant="ghost" size="sm" icon={FiTrash2} onClick={handleClearAll}>
              Clear All
            </Button>
          </div>

          <div className="kv-thumb-grid">
            {files.map((item) => (
              <div key={item.id} className="kv-thumb-item">
                <img src={item.previewUrl} alt={item.file.name} />
                <button
                  type="button"
                  className="kv-thumb-remove"
                  onClick={() => handleRemoveFile(item.id)}
                  aria-label={`Remove ${item.file.name}`}
                >
                  <FiX size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {primaryActionLabel && (
        <Button
          variant="primary"
          fullWidth
          icon={FiUploadCloud}
          disabled={!files.length || actionDisabled}
          loading={actionLoading}
          onClick={onPrimaryAction}
        >
          {primaryActionLabel}
        </Button>
      )}

      {cameraOpen && (
        <div className="kv-modal-backdrop" role="dialog" aria-modal="true">
          <div className="kv-modal">
            <div className="kv-modal-header">
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Capture Crop Photo</h3>
              <button
                type="button"
                className="kv-btn-ghost"
                style={{ border: 'none', padding: 4, borderRadius: 6 }}
                onClick={closeCamera}
                aria-label="Close camera"
              >
                <FiX size={18} />
              </button>
            </div>

            {cameraError ? (
              <div className="kv-alert kv-alert-danger">
                <FiAlertCircle size={17} style={{ flexShrink: 0 }} />
                <span>{cameraError}</span>
              </div>
            ) : (
              <video ref={videoRef} autoPlay playsInline className="kv-camera-video" />
            )}

            <div className="kv-modal-footer">
              <Button variant="secondary" onClick={closeCamera}>
                Cancel
              </Button>
              {!cameraError && (
                <Button variant="primary" icon={FiCamera} onClick={capturePhoto}>
                  Capture Photo
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
