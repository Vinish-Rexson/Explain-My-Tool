const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateConversationRequest {
  sessionId: string
  codeSnippet: string
  title: string
  projectId: string
}

// Logging utility
function log(step: string, message: string, data?: any) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] 🗣️ CONVERSATION - ${step}: ${message}`)
  if (data) {
    console.log(`[${timestamp}] 📊 Data:`, JSON.stringify(data, null, 2))
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    log('INIT', '🚀 Starting conversation initialization')
    
    const requestData: CreateConversationRequest = await req.json()
    const { sessionId, codeSnippet, title, projectId } = requestData
    
    log('REQUEST', 'Received conversation creation request', {
      sessionId,
      title,
      projectId,
      codeLength: codeSnippet.length
    })

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if Tavus is configured
    const tavusApiKey = Deno.env.get('TAVUS_API_KEY')
    const tavusReplicaId = Deno.env.get('TAVUS_REPLICA_ID')
    
    if (!tavusApiKey || !tavusReplicaId) {
      log('WARNING', '⚠️ Tavus not configured, creating text-only conversation')
      
      // Update session status
      await supabaseClient
        .from('conversation_sessions')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      return new Response(
        JSON.stringify({
          success: true,
          conversationType: 'text-only',
          message: 'Text conversation ready'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // Create Tavus conversation
    log('TAVUS', '🎬 Creating Tavus conversation session')
    
    const response = await fetch('https://tavusapi.com/v2/conversations', {
      method: 'POST',
      headers: {
        'x-api-key': tavusApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        replica_id: tavusReplicaId,
        conversation_name: `Code Discussion: ${title}`,
        callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/conversation-webhook`,
        properties: {
          max_call_duration: 1800, // 30 minutes
          participant_left_timeout: 120, // 2 minutes
          participant_absent_timeout: 300, // 5 minutes
          enable_recording: false
        }
      }),
    })

    log('TAVUS', '📡 Received Tavus response', { 
      status: response.status,
      statusText: response.statusText 
    })

    if (!response.ok) {
      const errorText = await response.text()
      log('ERROR', '❌ Tavus API error', { 
        status: response.status,
        error: errorText 
      })
      throw new Error(`Tavus API error: ${response.status} - ${errorText}`)
    }

    const tavusData = await response.json()
    log('TAVUS', '✅ Tavus conversation created successfully', {
      conversationId: tavusData.conversation_id,
      conversationUrl: tavusData.conversation_url
    })

    // Update session with Tavus data
    log('DATABASE', '💾 Updating session with Tavus data')
    const { error: updateError } = await supabaseClient
      .from('conversation_sessions')
      .update({
        tavus_session_id: tavusData.conversation_id,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    if (updateError) {
      log('ERROR', '❌ Failed to update session', updateError)
      throw updateError
    }

    log('SUCCESS', '🎉 Conversation initialization completed successfully!')

    return new Response(
      JSON.stringify({
        success: true,
        tavusSessionId: tavusData.conversation_id,
        conversationUrl: tavusData.conversation_url,
        conversationType: 'video',
        message: 'Video conversation ready'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    log('ERROR', '💥 Fatal error during conversation initialization', {
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