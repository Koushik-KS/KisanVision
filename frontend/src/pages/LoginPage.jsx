import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FiAlertCircle,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiFeather,
  FiLock,
  FiLogIn,
  FiMail,
} from 'react-icons/fi';
import Button from '../components/common/Button';
import SupportedCropsBar from '../components/common/SupportedCropsBar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ROUTES } from '../utils/constants';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError('Email and password are required.');
      return;
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      await login({ email: normalizedEmail, password });
      showToast('Logged in successfully.', 'success');
      const destination = location.state?.from?.pathname || ROUTES.HOME;
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="kv-auth-page">
      <section className="kv-auth-hero">
        <div className="kv-auth-brand">
          <span className="kv-brand-mark">
            <FiFeather size={20} />
          </span>
          <div>
            <div className="kv-auth-brand-title">KisanVision AI</div>
            <div className="kv-auth-brand-sub">Agentic AI for Agriculture</div>
          </div>
        </div>

        <div className="kv-auth-hero-copy">
          <h1>Agricultural Intelligence for Specialty Crops</h1>
          <p>
            Sign in to access your KisanVision AI workspace for crop validation, disease
            detection, plant identification, multi-image screening, and weather guidance.
          </p>

          <div className="kv-auth-highlights">
            <div className="kv-auth-highlight-item">
              <FiCheckCircle size={16} />
              <span>Dedicated to Coffee, Black Pepper, Ginger, Cardamom, and Arecanut</span>
            </div>
            <div className="kv-auth-highlight-item">
              <FiCheckCircle size={16} />
              <span>Private account history and secure session management</span>
            </div>
          </div>
        </div>

        <SupportedCropsBar label="Supported Crops" />
      </section>

      <section className="kv-auth-panel">
        <div className="kv-auth-card">
          <div className="kv-auth-card-header">
            <h2>Sign In</h2>
            <p>Access your KisanVision AI dashboard</p>
          </div>

          {error && (
            <div className="kv-alert kv-alert-danger" role="alert">
              <FiAlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="kv-form" noValidate>
            <div className="kv-form-field">
              <label htmlFor="login-email" className="kv-form-label">
                Email Address
              </label>
              <div className="kv-input-icon-wrap">
                <FiMail size={16} className="kv-input-icon" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  className="kv-input kv-input-with-icon"
                  placeholder="farmer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="kv-form-field">
              <label htmlFor="login-password" className="kv-form-label">
                Password
              </label>
              <div className="kv-password-wrap kv-input-icon-wrap">
                <FiLock size={16} className="kv-input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="kv-input kv-input-with-icon kv-input-with-toggle"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="kv-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              icon={FiLogIn}
              loading={submitting}
            >
              Sign In
            </Button>
          </form>

          <p className="kv-auth-footer">
            New to KisanVision AI?{' '}
            <Link to={ROUTES.REGISTER} className="kv-auth-link">
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
};

export default LoginPage;
