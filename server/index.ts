import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
const smtpUser = process.env.SMTP_USER || '';
const smtpPass = process.env.SMTP_PASS || '';
const emailFrom = process.env.EMAIL_FROM || (smtpUser ? `Unitel Credit Intelligence <${smtpUser}>` : '');

// In-memory deduplication cache: Set of `${applicationId}:${eventType}:${recipient}`
const sentEmailDedupe = new Set<string>();

let transporter: nodemailer.Transporter | null = null;

if (smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  transporter.verify((error) => {
    if (error) {
      console.error(`[SMTP ERROR] Connection to ${smtpHost}:${smtpPort} failed:`, error.message);
    } else {
      console.log(`[SMTP CONNECTED] Connection to ${smtpHost}:${smtpPort} verified successfully! Ready to send emails.`);
    }
  });
} else {
  console.warn('[SMTP WARNING] SMTP_USER or SMTP_PASS is missing in .env. Email dispatch will return an error until credentials are set.');
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    smtpConfigured: Boolean(smtpUser && smtpPass),
    smtpHost,
    emailFrom: emailFrom || 'Not configured',
  });
});

// Real email dispatch endpoint
app.post('/api/send-email', async (req, res) => {
  const { to, subject, text, html, applicationId, eventType } = req.body;

  if (!to || (!Array.isArray(to) && typeof to !== 'string')) {
    return res.status(400).json({ success: false, error: 'Recipient address "to" is required' });
  }

  if (!subject || !text) {
    return res.status(400).json({ success: false, error: 'Email "subject" and "text" are required' });
  }

  if (!transporter || !smtpUser || !smtpPass) {
    const errorMsg = 'SMTP credentials not configured in server .env (SMTP_USER / SMTP_PASS)';
    console.error(`[EMAIL FAILED] Cannot send to ${to}: ${errorMsg}`);
    return res.status(500).json({ success: false, error: errorMsg });
  }

  const recipients = Array.isArray(to) ? to : [to];
  const results: { email: string; status: 'sent' | 'skipped' | 'failed'; error?: string }[] = [];

  for (const recipient of recipients) {
    const cleanRecipient = recipient.trim();
    if (!cleanRecipient) continue;

    const dedupeKey = applicationId && eventType ? `${applicationId}:${eventType}:${cleanRecipient}` : null;
    if (dedupeKey && sentEmailDedupe.has(dedupeKey)) {
      console.log(`[EMAIL DEDUPE] Skipping duplicate email to ${cleanRecipient} for ${dedupeKey}`);
      results.push({ email: cleanRecipient, status: 'skipped' });
      continue;
    }

    try {
      const info = await transporter.sendMail({
        from: emailFrom || smtpUser,
        to: cleanRecipient,
        subject,
        text,
        html: html || text.replace(/\n/g, '<br/>'),
      });

      if (dedupeKey) {
        sentEmailDedupe.add(dedupeKey);
      }

      console.log(`[EMAIL SENT] Delivered to ${cleanRecipient} (MessageId: ${info.messageId})`);
      results.push({ email: cleanRecipient, status: 'sent' });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[EMAIL ERROR] Failed sending to ${cleanRecipient}:`, errMsg);
      results.push({ email: cleanRecipient, status: 'failed', error: errMsg });
    }
  }

  const allFailed = results.length > 0 && results.every((r) => r.status === 'failed');
  if (allFailed) {
    return res.status(500).json({
      success: false,
      error: results[0]?.error || 'Failed to dispatch email',
      results,
    });
  }

  res.json({
    success: true,
    results,
  });
});

// Admin test email endpoint
app.post('/api/send-test-email', async (req, res) => {
  const { to } = req.body;
  if (!to || typeof to !== 'string') {
    return res.status(400).json({ success: false, error: 'Recipient email address "to" is required' });
  }

  if (!transporter || !smtpUser || !smtpPass) {
    const errorMsg = 'SMTP credentials not configured in server .env (SMTP_USER / SMTP_PASS)';
    return res.status(500).json({ success: false, error: errorMsg });
  }

  try {
    const info = await transporter.sendMail({
      from: emailFrom || smtpUser,
      to: to.trim(),
      subject: 'Unitel Credit Intelligence — SMTP Test Email',
      text: `Hello,\n\nThis is a real test email sent from the Unitel Credit Intelligence server.\n\nSMTP Connection: Verified OK\nTimestamp: ${new Date().toLocaleString()}\n\nIf you see this, real email delivery is working perfectly!`,
    });

    console.log(`[TEST EMAIL SENT] Sent test email to ${to} (MessageId: ${info.messageId})`);
    res.json({ success: true, messageId: info.messageId });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[TEST EMAIL ERROR] Failed to send test email to ${to}:`, errMsg);
    res.status(500).json({ success: false, error: errMsg });
  }
});

app.listen(PORT, () => {
  console.log(`[EMAIL SERVER] Express + Nodemailer server running on http://localhost:${PORT}`);
});

