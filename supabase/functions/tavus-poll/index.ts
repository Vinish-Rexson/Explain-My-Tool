const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

// Logging utility
function log(step: string, message: string, data?: any) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] 🎬 TAVUS_POLL - ${step}: ${message}`)
  if (data) {
    console.log(`[${timestamp}] 📊 Data:`, JSON.stringify(data, null, 2))
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    log('INIT', '🚀 Starting Tavus video polling/sync')
    
    let projectId = null
    
    if (req.method === 'GET') {
      // GET request - check specific project
      const url = new URL(req.url)
      projectId = url.searchParams.get('projectId')
      
      if (!projectId) {
        throw new Error('Project ID is required for GET requests')
      }
      
      log('REQUEST', 'GET request for specific project', { projectId })
    } else if (req.method === 'POST') {
      // POST request - can be for specific project or all projects
      try {
        const body = await req.json()
        projectId = body?.projectId
        log('REQUEST', 'POST request', { projectId: projectId || 'all projects' })
      } catch {
        log('REQUEST', 'POST request with no body - checking all projects')
      }
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get Tavus API key
    const tavusApiKey = Deno.env.get('TAVUS_API_KEY')
    if (!tavusApiKey) {
      log('ERROR', '❌ Tavus API key not configured')
      throw new Error('Tavus API key not configured')
    }

    // Build query for projects with tavus_video_id
    log('DATABASE', '🔍 Finding projects with Tavus videos')
    let query = supabaseClient
      .from('projects')
      .select('id, tavus_video_id, status, title, video_url')
      .not('tavus_video_id', 'is', null)

    // If specific project ID provided, filter to that project
    if (projectId) {
      query = query.eq('id', projectId)
      log('DATABASE', '🎯 Targeting specific project', { projectId })
    } else {
      // For bulk sync, only check non-completed projects
      query = query.neq('status', 'completed')
    }

    const { data: projects, error: projectsError } = await query

    if (projectsError) {
      log('ERROR', '❌ Failed to fetch projects', projectsError)
      throw projectsError
    }

    if (!projects || projects.length === 0) {
      log('INFO', '📝 No projects with Tavus videos found')
      return new Response(
        JSON.stringify({
          success: true,
          message: projectId 
            ? 'Project not found or no Tavus video ID'
            : 'No projects with Tavus videos found',
          updated: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    log('SYNC', `📹 Found ${projects.length} project(s) with Tavus videos to check`)

    let updatedCount = 0
    const results = []

    // Check each project's Tavus video status
    for (const project of projects) {
      try {
        log('TAVUS', `🎬 Checking Tavus video: ${project.tavus_video_id} for project: ${project.title}`)
        
        const response = await fetch(`https://tavusapi.com/v2/videos/${project.tavus_video_id}`, {
          headers: {
            'x-api-key': tavusApiKey,
          },
        })

        if (!response.ok) {
          log('WARNING', `⚠️ Failed to fetch video ${project.tavus_video_id}`, { 
            status: response.status 
          })
          results.push({
            projectId: project.id,
            title: project.title,
            tavusVideoId: project.tavus_video_id,
            status: 'api_error',
            error: `HTTP ${response.status}`
          })
          continue
        }

        const videoData = await response.json()
        log('TAVUS', `📊 Video status for ${project.tavus_video_id}`, {
          status: videoData.status,
          hasDownloadUrl: !!videoData.download_url,
          projectTitle: project.title
        })

        if (videoData.status === 'completed' && videoData.download_url) {
          // Only update if not already completed with this URL
          if (project.status !== 'completed' || project.video_url !== videoData.download_url) {
            log('DATABASE', `💾 Updating project ${project.id} (${project.title}) with completed video`)
            
            const { error: updateError } = await supabaseClient
              .from('projects')
              .update({
                video_url: videoData.download_url,
                status: 'completed',
                updated_at: new Date().toISOString()
              })
              .eq('id', project.id)

            if (updateError) {
              log('ERROR', `❌ Failed to update project ${project.id}`, updateError)
              results.push({
                projectId: project.id,
                title: project.title,
                tavusVideoId: project.tavus_video_id,
                status: 'update_error',
                error: updateError.message
              })
            } else {
              log('SUCCESS', `✅ Successfully updated project ${project.id} (${project.title})`)
              updatedCount++
              results.push({
                projectId: project.id,
                title: project.title,
                tavusVideoId: project.tavus_video_id,
                status: 'completed',
                videoUrl: videoData.download_url
              })

              // Create analytics entry if it doesn't exist
              const { error: analyticsError } = await supabaseClient
                .from('analytics')
                .upsert([{
                  project_id: project.id,
                  views: 0,
                  shares: 0,
                  completion_rate: 0
                }], {
                  onConflict: 'project_id',
                  ignoreDuplicates: true
                })

              if (analyticsError) {
                log('WARNING', `⚠️ Failed to create analytics for project ${project.id}`, analyticsError)
              }
            }
          } else {
            log('INFO', `📝 Project ${project.id} already completed with this video`)
            results.push({
              projectId: project.id,
              title: project.title,
              tavusVideoId: project.tavus_video_id,
              status: 'already_completed',
              videoUrl: project.video_url
            })
          }
        } else if (videoData.status === 'failed') {
          log('WARNING', `⚠️ Tavus video ${project.tavus_video_id} failed`)
          
          if (project.status !== 'failed') {
            const { error: updateError } = await supabaseClient
              .from('projects')
              .update({
                status: 'failed',
                updated_at: new Date().toISOString()
              })
              .eq('id', project.id)

            if (!updateError) {
              updatedCount++
            }
          }

          results.push({
            projectId: project.id,
            title: project.title,
            tavusVideoId: project.tavus_video_id,
            status: 'failed',
            error: 'Tavus video generation failed'
          })
        } else {
          log('INFO', `📝 Video ${project.tavus_video_id} still processing`, {
            status: videoData.status,
            projectTitle: project.title
          })
          results.push({
            projectId: project.id,
            title: project.title,
            tavusVideoId: project.tavus_video_id,
            status: videoData.status || 'processing',
            message: 'Still processing on Tavus'
          })
        }

      } catch (error) {
        log('ERROR', `💥 Error processing project ${project.id}`, error)
        results.push({
          projectId: project.id,
          title: project.title,
          tavusVideoId: project.tavus_video_id,
          status: 'error',
          error: error.message
        })
      }
    }

    log('SUCCESS', `🎉 Sync completed! Updated ${updatedCount} out of ${projects.length} projects`)

    // For single project requests, return specific status
    if (projectId && results.length === 1) {
      const result = results[0]
      return new Response(
        JSON.stringify({
          success: true,
          status: result.status === 'completed' ? 'completed' : 'processing',
          videoUrl: result.videoUrl || null,
          tavusStatus: result.status,
          message: result.status === 'completed' 
            ? 'Video generation completed!' 
            : result.message || `Video status: ${result.status}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // For bulk requests, return summary
    return new Response(
      JSON.stringify({
        success: true,
        message: `Sync completed! Updated ${updatedCount} out of ${projects.length} projects`,
        updated: updatedCount,
        total: projects.length,
        results: results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    log('ERROR', '💥 Fatal error during Tavus sync', {
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