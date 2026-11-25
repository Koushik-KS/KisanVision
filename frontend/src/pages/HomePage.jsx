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
  FiSearch,
  FiServer,
} from 'react-icons/fi';
import Card from '../components/common/Card';
import StatCard from '../components/common/StatCard';
import EmptyState from '../components/common/EmptyState';
import SupportedCropsBar from '../components/common/SupportedCropsBar';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
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
  const isApiOnline = apiHealth?.status === 'online';

  return (
    <div className="kv-page-stack">
      <section className="kv-hero-banner">
        <span className="kv-hero-badge">
          <FiCpu size={14} />
          <span>Agentic AI Agricultural Platform</span>
        </span>
        <h2 className="kv-hero-title">Welcome to KisanVision AI</h2>
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
        <StatCard label="Total Analyses" value={0} icon={FiClock} tone="green" />
        <StatCard label="Diseased Detections" value={0} icon={FiAlertTriangle} tone="red" />
        <StatCard label="Healthy Detections" value={0} icon={FiCheckCircle} tone="green" />
        <StatCard label="Plant Identifications" value={0} icon={FiSearch} tone="blue" />
      </section>

      <Card
        title="Recent Analyses & Activity"
        subtitle="Real authenticated user records will appear here once database persistence is enabled."
        icon={FiClock}
        action={
          <Link to={ROUTES.HISTORY}>
            <Button variant="secondary" size="sm" icon={FiArrowRight}>
              View History
            </Button>
          </Link>
        }
      >
        <EmptyState
          icon={FiClock}
          title="No analyses recorded yet"
          description="Your saved Disease Detection, Plant Identification, and Multi Image Analysis records from MongoDB will appear here after authentication and AI endpoints are connected."
          action={
            <Link to={ROUTES.DISEASE_DETECTION}>
              <Button variant="primary" size="sm" icon={FiActivity}>
                Go to Disease Detection
              </Button>
            </Link>
          }
        />
      </Card>
    </div>
  );
};

export default HomePage;
