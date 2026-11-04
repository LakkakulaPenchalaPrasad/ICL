import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderName: { type: String, required: true },
    senderRole: {
      type: String,
      enum: ['customer', 'employee', 'developer'],
      required: true,
    },
    text: { type: String, required: true },
    isInternal: { type: Boolean, default: false }, // Internal notes not visible to customer
  },
  { timestamps: true }
);

const timelineSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    by: { type: String, required: true },
    details: { type: String, default: '' },
    isInternal: { type: Boolean, default: false }, // Internal audit events hidden from customer
  },
  { timestamps: true }
);

const attachmentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    url: { type: String, required: true },
    size: { type: Number, default: 0 },
  },
  { _id: false }
);

const csatSchema = new mongoose.Schema(
  {
    rating: { type: Number, min: 1, max: 5 },
    feedback: { type: String, default: '' },
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ticketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
      index: true,
    },
    customer: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, default: '' },
    },
    category: { type: String, required: true },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Escalated', 'Resolved', 'Closed'],
      default: 'Open',
    },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    slaHours: { type: Number, default: 24 },
    slaDeadline: { type: Date },
    attachments: [attachmentSchema],
    messages: [messageSchema],
    timeline: [timelineSchema],
    csat: csatSchema,
  },
  {
    timestamps: true,
  }
);

// Compound index for company-scoped queries
ticketSchema.index({ company: 1, status: 1 });
ticketSchema.index({ company: 1, priority: 1 });
ticketSchema.index({ 'customer.userId': 1, company: 1 });

// Compute SLA deadline before save
ticketSchema.pre('save', function () {
  if (this.isNew && !this.slaDeadline) {
    const slaMap = { Critical: 4, High: 12, Medium: 24, Low: 48 };
    this.slaHours = slaMap[this.priority] || 24;
    this.slaDeadline = new Date(Date.now() + this.slaHours * 60 * 60 * 1000);
  }
});

export const Ticket = mongoose.model('Ticket', ticketSchema);
