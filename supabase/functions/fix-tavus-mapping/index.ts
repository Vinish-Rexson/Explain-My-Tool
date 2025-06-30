const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Logging utility
function log(step: string, message: string, data?: any) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] 🔄 FIX_MAPPING - ${step}: ${message}`)
  if (data) {
    console.log(`[${timestamp}] 📊 Data:`, JSON.stringify(data, null, 2))
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    log('INIT', '🚀 Starting Tavus video ID mapping fix')

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the two completed projects
    log('DATABASE', '🔍 Finding completed projects with Tavus IDs')
    const { data: projects, error: projectsError } = await supabaseClient
      .from('projects')
      .select('*')
      .eq('status', 'completed')
      .not('tavus_video_id', 'is', null)
      .order('created_at', { ascending: false })

    if (projectsError) {
      log('ERROR', '❌ Failed to fetch projects', projectsError)
      throw projectsError
    }

    if (!projects || projects.length < 2) {
      log('INFO', '📝 Need at least 2 completed projects to fix mapping')
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Need at least 2 completed projects with Tavus IDs to fix mapping',
          found: projects?.length || 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    log('PROJECTS', `📋 Found ${projects.length} completed projects:`)
    projects.forEach((project, index) => {
      log('PROJECT', `${index + 1}. "${project.title}" - Tavus ID: ${project.tavus_video_id}`)
    })

    // Define the correct mapping
    const correctMapping = {
      'Chat-App---React': 'b1ad928a3a',
      'User Authentication System': '78e70f85d4'
    }

    let fixedCount = 0
    const results = []

    // Check and fix each project
    for (const project of projects) {
      const correctTavusId = correctMapping[project.title as keyof typeof correctMapping]
      
      if (!correctTavusId) {
        log('SKIP', `⏭️ No mapping defined for project: "${project.title}"`)
        results.push({
          projectId: project.id,
          title: project.title,
          currentTavusId: project.tavus_video_id,
          status: 'no_mapping',
          message: 'No correct mapping defined for this project'
        })
        continue
      }

      if (project.tavus_video_id === correctTavusId) {
        log('CORRECT', `✅ Project "${project.title}" already has correct Tavus ID: ${correctTavusId}`)
        results.push({
          projectId: project.id,
          title: project.title,
          currentTavusId: project.tavus_video_id,
          correctTavusId: correctTavusId,
          status: 'already_correct',
          message: 'Already has correct Tavus ID'
        })
        continue
      }

      log('FIX', `🔄 Fixing project "${project.title}": ${project.tavus_video_id} → ${correctTavusId}`)

      // Get the correct video URL from Tavus
      const tavusApiKey = Deno.env.get('TAVUS_API_KEY')
      if (!tavusApiKey) {
        throw new Error('Tavus API key not configured')
      }

      try {
        const response = await fetch(`https://tavusapi.com/v2/videos/${correctTavusId}`, {
          headers: {
            'x-api-key': tavusApiKey,
          },
        })

        if (!response.ok) {
          log('ERROR', `❌ Failed to fetch correct video ${correctTavusId}`, { status: response.status })
          results.push({
            projectId: project.id,
            title: project.title,
            currentTavusId: project.tavus_video_id,
            correctTavusId: correctTavusId,
            status: 'tavus_error',
            error: `Failed to fetch video from Tavus: HTTP ${response.status}`
          })
          continue
        }

        const videoData = await response.json()
        
        if (videoData.status !== 'completed' && videoData.status !== 'ready') {
          log('WARNING', `⚠️ Video ${correctTavusId} not ready`, { status: videoData.status })
          results.push({
            projectId: project.id,
            title: project.title,
            currentTavusId: project.tavus_video_id,
            correctTavusId: correctTavusId,
            status: 'video_not_ready',
            tavusStatus: videoData.status,
            message: 'Correct video not ready on Tavus'
          })
          continue
        }

        if (!videoData.download_url) {
          log('WARNING', `⚠️ Video ${correctTavusId} has no download URL`)
          results.push({
            projectId: project.id,
            title: project.title,
            currentTavusId: project.tavus_video_id,
            correctTavusId: correctTavusId,
            status: 'no_download_url',
            message: 'Video has no download URL'
          })
          continue
        }

        // Update the project with correct Tavus ID and video URL
        log('UPDATE', `💾 Updating project ${project.id} with correct mapping`)
        const { error: updateError } = await supabaseClient
          .from('projects')
          .update({
            tavus_video_id: correctTavusId,
            video_url: videoData.download_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', project.id)

        if (updateError) {
          log('ERROR', `❌ Failed to update project ${project.id}`, updateError)
          results.push({
            projectId: project.id,
            title: project.title,
            currentTavusId: project.tavus_video_id,
            correctTavusId: correctTavusId,
            status: 'update_error',
            error: updateError.message
          })
        } else {
          log('SUCCESS', `✅ Successfully fixed project "${project.title}"`)
          fixedCount++
          results.push({
            projectId: project.id,
            title: project.title,
            oldTavusId: project.tavus_video_id,
            newTavusId: correctTavusId,
            newVideoUrl: videoData.download_url,
            status: 'fixed',
            message: 'Successfully updated with correct Tavus ID and video URL'
          })
        }

      } catch (error) {
        log('ERROR', `💥 Error processing project ${project.id}`, error)
        results.push({
          projectId: project.id,
          title: project.title,
          currentTavusId: project.tavus_video_id,
          correctTavusId: correctTavusId,
          status: 'error',
          error: error.message
        })
      }
    }

    log('SUCCESS', `🎉 Mapping fix completed! Fixed ${fixedCount} out of ${projects.length} projects`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Mapping fix completed! Fixed ${fixedCount} projects`,
        fixed: fixedCount,
        total: projects.length,
        correctMapping: correctMapping,
        results: results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    log('ERROR', '💥 Fatal error during mapping fix', {
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