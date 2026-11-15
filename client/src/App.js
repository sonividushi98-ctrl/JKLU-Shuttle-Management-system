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
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { getStoredToken, clearStoredAuth } from './api/session';
import SignOutConfirm from './SignOutConfirm';
import {
  OFFICIAL_TRIPS,
  CAMPUS,
  isInbound,
  stopsOf,
  stopTime,
  arrivalTime,
  tripEnds,
  runsOn,
  minutesOf,
  weekdayOf,
  isTripDeparted
} from './data/trips';
import {
  bookingStepList,
  STEP_SELECT_SHUTTLE,
  STEP_CHOOSE_STOP,
  STEP_SEAT_SELECTION,
  STEP_BOARDING_PASS
} from './utils/bookingStepsLinkedList';
import './App.css';
import './Admin.css';
import './Trips.css';

const API_BASE = 'http://localhost:5000/api/bookings';
const AUTH_API = 'http://localhost:5000/api/auth';

const navigateTo = (path) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

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

// Admin-cancelled bookings the student has already dismissed from the banner (this browser only)
const DISMISSED_KEY = 'jklu_dismissed_cancellations';
const readDismissed = () => {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY)) || []; } catch { return []; }
};
const isAdminCancelled = (trip) => trip.status === 'Cancelled' && Boolean(trip.cancelReason);
const byIdOf = (trips) => new Map(trips.map((t) => [String(t._id), t]));
// The admin cancellation for a shuttle on a date (YYYY-MM-DD), or undefined
const slotCancellation = (slot, date) => (slot?.cancelledDates || []).find((c) => c.date === date);

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

// Offline fallback: the official timetable trips
const INITIAL_SLOTS = OFFICIAL_TRIPS;

// Initial mock trips
const INITIAL_MY_TRIPS = [
  {
    _id: 'ticket-demo-01',
    user: '654321098765432109876543',
    passengerName: 'Aarav Sharma',
    passengerRoll: '2023BTECH042',
    passengerEmail: 'aarav.sharma@jklu.edu.in',
    slot: INITIAL_SLOTS[0], // 1:30 PM, Route 1
    stop: 'Mansarovar Metro Station',
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
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
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
  // Campus to City: the drop stop. City to Campus: the boarding stop.
  const [selectedStop, setSelectedStop] = useState('');
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

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('admin') === '1') {
      setShowAuthModal(true);
      setAuthMode('login');
    }
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
  const [bookingError, setBookingError] = useState('');

  // ==========================================
  // ADMIN ROLE & ADMIN CANCELLATIONS
  // ==========================================
  const isAdmin = currentUser?.role === 'Admin';

  // Pull this student's bookings from the server so status changes made by an admin
  // (status Cancelled + cancelReason) show up. Local-only trips are kept as they are.
  const currentUserId = currentUser?.id;
  const currentUserEmail = (currentUser?.email || '').toLowerCase();
  const refreshMyTrips = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const res = await axios.get(`${API_BASE}/my-trips/${currentUserId}`, { timeout: 4000 });
      const serverTrips = (Array.isArray(res.data) ? res.data : []).filter(
        (t) => t.slot && (String(t.user) === String(currentUserId) || (t.passengerEmail || '').toLowerCase() === currentUserEmail)
      );
      if (serverTrips.length === 0) return;
      const byId = byIdOf(serverTrips);
      setMyTrips((prev) => {
        const known = new Set(prev.map((t) => String(t._id)));
        const updated = prev.map((t) => (byId.has(String(t._id)) ? { ...t, ...byId.get(String(t._id)) } : t));
        return [...serverTrips.filter((t) => !known.has(String(t._id))), ...updated];
      });
      // Keep an open boarding pass in step with the server too
      const syncOpenPass = (pass) =>
        pass && byId.has(String(pass._id)) ? { ...pass, ...byId.get(String(pass._id)) } : pass;
      setConfirmedPass(syncOpenPass);
      setModalTrip(syncOpenPass);
    } catch {
      // Server unreachable: keep showing the trips saved on this device
    }
  }, [currentUserId, currentUserEmail]);

  // Re-check on sign-in and whenever the student switches tabs
  useEffect(() => {
    refreshMyTrips();
  }, [refreshMyTrips, currentTab]);

  const [dismissedCancellations, setDismissedCancellations] = useState(readDismissed);
  const bannerCancellations = currentUser
    ? myTrips.filter((t) => isAdminCancelled(t) && !dismissedCancellations.includes(String(t._id)))
    : [];

  const dismissCancellations = (ids) => {
    const next = Array.from(new Set([...dismissedCancellations, ...ids.map(String)]));
    setDismissedCancellations(next);
    try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

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

  // Load shuttles on start and again whenever the Book tab is opened,
  // so admin changes (extra shuttles, cancellations) show up
  useEffect(() => {
    if (currentTab === 'book') fetchSlots();
  }, [currentTab, fetchSlots]);

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

  // Handle slot selection (Node 1 in the Linked List)
  const handleSelectSlot = (slot) => {
    if (slotCancellation(slot, selectedDate)) return;
    if (isTripDeparted(slot, selectedDate)) {
      setBookingError('This shuttle departure time has already passed for today. Please select an upcoming shuttle time.');
      return;
    }
    setBookingError('');
    setSelectedSlot(slot);
    setSelectedSeat(null);
    // Preselect the usual stop: the first pickup coming in, the final stop going out
    const stops = stopsOf(slot);
    const initialStop = (isInbound(slot) ? stops[0] : stops[stops.length - 1]) || '';
    setSelectedStop(initialStop);
    fetchBookedSeats(slot._id, selectedDate);
    setTrackingBus(slot.busNumber || 'RJ 14 PA 2024');

    // Advance via linked list: transition from STEP_SELECT_SHUTTLE to next node (STEP_CHOOSE_STOP)
    const nextStepId = bookingStepList.getNextStep(STEP_SELECT_SHUTTLE, {
      selectedSlot: slot,
      selectedStop: initialStop,
      selectedSeat: null,
      confirmedPass
    });
    setStep(nextStepId);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Handle stop selection (Node 2 in the Linked List)
  const handleSelectStop = (stopName) => {
    setSelectedStop(stopName);
    // Advance via linked list: transition from STEP_CHOOSE_STOP to next node (STEP_SEAT_SELECTION)
    const nextStepId = bookingStepList.getNextStep(STEP_CHOOSE_STOP, {
      selectedSlot,
      selectedStop: stopName,
      selectedSeat,
      confirmedPass
    });
    setStep(nextStepId);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Seat click handler
  const handleSeatClick = (seatNum) => {
    if (bookedSeats.includes(seatNum)) return;
    setBookingError('');
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
      window.scrollTo({ top: 100, behavior: 'smooth' });
    } catch (err) {
      if (err.response) {
        // The server refused the booking (seat already taken, shuttle cancelled, ...):
        // show its message and refresh what changed instead of issuing a pass
        setBookingError(err.response.data?.message || 'This booking could not be completed. Please try again.');
        setSelectedSeat(null);
        fetchBookedSeats(selectedSlot._id, selectedDate);
        fetchSlots();
        return;
      }
      // Server unreachable: standalone fallback
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
      window.scrollTo({ top: 100, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
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
        if (user.role === 'Admin') {
          navigateTo('/admin/dashboard');
        }
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
    setShowSignOutConfirm(false);
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
    // Only trips that run on the chosen day, in the chosen direction, in departure order
    return slots
      .filter(slot => {
        if (!runsOn(slot, selectedDate)) return false;
        if ((directionFilter === 'inbound') !== isInbound(slot)) return false;
        if (selectedPeriod !== 'All' && slot.period !== selectedPeriod) return false;
        return true;
      })
      .sort((a, b) => minutesOf(a.time) - minutesOf(b.time));
  }, [slots, selectedPeriod, selectedDate, directionFilter]);

  // Booking state object for linked list navigation checks
  const bookingState = useMemo(() => ({
    selectedSlot,
    selectedStop,
    selectedSeat,
    confirmedPass,
    directionFilter
  }), [selectedSlot, selectedStop, selectedSeat, confirmedPass, directionFilter]);

  // Synchronize shuttle details when selectedDate or slots update
  useEffect(() => {
    if (selectedSlot) {
      if (isTripDeparted(selectedSlot, selectedDate) || !runsOn(selectedSlot, selectedDate)) {
        // Today's departure time has passed or shuttle doesn't run on this date: clear selection and reset to Step 1
        setSelectedSlot(null);
        setSelectedStop('');
        setSelectedSeat(null);
        setStep(STEP_SELECT_SHUTTLE);
      } else {
        // Ensure selectedStop is still valid for this shuttle
        const validStops = stopsOf(selectedSlot);
        if (selectedStop && !validStops.includes(selectedStop)) {
          const defaultStop = (isInbound(selectedSlot) ? validStops[0] : validStops[validStops.length - 1]) || '';
          setSelectedStop(defaultStop);
        }
        fetchBookedSeats(selectedSlot._id, selectedDate);
      }
    }
  }, [selectedDate, selectedSlot, selectedStop, fetchBookedSeats]);

  // Where the selected booking starts and ends
  const selectedTripEnds = selectedSlot ? tripEnds(selectedSlot, selectedStop) : { from: '', to: '' };

  // Active tracked shuttle slot for Live Bus GPS (synchronized with selectedSlot, confirmedPass, or schedule)
  const activeTrackingSlot = useMemo(() => {
    if (trackingTrip?.slot) return trackingTrip.slot;
    if (selectedSlot) return selectedSlot;
    const confirmedTrip = myTrips.find(t => t.status === 'Confirmed');
    if (confirmedTrip?.slot) return confirmedTrip.slot;
    return filteredSlots.find(s => !isTripDeparted(s, selectedDate)) || slots[0] || INITIAL_SLOTS[0];
  }, [trackingTrip, selectedSlot, myTrips, filteredSlots, selectedDate, slots]);

  const activeTrackingBus = activeTrackingSlot?.busNumber || trackingBus;
  const activeDriver = BUS_DRIVERS[activeTrackingBus] || BUS_DRIVERS['RJ 14 PA 2024'];

  // Dynamically derive corridor stops from active tracked shuttle
  const activeCorridorStops = useMemo(() => {
    if (!activeTrackingSlot) return JKLU_STOPS;
    const origin = activeTrackingSlot.origin || CAMPUS;
    const dest = activeTrackingSlot.destination || 'Mansarovar Metro Station';
    const midStops = stopsOf(activeTrackingSlot);
    const stopsList = [
      { name: origin, landmark: 'Origin Departure Point', distance: '0 km', isOrigin: true }
    ];
    midStops.forEach((sName, i) => {
      const match = JKLU_STOPS.find(j => j.name.toLowerCase() === sName.toLowerCase());
      const eta = stopTime(activeTrackingSlot, sName);
      stopsList.push({
        name: sName,
        landmark: match ? match.landmark : (sName === dest ? 'Terminal Connection' : 'Designated Stop'),
        distance: match ? `${match.distanceKm} km` : `Stop ${i + 1}`,
        etaTime: eta
      });
    });
    return stopsList;
  }, [activeTrackingSlot]);

  // Synchronized live tracking waypoint stages
  const liveStageInfo = useMemo(() => {
    const stops = activeCorridorStops;
    const numStops = Math.max(1, stops.length - 1);
    const segment = 100 / numStops;
    const currentIdx = Math.min(numStops - 1, Math.floor(trackingProgress / segment));
    const nextStopItem = stops[Math.min(stops.length - 1, currentIdx + 1)] || stops[stops.length - 1];
    const progressInSegment = (trackingProgress - currentIdx * segment) / segment;
    const nextEtaMinutes = Math.max(1, Math.round(15 * (1 - progressInSegment)));

    return {
      stageIndex: currentIdx,
      currentMilestone: currentIdx === 0
        ? `Departed ${stops[0].name}, navigating transit corridor`
        : `Departed ${stops[currentIdx].name}, en route to ${nextStopItem.name}`,
      nextStop: trackingProgress >= 95 ? `${stops[stops.length - 1].name} (Arrived)` : nextStopItem.name,
      etaNextMinutes: trackingProgress >= 95 ? 0 : nextEtaMinutes,
      passedStops: stops.slice(0, currentIdx + 1).map(s => s.name)
    };
  }, [trackingProgress, activeCorridorStops]);

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
              className={`segmented-nav-btn ${currentTab === 'timetable' ? 'active' : ''}`}
              onClick={() => setCurrentTab('timetable')}
            >
              <Clock size={15} />
              Timetable
            </button>
          </nav>

          {/* User Account / Remember Me Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {currentUser ? (
              <div className="user-profile-badge" onClick={() => setShowAuthModal(true)} title="JKLU University Profile">
                <div className="user-avatar-circle">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <div className="user-name-label">{currentUser.name}</div>
                  <div className="user-roll-tag">{isAdmin ? 'ADMIN' : currentUser.rollNumber || 'STUDENT'}</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowSignOutConfirm(true); }}
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
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="main-wrapper">
        {/* Student notice: bookings cancelled by the transport office */}
        {bannerCancellations.length > 0 && (
          <div className="cancel-banner no-print" role="alert">
            <AlertTriangle size={20} className="cancel-banner-icon" />
            <div className="cancel-banner-body">
              <strong>
                {bannerCancellations.length === 1
                  ? 'Your shuttle booking was cancelled by the transport office'
                  : `${bannerCancellations.length} of your shuttle bookings were cancelled by the transport office`}
              </strong>
              <ul>
                {bannerCancellations.map((t) => (
                  <li key={t._id}>
                    {t.date} · {t.slot?.time} · Seat #{t.seatNumber} — <em>{t.cancelReason}</em>
                  </li>
                ))}
              </ul>
              <div className="cancel-banner-actions">
                {currentTab !== 'passes' && (
                  <button type="button" onClick={() => setCurrentTab('passes')}>View my passes</button>
                )}
                <button type="button" onClick={() => dismissCancellations(bannerCancellations.map((t) => t._id))}>
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

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

            {/* RedBus Stepper Bar - Connected via Doubly Linked List */}
            <div className="stepper-container">
              {bookingStepList.toArray().map((stepNode) => {
                const isActive = step === stepNode.id;
                const isCompleted = bookingStepList.isStepCompleted(stepNode.id, bookingState);
                const canAccess = bookingStepList.canNavigateTo(stepNode.id, bookingState);

                const handleStepClick = () => {
                  if (isActive) return;
                  if (canAccess) {
                    setStep(stepNode.id);
                    setBookingError('');
                  } else {
                    if (stepNode.id === STEP_CHOOSE_STOP && !selectedSlot) {
                      setBookingError('Please select a shuttle first before choosing a stop.');
                    } else if (stepNode.id === STEP_SEAT_SELECTION && !selectedStop) {
                      setBookingError('Please select a stop first before choosing your seat.');
                    }
                  }
                };

                return (
                  <React.Fragment key={stepNode.id}>
                    {stepNode.prev && (
                      <div className={`step-connector ${isCompleted || isActive ? 'completed' : ''}`}></div>
                    )}
                    <div
                      className={`step-item ${isActive ? 'active' : isCompleted ? 'completed' : ''} ${!canAccess ? 'step-locked' : ''}`}
                      onClick={handleStepClick}
                      style={{ cursor: canAccess ? 'pointer' : 'not-allowed', opacity: !canAccess && !isActive ? 0.45 : 1 }}
                      title={!canAccess ? `Complete previous step to unlock ${stepNode.title}` : stepNode.title}
                    >
                      <div className="step-bubble">{stepNode.id}</div>
                      <div className="step-meta">
                        <h4>{stepNode.title}</h4>
                        <p>
                          {stepNode.id === STEP_CHOOSE_STOP
                            ? (directionFilter === 'inbound' ? 'Where you board' : 'Where you get off')
                            : stepNode.subtitle}
                        </p>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {bookingError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '10px', color: '#991B1B', fontSize: '0.85rem', marginBottom: '16px' }}>
                <AlertTriangle size={16} />
                <span>{bookingError}</span>
              </div>
            )}

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
                {filteredSlots.length === 0 && (
                  <div className="no-trips-box">
                    <Bus size={32} color="#94A3B8" />
                    <h4>
                      No {directionFilter === 'inbound' ? 'City ➔ JKLU Campus' : 'JKLU ➔ City'} shuttles
                      {selectedPeriod !== 'All' ? ` in the ${selectedPeriod.toLowerCase()}` : ''} on {weekdayOf(selectedDate)}
                    </h4>
                    <p>Try the other direction{selectedPeriod !== 'All' ? ', another shift' : ''} or another day, or check the Timetable tab.</p>
                  </div>
                )}
                <div className="shuttles-grid">
                  {filteredSlots.map(slot => {
                    const availableCount = slot.totalSeats - 6;
                    const cancellation = slotCancellation(slot, selectedDate);
                    const isDeparted = isTripDeparted(slot, selectedDate);
                    const inbound = isInbound(slot);
                    const routeStops = inbound
                      ? [...stopsOf(slot), 'JKLU Campus']
                      : ['JKLU Campus', ...stopsOf(slot)];
                    const arrives = arrivalTime(slot);
                    return (
                      <div
                        key={slot._id}
                        className={`shuttle-card ${cancellation ? 'shuttle-card-cancelled' : ''} ${isDeparted ? 'shuttle-card-departed' : ''}`}
                        style={isDeparted ? { opacity: 0.75, borderStyle: 'dashed' } : undefined}
                      >
                        <div className="shuttle-time-col">
                          <div className="shuttle-dep-time">{slot.time}</div>
                          <span className="shuttle-period-pill">{slot.period}</span>
                          {slot.routeName && <span className="shuttle-route-pill">{slot.routeName}</span>}
                        </div>

                        <div className="shuttle-route-col">
                          <div className="route-direction-badge">
                            <MapPin size={15} color="#D82C36" />
                            <span>{routeStops[0]} ➔ {routeStops[routeStops.length - 1]}</span>
                          </div>

                          <div className="route-stops-line">
                            {routeStops.map((stop, i) => (
                              <React.Fragment key={stop}>
                                {i > 0 && <ArrowRight size={12} color="#94A3B8" />}
                                <span
                                  className="stop-tag"
                                  style={i === routeStops.length - 1 ? { background: '#FEE2E2', color: '#991B1B' } : undefined}
                                >
                                  {stop}
                                </span>
                              </React.Fragment>
                            ))}
                          </div>

                          <div className="bus-meta-tags">
                            <span className="bus-plate">{slot.busNumber}</span>
                            <span>•</span>
                            <span>{slot.busType || 'AC Shuttle'}</span>
                            {arrives && (
                              <>
                                <span>•</span>
                                <span>Reaches {routeStops[routeStops.length - 1]} at {arrives}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {cancellation ? (
                          <div className="shuttle-action-col">
                            <div className="shuttle-cancelled-badge">Cancelled for this date</div>
                            <div className="shuttle-cancelled-reason">{cancellation.reason}</div>
                            <button className="select-shuttle-btn" disabled aria-disabled="true">
                              <span>Not available</span>
                            </button>
                          </div>
                        ) : isDeparted ? (
                          <div className="shuttle-action-col">
                            <div className="shuttle-cancelled-badge" style={{ background: '#F1F5F9', color: '#64748B', borderColor: '#CBD5E1' }}>Time Passed</div>
                            <div className="shuttle-cancelled-reason" style={{ color: '#94A3B8' }}>Shuttle departed for today</div>
                            <button
                              className="select-shuttle-btn"
                              disabled
                              aria-disabled="true"
                              style={{ background: '#E2E8F0', color: '#94A3B8', cursor: 'not-allowed', borderColor: '#CBD5E1' }}
                            >
                              <span>Departed</span>
                            </button>
                          </div>
                        ) : (
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
                        )}
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
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                      {isInbound(selectedSlot) ? 'Select Your Boarding Stop' : 'Select Your Drop Stop'}
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#64748B' }}>
                      {selectedSlot.routeName ? `${selectedSlot.routeName}: ` : ''}
                      leaves <strong>{selectedSlot.origin || CAMPUS}</strong> at <strong>{selectedSlot.time}</strong>
                      {arrivalTime(selectedSlot) && (
                        <> and reaches <strong>{selectedSlot.destination}</strong> at <strong>{arrivalTime(selectedSlot)}</strong></>
                      )}.
                    </p>
                  </div>
                  <button
                    onClick={() => setStep(bookingStepList.getPrevStep(STEP_CHOOSE_STOP))}
                    style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    <ArrowLeft size={16} /> Change Shuttle Time
                  </button>
                </div>

                {/* This trip's stops, in route order */}
                <div className="stops-selection-grid">
                  {stopsOf(selectedSlot).map((stopName, idx) => {
                    const isSelected = selectedStop === stopName;
                    const info = JKLU_STOPS.find(s => s.name.toLowerCase() === stopName.toLowerCase());
                    const at = stopTime(selectedSlot, stopName);
                    return (
                      <div
                        key={stopName}
                        className={`stop-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedStop(stopName)}
                      >
                        <div className="stop-card-info">
                          <div className="stop-card-num">{idx + 1}</div>
                          <div>
                            <div className="stop-name-title">{stopName}</div>
                            {info && (
                              <div className="stop-landmark-text">
                                <MapPin size={14} color="#D82C36" />
                                <span>{info.landmark}</span>
                              </div>
                            )}
                            {info && <div className="stop-desc-text">{info.description}</div>}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                          {at && (
                            <div className="stop-eta-badge">
                              <div className="stop-eta-time">{at}</div>
                              <div className="stop-eta-label">{isInbound(selectedSlot) ? 'Pick-up time' : 'Drop time'}</div>
                            </div>
                          )}
                          <button
                            className="select-shuttle-btn"
                            onClick={(e) => { e.stopPropagation(); handleSelectStop(stopName); }}
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
                    onClick={() => {
                      if (!selectedStop) {
                        setBookingError('Please choose a stop before proceeding to seat selection.');
                        return;
                      }
                      const nextStepId = bookingStepList.getNextStep(STEP_CHOOSE_STOP, bookingState);
                      setStep(nextStepId);
                    }}
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
                      {selectedSlot.time} Departure • <strong>{selectedTripEnds.from}</strong> ➔ <strong>{selectedTripEnds.to}</strong> • Bus: <strong>{selectedSlot.busNumber}</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => setStep(bookingStepList.getPrevStep(STEP_SEAT_SELECTION))}
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
                      <span className="summary-value">
                        {selectedTripEnds.from}
                        {isInbound(selectedSlot) && stopTime(selectedSlot, selectedStop) ? ` (${stopTime(selectedSlot, selectedStop)})` : ''}
                      </span>
                    </div>

                    <div className="summary-detail-row">
                      <span className="summary-label">Drop-off Stop</span>
                      <span className="summary-value" style={{ color: '#D82C36' }}>
                        {selectedTripEnds.to}
                        {!isInbound(selectedSlot) && stopTime(selectedSlot, selectedStop) ? ` (${stopTime(selectedSlot, selectedStop)})` : ''}
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

                    {bookingError && (
                      <div className="booking-error" role="alert">
                        <AlertTriangle size={16} />
                        <span>{bookingError}</span>
                      </div>
                    )}

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
                {isAdminCancelled(confirmedPass) ? (
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ width: '48px', height: '48px', background: '#FEE2E2', borderRadius: '50%', color: '#D82C36', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                      <AlertTriangle size={26} />
                    </div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Shuttle Cancelled</h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748B' }}>The transport office cancelled this shuttle. Please book another one.</p>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{ width: '48px', height: '48px', background: '#ECFDF5', borderRadius: '50%', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                      <CheckCircle size={28} />
                    </div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Booking Confirmed!</h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748B' }}>Your digital campus shuttle pass is ready</p>
                  </div>
                )}

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

                  {isAdminCancelled(confirmedPass) && (
                    <div className="admin-cancel-tag admin-cancel-tag-pass">Cancelled by admin: {confirmedPass.cancelReason}</div>
                  )}

                  <div className="pass-body">
                    <div className="pass-route-visual">
                      <div className="pass-stop-node">
                        <div className="pass-node-label">ORIGIN</div>
                        <div className="pass-node-title">{tripEnds(confirmedPass.slot, confirmedPass.stop).from}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          {isInbound(confirmedPass.slot) ? 'Pick-up stop' : 'Main Gate (Saraswati Statue)'}
                        </div>
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
                          {tripEnds(confirmedPass.slot, confirmedPass.stop).to}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          {isInbound(confirmedPass.slot) ? 'Main Gate' : 'Jaipur City Stop'}
                        </div>
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
                  <span>Bus: {activeTrackingBus}</span>
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '4px' }}>
                  {activeTrackingSlot?.routeName || 'Transit Route'} • Scheduled Departure: {activeTrackingSlot?.time} • {activeTrackingSlot?.origin || CAMPUS} ➔ {activeTrackingSlot?.destination || 'Destination'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {trackingTrip && (
                  <button
                    onClick={() => { setCurrentTab('book'); setStep(STEP_BOARDING_PASS); }}
                    className="sim-action-btn"
                  >
                    <Ticket size={14} /> Back to Pass
                  </button>
                )}
              </div>
            </div>

            {/* Shuttle Synchronization & Quick Switch Bar */}
            <div className="shuttle-sync-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '10px 16px', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bus size={18} color="#D82C36" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>Synchronized Shuttle:</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#D82C36' }}>
                  {activeTrackingSlot?.routeName || 'Route'} ({activeTrackingSlot?.time} Departure)
                </span>
                <span style={{ fontSize: '0.78rem', color: '#64748B', background: '#FFF', border: '1px solid #CBD5E1', padding: '2px 8px', borderRadius: '4px' }}>
                  {activeTrackingBus}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Track Other Shuttle:</span>
                {slots.slice(0, 4).map((s) => {
                  const isSel = activeTrackingSlot?._id === s._id;
                  return (
                    <button
                      key={s._id}
                      onClick={() => {
                        setSelectedSlot(s);
                        setTrackingBus(s.busNumber || 'RJ 14 PA 2024');
                        setTrackingTrip(null);
                      }}
                      style={{
                        border: isSel ? '1.5px solid #D82C36' : '1px solid #CBD5E1',
                        background: isSel ? '#FEE2E2' : '#FFF',
                        color: isSel ? '#991B1B' : '#475569',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        fontWeight: isSel ? 700 : 500,
                        cursor: 'pointer'
                      }}
                    >
                      {s.routeName} ({s.time})
                    </button>
                  );
                })}
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
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>
                    Route: <strong>{activeTrackingSlot?.routeName || 'Route 1'}</strong> ({activeTrackingSlot?.origin || CAMPUS} ➔ {activeTrackingSlot?.destination}) • Departure: <strong>{activeTrackingSlot?.time}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {(selectedStop || trackingTrip?.stop) && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>Your Chosen Stop</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#D82C36' }}>{selectedStop || trackingTrip?.stop}</div>
                  </div>
                )}
                <div className="spotlight-countdown">
                  <Clock size={16} />
                  <span>Approximate Travel Time: ~{liveStageInfo.etaNextMinutes} min</span>
                </div>
              </div>
            </div>

            {/* Interactive Corridor Map Track */}
            <div className="corridor-map-wrapper">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.08em' }}>
                  Transit Corridor Map ({activeTrackingSlot?.routeName || 'Highway Corridor'})
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
                  <div className="bus-marker-bubble" title={activeTrackingBus}>
                    <Bus size={20} />
                  </div>
                  <div className="bus-live-tooltip">
                    {activeTrackingBus}
                  </div>
                </div>

                {/* Corridor Stations dynamically synchronized with activeRoute */}
                <div className="corridor-stops-row">
                  {activeCorridorStops.map((st, idx) => {
                    const stepThreshold = (idx / Math.max(1, activeCorridorStops.length - 1)) * 100;
                    const isCompleted = trackingProgress >= stepThreshold;
                    const isUserStop = (selectedStop && selectedStop.toLowerCase() === st.name.toLowerCase()) ||
                                      (trackingTrip?.stop && trackingTrip.stop.toLowerCase() === st.name.toLowerCase());
                    return (
                      <div
                        key={st.name + idx}
                        className={`corridor-station-node ${isCompleted ? 'completed' : 'active-stage'} ${isUserStop ? 'user-destination' : ''}`}
                      >
                        <div className="station-pin-dot">{idx}</div>
                        <div className="station-title">{st.name}</div>
                        <div className="station-subtitle">
                          {st.isOrigin ? `${st.landmark} (0 km)` : st.etaTime ? `${st.etaTime} (${st.distance})` : st.distance}
                        </div>
                        {isUserStop && (
                          <span className="station-user-target-pill">Your Stop</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Telemetry Dashboard Stats - Live Speed and Distance Covered removed per user request */}
            <div className="telemetry-dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div className="telemetry-card">
                <div className="telemetry-label">Distance Remaining</div>
                <div className="telemetry-val">{(19.5 * (1 - trackingProgress / 100)).toFixed(1)} km</div>
                <div className="telemetry-sub">to {activeTrackingSlot?.destination || 'Destination'}</div>
              </div>

              <div className="telemetry-card">
                <div className="telemetry-label">Traffic Condition</div>
                <div className="telemetry-val" style={{ color: '#10B981', fontSize: '1.15rem' }}>Smooth Flow</div>
                <div className="telemetry-sub">Ajmer Expressway Green</div>
              </div>
            </div>

            {/* Bottom Section: Driver Profile & Live Activity Feed */}
            <div className="tracking-bottom-section">
              {/* Driver Details Card - type, security status, and 9 yrs service removed */}
              <div className="driver-info-card">
                <div className="driver-profile-header">
                  <div className="driver-avatar">
                    {activeDriver.name.charAt(0)}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 800 }}>{activeDriver.name}</h4>
                    <p style={{ fontSize: '0.72rem', color: '#64748B' }}>
                      Official JKLU Driver • {activeDriver.id}
                    </p>
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.5, background: '#fff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div><strong>Vehicle Plate:</strong> {activeTrackingBus}</div>
                  <div><strong>Route:</strong> {activeTrackingSlot?.routeName || 'Route 1'} • {activeTrackingSlot?.time || ''} Departure</div>
                </div>

                <a
                  href={`tel:${activeDriver.phone.replace(/\s+/g, '')}`}
                  className="driver-contact-btn"
                >
                  <Phone size={14} />
                  <span>Call Shuttle Driver ({activeDriver.phone})</span>
                </a>
              </div>

              {/* Live Activity Feed */}
              <div className="live-activity-log-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800 }}>Corridor Milestones & Activity</h4>
                  <span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 700 }}>● Live Feed</span>
                </div>

                <div className="activity-feed-list">
                  {activeCorridorStops.map((st, idx) => {
                    const stepThreshold = (idx / Math.max(1, activeCorridorStops.length - 1)) * 100;
                    const isPassed = trackingProgress >= stepThreshold;
                    return (
                      <div key={st.name + idx} className="activity-feed-item">
                        <div className={`activity-bullet ${isPassed ? 'passed' : ''}`}></div>
                        <div>
                          <div style={{ fontWeight: 700 }}>
                            {idx === 0 ? `Departure: ${st.name}` : `Stop ${idx}: ${st.name}`}
                            {st.etaTime && <span style={{ fontSize: '0.75rem', color: '#D82C36', marginLeft: '6px' }}>({st.etaTime})</span>}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                            {idx === 0
                              ? `Shuttle departed at ${activeTrackingSlot?.time || ''} from campus gate.`
                              : isPassed
                              ? `Completed waypoint at ${st.landmark}.`
                              : `Scheduled stop en route to ${activeTrackingSlot?.destination}.`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

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
                          {tripEnds(trip.slot, trip.stop).from} ➔{' '}
                          <span style={{ color: '#D82C36' }}>{tripEnds(trip.slot, trip.stop).to}</span>
                        </div>

                        <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                          Seat #{trip.seatNumber} • {trip.passengerName} ({trip.passengerRoll}) • Bus: {trip.slot?.busNumber || 'RJ 14 PA 2024'}
                        </div>

                        {isAdminCancelled(trip) && (
                          <div className="admin-cancel-tag">Cancelled by admin: {trip.cancelReason}</div>
                        )}
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
        {/* TAB 4: COMPLETE SHUTTLE TIMETABLE */}
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

              {isAdminCancelled(modalTrip) && (
                <div className="admin-cancel-tag admin-cancel-tag-pass">Cancelled by admin: {modalTrip.cancelReason}</div>
              )}

              <div className="pass-body">
                <div className="pass-route-visual">
                  <div className="pass-stop-node">
                    <div className="pass-node-label">ORIGIN</div>
                    <div className="pass-node-title">{tripEnds(modalTrip.slot, modalTrip.stop).from}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                      {isInbound(modalTrip.slot) ? 'Pick-up stop' : 'Main Gate 1'}
                    </div>
                  </div>

                  <Bus size={18} color="#D82C36" />

                  <div className="pass-stop-node right">
                    <div className="pass-node-label">DESTINATION</div>
                    <div className="pass-node-title" style={{ color: '#D82C36' }}>
                      {tripEnds(modalTrip.slot, modalTrip.stop).to}
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
      {showSignOutConfirm && (
        <SignOutConfirm
          onCancel={() => setShowSignOutConfirm(false)}
          onConfirm={handleSignOut}
        />
      )}
    </div>
  );
};

export default App;
