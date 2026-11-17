// Supabase Edge Function: fetch-customer-data
// Inputs: { phone: string, nationalId?: string }
// Looks up all 5 data sources (telecom, wallet, bank, assets, utility)
// Returns merged records with source tags and derived yes/no segment answers.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone, nationalId } = await req.json();
    if (!phone && !nationalId) {
      return new Response(JSON.stringify({ error: 'phone or nationalId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');

    // Query data source tables in parallel
    const [telRes, walRes, bnkRes, astRes, utlRes, rechRes] = await Promise.all([
      supabase.from('ds_telecom').select('*').or(`customer_phone.ilike.%${cleanPhone.slice(-9)}%`).maybeSingle(),
      supabase.from('ds_wallet').select('*').or(`customer_phone.ilike.%${cleanPhone.slice(-9)}%`).maybeSingle(),
      supabase.from('ds_bank').select('*').or(`customer_phone.ilike.%${cleanPhone.slice(-9)}%`).maybeSingle(),
      supabase.from('ds_assets').select('*').or(`customer_phone.ilike.%${cleanPhone.slice(-9)}%`).maybeSingle(),
      supabase.from('ds_utility').select('*').or(`customer_phone.ilike.%${cleanPhone.slice(-9)}%`).maybeSingle(),
      supabase.from('src_telecom_recharges').select('*').or(`customer_ref.ilike.%${cleanPhone.slice(-9)}%`).order('month', { ascending: true }),
    ]);

    const telecom = telRes.data || null;
    const wallet = walRes.data || null;
    const bank = bnkRes.data || null;
    const assets = astRes.data || null;
    const utility = utlRes.data || null;
    const recharges = rechRes.data || [];

    // Calculate last 3-month recharge parameters if records exist
    let rechargesPerMonth = undefined;
    let rechargeValuePerMonthKz = undefined;
    let rechargeValuePerQuarterKz = undefined;
    if (recharges.length > 0) {
      const last3 = recharges.slice(-3);
      const totalCount = last3.reduce((sum: number, r: any) => sum + (r.recharge_count || 0), 0);
      const totalValue = last3.reduce((sum: number, r: any) => sum + (r.recharge_value_kz || 0), 0);
      rechargesPerMonth = Math.round((totalCount / 3) * 10) / 10;
      rechargeValuePerMonthKz = Math.round(totalValue / 3);
      rechargeValuePerQuarterKz = totalValue;
    }

    // Derived Segment Decision Answers (First YES wins)
    const isSalary = Boolean(bank?.salary_detected);
    const isTrader = Boolean(wallet?.merchant_payments_monthly && wallet.merchant_payments_monthly > 0);
    const hasBank = Boolean(bank?.has_bank_account);
    const hasWallet = Boolean(wallet?.has_wallet);

    let derivedSegment = 'S1';
    if (isSalary) derivedSegment = 'S7';
    else if (isTrader) derivedSegment = 'S8';
    else if (hasBank) derivedSegment = 'S5';
    else if (hasWallet) derivedSegment = 'S3';

    // Summary of source status
    const sourceStatus = {
      telecom: telecom || recharges.length > 0 ? 'found' : 'no_record',
      wallet: wallet ? 'found' : 'no_record',
      bank: bank ? 'found' : 'no_record',
      assets: assets ? 'found' : 'no_record',
      utility: utility ? 'found' : 'no_record',
      recharges: recharges.length > 0 ? 'found' : 'no_record',
    };

    return new Response(
      JSON.stringify({
        success: true,
        phone,
        sourceStatus,
        derivedAnswers: {
          isSalary,
          isTrader,
          hasBank,
          hasWallet,
          derivedSegment,
        },
        records: {
          telecom: telecom
            ? {
                ...telecom,
                _source: 'From Unitel',
                recharges_per_month: rechargesPerMonth,
                recharge_value_per_month_kz: rechargeValuePerMonthKz,
                recharge_value_per_quarter_kz: rechargeValuePerQuarterKz,
              }
            : null,
          recharges: recharges.length > 0
            ? {
                history: recharges,
                recharges_per_month: rechargesPerMonth,
                recharge_value_per_month_kz: rechargeValuePerMonthKz,
                recharge_value_per_quarter_kz: rechargeValuePerQuarterKz,
                _source: 'From Unitel',
              }
            : null,
          wallet: wallet ? { ...wallet, _source: 'Unitel Money' } : null,
          bank: bank ? { ...bank, _source: 'Bank gateway (demo)' } : null,
          assets: assets ? { ...assets, _source: 'Vehicle & Property registry (demo)' } : null,
          utility: utility ? { ...utility, _source: 'Utilities (demo)' } : null,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
