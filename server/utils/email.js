/**
 * Email Notification Service (EmailJS REST API)
 * Handles isolated, role-specific email dispatches:
 * 1. Topic-matched employee assignment notifications
 * 2. Developer fallback notifications when department is missing
 * 3. Lead developer ticket redirection alerts to reassigned employees
 * 4. Customer query resolved notifications with CSAT inspection links
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
  templateId: process.env.EMAILJS_TEMPLATE_ID,
  publicKey: process.env.EMAILJS_PUBLIC_KEY,
  privateKey: process.env.EMAILJS_PRIVATE_KEY,
  appUrl: resolveAppUrl(),
});

async function dispatchEmailJS({ targetEmail, templateParams, logContext }) {
  const { serviceId, templateId, publicKey, privateKey } = getEmailConfig();

  // If EmailJS credentials are not configured, simulate in console
  if (!serviceId || !templateId || !publicKey) {
    console.log('\n📧 ─────────────────────────────────────────────────────────────');
    console.log(` [EMAILJS SIMULATION] ${logContext.title}`);
    console.log(` Recipient : ${templateParams.to_name} <${targetEmail}>`);
    console.log(` Ticket ID : ${templateParams.ticket_id}`);
    console.log(` Subject   : ${templateParams.subject}`);
    console.log(` Summary   : ${templateParams.message || templateParams.description}`);
    console.log(` Portal/Tracker Link : ${templateParams.portal_link || templateParams.tracking_link}`);
    console.log('─────────────────────────────────────────────────────────────\n');
    return { simulated: true, success: true };
  }

  try {
    const payload = {
      service_id: serviceId,
      template_id: templateId,
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
      console.log(`✓ Email notification sent to ${targetEmail} [${logContext.title}]`);
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
 * 1. Topic-Based Routing: Sent exclusively to the responsible department employee
 */
export async function sendTicketAssignedToEmployeeNotification({ company, employee, ticket, isAutoRouted = true }) {
  if (!employee || !employee.email) {
    console.log(`[Email Notice] Assigned employee has no valid email. Notification skipped.`);
    return { success: false, reason: 'No employee email' };
  }

  const { appUrl } = getEmailConfig();
  const targetEmail = employee.email;
  const portalLink = `${appUrl}/portal/${company.slug}/tickets/${ticket.ticketId}`;

  const message = `A new ${ticket.category} complaint has been ${isAutoRouted ? 'auto-routed' : 'assigned'} to your department (${employee.department || 'Support'}) queue. Please review and respond within SLA targets.`;

  const templateParams = {
    to_name: employee.name,
    to_email: targetEmail,
    company_name: company.name,
    ticket_id: ticket.ticketId,
    subject: `[Assigned to You] ${ticket.category}: ${ticket.subject}`,
    category: ticket.category || 'General Support',
    priority: ticket.priority || 'Medium',
    customer_name: ticket.customer?.name || 'Customer',
    customer_email: ticket.customer?.email || 'N/A',
    customer_phone: ticket.customer?.phone || 'Not provided',
    description: ticket.description,
    portal_link: portalLink,
    message,
    department: employee.department || 'General',
    created_at: new Date().toLocaleString(),
  };

  return dispatchEmailJS({
    targetEmail,
    templateParams,
    logContext: { title: `Assigned to Department Employee: ${employee.name} (${employee.department || 'General'})` },
  });
}

/**
 * 2. Developer Fallback: Sent exclusively to company developer when no department employee exists
 */
export async function sendTicketFallbackToDeveloperNotification({ company, developer, ticket, reason }) {
  if (!developer || !developer.email) {
    console.log(`[Email Notice] No developer assigned to ${company.name}. Notification skipped.`);
    return { success: false, reason: 'No developer email' };
  }

  const { appUrl } = getEmailConfig();
  const targetEmail = developer.email;
  const portalLink = `${appUrl}/portal/${company.slug}/tickets/${ticket.ticketId}`;

  const message = reason || `A new grievance under category "${ticket.category}" was filed. No active department specialist was found for this category, so it has been routed to your Developer Triage Queue to solve directly or redirect to any staff member.`;

  const templateParams = {
    to_name: developer.name,
    to_email: targetEmail,
    company_name: company.name,
    ticket_id: ticket.ticketId,
    subject: `[Developer Triage Required] ${ticket.category}: ${ticket.subject}`,
    category: ticket.category || 'General Support',
    priority: ticket.priority || 'Medium',
    customer_name: ticket.customer?.name || 'Customer',
    customer_email: ticket.customer?.email || 'N/A',
    customer_phone: ticket.customer?.phone || 'Not provided',
    description: ticket.description,
    portal_link: portalLink,
    message,
    created_at: new Date().toLocaleString(),
  };

  return dispatchEmailJS({
    targetEmail,
    templateParams,
    logContext: { title: `Developer Fallback Triage: ${developer.name}` },
  });
}

/**
 * 3. Developer Redirection Alert: Sent exclusively to the newly assigned employee
 */
export async function sendTicketRedirectedNotification({ company, employee, developer, ticket }) {
  if (!employee || !employee.email) {
    return { success: false, reason: 'No employee email' };
  }

  const { appUrl } = getEmailConfig();
  const targetEmail = employee.email;
  const portalLink = `${appUrl}/portal/${company.slug}/tickets/${ticket.ticketId}`;

  const message = `Lead Developer ${developer?.name || 'Lead Admin'} has redirected grievance #${ticket.ticketId} ("${ticket.subject}") to your attention for resolution.`;

  const templateParams = {
    to_name: employee.name,
    to_email: targetEmail,
    company_name: company.name,
    ticket_id: ticket.ticketId,
    subject: `[Redirected to You] Ticket #${ticket.ticketId} from ${developer?.name || 'Developer'}`,
    category: ticket.category || 'General Support',
    priority: ticket.priority || 'Medium',
    customer_name: ticket.customer?.name || 'Customer',
    customer_email: ticket.customer?.email || 'N/A',
    customer_phone: ticket.customer?.phone || 'Not provided',
    description: ticket.description,
    portal_link: portalLink,
    message,
    department: employee.department || 'General',
    created_at: new Date().toLocaleString(),
  };

  return dispatchEmailJS({
    targetEmail,
    templateParams,
    logContext: { title: `Ticket Redirected to Employee: ${employee.name}` },
  });
}

/**
 * 4. Customer Resolution Notice: Sent exclusively to the customer when their query is marked Resolved or Closed
 */
export async function sendTicketResolvedNotificationToCustomer({ company, ticket, resolvedBy, resolutionNote }) {
  if (!ticket?.customer?.email) {
    console.log(`[Email Notice] Ticket has no customer email. Resolution notification skipped.`);
    return { success: false, reason: 'No customer email' };
  }

  const { appUrl } = getEmailConfig();
  // Delivered directly to the customer's actual registered email address
  const targetEmail = ticket.customer.email;
  const trackerLink = `${appUrl}/s/${company.slug}/track/${ticket.ticketId}`;

  const message = resolutionNote || `Great news! Your grievance regarding "${ticket.subject}" has been marked as resolved by ${resolvedBy || company.name + ' Support Team'}. You can inspect the audit timeline and rate your resolution satisfaction via the tracking link below.`;

  const templateParams = {
    to_name: ticket.customer.name || 'Valued Customer',
    to_email: targetEmail,
    email: targetEmail,
    customer_email: targetEmail,
    user_email: targetEmail,
    recipient_email: targetEmail,
    reply_to: targetEmail,
    company_name: company.name,
    ticket_id: ticket.ticketId,
    subject: `Your query has been resolved: ${ticket.ticketId} - ${company.name}`,
    category: ticket.category || 'General Support',
    priority: ticket.priority || 'Medium',
    customer_name: ticket.customer.name || 'Customer',
    tracking_link: trackerLink,
    portal_link: trackerLink,
    message,
    description: ticket.description,
    resolved_by: resolvedBy || 'Support Team',
    created_at: new Date().toLocaleString(),
  };

  return dispatchEmailJS({
    targetEmail,
    templateParams,
    logContext: { title: `Customer Query Resolved Alert: ${ticket.customer.email}` },
  });
}

/**
 * 5. Legacy wrapper for backward compatibility
 */
export async function sendTicketNotificationToDeveloper({ company, developer, ticket }) {
  return sendTicketFallbackToDeveloperNotification({
    company,
    developer,
    ticket,
    reason: `New complaint filed under "${ticket.category}". Forwarded for lead developer oversight.`,
  });
}
