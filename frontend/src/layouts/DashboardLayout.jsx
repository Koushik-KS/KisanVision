import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import ConfirmModal from '../components/common/ConfirmModal';
import { ROUTES } from '../utils/constants';
import { checkBackendHealth } from '../services/healthService';
import { useToast } from '../context/ToastContext';

const PAGE_TITLES = {
  [ROUTES.HOME]: 'Home',
  [ROUTES.DISEASE_DETECTION]: 'Disease Detection',
  [ROUTES.PLANT_IDENTIFICATION]: 'Plant Identification',
  [ROUTES.MULTI_IMAGE_ANALYSIS]: 'Multi Image Analysis',
  [ROUTES.WEATHER_PREDICTION]: 'Weather Prediction',
  [ROUTES.HISTORY]: 'History',
  [ROUTES.PROFILE]: 'Profile',
};

const DashboardLayout = () => {
  const location = useLocation();
  const { showToast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [apiHealth, setApiHealth] = useState({
    status: 'checking',
    message: 'Checking backend health...',
    data: null,
  });

  useEffect(() => {
    let active = true;
    const loadHealth = async () => {
      try {
        const res = await checkBackendHealth();
        if (!active) return;
        setApiHealth({
          status: 'online',
          message: res.message,
          data: res.data,
        });
      } catch (err) {
        if (!active) return;
        setApiHealth({
          status: 'offline',
          message: err.message,
          data: null,
        });
      }
    };
    loadHealth();
    return () => {
      active = false;
    };
  }, []);

  const currentTitle = PAGE_TITLES[location.pathname] || 'KisanVision AI';
  const showBack = location.pathname !== ROUTES.HOME;

  const handleConfirmLogout = () => {
    setLogoutModalOpen(false);
    showToast(
      'Authentication and user sessions will be enabled in Phase 2.',
      'info'
    );
  };

  return (
    <div className="kv-app-shell">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogoutClick={() => setLogoutModalOpen(true)}
      />

      <div className="kv-main-wrapper">
        <Topbar
          title={currentTitle}
          showBack={showBack}
          onMenuClick={() => setSidebarOpen(true)}
          apiHealth={apiHealth}
        />

        <main className="kv-page-content">
          <Outlet context={{ apiHealth }} />
        </main>
      </div>

      <ConfirmModal
        isOpen={logoutModalOpen}
        title="Logout"
        message="User authentication and session termination will be activated in Phase 2. Would you like to continue exploring the Phase 1 workspace?"
        confirmLabel="OK"
        cancelLabel="Close"
        confirmVariant="primary"
        onConfirm={handleConfirmLogout}
        onCancel={() => setLogoutModalOpen(false)}
      />
    </div>
  );
};

export default DashboardLayout;
