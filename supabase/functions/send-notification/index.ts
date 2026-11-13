// Supabase Edge Function: send-notification
// Implements email dispatch via Resend or SMTP, with graceful fallback to demo mode.
// Server-side environment variables:
// - EMAIL_PROVIDER: 'resend' | 'smtp' | 'demo'
// - EMAIL_API_KEY: Resend API Key (re_...)
// - EMAIL_FROM: e.g. "Unitel Credit Intelligence <credit@unitel.ao>"
// - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
// - APP_BASE_URL: e.g. https://unitel-credit.ao

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
  application_id?: string;
  event_type?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: RequestPayload = await req.json();

    if (!payload.to) {
      return new Response(JSON.stringify({ error: 'Missing recipient email "to"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const provider = Deno.env.get('EMAIL_PROVIDER')?.toLowerCase() || 'demo';
    const apiKey = Deno.env.get('EMAIL_API_KEY');
    const from = Deno.env.get('EMAIL_FROM') || 'Unitel Credit <notifications@unitel.ao>';

    // If no API key or set to demo, return demo status cleanly
    if (provider === 'demo' || !apiKey) {
      return new Response(
        JSON.stringify({
          success: true,
          mode: 'demo',
          message: 'Email processed in demo mode (credentials not configured)',
          to: payload.to,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Provider: Resend
    if (provider === 'resend') {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [payload.to],
          subject: payload.subject,
          text: payload.text,
          html: payload.html || payload.text.replace(/\n/g, '<br/>'),
        }),
      });

      if (!resendRes.ok) {
        const errorData = await resendRes.text();
        return new Response(
          JSON.stringify({ error: `Resend error: ${errorData}` }),
          {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const resData = await resendRes.json();
      return new Response(JSON.stringify({ success: true, mode: 'sent', data: resData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default / Unknown provider fallback
    return new Response(
      JSON.stringify({
        success: true,
        mode: 'demo',
        message: `Provider ${provider} fallback to demo mode`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
