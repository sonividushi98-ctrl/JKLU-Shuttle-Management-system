# JKLU Shuttle Management System 🚌✨

A sleek, modern, and highly intuitive Campus Shuttle Booking App designed specifically for **JK Lakshmipat University (JKLU)**. 

The app blends **RedBus's operational efficiency** (live coach layout, seat booking status, instant ticket generation) with **Apple's signature minimalism** (glassmorphism navigation, crisp typography, clean whitespace, and Apple Wallet-style digital boarding passes).

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

### 1. RedBus Operational Efficiency
- **Interactive Coach Blueprint**: Authentic 2x2 bus seating layout featuring driver cabin, door entrance, center aisle, window/aisle designations, and live seat occupancy status.
- **Seat States**: Real-time visualization of Available (clean white), Selected (vibrant crimson), and Booked/Occupied (locked slate).
- **Seat Availability Counter**: Immediate feedback on seats remaining for every departure time.
- **Direction & Schedule Filters**: Instant filtering by shift (Morning, Afternoon, Evening, Night) and direction.

### 2. Apple Minimalism
- **Frosted Glass Navigation**: Sticky glass header with live campus operations indicator.
- **Segmented Control Tabs**: Seamless switching between **Book Shuttle**, **My Passes**, **3 Stops Route Explorer**, and **Timetable**.
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
*Server runs at `http://localhost:5000` with automated seeded slots and offline memory fallback.*

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

