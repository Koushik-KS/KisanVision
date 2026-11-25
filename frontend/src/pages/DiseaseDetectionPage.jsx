import { useState } from 'react';
import {
  FiActivity,
  FiAlertCircle,
  FiAlertTriangle,
  FiCheckCircle,
  FiCpu,
  FiFileText,
  FiHelpCircle,
  FiInfo,
  FiLayers,
  FiRefreshCw,
  FiShield,
  FiXCircle,
} from 'react-icons/fi';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import Card from '../components/common/Card';
import ImageUploader from '../components/common/ImageUploader';
import Tabs from '../components/common/Tabs';
import EmptyState from '../components/common/EmptyState';
import SupportedCropsBar from '../components/common/SupportedCropsBar';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import { useToast } from '../context/ToastContext';
import { runDiseaseDetection } from '../services/aiService';

const RESULT_TABS = [
  { id: 'info', label: 'Disease Information', icon: FiFileText },
  { id: 'area', label: 'Area Analysis', icon: FiLayers },
  { id: 'severity', label: 'Severity', icon: FiAlertTriangle },
  { id: 'management', label: 'Management', icon: FiShield },
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

const DISEASE_STATUS_META = {
  HEALTHY: { variant: 'success', label: 'Healthy', icon: FiCheckCircle },
  DISEASED: { variant: 'danger', label: 'Diseased', icon: FiAlertTriangle },
  UNCERTAIN: { variant: 'warning', label: 'Uncertain', icon: FiHelpCircle },
};

const SEVERITY_BADGE = {
  None: 'success',
  Mild: 'info',
  Moderate: 'warning',
  Severe: 'danger',
  Uncertain: 'warning',
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

const DiseaseDetectionPage = () => {
  const { showToast } = useToast();
  const [files, setFiles] = useState([]);
  const [activeTab, setActiveTab] = useState('info');
  const [analyzing, setAnalyzing] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [diseaseAnalysis, setDiseaseAnalysis] = useState(null);
  const [savedRecord, setSavedRecord] = useState(null);
  const [apiError, setApiError] = useState('');

  const handleFilesChange = (nextFiles) => {
    setFiles(nextFiles);
    setValidationResult(null);
    setDiseaseAnalysis(null);
    setSavedRecord(null);
    setApiError('');
  };

  const handleAnalyzeClick = async () => {
    if (!files.length || analyzing) return;

    setAnalyzing(true);
    setApiError('');
    setValidationResult(null);
    setDiseaseAnalysis(null);
    setSavedRecord(null);

    try {
      const response = await runDiseaseDetection(files[0].file);
      const data = response?.data;

      setValidationResult(data?.validation || null);
      setDiseaseAnalysis(data?.diseaseAnalysis || null);
      setSavedRecord(data?.record || null);

      if (data?.validation?.status !== 'VALID') {
        showToast(data?.validation?.message || 'Image could not be validated.', 'info');
      } else if (data?.diseaseAnalysis?.status === 'HEALTHY') {
        showToast(`${data.diseaseAnalysis.crop} appears healthy.`, 'success');
      } else if (data?.diseaseAnalysis?.status === 'DISEASED') {
        showToast(
          `${data.diseaseAnalysis.diseaseName || 'Disease'} detected on ${data.diseaseAnalysis.crop}.`,
          'info'
        );
      } else {
        showToast(
          'Analysis completed, but visual evidence was inconclusive.',
          'info'
        );
      }
    } catch (err) {
      const msg = err.message || 'Unable to analyze image. Please try again.';
      setApiError(msg);
      showToast(msg, 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    files.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setFiles([]);
    setValidationResult(null);
    setDiseaseAnalysis(null);
    setSavedRecord(null);
    setApiError('');
    setActiveTab('info');
  };

  const validationMeta = validationResult
    ? VALIDATION_META[validationResult.status] || VALIDATION_META.UNCERTAIN
    : null;
  const ValidationIcon = validationMeta?.icon || FiInfo;

  const diseaseStatusMeta = diseaseAnalysis
    ? DISEASE_STATUS_META[diseaseAnalysis.status] || DISEASE_STATUS_META.UNCERTAIN
    : null;
  const DiseaseStatusIcon = diseaseStatusMeta?.icon || FiInfo;

  const hasAreaEstimate =
    diseaseAnalysis &&
    typeof diseaseAnalysis.estimatedAffectedAreaPercent === 'number';
  const affectedPercent = hasAreaEstimate ? diseaseAnalysis.estimatedAffectedAreaPercent : 0;
  const healthyPercent = hasAreaEstimate ? Math.max(0, 100 - affectedPercent) : 0;

  const areaChartData = hasAreaEstimate
    ? [
        { name: 'Estimated Healthy Area', value: healthyPercent, color: '#16a34a' },
        { name: 'Estimated Affected Area', value: affectedPercent, color: '#dc2626' },
      ]
    : [];

  return (
    <div className="kv-page-stack">
      <Card>
        <SupportedCropsBar />
      </Card>

      <div className="kv-split-layout">
        <Card
          title="Upload Crop Image"
          subtitle="Upload or capture a leaf/plant image. Crop Validation runs before Disease Detection."
          icon={FiActivity}
        >
          <ImageUploader
            files={files}
            onFilesChange={handleFilesChange}
            title="Upload Leaf or Crop Image"
            hint="Drag and drop or browse (JPG, JPEG, PNG, WEBP up to 10 MB)"
            primaryActionLabel={
              analyzing
                ? 'Validating & Detecting Disease...'
                : 'Analyze Crop Disease'
            }
            onPrimaryAction={handleAnalyzeClick}
            actionLoading={analyzing}
            actionDisabled={analyzing}
          />
        </Card>

        <div className="kv-page-stack">
          <Card
            title="AI Orchestrator & Validation Status"
            subtitle="Crop Validation Agent verifies eligibility before the Disease Detection Agent runs."
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
                    ? 'Running Crop Validation & Disease Detection Agents...'
                    : 'Awaiting Crop Image'
                }
                description={
                  analyzing
                    ? 'Step 1: Verifying supported crop and clarity. Step 2: Running Disease Detection Agent if crop validation passes.'
                    : 'Upload or capture a clear plant image and click Analyze Crop Disease to begin.'
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
              title="Detection Result"
              subtitle={
                diseaseAnalysis
                  ? `Analyzed by ${diseaseAnalysis.agent} for ${diseaseAnalysis.crop}`
                  : 'Structured disease assessment will appear here once crop validation succeeds.'
              }
              icon={FiInfo}
              action={
                diseaseAnalysis && diseaseStatusMeta && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <Badge variant={diseaseStatusMeta.variant} icon={DiseaseStatusIcon}>
                      {diseaseStatusMeta.label}
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
              {!diseaseAnalysis ? (
                <EmptyState
                  icon={FiFileText}
                  title="Awaiting Disease Analysis"
                  description="Upload a supported crop image (Coffee, Black Pepper, Ginger, Cardamom, or Arecanut) to inspect disease status, affected area, severity, and management."
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
                        {diseaseAnalysis.crop} Assessment
                      </div>
                      <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
                        {diseaseAnalysis.status === 'DISEASED'
                          ? diseaseAnalysis.diseaseName
                          : diseaseAnalysis.status === 'HEALTHY'
                            ? 'Healthy Plant'
                            : 'Inconclusive Visual Assessment'}
                      </h3>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <Badge variant="info">AI Confidence: {diseaseAnalysis.confidence}%</Badge>
                      <Badge variant={SEVERITY_BADGE[diseaseAnalysis.severity] || 'neutral'}>
                        Severity: {diseaseAnalysis.severity}
                      </Badge>
                    </div>
                  </div>

                  <Tabs tabs={RESULT_TABS} activeTab={activeTab} onChange={setActiveTab} />

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
                          <div style={{ fontSize: 12, color: 'var(--kv-text-muted)' }}>Crop</div>
                          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
                            {diseaseAnalysis.crop}
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
                          <div style={{ fontSize: 12, color: 'var(--kv-text-muted)' }}>Status</div>
                          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
                            {diseaseStatusMeta?.label}
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
                            Disease Name
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
                            {diseaseAnalysis.diseaseName ||
                              (diseaseAnalysis.status === 'HEALTHY'
                                ? 'None'
                                : 'Not Reliably Identified')}
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Summary</h4>
                        <p style={{ fontSize: 13, color: 'var(--kv-text-secondary)' }}>
                          {diseaseAnalysis.summary}
                        </p>
                      </div>

                      <div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                          Explanation
                        </h4>
                        <p style={{ fontSize: 13, color: 'var(--kv-text-secondary)' }}>
                          {diseaseAnalysis.diseaseExplanation}
                        </p>
                      </div>

                      <div className="kv-grid-2">
                        <div>
                          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                            Visible Symptoms
                          </h4>
                          {renderBulletList(
                            diseaseAnalysis.symptoms,
                            diseaseAnalysis.status === 'HEALTHY'
                              ? 'No disease symptoms observed.'
                              : 'No specific symptoms listed.'
                          )}
                        </div>
                        <div>
                          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                            Supporting Visual Evidence
                          </h4>
                          {renderBulletList(
                            diseaseAnalysis.visualEvidence,
                            'No additional visual evidence notes.'
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'area' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {hasAreaEstimate ? (
                        <div className="kv-grid-2" style={{ alignItems: 'center' }}>
                          <div style={{ height: 220 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={areaChartData}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={52}
                                  outerRadius={82}
                                  paddingAngle={2}
                                >
                                  {areaChartData.map((entry) => (
                                    <Cell key={entry.name} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value) => `${value}%`} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div
                              style={{
                                padding: '12px 14px',
                                border: '1px solid var(--kv-border)',
                                borderRadius: 'var(--kv-radius-sm)',
                                backgroundColor: 'var(--kv-success-bg)',
                              }}
                            >
                              <div style={{ fontSize: 12, color: 'var(--kv-primary-dark)' }}>
                                Approximate Healthy Area
                              </div>
                              <div
                                style={{
                                  fontSize: 20,
                                  fontWeight: 700,
                                  color: 'var(--kv-primary-dark)',
                                }}
                              >
                                {healthyPercent}%
                              </div>
                            </div>

                            <div
                              style={{
                                padding: '12px 14px',
                                border: '1px solid #fecaca',
                                borderRadius: 'var(--kv-radius-sm)',
                                backgroundColor: 'var(--kv-danger-bg)',
                              }}
                            >
                              <div style={{ fontSize: 12, color: '#991b1b' }}>
                                Approximate Affected Area
                              </div>
                              <div style={{ fontSize: 20, fontWeight: 700, color: '#991b1b' }}>
                                {affectedPercent}%
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <EmptyState
                          icon={FiLayers}
                          title="Affected Area Not Visually Estimable"
                          description="The Disease Detection Agent could not reliably estimate an affected area percentage from this image."
                        />
                      )}

                      <div className="kv-alert kv-alert-info">
                        <FiInfo size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>
                          Visual area percentages are approximate AI estimates based on visible
                          symptoms in the uploaded photo, not pixel-level segmentation or a
                          scientific measurement.
                        </span>
                      </div>
                    </div>
                  )}

                  {activeTab === 'severity' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          border: '1px solid var(--kv-border)',
                          borderRadius: 'var(--kv-radius-sm)',
                          backgroundColor: 'var(--kv-surface-subtle)',
                        }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 600 }}>Estimated Severity</span>
                        <Badge variant={SEVERITY_BADGE[diseaseAnalysis.severity] || 'neutral'}>
                          {diseaseAnalysis.severity}
                        </Badge>
                      </div>

                      <div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                          Supporting Visual Observations
                        </h4>
                        {renderBulletList(
                          diseaseAnalysis.visualEvidence,
                          'No severity observations available.'
                        )}
                      </div>

                      <div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                          Observed Symptoms
                        </h4>
                        {renderBulletList(
                          diseaseAnalysis.symptoms,
                          diseaseAnalysis.status === 'HEALTHY'
                            ? 'No disease symptoms observed.'
                            : 'No distinct symptoms recorded.'
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'management' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {diseaseAnalysis.possibleCauses?.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                            Possible Contributing Conditions (Visual Assessment Only)
                          </h4>
                          {renderBulletList(
                            diseaseAnalysis.possibleCauses,
                            'No possible causes listed.'
                          )}
                        </div>
                      )}

                      <div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                          Practical Management Recommendations
                        </h4>
                        {renderBulletList(
                          diseaseAnalysis.managementRecommendations,
                          'No management recommendations available.'
                        )}
                      </div>

                      {diseaseAnalysis.treatmentGuidance?.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                            Treatment Guidance
                          </h4>
                          {renderBulletList(
                            diseaseAnalysis.treatmentGuidance,
                            'No specific treatment guidance available.'
                          )}
                        </div>
                      )}

                      <div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                          Preventive Measures
                        </h4>
                        {renderBulletList(
                          diseaseAnalysis.preventiveMeasures,
                          'No preventive measures available.'
                        )}
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

export default DiseaseDetectionPage;
