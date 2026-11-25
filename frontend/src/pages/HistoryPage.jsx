import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FiActivity,
  FiAlertCircle,
  FiAlertTriangle,
  FiArrowLeft,
  FiBarChart2,
  FiBookOpen,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiEye,
  FiFileText,
  FiHelpCircle,
  FiImage,
  FiInfo,
  FiLayers,
  FiList,
  FiLoader,
  FiPieChart,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiSlash,
  FiTrash2,
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
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import ConfirmModal from '../components/common/ConfirmModal';
import EmptyState from '../components/common/EmptyState';
import StatCard from '../components/common/StatCard';
import Tabs from '../components/common/Tabs';
import { useToast } from '../context/ToastContext';
import {
  deleteHistoryRecord,
  fetchHistory,
  fetchHistoryDetail,
} from '../services/historyService';
import { SUPPORTED_CROPS } from '../utils/constants';

const DISEASE_TABS = [
  { id: 'info', label: 'Disease Information', icon: FiFileText },
  { id: 'area', label: 'Area Analysis', icon: FiLayers },
  { id: 'severity', label: 'Severity', icon: FiAlertTriangle },
  { id: 'management', label: 'Management', icon: FiShield },
];

const PLANT_TABS = [
  { id: 'info', label: 'Plant Information', icon: FiInfo },
  { id: 'details', label: 'Key Details', icon: FiList },
  { id: 'uses', label: 'Uses & Importance', icon: FiBookOpen },
];

const TYPE_META = {
  disease_detection: { label: 'Disease Detection', variant: 'info', icon: FiActivity },
  plant_identification: { label: 'Plant ID', variant: 'success', icon: FiSearch },
  multi_image_analysis: { label: 'Multi Batch', variant: 'neutral', icon: FiLayers },
};

const getStatusBadgeVariant = (status) => {
  if (status === 'HEALTHY' || status === 'IDENTIFIED' || status === 'COMPLETED') {
    return 'success';
  }
  if (status === 'DISEASED' || status === 'REJECTED') {
    return 'danger';
  }
  if (
    status === 'UNCERTAIN' ||
    status === 'COMPLETED_WITH_REJECTIONS' ||
    status === 'PARTIAL_QUOTA_EXCEEDED' ||
    status === 'NOT_PROCESSED'
  ) {
    return 'warning';
  }
  return 'neutral';
};

const formatDateTime = (value) => {
  if (!value) return 'Unavailable';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const formatBytes = (bytes) => {
  if (typeof bytes !== 'number' || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const SafeThumbnail = ({ src, alt, size = 46 }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className="kv-history-thumb-fallback"
        style={{ width: size, height: size }}
        aria-label="No stored image preview"
      >
        <FiImage size={Math.max(16, Math.round(size * 0.4))} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="kv-history-thumb"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
};

const OriginalImageViewer = ({ src, alt, storageStatus, metadata }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <EmptyState
        icon={FiImage}
        title={failed ? 'Image Failed to Load' : 'Original Image Not Stored'}
        description={
          failed
            ? 'The stored Cloudinary image URL could not be loaded (it may have been removed).'
            : storageStatus === 'NOT_CONFIGURED'
              ? 'Cloudinary storage was not configured when this analysis was saved.'
              : 'No uploaded image URL was stored with this record.'
        }
      />
    );
  }

  const sizeLabel = formatBytes(metadata?.sizeBytes);

  return (
    <div className="kv-preview-box">
      <img
        src={src}
        alt={alt}
        className="kv-preview-img"
        onError={() => setFailed(true)}
      />
      <div className="kv-preview-meta">
        <span>Stored Original Image (Cloudinary)</span>
        <span>
          {metadata?.mimeType || 'image'}
          {sizeLabel ? ` • ${sizeLabel}` : ''}
        </span>
      </div>
    </div>
  );
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
        <li key={`${idx}-${String(item).slice(0, 20)}`}>{item}</li>
      ))}
    </ul>
  );
};

const getBatchItemBadge = (item) => {
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

const HistoryPage = () => {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkType = searchParams.get('type') || '';
  const deepLinkId = searchParams.get('id') || '';

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [analysisType, setAnalysisType] = useState('all');
  const [cropFilter, setCropFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);

  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [stats, setStats] = useState({
    totalAnalyses: 0,
    diseasedDetections: 0,
    healthyDetections: 0,
    plantIdentifications: 0,
    multiImageBatches: 0,
  });

  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState('');

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [diseaseTab, setDiseaseTab] = useState('info');
  const [plantTab, setPlantTab] = useState('info');
  const [selectedBatchItemIndex, setSelectedBatchItemIndex] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 280);
    return () => clearTimeout(timer);
  }, [search]);

  const loadHistory = useCallback(async () => {
    setLoadingList(true);
    setListError('');
    try {
      const response = await fetchHistory({
        type: analysisType,
        crop: cropFilter,
        status: statusFilter,
        search: debouncedSearch,
        date: dateFilter,
        page,
        limit: 10,
      });

      const data = response?.data || {};
      setRecords(data.records || []);
      if (data.pagination) setPagination(data.pagination);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      setListError(err.message || 'Unable to fetch saved analysis history.');
    } finally {
      setLoadingList(false);
    }
  }, [analysisType, cropFilter, statusFilter, debouncedSearch, dateFilter, page]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleOpenDetail = useCallback(async (item) => {
    setLoadingDetail(true);
    setDetailError('');
    setDiseaseTab('info');
    setPlantTab('info');
    setSelectedBatchItemIndex(null);

    try {
      const response = await fetchHistoryDetail(item.analysisType, item.id);
      const record = response?.data?.record || null;
      setSelectedRecord(record);
      if (record?.analysisType === 'multi_image_analysis' && record.items?.length) {
        setSelectedBatchItemIndex(record.items[0].index);
      }
    } catch (err) {
      const msg = err.message || 'Unable to load analysis details.';
      setDetailError(msg);
      showToast(msg, 'error');
    } finally {
      setLoadingDetail(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (deepLinkId) {
      handleOpenDetail({
        id: deepLinkId,
        analysisType: deepLinkType || undefined,
      });
    }
  }, [deepLinkId, deepLinkType, handleOpenDetail]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);

    try {
      const res = await deleteHistoryRecord(deleteTarget.analysisType, deleteTarget.id);
      const deletedCount = res?.data?.cloudinary?.deletedCount ?? 0;

      if (selectedRecord?.id === deleteTarget.id) {
        setSelectedRecord(null);
        setDetailError('');
        if (deepLinkId) {
          setSearchParams({}, { replace: true });
        }
      }

      showToast(
        deletedCount > 0
          ? `Record and ${deletedCount} Cloudinary image(s) permanently deleted.`
          : 'History record permanently deleted.',
        'success'
      );
      setDeleteTarget(null);
      await loadHistory();
    } catch (err) {
      showToast(err.message || 'Permanent deletion failed.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setAnalysisType('all');
    setCropFilter('all');
    setStatusFilter('all');
    setDateFilter('');
    setPage(1);
  };

  const hasActiveFilters =
    Boolean(debouncedSearch) ||
    analysisType !== 'all' ||
    cropFilter !== 'all' ||
    statusFilter !== 'all' ||
    Boolean(dateFilter);

  // Render full Detail View when a record is opened
  if (selectedRecord || loadingDetail) {
    const diseaseAnalysis = selectedRecord?.aiResult?.diseaseAnalysis || null;
    const plantIdentification = selectedRecord?.aiResult?.plantIdentification || null;
    const batchItems = selectedRecord?.items || [];
    const selectedBatchItem =
      batchItems.find((item) => item.index === selectedBatchItemIndex) || null;

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

    const batchSummary = selectedRecord?.summary || null;
    const batchHealthData =
      batchSummary && batchSummary.healthy + batchSummary.diseased > 0
        ? [
            { name: 'Healthy', value: batchSummary.healthy, color: '#16a34a' },
            { name: 'Diseased', value: batchSummary.diseased, color: '#dc2626' },
          ]
        : [];
    const batchCropData = batchSummary
      ? Object.entries(batchSummary.cropDistribution || {}).map(([crop, count]) => ({
          crop,
          count,
        }))
      : [];

    return (
      <div className="kv-page-stack">
        <Card>
          <div className="kv-history-detail-bar">
            <Button
              variant="secondary"
              size="sm"
              icon={FiArrowLeft}
              onClick={() => {
                setSelectedRecord(null);
                setDetailError('');
                if (deepLinkId) {
                  setSearchParams({}, { replace: true });
                }
              }}
            >
              Back to History
            </Button>

            {selectedRecord && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Badge variant={TYPE_META[selectedRecord.analysisType]?.variant || 'neutral'}>
                  {TYPE_META[selectedRecord.analysisType]?.label || selectedRecord.analysisType}
                </Badge>
                <Badge variant="neutral" icon={FiClock}>
                  {formatDateTime(selectedRecord.createdAt)}
                </Badge>
                <Button
                  variant="danger"
                  size="sm"
                  icon={FiTrash2}
                  onClick={() =>
                    setDeleteTarget({
                      id: selectedRecord.id,
                      analysisType: selectedRecord.analysisType,
                      title:
                        selectedRecord.diseaseName ||
                        selectedRecord.commonName ||
                        selectedRecord.crop ||
                        `Batch (${selectedRecord.items?.length || 0} images)`,
                    })
                  }
                >
                  Delete Permanently
                </Button>
              </div>
            )}
          </div>
        </Card>

        {loadingDetail && (
          <Card>
            <div className="kv-weather-loading">
              <FiLoader size={22} className="kv-spin" color="var(--kv-primary)" />
              <span>Loading saved analysis record from MongoDB...</span>
            </div>
          </Card>
        )}

        {detailError && (
          <div className="kv-alert kv-alert-danger" role="alert">
            <FiAlertCircle size={17} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{detailError}</span>
          </div>
        )}

        {!loadingDetail && selectedRecord?.analysisType === 'disease_detection' && diseaseAnalysis && (
          <div className="kv-split-layout">
            <Card title="Original Uploaded Image" icon={FiImage}>
              <OriginalImageViewer
                src={selectedRecord.imageUrl}
                alt={`${selectedRecord.crop} analysis`}
                storageStatus={selectedRecord.imageStorageStatus}
                metadata={selectedRecord.imageMetadata}
              />
            </Card>

            <Card
              title={`${selectedRecord.crop} — Disease Detection Details`}
              subtitle={`Saved analysis ID: ${selectedRecord.id}`}
              icon={FiActivity}
              action={
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Badge variant={getStatusBadgeVariant(selectedRecord.status)}>
                    {selectedRecord.status}
                  </Badge>
                  <Badge variant="info">Confidence: {selectedRecord.confidence}%</Badge>
                </div>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Tabs tabs={DISEASE_TABS} activeTab={diseaseTab} onChange={setDiseaseTab} />

                {diseaseTab === 'info' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="kv-grid-3">
                      <div className="kv-weather-metric-tile">
                        <span className="kv-weather-metric-label">Crop</span>
                        <strong>{diseaseAnalysis.crop}</strong>
                      </div>
                      <div className="kv-weather-metric-tile">
                        <span className="kv-weather-metric-label">Disease / Result</span>
                        <strong>
                          {diseaseAnalysis.diseaseName ||
                            (diseaseAnalysis.status === 'HEALTHY' ? 'Healthy' : 'Inconclusive')}
                        </strong>
                      </div>
                      <div className="kv-weather-metric-tile">
                        <span className="kv-weather-metric-label">Severity</span>
                        <strong>{diseaseAnalysis.severity}</strong>
                      </div>
                    </div>
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Summary</h4>
                      <p style={{ fontSize: 13, color: 'var(--kv-text-secondary)' }}>
                        {diseaseAnalysis.summary}
                      </p>
                    </div>
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Explanation</h4>
                      <p style={{ fontSize: 13, color: 'var(--kv-text-secondary)' }}>
                        {diseaseAnalysis.diseaseExplanation}
                      </p>
                    </div>
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                        Observed Symptoms
                      </h4>
                      {renderBulletList(diseaseAnalysis.symptoms, 'No disease symptoms recorded.')}
                    </div>
                  </div>
                )}

                {diseaseTab === 'area' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {hasAreaEstimate ? (
                      <div className="kv-grid-2" style={{ alignItems: 'center' }}>
                        <div style={{ height: 210 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={areaChartData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={48}
                                outerRadius={78}
                                paddingAngle={2}
                              >
                                {areaChartData.map((entry) => (
                                  <Cell key={entry.name} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(val) => `${val}%`} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div className="kv-weather-metric-tile">
                            <span className="kv-weather-metric-label">Estimated Healthy Area</span>
                            <strong>{healthyPercent}%</strong>
                          </div>
                          <div className="kv-weather-metric-tile">
                            <span className="kv-weather-metric-label">Estimated Affected Area</span>
                            <strong>{affectedPercent}%</strong>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <EmptyState
                        icon={FiLayers}
                        title="Affected Area Estimate Unavailable"
                        description="No percentage area estimate was recorded for this analysis."
                      />
                    )}
                  </div>
                )}

                {diseaseTab === 'severity' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="kv-weather-metric-tile">
                      <span className="kv-weather-metric-label">Severity Level</span>
                      <strong>{diseaseAnalysis.severity}</strong>
                    </div>
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                        Visual Evidence
                      </h4>
                      {renderBulletList(
                        diseaseAnalysis.visualEvidence,
                        'No additional visual evidence recorded.'
                      )}
                    </div>
                  </div>
                )}

                {diseaseTab === 'management' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                        Management Recommendations
                      </h4>
                      {renderBulletList(
                        diseaseAnalysis.managementRecommendations,
                        'No management recommendations recorded.'
                      )}
                    </div>
                    {diseaseAnalysis.treatmentGuidance?.length > 0 && (
                      <div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                          Treatment Guidance
                        </h4>
                        {renderBulletList(
                          diseaseAnalysis.treatmentGuidance,
                          'No specific treatment guidance recorded.'
                        )}
                      </div>
                    )}
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                        Preventive Measures
                      </h4>
                      {renderBulletList(
                        diseaseAnalysis.preventiveMeasures,
                        'No preventive measures recorded.'
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {!loadingDetail &&
          selectedRecord?.analysisType === 'plant_identification' &&
          plantIdentification && (
            <div className="kv-split-layout">
              <Card title="Original Uploaded Image" icon={FiImage}>
                <OriginalImageViewer
                  src={selectedRecord.imageUrl}
                  alt={selectedRecord.commonName || 'Plant identification'}
                  storageStatus={selectedRecord.imageStorageStatus}
                  metadata={selectedRecord.imageMetadata}
                />
              </Card>

              <Card
                title={`${plantIdentification.commonName || selectedRecord.crop || 'Plant Identification'}`}
                subtitle={plantIdentification.scientificName || `Record ID: ${selectedRecord.id}`}
                icon={FiSearch}
                action={
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Badge variant={getStatusBadgeVariant(selectedRecord.status)}>
                      {selectedRecord.status}
                    </Badge>
                    <Badge variant="info">Confidence: {selectedRecord.confidence}%</Badge>
                  </div>
                }
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <Tabs tabs={PLANT_TABS} activeTab={plantTab} onChange={setPlantTab} />

                  {plantTab === 'info' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div className="kv-grid-3">
                        <div className="kv-weather-metric-tile">
                          <span className="kv-weather-metric-label">Crop</span>
                          <strong>{plantIdentification.crop || 'Uncertain'}</strong>
                        </div>
                        <div className="kv-weather-metric-tile">
                          <span className="kv-weather-metric-label">Common Name</span>
                          <strong>{plantIdentification.commonName || 'Not Specified'}</strong>
                        </div>
                        <div className="kv-weather-metric-tile">
                          <span className="kv-weather-metric-label">Scientific Name</span>
                          <strong style={{ fontStyle: 'italic' }}>
                            {plantIdentification.scientificName || 'Not Specified'}
                          </strong>
                        </div>
                      </div>
                      <div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                          Description
                        </h4>
                        <p style={{ fontSize: 13, color: 'var(--kv-text-secondary)' }}>
                          {plantIdentification.plantDescription}
                        </p>
                      </div>
                    </div>
                  )}

                  {plantTab === 'details' && (
                    <div className="kv-grid-2">
                      <div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                          Visual Characteristics
                        </h4>
                        {renderBulletList(
                          plantIdentification.visualCharacteristics,
                          'No visual characteristics recorded.'
                        )}
                      </div>
                      <div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                          Key Traits
                        </h4>
                        {renderBulletList(
                          plantIdentification.keyTraits,
                          'No key botanical traits recorded.'
                        )}
                      </div>
                    </div>
                  )}

                  {plantTab === 'uses' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                          Agricultural Importance
                        </h4>
                        <p style={{ fontSize: 13, color: 'var(--kv-text-secondary)' }}>
                          {plantIdentification.agriculturalImportance}
                        </p>
                      </div>
                      <div className="kv-grid-2">
                        <div>
                          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                            Common Uses
                          </h4>
                          {renderBulletList(plantIdentification.commonUses, 'No uses listed.')}
                        </div>
                        <div>
                          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                            Crop Guidance
                          </h4>
                          {renderBulletList(
                            plantIdentification.usefulCropInfo,
                            'No additional guidance listed.'
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

        {!loadingDetail && selectedRecord?.analysisType === 'multi_image_analysis' && (
          <div className="kv-page-stack">
            <section className="kv-grid-4">
              <StatCard
                label="Total Uploaded"
                value={batchSummary?.totalUploaded || batchItems.length}
                icon={FiLayers}
                tone="blue"
              />
              <StatCard
                label="Analyzed"
                value={batchSummary?.successfullyAnalyzed || 0}
                icon={FiCheckCircle}
                tone="green"
              />
              <StatCard
                label="Diseased"
                value={batchSummary?.diseased || 0}
                icon={FiAlertTriangle}
                tone="red"
              />
              <StatCard
                label="Rejected / Skipped"
                value={(batchSummary?.rejected || 0) + (batchSummary?.notProcessed || 0)}
                icon={FiXCircle}
                tone="amber"
              />
            </section>

            {(batchHealthData.length > 0 || batchCropData.length > 0) && (
              <div className="kv-grid-2">
                <Card title="Healthy vs Diseased" icon={FiPieChart}>
                  {batchHealthData.length > 0 ? (
                    <div style={{ height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={batchHealthData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={72}
                            paddingAngle={3}
                          >
                            {batchHealthData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyState icon={FiPieChart} title="No Health Split" description="No analyzed healthy/diseased counts." />
                  )}
                </Card>

                <Card title="Crop Distribution" icon={FiBarChart2}>
                  {batchCropData.length > 0 ? (
                    <div style={{ height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={batchCropData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e1e8e3" />
                          <XAxis dataKey="crop" tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#15803d" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <EmptyState icon={FiBarChart2} title="No Crops Analyzed" description="No crop distribution counts in this batch." />
                  )}
                </Card>
              </div>
            )}

            <div className="kv-split-layout">
              <Card
                title="Batch Images"
                subtitle={`Batch ID: ${selectedRecord.batchId}`}
                icon={FiLayers}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {batchItems.map((item) => {
                    const bMeta = getBatchItemBadge(item);
                    const isSelected = selectedBatchItemIndex === item.index;
                    return (
                      <button
                        key={`${item.index}-${item.fileName}`}
                        type="button"
                        onClick={() => setSelectedBatchItemIndex(item.index)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: 10,
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
                        <SafeThumbnail src={item.imageUrl} alt={item.fileName} size={52} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <strong
                              style={{
                                fontSize: 13,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {item.fileName}
                            </strong>
                            <Badge variant={bMeta.variant}>{bMeta.label}</Badge>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--kv-text-secondary)', marginTop: 3 }}>
                            {item.processingStatus === 'ANALYZED'
                              ? `${item.crop} — ${item.diseaseName || item.diseaseStatus}`
                              : item.rejectionReason || item.validationStatus}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>

              <Card
                title={selectedBatchItem ? selectedBatchItem.fileName : 'Selected Image Details'}
                icon={FiInfo}
              >
                {!selectedBatchItem ? (
                  <EmptyState
                    icon={FiInfo}
                    title="Select a Batch Image"
                    description="Choose any image on the left to view its stored Cloudinary photo and saved result."
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <OriginalImageViewer
                      src={selectedBatchItem.imageUrl}
                      alt={selectedBatchItem.fileName}
                      storageStatus={selectedBatchItem.imageStorageStatus}
                      metadata={{
                        mimeType: selectedBatchItem.mimeType,
                        sizeBytes: selectedBatchItem.sizeBytes,
                      }}
                    />

                    {selectedBatchItem.processingStatus !== 'ANALYZED' ? (
                      <div
                        className={`kv-alert ${
                          selectedBatchItem.processingStatus === 'REJECTED'
                            ? 'kv-alert-danger'
                            : 'kv-alert-warning'
                        }`}
                      >
                        <FiAlertCircle size={17} style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>
                          {selectedBatchItem.rejectionReason ||
                            `Status: ${selectedBatchItem.validationStatus}`}
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <Badge variant={getStatusBadgeVariant(selectedBatchItem.diseaseStatus)}>
                            {selectedBatchItem.diseaseStatus}
                          </Badge>
                          {selectedBatchItem.crop && (
                            <Badge variant="success">{selectedBatchItem.crop}</Badge>
                          )}
                          {typeof selectedBatchItem.confidence === 'number' && (
                            <Badge variant="info">
                              Confidence: {selectedBatchItem.confidence}%
                            </Badge>
                          )}
                          {selectedBatchItem.severity && (
                            <Badge variant="neutral">
                              Severity: {selectedBatchItem.severity}
                            </Badge>
                          )}
                        </div>
                        {selectedBatchItem.summary && (
                          <p style={{ fontSize: 13, color: 'var(--kv-text-secondary)' }}>
                            {selectedBatchItem.summary}
                          </p>
                        )}
                        <div>
                          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                            Symptoms
                          </h4>
                          {renderBulletList(selectedBatchItem.symptoms, 'No symptoms listed.')}
                        </div>
                        <div>
                          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                            Management Recommendations
                          </h4>
                          {renderBulletList(
                            selectedBatchItem.managementRecommendations,
                            'No management recommendations listed.'
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={Boolean(deleteTarget)}
          title="Permanently Delete Record?"
          message={`This will permanently delete "${deleteTarget?.title}" from MongoDB and remove its stored image(s) from Cloudinary. This cannot be undone.`}
          confirmLabel={deleting ? 'Deleting...' : 'Delete Permanently'}
          onConfirm={handleConfirmDelete}
          onCancel={() => !deleting && setDeleteTarget(null)}
        />
      </div>
    );
  }

  return (
    <div className="kv-page-stack">
      <section className="kv-grid-4" aria-label="History Summary">
        <StatCard label="Total Analyses" value={stats.totalAnalyses} icon={FiClock} tone="green" />
        <StatCard
          label="Diseased Detections"
          value={stats.diseasedDetections}
          icon={FiAlertTriangle}
          tone="red"
        />
        <StatCard
          label="Healthy Detections"
          value={stats.healthyDetections}
          icon={FiCheckCircle}
          tone="green"
        />
        <StatCard
          label="Plant Identifications"
          value={stats.plantIdentifications}
          icon={FiSearch}
          tone="blue"
        />
      </section>

      <Card
        title="Filter Analysis Records"
        subtitle="Search and filter persisted MongoDB analyses by type, crop, status, and date."
        icon={FiSearch}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                Clear Filters
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              icon={FiRefreshCw}
              onClick={loadHistory}
              loading={loadingList}
            >
              Refresh
            </Button>
          </div>
        }
      >
        <div className="kv-filter-bar">
          <div className="kv-input-icon-wrap">
            <FiSearch size={15} className="kv-input-icon" />
            <input
              type="text"
              className="kv-input kv-input-with-icon"
              placeholder="Search crop, plant, or disease..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search history"
            />
          </div>

          <select
            className="kv-select"
            value={analysisType}
            onChange={(e) => {
              setAnalysisType(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by analysis type"
          >
            <option value="all">All Analysis Types</option>
            <option value="disease_detection">Disease Detection</option>
            <option value="plant_identification">Plant Identification</option>
            <option value="multi_image_analysis">Multi Image Analysis</option>
          </select>

          <select
            className="kv-select"
            value={cropFilter}
            onChange={(e) => {
              setCropFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by crop"
          >
            <option value="all">All Supported Crops</option>
            {SUPPORTED_CROPS.map((crop) => (
              <option key={crop} value={crop}>
                {crop}
              </option>
            ))}
          </select>

          <select
            className="kv-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by result status"
          >
            <option value="all">All Results</option>
            <option value="healthy">Healthy</option>
            <option value="diseased">Diseased</option>
            <option value="uncertain">Uncertain</option>
            <option value="identified">Identified</option>
          </select>

          <input
            type="date"
            className="kv-input"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by date"
          />
        </div>
      </Card>

      <Card
        title="Analysis History"
        subtitle="Real authenticated user records stored in MongoDB with Cloudinary images."
        icon={FiClock}
        action={<Badge variant="neutral">{pagination.totalItems} Total Record(s)</Badge>}
      >
        {listError && (
          <div
            className="kv-alert kv-alert-danger"
            style={{ marginBottom: 14, justifyContent: 'space-between', alignItems: 'center' }}
            role="alert"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FiAlertCircle size={17} />
              <span>{listError}</span>
            </div>
            <Button variant="secondary" size="sm" icon={FiRefreshCw} onClick={loadHistory}>
              Retry
            </Button>
          </div>
        )}

        {loadingList ? (
          <div className="kv-weather-loading" style={{ padding: '18px 4px' }}>
            <FiLoader size={22} className="kv-spin" color="var(--kv-primary)" />
            <span>Loading your analysis history...</span>
          </div>
        ) : records.length === 0 ? (
          <EmptyState
            icon={FiClock}
            title={hasActiveFilters ? 'No Matching History Records' : 'No Saved Analyses Yet'}
            description={
              hasActiveFilters
                ? 'Try clearing or adjusting your search filters to view other saved analyses.'
                : 'Your Disease Detection, Plant Identification, and Multi Image Analysis runs will appear here automatically once completed.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                  Clear Filters
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <div className="kv-table-wrap">
              <table className="kv-table">
                <thead>
                  <tr>
                    <th>Preview</th>
                    <th>Type</th>
                    <th>Crop / Plant</th>
                    <th>Result Summary</th>
                    <th>Status</th>
                    <th>Date & Time</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((item) => {
                    const tMeta = TYPE_META[item.analysisType] || {
                      label: item.analysisType,
                      variant: 'neutral',
                    };
                    return (
                      <tr key={`${item.analysisType}-${item.id}`}>
                        <td>
                          <SafeThumbnail src={item.thumbnailUrl} alt={item.title} size={46} />
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <Badge variant={tMeta.variant}>{tMeta.label}</Badge>
                            {item.analysisType === 'multi_image_analysis' && (
                              <span style={{ fontSize: 11, color: 'var(--kv-text-muted)' }}>
                                {item.imageCount} images
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700 }}>{item.crop}</div>
                          {typeof item.confidence === 'number' && (
                            <span style={{ fontSize: 12, color: 'var(--kv-text-muted)' }}>
                              {item.confidence}% confidence
                            </span>
                          )}
                        </td>
                        <td style={{ maxWidth: 280 }}>
                          <div style={{ fontWeight: 600 }}>{item.title}</div>
                          <div className="kv-history-summary-line">{item.resultSummary}</div>
                        </td>
                        <td>
                          <Badge variant={getStatusBadgeVariant(item.status)}>{item.status}</Badge>
                        </td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                          {formatDateTime(item.createdAt)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={FiEye}
                              onClick={() => handleOpenDetail(item)}
                            >
                              View
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              icon={FiTrash2}
                              aria-label={`Delete ${item.title}`}
                              onClick={() => setDeleteTarget(item)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pagination.totalPages > 1 && (
              <div className="kv-pagination-bar">
                <span className="kv-pagination-info">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.totalItems} total)
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={FiChevronLeft}
                    disabled={!pagination.hasPrevPage}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={FiChevronRight}
                    disabled={!pagination.hasNextPage}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Permanently Delete Record?"
        message={`This will permanently delete "${deleteTarget?.title}" from MongoDB and remove its stored image(s) from Cloudinary. This action cannot be undone.`}
        confirmLabel={deleting ? 'Deleting...' : 'Delete Permanently'}
        onConfirm={handleConfirmDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </div>
  );
};

export default HistoryPage;
