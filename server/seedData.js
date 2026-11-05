import bcrypt from 'bcryptjs';
import { User } from './models/User.js';
import { Company } from './models/Company.js';
import { Ticket } from './models/Ticket.js';
import { FAQ } from './models/Article.js';
import { Category } from './models/Category.js';

/**
 * Seeds the database with initial sample data if collections are empty.
 * Creates: 1 Super Admin, 2 Companies, 2 Developers, 4 Employees,
 *          categories, FAQs, and sample tickets per company.
 */
export async function seedDatabaseIfEmpty() {
  const userCount = await User.countDocuments();
  if (userCount > 0) {
    console.log('Database already has data — skipping seed.');
    return;
  }

  console.log('Seeding database with initial sample data...');

  const salt = await bcrypt.genSalt(10);
  const defaultPassword = await bcrypt.hash('password123', salt);

  // ─── 1. Super Admin ───
  const superAdmin = await User.create({
    name: 'Akhil Tellapally',
    email: 'admin@resolveit.com',
    password: defaultPassword,
    role: 'superadmin',
  });
  console.log('  ✓ Super Admin created (admin@resolveit.com / password123)');

  // ─── 2. Companies ───
  const techNova = await Company.create({
    name: 'TechNova Solutions',
    slug: 'technova',
    industry: 'Technology',
    ticketPrefix: 'TNS',
    branding: {
      primaryColor: '#25221f',
      accentColor: '#8c6a46',
      welcomeMessage: 'Welcome to TechNova Support',
      tagline: 'Innovation meets resolution — we are here to help.',
    },
  });

  const quickCart = await Company.create({
    name: 'QuickCart E-Commerce',
    slug: 'quickcart',
    industry: 'E-Commerce',
    ticketPrefix: 'QC',
    branding: {
      primaryColor: '#25221f',
      accentColor: '#446450',
      welcomeMessage: 'QuickCart Customer Care',
      tagline: 'Your satisfaction is our priority.',
    },
  });

  console.log('  ✓ 2 Companies created (technova, quickcart)');

  // ─── 3. Developers ───
  const devTech = await User.create({
    name: 'Priya Sharma',
    email: 'dev@technova.com',
    password: defaultPassword,
    role: 'developer',
    company: techNova._id,
  });
  techNova.developer = devTech._id;
  await techNova.save();

  const devCart = await User.create({
    name: 'Rahul Menon',
    email: 'dev@quickcart.com',
    password: defaultPassword,
    role: 'developer',
    company: quickCart._id,
  });
  quickCart.developer = devCart._id;
  await quickCart.save();

  console.log('  ✓ 2 Developers created (dev@technova.com, dev@quickcart.com)');

  // ─── 4. Employees ───
  const emp1 = await User.create({
    name: 'Devon Price',
    email: 'devon@technova.com',
    password: defaultPassword,
    role: 'employee',
    company: techNova._id,
    department: 'Technical Support',
  });

  const emp2 = await User.create({
    name: 'Elena Rostova',
    email: 'elena@technova.com',
    password: defaultPassword,
    role: 'employee',
    company: techNova._id,
    department: 'Logistics',
  });

  const emp3 = await User.create({
    name: 'Marcus Chen',
    email: 'marcus@quickcart.com',
    password: defaultPassword,
    role: 'employee',
    company: quickCart._id,
    department: 'Billing Support',
  });

  const emp4 = await User.create({
    name: 'Sarah Williams',
    email: 'sarah@quickcart.com',
    password: defaultPassword,
    role: 'employee',
    company: quickCart._id,
    department: 'Customer Relations',
  });

  console.log('  ✓ 4 Employees created');

  // ─── 5. Verified Customers ───
  const cust1 = await User.create({
    name: 'Samantha Brooks',
    email: 'samantha@gmail.com',
    googleId: 'google_cust_001',
    avatar: '',
    role: 'customer',
  });

  const cust2 = await User.create({
    name: 'Arjun Patel',
    email: 'arjun@gmail.com',
    googleId: 'google_cust_002',
    avatar: '',
    role: 'customer',
  });

  const cust3 = await User.create({
    name: 'Dr. Evelyn Reed',
    email: 'evelyn@gmail.com',
    googleId: 'google_cust_003',
    avatar: '',
    role: 'customer',
  });

  console.log('  ✓ 3 Verified Customers created');

  // ─── 6. Categories ───
  const techCategories = [
    { name: 'Technical Issue', description: 'Software bugs, crashes, and technical problems', icon: 'Bug', company: techNova._id },
    { name: 'Account & Access', description: 'Login issues, password resets, 2FA problems', icon: 'Lock', company: techNova._id },
    { name: 'Billing', description: 'Charges, invoices, refunds, and payment issues', icon: 'CreditCard', company: techNova._id },
    { name: 'Feature Request', description: 'Suggestions for new features or improvements', icon: 'Lightbulb', company: techNova._id },
    { name: 'General Inquiry', description: 'Other questions and general support', icon: 'HelpCircle', company: techNova._id },
  ];

  const cartCategories = [
    { name: 'Order Issue', description: 'Problems with orders, delivery, or tracking', icon: 'Package', company: quickCart._id },
    { name: 'Refund & Returns', description: 'Return requests, refund status, exchange', icon: 'RotateCcw', company: quickCart._id },
    { name: 'Product Quality', description: 'Damaged, defective, or incorrect products', icon: 'AlertTriangle', company: quickCart._id },
    { name: 'Payment Issue', description: 'Failed payments, double charges, wallet issues', icon: 'CreditCard', company: quickCart._id },
    { name: 'Delivery Complaint', description: 'Late delivery, missing items, wrong address', icon: 'Truck', company: quickCart._id },
  ];

  await Category.insertMany([...techCategories, ...cartCategories]);
  console.log('  ✓ 10 Categories created (5 per company)');

  // ─── 7. FAQs ───
  const techFaqs = [
    { company: techNova._id, category: 'Account', question: 'How do I reset my password?', answer: 'Go to Settings → Security → Reset Password. You will receive a verification email within 2 minutes. Click the link to set a new password.', order: 0 },
    { company: techNova._id, category: 'Technical', question: 'Why is the app running slowly?', answer: 'Clear your browser cache, disable unnecessary extensions, and ensure you are on the latest version. If the issue persists, file a support ticket.', order: 1 },
    { company: techNova._id, category: 'Billing', question: 'How do I request a refund?', answer: 'Navigate to Billing → Transaction History → Select the transaction → Click "Request Refund". Refunds are processed within 5-7 business days.', order: 2 },
    { company: techNova._id, category: 'General', question: 'What are your support hours?', answer: 'Our support team is available Monday to Friday, 9:00 AM to 6:00 PM IST. Critical issues are monitored 24/7.', order: 3 },
    { company: techNova._id, category: 'Technical', question: 'How do I enable two-factor authentication?', answer: 'Go to Settings → Security → Enable 2FA. You can use an authenticator app or receive SMS codes.', order: 4 },
  ];

  const cartFaqs = [
    { company: quickCart._id, category: 'Orders', question: 'How do I track my order?', answer: 'Go to My Orders → Select your order → Click "Track Shipment". You will see real-time tracking with estimated delivery date.', order: 0 },
    { company: quickCart._id, category: 'Returns', question: 'What is the return policy?', answer: 'You can return most items within 30 days of delivery. Items must be unused and in original packaging. Refunds are processed within 5-7 business days.', order: 1 },
    { company: quickCart._id, category: 'Payment', question: 'Why was I charged twice?', answer: 'Duplicate charges are usually temporary authorization holds. They will be automatically reversed within 3-5 business days. If not, file a complaint and we will resolve it immediately.', order: 2 },
    { company: quickCart._id, category: 'Delivery', question: 'My order shows delivered but I did not receive it', answer: 'Check with neighbours and your building security. If not found, file a complaint within 48 hours and we will initiate an investigation.', order: 3 },
    { company: quickCart._id, category: 'General', question: 'How do I contact customer support?', answer: 'You can file a complaint through this service page, or email support@quickcart.com. Our team responds within 4 hours during business days.', order: 4 },
  ];

  await FAQ.insertMany([...techFaqs, ...cartFaqs]);
  console.log('  ✓ 10 FAQs created (5 per company)');

  // ─── 8. Sample Tickets ───
  // TechNova tickets
  techNova.ticketCounter = 0;
  await techNova.save();

  const techTickets = [
    {
      ticketId: 'TNS-2026-0001',
      company: techNova._id,
      customer: { userId: cust1._id, name: cust1.name, email: cust1.email, phone: '9876543210' },
      category: 'Account & Access',
      priority: 'High',
      status: 'In Progress',
      subject: 'SSO Enterprise Login Bug & 2FA Auth Loop',
      description: 'When attempting to log in via SSO, the system enters a 2FA verification loop. After entering the correct code, it redirects back to the login page instead of the dashboard.',
      assignedTo: emp1._id,
      slaHours: 12,
      slaDeadline: new Date(Date.now() + 12 * 60 * 60 * 1000),
      timeline: [
        { action: 'Ticket Created', by: cust1.name, details: 'Filed under Account & Access with High priority.' },
        { action: 'Assigned', by: devTech.name, details: 'Assigned to Devon Price (Technical Support).' },
        { action: 'Status Changed', by: emp1.name, details: 'Status changed from "Open" to "In Progress".' },
      ],
      messages: [
        { sender: cust1._id, senderName: cust1.name, senderRole: 'customer', text: 'This issue is blocking our entire team from accessing the platform. Please prioritize.', isInternal: false },
        { sender: emp1._id, senderName: emp1.name, senderRole: 'employee', text: 'We are investigating the SSO integration. Can you confirm which identity provider you are using?', isInternal: false },
        { sender: emp1._id, senderName: emp1.name, senderRole: 'employee', text: 'Looks like a session token mismatch. Needs backend fix.', isInternal: true },
      ],
    },
    {
      ticketId: 'TNS-2026-0002',
      company: techNova._id,
      customer: { userId: cust2._id, name: cust2.name, email: cust2.email, phone: '9988776655' },
      category: 'Billing',
      priority: 'Critical',
      status: 'Escalated',
      subject: 'Double Charged $249.00 on Annual Subscription Renewal',
      description: 'I was charged twice for my annual subscription renewal. The amount of $249.00 was deducted twice from my credit card. I need an immediate refund for the duplicate charge.',
      assignedTo: emp2._id,
      slaHours: 4,
      slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000),
      timeline: [
        { action: 'Ticket Created', by: cust2.name, details: 'Filed under Billing with Critical priority.' },
        { action: 'Ticket Escalated', by: devTech.name, details: 'Escalated — duplicate billing requires immediate finance team review.' },
      ],
      messages: [
        { sender: cust2._id, senderName: cust2.name, senderRole: 'customer', text: 'I have attached my bank statement showing the double charge. This is urgent.', isInternal: false },
      ],
    },
    {
      ticketId: 'TNS-2026-0003',
      company: techNova._id,
      customer: { userId: cust3._id, name: cust3.name, email: cust3.email },
      category: 'Technical Issue',
      priority: 'High',
      status: 'Resolved',
      subject: 'Dashboard Charts Not Loading on Firefox',
      description: 'The analytics dashboard charts fail to render on Firefox 120+. The page shows blank containers where charts should be.',
      assignedTo: emp1._id,
      slaHours: 12,
      slaDeadline: new Date(Date.now() - 2 * 60 * 60 * 1000), // Past deadline (resolved)
      csat: { rating: 4, feedback: 'Issue was resolved promptly. Thank you!', submittedAt: new Date() },
      timeline: [
        { action: 'Ticket Created', by: cust3.name, details: 'Filed under Technical Issue with High priority.' },
        { action: 'Status Changed', by: emp1.name, details: 'Status changed to "Resolved". Fixed chart.js compatibility.' },
        { action: 'CSAT Submitted', by: cust3.name, details: 'Customer rated 4/5 stars.' },
      ],
    },
  ];

  // QuickCart tickets
  quickCart.ticketCounter = 0;
  await quickCart.save();

  const cartTickets = [
    {
      ticketId: 'QC-2026-0001',
      company: quickCart._id,
      customer: { userId: cust1._id, name: cust1.name, email: cust1.email, phone: '9876543210' },
      category: 'Order Issue',
      priority: 'Medium',
      status: 'Open',
      subject: 'Order #QC-78432 Not Delivered After 7 Days',
      description: 'I placed an order 7 days ago with expected delivery in 3-5 days. The tracking status has not updated in 4 days. The last update shows "Out for delivery" but I never received it.',
      slaHours: 24,
      slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      timeline: [
        { action: 'Ticket Created', by: cust1.name, details: 'Filed under Order Issue with Medium priority.' },
      ],
    },
    {
      ticketId: 'QC-2026-0002',
      company: quickCart._id,
      customer: { userId: cust2._id, name: cust2.name, email: cust2.email },
      category: 'Product Quality',
      priority: 'High',
      status: 'In Progress',
      subject: 'Received Damaged Laptop — Screen Cracked',
      description: 'The laptop I received has a cracked screen. The outer box was also visibly damaged. I need an immediate replacement or full refund.',
      assignedTo: emp3._id,
      slaHours: 12,
      slaDeadline: new Date(Date.now() + 12 * 60 * 60 * 1000),
      timeline: [
        { action: 'Ticket Created', by: cust2.name, details: 'Filed under Product Quality with High priority.' },
        { action: 'Assigned', by: devCart.name, details: 'Assigned to Marcus Chen (Billing Support).' },
        { action: 'Status Changed', by: emp3.name, details: 'Status changed to "In Progress". Investigating with logistics partner.' },
      ],
      messages: [
        { sender: cust2._id, senderName: cust2.name, senderRole: 'customer', text: 'I have photos of the damaged product and packaging. How do I upload them?', isInternal: false },
        { sender: emp3._id, senderName: emp3.name, senderRole: 'employee', text: 'We are sorry about this. Please reply with the photos and we will fast-track your replacement.', isInternal: false },
      ],
    },
    {
      ticketId: 'QC-2026-0003',
      company: quickCart._id,
      customer: { userId: cust3._id, name: cust3.name, email: cust3.email },
      category: 'Refund & Returns',
      priority: 'Medium',
      status: 'Resolved',
      subject: 'Refund Not Received for Returned Item',
      description: 'I returned an item 15 days ago and the return was accepted. However, I still have not received my refund. Order reference: QC-71209.',
      assignedTo: emp4._id,
      slaHours: 24,
      slaDeadline: new Date(Date.now() - 5 * 60 * 60 * 1000),
      csat: { rating: 5, feedback: 'Excellent support! Refund was processed quickly after I raised the ticket.', submittedAt: new Date() },
      timeline: [
        { action: 'Ticket Created', by: cust3.name, details: 'Filed under Refund & Returns.' },
        { action: 'Status Changed', by: emp4.name, details: 'Status changed to "Resolved". Refund processed to bank account.' },
        { action: 'CSAT Submitted', by: cust3.name, details: 'Customer rated 5/5 stars.' },
      ],
    },
  ];

  await Ticket.insertMany([...techTickets, ...cartTickets]);

  // Update ticket counters
  techNova.ticketCounter = 3;
  quickCart.ticketCounter = 3;
  await techNova.save();
  await quickCart.save();

  console.log('  ✓ 6 Sample Tickets created (3 per company)');
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  SEED DATA COMPLETE — Login Credentials:');
  console.log('═══════════════════════════════════════════');
  console.log('  Super Admin : admin@resolveit.com / password123');
  console.log('  TechNova Dev: dev@technova.com   / password123');
  console.log('  QuickCart Dev: dev@quickcart.com  / password123');
  console.log('  Employees   : devon@technova.com / password123');
  console.log('                elena@technova.com / password123');
  console.log('                marcus@quickcart.com / password123');
  console.log('                sarah@quickcart.com  / password123');
  console.log('  Customers use Google Sign-In on service pages');
  console.log('═══════════════════════════════════════════');
}
