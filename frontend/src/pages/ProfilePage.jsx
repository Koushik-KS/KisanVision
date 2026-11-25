import { useState } from 'react';
import {
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiChevronRight,
  FiClock,
  FiEdit2,
  FiGlobe,
  FiLock,
  FiPieChart,
  FiSearch,
  FiUser,
} from 'react-icons/fi';
import Card from '../components/common/Card';
import StatCard from '../components/common/StatCard';
import EmptyState from '../components/common/EmptyState';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { useToast } from '../context/ToastContext';

const SETTINGS_SECTIONS = [
  { id: 'profile', label: 'My Profile', icon: FiUser },
  { id: 'activities', label: 'My Activities', icon: FiActivity },
  { id: 'password', label: 'Change Password', icon: FiLock },
  { id: 'language', label: 'Language', icon: FiGlobe },
];

const ProfilePage = () => {
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState('profile');

  const handleEditClick = () => {
    showToast(
      'Profile editing, registration, login, and password change will be enabled in Phase 2.',
      'info'
    );
  };

  return (
    <div className="kv-page-stack">
      <div className="kv-split-layout">
        <div className="kv-page-stack">
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="kv-profile-avatar">
                  <FiUser size={28} />
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700 }}>Account Pending Auth</h2>
                  <p style={{ fontSize: 13, color: 'var(--kv-text-muted)' }}>
                    Authentication enabled in Phase 2
                  </p>
                </div>
              </div>
              <Button variant="secondary" size="sm" icon={FiEdit2} onClick={handleEditClick}>
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
                gap: 8,
                fontSize: 13,
                color: 'var(--kv-text-secondary)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Status</span>
                <Badge variant="neutral">Phase 1 Preview</Badge>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Email</span>
                <span>Not signed in</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Location</span>
                <span>Not configured</span>
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

          <Card
            title="Account Section"
            subtitle={`Selected panel: ${SETTINGS_SECTIONS.find((s) => s.id === activeSection)?.label}`}
            icon={FiUser}
          >
            <EmptyState
              icon={FiLock}
              title="Authentication & User Settings in Phase 2"
              description="User registration, JWT login, profile editing, password updates, and persisted activity logs will be activated in Phase 2."
            />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
