const { Server } = require('socket.io');

let io = null;

const getScheduleRoom = (slotId, date) => `schedule:${String(slotId)}:${String(date)}`;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    // Client requests to join a schedule-specific room (slot + date)
    socket.on('join-schedule', (data) => {
      try {
        const { slotId, date } = data || {};
        if (slotId && date) {
          const room = getScheduleRoom(slotId, date);
          socket.join(room);
          socket.emit('joined-schedule', { room, slotId, date });
        }
      } catch (err) {
        console.error('Error in join-schedule handler:', err.message);
      }
    });

    // Client requests to leave a schedule room
    socket.on('leave-schedule', (data) => {
      try {
        const { slotId, date } = data || {};
        if (slotId && date) {
          const room = getScheduleRoom(slotId, date);
          socket.leave(room);
        }
      } catch (err) {
        console.error('Error in leave-schedule handler:', err.message);
      }
    });

    socket.on('disconnect', () => {
      // Cleaned up automatically by Socket.IO
    });
  });

  return io;
};

const getIO = () => io;

/**
 * Broadcast when a seat is successfully booked in MongoDB.
 * Reaches only clients in the schedule room.
 */
const broadcastSeatBooked = ({ slotId, date, seatNumber, bookedSeats, booking }) => {
  if (!io) return;
  const room = getScheduleRoom(slotId, date);
  io.to(room).emit('seat-booked', {
    slotId: String(slotId),
    date: String(date),
    seatNumber: Number(seatNumber),
    bookedSeats: Array.isArray(bookedSeats) ? bookedSeats : undefined,
    bookingId: booking?._id ? String(booking._id) : undefined
  });
};

/**
 * Broadcast when a booking is successfully cancelled in MongoDB.
 * Reaches only clients in the schedule room.
 */
const broadcastSeatCancelled = ({ slotId, date, seatNumber, bookedSeats, bookingId }) => {
  if (!io) return;
  const room = getScheduleRoom(slotId, date);
  io.to(room).emit('seat-cancelled', {
    slotId: String(slotId),
    date: String(date),
    seatNumber: Number(seatNumber),
    bookedSeats: Array.isArray(bookedSeats) ? bookedSeats : undefined,
    bookingId: bookingId ? String(bookingId) : undefined
  });
};

/**
 * Broadcast when an entire schedule is cancelled by an admin.
 */
const broadcastScheduleCancelled = ({ slotId, date, reason }) => {
  if (!io) return;
  const room = getScheduleRoom(slotId, date);
  io.to(room).emit('schedule-cancelled', {
    slotId: String(slotId),
    date: String(date),
    reason
  });
};

module.exports = {
  initSocket,
  getIO,
  getScheduleRoom,
  broadcastSeatBooked,
  broadcastSeatCancelled,
  broadcastScheduleCancelled
};

