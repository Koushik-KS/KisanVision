import { useState } from 'react';
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiCalendar,
  FiCheckCircle,
  FiCloud,
  FiCloudDrizzle,
  FiCloudRain,
  FiCompass,
  FiDroplet,
  FiInfo,
  FiLoader,
  FiMapPin,
  FiNavigation,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiSun,
  FiThermometer,
  FiWind,
  FiZap,
} from 'react-icons/fi';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import EmptyState from '../components/common/EmptyState';
import { useToast } from '../context/ToastContext';
import {
  fetchWeatherIntelligence,
  searchWeatherLocations,
} from '../services/weatherService';
import { SUPPORTED_CROPS } from '../utils/constants';

const formatMetric = (value, unit = '') => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return 'Unavailable';
  }
  return `${value}${unit ? ` ${unit}` : ''}`;
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return { weekday: 'Day', label: 'Unavailable' };
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return { weekday: 'Day', label: dateStr };
  }
  return {
    weekday: parsed.toLocaleDateString('en-IN', { weekday: 'short' }),
    label: parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  };
};

const formatTimestamp = (value) => {
  if (!value) return 'Unavailable';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const getWeatherConditionIcon = (condition) => {
  const lower = String(condition || '').toLowerCase();
  if (lower.includes('thunder') || lower.includes('storm')) return FiZap;
  if (lower.includes('heavy rain') || lower.includes('rain') || lower.includes('shower')) {
    return FiCloudRain;
  }
  if (lower.includes('drizzle')) return FiCloudDrizzle;
  if (lower.includes('cloud') || lower.includes('overcast') || lower.includes('fog')) {
    return FiCloud;
  }
  return FiSun;
};

const getSuitabilityBadgeVariant = (category) => {
  if (category === 'Highly Suitable') return 'success';
  if (category === 'Suitable') return 'info';
  if (category === 'Moderate') return 'warning';
  return 'danger';
};

const getRiskAlertStyle = (level) => {
  if (level === 'high') return { alertClass: 'kv-alert-danger', badgeVariant: 'danger' };
  if (level === 'moderate') return { alertClass: 'kv-alert-warning', badgeVariant: 'warning' };
  return { alertClass: 'kv-alert-info', badgeVariant: 'success' };
};

const WeatherPredictionPage = () => {
  const { showToast } = useToast();

  const [locationQuery, setLocationQuery] = useState('');
  const [matchingLocations, setMatchingLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [weatherBundle, setWeatherBundle] = useState(null);

  const [searchingLocations, setSearchingLocations] = useState(false);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);

  const [locationError, setLocationError] = useState('');
  const [weatherError, setWeatherError] = useState('');
  const [lastRequestParams, setLastRequestParams] = useState(null);

  const loadIntelligenceForParams = async (params, toastTitle) => {
    setWeatherError('');
    setLoadingWeather(true);
    setLastRequestParams(params);

    try {
      const res = await fetchWeatherIntelligence(params);
      const data = res?.data;
      setWeatherBundle(data || null);
      if (data?.location) {
        setSelectedLocation(data.location);
      }
      if (toastTitle) {
        showToast(toastTitle, 'success');
      }
    } catch (err) {
      setWeatherError(err.message || 'Unable to retrieve live weather data.');
      showToast(err.message || 'Weather lookup failed.', 'error');
    } finally {
      setLoadingWeather(false);
    }
  };

  const handleSelectMatchedLocation = async (loc) => {
    setSelectedLocation(loc);
    await loadIntelligenceForParams(
      {
        lat: loc.latitude,
        lon: loc.longitude,
        name: loc.name,
        district: loc.district || undefined,
        state: loc.state || undefined,
        country: loc.country || undefined,
        displayName: loc.displayName,
      },
      `Weather loaded for ${loc.displayName}`
    );
  };

  const handleManualSearch = async (e) => {
    e.preventDefault();
    const cleaned = locationQuery.trim();
    if (cleaned.length < 2) {
      setLocationError('Please enter at least 2 characters (city, town, or district).');
      return;
    }

    setLocationError('');
    setWeatherError('');
    setSearchingLocations(true);

    try {
      const geoRes = await searchWeatherLocations(cleaned, 5);
      const matches = geoRes?.data?.locations || [];
      setMatchingLocations(matches);

      if (matches.length === 0) {
        setWeatherBundle(null);
        setSelectedLocation(null);
        setLocationError(
          `No matching locations found for "${cleaned}". Check spelling or try a nearby town/district.`
        );
        return;
      }

      const topMatch = matches[0];
      setSelectedLocation(topMatch);
      await loadIntelligenceForParams(
        {
          lat: topMatch.latitude,
          lon: topMatch.longitude,
          name: topMatch.name,
          district: topMatch.district || undefined,
          state: topMatch.state || undefined,
          country: topMatch.country || undefined,
          displayName: topMatch.displayName,
        },
        matches.length === 1
          ? `Weather loaded for ${topMatch.displayName}`
          : `Showing ${topMatch.displayName} (${matches.length} matching locations found)`
      );
    } catch (err) {
      setLocationError(err.message || 'Location search failed. Please retry.');
      showToast(err.message || 'Location search failed.', 'error');
    } finally {
      setSearchingLocations(false);
    }
  };

  const handleUseMyLocation = () => {
    setLocationError('');
    setWeatherError('');

    if (!navigator.geolocation) {
      setLocationError('Browser geolocation is not supported on this device. Use manual search instead.');
      return;
    }

    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setLocatingGps(false);
        const lat = Number(position.coords.latitude.toFixed(4));
        const lon = Number(position.coords.longitude.toFixed(4));
        setMatchingLocations([]);

        await loadIntelligenceForParams(
          { lat, lon },
          `Live weather retrieved for your GPS location (${lat}, ${lon})`
        );
      },
      (err) => {
        setLocatingGps(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError(
            'Location permission was denied. You can search your city or district manually instead.'
          );
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocationError(
            'GPS position is currently unavailable on this device. Please use manual search.'
          );
        } else if (err.code === err.TIMEOUT) {
          setLocationError(
            'Location request timed out. Please retry GPS lookup or search manually.'
          );
        } else {
          setLocationError('Unable to retrieve your current location. Try manual search.');
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleRetry = () => {
    if (lastRequestParams) {
      loadIntelligenceForParams(lastRequestParams, 'Weather data refreshed.');
    }
  };

  const current = weatherBundle?.current || null;
  const forecast = weatherBundle?.forecast || [];
  const activeLocation = weatherBundle?.location || selectedLocation;
  const intelligence = weatherBundle?.intelligence || null;
  const cropRecommendations = intelligence?.cropRecommendations || [];
  const weatherInsights = intelligence?.weatherInsights || null;

  const CurrentIcon = getWeatherConditionIcon(current?.condition);

  return (
    <div className="kv-page-stack">
      <Card
        title="Location & Weather Input"
        subtitle="Use browser GPS (explicit permission) or search manually for live meteorological data and 5-day crop intelligence."
        icon={FiMapPin}
      >
        <form onSubmit={handleManualSearch} className="kv-weather-controls">
          <div className="kv-input-icon-wrap kv-weather-search">
            <FiSearch size={16} className="kv-input-icon" />
            <input
              type="text"
              className="kv-input kv-input-with-icon"
              placeholder="Enter city, town, or district (e.g., Madikeri, Chikmagalur, Wayanad)"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              aria-label="Search location"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            icon={FiSearch}
            loading={searchingLocations || (loadingWeather && !locatingGps)}
          >
            Get Weather Data
          </Button>
          <Button
            type="button"
            variant="secondary"
            icon={FiNavigation}
            loading={locatingGps}
            onClick={handleUseMyLocation}
          >
            Use My Location
          </Button>
        </form>

        {matchingLocations.length > 1 && (
          <div className="kv-weather-matches">
            <span className="kv-weather-matches-label">
              Matching locations ({matchingLocations.length}):
            </span>
            <div className="kv-weather-match-chips">
              {matchingLocations.map((loc) => {
                const isSelected =
                  selectedLocation &&
                  selectedLocation.latitude === loc.latitude &&
                  selectedLocation.longitude === loc.longitude;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    className={`kv-weather-match-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => handleSelectMatchedLocation(loc)}
                    disabled={loadingWeather}
                  >
                    <FiMapPin size={13} />
                    <span>{loc.displayName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeLocation && (
          <div className="kv-weather-location-meta">
            <Badge variant="success" icon={FiMapPin}>
              {activeLocation.displayName}
            </Badge>
            <Badge variant="info" icon={FiCompass}>
              {activeLocation.latitude}, {activeLocation.longitude}
            </Badge>
            {activeLocation.elevationMeters !== null &&
              activeLocation.elevationMeters !== undefined && (
                <Badge variant="neutral">Elevation: {activeLocation.elevationMeters} m</Badge>
              )}
            {weatherBundle?.provider && (
              <Badge variant="neutral">Source: {weatherBundle.provider}</Badge>
            )}
          </div>
        )}

        {locationError && (
          <div className="kv-alert kv-alert-warning" style={{ marginTop: 12 }} role="alert">
            <FiAlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{locationError}</span>
          </div>
        )}

        {weatherError && (
          <div
            className="kv-alert kv-alert-danger"
            style={{ marginTop: 12, justifyContent: 'space-between', alignItems: 'center' }}
            role="alert"
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <FiAlertTriangle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{weatherError}</span>
            </div>
            {lastRequestParams && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={FiRefreshCw}
                onClick={handleRetry}
                loading={loadingWeather}
              >
                Retry
              </Button>
            )}
          </div>
        )}
      </Card>

      {loadingWeather && (
        <Card>
          <div className="kv-weather-loading">
            <FiLoader size={24} className="kv-spin" color="var(--kv-primary)" />
            <div>
              <strong>Fetching real-time weather & running Weather Intelligence Agent...</strong>
              <p>Retrieving live conditions, 5-day forecast, and agronomic suitability scores.</p>
            </div>
          </div>
        </Card>
      )}

      <div className="kv-grid-2">
        <Card
          title="Current Weather"
          subtitle="Live temperature, humidity, wind, rainfall, and pressure from the weather provider."
          icon={FiSun}
          action={
            weatherBundle?.fetchedAt ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={FiRefreshCw}
                onClick={handleRetry}
                loading={loadingWeather}
              >
                Refresh
              </Button>
            ) : null
          }
        >
          {!current ? (
            <EmptyState
              icon={FiCloudRain}
              title="No Weather Data Loaded"
              description="Search a city/district or click Use My Location to fetch live meteorological conditions."
            />
          ) : (
            <div className="kv-weather-current-wrap">
              <div className="kv-weather-hero-row">
                <div className="kv-weather-temp-block">
                  <span className="kv-weather-icon-box">
                    <CurrentIcon size={28} />
                  </span>
                  <div>
                    <div className="kv-weather-main-temp">
                      {formatMetric(current.temperatureC, '°C')}
                    </div>
                    <div className="kv-weather-cond-label">
                      {current.condition || 'Current Observation'}
                      {current.description ? ` — ${current.description}` : ''}
                    </div>
                  </div>
                </div>
                <div className="kv-weather-obs-time">
                  Observed: {formatTimestamp(current.observedAt || weatherBundle?.fetchedAt)}
                </div>
              </div>

              <div className="kv-weather-metrics-grid">
                <div className="kv-weather-metric-tile">
                  <span className="kv-weather-metric-label">
                    <FiThermometer size={14} /> Feels Like
                  </span>
                  <strong className="kv-weather-metric-val">
                    {formatMetric(current.feelsLikeC, '°C')}
                  </strong>
                </div>

                <div className="kv-weather-metric-tile">
                  <span className="kv-weather-metric-label">
                    <FiDroplet size={14} /> Humidity
                  </span>
                  <strong className="kv-weather-metric-val">
                    {formatMetric(current.humidityPercent, '%')}
                  </strong>
                </div>

                <div className="kv-weather-metric-tile">
                  <span className="kv-weather-metric-label">
                    <FiWind size={14} /> Wind Speed
                  </span>
                  <strong className="kv-weather-metric-val">
                    {formatMetric(current.windSpeedKmh, 'km/h')}
                  </strong>
                </div>

                <div className="kv-weather-metric-tile">
                  <span className="kv-weather-metric-label">
                    <FiCloudRain size={14} /> Current Rain
                  </span>
                  <strong className="kv-weather-metric-val">
                    {formatMetric(current.rainfallMm, 'mm')}
                  </strong>
                </div>

                <div className="kv-weather-metric-tile">
                  <span className="kv-weather-metric-label">
                    <FiCompass size={14} /> Pressure
                  </span>
                  <strong className="kv-weather-metric-val">
                    {formatMetric(current.pressureHpa, 'hPa')}
                  </strong>
                </div>

                <div className="kv-weather-metric-tile">
                  <span className="kv-weather-metric-label">
                    <FiCloud size={14} /> Cloud Cover
                  </span>
                  <strong className="kv-weather-metric-val">
                    {formatMetric(current.cloudCoverPercent, '%')}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card
          title="5-Day Weather Forecast"
          subtitle="Daily temperature range, weather condition, rain probability, and expected rainfall."
          icon={FiCalendar}
        >
          {forecast.length === 0 ? (
            <EmptyState
              icon={FiCalendar}
              title="Forecast Unavailable Until Location Lookup"
              description="Real 5-day daily forecast data will populate here once a valid location is selected."
            />
          ) : (
            <div className="kv-forecast-list">
              {forecast.map((day) => {
                const { weekday, label } = formatDateShort(day.date);
                const DayIcon = getWeatherConditionIcon(day.condition);
                return (
                  <div key={day.date} className="kv-forecast-row">
                    <div className="kv-forecast-day">
                      <strong>{weekday}</strong>
                      <span>{label}</span>
                    </div>

                    <div className="kv-forecast-cond">
                      <DayIcon size={18} color="var(--kv-primary)" />
                      <span>{day.condition || 'Forecast'}</span>
                    </div>

                    <div className="kv-forecast-rain">
                      <span>
                        Rain:{' '}
                        {day.rainProbabilityPercent !== null &&
                        day.rainProbabilityPercent !== undefined
                          ? `${day.rainProbabilityPercent}%`
                          : 'N/A'}
                      </span>
                      <span className="kv-forecast-rain-mm">
                        {day.rainfallMm !== null && day.rainfallMm !== undefined
                          ? `${day.rainfallMm} mm`
                          : 'Rainfall N/A'}
                      </span>
                    </div>

                    <div className="kv-forecast-temps">
                      <span className="kv-temp-max">
                        {formatMetric(day.tempMaxC, '°C')}
                      </span>
                      <span className="kv-temp-sep">/</span>
                      <span className="kv-temp-min">
                        {formatMetric(day.tempMinC, '°C')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card
        title="Soil & Water Weather Insights"
        subtitle="Moisture, drainage, pest-weather risk, and fieldwork guidance derived strictly from retrieved weather."
        icon={FiDroplet}
      >
        {!weatherInsights ? (
          <EmptyState
            icon={FiDroplet}
            title="Awaiting Weather-Based Insights"
            description="Rainfall impact, drainage precautions, irrigation considerations, and risk alerts will appear once weather data is loaded."
          />
        ) : (
          <div className="kv-page-stack" style={{ gap: 14 }}>
            <div className="kv-alert kv-alert-info">
              <FiInfo size={17} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{weatherInsights.suitabilityScopeNotice}</span>
            </div>

            <p style={{ fontSize: 14, color: 'var(--kv-text)' }}>{weatherInsights.summary}</p>

            <div className="kv-grid-2">
              <div className="kv-weather-insight-box">
                <h4>
                  <FiDroplet size={15} color="var(--kv-primary)" /> Weather-Derived Moisture Estimate
                </h4>
                <p>{weatherInsights.moistureAndSoilSummary}</p>
              </div>

              <div className="kv-weather-insight-box">
                <h4>
                  <FiCloudRain size={15} color="var(--kv-primary)" /> Drainage & Irrigation Outlook
                </h4>
                <p>{weatherInsights.drainageAndIrrigationOutlook}</p>
              </div>

              <div className="kv-weather-insight-box">
                <h4>
                  <FiShield size={15} color="var(--kv-primary)" /> Pest & Disease Weather Risk
                </h4>
                <p>{weatherInsights.pestAndDiseaseWeatherRisk}</p>
              </div>

              <div className="kv-weather-insight-box">
                <h4>
                  <FiCalendar size={15} color="var(--kv-primary)" /> Fieldwork & Spraying Advisory
                </h4>
                <p>{weatherInsights.fieldworkAdvisory}</p>
              </div>
            </div>

            {Array.isArray(weatherInsights.riskAlerts) && weatherInsights.riskAlerts.length > 0 && (
              <div className="kv-weather-risks-stack">
                {weatherInsights.riskAlerts.map((alert, idx) => {
                  const style = getRiskAlertStyle(alert.level);
                  return (
                    <div key={`${alert.title}-${idx}`} className={`kv-alert ${style.alertClass}`}>
                      <FiAlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <strong>{alert.title}</strong>
                          <Badge variant={style.badgeVariant}>{alert.level.toUpperCase()}</Badge>
                        </div>
                        <p style={{ marginTop: 3 }}>{alert.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card
        title="Weather-Based Crop Recommendations"
        subtitle="Transparent weather suitability across only KisanVision AI's 5 supported crops."
        icon={FiCheckCircle}
        action={<Badge variant="info">{SUPPORTED_CROPS.length} Supported Crops Only</Badge>}
      >
        {cropRecommendations.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SUPPORTED_CROPS.map((crop) => (
              <div
                key={crop}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  border: '1px solid var(--kv-border)',
                  borderRadius: 'var(--kv-radius-sm)',
                  backgroundColor: 'var(--kv-surface-subtle)',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 14 }}>{crop}</span>
                <Badge variant="neutral">Awaiting Weather Data</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="kv-crop-rec-grid">
            {cropRecommendations.map((rec) => {
              const badgeVariant = getSuitabilityBadgeVariant(rec.suitabilityCategory);
              return (
                <div key={rec.crop} className="kv-crop-rec-card">
                  <div className="kv-crop-rec-header">
                    <div>
                      <h3 className="kv-crop-rec-title">{rec.crop}</h3>
                      <span className="kv-crop-rec-sci">{rec.scientificName}</span>
                    </div>
                    <div className="kv-crop-rec-score-wrap">
                      <Badge variant={badgeVariant}>{rec.suitabilityCategory}</Badge>
                      <span className="kv-crop-rec-score">{rec.suitabilityScore} / 100</span>
                    </div>
                  </div>

                  <div className="kv-score-bar-track" aria-label={`${rec.crop} suitability score`}>
                    <div
                      className={`kv-score-bar-fill kv-score-${badgeVariant}`}
                      style={{ width: `${rec.suitabilityScore}%` }}
                    />
                  </div>

                  {rec.missingMetrics?.length > 0 && (
                    <div className="kv-alert kv-alert-warning" style={{ padding: '8px 10px', fontSize: 12 }}>
                      <FiInfo size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>
                        Unavailable provider metrics excluded from score:{' '}
                        {rec.missingMetrics.join(', ')}
                      </span>
                    </div>
                  )}

                  <div className="kv-crop-rec-section">
                    <h5>Why This Score</h5>
                    <ul>
                      {rec.reasons.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="kv-crop-rec-section">
                    <h5>Weather Risks</h5>
                    <ul>
                      {rec.weatherRisks.map((risk, idx) => (
                        <li key={idx}>{risk}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="kv-crop-rec-section">
                    <h5>Actionable Guidance</h5>
                    <ul>
                      {rec.recommendations.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="kv-crop-irrigation-note">
                    <FiDroplet size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
                      <strong>Irrigation & Water:</strong> {rec.irrigationGuidance}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default WeatherPredictionPage;
