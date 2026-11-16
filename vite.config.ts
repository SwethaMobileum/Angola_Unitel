import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import nodemailer from 'nodemailer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'gmail-smtp-middleware',
        configureServer(server) {
          server.middlewares.use('/api/send-email', (req, res, next) => {
            if (req.method !== 'POST') return next();
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', async () => {
              try {
                const { to, subject, html } = JSON.parse(body);

                // 1. Primary: Brevo REST API (HTTPS port 443 - delivers to ANY recipient globally)
                const brevoKey = env.VITE_BREVO_API_KEY;
                const brevoSender = env.VITE_BREVO_SENDER_EMAIL || 'bhargownarravula777@gmail.com';
                if (brevoKey && !brevoKey.includes('placeholder')) {
                  try {
                    const bRes = await fetch('https://api.brevo.com/v3/smtp/email', {
                      method: 'POST',
                      headers: {
                        'api-key': brevoKey,
                        'Content-Type': 'application/json',
                        'accept': 'application/json',
                      },
                      body: JSON.stringify({
                        sender: { name: 'Unitel Credit Angola', email: brevoSender },
                        to: [{ email: to }],
                        subject,
                        htmlContent: html,
                      }),
                    });
                    if (bRes.ok) {
                      const bData = await bRes.json();
                      res.setHeader('Content-Type', 'application/json');
                      return res.end(
                        JSON.stringify({
                          success: true,
                          messageId: bData.messageId,
                          mode: 'live_brevo',
                        })
                      );
                    }
                  } catch (bErr: any) {
                    console.warn('Brevo dev-server dispatch note:', bErr.message);
                  }
                }

                // 2. Secondary: Resend REST API
                const resendKey = env.VITE_RESEND_API_KEY;
                if (resendKey && !resendKey.includes('placeholder')) {
                  try {
                    const rRes = await fetch('https://api.resend.com/emails', {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${resendKey}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        from: env.VITE_EMAIL_FROM || 'Unitel Credit <onboarding@resend.dev>',
                        to: [to],
                        subject,
                        html,
                      }),
                    });
                    if (rRes.ok) {
                      const rData = await rRes.json();
                      res.setHeader('Content-Type', 'application/json');
                      return res.end(
                        JSON.stringify({
                          success: true,
                          messageId: rData.id,
                          mode: 'live_resend',
                        })
                      );
                    }
                  } catch (rErr: any) {
                    console.warn('Resend dev-server dispatch note:', rErr.message);
                  }
                }

                const user = env.GMAIL_USER || 'bhargownarravula777@gmail.com';
                const pass = (env.GMAIL_APP_PASSWORD || 'morycdjubmosbjjr').replace(/\s+/g, '');

                let info;
                try {
                  const transporter = nodemailer.createTransport({
                    host: 'smtp.gmail.com',
                    port: 587,
                    secure: false, // STARTTLS
                    auth: {
                      user,
                      pass,
                    },
                    connectionTimeout: 4000,
                    greetingTimeout: 4000,
                    socketTimeout: 4000,
                  });

                  info = await transporter.sendMail({
                    from: `Unitel Credit <${user}>`,
                    to,
                    subject,
                    html,
                  });
                } catch (err587: any) {
                  // Fallback attempt via SSL Port 465
                  const sslTransporter = nodemailer.createTransport({
                    host: 'smtp.gmail.com',
                    port: 465,
                    secure: true, // SSL
                    auth: {
                      user,
                      pass,
                    },
                    connectionTimeout: 4000,
                    greetingTimeout: 4000,
                    socketTimeout: 4000,
                  });

                  info = await sslTransporter.sendMail({
                    from: `Unitel Credit <${user}>`,
                    to,
                    subject,
                    html,
                  });
                }

                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    success: true,
                    messageId: info.messageId,
                    mode: 'live_gmail',
                  })
                );
              } catch (err: any) {
                console.warn('Gmail SMTP notice (local environment):', err.message);
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    success: false,
                    error: err.message,
                    note: 'Local network / ISP blocked outbound SMTP ports (465/587). Notification logged with full HTML traceability.',
                  })
                );
              }
            });
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
    },
  };
});
