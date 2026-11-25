import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiActivity,
  FiAlertCircle,
  FiAlertTriangle,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiChevronRight,
  FiClock,
  FiEdit2,
  FiEye,
  FiEyeOff,
  FiGlobe,
  FiLoader,
  FiLock,
  FiMail,
  FiMapPin,
  FiPhone,
  FiPieChart,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiUser,
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
import EmptyState from '../components/common/EmptyState';
import StatCard from '../components/common/StatCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchProfileAnalyticsSummary } from '../services/analyticsService';
import { ROUTES } from '../utils/constants';

const SETTINGS_SECTIONS = [
  { id: 'profile', label: 'My Profile', icon: FiUser },
  { id: 'activities', label: 'My Activities', icon: FiActivity },
  { id: 'password', label: 'Change Password', icon: FiLock },
  { id: 'language', label: 'Language', icon: FiGlobe },
];

const HEALTH_COLORS = {
  Healthy: '#16a34a',
  Diseased: '#dc2626',
  Uncertain: '#d97706',
};

const formatJoinDate = (isoDate) => {
  if (!isoDate) return 'Unavailable';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return 'Unavailable';
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateTime = (isoDate) => {
  if (!isoDate) return 'Unavailable';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return 'Unavailable';
  return parsed.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const ProfilePage = () => {
  const { showToast } = useToast();
  const { user, updateProfile, changePassword } = useAuth();
  const [activeSection, setActiveSection] = useState('profile');
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  // Edit profile state
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [location, setLocation] = useState(user?.location || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Real user analytics & activity state
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [analyticsError, setAnalyticsError] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setLocation(user.location || '');
      setAvatar(user.avatar || '');
      setAvatarLoadFailed(false);
    }
  }, [user]);

  const loadAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    setAnalyticsError('');
    try {
      const res = await fetchProfileAnalyticsSummary();
      setAnalytics(res?.data || null);
    } catch (err) {
      setAnalyticsError(err.message || 'Unable to load activity analytics.');
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileError('');

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedLocation = location.trim();
    const trimmedAvatar = avatar.trim();

    if (trimmedName.length < 2) {
      setProfileError('Name must be at least 2 characters.');
      return;
    }

    if (trimmedPhone && !/^[+\d\s()-]{6,20}$/.test(trimmedPhone)) {
      setProfileError('Please enter a valid phone number (6–20 characters) or leave it blank.');
      return;
    }

    if (trimmedLocation.length > 120) {
      setProfileError('Location cannot exceed 120 characters.');
      return;
    }

    if (trimmedAvatar) {
      try {
        const parsed = new URL(trimmedAvatar);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          setProfileError('Avatar URL must use http or https.');
          return;
        }
      } catch {
        setProfileError('Please enter a valid avatar URL or leave it blank.');
        return;
      }
    }

    setSavingProfile(true);
    try {
      await updateProfile({
        name: trimmedName,
        phone: trimmedPhone,
        location: trimmedLocation,
        avatar: trimmedAvatar,
      });
      setAvatarLoadFailed(false);
      showToast('Profile updated successfully.', 'success');
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError('All password fields are required.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from your current password.');
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword({
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      showToast('Password updated successfully.', 'success');
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

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

  const healthChartData = (analytics?.diseaseAnalytics?.healthDistribution || []).filter(
    (entry) => entry.count > 0
  );
  const cropAnalytics = analytics?.cropAnalytics || [];
  const hasCropData = cropAnalytics.some((entry) => entry.totalCount > 0);
  const recentActivity = analytics?.recentActivity || [];

  return (
    <div className="kv-page-stack">
      <div className="kv-split-layout">
        <div className="kv-page-stack">
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {user?.avatar && !avatarLoadFailed ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="kv-profile-avatar-img"
                    onError={() => setAvatarLoadFailed(true)}
                  />
                ) : (
                  <div className="kv-profile-avatar">
                    <FiUser size={28} />
                  </div>
                )}
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700 }}>{user?.name || 'User'}</h2>
                  <p style={{ fontSize: 13, color: 'var(--kv-text-muted)' }}>
                    Authenticated Account
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={FiEdit2}
                onClick={() => setActiveSection('profile')}
              >
                Edit
              </Button>
            </div>

            <div
              style={{
                marginTop: 18,
                paddingTop: 14,
                borderTop: '1px solid var(--kv-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                fontSize: 13,
                color: 'var(--kv-text-secondary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <FiMail size={14} /> Email
                </span>
                <span style={{ color: 'var(--kv-text)', fontWeight: 500 }}>{user?.email}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <FiPhone size={14} /> Phone
                </span>
                <span>{user?.phone || 'Not provided'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <FiMapPin size={14} /> Location
                </span>
                <span>{user?.location || 'Not provided'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <FiCalendar size={14} /> Joined on
                </span>
                <span>{formatJoinDate(user?.createdAt)}</span>
              </div>
            </div>

            <div className="kv-settings-list">
              {SETTINGS_SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    className={`kv-settings-item ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveSection(section.id)}
                  >
                    <span className="kv-settings-left">
                      <Icon size={16} />
                      <span>{section.label}</span>
                    </span>
                    <FiChevronRight size={16} />
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="kv-page-stack">
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
                onClick={loadAnalytics}
                loading={loadingAnalytics}
              >
                Retry
              </Button>
            </div>
          )}

          <section className="kv-grid-4" aria-label="Activity Overview">
            <StatCard label="Total Analyses" value={overview.totalAnalyses} icon={FiClock} tone="green" />
            <StatCard
              label="Diseased Results"
              value={overview.diseasedDetections}
              icon={FiAlertTriangle}
              tone="red"
            />
            <StatCard
              label="Healthy Results"
              value={overview.healthyDetections}
              icon={FiCheckCircle}
              tone="green"
            />
            <StatCard
              label="Plant Identifications"
              value={overview.plantIdentifications}
              icon={FiSearch}
              tone="blue"
            />
          </section>

          {activeSection === 'profile' && (
            <Card
              title="My Profile"
              subtitle="Update your name, phone number, farm location, or optional avatar URL."
              icon={FiUser}
            >
              {profileError && (
                <div className="kv-alert kv-alert-danger" style={{ marginBottom: 14 }} role="alert">
                  <FiAlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{profileError}</span>
                </div>
              )}

              <form onSubmit={handleProfileSave} className="kv-form" noValidate>
                <div className="kv-grid-2">
                  <div className="kv-form-field">
                    <label htmlFor="profile-name" className="kv-form-label">
                      Full Name
                    </label>
                    <input
                      id="profile-name"
                      type="text"
                      className="kv-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={savingProfile}
                    />
                  </div>

                  <div className="kv-form-field">
                    <label htmlFor="profile-email" className="kv-form-label">
                      Email Address (Read-only)
                    </label>
                    <input
                      id="profile-email"
                      type="email"
                      className="kv-input"
                      value={user?.email || ''}
                      disabled
                    />
                  </div>

                  <div className="kv-form-field">
                    <label htmlFor="profile-phone" className="kv-form-label">
                      Phone Number
                    </label>
                    <input
                      id="profile-phone"
                      type="text"
                      className="kv-input"
                      placeholder="Optional phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={savingProfile}
                    />
                  </div>

                  <div className="kv-form-field">
                    <label htmlFor="profile-location" className="kv-form-label">
                      Location
                    </label>
                    <input
                      id="profile-location"
                      type="text"
                      className="kv-input"
                      placeholder="e.g., Madikeri, Kodagu, Karnataka"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      disabled={savingProfile}
                    />
                  </div>
                </div>

                <div className="kv-form-field">
                  <label htmlFor="profile-avatar" className="kv-form-label">
                    Avatar Image URL (Optional)
                  </label>
                  <input
                    id="profile-avatar"
                    type="url"
                    className="kv-input"
                    placeholder="https://..."
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    disabled={savingProfile}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="submit"
                    variant="primary"
                    icon={FiSave}
                    loading={savingProfile}
                  >
                    Save Profile Changes
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {activeSection === 'password' && (
            <Card
              title="Change Password"
              subtitle="Verify your current password to set a new password and rotate your active session."
              icon={FiLock}
            >
              {passwordError && (
                <div className="kv-alert kv-alert-danger" style={{ marginBottom: 14 }} role="alert">
                  <FiAlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordSave} className="kv-form" noValidate>
                <div className="kv-form-field">
                  <label htmlFor="current-password" className="kv-form-label">
                    Current Password
                  </label>
                  <div className="kv-password-wrap">
                    <input
                      id="current-password"
                      type={showCurrentPw ? 'text' : 'password'}
                      autoComplete="current-password"
                      className="kv-input kv-input-with-toggle"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      disabled={savingPassword}
                    />
                    <button
                      type="button"
                      className="kv-password-toggle"
                      onClick={() => setShowCurrentPw((p) => !p)}
                      aria-label={showCurrentPw ? 'Hide current password' : 'Show current password'}
                    >
                      {showCurrentPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="kv-grid-2">
                  <div className="kv-form-field">
                    <label htmlFor="new-password" className="kv-form-label">
                      New Password
                    </label>
                    <div className="kv-password-wrap">
                      <input
                        id="new-password"
                        type={showNewPw ? 'text' : 'password'}
                        autoComplete="new-password"
                        className="kv-input kv-input-with-toggle"
                        placeholder="Minimum 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={savingPassword}
                      />
                      <button
                        type="button"
                        className="kv-password-toggle"
                        onClick={() => setShowNewPw((p) => !p)}
                        aria-label={showNewPw ? 'Hide new password' : 'Show new password'}
                      >
                        {showNewPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="kv-form-field">
                    <label htmlFor="confirm-new-password" className="kv-form-label">
                      Confirm New Password
                    </label>
                    <div className="kv-password-wrap">
                      <input
                        id="confirm-new-password"
                        type={showConfirmPw ? 'text' : 'password'}
                        autoComplete="new-password"
                        className="kv-input kv-input-with-toggle"
                        placeholder="Re-enter new password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        disabled={savingPassword}
                      />
                      <button
                        type="button"
                        className="kv-password-toggle"
                        onClick={() => setShowConfirmPw((p) => !p)}
                        aria-label={
                          showConfirmPw ? 'Hide confirm new password' : 'Show confirm new password'
                        }
                      >
                        {showConfirmPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="submit"
                    variant="primary"
                    icon={FiLock}
                    loading={savingPassword}
                  >
                    Update Password
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {activeSection === 'activities' && (
            <Card
              title="My Activities"
              subtitle="Live MongoDB breakdown of your recent analyses, batches, and images processed."
              icon={FiActivity}
              action={
                <Link to={ROUTES.HISTORY}>
                  <Button variant="secondary" size="sm" icon={FiArrowRight}>
                    Full History
                  </Button>
                </Link>
              }
            >
              {loadingAnalytics ? (
                <div className="kv-weather-loading">
                  <FiLoader size={20} className="kv-spin" color="var(--kv-primary)" />
                  <span>Loading activity summary...</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <Badge variant="info">
                      Disease Detections: {overview.diseaseDetections}
                    </Badge>
                    <Badge variant="success">
                      Plant IDs: {overview.plantIdentifications}
                    </Badge>
                    <Badge variant="neutral">
                      Multi-Image Batches: {overview.multiImageBatches}
                    </Badge>
                    <Badge variant="neutral">
                      Images Submitted: {overview.totalImagesProcessed}
                    </Badge>
                    {overview.rejectedImages > 0 && (
                      <Badge variant="warning">
                        Rejected Images: {overview.rejectedImages}
                      </Badge>
                    )}
                  </div>

                  {recentActivity.length === 0 ? (
                    <EmptyState
                      icon={FiActivity}
                      title="No Activities Recorded Yet"
                      description="Run a Disease Detection, Plant Identification, or Multi Image Analysis to view your real activity here."
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                            <div style={{ fontSize: 12, color: 'var(--kv-text-muted)' }}>
                              {formatDateTime(item.createdAt)}
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
                </div>
              )}
            </Card>
          )}

          {activeSection === 'language' && (
            <Card
              title="Language"
              subtitle="Interface language preference."
              icon={FiGlobe}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  border: '1px solid var(--kv-border)',
                  borderRadius: 'var(--kv-radius-sm)',
                  backgroundColor: 'var(--kv-surface-subtle)',
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600 }}>Interface Language</span>
                <Badge variant="success">English (Default)</Badge>
              </div>
            </Card>
          )}

          <div className="kv-grid-2">
            <Card
              title="Detection Results (Healthy vs Diseased)"
              subtitle="Evaluated images across single & batch disease runs (excludes rejected images)."
              icon={FiPieChart}
            >
              {loadingAnalytics ? (
                <div className="kv-weather-loading">
                  <FiLoader size={20} className="kv-spin" color="var(--kv-primary)" />
                  <span>Loading detection analytics...</span>
                </div>
              ) : healthChartData.length === 0 ? (
                <EmptyState
                  icon={FiPieChart}
                  title="No Detection Analytics Yet"
                  description="Save at least one Disease Detection or Multi Image Analysis to view your genuine healthy vs diseased breakdown."
                />
              ) : (
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={healthChartData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={78}
                        paddingAngle={3}
                      >
                        {healthChartData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={HEALTH_COLORS[entry.name] || '#64748b'}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card
              title="Most Analyzed Crops"
              subtitle="Genuine analysis counts across the 5 supported crops."
              icon={FiActivity}
            >
              {loadingAnalytics ? (
                <div className="kv-weather-loading">
                  <FiLoader size={20} className="kv-spin" color="var(--kv-primary)" />
                  <span>Loading crop statistics...</span>
                </div>
              ) : !hasCropData ? (
                <EmptyState
                  icon={FiActivity}
                  title="No Crop Statistics Yet"
                  description="Counts for Coffee, Black Pepper, Ginger, Cardamom, and Arecanut will populate from your saved MongoDB analyses."
                />
              ) : (
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cropAnalytics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e1e8e3" />
                      <XAxis dataKey="crop" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="totalCount" name="Analyses" fill="#15803d" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
