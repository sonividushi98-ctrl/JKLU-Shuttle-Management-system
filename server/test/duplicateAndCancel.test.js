const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const http = require('http');
const bookingController = require('../controllers/bookingController');
const { initSocket } = require('../socket');

test('Booking validation, duplicate prevention, and cancellation endpoints', async (t) => {
  const app = express();
  app.use(express.json());
  const server = http.createServer(app);
  initSocket(server);

  app.post('/api/bookings/book', bookingController.createBooking);
  app.post('/api/bookings/cancel/:bookingId', bookingController.cancelBooking);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/bookings`;

  const slotId = '672000000000000000000011';
  const date = '2026-11-25';
  const seatNumber = 19;

  let bookedId = null;

  await t.test('1. First student books a seat successfully', async () => {
    const res = await fetch(`${baseUrl}/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slotId,
        date,
        seatNumber,
        stop: 'Elements Mall',
        passengerName: 'Student One',
        passengerRoll: '2023BTECH001'
      })
    });

    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.ok(data.booking);
    assert.strictEqual(data.booking.seatNumber, seatNumber);
    assert.strictEqual(data.booking.status, 'Confirmed');
    bookedId = data.booking._id;
  });

  await t.test('2. Simultaneous / duplicate attempt on the same seat is strictly rejected', async () => {
    // Attempt 2 bookings concurrently for the exact same seat
    const [res1, res2] = await Promise.all([
      fetch(`${baseUrl}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId,
          date,
          seatNumber,
          stop: 'Elements Mall',
          passengerName: 'Student Two',
          passengerRoll: '2023BTECH002'
        })
      }),
      fetch(`${baseUrl}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId,
          date,
          seatNumber,
          stop: 'Elements Mall',
          passengerName: 'Student Three',
          passengerRoll: '2023BTECH003'
        })
      })
    ]);

    assert.strictEqual(res1.status, 400);
    const data1 = await res1.json();
    assert.match(data1.message, /already booked/i);

    assert.strictEqual(res2.status, 400);
    const data2 = await res2.json();
    assert.match(data2.message, /already booked/i);
  });

  await t.test('3. Booking is cancelled successfully and frees the seat', async () => {
    assert.ok(bookedId, 'A valid booking ID must exist');
    const res = await fetch(`${baseUrl}/cancel/${bookedId}`, {
      method: 'POST'
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.booking.status, 'Cancelled');
  });

  await t.test('4. Already cancelled booking cannot be cancelled again', async () => {
    const res = await fetch(`${baseUrl}/cancel/${bookedId}`, {
      method: 'POST'
    });

    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.match(data.message, /already cancelled/i);
  });

  await t.test('5. Seat becomes bookable again after cancellation', async () => {
    const res = await fetch(`${baseUrl}/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slotId,
        date,
        seatNumber,
        stop: 'Elements Mall',
        passengerName: 'Student Four',
        passengerRoll: '2023BTECH004'
      })
    });

    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.booking.seatNumber, seatNumber);
  });

  await new Promise((resolve) => server.close(resolve));
});

