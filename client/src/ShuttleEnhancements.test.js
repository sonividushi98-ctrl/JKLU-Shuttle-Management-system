import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from './App';
import { bookingStepList, STEP_SELECT_SHUTTLE, STEP_CHOOSE_STOP } from './utils/bookingStepsLinkedList';
import { isTripDeparted } from './data/trips';

describe('Booking Wizard Linked List Navigation & Synchronization', () => {
  test('Step Linked List correctly connects Select Shuttle and Choose Stop', () => {
    const node1 = bookingStepList.getNode(STEP_SELECT_SHUTTLE);
    const node2 = bookingStepList.getNode(STEP_CHOOSE_STOP);

    expect(node1.next).toBe(node2);
    expect(node2.prev).toBe(node1);

    // Cannot jump to Step 2 if Step 1 is not completed (no slot selected)
    const stateIncomplete = { selectedSlot: null, selectedStop: '' };
    expect(bookingStepList.canNavigateTo(STEP_CHOOSE_STOP, stateIncomplete)).toBe(false);

    // Can jump to Step 2 after Step 1 is completed
    const stateComplete = { selectedSlot: { _id: '123', time: '01:30 PM' }, selectedStop: '' };
    expect(bookingStepList.canNavigateTo(STEP_CHOOSE_STOP, stateComplete)).toBe(true);
    expect(bookingStepList.getNextStep(STEP_SELECT_SHUTTLE, stateComplete)).toBe(STEP_CHOOSE_STOP);
  });

  test('UI does not allow clicking Choose Stop before selecting a shuttle', () => {
    render(<App />);

    // Initially at Step 1
    const chooseStopStep = screen.getByText('Choose Stop').closest('.step-item');
    expect(chooseStopStep).toHaveClass('step-locked');

    // Click on Choose Stop when no shuttle is selected
    fireEvent.click(chooseStopStep);

    // Should remain on Step 1 and display guidance error
    expect(screen.getByText(/Please select a shuttle first before choosing a stop/i)).toBeInTheDocument();
    expect(screen.queryByText(/Select Your Drop Stop/i)).not.toBeInTheDocument();
  });

  test('isTripDeparted accurately marks past shuttle times today as departed', () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;

    // A past time (e.g. 05:00 AM)
    expect(isTripDeparted({ time: '05:00 AM' }, today)).toBe(true);

    // A future date (tomorrow) is never marked departed regardless of time
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    expect(isTripDeparted({ time: '05:00 AM' }, tomorrowStr)).toBe(false);
  });

  test('removes "gate1active express ready" from book shuttle page', () => {
    render(<App />);
    expect(screen.queryByText(/Gate 1 Active • Express Ready/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/gate1active express ready/i)).not.toBeInTheDocument();
  });

  test('removes the page 3 stops route from navigation', () => {
    render(<App />);
    expect(screen.queryByRole('button', { name: /3 Stops Route/i })).not.toBeInTheDocument();
  });
});

describe('Live Bus GPS Page Modifications', () => {
  beforeEach(() => {
    render(<App />);
    // Switch to Live Bus GPS tab
    const liveGpsTabBtn = screen.getByRole('button', { name: /Live Bus GPS/i });
    fireEvent.click(liveGpsTabBtn);
  });

  test('removes "GPS Active" green badge in page live bus gps', () => {
    expect(screen.queryByText(/GPS Active/i)).not.toBeInTheDocument();
  });

  test('removes "Live GPS Tracking" and replaces it with "Bus:"', () => {
    expect(screen.queryByText(/Live GPS Tracking:/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Bus:/i)).toBeInTheDocument();
  });

  test('removes simulation and telemetry controls (pause movement, advance next stop, reset to gate 1)', () => {
    expect(screen.queryByText(/Real-Time GPS Telemetry Stream/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Pause Movement/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Resume Simulation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Advance Next Stop/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Reset to Gate 1/i)).not.toBeInTheDocument();
  });

  test('in driver details, removes type, security status, and 9 yrs service', () => {
    expect(screen.queryByText(/9 Yrs Service/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Security Status:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Executive AC Campus Express/i)).not.toBeInTheDocument();
  });

  test('instead of eta, displays approximate travel time', () => {
    expect(screen.queryByText(/^ETA ~/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/Approximate Travel Time/i).length).toBeGreaterThan(0);
  });

  test('removes Distance Covered and live speed from page live bus gps', () => {
    expect(screen.queryByText(/Distance Covered/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Live Speed/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cruise Speed on Highway/i)).not.toBeInTheDocument();
  });

  test('ensures route, selected shuttle, departure time and travel time remain synchronized', () => {
    // Shows synchronized route and departure info
    expect(screen.getAllByText(/Departure/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Synchronized Shuttle:/i)).toBeInTheDocument();
  });
});

