/**
 * Email Notification Service (EmailJS REST API)
 * Sends real-time email alerts to company developers whenever a customer files a complaint.
 */

export async function sendTicketNotificationToDeveloper({ company, developer, ticket }) {
  if (!developer || !developer.email) {
    console.log(`[Email Notice] No developer assigned to ${company.name} (${company.slug}). Notification skipped.`);
    return { success: false, reason: 'No developer assigned' };
  }

  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY; // Optional EmailJS private access token
  const appUrl = process.env.APP_URL || 'http://localhost:5173';

  // Recipient email:
  // Resolves to the company developer's email (or superadmin fallback).
  // If DEV_NOTIFICATION_OVERRIDE is provided in .env (e.g. tellapallyakhil89@gmail.com),
  // all live alerts will safely deliver to your personal inbox during evaluation!
  const targetEmail = process.env.DEV_NOTIFICATION_OVERRIDE || developer.email;

  const portalLink = `${appUrl}/portal/${company.slug}/tickets/${ticket.ticketId}`;

  const templateParams = {
    to_name: developer.name,
    to_email: targetEmail,
    company_name: company.name,
    ticket_id: ticket.ticketId,
    subject: ticket.subject,
    category: ticket.category || 'General',
    priority: ticket.priority || 'Medium',
    customer_name: ticket.customer?.name || 'Customer',
    customer_email: ticket.customer?.email || 'N/A',
    customer_phone: ticket.customer?.phone || 'Not provided',
    description: ticket.description,
    portal_link: portalLink,
    created_at: new Date().toLocaleString(),
  };

  // If EmailJS credentials are not configured yet, log a detailed preview in the terminal
  if (!serviceId || !templateId || !publicKey) {
    console.log('\n📧 ─────────────────────────────────────────────────────────────');
    console.log(` [EMAILJS SIMULATION] New Complaint Alert for ${company.name}`);
    console.log(` Developer   : ${developer.name} <${developer.email}>`);
    console.log(` Ticket ID   : ${ticket.ticketId}`);
    console.log(` Subject     : ${ticket.subject}`);
    console.log(` Customer    : ${ticket.customer?.name} (${ticket.customer?.email})`);
    console.log(` Priority    : ${ticket.priority} | Category: ${ticket.category}`);
    console.log(` Portal Link : ${portalLink}`);
    console.log(' 💡 Setup: Add EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, and EMAILJS_PUBLIC_KEY in .env for real emails.');
    console.log('─────────────────────────────────────────────────────────────\n');
    return { simulated: true, success: true };
  }

  try {
    const payload = {
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      template_params: templateParams,
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
      console.log(`✓ Email notification sent to ${developer.email} for ticket ${ticket.ticketId}`);
      return { success: true };
    } else {
      const errorText = await response.text();
      console.error(`✕ EmailJS API responded with error (${response.status}):`, errorText);
      return { success: false, error: errorText };
    }
  } catch (err) {
    console.error('✕ Failed to send EmailJS notification:', err.message);
    return { success: false, error: err.message };
  }
}

