import { useState } from 'react';
import { FiBookOpen, FiInfo, FiList, FiSearch } from 'react-icons/fi';
import Card from '../components/common/Card';
import ImageUploader from '../components/common/ImageUploader';
import Tabs from '../components/common/Tabs';
import EmptyState from '../components/common/EmptyState';
import SupportedCropsBar from '../components/common/SupportedCropsBar';
import { useToast } from '../context/ToastContext';

const PLANT_TABS = [
  { id: 'info', label: 'Plant Information', icon: FiInfo },
  { id: 'details', label: 'Key Details', icon: FiList },
  { id: 'uses', label: 'Uses & Importance', icon: FiBookOpen },
];

const PlantIdentificationPage = () => {
  const { showToast } = useToast();
  const [files, setFiles] = useState([]);
  const [activeTab, setActiveTab] = useState('info');

  const handleIdentifyClick = () => {
    if (!files.length) return;
    showToast(
      'Image validated locally. Gemini AI Plant Identification Agent will be connected in Phase 4.',
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
          title="Upload Plant Image"
          subtitle="Identify whether the image belongs to one of the five supported crops."
          icon={FiSearch}
        >
          <ImageUploader
            files={files}
            onFilesChange={setFiles}
            title="Upload Plant or Leaf Image"
            hint="Drag and drop or browse (JPG, JPEG, PNG, WEBP up to 10 MB)"
            primaryActionLabel="Identify Plant"
            onPrimaryAction={handleIdentifyClick}
          />
        </Card>

        <Card
          title="Identification Result"
          subtitle="Common name, scientific name, identifying features, and agricultural overview."
          icon={FiInfo}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Tabs tabs={PLANT_TABS} activeTab={activeTab} onChange={setActiveTab} />

            {activeTab === 'info' && (
              <EmptyState
                icon={FiInfo}
                title="Awaiting Plant Identification"
                description="Upload an image of Coffee, Black Pepper, Ginger, Cardamom, or Arecanut to view common name, scientific name, confidence, and botanical description."
              />
            )}

            {activeTab === 'details' && (
              <EmptyState
                icon={FiList}
                title="No Key Details Yet"
                description="Identifying visual characteristics and suitable growing information will appear here after identification."
              />
            )}

            {activeTab === 'uses' && (
              <EmptyState
                icon={FiBookOpen}
                title="No Uses & Importance Yet"
                description="Agricultural uses, economic importance, and cultivation context will be shown here once analyzed."
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PlantIdentificationPage;
