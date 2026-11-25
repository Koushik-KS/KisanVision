import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  FiActivity,
  FiAlertTriangle,
  FiArrowRight,
  FiCheckCircle,
  FiClock,
  FiCloudRain,
  FiCpu,
  FiLayers,
  FiLoader,
  FiSearch,
  FiServer,
} from 'react-icons/fi';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import EmptyState from '../components/common/EmptyState';
import StatCard from '../components/common/StatCard';
import SupportedCropsBar from '../components/common/SupportedCropsBar';
import { useAuth } from '../context/AuthContext';
import { fetchHistory } from '../services/historyService';
import { ROUTES } from '../utils/constants';

const FEATURE_CARDS = [
  {
    title: 'Disease Detection',
    description:
      'Analyze leaf and crop images using specialized validation and disease detection agents.',
    path: ROUTES.DISEASE_DETECTION,
    icon: FiActivity,
    cta: 'Open Disease Detection',
  },
  {
    title: 'Plant Identification',
    description:
      'Identify supported plantation crops with botanical details, traits, and agricultural uses.',
    path: ROUTES.PLANT_IDENTIFICATION,
    icon: FiSearch,
    cta: 'Open Plant Identification',
  },
  {
    title: 'Multi Image Analysis',
    description:
      'Upload up to 5 images at once for individual validation, screening, and batch insights.',
    path: ROUTES.MULTI_IMAGE_ANALYSIS,
    icon: FiLayers,
    cta: 'Open Multi Image Analysis',
  },
  {
    title: 'Weather Prediction',
    description:
      'Retrieve real weather forecasts and weather-aware recommendations for supported crops.',
    path: ROUTES.WEATHER_PREDICTION,
    icon: FiCloudRain,
    cta: 'Open Weather Prediction',
  },
];

const HomePage = () => {
  const { apiHealth } = useOutletContext() || {};
  const { user } = useAuth();
  const isApiOnline = apiHealth?.status === 'online';

  const [stats, setStats] = useState({
    totalAnalyses: 0,
    diseasedDetections: 0,
    healthyDetections: 0,
    plantIdentifications: 0,
  });
  const [recentRecords, setRecentRecords] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  useEffect(() => {
    let active = true;
    fetchHistory({ page: 1, limit: 5 })
      .then((res) => {
        if (!active) return;
        const data = res?.data || {};
        if (data.stats) setStats(data.stats);
        setRecentRecords(data.records || []);
      })
      .catch(() => {
        // Keep real 0 defaults without crashing dashboard if DB/network temporarily fails
      })
      .finally(() => {
        if (active) setLoadingActivity(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="kv-page-stack">
      <section className="kv-hero-banner">
        <span className="kv-hero-badge">
          <FiCpu size={14} />
          <span>Agentic AI Agricultural Platform</span>
        </span>
        <h2 className="kv-hero-title">
          {user?.name ? `Welcome back, ${user.name}` : 'Welcome to KisanVision AI'}
        </h2>
        <p className="kv-hero-desc">
          An Agentic AI-powered agricultural intelligence assistant built for Coffee, Black Pepper,
          Ginger, Cardamom, and Arecanut. Validate crop images, detect diseases, identify plants,
          process multi-image batches, and evaluate real weather risks.
        </p>
      </section>

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
          <SupportedCropsBar label="Strictly Supported Crops" />
          <Badge
            variant={isApiOnline ? 'success' : 'warning'}
            icon={isApiOnline ? FiServer : FiAlertTriangle}
          >
            {isApiOnline ? 'Backend Health: OK' : 'Backend Health: Pending / Offline'}
          </Badge>
        </div>
      </Card>

      <section className="kv-grid-4" aria-label="Core Features">
        {FEATURE_CARDS.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link key={feature.path} to={feature.path} className="kv-feature-card">
              <div className="kv-feature-icon">
                <Icon size={22} />
              </div>
              <h3 className="kv-feature-title">{feature.title}</h3>
              <p className="kv-feature-desc">{feature.description}</p>
              <span className="kv-feature-link">
                <span>{feature.cta}</span>
                <FiArrowRight size={14} />
              </span>
            </Link>
          );
        })}
      </section>

      <section className="kv-grid-4" aria-label="Database Activity Summary">
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
        title="Recent Analyses & Activity"
        subtitle="Latest authenticated user analyses persisted in MongoDB and Cloudinary."
        icon={FiClock}
        action={
          <Link to={ROUTES.HISTORY}>
            <Button variant="secondary" size="sm" icon={FiArrowRight}>
              View History
            </Button>
          </Link>
        }
      >
        {loadingActivity ? (
          <div className="kv-weather-loading">
            <FiLoader size={20} className="kv-spin" color="var(--kv-primary)" />
            <span>Loading recent activity...</span>
          </div>
        ) : recentRecords.length === 0 ? (
          <EmptyState
            icon={FiClock}
            title="No analyses recorded yet"
            description="Your saved Disease Detection, Plant Identification, and Multi Image Analysis records from MongoDB will appear here."
            action={
              <Link to={ROUTES.DISEASE_DETECTION}>
                <Button variant="primary" size="sm" icon={FiActivity}>
                  Go to Disease Detection
                </Button>
              </Link>
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentRecords.map((item) => (
              <Link
                key={`${item.analysisType}-${item.id}`}
                to={ROUTES.HISTORY}
                className="kv-home-recent-row"
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {item.crop} — {item.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--kv-text-secondary)' }}>
                    {item.resultSummary}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge
                    variant={
                      item.status === 'DISEASED'
                        ? 'danger'
                        : item.status === 'HEALTHY' || item.status === 'IDENTIFIED'
                          ? 'success'
                          : 'info'
                    }
                  >
                    {item.status}
                  </Badge>
                  <FiArrowRight size={14} color="var(--kv-text-muted)" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default HomePage;
