/** Rule-based agent replies — used offline, in Demo mode, and as the AI fallback. */
const naira = (n) => '₦' + Math.round(n).toLocaleString('en-NG');

export function ruleReply({ message = '', customerName = '', business = {}, openInvoices = [], services = [], slots = [] }) {
  const m = message.toLowerCase();
  const first = (customerName || '').split(' ')[0] || 'there';

  if (/(book|appointment|schedule|visit|come (in|by)|available|slot)/.test(m)) {
    const s = slots.slice(0, 3);
    if (!s.length) return { intent: 'booking', reply: `Hi ${first}, thanks for reaching out! Our team will confirm a time with you shortly.`, action: { type: 'handoff' } };
    return {
      intent: 'booking',
      reply: `Hi ${first}! We have these openings: ${s.join(', ')}. Reply with the one that works and I'll lock it in for you.`,
      action: { type: 'offer_slots', slots: s },
    };
  }
  if (/(invoice|bill|balance|owe|pay|account number|bank)/.test(m)) {
    if (openInvoices.length) {
      const inv = openInvoices[0];
      return {
        intent: 'invoice',
        reply: `Hi ${first}, invoice ${inv.number} for ${naira(inv.total)} is due ${inv.dueDate}. You can pay to ${business.bankDetails || 'our account (details on the invoice)'} — kindly send the receipt here once done. Thank you!`,
        action: { type: 'send_invoice', number: inv.number },
      };
    }
    return { intent: 'invoice', reply: `Hi ${first}, you have no outstanding invoices with us right now. Thank you for staying current!`, action: null };
  }
  if (/(price|cost|how much|rate|quote)/.test(m)) {
    if (services.length) {
      const list = services.slice(0, 4).map((s) => `${s.name} – ${naira(s.price)}`).join('; ');
      return { intent: 'pricing', reply: `Hi ${first}! Our current rates: ${list} (VAT excl.). Would you like a formal quote?`, action: null };
    }
    return { intent: 'pricing', reply: `Hi ${first}, thanks for asking! I'll get a quote across to you shortly.`, action: { type: 'handoff' } };
  }
  if (/(complain|bad|late|wrong|damaged|not happy|refund|disappointed)/.test(m)) {
    return { intent: 'complaint', reply: `I'm sorry about this, ${first}. I've flagged it to a manager who will call you today.`, action: { type: 'handoff' } };
  }
  return { intent: 'other', reply: `Hi ${first}, thanks for your message! A member of the ${business.name || ''} team will get back to you shortly.`.replace('  ', ' '), action: { type: 'handoff' } };
}

/** Polite → firm chaser copy by days overdue. */
export function chaserMessage(inv, business = {}) {
  const d = inv.daysOverdue || 0;
  const amt = naira(inv.totals?.total || 0);
  const who = (inv.customer?.contact || inv.customer?.name || '').split(' ')[0];
  if (d <= 0) return `Hi ${who}, a friendly reminder that invoice ${inv.number} (${amt}) from ${business.name} is due on ${inv.dueDate}. Pay to: ${business.bankDetails || 'details on invoice'}. Thank you!`;
  if (d <= 14) return `Hi ${who}, invoice ${inv.number} (${amt}) is now ${d} day${d > 1 ? 's' : ''} overdue. Kindly arrange payment to ${business.bankDetails || 'our account'} and share the receipt here. Thanks!`;
  return `Dear ${who}, invoice ${inv.number} (${amt}) is ${d} days overdue. Please settle this week or let us know a payment date so we can keep your account in good standing. — ${business.name} Accounts`;
}
