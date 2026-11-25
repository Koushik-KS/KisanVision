import { useEffect, useState } from 'react';
import {
  FiActivity,
  FiAlertCircle,
  FiAlertTriangle,
  FiCalendar,
  FiCheckCircle,
  FiChevronRight,
  FiClock,
  FiEdit2,
  FiEye,
  FiEyeOff,
  FiGlobe,
  FiLock,
  FiMail,
  FiMapPin,
  FiPhone,
  FiPieChart,
  FiSave,
  FiSearch,
  FiUser,
} from 'react-icons/fi';
import Card from '../components/common/Card';
import StatCard from '../components/common/StatCard';
import EmptyState from '../components/common/EmptyState';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const SETTINGS_SECTIONS = [
  { id: 'profile', label: 'My Profile', icon: FiUser },
  { id: 'activities', label: 'My Activities', icon: FiActivity },
  { id: 'password', label: 'Change Password', icon: FiLock },
  { id: 'language', label: 'Language', icon: FiGlobe },
];

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

const ProfilePage = () => {
  const { showToast } = useToast();
  const { user, updateProfile, changePassword } = useAuth();
  const [activeSection, setActiveSection] = useState('profile');

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

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setLocation(user.location || '');
      setAvatar(user.avatar || '');
    }
  }, [user]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileError('');

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setProfileError('Name must be at least 2 characters.');
      return;
    }

    if (avatar.trim()) {
      try {
        const parsed = new URL(avatar.trim());
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
        phone: phone.trim(),
        location: location.trim(),
        avatar: avatar.trim(),
      });
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

  return (
    <div className="kv-page-stack">
      <div className="kv-split-layout">
        <div className="kv-page-stack">
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="kv-profile-avatar-img"
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
          <section className="kv-grid-4" aria-label="Activity Overview">
            <StatCard label="Total Analyses" value={0} icon={FiClock} tone="green" />
            <StatCard label="Diseased Detections" value={0} icon={FiAlertTriangle} tone="red" />
            <StatCard label="Healthy Detections" value={0} icon={FiCheckCircle} tone="green" />
            <StatCard label="Plant Identifications" value={0} icon={FiSearch} tone="blue" />
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
                      placeholder="e.g., Kodagu, Karnataka"
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
              subtitle="Persisted analysis activity will populate as you run crop inspections in Phases 3-7."
              icon={FiActivity}
            >
              <EmptyState
                icon={FiActivity}
                title="No Activities Recorded Yet"
                description="Your Disease Detection, Plant Identification, and Multi Image Analysis records from MongoDB will appear here once AI analysis modules are connected."
              />
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
              subtitle="Calculated strictly from your persisted database records."
              icon={FiPieChart}
            >
              <EmptyState
                icon={FiPieChart}
                title="No Detection Analytics Yet"
                description="Once analyses are saved in MongoDB, Recharts visualizations will display your real healthy vs diseased counts."
              />
            </Card>

            <Card
              title="Most Analyzed Crops"
              subtitle="Distribution across the 5 supported crops."
              icon={FiActivity}
            >
              <EmptyState
                icon={FiActivity}
                title="No Crop Statistics Yet"
                description="Counts for Coffee, Black Pepper, Ginger, Cardamom, and Arecanut will populate automatically from database history."
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
