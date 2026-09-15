/**
 * Vercel Serverless Function — Email Relay for YellowBird.
 * Bypasses cloud host SMTP port blocks (such as Render free tier blocking port 587/465).
 * Connects to Gmail SMTP via port 465 (SSL) using the authenticated Google App credentials.
 */

import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-YellowBird-Secret'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, html, text, secret } = req.body || {};

  // Verify secret token to prevent unauthorized relay usage
  const providedSecret = secret || req.headers['x-yellowbird-secret'];
  if (providedSecret !== 'yellowbird-auth-secret-2024') {
    return res.status(401).json({ error: 'Unauthorized: invalid relay secret' });
  }

  if (!to || (!html && !text)) {
    return res.status(400).json({ error: 'Missing required fields: to, html or text' });
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // SSL port 465
    auth: {
      user: 'yellowbird.authentication@gmail.com',
      pass: 'fukiqarvuaawtysd',
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });

  try {
    const info = await transporter.sendMail({
      from: '"YellowBird Authentication" <yellowbird.authentication@gmail.com>',
      to,
      subject: subject || 'YellowBird Notification',
      text: text || '',
      html: html || undefined,
    });

    console.log(`[Relay] Email successfully sent to ${to}: ${info.messageId}`);
    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('[Relay Error] Failed to send email via Gmail SMTP:', error);
    return res.status(500).json({
      error: 'SMTP send failed',
      details: error.message,
    });
  }
}
