import { useState } from 'react';
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiBarChart2,
  FiCheckCircle,
  FiHelpCircle,
  FiInfo,
  FiLayers,
  FiPieChart,
  FiRefreshCw,
  FiSlash,
  FiUpload,
  FiXCircle,
} from 'react-icons/fi';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Card from '../components/common/Card';
import ImageUploader from '../components/common/ImageUploader';
import StatCard from '../components/common/StatCard';
import EmptyState from '../components/common/EmptyState';
import SupportedCropsBar from '../components/common/SupportedCropsBar';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import { MAX_BATCH_IMAGES } from '../utils/constants';
import { useToast } from '../context/ToastContext';
import { runMultiImageAnalysis } from '../services/aiService';

const getItemBadge = (item) => {
  if (item.processingStatus === 'REJECTED') {
    return { variant: 'danger', label: 'Rejected', icon: FiXCircle };
  }
  if (item.processingStatus === 'NOT_PROCESSED' || item.processingStatus === 'FAILED') {
    return { variant: 'warning', label: 'Not Processed', icon: FiSlash };
  }
  if (item.diseaseStatus === 'HEALTHY') {
    return { variant: 'success', label: 'Healthy', icon: FiCheckCircle };
  }
  if (item.diseaseStatus === 'DISEASED') {
    return { variant: 'danger', label: 'Diseased', icon: FiAlertTriangle };
  }
  return { variant: 'warning', label: 'Uncertain', icon: FiHelpCircle };
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
        <li key={`${idx}-${item.slice(0, 18)}`}>{item}</li>
      ))}
    </ul>
  );
};

const MultiImageAnalysisPage = () => {
  const { showToast } = useToast();
  const [files, setFiles] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [batchResult, setBatchResult] = useState(null);
  const [previewMap, setPreviewMap] = useState({});
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [apiError, setApiError] = useState('');

  const handleFilesChange = (nextFiles) => {
    setFiles(nextFiles);
    if (!nextFiles.length) {
      setBatchResult(null);
      setPreviewMap({});
      setSelectedIndex(null);
      setApiError('');
    }
  };

  const handleBatchAnalyze = async () => {
    if (!files.length || analyzing) return;

    const currentPreviews = {};
    files.forEach((entry, idx) => {
      currentPreviews[idx] = entry.previewUrl;
    });

    setAnalyzing(true);
    setApiError('');
    setBatchResult(null);
    setSelectedIndex(null);
    setPreviewMap(currentPreviews);

    try {
      const response = await runMultiImageAnalysis(files.map((entry) => entry.file));
      const batch = response?.data?.batch;
      setBatchResult(batch);

      if (batch?.items?.length) {
        setSelectedIndex(batch.items[0].index);
      }

      if (batch?.quotaExceeded) {
        showToast(
          batch.quotaErrorMessage ||
            'Gemini AI quota exceeded mid-batch. Completed results were saved.',
          'error'
        );
      } else {
        showToast(
          `Batch completed: ${batch?.summary?.successfullyAnalyzed || 0} analyzed, ${batch?.summary?.rejected || 0} rejected.`,
          'success'
        );
      }
    } catch (err) {
      const partialBatch = err.data?.error?.batch || null;
      if (partialBatch) {
        setBatchResult(partialBatch);
        if (partialBatch.items?.length) {
          setSelectedIndex(partialBatch.items[0].index);
        }
      }
      const msg = err.message || 'Unable to analyze batch. Please try again.';
      setApiError(msg);
      showToast(msg, 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    files.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setFiles([]);
    setBatchResult(null);
    setPreviewMap({});
    setSelectedIndex(null);
    setApiError('');
  };

  const summary = batchResult?.summary || null;
  const items = batchResult?.items || [];
  const selectedItem = items.find((item) => item.index === selectedIndex) || null;

  const healthChartData =
    summary && summary.healthy + summary.diseased > 0
      ? [
          { name: 'Healthy', value: summary.healthy, color: '#16a34a' },
          { name: 'Diseased', value: summary.diseased, color: '#dc2626' },
        ]
      : [];

  const cropChartData = summary
    ? Object.entries(summary.cropDistribution || {}).map(([crop, count]) => ({
        crop,
        count,
      }))
    : [];

  const diseaseChartData = summary
    ? Object.entries(summary.diseaseDistribution || {}).map(([disease, count]) => ({
        disease,
        count,
      }))
    : [];

  return (
    <div className="kv-page-stack">
      <Card>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <SupportedCropsBar label="Supported Crops (Max 5 images per batch)" />
          {(batchResult || apiError) && (
            <Button variant="secondary" size="sm" icon={FiRefreshCw} onClick={handleReset}>
              New Batch
            </Button>
          )}
        </div>
      </Card>

      <div className="kv-split-layout">
        <Card
          title="Upload Multiple Crop Images"
          subtitle={`Validate and analyze up to ${MAX_BATCH_IMAGES} images independently in one batch.`}
          icon={FiLayers}
        >
          <ImageUploader
            multiple
            maxFiles={MAX_BATCH_IMAGES}
            files={files}
            onFilesChange={handleFilesChange}
            title="Upload Up to 5 Plant Images"
            hint="Each image is validated individually (JPG, JPEG, PNG, WEBP up to 10 MB each)"
            primaryActionLabel={
              analyzing
                ? `Processing Batch (${files.length}/${MAX_BATCH_IMAGES})...`
                : `Upload & Analyze (${files.length}/${MAX_BATCH_IMAGES})`
            }
            onPrimaryAction={handleBatchAnalyze}
            actionLoading={analyzing}
            actionDisabled={analyzing}
          />
        </Card>

        <div className="kv-page-stack">
          {apiError && (
            <div className="kv-alert kv-alert-danger" role="alert">
              <FiAlertCircle size={17} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{apiError}</span>
            </div>
          )}

          {batchResult?.quotaExceeded && !apiError && (
            <div className="kv-alert kv-alert-warning" role="alert">
              <FiAlertTriangle size={17} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                {batchResult.quotaErrorMessage ||
                  'Gemini AI quota or rate limit was exceeded during this batch. Completed results are preserved below; remaining images were marked Not Processed.'}
              </span>
            </div>
          )}

          {batchResult?.items?.some((item) => item.imageStorageError) && (
            <div className="kv-alert kv-alert-warning" role="alert">
              <FiAlertTriangle size={17} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                One or more batch images could not be stored in Cloudinary. Analysis results were saved without fabricating image URLs.
              </span>
            </div>
          )}

          <section className="kv-grid-4" aria-label="Batch Overview Statistics">
            <StatCard
              label="Total Uploaded"
              value={summary ? summary.totalUploaded : files.length}
              icon={FiUpload}
              tone="blue"
            />
            <StatCard
              label="Successfully Analyzed"
              value={summary ? summary.successfullyAnalyzed : 0}
              icon={FiCheckCircle}
              tone="green"
            />
            <StatCard
              label="Rejected"
              value={summary ? summary.rejected : 0}
              icon={FiXCircle}
              tone="red"
            />
            <StatCard
              label="Not Processed"
              value={summary ? summary.notProcessed : 0}
              icon={FiSlash}
              tone="amber"
            />
          </section>

          <section className="kv-grid-3" aria-label="Health Breakdown">
            <StatCard
              label={
                summary && summary.healthy + summary.diseased > 0
                  ? `Healthy (${summary.healthyPercentage}%)`
                  : 'Healthy'
              }
              value={summary ? summary.healthy : 0}
              icon={FiCheckCircle}
              tone="green"
            />
            <StatCard
              label={
                summary && summary.healthy + summary.diseased > 0
                  ? `Diseased (${summary.diseasedPercentage}%)`
                  : 'Diseased'
              }
              value={summary ? summary.diseased : 0}
              icon={FiAlertTriangle}
              tone="red"
            />
            <StatCard
              label="Uncertain"
              value={summary ? summary.uncertain : 0}
              icon={FiHelpCircle}
              tone="amber"
            />
          </section>

          <div className="kv-grid-2">
            <Card
              title="Healthy vs Diseased"
              subtitle="Calculated strictly from analyzed HEALTHY and DISEASED results."
              icon={FiPieChart}
            >
              {healthChartData.length > 0 ? (
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={healthChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={78}
                        paddingAngle={3}
                      >
                        {healthChartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState
                  icon={FiPieChart}
                  title="No Health Breakdown Yet"
                  description={
                    analyzing
                      ? 'Validating and analyzing uploaded images sequentially...'
                      : 'Healthy vs diseased chart will appear when at least one image resolves as HEALTHY or DISEASED.'
                  }
                />
              )}
            </Card>

            <Card
              title="Crop Distribution"
              subtitle="Counts across successfully analyzed supported crops."
              icon={FiBarChart2}
            >
              {cropChartData.length > 0 ? (
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cropChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e1e8e3" />
                      <XAxis dataKey="crop" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#15803d" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState
                  icon={FiBarChart2}
                  title="No Crop Distribution Yet"
                  description="Only validated and successfully analyzed images are counted here."
                />
              )}
            </Card>
          </div>

          {diseaseChartData.length > 0 && (
            <Card
              title="Disease Distribution"
              subtitle="Actual diseases identified across diseased images in this batch."
              icon={FiAlertTriangle}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {diseaseChartData.map((entry) => (
                  <Badge key={entry.disease} variant="danger" icon={FiAlertTriangle}>
                    {entry.disease}: {entry.count}
                  </Badge>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="kv-split-layout">
        <Card
          title="Individual Image Results"
          subtitle="Click any image card to inspect detailed findings or rejection reasons."
          icon={FiLayers}
        >
          {items.length === 0 ? (
            <EmptyState
              icon={FiLayers}
              title={analyzing ? 'Processing Batch Images...' : 'No Individual Cards Yet'}
              description="Upload 1 to 5 images and click Upload & Analyze to inspect each image independently."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map((item) => {
                const badgeMeta = getItemBadge(item);
                const BadgeIcon = badgeMeta.icon;
                const thumbSrc = item.imageUrl || previewMap[item.index];
                const isSelected = selectedIndex === item.index;

                return (
                  <button
                    key={`${item.index}-${item.fileName}`}
                    type="button"
                    onClick={() => setSelectedIndex(item.index)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      borderRadius: 'var(--kv-radius-md)',
                      border: isSelected
                        ? '2px solid var(--kv-primary)'
                        : '1px solid var(--kv-border)',
                      backgroundColor: isSelected
                        ? 'var(--kv-primary-light)'
                        : 'var(--kv-surface)',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 'var(--kv-radius-sm)',
                        overflow: 'hidden',
                        backgroundColor: 'var(--kv-surface-subtle)',
                        border: '1px solid var(--kv-border)',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {thumbSrc ? (
                        <img
                          src={thumbSrc}
                          alt={item.fileName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <FiLayers size={20} color="var(--kv-text-muted)" />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.fileName}
                        </span>
                        <Badge variant={badgeMeta.variant} icon={BadgeIcon}>
                          {badgeMeta.label}
                        </Badge>
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--kv-text-secondary)',
                          marginTop: 4,
                        }}
                      >
                        {item.processingStatus === 'ANALYZED'
                          ? `${item.crop} — ${
                              item.diseaseName ||
                              (item.diseaseStatus === 'HEALTHY'
                                ? 'Healthy'
                                : 'Inconclusive')
                            }${typeof item.confidence === 'number' ? ` (${item.confidence}%)` : ''}`
                          : item.rejectionReason || item.validationStatus}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <Card
          title="Selected Image Details"
          subtitle={
            selectedItem
              ? `Inspecting ${selectedItem.fileName}`
              : 'Select an analyzed, rejected, or not-processed image card.'
          }
          icon={FiInfo}
        >
          {!selectedItem ? (
            <EmptyState
              icon={FiInfo}
              title="No Image Selected"
              description="Click an individual image result card on the left to inspect its full details."
            />
          ) : selectedItem.processingStatus !== 'ANALYZED' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <Badge variant={getItemBadge(selectedItem).variant}>
                  {getItemBadge(selectedItem).label}
                </Badge>
                <Badge variant="neutral">Status: {selectedItem.validationStatus}</Badge>
              </div>
              <div
                className={`kv-alert ${
                  selectedItem.processingStatus === 'REJECTED'
                    ? 'kv-alert-danger'
                    : 'kv-alert-warning'
                }`}
              >
                <FiAlertCircle size={17} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  {selectedItem.rejectionReason ||
                    'This image was not analyzed.'}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <Badge variant={getItemBadge(selectedItem).variant}>
                  {getItemBadge(selectedItem).label}
                </Badge>
                {selectedItem.crop && <Badge variant="success">{selectedItem.crop}</Badge>}
                {typeof selectedItem.confidence === 'number' && (
                  <Badge variant="info">Confidence: {selectedItem.confidence}%</Badge>
                )}
                {selectedItem.severity && (
                  <Badge variant="neutral">Severity: {selectedItem.severity}</Badge>
                )}
                {typeof selectedItem.estimatedAffectedAreaPercent === 'number' && (
                  <Badge variant="neutral">
                    Est. Affected Area: {selectedItem.estimatedAffectedAreaPercent}%
                  </Badge>
                )}
              </div>

              {selectedItem.diseaseName && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--kv-text-muted)' }}>
                    Identified Disease
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700 }}>{selectedItem.diseaseName}</h3>
                </div>
              )}

              {selectedItem.summary && (
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Summary</h4>
                  <p style={{ fontSize: 13, color: 'var(--kv-text-secondary)' }}>
                    {selectedItem.summary}
                  </p>
                </div>
              )}

              {selectedItem.diseaseExplanation && (
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                    Explanation
                  </h4>
                  <p style={{ fontSize: 13, color: 'var(--kv-text-secondary)' }}>
                    {selectedItem.diseaseExplanation}
                  </p>
                </div>
              )}

              <div className="kv-grid-2">
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                    Visible Symptoms
                  </h4>
                  {renderBulletList(
                    selectedItem.symptoms,
                    selectedItem.diseaseStatus === 'HEALTHY'
                      ? 'No disease symptoms observed.'
                      : 'No symptoms listed.'
                  )}
                </div>

                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                    Visual Evidence
                  </h4>
                  {renderBulletList(
                    selectedItem.visualEvidence,
                    'No visual evidence notes.'
                  )}
                </div>
              </div>

              <div className="kv-grid-2">
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                    Management Recommendations
                  </h4>
                  {renderBulletList(
                    selectedItem.managementRecommendations,
                    'No management recommendations.'
                  )}
                </div>

                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                    Preventive Measures
                  </h4>
                  {renderBulletList(
                    selectedItem.preventiveMeasures,
                    'No preventive measures listed.'
                  )}
                </div>
              </div>

              {selectedItem.treatmentGuidance?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                    Treatment Guidance
                  </h4>
                  {renderBulletList(
                    selectedItem.treatmentGuidance,
                    'No specific treatment guidance.'
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default MultiImageAnalysisPage;
