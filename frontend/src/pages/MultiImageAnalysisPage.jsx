import { useState } from 'react';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiLayers,
  FiPieChart,
  FiUpload,
  FiXCircle,
} from 'react-icons/fi';
import Card from '../components/common/Card';
import ImageUploader from '../components/common/ImageUploader';
import StatCard from '../components/common/StatCard';
import EmptyState from '../components/common/EmptyState';
import SupportedCropsBar from '../components/common/SupportedCropsBar';
import { MAX_BATCH_IMAGES } from '../utils/constants';
import { useToast } from '../context/ToastContext';

const MultiImageAnalysisPage = () => {
  const { showToast } = useToast();
  const [files, setFiles] = useState([]);

  const handleBatchAnalyze = () => {
    if (!files.length) return;
    showToast(
      `${files.length} image(s) queued locally. Multi Image Analysis Agent will be connected in Phase 5.`,
      'info'
    );
  };

  return (
    <div className="kv-page-stack">
      <Card>
        <SupportedCropsBar label="Supported Crops (Max 5 images per batch)" />
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
            onFilesChange={setFiles}
            title="Upload Up to 5 Plant Images"
            hint="Each image is validated individually (JPG, JPEG, PNG, WEBP up to 10 MB each)"
            primaryActionLabel={`Analyze Batch (${files.length}/${MAX_BATCH_IMAGES})`}
            onPrimaryAction={handleBatchAnalyze}
          />
        </Card>

        <div className="kv-page-stack">
          <section className="kv-grid-3" aria-label="Batch Overview Statistics">
            <StatCard label="Selected / Uploaded" value={files.length} icon={FiUpload} tone="blue" />
            <StatCard label="Successfully Analyzed" value={0} icon={FiCheckCircle} tone="green" />
            <StatCard label="Rejected" value={0} icon={FiXCircle} tone="amber" />
          </section>

          <section className="kv-grid-2" aria-label="Health Breakdown">
            <StatCard label="Healthy" value={0} icon={FiCheckCircle} tone="green" />
            <StatCard label="Diseased" value={0} icon={FiAlertTriangle} tone="red" />
          </section>

          <Card
            title="Batch Overview & Distribution"
            subtitle="Charts and crop distribution are computed strictly from valid analyzed images."
            icon={FiPieChart}
          >
            <EmptyState
              icon={FiPieChart}
              title="No Batch Results Yet"
              description="Upload up to 5 images and run batch analysis to view healthy vs diseased breakdown, crop distribution, and clickable individual image cards."
            />
          </Card>

          <Card
            title="Individual Image Results"
            subtitle="Click any analyzed image card to inspect disease, healthy observations, or rejection reason."
            icon={FiLayers}
          >
            <EmptyState
              icon={FiLayers}
              title="No Individual Cards Yet"
              description="Invalid or unsupported crop images will be rejected individually without stopping valid images in your batch."
            />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MultiImageAnalysisPage;
