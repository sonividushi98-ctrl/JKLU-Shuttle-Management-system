const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const express = require('express');
const { io: ClientIO } = require('socket.io-client');
const { initSocket, broadcastSeatBooked, broadcastSeatCancelled, getScheduleRoom } = require('../socket');

test('Socket.IO schedule room and real-time seat availability events', async (t) => {
  const app = express();
  const server = http.createServer(app);
  initSocket(server);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const serverUrl = `http://localhost:${port}`;

  const client1 = ClientIO(serverUrl, { transports: ['websocket'] });
  const client2 = ClientIO(serverUrl, { transports: ['websocket'] });

  await Promise.all([
    new Promise((resolve) => client1.on('connect', resolve)),
    new Promise((resolve) => client2.on('connect', resolve))
  ]);

  const targetSlotId = '672000000000000000000011';
  const targetDate = '2026-11-20';
  const otherSlotId = '672000000000000000000012';

  // Client 1 joins the target schedule room
  client1.emit('join-schedule', { slotId: targetSlotId, date: targetDate });
  // Client 2 joins a DIFFERENT schedule room
  client2.emit('join-schedule', { slotId: otherSlotId, date: targetDate });

  // Wait a short moment for rooms to register
  await new Promise((r) => setTimeout(r, 100));

  await t.test('broadcastSeatBooked only reaches clients in the relevant schedule room', async () => {
    let client1Received = null;
    let client2Received = null;

    client1.on('seat-booked', (data) => {
      client1Received = data;
    });

    client2.on('seat-booked', (data) => {
      client2Received = data;
    });

    broadcastSeatBooked({
      slotId: targetSlotId,
      date: targetDate,
      seatNumber: 15,
      bookedSeats: [4, 12, 15]
    });

    await new Promise((r) => setTimeout(r, 150));

    assert.ok(client1Received !== null, 'Client 1 in schedule room should receive seat-booked event');
    assert.strictEqual(client1Received.seatNumber, 15);
    assert.strictEqual(client1Received.slotId, targetSlotId);
    assert.strictEqual(client2Received, null, 'Client 2 in another schedule room should NOT receive the event');
  });

  await t.test('broadcastSeatCancelled sends updated seats to clients in the schedule room', async () => {
    let client1Cancelled = null;

    client1.on('seat-cancelled', (data) => {
      client1Cancelled = data;
    });

    broadcastSeatCancelled({
      slotId: targetSlotId,
      date: targetDate,
      seatNumber: 15,
      bookedSeats: [4, 12]
    });

    await new Promise((r) => setTimeout(r, 150));

    assert.ok(client1Cancelled !== null, 'Client 1 should receive seat-cancelled event');
    assert.strictEqual(client1Cancelled.seatNumber, 15);
    assert.deepStrictEqual(client1Cancelled.bookedSeats, [4, 12]);
  });

  client1.disconnect();
  client2.disconnect();
  await new Promise((resolve) => server.close(resolve));
});

