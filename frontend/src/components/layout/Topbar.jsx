import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiCheckCircle,
  FiMenu,
  FiServer,
  FiUser,
  FiAlertTriangle,
} from 'react-icons/fi';
import { ROUTES } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';

const Topbar = ({ title, showBack, onMenuClick, apiHealth }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isOnline = apiHealth?.status === 'online';
  const isChecking = apiHealth?.status === 'checking';

  return (
    <header className="kv-topbar">
      <div className="kv-topbar-left">
        <button
          type="button"
          className="kv-menu-trigger"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <FiMenu size={20} />
        </button>

        {showBack && (
          <button
            type="button"
            className="kv-back-btn"
            onClick={() => navigate(ROUTES.HOME)}
            aria-label="Back to Home"
          >
            <FiArrowLeft size={16} />
          </button>
        )}

        <h1 className="kv-page-title">{title}</h1>
      </div>

      <div className="kv-topbar-right">
        <div
          className={`kv-api-pill ${isOnline ? 'online' : isChecking ? '' : 'offline'}`}
          title={apiHealth?.message || 'Backend connection status'}
        >
          {isOnline ? (
            <FiCheckCircle size={14} />
          ) : isChecking ? (
            <FiServer size={14} />
          ) : (
            <FiAlertTriangle size={14} />
          )}
          <span className="kv-api-pill-label">
            {isOnline
              ? 'API Connected'
              : isChecking
                ? 'Checking API...'
                : 'API Offline'}
          </span>
        </div>

        <button
          type="button"
          className="kv-user-chip"
          onClick={() => navigate(ROUTES.PROFILE)}
        >
          <span className="kv-user-avatar-sm">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <FiUser size={15} />
            )}
          </span>
          <span>{user?.name || 'Profile'}</span>
        </button>
      </div>
    </header>
  );
};

export default Topbar;
