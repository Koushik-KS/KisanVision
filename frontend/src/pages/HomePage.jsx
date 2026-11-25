import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  FiActivity,
  FiAlertCircle,
  FiAlertTriangle,
  FiArrowRight,
  FiBarChart2,
  FiCheckCircle,
  FiClock,
  FiCloudRain,
  FiCpu,
  FiLayers,
  FiLoader,
  FiMapPin,
  FiRefreshCw,
  FiSearch,
  FiServer,
  FiTrendingUp,
} from 'react-icons/fi';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import EmptyState from '../components/common/EmptyState';
import StatCard from '../components/common/StatCard';
import SupportedCropsBar from '../components/common/SupportedCropsBar';
import { useAuth } from '../context/AuthContext';
import { fetchAnalyticsOverview } from '../services/analyticsService';
import { fetchCurrentWeather } from '../services/weatherService';
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

const formatDateTime = (isoDate) => {
  if (!isoDate) return 'Unavailable';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return 'Unavailable';
  return parsed.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const HomePage = () => {
  const { apiHealth } = useOutletContext() || {};
  const { user } = useAuth();
  const isApiOnline = apiHealth?.status === 'online';

  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [analyticsError, setAnalyticsError] = useState('');

  const [liveWeather, setLiveWeather] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  const loadDashboardAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    setAnalyticsError('');
    try {
      const res = await fetchAnalyticsOverview({
        days: 30,
        granularity: 'daily',
        recentLimit: 5,
      });
      setAnalytics(res?.data || null);
    } catch (err) {
      setAnalyticsError(err.message || 'Unable to load dashboard analytics.');
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardAnalytics();
  }, [loadDashboardAnalytics]);

  useEffect(() => {
    let active = true;
    const savedLocation = user?.location?.trim();
    if (!savedLocation) {
      setLiveWeather(null);
      return () => {
        active = false;
      };
    }

    setLoadingWeather(true);
    fetchCurrentWeather({ q: savedLocation })
      .then((res) => {
        if (active) setLiveWeather(res?.data || null);
      })
      .catch(() => {
        if (active) setLiveWeather(null);
      })
      .finally(() => {
        if (active) setLoadingWeather(false);
      });

    return () => {
      active = false;
    };
  }, [user?.location]);

  const overview = analytics?.overview || {
    totalAnalyses: 0,
    diseaseDetections: 0,
    plantIdentifications: 0,
    multiImageBatches: 0,
    totalImagesProcessed: 0,
    healthyDetections: 0,
    diseasedDetections: 0,
    uncertainResults: 0,
    rejectedImages: 0,
  };

  const cropAnalytics = analytics?.cropAnalytics || [];
  const hasCropActivity = cropAnalytics.some((c) => c.totalCount > 0);
  const timeline = analytics?.activityAnalytics?.timeline || [];
  const mostFrequentDisease = analytics?.diseaseAnalytics?.mostFrequentDisease || null;
  const diseaseDistribution = analytics?.diseaseAnalytics?.diseaseDistribution || [];
  const recentActivity = analytics?.recentActivity || [];

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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {liveWeather?.current && (
              <Link to={ROUTES.WEATHER_PREDICTION}>
                <Badge variant="info" icon={FiMapPin}>
                  {liveWeather.location?.name}:{' '}
                  {liveWeather.current.temperatureC !== null
                    ? `${liveWeather.current.temperatureC}°C`
                    : 'Live Weather'}
                  {liveWeather.current.condition ? ` (${liveWeather.current.condition})` : ''}
                </Badge>
              </Link>
            )}
            {loadingWeather && user?.location && (
              <Badge variant="neutral">Loading {user.location} weather...</Badge>
            )}
            <Badge
              variant={isApiOnline ? 'success' : 'warning'}
              icon={isApiOnline ? FiServer : FiAlertTriangle}
            >
              {isApiOnline ? 'Backend Health: OK' : 'Backend Health: Pending / Offline'}
            </Badge>
          </div>
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

      {analyticsError && (
        <div
          className="kv-alert kv-alert-danger"
          style={{ justifyContent: 'space-between', alignItems: 'center' }}
          role="alert"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiAlertCircle size={17} />
            <span>{analyticsError}</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={FiRefreshCw}
            onClick={loadDashboardAnalytics}
            loading={loadingAnalytics}
          >
            Retry
          </Button>
        </div>
      )}

      <section className="kv-grid-4" aria-label="Database Activity Summary">
        <StatCard
          label="Total Analyses"
          value={overview.totalAnalyses}
          icon={FiClock}
          tone="green"
        />
        <StatCard
          label="Disease Detections"
          value={overview.diseaseDetections}
          icon={FiActivity}
          tone="red"
        />
        <StatCard
          label="Plant Identifications"
          value={overview.plantIdentifications}
          icon={FiSearch}
          tone="blue"
        />
        <StatCard
          label="Multi Image Batches"
          value={overview.multiImageBatches}
          icon={FiLayers}
          tone="amber"
        />
      </section>

      <Card
        title="Health & Image Processing Breakdown"
        subtitle="Consistent metrics derived from MongoDB records without batch double-counting."
        icon={FiCheckCircle}
        action={
          <Button
            variant="ghost"
            size="sm"
            icon={FiRefreshCw}
            onClick={loadDashboardAnalytics}
            loading={loadingAnalytics}
          >
            Refresh
          </Button>
        }
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Badge variant="info">
            Images Submitted: {overview.totalImagesProcessed}
          </Badge>
          <Badge variant="success">
            Healthy Results: {overview.healthyDetections}
          </Badge>
          <Badge variant="danger">
            Diseased Results: {overview.diseasedDetections}
          </Badge>
          <Badge variant="warning">
            Uncertain: {overview.uncertainResults}
          </Badge>
          <Badge variant="neutral">
            Rejected Batch Images: {overview.rejectedImages}
          </Badge>
          {mostFrequentDisease && (
            <Badge variant="danger" icon={FiAlertTriangle}>
              Top Disease: {mostFrequentDisease.diseaseName} ({mostFrequentDisease.crop},{' '}
              {mostFrequentDisease.count})
            </Badge>
          )}
        </div>
      </Card>

      <div className="kv-grid-2">
        <Card
          title="30-Day Analysis Activity"
          subtitle="Real MongoDB analysis timestamps across single and batch runs."
          icon={FiTrendingUp}
        >
          {loadingAnalytics ? (
            <div className="kv-weather-loading">
              <FiLoader size={20} className="kv-spin" color="var(--kv-primary)" />
              <span>Loading activity timeline...</span>
            </div>
          ) : timeline.length === 0 ? (
            <EmptyState
              icon={FiTrendingUp}
              title="No Activity in the Last 30 Days"
              description="Charts appear automatically once your account has persisted analyses in MongoDB."
            />
          ) : (
            <div style={{ height: 230 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e1e8e3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => String(v).slice(5)}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="totalAnalyses"
                    name="Analyses"
                    stroke="#15803d"
                    fill="#bbf7d0"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card
          title="Supported Crop Activity"
          subtitle="Real analysis counts across Coffee, Black Pepper, Ginger, Cardamom, and Arecanut."
          icon={FiBarChart2}
        >
          {loadingAnalytics ? (
            <div className="kv-weather-loading">
              <FiLoader size={20} className="kv-spin" color="var(--kv-primary)" />
              <span>Loading crop breakdown...</span>
            </div>
          ) : !hasCropActivity ? (
            <EmptyState
              icon={FiBarChart2}
              title="No Crop Activity Recorded Yet"
              description="Run an analysis on any of the 5 supported crops to see per-crop breakdown here."
            />
          ) : (
            <div style={{ height: 230 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cropAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e1e8e3" />
                  <XAxis dataKey="crop" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar
                    dataKey="totalCount"
                    name="Total Records"
                    fill="#15803d"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {diseaseDistribution.length > 0 && (
        <Card
          title="Detected Diseases Breakdown"
          subtitle="Actual diseases observed across your saved Disease Detection and Multi Image records."
          icon={FiAlertTriangle}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {diseaseDistribution.map((item) => (
              <Badge
                key={`${item.crop}-${item.diseaseName}`}
                variant="danger"
                icon={FiAlertTriangle}
              >
                {item.diseaseName} ({item.crop}): {item.count}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      <Card
        title="Recent Analyses & Activity"
        subtitle="Latest authenticated user analyses — click any entry to inspect its full History detail view."
        icon={FiClock}
        action={
          <Link to={ROUTES.HISTORY}>
            <Button variant="secondary" size="sm" icon={FiArrowRight}>
              View All History
            </Button>
          </Link>
        }
      >
        {loadingAnalytics ? (
          <div className="kv-weather-loading">
            <FiLoader size={20} className="kv-spin" color="var(--kv-primary)" />
            <span>Loading recent activity...</span>
          </div>
        ) : recentActivity.length === 0 ? (
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
            {recentActivity.map((item) => (
              <Link
                key={`${item.analysisType}-${item.id}`}
                to={`${ROUTES.HISTORY}?type=${item.analysisType}&id=${item.id}`}
                className="kv-home-recent-row"
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {item.crop} — {item.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--kv-text-secondary)' }}>
                    {formatDateTime(item.createdAt)}
                    {typeof item.confidence === 'number' ? ` • ${item.confidence}% confidence` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge
                    variant={
                      item.status === 'DISEASED'
                        ? 'danger'
                        : item.status === 'HEALTHY' ||
                            item.status === 'IDENTIFIED' ||
                            item.status === 'COMPLETED'
                          ? 'success'
                          : 'warning'
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
