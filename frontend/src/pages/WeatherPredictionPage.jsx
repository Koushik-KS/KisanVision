import { useState } from 'react';
import {
  FiAlertCircle,
  FiCalendar,
  FiCloudRain,
  FiDroplet,
  FiMapPin,
  FiNavigation,
  FiSearch,
  FiSun,
} from 'react-icons/fi';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import Badge from '../components/common/Badge';
import { SUPPORTED_CROPS } from '../utils/constants';
import { useToast } from '../context/ToastContext';

const WeatherPredictionPage = () => {
  const { showToast } = useToast();
  const [locationQuery, setLocationQuery] = useState('');
  const [coordinates, setCoordinates] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [locating, setLocating] = useState(false);

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (!locationQuery.trim()) {
      setLocationError('Please enter a city, town, or district name.');
      return;
    }
    setLocationError('');
    showToast(
      `Location "${locationQuery.trim()}" ready. Live weather API and Weather Intelligence Agent will be connected in Phase 6.`,
      'info'
    );
  };

  const handleUseMyLocation = () => {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Browser geolocation is not supported on this device.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const coords = {
          latitude: Number(position.coords.latitude.toFixed(4)),
          longitude: Number(position.coords.longitude.toFixed(4)),
        };
        setCoordinates(coords);
        showToast(
          `Coordinates captured (${coords.latitude}, ${coords.longitude}). Live weather lookup will connect in Phase 6.`,
          'info'
        );
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError('Location permission was denied. You can enter a location manually instead.');
        } else {
          setLocationError('Unable to retrieve your current location. Please try manual search.');
        }
      },
      { timeout: 10000 }
    );
  };

  return (
    <div className="kv-page-stack">
      <Card
        title="Location & Weather Input"
        subtitle="Use GPS coordinates or search manually for real weather conditions and 5-day forecast."
        icon={FiMapPin}
      >
        <form onSubmit={handleManualSearch} className="kv-weather-controls">
          <div className="kv-input-icon-wrap kv-weather-search">
            <FiSearch size={16} className="kv-input-icon" />
            <input
              type="text"
              className="kv-input kv-input-with-icon"
              placeholder="Enter location (e.g., Madikeri, Kodagu, Karnataka)"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              aria-label="Search location"
            />
          </div>
          <Button type="submit" variant="primary" icon={FiSearch}>
            Get Weather Data
          </Button>
          <Button
            type="button"
            variant="secondary"
            icon={FiNavigation}
            loading={locating}
            onClick={handleUseMyLocation}
          >
            Use My Location
          </Button>
        </form>

        {coordinates && (
          <div style={{ marginTop: 12 }}>
            <Badge variant="info" icon={FiMapPin}>
              Captured Coordinates: {coordinates.latitude}, {coordinates.longitude}
            </Badge>
          </div>
        )}

        {locationError && (
          <div className="kv-alert kv-alert-warning" style={{ marginTop: 12 }} role="alert">
            <FiAlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{locationError}</span>
          </div>
        )}
      </Card>

      <div className="kv-grid-2">
        <Card
          title="Current Weather"
          subtitle="Live temperature, humidity, wind, rainfall, and pressure from weather API."
          icon={FiSun}
        >
          <EmptyState
            icon={FiCloudRain}
            title="No Weather Data Loaded"
            description="Enter a location or select Use My Location once the live weather integration is activated in Phase 6."
          />
        </Card>

        <Card
          title="5-Day Weather Forecast"
          subtitle="Daily temperature range, weather condition, and rain probability."
          icon={FiCalendar}
        >
          <EmptyState
            icon={FiCalendar}
            title="Forecast Unavailable Until Location Lookup"
            description="Real 5-day forecast data will populate here without any hardcoded or synthetic weather values."
          />
        </Card>
      </div>

      <div className="kv-grid-2">
        <Card
          title="Weather-Based Crop Recommendations"
          subtitle="Agronomic suitability for the 5 strictly supported crops derived from real weather values."
          icon={FiCloudRain}
        >
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
        </Card>

        <Card
          title="Soil & Water Insights"
          subtitle="Irrigation and moisture guidance derived from retrieved weather data (not physical soil sensors)."
          icon={FiDroplet}
        >
          <EmptyState
            icon={FiDroplet}
            title="Awaiting Weather-Based Insights"
            description="Rainfall impact, drainage precautions, irrigation considerations, and practical farmer advice will be generated by the Weather Intelligence Agent in Phase 6."
          />
        </Card>
      </div>
    </div>
  );
};

export default WeatherPredictionPage;
