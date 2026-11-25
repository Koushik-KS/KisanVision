import { useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiFileText,
  FiInfo,
  FiLayers,
  FiShield,
} from 'react-icons/fi';
import Card from '../components/common/Card';
import ImageUploader from '../components/common/ImageUploader';
import Tabs from '../components/common/Tabs';
import EmptyState from '../components/common/EmptyState';
import SupportedCropsBar from '../components/common/SupportedCropsBar';
import { useToast } from '../context/ToastContext';

const RESULT_TABS = [
  { id: 'info', label: 'Disease Information', icon: FiFileText },
  { id: 'area', label: 'Area Analysis', icon: FiLayers },
  { id: 'severity', label: 'Severity', icon: FiAlertTriangle },
  { id: 'management', label: 'Management', icon: FiShield },
];

const DiseaseDetectionPage = () => {
  const { showToast } = useToast();
  const [files, setFiles] = useState([]);
  const [activeTab, setActiveTab] = useState('info');

  const handleAnalyzeClick = () => {
    if (!files.length) return;
    showToast(
      'Image validated locally. Gemini AI Crop Validation and Disease Detection Agents will be connected in Phase 3.',
      'info'
    );
  };

  return (
    <div className="kv-page-stack">
      <Card>
        <SupportedCropsBar />
      </Card>

      <div className="kv-split-layout">
        <Card
          title="Upload Crop Image"
          subtitle="Select or capture a clear photo of a leaf or plant part."
          icon={FiActivity}
        >
          <ImageUploader
            files={files}
            onFilesChange={setFiles}
            title="Upload Leaf or Crop Image"
            hint="Drag and drop or browse (JPG, JPEG, PNG, WEBP up to 10 MB)"
            primaryActionLabel="Run Disease Detection"
            onPrimaryAction={handleAnalyzeClick}
          />
        </Card>

        <Card
          title="Detection Result"
          subtitle="Structured AI assessment routed through Crop Validation and Disease Detection Agents."
          icon={FiInfo}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Tabs tabs={RESULT_TABS} activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === 'info' && (
              <EmptyState
                icon={FiFileText}
                title="Awaiting Disease Analysis"
                description="Upload a supported crop image and run detection to view crop verification, health status, disease name, confidence, visible symptoms, and explanation."
              />
            )}

            {activeTab === 'area' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <EmptyState
                  icon={FiLayers}
                  title="No Area Analysis Yet"
                  description="Once analyzed, the uploaded image, AI-identified symptom regions, and approximate healthy vs affected percentages will appear here."
                />
                <div className="kv-alert kv-alert-info">
                  <FiInfo size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>
                    Visual area percentages returned after Phase 3 AI analysis are approximate
                    estimates based on visible symptoms, not scientific measurements.
                  </span>
                </div>
              </div>
            )}

            {activeTab === 'severity' && (
              <EmptyState
                icon={FiAlertTriangle}
                title="No Severity Assessment Yet"
                description="Disease severity level and supporting visual evidence will be displayed here when reliably identifiable from the image."
              />
            )}

            {activeTab === 'management' && (
              <EmptyState
                icon={FiShield}
                title="No Management Guidance Yet"
                description="Practical treatment suggestions, management recommendations, and preventive care will appear after disease analysis."
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DiseaseDetectionPage;
