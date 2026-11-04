import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectToDatabase } from './config/db.js';

// Route imports
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import companyRoutes from './routes/companies.js';
import ticketRoutes from './routes/tickets.js';
import faqRoutes from './routes/articles.js';
import categoryRoutes from './routes/analytics.js';
import { Company } from './models/Company.js';
import { Ticket } from './models/Ticket.js';

dotenv.config();

const app = express();

// ─── Middleware ───
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ─── Auto-connect DB for all /api requests ───
app.use('/api', async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    next();
  }
});

// ─── Health Check ───
const healthHandler = (req, res) => {
  const readyState = mongoose.connection.readyState;
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

  res.json({
    status: readyState === 1 ? 'ok' : 'degraded',
    database: {
      status: states[readyState] || 'unknown',
      connected: readyState === 1,
      name: mongoose.connection.name || 'icl_db',
      host: mongoose.connection.host || 'MongoDB Atlas',
    },
    serverTime: new Date().toISOString(),
  });
};

app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// ─── API Routes ───

// Auth (login, google, me)
app.use('/api/auth', authRoutes);

// Super Admin panel
app.use('/api/admin', adminRoutes);

// Public active companies list (for platform directory & landing page)
app.get('/api/companies', async (req, res) => {
  try {
    const companies = await Company.find({ status: 'active' })
      .select('name slug logo industry branding ticketPrefix status')
      .sort({ createdAt: -1 })
      .lean();

    const companyIds = companies.map((c) => c._id);
    const counts = await Ticket.aggregate([
      { $match: { company: { $in: companyIds } } },
      { $group: { _id: '$company', ticketCount: { $sum: 1 } } },
    ]);

    const countMap = new Map(counts.map((item) => [item._id.toString(), item.ticketCount]));

    const enriched = companies.map((c) => ({
      ...c,
      ticketCount: countMap.get(c._id.toString()) || 0,
    }));

    // Cache at edge for 15s to make landing page instantaneous
    res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=59');
    res.json(enriched);
  } catch (err) {
    console.error('Public companies fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// Company-scoped routes (public info, dashboard, branding, employees)
app.use('/api/companies/:slug', companyRoutes);

// Company-scoped tickets
app.use('/api/companies/:slug/tickets', ticketRoutes);

// Company-scoped FAQs
app.use('/api/companies/:slug/faqs', faqRoutes);

// Company-scoped categories
app.use('/api/companies/:slug/categories', categoryRoutes);

// ─── Global Error Handler ───
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

export default app;
