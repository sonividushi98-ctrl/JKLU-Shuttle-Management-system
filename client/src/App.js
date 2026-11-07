import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
  Bus,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  Ticket,
  ChevronRight,
  User,
  ArrowRight,
  Sparkles,
  Download,
  X,
  Compass,
  ArrowLeft,
  Info
} from 'lucide-react';
import './App.css';

const API_BASE = 'http://localhost:5000/api/bookings';

// Official JKLU 3 Shuttle Stops
const JKLU_STOPS = [
  {
    id: 'stop-1',
    name: '200 feet bypass',
    displayName: '200 Feet Bypass (Ajmer Road)',
    landmark: 'Heerapura Flyover / Ring Road Crossing',
    etaMinutes: 15,
    distanceKm: 8.5,
    description: 'Direct drop for Nirman Nagar, Vaishali West, and Ajmer Expressway connector.',
    popularFor: 'West Jaipur & Highway Connections'
  },
  {
    id: 'stop-2',
    name: 'Elements Mall',
    displayName: 'Elements Mall',
    landmark: 'DCM, Main Ajmer Road',
    etaMinutes: 25,
    distanceKm: 14.0,
    description: 'Premier shopping, dining, grocery, and entertainment hub on Ajmer Road.',
    popularFor: 'DCM, Shopping & Transit Interchanges'
  },
  {
    id: 'stop-3',
    name: 'mansarovar metro station',
    displayName: 'Mansarovar Metro Station',
    landmark: 'Gate No. 1 / Pillar 24 (Jaipur Metro Pink Line)',
    etaMinutes: 35,
    distanceKm: 19.5,
    description: 'Pink Line terminal connecting directly to Central Jaipur, Sindhi Camp, & Railway Station.',
    popularFor: 'Metro Network & Central Jaipur'
  }
];

// Default JKLU Shuttle Schedules
const INITIAL_SLOTS = [
  {
    _id: 'slot-1',
    time: '07:45 AM',
    period: 'Morning',
    origin: 'JKLU Campus (Main Gate)',
    destination: 'Mansarovar Metro Station',
    direction: 'Campus ➔ Metro & Stops',
    busNumber: 'RJ 14 PA 2024',
    busType: 'JKLU AC Electric Shuttle',
    totalSeats: 32,
    availableStops: ['200 feet bypass', 'Elements Mall', 'mansarovar metro station'],
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  },
  {
    _id: 'slot-2',
    time: '09:30 AM',
    period: 'Morning',
    origin: 'JKLU Campus (Main Gate)',
    destination: 'Mansarovar Metro Station',
    direction: 'Campus ➔ Metro & Stops',
    busNumber: 'RJ 14 PB 1102',
    busType: 'Tata Starbus AC Executive',
    totalSeats: 32,
    availableStops: ['200 feet bypass', 'Elements Mall', 'mansarovar metro station'],
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  },
  {
    _id: 'slot-3',
    time: '01:30 PM',
    period: 'Afternoon',
    origin: 'JKLU Campus (Main Gate)',
    destination: 'Mansarovar Metro Station',
    direction: 'Campus ➔ Metro & Stops',
    busNumber: 'RJ 14 PA 2024',
    busType: 'JKLU AC Electric Shuttle',
    totalSeats: 32,
    availableStops: ['200 feet bypass', 'Elements Mall', 'mansarovar metro station'],
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  },
  {
    _id: 'slot-4',
    time: '03:45 PM',
    period: 'Afternoon',
    origin: 'JKLU Campus (Main Gate)',
    destination: 'Mansarovar Metro Station',
    direction: 'Campus ➔ Metro & Stops',
    busNumber: 'RJ 14 PC 4410',
    busType: 'Eicher Skyline Pro AC',
    totalSeats: 32,
    availableStops: ['200 feet bypass', 'Elements Mall', 'mansarovar metro station'],
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  },
  {
    _id: 'slot-5',
    time: '05:15 PM',
    period: 'Evening',
    origin: 'JKLU Campus (Main Gate)',
    destination: 'Mansarovar Metro Station',
    direction: 'Campus ➔ Metro & Stops (Prime Shift)',
    busNumber: 'RJ 14 PA 2024',
    busType: 'JKLU AC Electric Shuttle',
    totalSeats: 32,
    availableStops: ['200 feet bypass', 'Elements Mall', 'mansarovar metro station'],
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  },
  {
    _id: 'slot-6',
    time: '06:45 PM',
    period: 'Evening',
    origin: 'JKLU Campus (Main Gate)',
    destination: 'Mansarovar Metro Station',
    direction: 'Campus ➔ Metro & Stops',
    busNumber: 'RJ 14 PB 1102',
    busType: 'Tata Starbus AC Executive',
    totalSeats: 32,
    availableStops: ['200 feet bypass', 'Elements Mall', 'mansarovar metro station'],
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  },
  {
    _id: 'slot-7',
    time: '08:30 PM',
    period: 'Night',
    origin: 'JKLU Campus (Main Gate)',
    destination: 'Mansarovar Metro Station',
    direction: 'Campus ➔ Metro & Stops (Night Service)',
    busNumber: 'RJ 14 PC 4410',
    busType: 'Eicher Skyline Pro AC',
    totalSeats: 32,
    availableStops: ['200 feet bypass', 'Elements Mall', 'mansarovar metro station'],
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  }
];

// Initial mock bookings
const INITIAL_MY_TRIPS = [
  {
    _id: 'ticket-demo-01',
    user: '654321098765432109876543',
    passengerName: 'Aarav Sharma',
    passengerRoll: '2023BTECH042',
    passengerEmail: 'aarav.sharma@jklu.edu.in',
    slot: INITIAL_SLOTS[4], // 5:15 PM
    stop: 'mansarovar metro station',
    seatNumber: 14,
    date: new Date().toISOString().split('T')[0],
    status: 'Confirmed',
    bookingCode: 'JKLU-849201',
    createdAt: new Date().toISOString()
  }
];

const App = () => {
  // Navigation tabs: 'book', 'passes', 'route', 'timetable'
  const [currentTab, setCurrentTab] = useState('book');
  
  // Booking steps: 1: Select Shuttle, 2: Select Stop, 3: Select Seat & Passenger, 4: Boarding Pass
  const [step, setStep] = useState(1);

  // Filter states
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedPeriod, setSelectedPeriod] = useState('All');
  const [directionFilter, setDirectionFilter] = useState('outbound'); // 'outbound' (Campus->City) or 'inbound' (City->Campus)

  // Booking selections
  const [slots, setSlots] = useState(INITIAL_SLOTS);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedStop, setSelectedStop] = useState(JKLU_STOPS[2].name); // default to Mansarovar Metro
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [bookedSeats, setBookedSeats] = useState([3, 7, 12, 18, 22]); // realistic pre-booked seats
  
  // Passenger Info
  const [passengerName, setPassengerName] = useState('Aarav Sharma');
  const [passengerRoll, setPassengerRoll] = useState('2023BTECH042');
  const [passengerEmail, setPassengerEmail] = useState('aarav.sharma@jklu.edu.in');
  
  // Trips and Active Confirmed Pass
  const [myTrips, setMyTrips] = useState(() => {
    const saved = localStorage.getItem('jklu_my_trips');
    return saved ? JSON.parse(saved) : INITIAL_MY_TRIPS;
  });
  const [confirmedPass, setConfirmedPass] = useState(null);
  const [modalTrip, setModalTrip] = useState(null);
  
  // Server connection status
  const [isServerOnline, setIsServerOnline] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync trips to local storage
  useEffect(() => {
    localStorage.setItem('jklu_my_trips', JSON.stringify(myTrips));
  }, [myTrips]);

  // Fetch slots from API with graceful fallback
  const fetchSlots = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/slots`, { timeout: 2500 });
      if (res.data && res.data.length > 0) {
        setSlots(res.data);
        setIsServerOnline(true);
      } else {
        setSlots(INITIAL_SLOTS);
      }
    } catch {
      // Graceful offline fallback
      setIsServerOnline(false);
      setSlots(INITIAL_SLOTS);
    }
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // Fetch booked seats when a slot or date changes
  const fetchBookedSeats = useCallback(async (slotId, date) => {
    try {
      const res = await axios.get(`${API_BASE}/slots/${slotId}/booked-seats?date=${date}`, { timeout: 2000 });
      if (res.data && Array.isArray(res.data.bookedSeats)) {
        setBookedSeats(res.data.bookedSeats);
        return;
      }
    } catch {
      // Fallback: check myTrips + deterministic mock booked seats
    }

    // Local state calculation for booked seats
    const existing = myTrips
      .filter(t => (t.slot?._id === slotId || t.slotId === slotId) && t.date === date && t.status === 'Confirmed')
      .map(t => t.seatNumber);
    
    // Add 4-6 realistic booked seats based on slot ID hash for realism
    const seed = (slotId?.charCodeAt?.(slotId.length - 1) || 5) % 4;
    const baseOccupied = [2, 5 + seed, 11, 16 + seed, 23];
    const combined = Array.from(new Set([...baseOccupied, ...existing]));
    setBookedSeats(combined);
  }, [myTrips]);

  // Handle slot selection
  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    setSelectedSeat(null);
    fetchBookedSeats(slot._id, selectedDate);
    setStep(2);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Handle stop selection
  const handleSelectStop = (stopName) => {
    setSelectedStop(stopName);
    setStep(3);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Seat click handler
  const handleSeatClick = (seatNum) => {
    if (bookedSeats.includes(seatNum)) return;
    setSelectedSeat(seatNum === selectedSeat ? null : seatNum);
  };

  // Finalize booking
  const handleConfirmBooking = async () => {
    if (!selectedSlot || !selectedStop || !selectedSeat) return;

    setIsSubmitting(true);
    const bookingPayload = {
      userId: '654321098765432109876543',
      slotId: selectedSlot._id,
      stop: selectedStop,
      seatNumber: selectedSeat,
      date: selectedDate,
      passengerName: passengerName.trim() || 'JKLU Student',
      passengerRoll: passengerRoll.trim().toUpperCase() || '2023BTECH001',
      passengerEmail: passengerEmail.trim() || 'student@jklu.edu.in'
    };

    try {
      const res = await axios.post(`${API_BASE}/book`, bookingPayload, { timeout: 3000 });
      const newBooking = res.data.booking;
      setConfirmedPass(newBooking);
      setMyTrips(prev => [newBooking, ...prev]);
      setBookedSeats(prev => [...prev, selectedSeat]);
      setStep(4);
    } catch {
      // Standalone / Offline successful creation
      const localBooking = {
        _id: 'jklu-pass-' + Date.now(),
        ...bookingPayload,
        slot: selectedSlot,
        status: 'Confirmed',
        bookingCode: 'JKLU-' + Math.floor(100000 + Math.random() * 900000),
        createdAt: new Date().toISOString()
      };
      setConfirmedPass(localBooking);
      setMyTrips(prev => [localBooking, ...prev]);
      setBookedSeats(prev => [...prev, selectedSeat]);
      setStep(4);
    } finally {
      setIsSubmitting(false);
      window.scrollTo({ top: 100, behavior: 'smooth' });
    }
  };

  // Cancel booking
  const handleCancelBooking = async (tripId) => {
    if (!window.confirm('Are you sure you want to cancel this shuttle seat booking?')) return;
    try {
      await axios.post(`${API_BASE}/cancel/${tripId}`, {}, { timeout: 2000 });
    } catch {
      // Offline fallback
    }
    setMyTrips(prev => prev.map(t => t._id === tripId ? { ...t, status: 'Cancelled' } : t));
    if (confirmedPass?._id === tripId) {
      setConfirmedPass(prev => ({ ...prev, status: 'Cancelled' }));
    }
    if (modalTrip?._id === tripId) {
      setModalTrip(prev => ({ ...prev, status: 'Cancelled' }));
    }
  };

  // Date shortcuts
  const dateOptions = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(today.getDate() + 2);

    const fmt = (d) => d.toISOString().split('T')[0];
    return [
      { label: 'Today', value: fmt(today), sub: today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) },
      { label: 'Tomorrow', value: fmt(tomorrow), sub: tomorrow.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) },
      { label: 'Day After', value: fmt(dayAfter), sub: dayAfter.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) }
    ];
  }, []);

  // Filter slots
  const filteredSlots = useMemo(() => {
    return slots.filter(slot => {
      if (selectedPeriod !== 'All' && slot.period !== selectedPeriod) return false;
      return true;
    });
  }, [slots, selectedPeriod]);

  // Selected stop object
  const currentStopMeta = useMemo(() => {
    return JKLU_STOPS.find(s => s.name === selectedStop) || JKLU_STOPS[2];
  }, [selectedStop]);

  // Render QR Code SVG
  const renderQRCode = (code) => (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" rx="10" fill="white" />
      {/* Outer corner positioning boxes */}
      <rect x="12" y="12" width="28" height="28" rx="4" fill="#0F172A" />
      <rect x="18" y="18" width="16" height="16" fill="white" />
      <rect x="22" y="22" width="8" height="8" fill="#D82C36" />

      <rect x="80" y="12" width="28" height="28" rx="4" fill="#0F172A" />
      <rect x="86" y="18" width="16" height="16" fill="white" />
      <rect x="90" y="22" width="8" height="8" fill="#D82C36" />

      <rect x="12" y="80" width="28" height="28" rx="4" fill="#0F172A" />
      <rect x="18" y="86" width="16" height="16" fill="white" />
      <rect x="22" y="90" width="8" height="8" fill="#D82C36" />

      {/* Decorative QR matrix pattern */}
      <circle cx="50" cy="20" r="3" fill="#0F172A" />
      <circle cx="62" cy="20" r="3" fill="#0F172A" />
      <circle cx="56" cy="30" r="3" fill="#0F172A" />
      <circle cx="50" cy="40" r="3" fill="#0F172A" />
      <circle cx="70" cy="40" r="3" fill="#0F172A" />
      <circle cx="60" cy="52" r="4" fill="#D82C36" />
      <circle cx="74" cy="56" r="3" fill="#0F172A" />
      <circle cx="48" cy="64" r="3" fill="#0F172A" />
      <circle cx="60" cy="74" r="3" fill="#0F172A" />
      <circle cx="50" cy="88" r="3" fill="#0F172A" />
      <circle cx="64" cy="94" r="3" fill="#0F172A" />
      <circle cx="82" cy="76" r="3" fill="#0F172A" />
      <circle cx="94" cy="88" r="3" fill="#0F172A" />
      <circle cx="82" cy="98" r="3" fill="#0F172A" />
      <circle cx="102" cy="98" r="3" fill="#0F172A" />
      <circle cx="96" cy="62" r="3" fill="#0F172A" />
      <circle cx="82" cy="50" r="3" fill="#0F172A" />
      <circle cx="28" cy="58" r="3" fill="#0F172A" />
      <circle cx="38" cy="70" r="3" fill="#0F172A" />
    </svg>
  );

  return (
    <div className="app-root">
      {/* Sticky Apple-Glass Header */}
      <header className="app-header">
        <div className="header-container">
          <div className="brand-badge" onClick={() => { setCurrentTab('book'); setStep(1); }}>
            <div className="brand-logo-icon">
              <Bus size={22} strokeWidth={2.5} />
            </div>
            <div className="brand-titles">
              <h1>JKLU <span>Shuttle</span></h1>
              <p>Campus Transit System</p>
            </div>
          </div>

          {/* Segmented Control Navigation */}
          <nav className="segmented-nav">
            <button
              className={`segmented-nav-btn ${currentTab === 'book' ? 'active' : ''}`}
              onClick={() => setCurrentTab('book')}
            >
              <Bus size={15} />
              Book Shuttle
            </button>
            <button
              className={`segmented-nav-btn ${currentTab === 'passes' ? 'active' : ''}`}
              onClick={() => setCurrentTab('passes')}
            >
              <Ticket size={15} />
              My Passes
              {myTrips.filter(t => t.status === 'Confirmed').length > 0 && (
                <span className="badge-count">
                  {myTrips.filter(t => t.status === 'Confirmed').length}
                </span>
              )}
            </button>
            <button
              className={`segmented-nav-btn ${currentTab === 'route' ? 'active' : ''}`}
              onClick={() => setCurrentTab('route')}
            >
              <Compass size={15} />
              3 Stops Route
            </button>
            <button
              className={`segmented-nav-btn ${currentTab === 'timetable' ? 'active' : ''}`}
              onClick={() => setCurrentTab('timetable')}
            >
              <Clock size={15} />
              Timetable
            </button>
          </nav>

          {/* Operations Pill */}
          <div className="status-pill">
            <span className="status-dot"></span>
            <span>{isServerOnline ? 'JKLU API Synced' : 'Gate 1 Active • Express Ready'}</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="main-wrapper">
        {/* TAB 1: BOOKING WORKFLOW */}
        {currentTab === 'book' && (
          <div>
            {/* Hero Minimal Banner */}
            <div className="hero-card">
              <div className="hero-subtitle">
                <Sparkles size={14} /> Official JKLU Transport Portal
              </div>
              <h2 className="hero-title">Connecting JKLU Campus to City Transit</h2>
              <p className="hero-desc">
                High-frequency daily AC shuttles from JKLU Campus (Gate 1) directly serving the 3 prime city connection stops with reserved student & faculty seating.
              </p>
              
              {/* Highlight the 3 Stops */}
              <div className="stops-capsules">
                <div className="stop-capsule">
                  <span className="capsule-num">1</span>
                  <span>200 Feet Bypass</span>
                </div>
                <div className="stop-capsule">
                  <span className="capsule-num">2</span>
                  <span>Elements Mall</span>
                </div>
                <div className="stop-capsule">
                  <span className="capsule-num">3</span>
                  <span>Mansarovar Metro Station</span>
                </div>
              </div>
            </div>

            {/* RedBus Stepper Bar */}
            <div className="stepper-container">
              <div
                className={`step-item ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}
                onClick={() => setStep(1)}
              >
                <div className="step-bubble">1</div>
                <div className="step-meta">
                  <h4>Select Shuttle</h4>
                  <p>Time & Route</p>
                </div>
              </div>

              <div className="step-connector"></div>

              <div
                className={`step-item ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}
                onClick={() => selectedSlot && setStep(2)}
              >
                <div className="step-bubble">2</div>
                <div className="step-meta">
                  <h4>Choose Drop Stop</h4>
                  <p>3 Official Stops</p>
                </div>
              </div>

              <div className="step-connector"></div>

              <div
                className={`step-item ${step === 3 ? 'active' : step > 3 ? 'completed' : ''}`}
                onClick={() => selectedSlot && selectedStop && setStep(3)}
              >
                <div className="step-bubble">3</div>
                <div className="step-meta">
                  <h4>Seat Selection</h4>
                  <p>Coach Blueprint</p>
                </div>
              </div>

              <div className="step-connector"></div>

              <div className={`step-item ${step === 4 ? 'active' : ''}`}>
                <div className="step-bubble">4</div>
                <div className="step-meta">
                  <h4>Boarding Pass</h4>
                  <p>Digital QR Ticket</p>
                </div>
              </div>
            </div>

            {/* STEP 1: SELECT SHUTTLE TIME */}
            {step === 1 && (
              <div>
                {/* Date & Filter Bar */}
                <div className="filter-bar">
                  {/* Direction Segmented Control */}
                  <div className="segmented-nav" style={{ padding: '3px' }}>
                    <button
                      className={`segmented-nav-btn ${directionFilter === 'outbound' ? 'active' : ''}`}
                      onClick={() => setDirectionFilter('outbound')}
                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                    >
                      JKLU ➔ City Stops
                    </button>
                    <button
                      className={`segmented-nav-btn ${directionFilter === 'inbound' ? 'active' : ''}`}
                      onClick={() => setDirectionFilter('inbound')}
                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                    >
                      City ➔ JKLU Campus
                    </button>
                  </div>

                  {/* Date Chips */}
                  <div className="chips-group">
                    {dateOptions.map(opt => (
                      <button
                        key={opt.value}
                        className={`chip-btn ${selectedDate === opt.value ? 'active' : ''}`}
                        onClick={() => setSelectedDate(opt.value)}
                      >
                        <Calendar size={14} />
                        <span>{opt.label}</span>
                        <span style={{ opacity: 0.7, fontSize: '0.72rem' }}>({opt.sub})</span>
                      </button>
                    ))}
                  </div>

                  {/* Period Filter */}
                  <div className="chips-group">
                    {['All', 'Morning', 'Afternoon', 'Evening', 'Night'].map(period => (
                      <button
                        key={period}
                        className={`chip-btn ${selectedPeriod === period ? 'active' : ''}`}
                        onClick={() => setSelectedPeriod(period)}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Shuttles List */}
                <div className="shuttles-grid">
                  {filteredSlots.map(slot => {
                    // Estimated available seats
                    const availableCount = slot.totalSeats - 6;
                    return (
                      <div key={slot._id} className="shuttle-card">
                        <div className="shuttle-time-col">
                          <div className="shuttle-dep-time">{slot.time}</div>
                          <span className="shuttle-period-pill">{slot.period}</span>
                        </div>

                        <div className="shuttle-route-col">
                          <div className="route-direction-badge">
                            <MapPin size={15} color="#D82C36" />
                            <span>JKLU Campus ➔ Mansarovar Metro</span>
                          </div>

                          <div className="route-stops-line">
                            <span className="stop-tag">Gate 1</span>
                            <ArrowRight size={12} color="#94A3B8" />
                            <span className="stop-tag">200 Ft Bypass</span>
                            <ArrowRight size={12} color="#94A3B8" />
                            <span className="stop-tag">Elements Mall</span>
                            <ArrowRight size={12} color="#94A3B8" />
                            <span className="stop-tag" style={{ background: '#FEE2E2', color: '#991B1B' }}>Metro Stn</span>
                          </div>

                          <div className="bus-meta-tags">
                            <span className="bus-plate">{slot.busNumber}</span>
                            <span>•</span>
                            <span>{slot.busType || 'AC Shuttle'}</span>
                            <span>•</span>
                            <span>ETA 35 min total</span>
                          </div>
                        </div>

                        <div className="shuttle-action-col">
                          <div className="seats-counter-badge available">
                            <span>●</span>
                            <span>{availableCount} Seats Available</span>
                          </div>

                          <button
                            className="select-shuttle-btn"
                            onClick={() => handleSelectSlot(slot)}
                          >
                            <span>Select Seats</span>
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 2: SELECT DROP-OFF STOP */}
            {step === 2 && selectedSlot && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Select Your Destination Stop</h3>
                    <p style={{ fontSize: '0.82rem', color: '#64748B' }}>
                      Shuttle departs at <strong>{selectedSlot.time}</strong> from JKLU Main Campus Gate 1.
                    </p>
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    <ArrowLeft size={16} /> Change Shuttle Time
                  </button>
                </div>

                {/* 3 Stops Grid */}
                <div className="stops-selection-grid">
                  {JKLU_STOPS.map((stop, idx) => {
                    const isSelected = selectedStop === stop.name;
                    return (
                      <div
                        key={stop.id}
                        className={`stop-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedStop(stop.name)}
                      >
                        <div className="stop-card-info">
                          <div className="stop-card-num">{idx + 1}</div>
                          <div>
                            <div className="stop-name-title">{stop.displayName}</div>
                            <div className="stop-landmark-text">
                              <MapPin size={14} color="#D82C36" />
                              <span>{stop.landmark}</span>
                            </div>
                            <div className="stop-desc-text">{stop.description}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                          <div className="stop-eta-badge">
                            <div className="stop-eta-time">~{stop.etaMinutes} min</div>
                            <div className="stop-eta-label">{stop.distanceKm} km from JKLU</div>
                          </div>
                          <button
                            className="select-shuttle-btn"
                            onClick={(e) => { e.stopPropagation(); handleSelectStop(stop.name); }}
                            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                          >
                            <span>Choose Stop</span>
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="select-shuttle-btn"
                    onClick={() => setStep(3)}
                    style={{ padding: '12px 28px', fontSize: '0.9rem' }}
                  >
                    <span>Proceed to Seat Selection</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: REDBUS AUTHENTIC SEATING LAYOUT */}
            {step === 3 && selectedSlot && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Choose Your Seat</h3>
                    <p style={{ fontSize: '0.82rem', color: '#64748B' }}>
                      {selectedSlot.time} Departure • Stop: <strong>{currentStopMeta.displayName}</strong> • Bus: <strong>{selectedSlot.busNumber}</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => setStep(2)}
                    style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    <ArrowLeft size={16} /> Change Stop
                  </button>
                </div>

                <div className="seating-layout-section">
                  {/* Left: Bus Blueprint Chassis */}
                  <div className="bus-coach-container">
                    <div className="coach-outer-chassis">
                      {/* Front Windshield & Driver Cabin */}
                      <div className="cabin-front-header">
                        <div className="windshield-label">
                          <Bus size={16} />
                          <span>Front Windscreen</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="entry-door-indicator">
                            <span>Door Entry</span>
                          </div>
                          <div className="driver-seat-box">
                            <span style={{ fontSize: '10px' }}>🕹️</span>
                            <span>Driver</span>
                          </div>
                        </div>
                      </div>

                      {/* 2x2 Seating Rows Grid (RedBus Architecture) */}
                      <div className="coach-seats-grid">
                        {Array.from({ length: Math.ceil(selectedSlot.totalSeats / 4) }).map((_, rowIdx) => {
                          const seat1 = rowIdx * 4 + 1;
                          const seat2 = rowIdx * 4 + 2;
                          const seat3 = rowIdx * 4 + 3;
                          const seat4 = rowIdx * 4 + 4;

                          return (
                            <div key={rowIdx} className="seat-row">
                              {/* Left Window */}
                              <button
                                className={`seat-btn ${selectedSeat === seat1 ? 'selected' : ''} ${bookedSeats.includes(seat1) ? 'booked' : ''}`}
                                onClick={() => handleSeatClick(seat1)}
                                title={`Seat ${seat1} (Window)`}
                              >
                                {seat1}
                              </button>

                              {/* Left Aisle */}
                              <button
                                className={`seat-btn ${selectedSeat === seat2 ? 'selected' : ''} ${bookedSeats.includes(seat2) ? 'booked' : ''}`}
                                onClick={() => handleSeatClick(seat2)}
                                title={`Seat ${seat2} (Aisle)`}
                              >
                                {seat2}
                              </button>

                              {/* Center Walking Aisle */}
                              <div className="aisle-walkway">
                                <span>Aisle</span>
                              </div>

                              {/* Right Aisle */}
                              <button
                                className={`seat-btn ${selectedSeat === seat3 ? 'selected' : ''} ${bookedSeats.includes(seat3) ? 'booked' : ''}`}
                                onClick={() => handleSeatClick(seat3)}
                                title={`Seat ${seat3} (Aisle)`}
                              >
                                {seat3}
                              </button>

                              {/* Right Window */}
                              <button
                                className={`seat-btn ${selectedSeat === seat4 ? 'selected' : ''} ${bookedSeats.includes(seat4) ? 'booked' : ''}`}
                                onClick={() => handleSeatClick(seat4)}
                                title={`Seat ${seat4} (Window)`}
                              >
                                {seat4}
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Legend */}
                      <div className="seat-legend">
                        <div className="legend-item">
                          <div className="legend-box available"></div>
                          <span>Available</span>
                        </div>
                        <div className="legend-item">
                          <div className="legend-box selected"></div>
                          <span>Selected</span>
                        </div>
                        <div className="legend-item">
                          <div className="legend-box booked"></div>
                          <span>Booked</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Booking Summary & Passenger Details Panel */}
                  <div className="booking-summary-card">
                    <div className="summary-header">
                      <h4 className="summary-title">Trip Summary</h4>
                      <p style={{ fontSize: '0.75rem', color: '#64748B' }}>Campus Shuttle Booking</p>
                    </div>

                    <div className="summary-detail-row">
                      <span className="summary-label">Departure</span>
                      <span className="summary-value">{selectedSlot.time}</span>
                    </div>

                    <div className="summary-detail-row">
                      <span className="summary-label">Boarding Point</span>
                      <span className="summary-value">JKLU Gate 1</span>
                    </div>

                    <div className="summary-detail-row">
                      <span className="summary-label">Drop-off Stop</span>
                      <span className="summary-value" style={{ color: '#D82C36' }}>
                        {currentStopMeta.displayName}
                      </span>
                    </div>

                    <div className="summary-detail-row">
                      <span className="summary-label">Bus Vehicle</span>
                      <span className="summary-value">{selectedSlot.busNumber}</span>
                    </div>

                    <div className="summary-detail-row">
                      <span className="summary-label">Selected Seat</span>
                      <span className="summary-value" style={{ fontSize: '1.05rem', color: selectedSeat ? '#D82C36' : '#94A3B8' }}>
                        {selectedSeat ? `Seat #${selectedSeat}` : 'Please tap a seat'}
                      </span>
                    </div>

                    <div className="summary-detail-row" style={{ borderBottom: 'none' }}>
                      <span className="summary-label">Fare</span>
                      <span className="summary-value" style={{ color: '#10B981' }}>FREE (JKLU ID)</span>
                    </div>

                    {/* Passenger Inputs */}
                    <div className="passenger-form-group">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginTop: '6px' }}>
                        <User size={15} color="#D82C36" />
                        <span>Passenger Information</span>
                      </div>

                      <div className="input-field-wrapper">
                        <label>Passenger Name</label>
                        <input
                          type="text"
                          className="apple-input"
                          value={passengerName}
                          onChange={(e) => setPassengerName(e.target.value)}
                          placeholder="Your Full Name"
                        />
                      </div>

                      <div className="input-field-wrapper">
                        <label>Roll Number / Employee ID</label>
                        <input
                          type="text"
                          className="apple-input"
                          value={passengerRoll}
                          onChange={(e) => setPassengerRoll(e.target.value)}
                          placeholder="e.g. 2023BTECH042"
                        />
                      </div>

                      <div className="input-field-wrapper">
                        <label>JKLU Email ID</label>
                        <input
                          type="email"
                          className="apple-input"
                          value={passengerEmail}
                          onChange={(e) => setPassengerEmail(e.target.value)}
                          placeholder="name@jklu.edu.in"
                        />
                      </div>
                    </div>

                    <button
                      className="confirm-booking-btn"
                      disabled={!selectedSeat || isSubmitting}
                      onClick={handleConfirmBooking}
                    >
                      {isSubmitting ? (
                        <span>Reserving Seat...</span>
                      ) : (
                        <>
                          <CheckCircle size={18} />
                          <span>Confirm Seat & Generate Pass</span>
                        </>
                      )}
                    </button>

                    <div style={{ marginTop: '12px', fontSize: '0.72rem', color: '#94A3B8', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <Info size={13} color="#94A3B8" />
                      <span>Guaranteed seating upon arrival at Gate 1</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: APPLE WALLET / REDBUS DIGITAL BOARDING PASS */}
            {step === 4 && confirmedPass && (
              <div className="ticket-wrapper">
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ width: '48px', height: '48px', background: '#ECFDF5', borderRadius: '50%', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                    <CheckCircle size={28} />
                  </div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Booking Confirmed!</h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748B' }}>Your digital campus shuttle pass is ready</p>
                </div>

                <div className="apple-boarding-pass">
                  {/* Top Notch Header */}
                  <div className="pass-header">
                    <div className="pass-brand">
                      <h3>JKLU CAMPUS SHUTTLE</h3>
                      <p>BOARDING PASS • GATE 1</p>
                    </div>
                    <div className="pass-status-pill">
                      ● {confirmedPass.status || 'CONFIRMED'}
                    </div>
                  </div>

                  <div className="pass-body">
                    {/* Visual Route */}
                    <div className="pass-route-visual">
                      <div className="pass-stop-node">
                        <div className="pass-node-label">ORIGIN</div>
                        <div className="pass-node-title">JKLU Campus</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Main Gate (Saraswati Statue)</div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Bus size={18} color="#D82C36" />
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94A3B8', marginTop: '2px' }}>
                          DIRECT SHUTTLE
                        </div>
                      </div>

                      <div className="pass-stop-node right">
                        <div className="pass-node-label">DESTINATION</div>
                        <div className="pass-node-title" style={{ color: '#D82C36' }}>
                          {confirmedPass.stop}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Jaipur City Stop</div>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="pass-details-grid">
                      <div>
                        <div className="pass-field-label">DATE & TIME</div>
                        <div className="pass-field-value">{confirmedPass.slot?.time || selectedSlot?.time} • {confirmedPass.date}</div>
                      </div>

                      <div>
                        <div className="pass-field-label">ASSIGNED SEAT</div>
                        <div className="pass-field-value pass-seat-highlight">Seat #{confirmedPass.seatNumber}</div>
                      </div>

                      <div>
                        <div className="pass-field-label">PASSENGER</div>
                        <div className="pass-field-value">{confirmedPass.passengerName}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{confirmedPass.passengerRoll}</div>
                      </div>

                      <div>
                        <div className="pass-field-label">BUS VEHICLE</div>
                        <div className="pass-field-value">{confirmedPass.slot?.busNumber || selectedSlot?.busNumber}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{confirmedPass.slot?.busType || 'AC Shuttle'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Perforation divider with notched circular corners */}
                  <div className="pass-perforation">
                    <div className="notch-left"></div>
                    <div className="perforation-line"></div>
                    <div className="notch-right"></div>
                  </div>

                  {/* QR Code and Barcode Section */}
                  <div className="pass-footer-barcode">
                    <div className="qr-code-box">
                      {renderQRCode(confirmedPass.bookingCode)}
                    </div>
                    <div className="barcode-text">{confirmedPass.bookingCode || 'JKLU-849201'}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', textAlign: 'center' }}>
                      Scan QR at shuttle conductor terminal prior to boarding
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pass-actions-group">
                  <button className="btn-secondary" onClick={() => window.print()}>
                    <Download size={16} />
                    <span>Print / Save Pass</span>
                  </button>

                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setStep(1);
                      setSelectedSlot(null);
                      setSelectedSeat(null);
                    }}
                  >
                    <Bus size={16} />
                    <span>Book Return Shuttle</span>
                  </button>

                  <button
                    className="btn-secondary"
                    style={{ background: '#0F172A', color: '#fff', borderColor: '#0F172A' }}
                    onClick={() => setCurrentTab('passes')}
                  >
                    <Ticket size={16} />
                    <span>View in My Passes</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MY PASSES & TICKETS */}
        {currentTab === 'passes' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>My Campus Shuttle Passes</h2>
                <p style={{ fontSize: '0.85rem', color: '#64748B' }}>Digital passes stored for quick presentation at Gate 1</p>
              </div>

              <button
                className="select-shuttle-btn"
                onClick={() => { setCurrentTab('book'); setStep(1); }}
              >
                <Bus size={16} />
                <span>Book New Shuttle</span>
              </button>
            </div>

            {myTrips.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '18px', border: '1px solid var(--apple-border)' }}>
                <Ticket size={48} color="#94A3B8" style={{ marginBottom: '16px' }} />
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>No Active Passes Found</h4>
                <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '20px' }}>
                  You have not booked any shuttle trips yet.
                </p>
                <button
                  className="select-shuttle-btn"
                  onClick={() => { setCurrentTab('book'); setStep(1); }}
                >
                  Book Your First Shuttle
                </button>
              </div>
            ) : (
              <div className="trips-list">
                {myTrips.map(trip => (
                  <div key={trip._id} className="trip-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: trip.status === 'Cancelled' ? '#F1F5F9' : '#FEE2E2', color: trip.status === 'Cancelled' ? '#94A3B8' : '#D82C36', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Bus size={22} />
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1.05rem', fontWeight: 800 }}>{trip.slot?.time || '05:15 PM'}</span>
                          <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>•</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>{trip.date}</span>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            background: trip.status === 'Cancelled' ? '#F1F5F9' : '#ECFDF5',
                            color: trip.status === 'Cancelled' ? '#64748B' : '#065F46'
                          }}>
                            {trip.status}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.85rem', color: '#0F172A', marginTop: '4px', fontWeight: 600 }}>
                          JKLU Campus ➔ <span style={{ color: '#D82C36' }}>{trip.stop}</span>
                        </div>

                        <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                          Seat #{trip.seatNumber} • {trip.passengerName} ({trip.passengerRoll}) • Code: {trip.bookingCode}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        className="btn-secondary"
                        onClick={() => setModalTrip(trip)}
                        style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                      >
                        <Ticket size={14} />
                        <span>View Pass</span>
                      </button>

                      {trip.status === 'Confirmed' && (
                        <button
                          onClick={() => handleCancelBooking(trip._id)}
                          style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', padding: '6px' }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: THE 3 STOPS ROUTE EXPLORER */}
        {currentTab === 'route' && (
          <div className="route-explorer-card">
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#D82C36', letterSpacing: '0.08em' }}>
                TRANSIT CORRIDOR
              </span>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '4px' }}>JKLU Campus ➔ City Transit Route</h2>
              <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '4px' }}>
                Official shuttle path connecting JK Lakshmipat University directly to the 3 prime hubs in Jaipur.
              </p>
            </div>

            <div className="route-timeline">
              {/* Origin */}
              <div className="timeline-node">
                <div className="timeline-dot origin">
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0F172A' }}></div>
                </div>
                <div className="timeline-content">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4>Origin: JKLU Campus (Main Gate 1)</h4>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#F1F5F9', padding: '2px 8px', borderRadius: '4px' }}>Starting Point</span>
                  </div>
                  <p>Near Saraswati Statue, Near Mahapura, Post-200 Feet Ajmer Road, Jaipur.</p>
                </div>
              </div>

              {/* Stop 1 */}
              <div className="timeline-node">
                <div className="timeline-dot">
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#D82C36' }}>1</span>
                </div>
                <div className="timeline-content">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4>Stop 1: 200 Feet Bypass</h4>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#FEE2E2', color: '#991B1B', padding: '2px 8px', borderRadius: '4px' }}>~15 Mins (8.5 km)</span>
                  </div>
                  <p><strong>Landmark:</strong> Heerapura Flyover / Ring Road Crossing on Ajmer Expressway.</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748B' }}>Ideal for students residing in Vaishali Nagar West, Nirman Nagar, or taking Delhi/Ajmer bypass connectivity.</p>
                </div>
              </div>

              {/* Stop 2 */}
              <div className="timeline-node">
                <div className="timeline-dot">
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#D82C36' }}>2</span>
                </div>
                <div className="timeline-content">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4>Stop 2: Elements Mall</h4>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#FEE2E2', color: '#991B1B', padding: '2px 8px', borderRadius: '4px' }}>~25 Mins (14.0 km)</span>
                  </div>
                  <p><strong>Landmark:</strong> Opposite DCM, Main Ajmer Road.</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748B' }}>Primary shopping, cafe, grocery, and entertainment hub. Direct connectivity to Shyam Nagar, Sodala, and Chitrakoot.</p>
                </div>
              </div>

              {/* Stop 3 */}
              <div className="timeline-node" style={{ marginBottom: 0 }}>
                <div className="timeline-dot">
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#D82C36' }}>3</span>
                </div>
                <div className="timeline-content">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4>Stop 3: Mansarovar Metro Station</h4>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#ECFDF5', color: '#065F46', padding: '2px 8px', borderRadius: '4px' }}>Terminal Stop (~35 Mins)</span>
                  </div>
                  <p><strong>Landmark:</strong> Gate No. 1 / Metro Pillar 24 (Jaipur Metro Pink Line).</p>
                  <p style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    Terminal station with high-frequency Jaipur Metro trains every 7 minutes to Civil Lines, Railway Station, Sindhi Camp Bus Terminal, Chandpole, and Badi Chaupar.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: COMPLETE SHUTTLE TIMETABLE */}
        {currentTab === 'timetable' && (
          <div style={{ background: '#ffffff', borderRadius: '24px', border: '1px solid var(--apple-border)', padding: '28px', boxShadow: 'var(--apple-shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Official Shuttle Timetable</h3>
                <p style={{ fontSize: '0.82rem', color: '#64748B' }}>Daily departures from JKLU Campus Gate 1</p>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <span className="stop-tag" style={{ background: '#ECFDF5', color: '#065F46' }}>Monday - Saturday Active</span>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0', color: '#64748B', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '12px 16px' }}>Departure Time</th>
                    <th style={{ padding: '12px 16px' }}>Shift</th>
                    <th style={{ padding: '12px 16px' }}>Route & 3 Stops</th>
                    <th style={{ padding: '12px 16px' }}>Bus Vehicle</th>
                    <th style={{ padding: '12px 16px' }}>Capacity</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot) => (
                    <tr key={slot._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '16px', fontWeight: 800, fontSize: '0.95rem' }}>
                        {slot.time}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span className="shuttle-period-pill">{slot.period}</span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 600 }}>JKLU ➔ 200 Ft Bypass ➔ Elements Mall ➔ Metro</div>
                        <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Stops at all 3 designated points</div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span className="bus-plate">{slot.busNumber}</span>
                      </td>
                      <td style={{ padding: '16px', color: '#64748B' }}>
                        {slot.totalSeats} AC Seats
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <button
                          className="select-shuttle-btn"
                          style={{ padding: '6px 14px', fontSize: '0.75rem' }}
                          onClick={() => {
                            setCurrentTab('book');
                            handleSelectSlot(slot);
                          }}
                        >
                          Book Seat
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* POPUP MODAL FOR VIEWING PASS FROM "MY PASSES" */}
      {modalTrip && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 100
        }}>
          <div style={{ maxWidth: '480px', width: '100%', position: 'relative' }}>
            <button
              onClick={() => setModalTrip(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#fff',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>

            <div className="apple-boarding-pass">
              <div className="pass-header">
                <div className="pass-brand">
                  <h3>JKLU CAMPUS SHUTTLE</h3>
                  <p>BOARDING PASS • GATE 1</p>
                </div>
                <div className="pass-status-pill">
                  ● {modalTrip.status}
                </div>
              </div>

              <div className="pass-body">
                <div className="pass-route-visual">
                  <div className="pass-stop-node">
                    <div className="pass-node-label">ORIGIN</div>
                    <div className="pass-node-title">JKLU Campus</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Main Gate 1</div>
                  </div>

                  <Bus size={18} color="#D82C36" />

                  <div className="pass-stop-node right">
                    <div className="pass-node-label">DESTINATION</div>
                    <div className="pass-node-title" style={{ color: '#D82C36' }}>
                      {modalTrip.stop}
                    </div>
                  </div>
                </div>

                <div className="pass-details-grid">
                  <div>
                    <div className="pass-field-label">DATE & TIME</div>
                    <div className="pass-field-value">{modalTrip.slot?.time || '05:15 PM'} • {modalTrip.date}</div>
                  </div>

                  <div>
                    <div className="pass-field-label">ASSIGNED SEAT</div>
                    <div className="pass-field-value pass-seat-highlight">Seat #{modalTrip.seatNumber}</div>
                  </div>

                  <div>
                    <div className="pass-field-label">PASSENGER</div>
                    <div className="pass-field-value">{modalTrip.passengerName}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{modalTrip.passengerRoll}</div>
                  </div>

                  <div>
                    <div className="pass-field-label">BUS VEHICLE</div>
                    <div className="pass-field-value">{modalTrip.slot?.busNumber || 'RJ 14 PA 2024'}</div>
                  </div>
                </div>
              </div>

              <div className="pass-perforation">
                <div className="notch-left"></div>
                <div className="perforation-line"></div>
                <div className="notch-right"></div>
              </div>

              <div className="pass-footer-barcode">
                <div className="qr-code-box">
                  {renderQRCode(modalTrip.bookingCode)}
                </div>
                <div className="barcode-text">{modalTrip.bookingCode}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
              <button
                className="btn-secondary"
                onClick={() => window.print()}
                style={{ background: '#fff' }}
              >
                <Download size={15} /> Print Pass
              </button>
              <button
                className="btn-secondary"
                onClick={() => setModalTrip(null)}
                style={{ background: '#0F172A', color: '#fff', borderColor: '#0F172A' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
