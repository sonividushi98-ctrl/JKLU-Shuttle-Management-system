import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bus,
  CheckCircle,
  Edit3,
  MapPin,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
  Users,
  X,
  XCircle
} from 'lucide-react';
import {
  adminErrorMessage,
  cancelSlot,
  createRoute,
  createSlot,
  deleteRoute,
  getDailyPassengers,
  getPassengers,
  getRoutes,
  getSlotLoad,
  updateRoute
} from './api/admin';

const NEARLY_FULL = 0.8;
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const PERIODS = ['Morning', 'Afternoon', 'Evening', 'Night'];
const BUS_TYPES = [
  { value: 'Bus', defaultSeats: 30 },
  { value: 'Travellor', defaultSeats: 19 }
];

// Today's date in the viewer's own time zone, as YYYY-MM-DD
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const localDateOffset = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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

const createEmptyForm = () => ({
  time: '',
  busNumber: '',
  busType: 'Bus',
  totalSeats: 30,
  period: '',
  direction: 'Campus to City',
  routeId: '',
  days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
});

const createEmptyRouteForm = () => ({
  name: '',
  direction: 'Campus to City',
  origin: 'JKLU Campus Main Gate',
  destination: '',
  durationMinutes: 30,
  stopsText: ''
});

const routeToForm = (route) => ({
  name: route.name,
  direction: route.direction,
  origin: route.origin,
  destination: route.destination,
  durationMinutes: route.durationMinutes,
  stopsText: (route.availableStops || []).map((stop) => `${stop}${route.etaMinutes?.[stop] !== undefined ? ` | ${route.etaMinutes[stop]}` : ''}`).join('\n')
});

const AdminDashboard = ({ onUnauthorized }) => {
  const [date, setDate] = useState(localToday);
  const [load, setLoad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(createEmptyForm);
  const [seatCapacityEdited, setSeatCapacityEdited] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [routeForm, setRouteForm] = useState(createEmptyRouteForm);
  const [editingRouteId, setEditingRouteId] = useState(null);
  const [routeError, setRouteError] = useState('');
  const [routeSaving, setRouteSaving] = useState(false);

  const [cancelTarget, setCancelTarget] = useState(null); // slot being cancelled
  const [cancelStep, setCancelStep] = useState('reason'); // 'reason' | 'confirm'
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelSaving, setCancelSaving] = useState(false);

  const [passengerSlot, setPassengerSlot] = useState(null);
  const [passengers, setPassengers] = useState(null);
  const [passengersLoading, setPassengersLoading] = useState(false);
  const [passengersError, setPassengersError] = useState('');
  const [dailyPassengers, setDailyPassengers] = useState(null);
  const [dailyPassengersLoading, setDailyPassengersLoading] = useState(true);
  const [dailyPassengersError, setDailyPassengersError] = useState('');

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

  const refreshRoutes = useCallback(async () => {
    try {
      setRoutes((await getRoutes()) || []);
    } catch (err) {
      handleError(err, setRouteError);
    }
  }, [handleError]);

  useEffect(() => {
    refreshRoutes();
  }, [refreshRoutes]);

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

  const loadDailyPassengers = useCallback(async () => {
    setDailyPassengersLoading(true);
    setDailyPassengersError('');
    try {
      setDailyPassengers(await getDailyPassengers(date));
    } catch (err) {
      setDailyPassengers(null);
      handleError(err, setDailyPassengersError);
    } finally {
      setDailyPassengersLoading(false);
    }
  }, [date, handleError]);

  useEffect(() => {
    refreshLoad();
    loadDailyPassengers();
    setPassengerSlot(null);
    setPassengers(null);
  }, [refreshLoad, loadDailyPassengers]);

  useEffect(() => {
    if (passengerSlot && passengerRef.current) {
      passengerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [passengerSlot]);

  useEffect(() => {
    if (cancelTarget && cancelStep === 'reason' && reasonRef.current) reasonRef.current.focus();
  }, [cancelTarget, cancelStep]);

  // ---------- Add shuttle ----------
  const updateForm = (field, value) => setForm((prev) => {
    const next = { ...prev, [field]: value };
    if (field === 'busType' && !seatCapacityEdited) {
      const type = BUS_TYPES.find((option) => option.value === value);
      next.totalSeats = type ? type.defaultSeats : 30;
    }
    if (field === 'routeId' && value) {
      const selectedRoute = routes.find((route) => String(route._id) === value);
      if (selectedRoute) next.direction = selectedRoute.direction;
    }
    return next;
  });

  const updateRouteForm = (field, value) => setRouteForm((prev) => ({ ...prev, [field]: value }));

  const routePayload = () => {
    const stops = routeForm.stopsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, eta] = line.split('|').map((part) => part.trim());
        return { name, eta: Number(eta) };
      });
    const availableStops = stops.map((stop) => stop.name);
    const etaMinutes = {};
    stops.forEach((stop) => {
      if (stop.name && Number.isInteger(stop.eta)) etaMinutes[stop.name] = stop.eta;
    });
    return {
      name: routeForm.name.trim(),
      direction: routeForm.direction,
      origin: routeForm.origin.trim(),
      destination: routeForm.destination.trim(),
      durationMinutes: Number(routeForm.durationMinutes),
      availableStops,
      etaMinutes
    };
  };

  const openNewRoute = () => {
    setEditingRouteId(null);
    setRouteForm(createEmptyRouteForm());
    setRouteError('');
    setShowRouteForm(true);
  };

  const openEditRoute = (route) => {
    setEditingRouteId(route._id);
    setRouteForm(routeToForm(route));
    setRouteError('');
    setShowRouteForm(true);
  };

  const handleSaveRoute = async (e) => {
    e.preventDefault();
    setRouteError('');
    if (!routeForm.name.trim() || !routeForm.destination.trim()) return setRouteError('Enter a route name and destination.');
    if (!routeForm.stopsText.trim()) return setRouteError('Add at least one stop, one per line.');
    setRouteSaving(true);
    try {
      const data = editingRouteId
        ? await updateRoute(editingRouteId, routePayload())
        : await createRoute(routePayload());
      setNotice(data.message);
      setShowRouteForm(false);
      setRouteForm(createEmptyRouteForm());
      setEditingRouteId(null);
      await refreshRoutes();
      refreshLoad();
    } catch (err) {
      handleError(err, setRouteError);
    } finally {
      setRouteSaving(false);
    }
  };

  const handleDeleteRoute = async (route) => {
    if (!window.confirm(`Delete "${route.name}"? Routes assigned to shuttles cannot be deleted.`)) return;
    setRouteError('');
    try {
      const data = await deleteRoute(route._id);
      setNotice(data.message);
      await refreshRoutes();
    } catch (err) {
      handleError(err, setRouteError);
    }
  };

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
      if (form.routeId) payload.routeId = form.routeId;
      if (form.busType.trim()) payload.busType = form.busType.trim();
      if (form.period) payload.period = form.period;
      payload.direction = form.direction;

      const data = await createSlot(payload);
      setNotice(`${data.message} ${data.slot.time} · ${data.slot.busNumber}`);
      setForm(createEmptyForm());
      setSeatCapacityEdited(false);
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
  const maxReportDate = localDateOffset(2);
  const totals = slots.reduce(
    (acc, s) => {
      if (s.cancelled) {
        acc.cancelled += 1;
        return acc;
      }
      acc.booked += s.bookedSeats;
      acc.seats += s.totalSeats;
      if (loadInfo(s).isNearlyFull || loadInfo(s).isFull) acc.busy += 1;
      return acc;
    },
    { booked: 0, seats: 0, busy: 0, cancelled: 0 }
  );

  return (
    <div className="admin-dashboard">
      <div id="admin-overview" className="admin-head no-print">
        <div>
          <h2 className="admin-title">Admin dashboard</h2>
          <p className="admin-sub">Shuttle load, extra shuttles, cancellations and passenger lists</p>
        </div>
        <div className="admin-head-actions">
          <label className="admin-date-field">
            <span>Date</span>
            <input
              type="date"
              value={date}
              max={maxReportDate}
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
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

      {load && (
        <div className="admin-kpi-grid" aria-label="Shuttle operations summary">
          <div className="admin-kpi-card">
            <span className="admin-kpi-label">Total capacity</span>
            <strong>{totals.seats}</strong>
            <span className="admin-kpi-detail">Seats across scheduled shuttles</span>
          </div>
          <div className="admin-kpi-card admin-kpi-card-red">
            <span className="admin-kpi-label">Seats booked</span>
            <strong>{totals.booked}</strong>
            <span className="admin-kpi-detail">{totals.seats ? Math.round((totals.booked / totals.seats) * 100) : 0}% utilization</span>
          </div>
          <div className="admin-kpi-card admin-kpi-card-amber">
            <span className="admin-kpi-label">Busy shuttles</span>
            <strong>{totals.busy}</strong>
            <span className="admin-kpi-detail">Nearly full or at capacity</span>
          </div>
          <div className="admin-kpi-card admin-kpi-card-slate">
            <span className="admin-kpi-label">Cancellations</span>
            <strong>{totals.cancelled}</strong>
            <span className="admin-kpi-detail">Shuttles cancelled today</span>
          </div>
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
              <select value={form.busType} onChange={(e) => updateForm('busType', e.target.value)}>
                {BUS_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.value}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Route</span>
              <select value={form.routeId} onChange={(e) => updateForm('routeId', e.target.value)}>
                <option value="">Standard shuttle route</option>
                {routes.map((route) => (
                  <option key={route._id} value={route._id}>{route.name} · {route.destination}</option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>Seats <small className="admin-field-hint"></small></span>
              <input
                type="number"
                min="4"
                max="60"
                step="1"
                value={form.totalSeats}
                onChange={(e) => {
                  setSeatCapacityEdited(true);
                  updateForm('totalSeats', e.target.value);
                }}
              />
            </label>
            <label className="admin-field">
              <span>Direction</span>
              <select value={form.direction} onChange={(e) => updateForm('direction', e.target.value)}>
                <option value="Campus to City">Campus → City</option>
                <option value="City to Campus">City → Campus</option>
              </select>
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

      <section id="admin-routes" className="admin-panel no-print" aria-labelledby="admin-routes-title">
        <div className="admin-panel-head">
          <div>
            <h3 id="admin-routes-title" className="admin-panel-title">Routes</h3>
            <p className="admin-stats">Design reusable routes, then select them when adding a shuttle.</p>
          </div>
          <button type="button" className="admin-btn admin-btn-primary" onClick={openNewRoute}>
            <Plus size={15} />
            <span>Add route</span>
          </button>
        </div>

        {routeError && <div className="admin-alert admin-alert-error" role="alert">{routeError}</div>}

        {showRouteForm && (
          <form className="admin-route-form" onSubmit={handleSaveRoute}>
            <h4 className="admin-panel-title">{editingRouteId ? 'Edit route' : 'Design a new route'}</h4>
            <div className="admin-form-grid">
              <label className="admin-field">
                <span>Route name *</span>
                <input value={routeForm.name} onChange={(e) => updateRouteForm('name', e.target.value)} placeholder="Route 3" required />
              </label>
              <label className="admin-field">
                <span>Direction *</span>
                <select value={routeForm.direction} onChange={(e) => updateRouteForm('direction', e.target.value)}>
                  <option value="Campus to City">Campus → City</option>
                  <option value="City to Campus">City → Campus</option>
                </select>
              </label>
              <label className="admin-field">
                <span>Origin *</span>
                <input value={routeForm.origin} onChange={(e) => updateRouteForm('origin', e.target.value)} required />
              </label>
              <label className="admin-field">
                <span>Destination *</span>
                <input value={routeForm.destination} onChange={(e) => updateRouteForm('destination', e.target.value)} placeholder="Vaishali Nagar" required />
              </label>
              <label className="admin-field">
                <span>Total duration (minutes) *</span>
                <input type="number" min="1" max="240" value={routeForm.durationMinutes} onChange={(e) => updateRouteForm('durationMinutes', e.target.value)} required />
              </label>
              <label className="admin-field admin-field-wide">
                <span>Stops and ETA *</span>
                <textarea
                  rows={4}
                  value={routeForm.stopsText}
                  onChange={(e) => updateRouteForm('stopsText', e.target.value)}
                  placeholder={'Elements Mall | 20\nMansarovar Metro Station | 30'}
                  required
                />
                <small>One stop per line: stop name | minutes after departure</small>
              </label>
            </div>
            <div className="admin-form-actions">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setShowRouteForm(false)}>Close</button>
              <button type="submit" className="admin-btn admin-btn-primary" disabled={routeSaving}>
                {routeSaving ? 'Saving…' : editingRouteId ? 'Save changes' : 'Create route'}
              </button>
            </div>
          </form>
        )}

        {routes.length === 0 && <div className="admin-empty">No routes available yet.</div>}
        {routes.length > 0 && (
          <ul className="admin-route-list">
            {routes.map((route) => (
              <li key={route._id} className="admin-route-item">
                <div>
                  <strong><MapPin size={15} /> {route.name}</strong>
                  <span>{route.origin} → {route.destination} · {route.availableStops.length} stop{route.availableStops.length === 1 ? '' : 's'} · {route.durationMinutes} min</span>
                </div>
                <div className="admin-slot-actions">
                  <button type="button" className="admin-btn admin-btn-ghost" onClick={() => openEditRoute(route)}>
                    <Edit3 size={15} /><span>Edit</span>
                  </button>
                  <button type="button" className="admin-btn admin-btn-danger" onClick={() => handleDeleteRoute(route)}>
                    <Trash2 size={15} /><span>Delete</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div id="admin-cancellations" className="admin-section-anchor" aria-hidden="true" />

      {/* Load view */}
      <section id="admin-shuttles" className="admin-panel no-print" aria-labelledby="admin-load-title">
        <div className="admin-panel-head">
          <h3 id="admin-load-title" className="admin-panel-title">Seats booked on {formatDate(date)}</h3>
          {load && (
            <p className="admin-stats">
              <strong>{totals.booked}</strong> of {totals.seats} seats booked · <strong>{totals.busy}</strong> nearly full or full
              {totals.cancelled > 0 && <> · <strong>{totals.cancelled}</strong> cancelled</>}
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
                <li key={slot._id} className={`admin-slot ${slot.runsOnDate && !slot.cancelled ? '' : 'admin-slot-off'}`}>
                  <div className="admin-slot-main">
                    <div className="admin-slot-time">{slot.time}</div>
                    <div className="admin-slot-meta">
                      <span className="admin-slot-bus">{slot.busNumber}</span>
                      <span>
                        {slot.routeName ? `${slot.routeName} · ` : ''}
                        {slot.direction === 'City to Campus' ? 'City ➔ Campus' : 'Campus ➔ City'} · {slot.period}
                      </span>
                    </div>
                    <div className="admin-badges">
                      {slot.cancelled && <span className="admin-badge admin-badge-full">Cancelled for this date</span>}
                      {!slot.cancelled && info.isFull && <span className="admin-badge admin-badge-full">Full</span>}
                      {!slot.cancelled && info.isNearlyFull && <span className="admin-badge admin-badge-warn">Nearly full</span>}
                      {!slot.runsOnDate && <span className="admin-badge admin-badge-muted">Not scheduled on {load.weekday}</span>}
                      {slot.cancelledByAdmin > 0 && (
                        <span className="admin-badge admin-badge-cancel">{slot.cancelledByAdmin} booking{slot.cancelledByAdmin === 1 ? '' : 's'} cancelled</span>
                      )}
                    </div>
                    {slot.cancelled && <div className="admin-slot-reason">Reason: {slot.cancelReason}</div>}
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
                    <button
                      type="button"
                      className="admin-btn admin-btn-danger"
                      onClick={() => openCancel(slot)}
                      disabled={slot.cancelled}
                    >
                      <XCircle size={15} />
                      <span>{slot.cancelled ? 'Cancelled' : 'Cancel shuttle'}</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Daily passenger report */}
      <section id="admin-passengers" className="admin-panel admin-print-area admin-daily-report" aria-labelledby="admin-daily-passengers-title">
        <div className="admin-panel-head">
          <div>
            <h3 id="admin-daily-passengers-title" className="admin-panel-title">
              Passenger lists · {formatDate(date)}
            </h3>
            <p className="admin-stats">
              Confirmed passengers across all shuttles · {dailyPassengers?.count || 0} passenger{dailyPassengers?.count === 1 ? '' : 's'}
            </p>
          </div>
          <div className="admin-head-actions no-print">
            <button type="button" className="admin-btn admin-btn-ghost" onClick={loadDailyPassengers} disabled={dailyPassengersLoading}>
              <RefreshCw size={15} className={dailyPassengersLoading ? 'admin-spin' : ''} />
              <span>Refresh list</span>
            </button>
            <button type="button" className="admin-btn admin-btn-primary" onClick={() => window.print()}>
              <Printer size={15} />
              <span>Print report</span>
            </button>
          </div>
        </div>

        {dailyPassengersLoading && <div className="admin-empty">Loading passenger report…</div>}
        {dailyPassengersError && <div className="admin-alert admin-alert-error" role="alert">{dailyPassengersError}</div>}
        {!dailyPassengersLoading && !dailyPassengersError && dailyPassengers?.count === 0 && (
          <div className="admin-empty">No confirmed passengers for this date. The empty report can still be printed.</div>
        )}
        {!dailyPassengersLoading && !dailyPassengersError && dailyPassengers?.count > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">Shuttle</th>
                  <th scope="col">Seat</th>
                  <th scope="col">Name</th>
                  <th scope="col">Roll no.</th>
                  <th scope="col">Email</th>
                  <th scope="col">Stop</th>
                  <th scope="col">Booking code</th>
                </tr>
              </thead>
              <tbody>
                {dailyPassengers.passengers.map((passenger) => (
                  <tr key={passenger._id}>
                    <td>
                      <strong>{passenger.slot.time} · {passenger.slot.busNumber}</strong>
                      <br />
                      <span className="admin-table-secondary">
                        {passenger.slot.routeName ? `${passenger.slot.routeName} · ` : ''}
                        {passenger.slot.direction === 'City to Campus' ? 'City ➔ Campus' : 'Campus ➔ City'}
                      </span>
                    </td>
                    <td className="admin-seat-cell">{passenger.seatNumber}</td>
                    <td>{passenger.passengerName}</td>
                    <td>{passenger.passengerRoll}</td>
                    <td>{passenger.passengerEmail}</td>
                    <td className="admin-stop-cell">{passenger.stop}</td>
                    <td>{passenger.bookingCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Passenger list for one shuttle */}
      {passengerSlot && (
        <section id="admin-passenger-detail" className="admin-panel admin-print-area" ref={passengerRef} aria-labelledby="admin-pax-title">
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
                      <strong>{formatDate(date)}</strong> for this shuttle, and students won&apos;t be able to book it on
                      that date. It cannot be undone.
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
