import { useState } from 'react';
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiBookOpen,
  FiCheckCircle,
  FiCpu,
  FiHelpCircle,
  FiInfo,
  FiList,
  FiRefreshCw,
  FiSearch,
  FiXCircle,
} from 'react-icons/fi';
import Card from '../components/common/Card';
import ImageUploader from '../components/common/ImageUploader';
import Tabs from '../components/common/Tabs';
import EmptyState from '../components/common/EmptyState';
import SupportedCropsBar from '../components/common/SupportedCropsBar';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import { useToast } from '../context/ToastContext';
import { runPlantIdentification } from '../services/aiService';

const PLANT_TABS = [
  { id: 'info', label: 'Plant Information', icon: FiInfo },
  { id: 'details', label: 'Key Details', icon: FiList },
  { id: 'uses', label: 'Uses & Importance', icon: FiBookOpen },
];

const VALIDATION_META = {
  VALID: {
    badgeVariant: 'success',
    badgeLabel: 'Validated Crop',
    icon: FiCheckCircle,
    toneClass: 'kv-alert-info',
    heading: 'Crop Validated Successfully',
  },
  UNSUPPORTED_CROP: {
    badgeVariant: 'danger',
    badgeLabel: 'Unsupported Crop',
    icon: FiXCircle,
    toneClass: 'kv-alert-danger',
    heading: 'Unsupported Crop Detected',
  },
  NOT_A_PLANT: {
    badgeVariant: 'danger',
    badgeLabel: 'Not a Plant',
    icon: FiXCircle,
    toneClass: 'kv-alert-danger',
    heading: 'Image Not Recognized',
  },
  UNCLEAR_IMAGE: {
    badgeVariant: 'warning',
    badgeLabel: 'Unclear Image',
    icon: FiAlertTriangle,
    toneClass: 'kv-alert-warning',
    heading: 'Unable to Identify Crop',
  },
  UNCERTAIN: {
    badgeVariant: 'warning',
    badgeLabel: 'Uncertain',
    icon: FiHelpCircle,
    toneClass: 'kv-alert-warning',
    heading: 'Crop Identification Uncertain',
  },
};

const QUALITY_BADGE = {
  GOOD: 'success',
  FAIR: 'info',
  POOR: 'danger',
};

const renderBulletList = (items, emptyText) => {
  if (!items || !items.length) {
    return <p style={{ fontSize: 13, color: 'var(--kv-text-muted)' }}>{emptyText}</p>;
  }
  return (
    <ul
      style={{
        margin: 0,
        paddingLeft: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        fontSize: 13,
        color: 'var(--kv-text-secondary)',
      }}
    >
      {items.map((item, idx) => (
        <li key={`${idx}-${item.slice(0, 20)}`}>{item}</li>
      ))}
    </ul>
  );
};

const PlantIdentificationPage = () => {
  const { showToast } = useToast();
  const [files, setFiles] = useState([]);
  const [activeTab, setActiveTab] = useState('info');
  const [analyzing, setAnalyzing] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [plantIdentification, setPlantIdentification] = useState(null);
  const [savedRecord, setSavedRecord] = useState(null);
  const [apiError, setApiError] = useState('');

  const handleFilesChange = (nextFiles) => {
    setFiles(nextFiles);
    setValidationResult(null);
    setPlantIdentification(null);
    setSavedRecord(null);
    setApiError('');
  };

  const handleIdentifyClick = async () => {
    if (!files.length || analyzing) return;

    setAnalyzing(true);
    setApiError('');
    setValidationResult(null);
    setPlantIdentification(null);
    setSavedRecord(null);

    try {
      const response = await runPlantIdentification(files[0].file);
      const data = response?.data;

      setValidationResult(data?.validation || null);
      setPlantIdentification(data?.plantIdentification || null);
      setSavedRecord(data?.record || null);

      if (data?.validation?.status !== 'VALID') {
        showToast(data?.validation?.message || 'Image could not be validated.', 'info');
      } else if (data?.plantIdentification?.status === 'IDENTIFIED') {
        showToast(`${data.plantIdentification.commonName} identified successfully.`, 'success');
      } else {
        showToast('Plant could not be reliably identified from this image.', 'info');
      }
    } catch (err) {
      const rawMessage = err.message || 'Unable to identify plant. Please try again.';
      const isQuota =
        rawMessage.toLowerCase().includes('quota') ||
        rawMessage.toLowerCase().includes('rate limit');
      const displayMessage = isQuota
        ? 'Gemini AI quota or rate limit exceeded. Please wait before trying again.'
        : rawMessage;
      setApiError(displayMessage);
      showToast(displayMessage, 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    files.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setFiles([]);
    setValidationResult(null);
    setPlantIdentification(null);
    setSavedRecord(null);
    setApiError('');
    setActiveTab('info');
  };

  const validationMeta = validationResult
    ? VALIDATION_META[validationResult.status] || VALIDATION_META.UNCERTAIN
    : null;
  const ValidationIcon = validationMeta?.icon || FiInfo;

  return (
    <div className="kv-page-stack">
      <Card>
        <SupportedCropsBar />
      </Card>

      <div className="kv-split-layout">
        <Card
          title="Upload Plant Image"
          subtitle="Identify whether the image belongs to one of the five supported crops."
          icon={FiSearch}
        >
          <ImageUploader
            files={files}
            onFilesChange={handleFilesChange}
            title="Upload Plant or Leaf Image"
            hint="Drag and drop or browse (JPG, JPEG, PNG, WEBP up to 10 MB)"
            primaryActionLabel={
              analyzing ? 'Validating & Identifying Plant...' : 'Analyze Plant'
            }
            onPrimaryAction={handleIdentifyClick}
            actionLoading={analyzing}
            actionDisabled={analyzing}
          />
        </Card>

        <div className="kv-page-stack">
          <Card
            title="AI Orchestrator & Validation Status"
            subtitle="Crop Validation Agent runs before Plant Identification Agent."
            icon={FiCpu}
            action={
              (validationResult || apiError) && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={FiRefreshCw}
                  onClick={handleReset}
                >
                  Try Another
                </Button>
              )
            }
          >
            {apiError && (
              <div className="kv-alert kv-alert-danger" role="alert">
                <FiAlertCircle size={17} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{apiError}</span>
              </div>
            )}

            {!validationResult && !apiError && (
              <EmptyState
                icon={FiCpu}
                title={
                  analyzing
                    ? 'Running Crop Validation & Plant Identification Agents...'
                    : 'Awaiting Plant Image'
                }
                description={
                  analyzing
                    ? 'Step 1: Verifying supported crop and image clarity. Step 2: Running Plant Identification Agent if crop validation passes.'
                    : 'Upload or capture a clear plant image and click Analyze Plant to begin.'
                }
              />
            )}

            {validationResult && validationMeta && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ValidationIcon
                      size={19}
                      color={
                        validationResult.status === 'VALID'
                          ? 'var(--kv-success)'
                          : validationMeta.badgeVariant === 'danger'
                            ? 'var(--kv-danger)'
                            : 'var(--kv-warning)'
                      }
                    />
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>{validationMeta.heading}</h3>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <Badge variant={validationMeta.badgeVariant}>{validationMeta.badgeLabel}</Badge>
                    {validationResult.crop && (
                      <Badge variant="success">Crop: {validationResult.crop}</Badge>
                    )}
                    <Badge variant={QUALITY_BADGE[validationResult.imageQuality] || 'neutral'}>
                      Quality: {validationResult.imageQuality}
                    </Badge>
                    <Badge variant="info">
                      Validation Confidence: {validationResult.confidence}%
                    </Badge>
                  </div>
                </div>

                {validationResult.status !== 'VALID' && (
                  <div className={`kv-alert ${validationMeta.toneClass}`}>
                    <ValidationIcon size={17} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontWeight: 600 }}>{validationResult.message}</span>
                      {validationResult.reason && (
                        <span style={{ fontSize: 12 }}>Reason: {validationResult.reason}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {(!validationResult || validationResult.status === 'VALID') && (
            <Card
              title="Identification Result"
              subtitle={
                plantIdentification
                  ? `Analyzed by ${plantIdentification.agent}`
                  : 'Common name, scientific name, identifying features, and agricultural overview.'
              }
              icon={FiInfo}
              action={
                plantIdentification && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <Badge
                      variant={
                        plantIdentification.status === 'IDENTIFIED' ? 'success' : 'warning'
                      }
                      icon={
                        plantIdentification.status === 'IDENTIFIED'
                          ? FiCheckCircle
                          : FiHelpCircle
                      }
                    >
                      {plantIdentification.status === 'IDENTIFIED' ? 'Identified' : 'Uncertain'}
                    </Badge>
                    {savedRecord?.id && (
                      <Badge
                        variant={
                          savedRecord.storageStatus === 'STORED' ? 'neutral' : 'warning'
                        }
                      >
                        {savedRecord.storageStatus === 'STORED'
                          ? 'Saved to History'
                          : 'Saved (Image Storage Unavailable)'}
                      </Badge>
                    )}
                  </div>
                )
              }
            >
              {!plantIdentification ? (
                <EmptyState
                  icon={FiInfo}
                  title="Awaiting Plant Identification"
                  description="Upload an image of Coffee, Black Pepper, Ginger, Cardamom, or Arecanut to view common name, scientific name, confidence, and botanical description."
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      padding: '14px 16px',
                      borderRadius: 'var(--kv-radius-md)',
                      backgroundColor: 'var(--kv-surface-subtle)',
                      border: '1px solid var(--kv-border)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--kv-text-muted)' }}>
                        {plantIdentification.scientificName || 'Botanical Identification'}
                      </div>
                      <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
                        {plantIdentification.status === 'IDENTIFIED'
                          ? plantIdentification.commonName
                          : 'Uncertain Plant Identification'}
                      </h3>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {plantIdentification.crop && (
                        <Badge variant="success">Crop: {plantIdentification.crop}</Badge>
                      )}
                      <Badge variant="info">
                        AI Confidence: {plantIdentification.confidence}%
                      </Badge>
                    </div>
                  </div>

                  <Tabs tabs={PLANT_TABS} activeTab={activeTab} onChange={setActiveTab} />

                  {activeTab === 'info' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div className="kv-grid-3">
                        <div
                          style={{
                            padding: '12px 14px',
                            border: '1px solid var(--kv-border)',
                            borderRadius: 'var(--kv-radius-sm)',
                            backgroundColor: 'var(--kv-surface-subtle)',
                          }}
                        >
                          <div style={{ fontSize: 12, color: 'var(--kv-text-muted)' }}>
                            Crop Name
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
                            {plantIdentification.crop || 'Uncertain'}
                          </div>
                        </div>

                        <div
                          style={{
                            padding: '12px 14px',
                            border: '1px solid var(--kv-border)',
                            borderRadius: 'var(--kv-radius-sm)',
                            backgroundColor: 'var(--kv-surface-subtle)',
                          }}
                        >
                          <div style={{ fontSize: 12, color: 'var(--kv-text-muted)' }}>
                            Common Name
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
                            {plantIdentification.commonName || 'Not Reliably Identified'}
                          </div>
                        </div>

                        <div
                          style={{
                            padding: '12px 14px',
                            border: '1px solid var(--kv-border)',
                            borderRadius: 'var(--kv-radius-sm)',
                            backgroundColor: 'var(--kv-surface-subtle)',
                          }}
                        >
                          <div style={{ fontSize: 12, color: 'var(--kv-text-muted)' }}>
                            Scientific Name
                          </div>
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 700,
                              fontStyle: plantIdentification.scientificName ? 'italic' : 'normal',
                              marginTop: 2,
                            }}
                          >
                            {plantIdentification.scientificName || 'Not Specified'}
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                          Plant Description
                        </h4>
                        <p style={{ fontSize: 13, color: 'var(--kv-text-secondary)' }}>
                          {plantIdentification.plantDescription}
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'details' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div className="kv-grid-2">
                        <div>
                          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                            Visual Identification Characteristics
                          </h4>
                          {renderBulletList(
                            plantIdentification.visualCharacteristics,
                            'No specific visual characteristics recorded.'
                          )}
                        </div>

                        <div>
                          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                            Key Identifying Traits
                          </h4>
                          {renderBulletList(
                            plantIdentification.keyTraits,
                            'No key botanical traits available.'
                          )}
                        </div>
                      </div>

                      {plantIdentification.suitableGrowingInfo && (
                        <div className="kv-alert kv-alert-info">
                          <FiInfo size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                          <span>
                            <strong>Suitable Growing Context:</strong>{' '}
                            {plantIdentification.suitableGrowingInfo}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'uses' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                          Agricultural Importance
                        </h4>
                        <p style={{ fontSize: 13, color: 'var(--kv-text-secondary)' }}>
                          {plantIdentification.agriculturalImportance}
                        </p>
                      </div>

                      <div className="kv-grid-2">
                        <div>
                          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                            Common Uses
                          </h4>
                          {renderBulletList(
                            plantIdentification.commonUses,
                            'No common uses listed.'
                          )}
                        </div>

                        <div>
                          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                            Useful Crop Information
                          </h4>
                          {renderBulletList(
                            plantIdentification.usefulCropInfo,
                            'No additional crop information available.'
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlantIdentificationPage;
