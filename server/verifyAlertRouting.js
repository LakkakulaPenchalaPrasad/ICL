import dotenv from 'dotenv';
dotenv.config();

import { connectToDatabase } from './config/db.js';
import './models/User.js';
import { Company } from './models/Company.js';
import { User } from './models/User.js';

async function verifyRouting() {
  await connectToDatabase();

  const companies = await Company.find().sort({ name: 1 });
  console.log('\n================================================================');
  console.log('       GRIEVANCE AUTOMATED ALERT ALIGNMENT AUDIT');
  console.log('================================================================\n');

  for (const c of companies) {
    let dev = null;
    if (c.developer) {
      dev = await User.findById(c.developer).select('name email');
    }
    const isFallback = !dev;
    if (!dev) {
      dev = await User.findOne({ role: 'superadmin' }).select('name email');
    }

    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const prefix = c.ticketPrefix || c.slug.toUpperCase();
    const sampleTicketId = `${prefix}-2026-0001`;
    const portalLink = `${appUrl}/portal/${c.slug}/tickets/${sampleTicketId}`;
    const override = process.env.DEV_NOTIFICATION_OVERRIDE;

    console.log(`🏢 COMPANY: ${c.name} (/s/${c.slug})`);
    console.log(`   ├─ Ticket Prefix   : ${prefix}`);
    console.log(`   ├─ Lead Developer  : ${dev.name} (${dev.email})`);
    console.log(`   ├─ Alert Routing   : ${isFallback ? '⚠️  Unassigned Company -> Fallback to Super Admin' : '✓ Direct Company Lead'}`);
    console.log(`   ├─ Test Forwarding : ${override ? `✓ Forwarded to ${override} (Testing Mode)` : 'Sent to Developer Email'}`);
    console.log(`   └─ Portal Link     : ${portalLink}`);
    console.log('----------------------------------------------------------------');
  }

  process.exit(0);
}

verifyRouting();

