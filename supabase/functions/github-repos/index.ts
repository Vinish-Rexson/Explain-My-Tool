const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GitHubReposRequest {
  sync?: boolean
  page?: number
  per_page?: number
}

// Logging utility
function log(step: string, message: string, data?: any) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] 📚 GITHUB_REPOS - ${step}: ${message}`)
  if (data) {
    console.log(`[${timestamp}] 📊 Data:`, JSON.stringify(data, null, 2))
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    log('INIT', '🚀 Starting GitHub repositories fetch')
    
    const url = new URL(req.url)
    const sync = url.searchParams.get('sync') === 'true'
    const page = parseInt(url.searchParams.get('page') || '1')
    const per_page = parseInt(url.searchParams.get('per_page') || '30')
    
    log('REQUEST', 'Repository fetch parameters', { sync, page, per_page })

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

    // Get user profile with GitHub token
    log('DATABASE', '🔍 Fetching user profile')
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('github_username, github_access_token')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      log('ERROR', '❌ Failed to fetch user profile', profileError)
      throw new Error('User profile not found')
    }

    if (!profile.github_access_token) {
      log('ERROR', '❌ GitHub not connected')
      throw new Error('GitHub account not connected. Please connect your GitHub account first.')
    }

    if (sync) {
      // Fetch repositories from GitHub and sync to database
      log('GITHUB', '🔄 Syncing repositories from GitHub')
      await syncRepositoriesFromGitHub(supabaseClient, user.id, profile.github_access_token, page, per_page)
    }

    // Fetch repositories from database
    log('DATABASE', '📚 Fetching repositories from database')
    const { data: repositories, error: reposError } = await supabaseClient
      .from('repositories')
      .select('*')
      .eq('user_id', user.id)
      .order('stargazers_count', { ascending: false })
      .order('updated_at', { ascending: false })

    if (reposError) {
      log('ERROR', '❌ Failed to fetch repositories', reposError)
      throw new Error(`Failed to fetch repositories: ${reposError.message}`)
    }

    log('SUCCESS', '✅ Repositories fetched successfully', { 
      count: repositories?.length || 0 
    })

    return new Response(
      JSON.stringify({
        success: true,
        repositories: repositories || [],
        total: repositories?.length || 0,
        synced: sync
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    log('ERROR', '💥 Fatal error fetching repositories', {
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

async function syncRepositoriesFromGitHub(
  supabaseClient: any, 
  userId: string, 
  accessToken: string, 
  page: number = 1, 
  per_page: number = 30
) {
  log('SYNC', '🔄 Starting GitHub repositories sync')
  
  // Fetch repositories from GitHub
  const response = await fetch(`https://api.github.com/user/repos?page=${page}&per_page=${per_page}&sort=updated&affiliation=owner,collaborator`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'ExplainMyTool-App',
    },
  })

  if (!response.ok) {
    log('ERROR', '❌ Failed to fetch repositories from GitHub', { status: response.status })
    throw new Error(`Failed to fetch repositories from GitHub: ${response.status}`)
  }

  const githubRepos = await response.json()
  log('SYNC', `📥 Fetched ${githubRepos.length} repositories from GitHub`)

  // Prepare repository data for database
  const repoData = githubRepos.map((repo: any) => ({
    user_id: userId,
    github_id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    description: repo.description,
    html_url: repo.html_url,
    clone_url: repo.clone_url,
    language: repo.language,
    stargazers_count: repo.stargazers_count || 0,
    forks_count: repo.forks_count || 0,
    is_private: repo.private || false,
    synced_at: new Date().toISOString()
  }))

  // Upsert repositories to database
  log('SYNC', '💾 Upserting repositories to database')
  const { error: upsertError } = await supabaseClient
    .from('repositories')
    .upsert(repoData, {
      onConflict: 'user_id,github_id',
      ignoreDuplicates: false
    })

  if (upsertError) {
    log('ERROR', '❌ Failed to upsert repositories', upsertError)
    throw new Error(`Failed to sync repositories: ${upsertError.message}`)
  }

  log('SYNC', '✅ Repositories synced successfully')
}

// Import createClient function
import { createClient } from 'npm:@supabase/supabase-js@2'