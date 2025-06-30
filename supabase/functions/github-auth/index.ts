const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GitHubAuthRequest {
  code: string
  state?: string
}

// Logging utility
function log(step: string, message: string, data?: any) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] 🐙 GITHUB_AUTH - ${step}: ${message}`)
  if (data) {
    console.log(`[${timestamp}] 📊 Data:`, JSON.stringify(data, null, 2))
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    log('INIT', '🚀 Starting GitHub OAuth flow')
    
    const requestData: GitHubAuthRequest = await req.json()
    const { code } = requestData
    
    log('REQUEST', 'Received GitHub auth code', { codeLength: code.length })

    // Get GitHub OAuth credentials from environment
    const clientId = Deno.env.get('GITHUB_CLIENT_ID')
    const clientSecret = Deno.env.get('GITHUB_CLIENT_SECRET')
    
    if (!clientId || !clientSecret) {
      log('ERROR', '❌ GitHub OAuth credentials not configured')
      throw new Error('GitHub OAuth not configured. Please add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to your environment variables.')
    }

    // Exchange code for access token
    log('GITHUB', '🔄 Exchanging code for access token')
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
      }),
    })

    if (!tokenResponse.ok) {
      log('ERROR', '❌ Failed to exchange code for token', { status: tokenResponse.status })
      throw new Error('Failed to exchange code for access token')
    }

    const tokenData = await tokenResponse.json()
    
    if (tokenData.error) {
      log('ERROR', '❌ GitHub OAuth error', tokenData)
      throw new Error(`GitHub OAuth error: ${tokenData.error_description || tokenData.error}`)
    }

    const accessToken = tokenData.access_token
    log('GITHUB', '✅ Access token obtained successfully')

    // Get user info from GitHub
    log('GITHUB', '👤 Fetching GitHub user info')
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'ExplainMyTool-App',
      },
    })

    if (!userResponse.ok) {
      log('ERROR', '❌ Failed to fetch GitHub user info', { status: userResponse.status })
      throw new Error('Failed to fetch GitHub user info')
    }

    const userData = await userResponse.json()
    log('GITHUB', '✅ GitHub user info fetched', { 
      username: userData.login,
      id: userData.id 
    })

    // Get the current user from Supabase
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      log('ERROR', '❌ No authorization header')
      throw new Error('Authorization required')
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from JWT token
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt)
    
    if (userError || !user) {
      log('ERROR', '❌ Failed to get user from token', userError)
      throw new Error('Invalid authentication token')
    }

    // Update user profile with GitHub info
    log('DATABASE', '💾 Updating user profile with GitHub info')
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        github_username: userData.login,
        github_access_token: accessToken,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      log('ERROR', '❌ Failed to update profile', updateError)
      throw new Error(`Failed to update profile: ${updateError.message}`)
    }

    log('SUCCESS', '🎉 GitHub authentication completed successfully!')

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          github_username: userData.login,
          github_id: userData.id,
          avatar_url: userData.avatar_url,
        },
        message: 'GitHub account connected successfully!'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    log('ERROR', '💥 Fatal error during GitHub authentication', {
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