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
    const { name, industry, logo, status, ticketPrefix, developerId } = req.body;
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (name) company.name = name.trim();
    if (industry) company.industry = industry.trim();
    if (logo !== undefined) company.logo = logo;
    if (status) company.status = status;
    if (ticketPrefix !== undefined) {
      company.ticketPrefix = ticketPrefix ? ticketPrefix.trim().toUpperCase() : '';
    }

    // Handle developer reassignment / unlinking
    if (developerId !== undefined) {
      if (developerId && developerId !== '') {
        const newDev = await User.findOne({ _id: developerId, role: 'developer' });
        if (!newDev) {
          return res.status(404).json({ error: 'Developer not found' });
        }

        // Unlink developer from any previous company
        await Company.updateOne(
          { developer: newDev._id, _id: { $ne: company._id } },
          { $set: { developer: null } }
        );

        // If company previously had a different developer, unlink old developer's company
        if (company.developer && company.developer.toString() !== newDev._id.toString()) {
          await User.findByIdAndUpdate(company.developer, { company: null });
        }

        newDev.company = company._id;
        await newDev.save();
        company.developer = newDev._id;
      } else {
        // Unassign developer
        if (company.developer) {
          await User.findByIdAndUpdate(company.developer, { company: null });
        }
        company.developer = null;
      }
    }

    await company.save();
    const updated = await Company.findById(company._id).populate('developer', 'name email status');

    res.json(updated);
  } catch (err) {
    console.error('Update company error:', err);
    res.status(500).json({ error: 'Failed to update company' });
  }
});

// ─── DELETE /api/admin/companies/:id ─── Suspend or permanently delete company
router.delete('/companies/:id', async (req, res) => {
  try {
    const { permanent } = req.query;
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (permanent === 'true') {
      // Permanent removal: Unlink developer, unlink employees, remove tickets, remove company
      await User.updateOne({ company: company._id, role: 'developer' }, { $set: { company: null } });
      await User.updateMany({ company: company._id, role: 'employee' }, { $set: { company: null, status: 'dismissed' } });
      await Ticket.deleteMany({ company: company._id });
      await Company.findByIdAndDelete(company._id);

      return res.json({
        message: `Company "${company.name}" has been permanently removed`,
        deletedCompanyId: company._id,
      });
    }

    // Otherwise soft delete (toggle or set to suspended)
    const newStatus = company.status === 'active' ? 'suspended' : 'active';
    company.status = newStatus;
    await company.save();

    res.json({
      message: `Company "${company.name}" is now ${newStatus}`,
      company,
    });
  } catch (err) {
    console.error('Delete company error:', err);
    res.status(500).json({ error: 'Failed to process company deletion' });
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

// ─── PUT /api/admin/developers/:id ─── Update developer details (email, name, password, company)
router.put('/developers/:id', async (req, res) => {
  try {
    const { name, email, password, companyId, status } = req.body;

    const developer = await User.findOne({ _id: req.params.id, role: 'developer' });
    if (!developer) {
      return res.status(404).json({ error: 'Developer not found' });
    }

    // If email is changing, validate & verify unique
    if (email && email.toLowerCase().trim() !== developer.email) {
      const cleanEmail = email.toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ error: 'Invalid email address format' });
      }

      const existingUser = await User.findOne({
        email: cleanEmail,
        _id: { $ne: developer._id },
      });
      if (existingUser) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }

      developer.email = cleanEmail;
    }

    if (name) developer.name = name.trim();
    if (status) developer.status = status;

    // Optional password reset
    if (password && password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      developer.password = await bcrypt.hash(password.trim(), salt);
    }

    // Company reassignment
    if (companyId !== undefined) {
      const currentCompId = developer.company ? developer.company.toString() : '';
      const newCompId = companyId ? companyId.toString() : '';

      if (currentCompId !== newCompId) {
        // Unlink from current company
        if (developer.company) {
          await Company.findByIdAndUpdate(developer.company, { developer: null });
        }

        if (newCompId) {
          const targetComp = await Company.findById(newCompId);
          if (!targetComp) {
            return res.status(404).json({ error: 'Selected company not found' });
          }

          // If target company already has another developer assigned, error
          if (targetComp.developer && targetComp.developer.toString() !== developer._id.toString()) {
            return res.status(409).json({
              error: `Company "${targetComp.name}" already has another developer assigned.`,
            });
          }

          targetComp.developer = developer._id;
          await targetComp.save();
          developer.company = targetComp._id;
        } else {
          developer.company = null;
        }
      }
    }

    await developer.save();

    const populated = await User.findById(developer._id)
      .select('-password')
      .populate('company', 'name slug status');

    res.json(populated);
  } catch (err) {
    console.error('Update developer error:', err);
    res.status(500).json({ error: 'Failed to update developer' });
  }
});

// ─── DELETE /api/admin/developers/:id ─── Deactivate or permanently delete developer
router.delete('/developers/:id', async (req, res) => {
  try {
    const { permanent, action } = req.query;
    const developer = await User.findOne({ _id: req.params.id, role: 'developer' });

    if (!developer) {
      return res.status(404).json({ error: 'Developer not found' });
    }

    if (permanent === 'true') {
      // Unlink developer from company
      await Company.updateOne({ developer: developer._id }, { $set: { developer: null } });
      await User.findByIdAndDelete(developer._id);

      return res.json({
        message: `Developer "${developer.name}" has been permanently deleted`,
        deletedDeveloperId: developer._id,
      });
    }

    // Status toggle (activate / deactivate)
    let nextStatus = 'dismissed';
    if (action === 'activate' || developer.status === 'dismissed') {
      nextStatus = 'active';
    }

    developer.status = nextStatus;
    await developer.save();

    // If deactivated, we can keep or unlink company. Let's keep company link unless permanent, but indicate status.
    const populated = await User.findById(developer._id)
      .select('-password')
      .populate('company', 'name slug status');

    res.json({
      message: `Developer "${developer.name}" is now ${nextStatus}`,
      developer: populated,
    });
  } catch (err) {
    console.error('Delete developer error:', err);
    res.status(500).json({ error: 'Failed to process developer request' });
  }
});

export default router;
