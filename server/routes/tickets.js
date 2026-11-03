import express from 'express';
import { Ticket } from '../models/Ticket.js';
import { Company } from '../models/Company.js';
import { authenticate, authorize, authorizeCompany } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

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

// ─── GET /api/companies/:slug/tickets ─── All company tickets (developer + employee)
router.get('/', authenticate, authorize('developer', 'employee', 'superadmin'), authorizeCompany, async (req, res) => {
  try {
    const company = await getCompany(req, res);
    if (!company) return;

    const { status, priority, category, search, page = 1, limit = 50 } = req.query;
    const filter = { company: company._id };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { ticketId: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [tickets, total] = await Promise.all([
      Ticket.find(filter)
        .populate('assignedTo', 'name email department')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Ticket.countDocuments(filter),
    ]);

    res.json({ tickets, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('List tickets error:', err);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

// ─── GET /api/companies/:slug/tickets/mine ─── Customer's own tickets
router.get('/mine', authenticate, authorize('customer'), async (req, res) => {
  try {
    const company = await getCompany(req, res);
    if (!company) return;

    const tickets = await Ticket.find({
      company: company._id,
      'customer.userId': req.userId,
    })
      .select('-messages.isInternal') // Don't expose internal flag
      .sort({ createdAt: -1 });

    // Filter out internal messages
    const sanitized = tickets.map((t) => {
      const obj = t.toObject();
      obj.messages = (obj.messages || []).filter((m) => !m.isInternal);
      return obj;
    });

    res.json(sanitized);
  } catch (err) {
    console.error('My tickets error:', err);
    res.status(500).json({ error: 'Failed to fetch your tickets' });
  }
});

// ─── POST /api/companies/:slug/tickets ─── File new complaint (customer)
router.post('/', authenticate, authorize('customer'), async (req, res) => {
  try {
    const company = await getCompany(req, res);
    if (!company) return;

    if (company.status === 'suspended') {
      return res.status(403).json({ error: 'This company is currently not accepting complaints' });
    }

    const { category, priority, subject, description, phone } = req.body;

    if (!subject || !subject.trim() || !description || !description.trim()) {
      return res.status(400).json({ error: 'Subject line and detailed description are required' });
    }

    const resolvedCategory = (category && category.trim()) || 'General Support';
    const ticketId = await company.generateTicketId();

    const ticket = await Ticket.create({
      ticketId,
      company: company._id,
      customer: {
        userId: req.userId,
        name: req.user.name,
        email: req.user.email,
        phone: phone || req.user.phone || '',
      },
      category: resolvedCategory,
      priority: priority || 'Medium',
      subject: subject.trim(),
      description,
      timeline: [
        {
          action: 'Ticket Created',
          by: req.user.name,
          details: `Complaint filed under "${category}" with ${priority || 'Medium'} priority.`,
        },
      ],
    });

    // Trigger EmailJS notification to company developer (or superadmin fallback) in background
    (async () => {
      try {
        const { User } = await import('../models/User.js');
        const { sendTicketNotificationToDeveloper } = await import('../utils/email.js');

        let developer = null;
        if (company.developer) {
          developer = await User.findById(company.developer).select('name email role');
        }

        // If no developer is assigned to this company, fallback to platform Super Admin
        if (!developer || !developer.email) {
          developer = await User.findOne({ role: 'superadmin' }).select('name email role');
        }

        if (developer) {
          await sendTicketNotificationToDeveloper({ company, developer, ticket });
        }
      } catch (mailErr) {
        console.error('Email alert dispatch error:', mailErr.message);
      }
    })();

    res.status(201).json(ticket);
  } catch (err) {
    console.error('Create ticket error:', err);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// ─── GET /api/companies/:slug/tickets/:ticketId/track ─── Public status check (limited data)
router.get('/:ticketId/track', async (req, res) => {
  try {
    const company = await Company.findOne({ slug: req.params.slug });
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const ticket = await Ticket.findOne({
      ticketId: req.params.ticketId,
      company: company._id,
    }).select('ticketId subject status priority category createdAt slaDeadline timeline');

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (err) {
    console.error('Track ticket error:', err);
    res.status(500).json({ error: 'Failed to track ticket' });
  }
});

// ─── GET /api/companies/:slug/tickets/:ticketId ─── Ticket detail (scoped)
router.get('/:ticketId', authenticate, async (req, res) => {
  try {
    const company = await getCompany(req, res);
    if (!company) return;

    const ticket = await Ticket.findOne({
      ticketId: req.params.ticketId,
      company: company._id,
    }).populate('assignedTo', 'name email department');

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Customers can only see their own tickets
    if (req.user.role === 'customer') {
      if (ticket.customer.userId.toString() !== req.userId.toString()) {
        return res.status(403).json({ error: 'Access denied. This is not your ticket.' });
      }
      // Filter out internal messages for customer
      const obj = ticket.toObject();
      obj.messages = (obj.messages || []).filter((m) => !m.isInternal);
      return res.json(obj);
    }

    // Developer/Employee must belong to this company
    if (['developer', 'employee'].includes(req.user.role)) {
      if (!req.user.company || req.user.company.toString() !== company._id.toString()) {
        return res.status(403).json({ error: 'Access denied.' });
      }
    }

    res.json(ticket);
  } catch (err) {
    console.error('Ticket detail error:', err);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// ─── PUT /api/companies/:slug/tickets/:ticketId ─── Update ticket (developer + employee)
router.put('/:ticketId', authenticate, authorize('developer', 'employee', 'superadmin'), authorizeCompany, async (req, res) => {
  try {
    const company = await getCompany(req, res);
    if (!company) return;

    const ticket = await Ticket.findOne({
      ticketId: req.params.ticketId,
      company: company._id,
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const { status, priority, assignedTo, category } = req.body;
    const changes = [];

    if (status && status !== ticket.status) {
      changes.push(`Status changed from "${ticket.status}" to "${status}"`);
      ticket.status = status;
    }
    if (priority && priority !== ticket.priority) {
      changes.push(`Priority changed from "${ticket.priority}" to "${priority}"`);
      ticket.priority = priority;
    }
    if (assignedTo !== undefined) {
      ticket.assignedTo = assignedTo || null;
      changes.push('Ticket assignment updated');
    }
    if (category) {
      ticket.category = category;
    }

    if (changes.length > 0) {
      ticket.timeline.push({
        action: 'Ticket Updated',
        by: req.user.name,
        details: changes.join('. '),
      });
    }

    await ticket.save();
    const populated = await Ticket.findById(ticket._id).populate('assignedTo', 'name email department');
    res.json(populated);
  } catch (err) {
    console.error('Update ticket error:', err);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// ─── POST /api/companies/:slug/tickets/:ticketId/messages ─── Add message
router.post('/:ticketId/messages', authenticate, async (req, res) => {
  try {
    const company = await getCompany(req, res);
    if (!company) return;

    const ticket = await Ticket.findOne({
      ticketId: req.params.ticketId,
      company: company._id,
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Customers can only message on their own tickets
    if (req.user.role === 'customer') {
      if (ticket.customer.userId.toString() !== req.userId.toString()) {
        return res.status(403).json({ error: 'Access denied.' });
      }
    }

    const { text, isInternal } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    // Customers cannot send internal notes
    const internal = req.user.role === 'customer' ? false : Boolean(isInternal);

    const message = {
      sender: req.userId,
      senderName: req.user.name,
      senderRole: req.user.role === 'developer' ? 'developer' : req.user.role === 'employee' ? 'employee' : 'customer',
      text: text.trim(),
      isInternal: internal,
    };

    ticket.messages.push(message);
    ticket.timeline.push({
      action: internal ? 'Internal Note Added' : 'Message Sent',
      by: req.user.name,
      details: internal ? 'Internal note added to case file.' : `Reply from ${req.user.role}.`,
    });

    await ticket.save();

    // Return the new message
    const newMessage = ticket.messages[ticket.messages.length - 1];
    res.status(201).json(newMessage);
  } catch (err) {
    console.error('Add message error:', err);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// ─── POST /api/companies/:slug/tickets/:ticketId/escalate ─── Escalate ticket
router.post('/:ticketId/escalate', authenticate, authorize('developer', 'employee', 'superadmin'), authorizeCompany, async (req, res) => {
  try {
    const company = await getCompany(req, res);
    if (!company) return;

    const ticket = await Ticket.findOne({
      ticketId: req.params.ticketId,
      company: company._id,
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const { reason } = req.body;

    ticket.status = 'Escalated';
    ticket.priority = 'Critical';
    ticket.timeline.push({
      action: 'Ticket Escalated',
      by: req.user.name,
      details: reason || 'Escalated for immediate attention.',
    });

    await ticket.save();
    res.json(ticket);
  } catch (err) {
    console.error('Escalate ticket error:', err);
    res.status(500).json({ error: 'Failed to escalate ticket' });
  }
});

// ─── POST /api/companies/:slug/tickets/:ticketId/csat ─── Submit CSAT rating (customer)
router.post('/:ticketId/csat', authenticate, authorize('customer'), async (req, res) => {
  try {
    const company = await getCompany(req, res);
    if (!company) return;

    const ticket = await Ticket.findOne({
      ticketId: req.params.ticketId,
      company: company._id,
      'customer.userId': req.userId,
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found or access denied' });
    }

    if (!['Resolved', 'Closed'].includes(ticket.status)) {
      return res.status(400).json({ error: 'CSAT can only be submitted for resolved tickets' });
    }

    const { rating, feedback } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    ticket.csat = {
      rating,
      feedback: feedback || '',
      submittedAt: new Date(),
    };

    ticket.timeline.push({
      action: 'CSAT Submitted',
      by: req.user.name,
      details: `Customer rated ${rating}/5 stars.`,
    });

    await ticket.save();
    res.json(ticket);
  } catch (err) {
    console.error('CSAT error:', err);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

export default router;
