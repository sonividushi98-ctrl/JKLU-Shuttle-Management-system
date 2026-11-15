# JKLU Shuttle Management System 🚌✨

A sleek, modern, and highly intuitive Campus Shuttle Booking App designed specifically for **JK Lakshmipat University (JKLU)**. 

The app blends **RedBus's operational efficiency** (live coach layout, seat booking status, instant ticket generation, and real-time corridor tracking) with **Apple's signature minimalism** (glassmorphism navigation, crisp typography, clean whitespace, and Apple Wallet-style digital boarding passes).

---

## 📍 The 3 Designated Shuttle Stops

The shuttle operates directly from **JKLU Campus (Main Gate 1, near Saraswati Statue)** to the 3 prime Jaipur transit hubs:

1. **200 Feet Bypass** (~15 min / 8.5 km)
   - *Landmark:* Heerapura Flyover / Ring Road Crossing on Ajmer Expressway
   - *Connections:* Quick transit for Nirman Nagar, Vaishali Nagar West, and Delhi/Ajmer Expressway.
2. **Elements Mall** (~25 min / 14.0 km)
   - *Landmark:* Opposite DCM, Main Ajmer Road
   - *Connections:* Commercial, shopping, cafe, and transit hub connecting to Shyam Nagar and Sodala.
3. **Mansarovar Metro Station** (~35 min / 19.5 km)
   - *Landmark:* Gate No. 1 / Metro Pillar 24 (Jaipur Metro Pink Line)
   - *Connections:* Terminal Jaipur Metro station providing direct high-frequency trains to Railway Station, Sindhi Camp Bus Stand, Chandpole, and Badi Chaupar.

---

## 🚀 Key Features

### 1. 🔐 Official `@jklu.edu.in` Auth System with "Remember Me"
- **Campus Domain Verification**: Enforces official `@jklu.edu.in` university emails for student and faculty access.
- **"Remember Me" Device Persistence**: Keeps students logged in across reloads, browser restarts, and daily commutes so you **never have to sign up or log in daily**.
- **Auto-Filled Passenger Details**: Automatically populates Name, Roll Number, and Email directly into shuttle reservations.
- **1-Tap Quick Demo Login**: One-click student login for rapid demonstration (`Aarav Sharma - 2023BTECH042`).

### 2. 📡 Real-Time Live Bus GPS Tracking
- **Immediate Post-Booking Launch**: Instant high-visibility button right after receiving your Boarding Pass to track your specific bus live.
- **Interactive Corridor Road**: Animated shuttle bus marker progressing in real-time along the Ajmer Road Highway across official corridor waypoints (*JKLU Gate 1 ➔ 200 Feet Bypass ➔ Elements Mall ➔ Mansarovar Metro*).
- **Live Telemetry**: Real-time Next Stop spotlight, ETA countdown, and distance remaining to destination.
- **Driver Profile & Direct Contact**: Displays driver name, campus ID, vehicle plate number, route departure time, and 1-tap direct phone call button.

### 3. ⚡ Real-Time Seat Availability (Socket.IO) & Instant Cancellation
- **Schedule-Specific Socket Rooms**: Students viewing a specific shuttle schedule automatically join an isolated Socket.IO room (`schedule:${slotId}:${date}`). Real-time updates only target students viewing that exact shuttle time and date.
- **Zero-Refresh Real-Time Sync**: When a student confirms a booking, a `seat-booked` event broadcasts immediately across all connected browsers viewing the same schedule, rendering the seat as Booked (`booked`) without requiring a manual page refresh.
- **Direct Cancel Booking in Confirmation Details**: A dedicated **"Cancel Booking"** button is embedded in the post-booking details / boarding pass view. Clicking asks for confirmation, cancels the reservation in MongoDB, updates pass status to `Cancelled`, and broadcasts a `seat-cancelled` event to immediately make the seat available to other students.
- **Reconnection & State Resiliency**: On connection drops or reconnections, the client automatically re-joins the room and pulls the latest seat occupancy directly from MongoDB.
- **Live Collision Prevention**: If another student books the seat you currently have highlighted, your active selection is immediately released with an alert, preventing outdated submission attempts.

### 4. 🛡️ Rock-Solid MongoDB Duplicate-Booking Prevention (Source of Truth)
- **Compound Unique Database Constraint**: MongoDB enforces a partial unique compound index `{ slot: 1, date: 1, seatNumber: 1 }` scoped strictly to `{ status: 'Confirmed' }`.
- **Atomic Concurrency Guarantee**: If two students click to reserve the identical seat at the exact same millisecond, MongoDB's atomic write lock guarantees that **only ONE reservation succeeds**; the competing attempt fails cleanly with an `E11000 duplicate key` / HTTP 409 conflict error.
- **Verified Event Emission**: Socket.IO events are emitted **only after** MongoDB has successfully written and committed the booking or cancellation record.
- **Strict Cancellation Integrity**: Validates that already-cancelled or ineligible bookings cannot be cancelled again.

### 5. 🚌 RedBus Operational Efficiency
- **Interactive Coach Blueprint**: Authentic 2x2 bus seating layout featuring driver cabin, door entrance, center aisle, window/aisle designations, and live seat occupancy status.
- **Seat States**: Real-time visualization of Available (clean white), Selected (vibrant crimson), and Booked/Occupied (locked slate).
- **Seat Availability Counter**: Immediate feedback on seats remaining for every departure time.
- **Direction & Schedule Filters**: Instant filtering by shift (Morning, Afternoon, Evening) and direction (JKLU ➔ City Stops / City ➔ JKLU Campus).
- **Streamlined Booking Steps**: Step-by-step RedBus stepper navigation connecting shuttle selection, stop selection, seat selection, passenger details, and boarding pass.

### 6. 🍏 Apple Minimalism & Design
- **Official Brand Favicon & Identity**: Custom vector and multi-resolution JKLU Shuttle bus badge matching the app's signature brand styling across browser tabs and devices.
- **Frosted Glass Navigation**: Sticky glass header with live campus operations indicator.
- **Segmented Control Tabs**: Seamless switching between **Book Shuttle**, **My Passes**, **Live Bus GPS**, and **Timetable**.
- **Apple Wallet-Style Digital Boarding Pass**:
  - Perforated ticket styling with circular notch cutouts.
  - Verification badge and dynamic SVG QR Code for conductor scanning.
  - Passenger details (Name, Roll Number/Employee ID, Email).
  - Print/Save Pass and cancellation management.
- **Offline & Graceful Fallback**: Works seamlessly online with the Express/MongoDB backend or standalone in offline mode without breaking.

---

## 🛠️ Quick Start Guide

### 1. Start the Backend Server

```bash
cd JKLU-Shuttle-Management-system/server
npm install
npm run dev # or npm start
```
*Server runs at `http://localhost:5000` with automated seeded slots, JWT auth, and offline memory fallback.*

### 2. Start the Frontend Client

```bash
cd JKLU-Shuttle-Management-system/client
npm install
npm start
```
*Frontend runs at `http://localhost:3000` in your web browser.*

### 3. Run Real-Time Tests & Production Build

```bash
# Backend real-time Socket.IO and concurrency tests (9 tests)
cd JKLU-Shuttle-Management-system/server
npm test

# Frontend React & real-time UI tests (23 tests across 4 suites)
cd ../client
npm test -- --watchAll=false
npm run build
```
