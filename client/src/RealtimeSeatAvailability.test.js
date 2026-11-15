import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import axios from 'axios';
import App from './App';
import * as socketService from './services/socket';

jest.mock('axios');

describe('Cancel Booking in Confirmation Details & Real-Time Seat Availability', () => {
  let mockSocket;
  let listeners = {};

  beforeEach(() => {
    listeners = {};
    window.scrollTo = jest.fn();

    localStorage.setItem('jklu_auth_token', 'test-real-jwt-token');
    localStorage.setItem(
      'jklu_auth_user',
      JSON.stringify({
        id: 'student-test-123',
        name: 'Student User',
        rollNumber: '2023BTECH001',
        email: 'student@jklu.edu.in',
        role: 'Student'
      })
    );

    axios.get.mockImplementation((url) => {
      if (url.includes('/me')) {
        return Promise.resolve({
          data: {
            id: 'student-test-123',
            name: 'Student User',
            rollNumber: '2023BTECH001',
            email: 'student@jklu.edu.in',
            role: 'Student'
          }
        });
      }
      if (url.includes('/booked-seats')) {
        return Promise.resolve({ data: { bookedSeats: [3, 7, 12, 18, 22] } });
      }
      if (url.includes('/slots')) {
        return Promise.resolve({ data: [] });
      }
      return Promise.resolve({ data: {} });
    });

    axios.post.mockImplementation((url, data) => {
      if (url.includes('/book')) {
        return Promise.resolve({
          data: {
            booking: {
              _id: 'booking-real-123',
              user: 'student-test-123',
              slot: { _id: 'slot-1', time: '01:30 PM', busNumber: 'RJ 14 PA 2024' },
              stop: 'Elements Mall',
              seatNumber: data.seatNumber,
              date: data.date,
              passengerName: 'Student User',
              passengerRoll: '2023BTECH001',
              passengerEmail: 'student@jklu.edu.in',
              status: 'Confirmed',
              bookingCode: 'JKLU-123456',
              createdAt: new Date().toISOString()
            }
          }
        });
      }
      if (url.includes('/cancel/')) {
        return Promise.resolve({
          data: {
            message: 'Booking cancelled successfully'
          }
        });
      }
      return Promise.resolve({ data: {} });
    });

    mockSocket = {
      connected: true,
      on: (event, cb) => {
        listeners[event] = cb;
      },
      off: (event) => {
        delete listeners[event];
      },
      emit: jest.fn(),
      once: jest.fn()
    };

    jest.spyOn(socketService, 'getSocket').mockReturnValue(mockSocket);
    jest.spyOn(socketService, 'joinScheduleRoom').mockImplementation((slotId, date) => {
      mockSocket.emit('join-schedule', { slotId, date });
    });
    jest.spyOn(socketService, 'leaveScheduleRoom').mockImplementation((slotId, date) => {
      mockSocket.emit('leave-schedule', { slotId, date });
    });
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.restoreAllMocks();
  });

  test('Cancel Booking button is displayed in Step 4 and confirms cancellation', async () => {
    jest.spyOn(window, 'confirm').mockImplementation(() => true);

    render(<App />);

    // Click Tomorrow chip to view bookable future shuttles
    const tomorrowBtn = screen.getByRole('button', { name: /Tomorrow/i });
    fireEvent.click(tomorrowBtn);

    // Select a shuttle
    const selectButtons = screen.getAllByRole('button', { name: /Select Seats/i });
    fireEvent.click(selectButtons[0]);

    // Choose stop
    const chooseStopBtns = screen.getAllByRole('button', { name: /Choose Stop/i });
    fireEvent.click(chooseStopBtns[0]);

    // Select an available seat (e.g. Seat 1)
    const seat1 = screen.getByTitle(/Seat 1 /i);
    expect(seat1).not.toHaveClass('booked');
    fireEvent.click(seat1);

    // Click Confirm Seat & Generate Pass
    const confirmBtn = screen.getByRole('button', { name: /Confirm Seat & Generate Pass/i });
    fireEvent.click(confirmBtn);

    // Verify Step 4 renders with the Cancel Booking button in confirmation details
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Cancel Booking/i })).toBeInTheDocument();
    });

    const cancelBtn = screen.getByRole('button', { name: /Cancel Booking/i });
    fireEvent.click(cancelBtn);

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringMatching(/Are you sure you want to cancel this shuttle seat booking/i)
    );

    // After cancellation, status updates to Cancelled
    await waitFor(() => {
      expect(screen.getAllByText(/Booking Cancelled/i).length).toBeGreaterThan(0);
    });

    // Cancel button is now disabled / displays Booking Cancelled
    expect(screen.getByRole('button', { name: /Booking Cancelled/i })).toBeDisabled();
  });

  test('Real-time seat-booked event updates seat availability without refresh', async () => {
    render(<App />);

    // Click Tomorrow chip
    const tomorrowBtn = screen.getByRole('button', { name: /Tomorrow/i });
    fireEvent.click(tomorrowBtn);

    // Select a shuttle to reach Seat Selection (Step 3)
    const selectButtons = screen.getAllByRole('button', { name: /Select Seats/i });
    fireEvent.click(selectButtons[0]);

    const chooseStopBtns = screen.getAllByRole('button', { name: /Choose Stop/i });
    fireEvent.click(chooseStopBtns[0]);

    // Wait for schedule room to be joined
    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith('join-schedule', expect.any(Object));
    });

    const joinCalls = mockSocket.emit.mock.calls.filter((c) => c[0] === 'join-schedule');
    const { slotId, date } = joinCalls[joinCalls.length - 1][1];

    expect(typeof listeners['seat-booked']).toBe('function');

    // Seat 1 is initially available
    expect(screen.getByTitle(/Seat 1 /i)).not.toHaveClass('booked');

    // Trigger seat-booked event from socket inside act()
    act(() => {
      listeners['seat-booked']({
        slotId,
        date,
        seatNumber: 1,
        bookedSeats: [1, 3, 7, 12, 18, 22]
      });
    });

    // Seat 1 must now immediately be marked booked without any page reload
    await waitFor(() => {
      expect(screen.getByTitle(/Seat 1 /i)).toHaveClass('booked');
    });
  });

  test('Real-time seat-cancelled event makes the seat available again without refresh', async () => {
    render(<App />);

    // Click Tomorrow chip
    const tomorrowBtn = screen.getByRole('button', { name: /Tomorrow/i });
    fireEvent.click(tomorrowBtn);

    const selectButtons = screen.getAllByRole('button', { name: /Select Seats/i });
    fireEvent.click(selectButtons[0]);

    const chooseStopBtns = screen.getAllByRole('button', { name: /Choose Stop/i });
    fireEvent.click(chooseStopBtns[0]);

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith('join-schedule', expect.any(Object));
    });

    const joinCalls = mockSocket.emit.mock.calls.filter((c) => c[0] === 'join-schedule');
    const { slotId, date } = joinCalls[joinCalls.length - 1][1];

    // Seat 3 is initially booked after slots/booked-seats load
    await waitFor(() => {
      expect(screen.getByTitle(/Seat 3 /i)).toHaveClass('booked');
    });

    // Simulate real-time cancellation of Seat 3 inside act()
    act(() => {
      listeners['seat-cancelled']({
        slotId,
        date,
        seatNumber: 3,
        bookedSeats: [7, 12, 18, 22]
      });
    });

    // Seat 3 must now immediately become available
    await waitFor(() => {
      expect(screen.getByTitle(/Seat 3 /i)).not.toHaveClass('booked');
    });
  });
});
