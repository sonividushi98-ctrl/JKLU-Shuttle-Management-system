import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      // connected
    });

    socket.on('disconnect', (reason) => {
      // disconnected
    });

    socket.on('connect_error', (error) => {
      // connection error
    });
  }

  return socket;
};

/**
 * Join a schedule-specific room so real-time updates only target students viewing this schedule.
 */
export const joinScheduleRoom = (slotId, date) => {
  if (!slotId || !date) return;
  const s = getSocket();
  if (s.connected) {
    s.emit('join-schedule', { slotId: String(slotId), date: String(date) });
  } else {
    s.once('connect', () => {
      s.emit('join-schedule', { slotId: String(slotId), date: String(date) });
    });
  }
};

/**
 * Leave a schedule-specific room.
 */
export const leaveScheduleRoom = (slotId, date) => {
  if (!slotId || !date) return;
  const s = getSocket();
  if (s && s.connected) {
    s.emit('leave-schedule', { slotId: String(slotId), date: String(date) });
  }
};

