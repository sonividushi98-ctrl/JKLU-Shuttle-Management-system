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
- **Interactive Corridor Road**: Animated shuttle bus marker progressing in real-time along the Ajmer Road Highway across all 4 waypoints (*JKLU Gate 1 ➔ 200 Feet Bypass ➔ Elements Mall ➔ Mansarovar Metro*).
- **Live Telemetry & Dashboard**: Real-time speedometer gauge (e.g. 42 km/h), Next Stop countdown, distance covered/remaining, and highway traffic status.
- **Driver Profile & Direct Contact**: Displays driver name, campus ID, experience, vehicle plate number, and 1-tap direct phone call button.
- **Milestone Activity Feed**: Chronological log of departures, toll crossings, and stop arrivals.

### 3. 🚌 RedBus Operational Efficiency
- **Interactive Coach Blueprint**: Authentic 2x2 bus seating layout featuring driver cabin, door entrance, center aisle, window/aisle designations, and live seat occupancy status.
- **Seat States**: Real-time visualization of Available (clean white), Selected (vibrant crimson), and Booked/Occupied (locked slate).
- **Seat Availability Counter**: Immediate feedback on seats remaining for every departure time.
- **Direction & Schedule Filters**: Instant filtering by shift (Morning, Afternoon, Evening, Night) and direction.

### 4. 🍏 Apple Minimalism
- **Frosted Glass Navigation**: Sticky glass header with live campus operations indicator.
- **Segmented Control Tabs**: Seamless switching between **Book Shuttle**, **My Passes**, **Live Bus GPS**, **3 Stops Route Explorer**, and **Timetable**.
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

### 3. Run Tests & Production Build

```bash
cd JKLU-Shuttle-Management-system/client
npm test -- --watchAll=false
npm run build
```
