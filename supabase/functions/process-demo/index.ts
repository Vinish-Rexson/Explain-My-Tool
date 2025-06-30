import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessDemoRequest {
  projectId: string
  formData: {
    title: string
    description: string
    codeSnippet: string
    language: string
    demoType: string
    voiceStyle: string
    includeCode: boolean
    includeFace: boolean
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { projectId, formData }: ProcessDemoRequest = await req.json()

    // Step 1: Generate script using OpenAI
    const script = await generateScript(formData)
    
    // Step 2: Generate voice using ElevenLabs
    const audioUrl = await generateVoice(script, formData.voiceStyle)
    
    // Step 3: Generate face video using Tavus (if enabled)
    let faceVideoUrl = null
    if (formData.includeFace) {
      faceVideoUrl = await generateFaceVideo(script, audioUrl)
    }
    
    // Step 4: Combine everything into final video
    const finalVideoUrl = await combineVideo({
      script,
      audioUrl,
      faceVideoUrl,
      codeSnippet: formData.codeSnippet,
      language: formData.language,
      includeCode: formData.includeCode,
      demoType: formData.demoType
    })

    // Update project with completed video
    const { error: updateError } = await supabaseClient
      .from('projects')
      .update({
        video_url: finalVideoUrl,
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)

    if (updateError) {
      throw updateError
    }

    // Create analytics entry
    await supabaseClient
      .from('analytics')
      .insert([{
        project_id: projectId,
        views: 0,
        shares: 0,
        completion_rate: 0
      }])

    return new Response(
      JSON.stringify({ success: true, videoUrl: finalVideoUrl }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error processing demo:', error)
    
    // Update project status to failed
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      const { projectId } = await req.json()
      await supabaseClient
        .from('projects')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
    } catch (updateError) {
      console.error('Error updating project status:', updateError)
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

async function generateScript(formData: any): Promise<string> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured')
  }

  const prompt = createScriptPrompt(formData)
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert technical presenter who creates engaging demo scripts for developers. Create clear, concise, and compelling scripts that explain code in an accessible way.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

async function generateVoice(script: string, voiceStyle: string): Promise<string> {
  const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY')
  if (!elevenlabsApiKey) {
    throw new Error('ElevenLabs API key not configured')
  }

  // Map voice styles to ElevenLabs voice IDs
  const voiceMap = {
    professional: 'pNInz6obpgDQGcFmaJgB', // Adam
    casual: '21m00Tcm4TlvDq8ikWAM',      // Rachel
    enthusiastic: 'AZnzlk1XvdvUeBnXmlld'  // Domi
  }

  const voiceId = voiceMap[voiceStyle as keyof typeof voiceMap] || voiceMap.professional

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': elevenlabsApiKey,
    },
    body: JSON.stringify({
      text: script,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5
      }
    }),
  })

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.statusText}`)
  }

  // Upload audio to Supabase Storage
  const audioBuffer = await response.arrayBuffer()
  const audioFileName = `audio_${Date.now()}.mp3`
  
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data: uploadData, error: uploadError } = await supabaseClient.storage
    .from('demo-assets')
    .upload(audioFileName, audioBuffer, {
      contentType: 'audio/mpeg'
    })

  if (uploadError) {
    throw new Error(`Failed to upload audio: ${uploadError.message}`)
  }

  const { data: { publicUrl } } = supabaseClient.storage
    .from('demo-assets')
    .getPublicUrl(audioFileName)

  return publicUrl
}

async function generateFaceVideo(script: string, audioUrl: string): Promise<string> {
  const tavusApiKey = Deno.env.get('TAVUS_API_KEY')
  if (!tavusApiKey) {
    throw new Error('Tavus API key not configured')
  }

  const response = await fetch('https://tavusapi.com/v2/videos', {
    method: 'POST',
    headers: {
      'x-api-key': tavusApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      script: script,
      replica_id: 'default', // Use default avatar
      background_url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1920&h=1080&fit=crop', // Professional background
      voice_settings: {
        audio_url: audioUrl
      }
    }),
  })

  if (!response.ok) {
    throw new Error(`Tavus API error: ${response.statusText}`)
  }

  const data = await response.json()
  
  // Poll for completion
  const videoId = data.video_id
  let attempts = 0
  const maxAttempts = 30 // 5 minutes max

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 10000)) // Wait 10 seconds
    
    const statusResponse = await fetch(`https://tavusapi.com/v2/videos/${videoId}`, {
      headers: {
        'x-api-key': tavusApiKey,
      },
    })

    if (statusResponse.ok) {
      const statusData = await statusResponse.json()
      if (statusData.status === 'completed') {
        return statusData.download_url
      } else if (statusData.status === 'failed') {
        throw new Error('Tavus video generation failed')
      }
    }
    
    attempts++
  }

  throw new Error('Tavus video generation timed out')
}

async function combineVideo(params: {
  script: string
  audioUrl: string
  faceVideoUrl: string | null
  codeSnippet: string
  language: string
  includeCode: boolean
  demoType: string
}): Promise<string> {
  // For now, return the face video or audio URL
  // In a production environment, you would use FFmpeg or similar to combine:
  // - Face video (if enabled)
  // - Code visualization
  // - Audio narration
  // - Branding elements
  
  if (params.faceVideoUrl) {
    return params.faceVideoUrl
  }
  
  // If no face video, create a simple video with code and audio
  // This would typically involve video generation libraries
  return params.audioUrl
}

function createScriptPrompt(formData: any): string {
  const { title, description, codeSnippet, language, demoType, voiceStyle } = formData
  
  let styleInstructions = ''
  switch (voiceStyle) {
    case 'professional':
      styleInstructions = 'Use a professional, authoritative tone suitable for business presentations.'
      break
    case 'casual':
      styleInstructions = 'Use a friendly, conversational tone as if explaining to a colleague.'
      break
    case 'enthusiastic':
      styleInstructions = 'Use an energetic, excited tone to build enthusiasm about the feature.'
      break
  }

  let demoInstructions = ''
  switch (demoType) {
    case 'walkthrough':
      demoInstructions = 'Focus on explaining how the code works step by step, highlighting key concepts and implementation details.'
      break
    case 'pitch':
      demoInstructions = 'Focus on the business value and benefits of this feature, explaining what problem it solves and why it matters.'
      break
    case 'tutorial':
      demoInstructions = 'Focus on teaching others how to implement this feature, including best practices and common pitfalls to avoid.'
      break
  }

  return `
Create a compelling ${demoType} script for a demo video about: ${title}

Description: ${description || 'No description provided'}
Programming Language: ${language}
Voice Style: ${styleInstructions}
Demo Type: ${demoInstructions}

Code to explain:
\`\`\`${language}
${codeSnippet}
\`\`\`

Requirements:
- Keep the script between 60-120 seconds when spoken
- Make it engaging and easy to follow
- Include natural pauses and transitions
- Explain technical concepts in accessible language
- ${demoType === 'pitch' ? 'Focus on business value and impact' : 'Focus on technical implementation and learning'}
- Use ${voiceStyle} tone throughout

Format the response as a clean script without stage directions or formatting markers.
`
}