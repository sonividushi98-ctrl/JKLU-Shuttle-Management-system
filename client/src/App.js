import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Info,
  Radio,
  Navigation,
  Phone,
  Play,
  Pause,
  RefreshCw,
  Key,
  LogIn,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import './App.css';

const API_BASE = 'http://localhost:5000/api/bookings';
const AUTH_API = 'http://localhost:5000/api/auth';

// Official JKLU Shuttle Service timetable, Academic Year 2026-27.
// Each route is split into legs; each stop row is [label, place, time].
const OFFICIAL_TIMETABLE = {
  weekday: {
    title: 'Monday to Friday (Working Days)',
    routes: [
      {
        name: 'Route 1',
        legs: [
          {
            title: 'Campus → City',
            stops: [
              ['Departure From', 'JKLU Campus Main Gate', '1:30 PM'],
              ['Arrival at', 'Elements Mall, Ajmer Road', '1:50 PM'],
              ['Arrival at', 'Mansarovar Metro Station', '2:00 PM']
            ]
          },
          {
            title: 'City → Campus',
            stops: [
              ['Departure From', 'Mansarovar Metro Station', '3:45 PM'],
              ['Departure From', 'Elements Mall, Ajmer Road', '3:55 PM'],
              ['Arrival at', 'JKLU Campus', '4:15 PM']
            ]
          }
        ]
      },
      {
        name: 'Route 2',
        legs: [
          {
            title: 'City → Campus',
            stops: [
              ['Departure From', 'Mansarovar Metro Station', '7:30 PM'],
              ['Arrival at', 'JKLU Campus Main Gate', '8:00 PM']
            ]
          },
          {
            title: 'Campus → City',
            stops: [
              ['Departure From', 'JKLU Campus Main Gate', '8:15 PM'],
              ['Drop point', 'Elements Mall, Ajmer Road', '8:40 PM'],
              ['Drop point', 'Mansarovar Metro Station', '8:50 PM']
            ]
          }
        ]
      }
    ]
  },
  weekend: {
    title: 'All Saturdays, Sundays & Holidays',
    routes: [
      {
        name: 'Route 1',
        legs: [
          {
            title: 'Campus → City',
            stops: [
              ['Departure From', 'JKLU Campus Main Gate', '11:30 AM'],
              ['Arrival at', 'Elements Mall, Ajmer Road', '11:50 AM'],
              ['Arrival at', 'Mansarovar Metro Station', '12:00 Noon']
            ]
          },
          {
            title: 'City → Campus',
            stops: [
              ['Departure From', 'Mansarovar Metro Station', '3:00 PM'],
              ['Departure From', 'Elements Mall, Ajmer Road', '3:10 PM'],
              ['Arrival at', 'JKLU Campus Main Gate', '3:30 PM']
            ]
          }
        ]
      },
      {
        name: 'Route 2',
        legs: [
          {
            title: 'Campus → City',
            stops: [
              ['Departure From', 'JKLU Campus Main Gate', '3:50 PM'],
              ['Drop point', 'Elements Mall', '4:10 PM'],
              ['Drop point', 'Mansarovar Metro Station', '4:15 PM'],
              ['Drop point', 'Ganga Jamuna Petrol Pump', '4:20 PM'],
              ['Drop point', 'Gujar ki Thadi', '4:25 PM'],
              ['Drop point', 'Ridhi Sidhi Churaha', '4:30 PM'],
              ['Drop point', 'Triveni Nagar Churaha', '4:35 PM'],
              ['Arrival at', 'Gopalpura Mode', '4:45 PM'],
              ['Arrival at', 'GT Mall, WTP', '5:00 PM']
            ]
          },
          {
            title: 'City → Campus',
            stops: [
              ['Departure From', 'GT Mall, WTP', '8:00 PM'],
              ['Arrival at', 'Mansarovar Metro Station', '8:40 PM'],
              ['Arrival at', 'JKLU Campus Main Gate', '9:00 PM']
            ]
          }
        ]
      }
    ]
  }
};

const TRANSPORT_CONTACT = { name: 'Mr. Mukesh', phone: '+91 9782008380' };

// Tokens written by older versions of this app without asking the server.
// They never belonged to a registered account, so they are not accepted.
const FAKE_TOKENS = ['mock-token-remember', 'demo-token-remember-30d'];

const getStoredToken = () =>
  localStorage.getItem('jklu_auth_token') || sessionStorage.getItem('jklu_auth_token');

const clearStoredAuth = () => {
  ['jklu_auth_user', 'jklu_auth_token'].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

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

// Initial mock trips
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

// Default driver profiles
const BUS_DRIVERS = {
  'RJ 14 PA 2024': { name: 'Rajesh Kumar Singh', phone: '+91 98290 41203', id: 'JKLU-DRV-08', exp: '9 Yrs Service' },
  'RJ 14 PB 1102': { name: 'Mukesh Choudhary', phone: '+91 94140 88219', id: 'JKLU-DRV-12', exp: '12 Yrs Service' },
  'RJ 14 PC 4410': { name: 'Vikram Shekhawat', phone: '+91 97850 55182', id: 'JKLU-DRV-03', exp: '7 Yrs Service' }
};

const App = () => {
  // ==========================================
  // AUTHENTICATION & REMEMBER ME STATE
  // ==========================================
  const [currentUser, setCurrentUser] = useState(() => {
    // Only restore a user that was signed in through the server (has a real JWT).
    // localStorage = Remember Me enabled; sessionStorage = this browser session only.
    for (const store of [localStorage, sessionStorage]) {
      const token = store.getItem('jklu_auth_token');
      const savedUser = store.getItem('jklu_auth_user');
      if (token && savedUser && !FAKE_TOKENS.includes(token)) {
        try { return JSON.parse(savedUser); } catch { /* ignore */ }
      }
    }
    clearStoredAuth();
    return null;
  });

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authRoll, setAuthRoll] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authRememberMe, setAuthRememberMe] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Navigation tabs: 'book' | 'passes' | 'tracking' | 'route' | 'timetable'
  const [currentTab, setCurrentTab] = useState('book');

  // Timetable view: open on today's schedule (weekend on Saturday/Sunday)
  const [timetableDay, setTimetableDay] = useState(() =>
    [0, 6].includes(new Date().getDay()) ? 'weekend' : 'weekday'
  );

  // Booking steps: 1: Select Shuttle, 2: Select Stop, 3: Select Seat & Passenger, 4: Boarding Pass
  const [step, setStep] = useState(1);

  // Filter states
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedPeriod, setSelectedPeriod] = useState('All');
  const [directionFilter, setDirectionFilter] = useState('outbound'); // 'outbound' or 'inbound'

  // Booking selections
  const [slots, setSlots] = useState(INITIAL_SLOTS);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedStop, setSelectedStop] = useState(JKLU_STOPS[2].name); // default: Mansarovar Metro
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [bookedSeats, setBookedSeats] = useState([3, 7, 12, 18, 22]);
  
  // Passenger Info (syncs automatically with currentUser)
  const [passengerName, setPassengerName] = useState(currentUser?.name || '');
  const [passengerRoll, setPassengerRoll] = useState(currentUser?.rollNumber || '');
  const [passengerEmail, setPassengerEmail] = useState(currentUser?.email || '');

  // On load, confirm the saved session still belongs to a registered account.
  // If the server rejects the token (expired, or the account no longer exists), sign out.
  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    axios
      .get(`${AUTH_API}/me`, { headers: { Authorization: `Bearer ${token}` }, timeout: 3000 })
      .then((res) => setCurrentUser(res.data))
      .catch((err) => {
        if (err.response) {
          clearStoredAuth();
          setCurrentUser(null);
        }
        // No response means the server is unreachable; keep the session until it can be checked.
      });
  }, []);

  // Keep passenger info synced whenever currentUser updates
  useEffect(() => {
    if (currentUser) {
      setPassengerName(currentUser.name || 'JKLU Student');
      setPassengerRoll(currentUser.rollNumber || '2023BTECH001');
      setPassengerEmail(currentUser.email || 'student@jklu.edu.in');
    }
  }, [currentUser]);
  
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

  // ==========================================
  // LIVE BUS TRACKING STATE
  // ==========================================
  const [trackingBus, setTrackingBus] = useState('RJ 14 PA 2024');
  const [trackingTrip, setTrackingTrip] = useState(null);
  const [trackingProgress, setTrackingProgress] = useState(48); // % along corridor
  const [trackingSpeed, setTrackingSpeed] = useState(42); // km/h
  const [isTrackingSimulating, setIsTrackingSimulating] = useState(true);
  const [trackingLastPing, setTrackingLastPing] = useState(new Date().toLocaleTimeString());

  // Simulation timer for dynamic live bus movement along the corridor (runs when tracking tab is active)
  const simTimerRef = useRef(null);
  useEffect(() => {
    if (isTrackingSimulating && currentTab === 'tracking') {
      simTimerRef.current = setInterval(() => {
        setTrackingProgress(prev => {
          if (prev >= 98) return 5; // loop back smoothly
          return prev + 1.2;
        });
        // Realistic micro-jitter in speed (38 - 46 km/h)
        setTrackingSpeed(38 + Math.floor(Math.random() * 9));
        setTrackingLastPing(new Date().toLocaleTimeString());
      }, 1500);
    } else {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    }
    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, [isTrackingSimulating, currentTab]);

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
      // Fallback
    }

    const existing = myTrips
      .filter(t => (t.slot?._id === slotId || t.slotId === slotId) && t.date === date && t.status === 'Confirmed')
      .map(t => t.seatNumber);
    
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

    // Booking needs a registered, signed-in account
    if (!currentUser) {
      setAuthMode('login');
      setAuthError('Please sign in with your registered JKLU account to confirm this booking.');
      setAuthSuccess('');
      setShowAuthModal(true);
      return;
    }

    setIsSubmitting(true);
    const bookingPayload = {
      userId: currentUser.id,
      slotId: selectedSlot._id,
      stop: selectedStop,
      seatNumber: selectedSeat,
      date: selectedDate,
      passengerName: passengerName.trim() || currentUser?.name || 'JKLU Student',
      passengerRoll: passengerRoll.trim().toUpperCase() || currentUser?.rollNumber || '2023BTECH001',
      passengerEmail: passengerEmail.trim() || currentUser?.email || 'student@jklu.edu.in'
    };

    try {
      const res = await axios.post(`${API_BASE}/book`, bookingPayload, { timeout: 3000 });
      const newBooking = res.data.booking;
      setConfirmedPass(newBooking);
      setMyTrips(prev => [newBooking, ...prev]);
      setBookedSeats(prev => [...prev, selectedSeat]);
      setTrackingBus(selectedSlot.busNumber || 'RJ 14 PA 2024');
      setTrackingTrip(newBooking);
      setStep(4);
    } catch {
      // Standalone fallback
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
      setTrackingBus(selectedSlot.busNumber || 'RJ 14 PA 2024');
      setTrackingTrip(localBooking);
      setStep(4);
    } finally {
      setIsSubmitting(false);
      window.scrollTo({ top: 100, behavior: 'smooth' });
    }
  };

  // Launch live tracking for a particular trip / bus
  const launchLiveTracking = (tripOrBus) => {
    if (typeof tripOrBus === 'string') {
      setTrackingBus(tripOrBus);
      setTrackingTrip(null);
    } else if (tripOrBus) {
      setTrackingTrip(tripOrBus);
      setTrackingBus(tripOrBus.slot?.busNumber || tripOrBus.busNumber || 'RJ 14 PA 2024');
    }
    setCurrentTab('tracking');
    window.scrollTo({ top: 80, behavior: 'smooth' });
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

  // ==========================================
  // AUTHENTICATION LOGIC (JKLU.EDU.IN ONLY)
  // ==========================================
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const cleanEmail = authEmail.trim().toLowerCase();

    // 1. Strict domain validation
    if (!cleanEmail.endsWith('@jklu.edu.in')) {
      setAuthError('Access Restricted: You must use an official @jklu.edu.in university email.');
      return;
    }

    if (!authPassword) {
      setAuthError('Please enter your password.');
      return;
    }

    if (authMode === 'signup' && !authName.trim()) {
      setAuthError('Please enter your full name.');
      return;
    }

    setAuthLoading(true);

    try {
      const endpoint = authMode === 'signup' ? `${AUTH_API}/signup` : `${AUTH_API}/login`;
      const payload = {
        name: authName.trim(),
        email: cleanEmail,
        password: authPassword,
        rollNumber: authRoll.trim().toUpperCase() || '2023BTECH001',
        rememberMe: authRememberMe
      };

      const res = await axios.post(endpoint, payload, { timeout: 3500 });
      const user = res.data.user;
      const token = res.data.token;

      // Handle "Remember Me": localStorage = persistent across days; sessionStorage = single session
      if (authRememberMe) {
        localStorage.setItem('jklu_auth_token', token);
        localStorage.setItem('jklu_auth_user', JSON.stringify(user));
        sessionStorage.removeItem('jklu_auth_user');
      } else {
        sessionStorage.setItem('jklu_auth_token', token);
        sessionStorage.setItem('jklu_auth_user', JSON.stringify(user));
        localStorage.removeItem('jklu_auth_user');
      }

      setCurrentUser(user);
      setAuthSuccess(`Welcome, ${user.name}!`);
      setTimeout(() => {
        setShowAuthModal(false);
        setAuthLoading(false);
      }, 500);
    } catch (err) {
      // Never sign anyone in without the server's approval.
      // Show the server's own message (e.g. "No account found with this JKLU email. Please Sign Up.").
      if (err.response?.data?.message) {
        setAuthError(err.response.data.message);
      } else {
        setAuthError('Cannot reach the shuttle server. Make sure the backend is running, then try again.');
      }
      setAuthLoading(false);
    }
  };

  // Sign out
  const handleSignOut = () => {
    clearStoredAuth();
    setCurrentUser(null);
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

  // Active driver for live tracking
  const currentDriver = BUS_DRIVERS[trackingBus] || BUS_DRIVERS['RJ 14 PA 2024'];

  // Calculate live tracking waypoint stages along the 19.5 km corridor
  // Progress: 0% = Gate 1, 30% = 200 Feet Bypass, 65% = Elements Mall, 100% = Mansarovar Metro
  const liveStageInfo = useMemo(() => {
    if (trackingProgress < 28) {
      return {
        stageIndex: 0,
        currentMilestone: 'Departed JKLU Gate 1, navigating Mahapura Expressway',
        nextStop: '200 Feet Bypass',
        etaNextMinutes: Math.max(1, Math.round(15 * (1 - trackingProgress / 28))),
        passedStops: ['JKLU Campus (Gate 1)']
      };
    } else if (trackingProgress < 65) {
      return {
        stageIndex: 1,
        currentMilestone: 'Crossed 200 Feet Bypass flyover, cruising on Ajmer Road',
        nextStop: 'Elements Mall',
        etaNextMinutes: Math.max(1, Math.round(10 * (1 - (trackingProgress - 28) / 37))),
        passedStops: ['JKLU Campus (Gate 1)', '200 feet bypass']
      };
    } else if (trackingProgress < 94) {
      return {
        stageIndex: 2,
        currentMilestone: 'Approaching DCM & Elements Mall connection',
        nextStop: 'Mansarovar Metro Station',
        etaNextMinutes: Math.max(1, Math.round(10 * (1 - (trackingProgress - 65) / 29))),
        passedStops: ['JKLU Campus (Gate 1)', '200 feet bypass', 'Elements Mall']
      };
    } else {
      return {
        stageIndex: 3,
        currentMilestone: 'Arrived at Mansarovar Metro Station terminal drop',
        nextStop: 'Terminal Station (Arrived)',
        etaNextMinutes: 0,
        passedStops: ['JKLU Campus (Gate 1)', '200 feet bypass', 'Elements Mall', 'mansarovar metro station']
      };
    }
  }, [trackingProgress]);

  // Render QR Code SVG
  const renderQRCode = (code) => (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" rx="10" fill="white" />
      <rect x="12" y="12" width="28" height="28" rx="4" fill="#0F172A" />
      <rect x="18" y="18" width="16" height="16" fill="white" />
      <rect x="22" y="22" width="8" height="8" fill="#D82C36" />

      <rect x="80" y="12" width="28" height="28" rx="4" fill="#0F172A" />
      <rect x="86" y="18" width="16" height="16" fill="white" />
      <rect x="90" y="22" width="8" height="8" fill="#D82C36" />

      <rect x="12" y="80" width="28" height="28" rx="4" fill="#0F172A" />
      <rect x="18" y="86" width="16" height="16" fill="white" />
      <rect x="22" y="90" width="8" height="8" fill="#D82C36" />

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
              className={`segmented-nav-btn ${currentTab === 'tracking' ? 'active' : ''}`}
              onClick={() => setCurrentTab('tracking')}
            >
              <Radio size={15} color="#D82C36" />
              Live Bus GPS
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

          {/* User Account / Remember Me Badge & Operations Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {currentUser ? (
              <div className="user-profile-badge" onClick={() => setShowAuthModal(true)} title="JKLU University Profile">
                <div className="user-avatar-circle">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <div className="user-name-label">{currentUser.name}</div>
                  <div className="user-roll-tag">{currentUser.rollNumber || 'STUDENT'}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleSignOut(); }}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', color: '#94A3B8' }}
                  title="Sign Out"
                >
                  <LogOut size={13} />
                </button>
              </div>
            ) : (
              <button className="auth-btn-pill" onClick={() => setShowAuthModal(true)}>
                <LogIn size={14} />
                <span>Sign In (@jklu.edu.in)</span>
              </button>
            )}

            {/* Operations Pill */}
            <div className="status-pill">
              <span className="status-dot"></span>
              <span>{isServerOnline ? 'JKLU API Synced' : 'Gate 1 Active • Express Ready'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="main-wrapper">
        {/* ========================================================================= */}
        {/* TAB 1: BOOKING WORKFLOW */}
        {/* ========================================================================= */}
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

                      {/* 2x2 Seating Rows Grid */}
                      <div className="coach-seats-grid">
                        {Array.from({ length: Math.ceil(selectedSlot.totalSeats / 4) }).map((_, rowIdx) => {
                          const seat1 = rowIdx * 4 + 1;
                          const seat2 = rowIdx * 4 + 2;
                          const seat3 = rowIdx * 4 + 3;
                          const seat4 = rowIdx * 4 + 4;

                          return (
                            <div key={rowIdx} className="seat-row">
                              <button
                                className={`seat-btn ${selectedSeat === seat1 ? 'selected' : ''} ${bookedSeats.includes(seat1) ? 'booked' : ''}`}
                                onClick={() => handleSeatClick(seat1)}
                                title={`Seat ${seat1} (Window)`}
                              >
                                {seat1}
                              </button>

                              <button
                                className={`seat-btn ${selectedSeat === seat2 ? 'selected' : ''} ${bookedSeats.includes(seat2) ? 'booked' : ''}`}
                                onClick={() => handleSeatClick(seat2)}
                                title={`Seat ${seat2} (Aisle)`}
                              >
                                {seat2}
                              </button>

                              <div className="aisle-walkway">
                                <span>Aisle</span>
                              </div>

                              <button
                                className={`seat-btn ${selectedSeat === seat3 ? 'selected' : ''} ${bookedSeats.includes(seat3) ? 'booked' : ''}`}
                                onClick={() => handleSeatClick(seat3)}
                                title={`Seat ${seat3} (Aisle)`}
                              >
                                {seat3}
                              </button>

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

                    {/* Passenger Inputs (auto-filled from persistent @jklu.edu.in auth) */}
                    <div className="passenger-form-group">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
                          <User size={15} color="#D82C36" />
                          <span>Passenger Information</span>
                        </div>
                        {currentUser && (
                          <span style={{ fontSize: '0.68rem', color: '#10B981', fontWeight: 700 }}>
                            ● Auto-Filled ({currentUser.rollNumber})
                          </span>
                        )}
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
                        <label>JKLU Email ID (@jklu.edu.in)</label>
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

            {/* STEP 4: APPLE WALLET / REDBUS DIGITAL BOARDING PASS WITH IMMEDIATE LIVE TRACKING */}
            {step === 4 && confirmedPass && (
              <div className="ticket-wrapper">
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ width: '48px', height: '48px', background: '#ECFDF5', borderRadius: '50%', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                    <CheckCircle size={28} />
                  </div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Booking Confirmed!</h3>
                  <p style={{ fontSize: '0.85rem', color: '#64748B' }}>Your digital campus shuttle pass is ready</p>
                </div>

                {/* Primary High-Priority CTA: Track Live Shuttle Immediately */}
                <div style={{ marginBottom: '18px' }}>
                  <button
                    onClick={() => launchLiveTracking(confirmedPass)}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #D82C36 0%, #B91C1C 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '14px 20px',
                      borderRadius: '16px',
                      fontSize: '0.98rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: '0 6px 20px rgba(216, 44, 54, 0.4)',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  >
                    <span className="radar-ping-dot" style={{ background: '#fff' }}></span>
                    <Radio size={20} />
                    <span>Track Live Shuttle Bus Now ({confirmedPass.slot?.busNumber || selectedSlot?.busNumber})</span>
                    <ChevronRight size={18} />
                  </button>
                </div>

                <div className="apple-boarding-pass">
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

                  <div className="pass-perforation">
                    <div className="notch-left"></div>
                    <div className="perforation-line"></div>
                    <div className="notch-right"></div>
                  </div>

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

        {/* ========================================================================= */}
        {/* TAB 2: LIVE BUS GPS TRACKING (Corridor + Telemetry + Real-time Movement) */}
        {/* ========================================================================= */}
        {currentTab === 'tracking' && (
          <div className="live-tracking-panel">
            {/* Top Tracking Bar */}
            <div className="tracking-header-bar">
              <div className="tracking-title-wrap">
                <h3>
                  <Bus size={24} color="#D82C36" />
                  <span>Live GPS Tracking: {trackingBus}</span>
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '4px' }}>
                  Real-time satellite GPS tracking from JKLU Campus along Ajmer Road Transit Corridor
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="tracking-radar-tag">
                  <span className="radar-ping-dot"></span>
                  <span>GPS Active • Ping {trackingLastPing}</span>
                </div>

                {trackingTrip && (
                  <button
                    onClick={() => { setCurrentTab('book'); setStep(4); }}
                    className="sim-action-btn"
                  >
                    <Ticket size={14} /> Back to Pass
                  </button>
                )}
              </div>
            </div>

            {/* Next Stop Spotlight */}
            <div className="next-stop-spotlight">
              <div className="spotlight-left">
                <div className="spotlight-bus-icon">
                  <Navigation size={22} />
                </div>
                <div>
                  <div className="spotlight-title">CURRENT STATUS & NEXT STOP</div>
                  <div className="spotlight-stop-name">{liveStageInfo.nextStop}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>
                    {liveStageInfo.currentMilestone}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {trackingTrip?.stop && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>Your Drop Stop</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#D82C36' }}>{trackingTrip.stop}</div>
                  </div>
                )}
                <div className="spotlight-countdown">
                  <Clock size={16} />
                  <span>ETA ~{liveStageInfo.etaNextMinutes} min</span>
                </div>
              </div>
            </div>

            {/* Interactive Corridor Map Track */}
            <div className="corridor-map-wrapper">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.08em' }}>
                  Transit Corridor Map (Ajmer Road Highway)
                </span>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#D82C36' }}>
                  {Math.round(trackingProgress)}% Route Completed
                </span>
              </div>

              <div className="corridor-road-container">
                {/* Background Road */}
                <div className="corridor-track-bg">
                  <div
                    className="corridor-track-progress"
                    style={{ width: `${Math.min(100, Math.max(5, trackingProgress))}%` }}
                  ></div>
                </div>

                {/* Live Animated Bus Marker */}
                <div
                  className="corridor-bus-marker"
                  style={{ left: `${Math.min(96, Math.max(4, trackingProgress))}%` }}
                >
                  <div className="bus-marker-bubble" title={`${trackingBus} - ${trackingSpeed} km/h`}>
                    <Bus size={20} />
                  </div>
                  <div className="bus-live-tooltip">
                    {trackingBus} • {trackingSpeed} km/h
                  </div>
                </div>

                {/* 4 Stations: Origin + 3 Designated Stops */}
                <div className="corridor-stops-row">
                  {/* Origin */}
                  <div className={`corridor-station-node ${trackingProgress > 4 ? 'completed' : 'active-stage'}`}>
                    <div className="station-pin-dot">0</div>
                    <div className="station-title">JKLU Campus</div>
                    <div className="station-subtitle">Main Gate 1 (0 km)</div>
                  </div>

                  {/* Stop 1: 200 Feet Bypass */}
                  <div className={`corridor-station-node ${trackingProgress >= 28 ? 'completed' : trackingProgress > 4 ? 'active-stage' : ''} ${trackingTrip?.stop === '200 feet bypass' ? 'user-destination' : ''}`}>
                    <div className="station-pin-dot">1</div>
                    <div className="station-title">200 Feet Bypass</div>
                    <div className="station-subtitle">Heerapura (8.5 km)</div>
                    {trackingTrip?.stop === '200 feet bypass' && (
                      <span className="station-user-target-pill">Your Stop</span>
                    )}
                  </div>

                  {/* Stop 2: Elements Mall */}
                  <div className={`corridor-station-node ${trackingProgress >= 65 ? 'completed' : trackingProgress >= 28 ? 'active-stage' : ''} ${trackingTrip?.stop === 'Elements Mall' ? 'user-destination' : ''}`}>
                    <div className="station-pin-dot">2</div>
                    <div className="station-title">Elements Mall</div>
                    <div className="station-subtitle">DCM Hub (14.0 km)</div>
                    {trackingTrip?.stop === 'Elements Mall' && (
                      <span className="station-user-target-pill">Your Stop</span>
                    )}
                  </div>

                  {/* Stop 3: Mansarovar Metro Station */}
                  <div className={`corridor-station-node ${trackingProgress >= 94 ? 'completed' : trackingProgress >= 65 ? 'active-stage' : ''} ${trackingTrip?.stop === 'mansarovar metro station' ? 'user-destination' : ''}`}>
                    <div className="station-pin-dot">3</div>
                    <div className="station-title">Mansarovar Metro</div>
                    <div className="station-subtitle">Terminal (19.5 km)</div>
                    {trackingTrip?.stop === 'mansarovar metro station' && (
                      <span className="station-user-target-pill">Your Stop</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Simulation & GPS Refresh Controls */}
              <div className="tracking-sim-controls">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#475569' }}>
                  <ShieldCheck size={16} color="#10B981" />
                  <span>Real-Time GPS Telemetry Stream</span>
                </div>

                <div className="sim-btn-group">
                  <button
                    className="sim-action-btn"
                    onClick={() => setIsTrackingSimulating(!isTrackingSimulating)}
                  >
                    {isTrackingSimulating ? <Pause size={13} /> : <Play size={13} />}
                    <span>{isTrackingSimulating ? 'Pause Movement' : 'Resume Simulation'}</span>
                  </button>

                  <button
                    className="sim-action-btn"
                    onClick={() => setTrackingProgress(prev => Math.min(95, prev + 25))}
                  >
                    <ArrowRight size={13} /> Advance Next Stop
                  </button>

                  <button
                    className="sim-action-btn"
                    onClick={() => { setTrackingProgress(8); setTrackingLastPing(new Date().toLocaleTimeString()); }}
                  >
                    <RefreshCw size={13} /> Reset to Gate 1
                  </button>
                </div>
              </div>
            </div>

            {/* Telemetry Dashboard Stats */}
            <div className="telemetry-dashboard-grid">
              <div className="telemetry-card">
                <div className="telemetry-label">Live Speed</div>
                <div className="telemetry-val" style={{ color: '#D82C36' }}>{trackingSpeed} km/h</div>
                <div className="telemetry-sub">Cruise Speed on Highway</div>
              </div>

              <div className="telemetry-card">
                <div className="telemetry-label">Distance Covered</div>
                <div className="telemetry-val">{(19.5 * (trackingProgress / 100)).toFixed(1)} km</div>
                <div className="telemetry-sub">of 19.5 km Total Route</div>
              </div>

              <div className="telemetry-card">
                <div className="telemetry-label">Distance Remaining</div>
                <div className="telemetry-val">{(19.5 * (1 - trackingProgress / 100)).toFixed(1)} km</div>
                <div className="telemetry-sub">to Mansarovar Metro</div>
              </div>

              <div className="telemetry-card">
                <div className="telemetry-label">Traffic Condition</div>
                <div className="telemetry-val" style={{ color: '#10B981', fontSize: '1.15rem' }}>Smooth Flow</div>
                <div className="telemetry-sub">Ajmer Expressway Green</div>
              </div>
            </div>

            {/* Bottom Section: Driver Profile & Live Activity Feed */}
            <div className="tracking-bottom-section">
              {/* Driver Details Card */}
              <div className="driver-info-card">
                <div className="driver-profile-header">
                  <div className="driver-avatar">
                    {currentDriver.name.charAt(0)}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 800 }}>{currentDriver.name}</h4>
                    <p style={{ fontSize: '0.72rem', color: '#64748B' }}>
                      Official JKLU Driver • {currentDriver.id}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 700, marginTop: '2px' }}>
                      ● {currentDriver.exp}
                    </p>
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.5, background: '#fff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div><strong>Vehicle Plate:</strong> {trackingBus}</div>
                  <div><strong>Type:</strong> Executive AC Campus Express</div>
                  <div><strong>Security Status:</strong> Gate 1 RFID Cleared</div>
                </div>

                <a
                  href={`tel:${currentDriver.phone.replace(/\s+/g, '')}`}
                  className="driver-contact-btn"
                >
                  <Phone size={14} />
                  <span>Call Shuttle Driver ({currentDriver.phone})</span>
                </a>
              </div>

              {/* Live Activity Feed */}
              <div className="live-activity-log-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800 }}>Corridor Milestones & Activity</h4>
                  <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 700 }}>● Live Feed</span>
                </div>

                <div className="activity-feed-list">
                  <div className="activity-feed-item">
                    <div className="activity-bullet passed"></div>
                    <div>
                      <div style={{ fontWeight: 700 }}>Gate 1 Departure (JKLU Campus)</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Shuttle boarded students and cleared campus gate security.</div>
                    </div>
                  </div>

                  <div className="activity-feed-item">
                    <div className={`activity-bullet ${trackingProgress >= 28 ? 'passed' : ''}`}></div>
                    <div>
                      <div style={{ fontWeight: 700 }}>Stop 1: 200 Feet Bypass (Heerapura)</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        {trackingProgress >= 28 ? 'Crossed flyover and discharged designated passengers.' : 'Upcoming milestone (~8.5 km mark).'}
                      </div>
                    </div>
                  </div>

                  <div className="activity-feed-item">
                    <div className={`activity-bullet ${trackingProgress >= 65 ? 'passed' : ''}`}></div>
                    <div>
                      <div style={{ fontWeight: 700 }}>Stop 2: Elements Mall (DCM Ajmer Road)</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        {trackingProgress >= 65 ? 'Completed stop at DCM service lane.' : 'Next designated drop point.'}
                      </div>
                    </div>
                  </div>

                  <div className="activity-feed-item">
                    <div className={`activity-bullet ${trackingProgress >= 94 ? 'passed' : ''}`}></div>
                    <div>
                      <div style={{ fontWeight: 700 }}>Stop 3: Mansarovar Metro Station Terminal</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        {trackingProgress >= 94 ? 'Arrived at Jaipur Metro Gate 1 pillar.' : 'Final terminal stop with Pink Line metro connection.'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: MY PASSES & TICKETS */}
        {/* ========================================================================= */}
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
                          Seat #{trip.seatNumber} • {trip.passengerName} ({trip.passengerRoll}) • Bus: {trip.slot?.busNumber || 'RJ 14 PA 2024'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Direct Live Track Button on Pass Card */}
                      <button
                        className="btn-secondary"
                        onClick={() => launchLiveTracking(trip)}
                        style={{ padding: '8px 14px', fontSize: '0.8rem', color: '#D82C36', borderColor: '#FCA5A5', background: '#FFF1F2' }}
                      >
                        <Radio size={14} />
                        <span>Track Live</span>
                      </button>

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

        {/* ========================================================================= */}
        {/* TAB 4: THE 3 STOPS ROUTE EXPLORER */}
        {/* ========================================================================= */}
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

        {/* ========================================================================= */}
        {/* TAB 5: COMPLETE SHUTTLE TIMETABLE */}
        {/* ========================================================================= */}
        {currentTab === 'timetable' && (
          <div className="tt-card">
            <div className="tt-header">
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Official Shuttle Timetable</h3>
                <p style={{ fontSize: '0.82rem', color: '#64748B' }}>JKLU Shuttle Service · Academic Year 2026-27</p>
              </div>

              <div className="tt-toggle" role="tablist" aria-label="Choose schedule">
                {[['weekday', 'Mon – Fri'], ['weekend', 'Sat, Sun & Holidays']].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={timetableDay === key}
                    className={`tt-toggle-btn ${timetableDay === key ? 'active' : ''}`}
                    onClick={() => setTimetableDay(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <p className="tt-day-title">Routes for {OFFICIAL_TIMETABLE[timetableDay].title}</p>

            <div className="tt-routes">
              {OFFICIAL_TIMETABLE[timetableDay].routes.map((route) => (
                <section key={route.name} className="tt-route">
                  <h4 className="tt-route-name">{route.name}</h4>
                  {route.legs.map((leg) => (
                    <div key={leg.title} className="tt-leg">
                      <div className="tt-leg-title">{leg.title}</div>
                      <table className="tt-table">
                        <thead>
                          <tr>
                            <th scope="col">Stop</th>
                            <th scope="col">Place</th>
                            <th scope="col" style={{ textAlign: 'right' }}>Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leg.stops.map(([label, place, time], i) => (
                            <tr key={`${place}-${time}`}>
                              <td className="tt-label">
                                {i === 0 || leg.stops[i - 1][0] !== label ? label : ''}
                              </td>
                              <td className="tt-place">{place}</td>
                              <td className="tt-time">{time}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </section>
              ))}
            </div>

            <div className="tt-contact">
              <Phone size={15} />
              <span>
                In case of any queries, please contact {TRANSPORT_CONTACT.name}:{' '}
                <a href={`tel:${TRANSPORT_CONTACT.phone.replace(/\s/g, '')}`}>{TRANSPORT_CONTACT.phone}</a>
              </span>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* AUTH MODAL DIALOG (@jklu.edu.in ONLY + REMEMBER ME) */}
      {/* ========================================================================= */}
      {showAuthModal && (
        <div className="auth-modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="auth-modal-header">
              <button
                onClick={() => setShowAuthModal(false)}
                style={{
                  position: 'absolute',
                  top: '18px',
                  right: '18px',
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B'
                }}
              >
                <X size={15} />
              </button>

              <div className="auth-brand-strip">
                <div style={{ width: '28px', height: '28px', background: '#D82C36', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <Bus size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>JKLU Campus Portal</h3>
                  <p style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600 }}>OFFICIAL UNIVERSITY ACCESS</p>
                </div>
              </div>

              <div className="auth-tab-row">
                <button
                  className={`auth-tab-btn ${authMode === 'login' ? 'active' : ''}`}
                  onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }}
                >
                  Sign In
                </button>
                <button
                  className={`auth-tab-btn ${authMode === 'signup' ? 'active' : ''}`}
                  onClick={() => { setAuthMode('signup'); setAuthError(''); setAuthSuccess(''); }}
                >
                  Register Account
                </button>
              </div>
            </div>

            <div className="auth-modal-body">
              {/* Domain Restriction Notice */}
              <div className="auth-hint-banner">
                <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>University ID Requirement:</strong> Only official emails ending in <code>@jklu.edu.in</code> are authorized for student & staff transport access.
                </div>
              </div>

              {authError && (
                <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '10px 14px', borderRadius: '10px', fontSize: '0.8rem', marginBottom: '14px', fontWeight: 600 }}>
                  {authError}
                </div>
              )}

              {authSuccess && (
                <div style={{ background: '#ECFDF5', border: '1px solid #6EE7B7', color: '#065F46', padding: '10px 14px', borderRadius: '10px', fontSize: '0.8rem', marginBottom: '14px', fontWeight: 600 }}>
                  {authSuccess}
                </div>
              )}

              <form onSubmit={handleAuthSubmit}>
                {authMode === 'signup' && (
                  <>
                    <div className="auth-input-group">
                      <label>Full Name</label>
                      <div className="auth-input-wrapper">
                        <User size={16} className="auth-input-icon" />
                        <input
                          type="text"
                          className="auth-text-input"
                          placeholder="e.g. Aarav Sharma"
                          value={authName}
                          onChange={(e) => setAuthName(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="auth-input-group">
                      <label>Roll Number / Staff ID</label>
                      <div className="auth-input-wrapper">
                        <Key size={16} className="auth-input-icon" />
                        <input
                          type="text"
                          className="auth-text-input"
                          placeholder="e.g. 2023BTECH042"
                          value={authRoll}
                          onChange={(e) => setAuthRoll(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="auth-input-group">
                  <label>University Email Address</label>
                  <div className="auth-input-wrapper">
                    <User size={16} className="auth-input-icon" />
                    <input
                      type="email"
                      className="auth-text-input"
                      placeholder="student@jklu.edu.in"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      required
                    />
                  </div>
                  <span style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '4px', display: 'block' }}>
                    Must end with <strong>@jklu.edu.in</strong>
                  </span>
                </div>

                <div className="auth-input-group">
                  <label>Password</label>
                  <div className="auth-input-wrapper">
                    <Key size={16} className="auth-input-icon" />
                    <input
                      type="password"
                      className="auth-text-input"
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Remember Me Feature Toggle */}
                <div className="remember-me-checkbox-row">
                  <label className="custom-checkbox-label">
                    <input
                      type="checkbox"
                      checked={authRememberMe}
                      onChange={(e) => setAuthRememberMe(e.target.checked)}
                    />
                    <span>Remember me on this device (Never sign up daily)</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={authLoading}
                >
                  {authLoading ? 'Verifying...' : authMode === 'signup' ? 'Create University Account' : 'Sign In to Campus Shuttle'}
                </button>
              </form>

              <p style={{ fontSize: '0.75rem', color: '#64748B', textAlign: 'center', marginTop: '14px' }}>
                {authMode === 'login' ? 'New here? ' : 'Already registered? '}
                <button
                  type="button"
                  onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); setAuthSuccess(''); }}
                  style={{ background: 'none', border: 'none', color: '#D82C36', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 'inherit' }}
                >
                  {authMode === 'login' ? 'Register your JKLU account' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POPUP MODAL FOR VIEWING PASS FROM "MY PASSES" */}
      {/* ========================================================================= */}
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
                onClick={() => {
                  const bus = modalTrip.slot?.busNumber || 'RJ 14 PA 2024';
                  setModalTrip(null);
                  launchLiveTracking(modalTrip || bus);
                }}
                style={{ background: '#FFF1F2', color: '#D82C36', borderColor: '#FCA5A5' }}
              >
                <Radio size={15} /> Track Live GPS
              </button>

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
