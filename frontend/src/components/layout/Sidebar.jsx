import { NavLink } from 'react-router-dom';
import {
  FiActivity,
  FiClock,
  FiCloudRain,
  FiFeather,
  FiHome,
  FiLayers,
  FiLogOut,
  FiSearch,
  FiUser,
  FiX,
} from 'react-icons/fi';
import { ROUTES } from '../../utils/constants';

const NAV_ITEMS = [
  { label: 'Home', path: ROUTES.HOME, icon: FiHome },
  { label: 'Disease Detection', path: ROUTES.DISEASE_DETECTION, icon: FiActivity },
  { label: 'Plant Identification', path: ROUTES.PLANT_IDENTIFICATION, icon: FiSearch },
  { label: 'Multi Image Analysis', path: ROUTES.MULTI_IMAGE_ANALYSIS, icon: FiLayers },
  { label: 'Weather Prediction', path: ROUTES.WEATHER_PREDICTION, icon: FiCloudRain },
  { label: 'History', path: ROUTES.HISTORY, icon: FiClock },
  { label: 'Profile', path: ROUTES.PROFILE, icon: FiUser },
];

const Sidebar = ({ isOpen, onClose, onLogoutClick }) => {
  return (
    <>
      <div
        className={`kv-sidebar-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`kv-sidebar ${isOpen ? 'open' : ''}`} aria-label="Primary Navigation">
        <div className="kv-sidebar-brand">
          <NavLink to={ROUTES.HOME} className="kv-brand-link" onClick={onClose}>
            <span className="kv-brand-mark">
              <FiFeather size={20} />
            </span>
            <span className="kv-brand-text">
              <span className="kv-brand-title">KisanVision AI</span>
              <span className="kv-brand-subtitle">Agentic AI for Agriculture</span>
            </span>
          </NavLink>

          <button
            type="button"
            className="kv-sidebar-close"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <FiX size={20} />
          </button>
        </div>

        <nav className="kv-sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === ROUTES.HOME}
                onClick={onClose}
                className={({ isActive }) =>
                  `kv-nav-item ${isActive ? 'active' : ''}`
                }
              >
                <Icon className="kv-nav-icon" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="kv-sidebar-footer">
          <button
            type="button"
            className="kv-nav-item kv-nav-logout"
            onClick={onLogoutClick}
          >
            <FiLogOut className="kv-nav-icon" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
