import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bus,
  CheckCircle,
  Plus,
  Printer,
  RefreshCw,
  Users,
  X,
  XCircle
} from 'lucide-react';
import { adminErrorMessage, cancelSlot, createSlot, getPassengers, getSlotLoad } from './api/admin';

const NEARLY_FULL = 0.8;
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const PERIODS = ['Morning', 'Afternoon', 'Evening', 'Night'];

// Today's date in the viewer's own time zone, as YYYY-MM-DD
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// "18:10" (from <input type="time">) -> "06:10 PM"
const to12Hour = (value) => {
  const [h, m] = value.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${String(h % 12 || 12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
};

const formatDate = (date) =>
  new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

const loadInfo = (slot) => {
  const ratio = slot.totalSeats > 0 ? slot.bookedSeats / slot.totalSeats : 0;
  return {
    percent: Math.round(ratio * 100),
    isFull: slot.bookedSeats >= slot.totalSeats,
    isNearlyFull: ratio >= NEARLY_FULL && slot.bookedSeats < slot.totalSeats
  };
};

const EMPTY_FORM = {
  time: '',
  busNumber: '',
  busType: '',
  totalSeats: 32,
  period: '',
  days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
};

const AdminDashboard = ({ onUnauthorized }) => {
  const [date, setDate] = useState(localToday);
  const [load, setLoad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  const [cancelTarget, setCancelTarget] = useState(null); // slot being cancelled
  const [cancelStep, setCancelStep] = useState('reason'); // 'reason' | 'confirm'
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelSaving, setCancelSaving] = useState(false);

  const [passengerSlot, setPassengerSlot] = useState(null);
  const [passengers, setPassengers] = useState(null);
  const [passengersLoading, setPassengersLoading] = useState(false);
  const [passengersError, setPassengersError] = useState('');

  const passengerRef = useRef(null);
  const reasonRef = useRef(null);

  // 401 means the session is gone: sign out. Anything else is shown to the admin.
  const handleError = useCallback((err, setter) => {
    if (err.response?.status === 401) {
      onUnauthorized();
      return;
    }
    setter(adminErrorMessage(err));
  }, [onUnauthorized]);

  const refreshLoad = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setLoad(await getSlotLoad(date));
    } catch (err) {
      setLoad(null);
      handleError(err, setError);
    } finally {
      setLoading(false);
    }
  }, [date, handleError]);

  const loadPassengers = useCallback(async (slot) => {
    setPassengerSlot(slot);
    setPassengers(null);
    setPassengersError('');
    setPassengersLoading(true);
    try {
      const data = await getPassengers(slot._id, date);
      setPassengers([...data.passengers].sort((a, b) => a.seatNumber - b.seatNumber));
    } catch (err) {
      handleError(err, setPassengersError);
    } finally {
      setPassengersLoading(false);
    }
  }, [date, handleError]);

  useEffect(() => {
    refreshLoad();
    setPassengerSlot(null);
    setPassengers(null);
  }, [refreshLoad]);

  useEffect(() => {
    if (passengerSlot && passengerRef.current) {
      passengerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [passengerSlot]);

  useEffect(() => {
    if (cancelTarget && cancelStep === 'reason' && reasonRef.current) reasonRef.current.focus();
  }, [cancelTarget, cancelStep]);

  // ---------- Add shuttle ----------
  const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const toggleDay = (day) =>
    setForm((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day]
    }));

  const handleAddShuttle = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.time) return setFormError('Choose a departure time.');
    if (!form.busNumber.trim()) return setFormError('Enter the bus number.');
    if (form.days.length === 0) return setFormError('Pick at least one day the shuttle runs.');

    setFormSaving(true);
    try {
      const payload = {
        time: to12Hour(form.time),
        busNumber: form.busNumber.trim(),
        totalSeats: Number(form.totalSeats),
        days: WEEKDAYS.filter((d) => form.days.includes(d))
      };
      if (form.busType.trim()) payload.busType = form.busType.trim();
      if (form.period) payload.period = form.period;

      const data = await createSlot(payload);
      setNotice(`${data.message} ${data.slot.time} · ${data.slot.busNumber}`);
      setForm(EMPTY_FORM);
      setShowAddForm(false);
      refreshLoad();
    } catch (err) {
      handleError(err, setFormError);
    } finally {
      setFormSaving(false);
    }
  };

  // ---------- Cancel shuttle ----------
  const openCancel = (slot) => {
    setCancelTarget(slot);
    setCancelStep('reason');
    setCancelReason('');
    setCancelError('');
  };

  const closeCancel = () => {
    if (cancelSaving) return;
    setCancelTarget(null);
  };

  const handleConfirmCancel = async () => {
    setCancelSaving(true);
    setCancelError('');
    try {
      const data = await cancelSlot(cancelTarget._id, date, cancelReason.trim());
      setNotice(`${cancelTarget.time} · ${cancelTarget.busNumber}: ${data.message}`);
      setCancelTarget(null);
      refreshLoad();
      if (passengerSlot?._id === cancelTarget._id) loadPassengers(cancelTarget);
    } catch (err) {
      handleError(err, setCancelError);
    } finally {
      setCancelSaving(false);
    }
  };

  // ---------- Render ----------
  const slots = load?.slots || [];
  const totals = slots.reduce(
    (acc, s) => {
      acc.booked += s.bookedSeats;
      acc.seats += s.totalSeats;
      if (loadInfo(s).isNearlyFull || loadInfo(s).isFull) acc.busy += 1;
      return acc;
    },
    { booked: 0, seats: 0, busy: 0 }
  );

  return (
    <div className="admin-dashboard">
      <div className="admin-head no-print">
        <div>
          <h2 className="admin-title">Admin dashboard</h2>
          <p className="admin-sub">Shuttle load, extra shuttles, cancellations and passenger lists</p>
        </div>
        <div className="admin-head-actions">
          <label className="admin-date-field">
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </label>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={refreshLoad} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'admin-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={() => { setShowAddForm((v) => !v); setFormError(''); }}
            aria-expanded={showAddForm}
          >
            <Plus size={15} />
            <span>Add shuttle</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="admin-alert admin-alert-success no-print" role="status">
          <CheckCircle size={16} />
          <span>{notice}</span>
          <button type="button" className="admin-icon-btn" onClick={() => setNotice('')} aria-label="Dismiss message">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Add shuttle form */}
      {showAddForm && (
        <form className="admin-panel admin-add-form no-print" onSubmit={handleAddShuttle}>
          <h3 className="admin-panel-title">Add an extra shuttle</h3>
          {formError && <div className="admin-alert admin-alert-error" role="alert">{formError}</div>}
          <div className="admin-form-grid">
            <label className="admin-field">
              <span>Departure time *</span>
              <input type="time" value={form.time} onChange={(e) => updateForm('time', e.target.value)} required />
            </label>
            <label className="admin-field">
              <span>Bus number *</span>
              <input type="text" placeholder="RJ 14 PA 2024" value={form.busNumber} onChange={(e) => updateForm('busNumber', e.target.value)} required />
            </label>
            <label className="admin-field">
              <span>Bus type</span>
              <input type="text" placeholder="AC Executive Shuttle" value={form.busType} onChange={(e) => updateForm('busType', e.target.value)} />
            </label>
            <label className="admin-field">
              <span>Seats</span>
              <input type="number" min="4" max="60" step="4" value={form.totalSeats} onChange={(e) => updateForm('totalSeats', e.target.value)} />
            </label>
            <label className="admin-field">
              <span>Shift</span>
              <select value={form.period} onChange={(e) => updateForm('period', e.target.value)}>
                <option value="">Automatic (from time)</option>
                {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
          </div>
          <fieldset className="admin-days">
            <legend>Runs on *</legend>
            {WEEKDAYS.map((day) => (
              <label key={day} className="admin-day-chip">
                <input type="checkbox" checked={form.days.includes(day)} onChange={() => toggleDay(day)} />
                <span>{day.slice(0, 3)}</span>
              </label>
            ))}
          </fieldset>
          <div className="admin-form-actions">
            <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setShowAddForm(false)}>Close</button>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={formSaving}>
              {formSaving ? 'Adding…' : 'Add shuttle'}
            </button>
          </div>
        </form>
      )}

      {/* Load view */}
      <section className="admin-panel no-print" aria-labelledby="admin-load-title">
        <div className="admin-panel-head">
          <h3 id="admin-load-title" className="admin-panel-title">Seats booked on {formatDate(date)}</h3>
          {load && (
            <p className="admin-stats">
              <strong>{totals.booked}</strong> of {totals.seats} seats booked · <strong>{totals.busy}</strong> nearly full or full
            </p>
          )}
        </div>

        {loading && !load && <div className="admin-empty">Loading shuttle load…</div>}

        {error && (
          <div className="admin-alert admin-alert-error" role="alert">
            <AlertTriangle size={16} />
            <span>{error}</span>
            <button type="button" className="admin-btn admin-btn-ghost" onClick={refreshLoad}>Try again</button>
          </div>
        )}

        {!loading && !error && slots.length === 0 && (
          <div className="admin-empty">No shuttles are set up yet. Use “Add shuttle” to create one.</div>
        )}

        {slots.length > 0 && (
          <ul className="admin-slot-list">
            {slots.map((slot) => {
              const info = loadInfo(slot);
              return (
                <li key={slot._id} className={`admin-slot ${slot.runsOnDate ? '' : 'admin-slot-off'}`}>
                  <div className="admin-slot-main">
                    <div className="admin-slot-time">{slot.time}</div>
                    <div className="admin-slot-meta">
                      <span className="admin-slot-bus">{slot.busNumber}</span>
                      <span>{slot.period} · {slot.busType}</span>
                    </div>
                    <div className="admin-badges">
                      {info.isFull && <span className="admin-badge admin-badge-full">Full</span>}
                      {info.isNearlyFull && <span className="admin-badge admin-badge-warn">Nearly full</span>}
                      {!slot.runsOnDate && <span className="admin-badge admin-badge-muted">Not scheduled on {load.weekday}</span>}
                      {slot.cancelledByAdmin > 0 && (
                        <span className="admin-badge admin-badge-cancel">{slot.cancelledByAdmin} cancelled by admin</span>
                      )}
                    </div>
                  </div>

                  <div className="admin-slot-load">
                    <div className="admin-load-label">
                      <span><strong>{slot.bookedSeats}</strong> / {slot.totalSeats} booked</span>
                      <span>{info.percent}%</span>
                    </div>
                    <div
                      className="admin-load-bar"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={slot.totalSeats}
                      aria-valuenow={slot.bookedSeats}
                      aria-label={`${slot.time} seats booked`}
                    >
                      <div
                        className={`admin-load-fill ${info.isFull ? 'is-full' : info.isNearlyFull ? 'is-warn' : ''}`}
                        style={{ width: `${Math.min(info.percent, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="admin-slot-actions">
                    <button type="button" className="admin-btn admin-btn-ghost" onClick={() => loadPassengers(slot)}>
                      <Users size={15} />
                      <span>Passengers</span>
                    </button>
                    <button type="button" className="admin-btn admin-btn-danger" onClick={() => openCancel(slot)}>
                      <XCircle size={15} />
                      <span>Cancel shuttle</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Passenger list (the only part that prints) */}
      {passengerSlot && (
        <section className="admin-panel admin-print-area" ref={passengerRef} aria-labelledby="admin-pax-title">
          <div className="admin-panel-head">
            <div>
              <h3 id="admin-pax-title" className="admin-panel-title">
                Passenger list · {passengerSlot.time} · {passengerSlot.busNumber}
              </h3>
              <p className="admin-stats">
                {formatDate(date)} · {passengerSlot.busType}
                {passengers && ` · ${passengers.length} passenger${passengers.length === 1 ? '' : 's'}`}
              </p>
            </div>
            <div className="admin-head-actions no-print">
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => window.print()}
                disabled={!passengers || passengers.length === 0}
              >
                <Printer size={15} />
                <span>Print</span>
              </button>
              <button type="button" className="admin-icon-btn" onClick={() => setPassengerSlot(null)} aria-label="Close passenger list">
                <X size={16} />
              </button>
            </div>
          </div>

          {passengersLoading && <div className="admin-empty">Loading passengers…</div>}
          {passengersError && <div className="admin-alert admin-alert-error" role="alert">{passengersError}</div>}
          {passengers && passengers.length === 0 && (
            <div className="admin-empty">No confirmed passengers for this shuttle on this date.</div>
          )}
          {passengers && passengers.length > 0 && (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Seat</th>
                    <th scope="col">Name</th>
                    <th scope="col">Roll no.</th>
                    <th scope="col">Email</th>
                    <th scope="col">Stop</th>
                    <th scope="col">Booking code</th>
                  </tr>
                </thead>
                <tbody>
                  {passengers.map((p) => (
                    <tr key={p._id}>
                      <td className="admin-seat-cell">{p.seatNumber}</td>
                      <td>{p.passengerName}</td>
                      <td>{p.passengerRoll}</td>
                      <td>{p.passengerEmail}</td>
                      <td className="admin-stop-cell">{p.stop}</td>
                      <td>{p.bookingCode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Cancel shuttle dialog: reason first, then a confirm step */}
      {cancelTarget && (
        <div className="admin-modal-overlay no-print" onClick={closeCancel}>
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-cancel-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === 'Escape' && closeCancel()}
          >
            <div className="admin-modal-head">
              <h3 id="admin-cancel-title">
                <Bus size={18} /> Cancel {cancelTarget.time} · {cancelTarget.busNumber}
              </h3>
              <button type="button" className="admin-icon-btn" onClick={closeCancel} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            {cancelError && <div className="admin-alert admin-alert-error" role="alert">{cancelError}</div>}

            {cancelStep === 'reason' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (cancelReason.trim()) setCancelStep('confirm');
                }}
              >
                <label className="admin-field">
                  <span>Reason (students will see this) *</span>
                  <textarea
                    ref={reasonRef}
                    rows={3}
                    maxLength={300}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Bus breakdown, shuttle will not run today"
                    required
                  />
                  <small>{cancelReason.trim().length}/300</small>
                </label>
                <div className="admin-form-actions">
                  <button type="button" className="admin-btn admin-btn-ghost" onClick={closeCancel}>Keep shuttle</button>
                  <button type="submit" className="admin-btn admin-btn-danger" disabled={!cancelReason.trim()}>Continue</button>
                </div>
              </form>
            ) : (
              <div>
                <div className="admin-confirm-box">
                  <AlertTriangle size={18} />
                  <div>
                    <p>
                      This cancels <strong>all {cancelTarget.bookedSeats} confirmed booking{cancelTarget.bookedSeats === 1 ? '' : 's'}</strong> on{' '}
                      <strong>{formatDate(date)}</strong> for this shuttle. It cannot be undone.
                    </p>
                    <p className="admin-confirm-reason">Students will see: “Cancelled by admin: {cancelReason.trim()}”</p>
                  </div>
                </div>
                <div className="admin-form-actions">
                  <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setCancelStep('reason')} disabled={cancelSaving}>
                    Back
                  </button>
                  <button type="button" className="admin-btn admin-btn-danger" onClick={handleConfirmCancel} disabled={cancelSaving} autoFocus>
                    {cancelSaving ? 'Cancelling…' : 'Yes, cancel shuttle'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
