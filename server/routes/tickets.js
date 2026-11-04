import express from 'express';
import { Ticket } from '../models/Ticket.js';
import { Company } from '../models/Company.js';
import { authenticate, authorize, authorizeCompany } from '../middleware/auth.js';
import {
  sendTicketAssignedToEmployeeNotification,
  sendTicketFallbackToDeveloperNotification,
  sendTicketRedirectedNotification,
  sendTicketResolvedNotificationToCustomer,
} from '../utils/email.js';

const router = express.Router({ mergeParams: true });

// ─── Helper: Topic-to-Department Intelligent Auto-Routing ───
export async function findResponsibleEmployeeForTopic({ companyId, category }) {
  const { User } = await import('../models/User.js');

  const activeEmployees = await User.find({
    company: companyId,
    role: 'employee',
    status: 'active',
  });

  if (!activeEmployees || activeEmployees.length === 0) {
    return null;
  }

  const cleanCategory = (category || '').toLowerCase().trim();

  // Semantic domain keyword mapping
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

  // 1. Direct or fuzzy substring match between category and employee department
  let candidates = activeEmployees.filter((emp) => {
    const dept = (emp.department || '').toLowerCase().trim();
    if (!dept) return false;
    return dept.includes(cleanCategory) || cleanCategory.includes(dept);
  });

  // 2. Keyword group matching if no direct substring match
  if (candidates.length === 0) {
    for (const mapping of topicDepartmentMap) {
      const categoryMatchesGroup = mapping.keywords.some((kw) => cleanCategory.includes(kw));
      if (categoryMatchesGroup) {
        candidates = activeEmployees.filter((emp) => {
          const dept = (emp.department || '').toLowerCase().trim();
          return mapping.deptKeywords.some((dkw) => dept.includes(dkw));
        });
        if (candidates.length > 0) break;
      }
    }
  }

  if (candidates.length === 0) {
    return null; // Fallback to developer
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  // 3. Workload balancing: assign to candidate with least active tickets
  const candidateLoads = await Promise.all(
    candidates.map(async (emp) => {
      const load = await Ticket.countDocuments({
        assignedTo: emp._id,
        status: { $nin: ['Resolved', 'Closed'] },
      });
      return { emp, load };
    })
  );

  candidateLoads.sort((a, b) => a.load - b.load);
  return candidateLoads[0].emp;
}

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

    const { status, priority, category, search, assignee, scope, page = 1, limit = 50 } = req.query;
    const filter = { company: company._id };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    if (assignee) {
      if (assignee === 'me') {
        filter.assignedTo = req.userId;
      } else if (assignee === 'unassigned') {
        filter.assignedTo = null;
      } else {
        filter.assignedTo = assignee;
      }
    }

    if (scope === 'my-dept' && req.user?.department) {
      const deptRegex = new RegExp(req.user.department.trim(), 'i');
      filter.category = { $regex: deptRegex };
    }

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

    // Filter out internal messages AND internal timeline events so customer sees NO internal alerts
    const sanitized = tickets.map((t) => {
      const obj = t.toObject();
      obj.messages = (obj.messages || []).filter((m) => !m.isInternal);
      obj.timeline = (obj.timeline || []).filter((tl) => {
        if (tl.isInternal) return false;
        const act = (tl.action || '').toLowerCase();
        const det = (tl.details || '').toLowerCase();
        if (act.includes('specialist') || act.includes('triage') || act.includes('developer') || act.includes('redirect') || act.includes('internal')) return false;
        if (det.includes('auto-routed') || det.includes('redirected') || det.includes('triage queue')) return false;
        return true;
      });
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

    const { category, priority, subject, description, phone, incidentDate } = req.body;

    if (!subject || !subject.trim() || !description || !description.trim()) {
      return res.status(400).json({ error: 'Subject line and detailed description are required.' });
    }

    if (subject.trim().length < 3) {
      return res.status(400).json({ error: 'Subject line must be at least 3 characters long.' });
    }

    if (description.trim().length < 10) {
      return res.status(400).json({ error: 'Description must be at least 10 characters long to provide sufficient detail.' });
    }

    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ error: `Invalid priority level. Allowed values: ${validPriorities.join(', ')}` });
    }

    // Date validation for incident date: cannot be in the future, cannot be older than 5 years
    if (incidentDate) {
      const parsedIncidentDate = new Date(incidentDate);
      if (isNaN(parsedIncidentDate.getTime())) {
        return res.status(400).json({ error: 'Invalid incident date format.' });
      }
      if (parsedIncidentDate > new Date()) {
        return res.status(400).json({ error: 'Incident date cannot be in the future.' });
      }
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
      if (parsedIncidentDate < fiveYearsAgo) {
        return res.status(400).json({ error: 'Incident date cannot be older than 5 years.' });
      }
    }

    // Phone format validation (optional, but if provided must be realistic)
    if (phone && phone.trim()) {
      const cleanPhone = phone.trim().replace(/[\s\-\(\)\+]/g, '');
      if (cleanPhone.length < 7 || cleanPhone.length > 15 || !/^\d+$/.test(cleanPhone)) {
        return res.status(400).json({ error: 'Invalid contact phone number format.' });
      }
    }

    const resolvedCategory = (category && category.trim()) || 'General Support';
    const ticketId = await company.generateTicketId();

    // ─── Topic-Based Employee Routing ───
    const matchedEmployee = await findResponsibleEmployeeForTopic({
      companyId: company._id,
      category: resolvedCategory,
    });

    const initialTimeline = [
      {
        action: 'Ticket Created',
        by: req.user.name,
        details: `Complaint filed under "${resolvedCategory}" with ${priority || 'Medium'} priority.${incidentDate ? ` Incident Date: ${new Date(incidentDate).toLocaleDateString()}` : ''}`,
        isInternal: false,
      },
    ];

    if (matchedEmployee) {
      initialTimeline.push({
        action: 'Internal Staff Allocated',
        by: 'Routing Engine',
        details: `Auto-routed to ${matchedEmployee.name} (${matchedEmployee.department || 'Support'}).`,
        isInternal: true, // Internal audit only, hidden from customer
      });
    } else {
      initialTimeline.push({
        action: 'Developer Triage Queue',
        by: 'Routing Engine',
        details: `No active department specialist found for "${resolvedCategory}". Forwarded to Company Developer triage queue.`,
        isInternal: true, // Internal audit only, hidden from customer
      });
    }

    const ticket = await Ticket.create({
      ticketId,
      company: company._id,
      customer: {
        userId: req.userId,
        name: req.user.name,
        email: req.user.email,
        phone: phone ? phone.trim() : (req.user.phone || ''),
      },
      category: resolvedCategory,
      priority: priority || 'Medium',
      assignedTo: matchedEmployee ? matchedEmployee._id : null,
      subject: subject.trim(),
      description: description.trim(),
      timeline: initialTimeline,
    });

    // ─── Isolated Single-Recipient Email Notification ───
    (async () => {
      try {
        if (matchedEmployee) {
          // Department match found: send email ONLY to this particular employee
          console.log(`[Auto-Routing] Routing ticket ${ticket.ticketId} to department employee ${matchedEmployee.name} (${matchedEmployee.department})`);
          await sendTicketAssignedToEmployeeNotification({
            company,
            employee: matchedEmployee,
            ticket,
            isAutoRouted: true,
          });
        } else {
          // No department employee found: send fallback email ONLY to company developer
          const { User } = await import('../models/User.js');
          let developer = null;
          if (company.developer) {
            developer = await User.findById(company.developer).select('name email role');
          }

          if (!developer || !developer.email) {
            developer = await User.findOne({ role: 'superadmin' }).select('name email role');
          }

          if (developer) {
            console.log(`[Auto-Routing Fallback] No department employee found for "${resolvedCategory}". Notifying developer ${developer.name}`);
            await sendTicketFallbackToDeveloperNotification({
              company,
              developer,
              ticket,
              reason: `New grievance filed under "${resolvedCategory}". Because no dedicated employee has been assigned to this department yet, this ticket has been routed to your Developer Queue to resolve or redirect.`,
            });
          }
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

    // Filter out internal timeline events so customer sees NO internal alerts or staff routing details
    const ticketObj = ticket.toObject();
    ticketObj.timeline = (ticketObj.timeline || []).filter((tl) => {
      if (tl.isInternal) return false;
      const act = (tl.action || '').toLowerCase();
      const det = (tl.details || '').toLowerCase();
      if (act.includes('specialist') || act.includes('triage') || act.includes('developer') || act.includes('redirect') || act.includes('internal') || act.includes('staff')) return false;
      if (det.includes('auto-routed') || det.includes('redirected') || det.includes('triage queue')) return false;
      return true;
    });

    res.json(ticketObj);
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
      // Filter out internal messages AND internal timeline events for customer
      const obj = ticket.toObject();
      obj.messages = (obj.messages || []).filter((m) => !m.isInternal);
      obj.timeline = (obj.timeline || []).filter((tl) => {
        if (tl.isInternal) return false;
        const act = (tl.action || '').toLowerCase();
        const det = (tl.details || '').toLowerCase();
        if (act.includes('specialist') || act.includes('triage') || act.includes('developer') || act.includes('redirect') || act.includes('internal') || act.includes('staff')) return false;
        if (det.includes('auto-routed') || det.includes('redirected') || det.includes('triage queue')) return false;
        return true;
      });
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

    const { status, priority, assignedTo, category, slaDeadline } = req.body;
    const previousStatus = ticket.status;
    const changes = [];
    let newlyAssignedEmployee = null;
    let isReassigned = false;

    // Status validation
    if (status && status !== ticket.status) {
      const validStatuses = ['Open', 'In Progress', 'Escalated', 'Resolved', 'Closed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Allowed values: ${validStatuses.join(', ')}` });
      }
      changes.push(`Status changed from "${ticket.status}" to "${status}"`);
      ticket.status = status;
    }

    // Priority validation
    if (priority && priority !== ticket.priority) {
      const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({ error: `Invalid priority. Allowed values: ${validPriorities.join(', ')}` });
      }
      const slaMap = { Critical: 4, High: 12, Medium: 24, Low: 48 };
      ticket.slaHours = slaMap[priority] || 24;
      if (!slaDeadline) {
        ticket.slaDeadline = new Date(Date.now() + ticket.slaHours * 60 * 60 * 1000);
      }
      changes.push(`Priority changed to "${priority}" (Default SLA ${ticket.slaHours}h)`);
      ticket.priority = priority;
    }

    // SLA Deadline Validation (PAST DATE MUST NOT BE APPROVED!)
    if (slaDeadline !== undefined && slaDeadline !== null && slaDeadline !== '') {
      const deadlineDate = new Date(slaDeadline);
      if (isNaN(deadlineDate.getTime())) {
        return res.status(400).json({ error: 'Invalid SLA deadline date format.' });
      }
      if (deadlineDate <= new Date()) {
        return res.status(400).json({ error: 'SLA target deadline cannot be set in the past. Please select a future date and time.' });
      }
      ticket.slaDeadline = deadlineDate;
      changes.push(`SLA target deadline set to ${deadlineDate.toLocaleString()}`);
    }

    // Assignee validation & Redirection Detection
    if (assignedTo !== undefined) {
      if (assignedTo) {
        const { User } = await import('../models/User.js');
        const assignedEmployee = await User.findOne({
          _id: assignedTo,
          company: company._id,
          role: 'employee',
        });
        if (!assignedEmployee) {
          return res.status(400).json({ error: 'Selected employee does not exist or does not belong to this company.' });
        }

        const prevAssignedId = ticket.assignedTo ? ticket.assignedTo.toString() : null;
        if (!prevAssignedId || prevAssignedId !== assignedEmployee._id.toString()) {
          isReassigned = true;
          newlyAssignedEmployee = assignedEmployee;
        }

        ticket.assignedTo = assignedEmployee._id;
        if (req.user.role === 'developer' || req.user.role === 'superadmin') {
          changes.push(`Ticket redirected to ${assignedEmployee.name} (${assignedEmployee.department || 'Support'}) by Lead Developer ${req.user.name}`);
        } else {
          changes.push(`Ticket assigned to ${assignedEmployee.name}`);
        }
      } else {
        ticket.assignedTo = null;
        changes.push('Ticket unassigned');
      }
    }

    if (category && category.trim()) {
      ticket.category = category.trim();
    }

    if (changes.length > 0) {
      ticket.timeline.push({
        action: 'Ticket Updated',
        by: req.user.name,
        details: changes.join('. '),
      });
    }

    await ticket.save();

    // ─── Post-Update Asynchronous Notifications ───
    (async () => {
      try {
        // 1. Redirection Notification to newly assigned employee
        if (isReassigned && newlyAssignedEmployee) {
          console.log(`[Redirection Alert] Dispatching alert to ${newlyAssignedEmployee.email} (redirected by ${req.user.name})`);
          await sendTicketRedirectedNotification({
            company,
            employee: newlyAssignedEmployee,
            developer: req.user,
            ticket,
          });
        }

        // 2. Query Resolved Notification to Customer
        const isNowResolved = ['Resolved', 'Closed'].includes(ticket.status) && !['Resolved', 'Closed'].includes(previousStatus);
        if (isNowResolved && ticket.customer?.email) {
          console.log(`[Resolution Alert] Ticket ${ticket.ticketId} marked as ${ticket.status}. Dispatching notice to customer ${ticket.customer.email}`);
          await sendTicketResolvedNotificationToCustomer({
            company,
            ticket,
            resolvedBy: req.user.name,
            resolutionNote: changes.join('. '),
          });
        }
      } catch (postErr) {
        console.error('Post-update notification error:', postErr.message);
      }
    })();
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
