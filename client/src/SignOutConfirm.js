import React from 'react';
import { LogOut, X } from 'lucide-react';

const SignOutConfirm = ({ onCancel, onConfirm }) => (
  <div className="signout-confirm-overlay" onClick={onCancel}>
    <div
      className="signout-confirm-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signout-confirm-title"
      onClick={(event) => event.stopPropagation()}
    >
      <button type="button" className="signout-confirm-close" onClick={onCancel} aria-label="Keep me signed in">
        <X size={18} />
      </button>
      <div className="signout-confirm-icon"><LogOut size={22} /></div>
      <h2 id="signout-confirm-title">Sign out?</h2>
      <p>Your current session will be closed on this device.</p>
      <div className="signout-confirm-actions">
        <button type="button" className="signout-confirm-cancel" onClick={onCancel}>Stay signed in</button>
        <button type="button" className="signout-confirm-submit" onClick={onConfirm}>Sign out</button>
      </div>
    </div>
  </div>
);

export default SignOutConfirm;
