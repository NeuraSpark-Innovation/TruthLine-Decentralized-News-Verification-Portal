import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('TRUTHLINE_SUPABASE_UR') ?? '',
      Deno.env.get('TRUTHLINE_SERVICE_ROLE_KEY') ?? ''
    );

    const { reportId, finalVerdict } = await req.json();

    // Get all verifications for this report
    const { data: verifications, error: verError } = await supabase
      .from('verifications')
      .select('verified_by, verdict')
      .eq('news_id', reportId);

    if (verError) throw verError;

    // Update trust scores
    for (const verification of verifications || []) {
      const isCorrect = verification.verdict === finalVerdict;
      const scoreChange = isCorrect ? 2 : -1;

      // Update user's trust score
      const { data: profile } = await supabase
        .from('profiles')
        .select('trust_score, role')
        .eq('id', verification.verified_by)
        .single();

      if (profile) {
        const newScore = Math.max(0, profile.trust_score + scoreChange);
        const newRole = newScore >= 25 ? 'moderator' : 'user';

        await supabase
          .from('profiles')
          .update({ 
            trust_score: newScore,
            role: newRole 
          })
          .eq('id', verification.verified_by);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
