import express from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Company } from '../models/Company.js';
import { Ticket } from '../models/Ticket.js';
import { FAQ } from '../models/Article.js';
import { Category } from '../models/Category.js';
import { authenticate, authorize, authorizeCompany } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true }); // Access :slug from parent

// ─── Helper: Get company from slug ───
const getCompany = async (req, res) => {
  if (req.company) return req.company;
  const company = await Company.findOne({ slug: req.params.slug });
  if (!company) {
    res.status(404).json({ error: 'Company not found' });
    return null;
  }
  req.company = company;
  return company;
};

// ─── GET /api/companies/:slug/public ─── Public info for service page (no auth)
router.get('/public', async (req, res) => {
  try {
    const company = await Company.findOne({ slug: req.params.slug })
      .select('name slug logo industry branding status developer ticketPrefix')
      .lean();

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (company.status === 'suspended') {
      return res.status(403).json({ error: 'This company service page is currently unavailable' });
    }

    const [faqs, dbCategories, activeEmployees, developer] = await Promise.all([
      FAQ.find({ company: company._id, isVisible: true }).sort({ order: 1 }).lean(),
      Category.find({ company: company._id, isActive: true }).lean(),
      User.find({ company: company._id, role: 'employee', status: 'active' }).select('name department').lean(),
      company.developer ? User.findById(company.developer).select('name email').lean() : null,
    ]);

    const topicDepartmentMap = [
      {
        keywords: ['finance', 'billing', 'payment', 'refund', 'invoice', 'charge', 'money', 'fee', 'credit card'],
        deptKeywords: ['finance', 'billing', 'accounts', 'payment', 'payroll'],
      },
      {
        keywords: ['tech', 'technical', 'bug', 'software', 'crash', 'login', 'password', 'access', 'security', 'it', 'code'],
        deptKeywords: ['tech', 'technical', 'support', 'it', 'engineering', 'developer'],
      },
      {
        keywords: ['delivery', 'logistics', 'order', 'shipping', 'package', 'courier', 'dispatch', 'transit', 'warehouse'],
        deptKeywords: ['logistics', 'delivery', 'operations', 'order', 'fulfillment', 'supply'],
      },
      {
        keywords: ['quality', 'defect', 'damaged', 'replacement', 'warranty', 'broken'],
        deptKeywords: ['quality', 'product', 'qa', 'hardware', 'logistics'],
      },
      {
        keywords: ['customer', 'relations', 'general', 'inquiry', 'help', 'service'],
        deptKeywords: ['customer', 'relations', 'support', 'service', 'client'],
      },
    ];

    const matchEmployeeForCategory = (catName) => {
      const clean = (catName || '').toLowerCase().trim();
      let matched = activeEmployees.find((emp) => {
        const dept = (emp.department || '').toLowerCase().trim();
        return dept && (dept.includes(clean) || clean.includes(dept));
      });

      if (!matched) {
        for (const mapping of topicDepartmentMap) {
          if (mapping.keywords.some((kw) => clean.includes(kw))) {
            matched = activeEmployees.find((emp) => {
              const dept = (emp.department || '').toLowerCase().trim();
              return dept && mapping.deptKeywords.some((dkw) => dept.includes(dkw));
            });
            if (matched) break;
          }
        }
      }
      return matched || null;
    };

    // Combine db categories, active employee departments, and standard fallback topics
    const baselineTopics = [
      'Technical Support',
      'Finance & Billing',
      'Customer Relations',
      'Logistics & Delivery',
      'Account & Access',
      'General Support',
    ];

    const categoryNameSet = new Set();
    const candidateList = [];

    // 1. First add DB categories
    dbCategories.forEach((c) => {
      const name = c.name.trim();
      const lower = name.toLowerCase();
      if (!categoryNameSet.has(lower)) {
        categoryNameSet.add(lower);
        candidateList.push({ name, description: c.description || '', icon: c.icon || 'HelpCircle' });
      }
    });

    // 2. Add employee departments if not already included
    activeEmployees.forEach((emp) => {
      if (emp.department && emp.department.trim()) {
        const name = emp.department.trim();
        const lower = name.toLowerCase();
        if (!categoryNameSet.has(lower)) {
          categoryNameSet.add(lower);
          candidateList.push({ name, description: `Inquiries for ${name}`, icon: 'Layers' });
        }
      }
    });

    // 3. Add baseline topics if not already included
    baselineTopics.forEach((topic) => {
      const lower = topic.toLowerCase();
      if (!categoryNameSet.has(lower)) {
        categoryNameSet.add(lower);
        candidateList.push({ name: topic, description: `General inquiries regarding ${topic}`, icon: 'HelpCircle' });
      }
    });

    const evaluatedCategories = candidateList.map((c) => {
      const matched = matchEmployeeForCategory(c.name);
      return {
        _id: c.name,
        name: c.name,
        description: c.description,
        icon: c.icon,
        hasSpecialist: !!matched,
        developerAssigned: !!matched, // Explicitly tracks whether developer has assigned an employee to this department
        specialistName: matched ? matched.name : null,
        specialistDepartment: matched ? matched.department : null,
        routingTarget: matched ? 'specialist' : 'developer',
        badgeText: matched ? '✓ Specialist Assigned' : '⚡ Handled by Lead Developer',
        routingMessage: matched
          ? `Grievance will be routed directly to assigned department officer ${matched.name} (${matched.department || c.name}).`
          : `No dedicated employee has been assigned to this department by the developer yet. Query will be routed directly to Lead Developer${developer ? ` (${developer.name})` : ''} for triage and resolution/redirection.`,
      };
    });

    res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=59');
    res.json({
      company,
      faqs,
      categories: evaluatedCategories,
      developer: developer ? { name: developer.name, email: developer.email } : null,
      activeEmployeeCount: activeEmployees.length,
    });
  } catch (err) {
    console.error('Public company info error:', err);
    res.status(500).json({ error: 'Failed to load company info' });
  }
});

// ─── GET /api/companies/:slug/dashboard ─── Company analytics (developer + employee)
router.get('/dashboard', authenticate, authorize('developer', 'employee', 'superadmin'), authorizeCompany, async (req, res) => {
  try {
    const company = await getCompany(req, res);
    if (!company) return;

    const tickets = await Ticket.find({ company: company._id })
      .select('status category priority slaDeadline csat assignedTo')
      .lean();
    const total = tickets.length;

    const byStatus = {};
    const byCategory = {};
    const byPriority = {};
    let csatSum = 0;
    let csatCount = 0;

    tickets.forEach((t) => {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
      byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
      if (t.csat && t.csat.rating) {
        csatSum += t.csat.rating;
        csatCount++;
      }
    });

    const resolved = (byStatus['Resolved'] || 0) + (byStatus['Closed'] || 0);
    const resolutionRate = total > 0 ? ((resolved / total) * 100).toFixed(1) : '0.0';
    const avgCsat = csatCount > 0 ? (csatSum / csatCount).toFixed(1) : 'N/A';

    // SLA compliance
    const now = new Date();
    const slaBreached = tickets.filter(
      (t) => !['Resolved', 'Closed'].includes(t.status) && t.slaDeadline && new Date(t.slaDeadline) < now
    ).length;
    const slaCompliance = total > 0 ? (((total - slaBreached) / total) * 100).toFixed(1) : '100.0';

    // Recent tickets (lean + projected)
    const recentTickets = await Ticket.find({ company: company._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('ticketId subject status priority category createdAt customer assignedTo')
      .populate('assignedTo', 'name email department')
      .lean();

    // High priority watchlist
    const escalationWatch = await Ticket.find({
      company: company._id,
      priority: { $in: ['High', 'Critical'] },
      status: { $nin: ['Resolved', 'Closed'] },
    })
      .sort({ createdAt: -1 })
      .select('ticketId subject status priority category createdAt customer assignedTo')
      .populate('assignedTo', 'name email department')
      .lean();

    const employeeCount = await User.countDocuments({
      company: company._id,
      role: 'employee',
      status: 'active',
    });

    // ─── Employee & Developer Specific Perspectives ───
    const isEmployee = req.user.role === 'employee';
    const isDeveloper = req.user.role === 'developer';

    let myMetrics = null;
    let developerMetrics = null;

    if (isEmployee) {
      const myTickets = tickets.filter(
        (t) => t.assignedTo && t.assignedTo.toString() === req.userId.toString()
      );
      const myActive = myTickets.filter((t) => !['Resolved', 'Closed'].includes(t.status));
      const myResolved = myTickets.filter((t) => ['Resolved', 'Closed'].includes(t.status));

      const myDept = (req.user.department || '').toLowerCase().trim();
      const departmentQueue = tickets.filter((t) => {
        if (['Resolved', 'Closed'].includes(t.status)) return false;
        if (!myDept) return false;
        const cat = (t.category || '').toLowerCase();
        return cat.includes(myDept) || myDept.includes(cat);
      });

      const myRecentTickets = await Ticket.find({
        company: company._id,
        assignedTo: req.userId,
      })
        .sort({ updatedAt: -1 })
        .limit(6)
        .select('ticketId subject status priority category createdAt customer')
        .lean();

      myMetrics = {
        name: req.user.name,
        department: req.user.department || 'General Support',
        assignedTotal: myTickets.length,
        myActiveCount: myActive.length,
        myResolvedCount: myResolved.length,
        departmentQueueCount: departmentQueue.length,
        recentAssigned: myRecentTickets,
      };
    }

    // Developer triage watchlist
    const unassignedTickets = await Ticket.find({
      company: company._id,
      assignedTo: null,
      status: { $nin: ['Resolved', 'Closed'] },
    })
      .sort({ createdAt: -1 })
      .limit(6)
      .select('ticketId subject status priority category createdAt customer')
      .lean();

    developerMetrics = {
      unassignedCount: unassignedTickets.length,
      unassignedTickets,
    };

    res.json({
      total,
      byStatus,
      byCategory,
      byPriority,
      resolutionRate,
      avgCsat,
      slaCompliance,
      slaBreached,
      recentTickets,
      escalationWatch,
      employeeCount,
      isEmployee,
      isDeveloper,
      myMetrics,
      developerMetrics,
    });
  } catch (err) {
    console.error('Company dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// ─── PUT /api/companies/:slug/branding ─── Update branding (developer only)
router.put('/branding', authenticate, authorize('developer', 'superadmin'), authorizeCompany, async (req, res) => {
  try {
    const company = await getCompany(req, res);
    if (!company) return;

    const { name, logo, branding } = req.body;
    if (name) company.name = name.trim();
    if (logo !== undefined) company.logo = logo;
    if (branding) {
      const hexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
      if (branding.primaryColor && !hexColorRegex.test(branding.primaryColor)) {
        return res.status(400).json({ error: 'Primary color must be a valid hex color code (e.g. #1e293b)' });
      }
      if (branding.accentColor && !hexColorRegex.test(branding.accentColor)) {
        return res.status(400).json({ error: 'Accent color must be a valid hex color code (e.g. #059669)' });
      }

      if (!company.branding) company.branding = {};
      if (branding.primaryColor) company.branding.primaryColor = branding.primaryColor;
      if (branding.accentColor) company.branding.accentColor = branding.accentColor;
      if (branding.welcomeMessage !== undefined) company.branding.welcomeMessage = branding.welcomeMessage.trim();
      if (branding.tagline !== undefined) company.branding.tagline = branding.tagline.trim();
      company.markModified('branding');
    }

    await company.save();
    res.json(company);
  } catch (err) {
    console.error('Update branding error:', err);
    res.status(500).json({ error: 'Failed to update branding' });
  }
});

// ─── Employee Management (Developer only) ───

// GET /api/companies/:slug/employees
router.get('/employees', authenticate, authorize('developer', 'superadmin'), authorizeCompany, async (req, res) => {
  try {
    const company = await getCompany(req, res);
    if (!company) return;

    const employees = await User.find({ company: company._id, role: 'employee' })
      .select('-password')
      .sort({ createdAt: -1 });

    // Add ticket counts per employee
    const enriched = await Promise.all(
      employees.map(async (emp) => {
        const assignedTickets = await Ticket.countDocuments({ assignedTo: emp._id });
        return { ...emp.toObject(), assignedTickets };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error('List employees error:', err);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// POST /api/companies/:slug/employees
router.post('/employees', authenticate, authorize('developer', 'superadmin'), authorizeCompany, async (req, res) => {
  try {
    const company = await getCompany(req, res);
    if (!company) return;

    const { name, email, password, department } = req.body;

    if (!name || !name.trim() || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({ error: 'Employee name must be at least 2 characters long' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.toLowerCase().trim();
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address (e.g., agent@company.com)' });
    }

    if (typeof password !== 'string' || password.trim().length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const employee = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: 'employee',
      company: company._id,
      department: department || '',
    });

    const result = await User.findById(employee._id).select('-password');
    res.status(201).json(result);
  } catch (err) {
    console.error('Create employee error:', err);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// PUT /api/companies/:slug/employees/:id
router.put('/employees/:id', authenticate, authorize('developer', 'superadmin'), authorizeCompany, async (req, res) => {
  try {
    const { name, department, status } = req.body;
    const updates = {};
    if (name) updates.name = name.trim();
    if (department !== undefined) updates.department = department;
    if (status) updates.status = status;

    const employee = await User.findOneAndUpdate(
      { _id: req.params.id, company: req.company?._id || (await getCompany(req, res))?._id, role: 'employee' },
      updates,
      { new: true }
    ).select('-password');

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(employee);
  } catch (err) {
    console.error('Update employee error:', err);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// DELETE /api/companies/:slug/employees/:id (dismiss)
router.delete('/employees/:id', authenticate, authorize('developer', 'superadmin'), authorizeCompany, async (req, res) => {
  try {
    const company = await getCompany(req, res);
    if (!company) return;

    const employee = await User.findOneAndUpdate(
      { _id: req.params.id, company: company._id, role: 'employee' },
      { status: 'dismissed' },
      { new: true }
    ).select('-password');

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found in this company' });
    }

    // Unassign their open tickets
    await Ticket.updateMany(
      { assignedTo: employee._id, status: { $nin: ['Resolved', 'Closed'] } },
      { assignedTo: null }
    );

    res.json({ message: `Employee "${employee.name}" has been dismissed`, employee });
  } catch (err) {
    console.error('Dismiss employee error:', err);
    res.status(500).json({ error: 'Failed to dismiss employee' });
  }
});

export default router;
