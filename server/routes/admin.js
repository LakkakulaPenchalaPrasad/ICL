import express from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Company } from '../models/Company.js';
import { Ticket } from '../models/Ticket.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require superadmin
router.use(authenticate, authorize('superadmin'));

// ─── GET /api/admin/dashboard ─── Platform-wide analytics
router.get('/dashboard', async (req, res) => {
  try {
    const [totalCompanies, totalTickets, totalEmployees, totalCustomers] = await Promise.all([
      Company.countDocuments(),
      Ticket.countDocuments(),
      User.countDocuments({ role: { $in: ['developer', 'employee'] } }),
      User.countDocuments({ role: 'customer' }),
    ]);

    // Tickets by status
    const statusAgg = await Ticket.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const byStatus = {};
    statusAgg.forEach((s) => (byStatus[s._id] = s.count));

    // All companies on platform with live ticket and employee counts
    const allCompanies = await Company.find()
      .populate('developer', 'name email status')
      .sort({ createdAt: -1 });

    const companyAgg = await Promise.all(
      allCompanies.map(async (company) => {
        const [ticketCount, employeeCount] = await Promise.all([
          Ticket.countDocuments({ company: company._id }),
          User.countDocuments({ company: company._id, role: 'employee', status: 'active' }),
        ]);
        return {
          _id: company._id,
          name: company.name,
          slug: company.slug,
          industry: company.industry,
          status: company.status,
          ticketPrefix: company.ticketPrefix,
          developer: company.developer ? company.developer.name : 'Not assigned',
          employeeCount,
          count: ticketCount,
          ticketCount,
        };
      })
    );

    // Recent tickets
    const recentTickets = await Ticket.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('company', 'name slug');

    // Resolution rate
    const resolved = (byStatus['Resolved'] || 0) + (byStatus['Closed'] || 0);
    const resolutionRate = totalTickets > 0 ? ((resolved / totalTickets) * 100).toFixed(1) : '0.0';

    res.json({
      totalCompanies,
      totalTickets,
      totalEmployees,
      totalCustomers,
      byStatus,
      companyAgg,
      recentTickets,
      resolutionRate,
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

// ─── GET /api/admin/companies ─── List all companies
router.get('/companies', async (req, res) => {
  try {
    const companies = await Company.find()
      .populate('developer', 'name email status')
      .sort({ createdAt: -1 });

    // Add employee count and ticket count per company
    const enriched = await Promise.all(
      companies.map(async (company) => {
        const [employeeCount, ticketCount] = await Promise.all([
          User.countDocuments({ company: company._id, role: 'employee', status: 'active' }),
          Ticket.countDocuments({ company: company._id }),
        ]);
        return { ...company.toObject(), employeeCount, ticketCount };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error('List companies error:', err);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// ─── POST /api/admin/companies ─── Create a new company
router.post('/companies', async (req, res) => {
  try {
    const { name, slug, industry, logo } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Company name and slug are required' });
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      return res.status(400).json({ error: 'Slug must be lowercase with hyphens only (e.g., tata-motors)' });
    }

    const existing = await Company.findOne({ slug });
    if (existing) {
      return res.status(409).json({ error: 'A company with this slug already exists' });
    }

    const company = await Company.create({
      name: name.trim(),
      slug: slug.toLowerCase().trim(),
      industry: industry || 'General',
      logo: logo || '',
    });

    res.status(201).json(company);
  } catch (err) {
    console.error('Create company error:', err);
    res.status(500).json({ error: 'Failed to create company' });
  }
});

// ─── PUT /api/admin/companies/:id ─── Update company
router.put('/companies/:id', async (req, res) => {
  try {
    const { name, industry, logo, status } = req.body;
    const updates = {};
    if (name) updates.name = name.trim();
    if (industry) updates.industry = industry;
    if (logo !== undefined) updates.logo = logo;
    if (status) updates.status = status;

    const company = await Company.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('developer', 'name email');

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json(company);
  } catch (err) {
    console.error('Update company error:', err);
    res.status(500).json({ error: 'Failed to update company' });
  }
});

// ─── DELETE /api/admin/companies/:id ─── Suspend company (soft delete)
router.delete('/companies/:id', async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { status: 'suspended' },
      { new: true }
    );

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json({ message: `Company "${company.name}" has been suspended`, company });
  } catch (err) {
    console.error('Delete company error:', err);
    res.status(500).json({ error: 'Failed to suspend company' });
  }
});

// ─── GET /api/admin/developers ─── List all developers
router.get('/developers', async (req, res) => {
  try {
    const developers = await User.find({ role: 'developer' })
      .select('-password')
      .populate('company', 'name slug status')
      .sort({ createdAt: -1 });

    res.json(developers);
  } catch (err) {
    console.error('List developers error:', err);
    res.status(500).json({ error: 'Failed to fetch developers' });
  }
});

// ─── POST /api/admin/developers ─── Create a developer account
router.post('/developers', async (req, res) => {
  try {
    const { name, email, password, companyId } = req.body;

    if (!name || !email || !password || !companyId) {
      return res.status(400).json({ error: 'Name, email, password, and companyId are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (company.developer) {
      return res.status(409).json({ error: 'This company already has a developer assigned' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const developer = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: 'developer',
      company: company._id,
    });

    // Link developer to company
    company.developer = developer._id;
    await company.save();

    const populated = await User.findById(developer._id)
      .select('-password')
      .populate('company', 'name slug');

    res.status(201).json(populated);
  } catch (err) {
    console.error('Create developer error:', err);
    res.status(500).json({ error: 'Failed to create developer' });
  }
});

// ─── DELETE /api/admin/developers/:id ─── Deactivate developer
router.delete('/developers/:id', async (req, res) => {
  try {
    const developer = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'developer' },
      { status: 'dismissed' },
      { new: true }
    ).select('-password');

    if (!developer) {
      return res.status(404).json({ error: 'Developer not found' });
    }

    res.json({ message: `Developer "${developer.name}" has been deactivated`, developer });
  } catch (err) {
    console.error('Delete developer error:', err);
    res.status(500).json({ error: 'Failed to deactivate developer' });
  }
});

export default router;
