import dotenv from 'dotenv';
dotenv.config();

import { sendTicketNotificationToDeveloper } from './utils/email.js';

async function main() {
  const targetEmail = process.argv[2] || 'tellapallyakhil89@gmail.com';

  console.log(`\nInitiating test email dispatch to: ${targetEmail}...`);

  const result = await sendTicketNotificationToDeveloper({
    company: { name: 'TechNova Solutions', slug: 'technova' },
    developer: { name: 'Akhil Tellapally', email: targetEmail },
    ticket: {
      ticketId: 'TNS-2026-TEST',
      subject: 'ResolveIT Live Verification — EmailJS HTML Notification',
      category: 'System Verification',
      priority: 'Urgent',
      description: 'This is a live test email to verify that your EmailJS integration and modern HTML template are working end-to-end!',
      customer: {
        name: 'ResolveIT Automated Tester',
        email: 'test@resolveit.local',
        phone: '+91 99999 88888',
      },
    },
  });

  if (result.simulated) {
    console.log('⚠️  Email was simulated in console because EmailJS keys are not yet set in .env.');
    console.log('👉 Please add EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, and EMAILJS_PUBLIC_KEY in .env to deliver real emails.\n');
  } else if (result.success) {
    console.log('🎉 SUCCESS! Real email successfully delivered to ' + targetEmail + '\n');
  } else {
    console.error('❌ Failed to send email:', result.error);
  }
}

main();

