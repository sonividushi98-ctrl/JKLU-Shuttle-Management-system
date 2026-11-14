const mongoose = require('mongoose');
const Route = require('../models/Route');
const Slot = require('../models/Slot');
const { memoryStore } = require('./bookingController');
const defaultRoutes = require('../data/defaultRoutes');

const isDbConnected = () => mongoose.connection.readyState === 1;
const DIRECTIONS = ['Campus to City', 'City to Campus'];

const ensureDefaultRoutes = async () => {
  if (!isDbConnected()) return;
  const count = await Route.countDocuments();
  if (count === 0) await Route.insertMany(defaultRoutes);
};

const cleanRoute = (body = {}) => {
  const name = String(body.name || '').trim();
  const direction = String(body.direction || '').trim();
  const origin = String(body.origin || '').trim();
  const destination = String(body.destination || '').trim();
  const availableStops = Array.isArray(body.availableStops)
    ? body.availableStops.map(stop => String(stop).trim()).filter(Boolean)
    : [];
  const durationMinutes = Number(body.durationMinutes);
  const etaMinutes = {};

  if (!name) return { error: 'Route name is required' };
  if (!DIRECTIONS.includes(direction)) return { error: `direction must be one of: ${DIRECTIONS.join(', ')}` };
  if (!origin || !destination) return { error: 'origin and destination are required' };
  if (!availableStops.length) return { error: 'Add at least one route stop' };
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 240) {
    return { error: 'durationMinutes must be a whole number between 1 and 240' };
  }

  availableStops.forEach(stop => {
    const eta = Number(body.etaMinutes && body.etaMinutes[stop]);
    if (Number.isInteger(eta) && eta >= 0 && eta <= durationMinutes) etaMinutes[stop] = eta;
  });

  return {
    value: { name, direction, origin, destination, availableStops, etaMinutes, durationMinutes }
  };
};

const routeResponse = (route) => {
  const value = route.toObject ? route.toObject() : { ...route };
  if (value.etaMinutes instanceof Map) value.etaMinutes = Object.fromEntries(value.etaMinutes);
  return value;
};

exports.listRoutes = async (req, res) => {
  try {
    await ensureDefaultRoutes();
    const routes = isDbConnected() ? await Route.find().sort({ name: 1 }) : memoryStore.routes;
    res.json(routes.map(routeResponse));
  } catch (err) {
    res.status(500).json({ message: 'Error loading routes', error: err.message });
  }
};

exports.createRoute = async (req, res) => {
  try {
    const clean = cleanRoute(req.body);
    if (clean.error) return res.status(400).json({ message: clean.error });
    const existing = isDbConnected()
      ? await Route.findOne({ name: clean.value.name })
      : memoryStore.routes.find(route => route.name.toLowerCase() === clean.value.name.toLowerCase());
    if (existing) return res.status(409).json({ message: 'A route with this name already exists' });

    const route = isDbConnected()
      ? await Route.create(clean.value)
      : { _id: `route-${Date.now()}-${memoryStore.routes.length}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...clean.value };
    if (!isDbConnected()) memoryStore.routes.push(route);
    res.status(201).json({ message: 'Route created successfully', route: routeResponse(route) });
  } catch (err) {
    res.status(500).json({ message: 'Error creating route', error: err.message });
  }
};

exports.updateRoute = async (req, res) => {
  try {
    const clean = cleanRoute(req.body);
    if (clean.error) return res.status(400).json({ message: clean.error });
    const route = isDbConnected()
      ? await Route.findById(req.params.routeId)
      : memoryStore.routes.find(item => item._id === req.params.routeId);
    if (!route) return res.status(404).json({ message: 'Route not found' });

    const duplicate = isDbConnected()
      ? await Route.findOne({ name: clean.value.name, _id: { $ne: req.params.routeId } })
      : memoryStore.routes.find(item => item._id !== req.params.routeId && item.name.toLowerCase() === clean.value.name.toLowerCase());
    if (duplicate) return res.status(409).json({ message: 'A route with this name already exists' });

    if (isDbConnected()) {
      Object.assign(route, clean.value);
      await route.save();
    } else {
      Object.assign(route, clean.value, { updatedAt: new Date().toISOString() });
    }
    res.json({ message: 'Route updated successfully', route: routeResponse(route) });
  } catch (err) {
    res.status(500).json({ message: 'Error updating route', error: err.message });
  }
};

exports.deleteRoute = async (req, res) => {
  try {
    const routeId = req.params.routeId;
    const route = isDbConnected()
      ? (mongoose.isValidObjectId(routeId) ? await Route.findById(routeId) : null)
      : memoryStore.routes.find(item => item._id === routeId);
    if (!route) return res.status(404).json({ message: 'Route not found' });

    const inUse = isDbConnected()
      ? await Slot.exists({ $or: [{ routeId }, { routeName: route.name }] })
      : memoryStore.slots.some(slot => String(slot.routeId || '') === routeId || slot.routeName === route.name);
    if (inUse) return res.status(409).json({ message: 'This route is assigned to a shuttle. Edit or remove those shuttles first.' });

    const result = isDbConnected()
      ? await Route.deleteOne({ _id: routeId })
      : { deletedCount: 1 };
    if (!isDbConnected() && result.deletedCount) {
      memoryStore.routes = memoryStore.routes.filter(route => route._id !== routeId);
    }
    if (!result.deletedCount) return res.status(404).json({ message: 'Route not found' });
    res.json({ message: 'Route deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting route', error: err.message });
  }
};
