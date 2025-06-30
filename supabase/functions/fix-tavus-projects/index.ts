const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Logging utility
function log(step: string, message: string, data?: any) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] 🔧 FIX_TAVUS - ${step}: ${message}`)
  if (data) {
    console.log(`[${timestamp}] 📊 Data:`, JSON.stringify(data, null, 2))
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    log('INIT', '🚀 Starting Tavus projects fix')

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

    // Get all processing projects
    log('DATABASE', '🔍 Finding processing projects')
    const { data: projects, error: projectsError } = await supabaseClient
      .from('projects')
      .select('*')
      .eq('status', 'processing')

    if (projectsError) {
      log('ERROR', '❌ Failed to fetch projects', projectsError)
      throw projectsError
    }

    if (!projects || projects.length === 0) {
      log('INFO', '📝 No processing projects found')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No processing projects found',
          updated: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    log('PROJECTS', `📋 Found ${projects.length} processing projects`)

    // Known Tavus video IDs from your screenshots
    const knownTavusVideos = [
      '78e70f85d4', // User Authentication System
      'b1ad928a3a'  // Chat-App---React
    ]

    let updatedCount = 0
    const results = []

    // Check each known Tavus video
    for (const videoId of knownTavusVideos) {
      try {
        log('TAVUS', `🎬 Checking Tavus video: ${videoId}`)
        
        const response = await fetch(`https://tavusapi.com/v2/videos/${videoId}`, {
          headers: {
            'x-api-key': tavusApiKey,
          },
        })

        if (!response.ok) {
          log('WARNING', `⚠️ Failed to fetch video ${videoId}`, { 
            status: response.status 
          })
          continue
        }

        const videoData = await response.json()
        log('TAVUS', `📊 Video ${videoId} status`, {
          status: videoData.status,
          hasDownloadUrl: !!videoData.download_url
        })

        if (videoData.status === 'completed' && videoData.download_url) {
          // Try to match this video to a project
          let matchedProject = null
          
          if (videoId === '78e70f85d4') {
            // User Authentication System
            matchedProject = projects.find(p => 
              p.title.toLowerCase().includes('authentication') || 
              p.title.toLowerCase().includes('user')
            )
          } else if (videoId === 'b1ad928a3a') {
            // Chat-App---React
            matchedProject = projects.find(p => 
              p.title.toLowerCase().includes('chat') || 
              p.title.toLowerCase().includes('react')
            )
          }

          if (matchedProject) {
            log('MATCH', `🎯 Matched video ${videoId} to project: ${matchedProject.title}`)
            
            // Update project with Tavus video ID and completed status
            const { error: updateError } = await supabaseClient
              .from('projects')
              .update({
                tavus_video_id: videoId,
                video_url: videoData.download_url,
                status: 'completed',
                updated_at: new Date().toISOString()
              })
              .eq('id', matchedProject.id)

            if (updateError) {
              log('ERROR', `❌ Failed to update project ${matchedProject.id}`, updateError)
              results.push({
                videoId,
                projectId: matchedProject.id,
                title: matchedProject.title,
                status: 'update_error',
                error: updateError.message
              })
            } else {
              log('SUCCESS', `✅ Successfully updated project: ${matchedProject.title}`)
              updatedCount++
              results.push({
                videoId,
                projectId: matchedProject.id,
                title: matchedProject.title,
                status: 'completed',
                videoUrl: videoData.download_url
              })

              // Create analytics entry
              const { error: analyticsError } = await supabaseClient
                .from('analytics')
                .upsert([{
                  project_id: matchedProject.id,
                  views: 0,
                  shares: 0,
                  completion_rate: 0
                }], {
                  onConflict: 'project_id',
                  ignoreDuplicates: true
                })

              if (analyticsError) {
                log('WARNING', `⚠️ Failed to create analytics for project ${matchedProject.id}`, analyticsError)
              }
            }
          } else {
            log('WARNING', `⚠️ Could not match video ${videoId} to any project`)
            results.push({
              videoId,
              status: 'no_match',
              message: 'Could not match to any project'
            })
          }
        } else {
          log('INFO', `📝 Video ${videoId} not ready`, { status: videoData.status })
          results.push({
            videoId,
            status: videoData.status || 'not_ready',
            message: 'Video not completed yet'
          })
        }

      } catch (error) {
        log('ERROR', `💥 Error processing video ${videoId}`, error)
        results.push({
          videoId,
          status: 'error',
          error: error.message
        })
      }
    }

    log('SUCCESS', `🎉 Fix completed! Updated ${updatedCount} projects`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Fix completed! Updated ${updatedCount} projects with Tavus videos`,
        updated: updatedCount,
        results: results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    log('ERROR', '💥 Fatal error during Tavus fix', {
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