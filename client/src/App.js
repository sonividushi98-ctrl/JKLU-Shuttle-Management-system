import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bus, MapPin, Calendar, User, Clock, CheckCircle } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api/bookings';

const App = () => {
  const [step, setStep] = useState(1); // 1: Time, 2: Stop, 3: Seat, 4: Confirmation
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedStop, setSelectedStop] = useState('');
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [userId] = useState('654321098765432109876543'); // Mock User ID
  const [bookingStatus, setBookingStatus] = useState(null);

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    try {
      const res = await axios.get(`${API_BASE}/slots`);
      setSlots(res.data);
      // If DB is empty, provide a mock slot for demo purposes
      if (res.data.length === 0) {
        setSlots([{
          _id: 'mock-slot-123',
          time: '01:30 PM',
          availableStops: ['Academic Block', 'Hostel A', 'Library'],
          totalSeats: 40,
          busNumber: 'JKLU-01'
        }]);
      }
    } catch (err) {
      console.error('Error fetching slots', err);
    }
  };

  const handleBookSeat = async () => {
    try {
      const res = await axios.post(`${API_BASE}/book`, {
        userId,
        slotId: selectedSlot._id,
        stop: selectedStop,
        seatNumber: selectedSeat,
        date: new Date().toISOString().split('T')[0]
      });
      setBookingStatus(res.data);
      setStep(4);
    } catch (err) {
      alert(err.response?.data?.message || 'Booking failed');
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto', padding: '20px', backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
      <header style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#d32f2f', fontSize: '24px' }}>JKLU Shuttle Service</h1>
        <p style={{ color: '#666' }}>Campus Transport Management</p>
      </header>

      {step === 1 && (
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#333' }}><Clock size={20} /> Select Shuttle Time</h3>
          <div style={{ display: 'grid', gap: '10px' }}>
            {slots.map(slot => (
              <button
                key={slot._id}
                onClick={() => { setSelectedSlot(slot); setStep(2); }}
                style={buttonStyle}
              >
                {slot.time} ({slot.days?.join(', ') || 'Mon-Fri'})
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#333' }}><MapPin size={20} /> Select Your Stop</h3>
          <div style={{ display: 'grid', gap: '10px' }}>
            {selectedSlot.availableStops.map(stop => (
              <button
                key={stop}
                onClick={() => { setSelectedStop(stop); setStep(3); }}
                style={buttonStyle}
              >
                {stop}
              </button>
            ))}
          </div>
          <button onClick={() => setStep(1)} style={backButtonStyle}>Back</button>
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#333' }}><Bus size={20} /> Select Seat (RedBus Style)</h3>
          <p style={{ fontSize: '12px', color: '#888', marginBottom: '15px' }}>Select an available seat from the layout</p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px',
            backgroundColor: '#ddd',
            padding: '20px',
            borderRadius: '10px',
            marginBottom: '20px'
          }}>
            {Array.from({ length: selectedSlot.totalSeats }, (_, i) => i + 1).map(seat => (
              <div
                key={seat}
                onClick={() => setSelectedSeat(seat)}
                style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: selectedSeat === seat ? '#d32f2f' : '#fff',
                  color: selectedSeat === seat ? '#fff' : '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: '1px solid #ccc',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
              >
                {seat}
              </div>
            ))}
          </div>

          <button
            disabled={!selectedSeat}
            onClick={handleBookSeat}
            style={{ ...buttonStyle, width: '100%', backgroundColor: '#d32f2f', color: '#fff', textAlign: 'center' }}
          >
            Confirm Booking
          </button>
          <button onClick={() => setStep(2)} style={backButtonStyle}>Back</button>
        </div>
      )}

      {step === 4 && (
        <div className="card" style={{ textAlign: 'center' }}>
          <CheckCircle size={60} color="green" style={{ marginBottom: '15px' }} />
          <h3 style={{ justifyContent: 'center', display: 'flex' }}>Booking Confirmed!</h3>
          <div style={{ textAlign: 'left', backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '20px' }}>
            <p><strong style={{ color: '#555' }}>Time:</strong> {selectedSlot.time}</p>
            <p><strong style={{ color: '#555' }}>Stop:</strong> {selectedStop}</p>
            <p><strong style={{ color: '#555' }}>Seat:</strong> {selectedSeat}</p>
            <p><strong style={{ color: '#555' }}>Bus:</strong> {selectedSlot.busNumber}</p>
          </div>
          <button onClick={() => setStep(1)} style={{ ...buttonStyle, width: '100%', textAlign: 'center' }}>Book Another Trip</button>
        </div>
      )}

      <style>{`
        .card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }
      `}</style>
    </div>
  );
};

const buttonStyle = {
  padding: '12px',
  fontSize: '16px',
  cursor: 'pointer',
  borderRadius: '8px',
  border: '1px solid #ddd',
  backgroundColor: '#fff',
  transition: 'all 0.2s',
  textAlign: 'left'
};

const backButtonStyle = {
  marginTop: '15px',
  background: 'none',
  border: 'none',
  color: '#666',
  cursor: 'pointer',
  textDecoration: 'underline'
};

export default App;
