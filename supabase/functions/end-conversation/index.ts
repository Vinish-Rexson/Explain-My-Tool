const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EndConversationRequest {
  sessionId: string
}

// Logging utility
function log(step: string, message: string, data?: any) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] 🔚 END_CONVERSATION - ${step}: ${message}`)
  if (data) {
    console.log(`[${timestamp}] 📊 Data:`, JSON.stringify(data, null, 2))
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    log('INIT', '🚀 Ending conversation session')
    
    const requestData: EndConversationRequest = await req.json()
    const { sessionId } = requestData
    
    log('REQUEST', 'Received end conversation request', { sessionId })

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get session data
    const { data: session, error: fetchError } = await supabaseClient
      .from('conversation_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (fetchError) {
      log('ERROR', '❌ Failed to fetch session', fetchError)
      throw fetchError
    }

    // End Tavus conversation if it exists
    if (session.tavus_session_id) {
      const tavusApiKey = Deno.env.get('TAVUS_API_KEY')
      
      if (tavusApiKey) {
        log('TAVUS', '🎬 Ending Tavus conversation')
        
        try {
          const response = await fetch(`https://tavusapi.com/v2/conversations/${session.tavus_session_id}/end`, {
            method: 'POST',
            headers: {
              'x-api-key': tavusApiKey,
              'Content-Type': 'application/json',
            },
          })

          if (response.ok) {
            log('TAVUS', '✅ Tavus conversation ended successfully')
          } else {
            log('WARNING', '⚠️ Failed to end Tavus conversation (non-critical)', {
              status: response.status
            })
          }
        } catch (tavusError) {
          log('WARNING', '⚠️ Error ending Tavus conversation (non-critical)', tavusError)
        }
      }
    }

    // Update session status
    log('DATABASE', '💾 Updating session status to ended')
    const { error: updateError } = await supabaseClient
      .from('conversation_sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    if (updateError) {
      log('ERROR', '❌ Failed to update session status', updateError)
      throw updateError
    }

    log('SUCCESS', '🎉 Conversation ended successfully')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Conversation ended successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    log('ERROR', '💥 Fatal error ending conversation', {
      error: error.message,
      stack: error.stack
    })

    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check the function logs for detailed error information'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

// Import createClient function
import { createClient } from 'npm:@supabase/supabase-js@2'