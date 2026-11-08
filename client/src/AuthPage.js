import React, { useState } from 'react';
import { LogIn, UserPlus, Mail, Lock, User as UserIcon, IdCard, ArrowRight } from 'lucide-react';

const AuthPage = ({ onAuthSuccess, authMode, setAuthMode }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    rollNumber: '',
    rememberMe: false
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const endpoint = authMode === 'login' ? '/login' : '/signup';
      const response = await fetch(`http://localhost:5000/api/auth${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Authentication failed');

      localStorage.setItem('jklu_token', data.token);
      if (formData.rememberMe) {
        localStorage.setItem('jklu_remember_me', 'true');
      }

      onAuthSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="logo-circle">
              <Bus size={32} color="#D82C36" />
            </div>
          </div>
          <h2>{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
          <p>{authMode === 'login' ? 'Sign in to access your shuttle passes' : 'Join the JKLU Transit Network'}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {authMode === 'signup' && (
            <div className="input-group">
              <UserIcon className="input-icon" size={18} />
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                required
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
          )}

          <div className="input-group">
            <Mail className="input-icon" size={18} />
            <input
              type="email"
              name="email"
              placeholder="email@jklu.edu.in"
              required
              value={formData.email}
              onChange={handleInputChange}
            />
          </div>

          {authMode === 'signup' && (
            <div className="input-group">
              <IdCard className="input-icon" size={18} />
              <input
                type="text"
                name="rollNumber"
                placeholder="Roll Number (e.g. 2023BTECH042)"
                required
                value={formData.rollNumber}
                onChange={handleInputChange}
              />
            </div>
          )}

          <div className="input-group">
            <Lock className="input-icon" size={18} />
            <input
              type="password"
              name="password"
              placeholder="Password"
              required
              value={formData.password}
              onChange={handleInputChange}
            />
          </div>

          {authMode === 'login' && (
            <div className="remember-me-container">
              <label className="switch-container">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                />
                <span className="slider"></span>
                <span className="remember-text">Remember me on this device</span>
              </label>
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-submit-btn" disabled={isLoading}>
            {isLoading ? 'Processing...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
            {!isLoading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="auth-footer">
          <span>{authMode === 'login' ? "Don't have an account?" : "Already have an account?"}</span>
          <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
            {authMode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>

      <style>{`
        .auth-container {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #f4f7f6;
          padding: 20px;
        }
        .auth-card {
          background: white;
          width: 100%;
          max-width: 420px;
          padding: 40px;
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.08);
          text-align: center;
        }
        .auth-header { margin-bottom: 32px; }
        .auth-logo {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }
        .logo-circle {
          width: 64px;
          height: 64px;
          background: #FEE2E2;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .auth-header h2 {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0F172A;
          margin-bottom: 8px;
        }
        .auth-header p {
          color: #64748B;
          font-size: 0.9rem;
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .input-group {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-icon {
          position: absolute;
          left: 12px;
          color: #94A3B8;
        }
        .input-group input {
          width: 100%;
          padding: 12px 12px 12px 40px;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          font-size: 0.95rem;
          transition: all 0.2s;
          outline: none;
        }
        .input-group input:focus {
          border-color: #D82C36;
          box-shadow: 0 0 0 3px rgba(216, 44, 54, 0.1);
        }
        .remember-me-container {
          display: flex;
          justify-content: flex-start;
          margin: 8px 0;
        }
        .switch-container {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          font-size: 0.85rem;
          color: #64748B;
        }
        .switch-container input {
          display: none;
        }
        .slider {
          width: 34px;
          height: 18px;
          background: #CBD5E1;
          border-radius: 10px;
          position: relative;
          transition: 0.3s;
        }
        .slider:after {
          content: '';
          position: absolute;
          width: 14px;
          height: 14px;
          background: white;
          border-radius: 50%;
          top: 2px;
          left: 2px;
          transition: 0.3s;
        }
        input:checked + .slider {
          background: #D82C36;
        }
        input:checked + .slider:after {
          left: 18px;
        }
        .auth-error {
          background: #FEF2F2;
          color: #B91C1C;
          padding: 10px;
          border-radius: 8px;
          font-size: 0.85rem;
          text-align: center;
          border: 1px solid #FCA5A5;
        }
        .auth-submit-btn {
          background: #D82C36;
          color: white;
          border: none;
          padding: 14px;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
          margin-top: 10px;
        }
        .auth-submit-btn:hover {
          background: #B91C1C;
          transform: translateY(-1px);
        }
        .auth-submit-btn:disabled {
          background: #FDA4AF;
          cursor: not-allowed;
        }
        .auth-footer {
          margin-top: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 0.9rem;
          color: #64748B;
        }
        .auth-footer button {
          background: none;
          border: none;
          color: #D82C36;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
        }
      `}</style>
    </div>
  );
};

// Define Bus icon for the AuthPage as it's used in the logo
const BusIcon = ({ size, color }) => <Bus size={size} color={color} />;
// Since Bus is already imported in App.js, this is just for local consistency if moved to separate file.

export default AuthPage;
