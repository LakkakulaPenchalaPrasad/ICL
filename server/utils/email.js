/**
 * Email Notification Service (EmailJS REST API)
 * Handles isolated, role-specific email dispatches with standardized template parameters.
 * Supports:
 * - Dedicated Customer Template (EMAILJS_CUSTOMER_TEMPLATE_ID)
 * - Dedicated Staff Template (EMAILJS_STAFF_TEMPLATE_ID)
 * - Universal Default Fallback (EMAILJS_TEMPLATE_ID)
 *
 * All dispatches provide the identical standardized set of variables so templates
 * never break regardless of role (Customer, Employee, or Developer).
 */

const resolveAppUrl = () => {
  // 1. Explicit production APP_URL set in environment
  if (process.env.APP_URL && !process.env.APP_URL.includes('localhost')) {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  // 2. Vercel auto-injected system production domain
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  // 3. Vercel auto-injected deployment domain
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // 4. Default production fallback (ensures localhost is NEVER used on Vercel/production)
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return 'https://resolveit-delta.vercel.app';
  }
  // 5. Local development fallback only
  return 'http://localhost:5173';
};

const getEmailConfig = () => ({
  serviceId: process.env.EMAILJS_SERVICE_ID,
  // Default fallback template ID
  templateId: process.env.EMAILJS_TEMPLATE_ID,
  // Customer-specific template ID (falls back to global templateId)
  customerTemplateId: process.env.EMAILJS_CUSTOMER_TEMPLATE_ID || process.env.EMAILJS_TEMPLATE_ID,
  // Staff-specific template ID (falls back to global templateId)
  staffTemplateId: process.env.EMAILJS_STAFF_TEMPLATE_ID || process.env.EMAILJS_TEMPLATE_ID,
  publicKey: process.env.EMAILJS_PUBLIC_KEY,
  privateKey: process.env.EMAILJS_PRIVATE_KEY,
  appUrl: resolveAppUrl(),
});

/**
 * Universal standardized template parameters builder.
 * Guarantees that EVERY email (customer, employee, developer) has the exact same variable names.
 */
function buildStandardEmailParams({
  recipient, // { name, email, role }
  company,
  ticket,
  subject,
  message,
  actionUrl,
  department,
  assignedTo,
  resolvedBy,
  resolutionNote,
  status,
}) {
  const { appUrl } = getEmailConfig();
  const targetEmail = recipient.email;
  const trackerLink = `${appUrl}/s/${company.slug}/track/${ticket.ticketId}`;
  const staffPortalLink = `${appUrl}/portal/${company.slug}/tickets/${ticket.ticketId}`;
  const resolvedActionUrl = actionUrl || (recipient.role === 'customer' ? trackerLink : staffPortalLink);
  const currentStatus = status || ticket.status || 'Open';

  return {
    // ─── Recipient & Contact Aliases ───
    to_name: recipient.name || 'Valued User',
    to_email: targetEmail,
    email: targetEmail,
    customer_email: ticket.customer?.email || 'N/A',
    recipient_email: targetEmail,
    user_email: targetEmail,
    reply_to: ticket.customer?.email || targetEmail,
    recipient_role: recipient.role || 'user',

    // ─── Core Ticket Data (Standardized for Customer & Staff) ───
    ticket_id: ticket.ticketId,
    subject: subject || ticket.subject,
    ticket_subject: ticket.subject,
    category: ticket.category || 'General Support',
    priority: ticket.priority || 'Medium',
    status: currentStatus,
    description: ticket.description || 'No description provided.',

    // ─── Customer Details ───
    customer_name: ticket.customer?.name || 'Customer',
    customer_phone: ticket.customer?.phone || 'Not provided',

    // ─── Context Message & Notes ───
    message: message || ticket.description || '',
    action_message: message || '',
    resolved_by: resolvedBy || (currentStatus === 'Resolved' ? 'Support Redressal Desk' : 'Support Team'),
    resolution_note: resolutionNote || '',
    assigned_to: assignedTo || (ticket.assignedTo?.name || 'Department Specialist'),
    department: department || ticket.category || 'General Support',

    // ─── Navigation & Tracker URLs ───
    action_url: resolvedActionUrl,
    tracking_link: trackerLink,
    portal_link: staffPortalLink,
    app_url: appUrl,

    // ─── Company Branding ───
    company_name: company.name,
    company_slug: company.slug,

    // ─── Timestamps ───
    created_at: ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : new Date().toLocaleString(),
    updated_at: new Date().toLocaleString(),
    sla_deadline: ticket.slaDeadline ? new Date(ticket.slaDeadline).toLocaleDateString() : 'Within 24 Hours',
  };
}

async function dispatchEmailJS({ targetEmail, templateParams, logContext, templateType = 'default' }) {
  const { serviceId, templateId, customerTemplateId, staffTemplateId, publicKey, privateKey } = getEmailConfig();

  // Pick appropriate template ID based on role
  let selectedTemplateId = templateId;
  if (templateType === 'customer' && customerTemplateId) {
    selectedTemplateId = customerTemplateId;
  } else if (templateType === 'staff' && staffTemplateId) {
    selectedTemplateId = staffTemplateId;
  }

  // If EmailJS credentials are not configured, simulate in console
  if (!serviceId || !selectedTemplateId || !publicKey) {
    console.log('\n📧 ─────────────────────────────────────────────────────────────');
    console.log(` [EMAILJS SIMULATION] ${logContext.title} (Template: ${selectedTemplateId || 'NONE'})`);
    console.log(` Recipient : ${templateParams.to_name} <${targetEmail}>`);
    console.log(` Ticket ID : ${templateParams.ticket_id}`);
    console.log(` Subject   : ${templateParams.subject}`);
    console.log(` Summary   : ${templateParams.message || templateParams.description}`);
    console.log(` Action URL: ${templateParams.action_url}`);
    console.log('─────────────────────────────────────────────────────────────\n');
    return { simulated: true, success: true };
  }

  try {
    const payload = {
      service_id: serviceId,
      template_id: selectedTemplateId,
      user_id: publicKey,
      template_params: {
        ...templateParams,
        to_email: targetEmail,
      },
    };

    if (privateKey) {
      payload.accessToken = privateKey;
    }

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log(`✓ Email notification sent to ${targetEmail} [${logContext.title}] (Template: ${selectedTemplateId})`);
      return { success: true };
    } else {
      const errorText = await response.text();
      console.error(`✕ EmailJS API responded with error (${response.status}):`, errorText);
      return { success: false, error: errorText };
    }
  } catch (err) {
    console.error(`✕ Failed to send EmailJS notification [${logContext.title}]:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * 1. Topic-Based Routing: Sent to the responsible department employee
 */
export async function sendTicketAssignedToEmployeeNotification({ company, employee, ticket, isAutoRouted = true }) {
  if (!employee || !employee.email) {
    console.log(`[Email Notice] Assigned employee has no valid email. Notification skipped.`);
    return { success: false, reason: 'No employee email' };
  }

  const message = `A new ${ticket.category} complaint has been ${isAutoRouted ? 'auto-routed' : 'assigned'} to your department (${employee.department || 'Support'}) queue. Please review and respond within SLA targets.`;

  const templateParams = buildStandardEmailParams({
    recipient: { name: employee.name, email: employee.email, role: 'employee' },
    company,
    ticket,
    subject: `[Assigned to You] #${ticket.ticketId} - ${ticket.category}: ${ticket.subject}`,
    message,
    department: employee.department || 'Support',
    assignedTo: employee.name,
  });

  return dispatchEmailJS({
    targetEmail: employee.email,
    templateParams,
    templateType: 'staff',
    logContext: { title: `Staff Alert: Employee ${employee.name} (${employee.department || 'Support'})` },
  });
}

/**
 * 2. Developer Fallback: Sent to company developer when no department employee exists
 */
export async function sendTicketFallbackToDeveloperNotification({ company, developer, ticket, reason }) {
  if (!developer || !developer.email) {
    console.log(`[Email Notice] No developer assigned to ${company.name}. Notification skipped.`);
    return { success: false, reason: 'No developer email' };
  }

  const message = reason || `A new grievance under category "${ticket.category}" was filed. No active department specialist was found for this category, so it has been routed to your Developer Triage Queue to solve directly or redirect to any staff member.`;

  const templateParams = buildStandardEmailParams({
    recipient: { name: developer.name, email: developer.email, role: 'developer' },
    company,
    ticket,
    subject: `[Developer Triage Required] #${ticket.ticketId} - ${ticket.category}: ${ticket.subject}`,
    message,
    department: 'Developer Triage Queue',
    assignedTo: developer.name,
  });

  return dispatchEmailJS({
    targetEmail: developer.email,
    templateParams,
    templateType: 'staff',
    logContext: { title: `Staff Alert: Developer Triage ${developer.name}` },
  });
}

/**
 * 3. Developer Redirection Alert: Sent to the newly assigned employee
 */
export async function sendTicketRedirectedNotification({ company, employee, developer, ticket }) {
  if (!employee || !employee.email) {
    return { success: false, reason: 'No employee email' };
  }

  const message = `Lead Developer ${developer?.name || 'Lead Admin'} has redirected grievance #${ticket.ticketId} ("${ticket.subject}") to your attention for resolution.`;

  const templateParams = buildStandardEmailParams({
    recipient: { name: employee.name, email: employee.email, role: 'employee' },
    company,
    ticket,
    subject: `[Redirected to You] Ticket #${ticket.ticketId} from ${developer?.name || 'Developer'}`,
    message,
    department: employee.department || 'General',
    assignedTo: employee.name,
  });

  return dispatchEmailJS({
    targetEmail: employee.email,
    templateParams,
    templateType: 'staff',
    logContext: { title: `Staff Alert: Redirected to Employee ${employee.name}` },
  });
}

/**
 * 4. Customer Resolution Notice: Sent exclusively to customer when query is marked Resolved or Closed
 */
export async function sendTicketResolvedNotificationToCustomer({ company, ticket, resolvedBy, resolutionNote }) {
  if (!ticket?.customer?.email) {
    console.log(`[Email Notice] Ticket has no customer email. Resolution notification skipped.`);
    return { success: false, reason: 'No customer email' };
  }

  const message = resolutionNote || `Great news! Your grievance regarding "${ticket.subject}" has been marked as resolved by ${resolvedBy || company.name + ' Support Team'}. You can inspect the audit timeline and rate your resolution satisfaction via the tracking link below.`;

  const templateParams = buildStandardEmailParams({
    recipient: { name: ticket.customer.name, email: ticket.customer.email, role: 'customer' },
    company,
    ticket,
    subject: `Your query has been resolved: #${ticket.ticketId} - ${company.name}`,
    message,
    status: 'Resolved',
    resolvedBy: resolvedBy || 'Support Team',
    resolutionNote: resolutionNote || '',
  });

  return dispatchEmailJS({
    targetEmail: ticket.customer.email,
    templateParams,
    templateType: 'customer',
    logContext: { title: `Customer Resolution Notice: ${ticket.customer.email}` },
  });
}

/**
 * 5. Customer Complaint Lodged Confirmation: Dispatched immediately to customer upon filing grievance
 */
export async function sendTicketCreatedConfirmationToCustomer({ company, ticket }) {
  if (!ticket?.customer?.email) {
    console.log('[Email Notice] Ticket has no customer email. Lodging confirmation skipped.');
    return { success: false, reason: 'No customer email' };
  }

  const message = `Your formal grievance has been successfully lodged under reference ID #${ticket.ticketId}. Our institutional redressal team has been notified. You can track real-time progress, view verified timeline logs, or communicate with the assigned team anytime via the tracking link below.`;

  const templateParams = buildStandardEmailParams({
    recipient: { name: ticket.customer.name, email: ticket.customer.email, role: 'customer' },
    company,
    ticket,
    subject: `[Complaint Lodged] #${ticket.ticketId}: ${ticket.subject} - ${company.name}`,
    message,
    status: ticket.status || 'Open',
    resolvedBy: 'Support Redressal Desk',
  });

  return dispatchEmailJS({
    targetEmail: ticket.customer.email,
    templateParams,
    templateType: 'customer',
    logContext: { title: `Customer Lodged Confirmation: ${ticket.customer.email} (#${ticket.ticketId})` },
  });
}

/**
 * 6. Customer Progress Update Notice: Dispatched whenever staff updates status, adds replies, or changes progress
 */
export async function sendTicketProgressUpdateNotificationToCustomer({ company, ticket, updatedBy, updateNote, newStatus }) {
  if (!ticket?.customer?.email) {
    console.log('[Email Notice] Ticket has no customer email. Progress update skipped.');
    return { success: false, reason: 'No customer email' };
  }

  const statusDisplay = newStatus || ticket.status || 'In Progress';
  const message = updateNote || `Progress has been updated on your grievance #${ticket.ticketId}. Current status: "${statusDisplay}". Handled by ${updatedBy || company.name + ' Staff'}. Click the link below to inspect verified audit timeline updates.`;

  const templateParams = buildStandardEmailParams({
    recipient: { name: ticket.customer.name, email: ticket.customer.email, role: 'customer' },
    company,
    ticket,
    subject: `[Progress Update] #${ticket.ticketId}: Status is now ${statusDisplay} - ${company.name}`,
    message,
    status: statusDisplay,
    resolvedBy: updatedBy || 'Redressal Team',
  });

  return dispatchEmailJS({
    targetEmail: ticket.customer.email,
    templateParams,
    templateType: 'customer',
    logContext: { title: `Customer Progress Alert: ${ticket.customer.email} (${statusDisplay})` },
  });
}

/**
 * 7. Legacy wrapper for backward compatibility
 */
export async function sendTicketNotificationToDeveloper({ company, developer, ticket }) {
  return sendTicketFallbackToDeveloperNotification({
    company,
    developer,
    ticket,
    reason: `New complaint filed under "${ticket.category}". Forwarded for lead developer oversight.`,
  });
}
