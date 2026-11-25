import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiAlertCircle,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiFeather,
  FiLock,
  FiMail,
  FiUser,
  FiUserPlus,
} from 'react-icons/fi';
import Button from '../components/common/Button';
import SupportedCropsBar from '../components/common/SupportedCropsBar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ROUTES } from '../utils/constants';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName || !normalizedEmail || !password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        name: trimmedName,
        email: normalizedEmail,
        password,
      });
      showToast('Account created successfully.', 'success');
      navigate(ROUTES.HOME, { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to create account. Please try again.');
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
          <h1>Create Your KisanVision AI Account</h1>
          <p>
            Start managing crop health inspections, botanical identifications, and weather-aware
            recommendations in one secure agricultural platform.
          </p>

          <div className="kv-auth-highlights">
            <div className="kv-auth-highlight-item">
              <FiCheckCircle size={16} />
              <span>Encrypted credentials and secure JWT session protection</span>
            </div>
            <div className="kv-auth-highlight-item">
              <FiCheckCircle size={16} />
              <span>Personal workspace isolated to your account</span>
            </div>
          </div>
        </div>

        <SupportedCropsBar label="Supported Crops" />
      </section>

      <section className="kv-auth-panel">
        <div className="kv-auth-card">
          <div className="kv-auth-card-header">
            <h2>Create Account</h2>
            <p>Register to access KisanVision AI</p>
          </div>

          {error && (
            <div className="kv-alert kv-alert-danger" role="alert">
              <FiAlertCircle size={17} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="kv-form" noValidate>
            <div className="kv-form-field">
              <label htmlFor="register-name" className="kv-form-label">
                Full Name
              </label>
              <div className="kv-input-icon-wrap">
                <FiUser size={16} className="kv-input-icon" />
                <input
                  id="register-name"
                  type="text"
                  autoComplete="name"
                  className="kv-input kv-input-with-icon"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="kv-form-field">
              <label htmlFor="register-email" className="kv-form-label">
                Email Address
              </label>
              <div className="kv-input-icon-wrap">
                <FiMail size={16} className="kv-input-icon" />
                <input
                  id="register-email"
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
              <label htmlFor="register-password" className="kv-form-label">
                Password
              </label>
              <div className="kv-password-wrap kv-input-icon-wrap">
                <FiLock size={16} className="kv-input-icon" />
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="kv-input kv-input-with-icon kv-input-with-toggle"
                  placeholder="Minimum 6 characters"
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

            <div className="kv-form-field">
              <label htmlFor="register-confirm-password" className="kv-form-label">
                Confirm Password
              </label>
              <div className="kv-password-wrap kv-input-icon-wrap">
                <FiLock size={16} className="kv-input-icon" />
                <input
                  id="register-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="kv-input kv-input-with-icon kv-input-with-toggle"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="kv-password-toggle"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              icon={FiUserPlus}
              loading={submitting}
            >
              Create Account
            </Button>
          </form>

          <p className="kv-auth-footer">
            Already have an account?{' '}
            <Link to={ROUTES.LOGIN} className="kv-auth-link">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
};

export default RegisterPage;
