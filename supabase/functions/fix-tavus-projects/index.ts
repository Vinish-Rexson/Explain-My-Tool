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
    log('INIT', '🚀 Starting enhanced Tavus projects fix')

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

    // Get all processing projects with their IDs
    log('DATABASE', '🔍 Finding all processing projects')
    const { data: projects, error: projectsError } = await supabaseClient
      .from('projects')
      .select('*')
      .eq('status', 'processing')
      .order('created_at', { ascending: false })

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
          updated: 0,
          projects: []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    log('PROJECTS', `📋 Found ${projects.length} processing projects:`)
    projects.forEach((project, index) => {
      log('PROJECT', `${index + 1}. ID: ${project.id}, Title: "${project.title}", Created: ${project.created_at}`)
    })

    // Known Tavus video mappings based on your information
    const tavusVideoMappings = [
      {
        videoId: '78e70f85d4',
        expectedTitle: 'User Authentication System',
        keywords: ['authentication', 'user', 'auth', 'jwt', 'login', 'system']
      },
      {
        videoId: 'b1ad928a3a', 
        expectedTitle: 'Chat-App---React',
        keywords: ['chat', 'react', 'app', 'markdown']
      }
    ]

    let updatedCount = 0
    const results = []

    // First, check each Tavus video to see if it's completed
    for (const mapping of tavusVideoMappings) {
      try {
        log('TAVUS', `🎬 Checking Tavus video: ${mapping.videoId} (expected: ${mapping.expectedTitle})`)
        
        const response = await fetch(`https://tavusapi.com/v2/videos/${mapping.videoId}`, {
          headers: {
            'x-api-key': tavusApiKey,
          },
        })

        if (!response.ok) {
          log('WARNING', `⚠️ Failed to fetch video ${mapping.videoId}`, { 
            status: response.status 
          })
          results.push({
            videoId: mapping.videoId,
            expectedTitle: mapping.expectedTitle,
            status: 'api_error',
            error: `HTTP ${response.status}`
          })
          continue
        }

        const videoData = await response.json()
        log('TAVUS', `📊 Full video data for ${mapping.videoId}:`, videoData)

        // Check if video is ready (either "completed" or "ready" status with download_url)
        const isVideoReady = (
          (videoData.status === 'completed' || videoData.status === 'ready') && 
          videoData.download_url
        )

        log('TAVUS', `📊 Video ${mapping.videoId} analysis`, {
          status: videoData.status,
          hasDownloadUrl: !!videoData.download_url,
          isVideoReady: isVideoReady,
          downloadUrl: videoData.download_url,
          expectedTitle: mapping.expectedTitle
        })

        if (isVideoReady) {
          // Try multiple matching strategies
          let matchedProject = null
          let matchStrategy = 'none'
          
          // Strategy 1: Exact title match (case insensitive)
          matchedProject = projects.find(p => 
            p.title.toLowerCase() === mapping.expectedTitle.toLowerCase()
          )
          if (matchedProject) matchStrategy = 'exact_title'
          
          // Strategy 2: Keyword matching
          if (!matchedProject) {
            matchedProject = projects.find(p => {
              const titleLower = p.title.toLowerCase()
              return mapping.keywords.some(keyword => titleLower.includes(keyword))
            })
            if (matchedProject) matchStrategy = 'keyword'
          }
          
          // Strategy 3: Partial title matching
          if (!matchedProject) {
            matchedProject = projects.find(p => {
              const titleLower = p.title.toLowerCase()
              const expectedLower = mapping.expectedTitle.toLowerCase()
              return titleLower.includes(expectedLower.split(' ')[0]) || 
                     expectedLower.includes(titleLower.split(' ')[0])
            })
            if (matchedProject) matchStrategy = 'partial_title'
          }
          
          // Strategy 4: If we have exactly 2 projects and 2 videos, match by order
          if (!matchedProject && projects.length === 2 && tavusVideoMappings.length === 2) {
            const projectIndex = tavusVideoMappings.indexOf(mapping)
            matchedProject = projects[projectIndex]
            matchStrategy = 'order_fallback'
            log('FALLBACK', `🎯 Using fallback matching by order: project ${projectIndex + 1}`)
          }

          if (matchedProject) {
            log('MATCH', `🎯 Matched video ${mapping.videoId} to project: "${matchedProject.title}" (ID: ${matchedProject.id}) using ${matchStrategy} strategy`)
            
            // Update project with Tavus video ID and completed status
            const updateData = {
              tavus_video_id: mapping.videoId,
              video_url: videoData.download_url,
              status: 'completed',
              updated_at: new Date().toISOString()
            }

            log('UPDATE', `💾 Updating project ${matchedProject.id} with data:`, updateData)

            const { error: updateError } = await supabaseClient
              .from('projects')
              .update(updateData)
              .eq('id', matchedProject.id)

            if (updateError) {
              log('ERROR', `❌ Failed to update project ${matchedProject.id}`, updateError)
              results.push({
                videoId: mapping.videoId,
                projectId: matchedProject.id,
                title: matchedProject.title,
                expectedTitle: mapping.expectedTitle,
                status: 'update_error',
                error: updateError.message,
                matchStrategy: matchStrategy
              })
            } else {
              log('SUCCESS', `✅ Successfully updated project: "${matchedProject.title}" with video ${mapping.videoId}`)
              updatedCount++
              results.push({
                videoId: mapping.videoId,
                projectId: matchedProject.id,
                title: matchedProject.title,
                expectedTitle: mapping.expectedTitle,
                status: 'completed',
                videoUrl: videoData.download_url,
                matchStrategy: matchStrategy,
                tavusStatus: videoData.status
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
              } else {
                log('ANALYTICS', `📊 Created analytics entry for project ${matchedProject.id}`)
              }
            }
          } else {
            log('WARNING', `⚠️ Could not match video ${mapping.videoId} (${mapping.expectedTitle}) to any project`)
            log('AVAILABLE', 'Available projects:', projects.map(p => ({ id: p.id, title: p.title })))
            results.push({
              videoId: mapping.videoId,
              expectedTitle: mapping.expectedTitle,
              status: 'no_match',
              message: 'Could not match to any project',
              availableProjects: projects.map(p => ({ id: p.id, title: p.title })),
              tavusStatus: videoData.status,
              hasDownloadUrl: !!videoData.download_url
            })
          }
        } else {
          log('INFO', `📝 Video ${mapping.videoId} not ready`, { 
            status: videoData.status,
            hasDownloadUrl: !!videoData.download_url,
            expectedTitle: mapping.expectedTitle 
          })
          results.push({
            videoId: mapping.videoId,
            expectedTitle: mapping.expectedTitle,
            status: videoData.status || 'not_ready',
            message: `Video status: ${videoData.status}, has download URL: ${!!videoData.download_url}`,
            tavusStatus: videoData.status,
            hasDownloadUrl: !!videoData.download_url
          })
        }

      } catch (error) {
        log('ERROR', `💥 Error processing video ${mapping.videoId}`, error)
        results.push({
          videoId: mapping.videoId,
          expectedTitle: mapping.expectedTitle,
          status: 'error',
          error: error.message
        })
      }
    }

    log('SUCCESS', `🎉 Fix completed! Updated ${updatedCount} out of ${projects.length} projects`)

    // Provide detailed summary
    const summary = {
      totalProjects: projects.length,
      totalVideos: tavusVideoMappings.length,
      updated: updatedCount,
      completed: results.filter(r => r.status === 'completed').length,
      failed: results.filter(r => r.status === 'error' || r.status === 'api_error').length,
      noMatch: results.filter(r => r.status === 'no_match').length,
      notReady: results.filter(r => r.status === 'not_ready' || r.status === 'ready').length
    }

    log('SUMMARY', '📊 Final summary:', summary)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Fix completed! Updated ${updatedCount} projects with Tavus videos`,
        updated: updatedCount,
        summary: summary,
        projects: projects.map(p => ({ id: p.id, title: p.title, status: p.status })),
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