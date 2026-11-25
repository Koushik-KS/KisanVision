import { useState } from 'react';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiEye,
  FiSearch,
} from 'react-icons/fi';
import Card from '../components/common/Card';
import StatCard from '../components/common/StatCard';
import EmptyState from '../components/common/EmptyState';
import { SUPPORTED_CROPS } from '../utils/constants';

const HistoryPage = () => {
  const [search, setSearch] = useState('');
  const [analysisType, setAnalysisType] = useState('all');
  const [cropFilter, setCropFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  return (
    <div className="kv-page-stack">
      <section className="kv-grid-4" aria-label="History Summary">
        <StatCard label="Total Analyses" value={0} icon={FiClock} tone="green" />
        <StatCard label="Diseased Detections" value={0} icon={FiAlertTriangle} tone="red" />
        <StatCard label="Healthy Detections" value={0} icon={FiCheckCircle} tone="green" />
        <StatCard label="Plant Identifications" value={0} icon={FiSearch} tone="blue" />
      </section>

      <Card
        title="Filter Analysis Records"
        subtitle="Search and filter persisted MongoDB analyses by type, crop, status, and date."
        icon={FiSearch}
      >
        <div className="kv-filter-bar">
          <div className="kv-input-icon-wrap">
            <FiSearch size={15} className="kv-input-icon" />
            <input
              type="text"
              className="kv-input kv-input-with-icon"
              placeholder="Search by crop or disease..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search history"
            />
          </div>

          <select
            className="kv-select"
            value={analysisType}
            onChange={(e) => setAnalysisType(e.target.value)}
            aria-label="Filter by analysis type"
          >
            <option value="all">All Analysis Types</option>
            <option value="disease">Disease Detection</option>
            <option value="plant">Plant Identification</option>
            <option value="multi">Multi Image Analysis</option>
          </select>

          <select
            className="kv-select"
            value={cropFilter}
            onChange={(e) => setCropFilter(e.target.value)}
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
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by result status"
          >
            <option value="all">All Results</option>
            <option value="healthy">Healthy</option>
            <option value="diseased">Diseased</option>
            <option value="identified">Identified</option>
          </select>

          <input
            type="date"
            className="kv-input"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            aria-label="Filter by date"
          />
        </div>
      </Card>

      <div className="kv-split-layout" style={{ gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, 1fr)' }}>
        <Card
          title="Analysis History"
          subtitle="Authenticated user records with permanent delete support."
          icon={FiClock}
        >
          <div className="kv-table-wrap" style={{ marginBottom: 14 }}>
            <table className="kv-table">
              <thead>
                <tr>
                  <th>Preview</th>
                  <th>Analysis Type</th>
                  <th>Crop</th>
                  <th>Result</th>
                  <th>Confidence</th>
                  <th>Date & Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--kv-text-muted)', padding: '24px 12px' }}>
                    No records found. Persisted analyses will appear here once Phase 2–7 backend persistence is connected.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card
          title="Analysis Details"
          subtitle="Select a record to inspect original image, annotated regions, and AI guidance."
          icon={FiEye}
        >
          <EmptyState
            icon={FiEye}
            title="No Record Selected"
            description="When you have saved analyses, clicking any row will show full details and allow permanent deletion from MongoDB and Cloudinary."
          />
        </Card>
      </div>
    </div>
  );
};

export default HistoryPage;
