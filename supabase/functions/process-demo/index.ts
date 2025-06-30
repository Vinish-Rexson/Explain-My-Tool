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

// Logging utility
function log(step: string, message: string, data?: any) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] 🎬 DEMO GENERATION - ${step}: ${message}`)
  if (data) {
    console.log(`[${timestamp}] 📊 Data:`, JSON.stringify(data, null, 2))
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let projectId = 'unknown'
  
  try {
    log('INIT', '🚀 Starting demo generation process')
    
    const requestData: ProcessDemoRequest = await req.json()
    projectId = requestData.projectId
    const { formData } = requestData
    
    log('REQUEST', 'Received demo generation request', {
      projectId,
      title: formData.title,
      language: formData.language,
      demoType: formData.demoType,
      voiceStyle: formData.voiceStyle,
      includeCode: formData.includeCode,
      includeFace: formData.includeFace,
      codeLength: formData.codeSnippet.length
    })

    // Initialize Supabase client
    log('SUPABASE', '🔌 Initializing Supabase client')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Update project status to processing
    log('DATABASE', '📝 Updating project status to processing', { projectId })
    const { error: statusError } = await supabaseClient
      .from('projects')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)

    if (statusError) {
      log('ERROR', '❌ Failed to update project status', statusError)
      throw new Error(`Database error: ${statusError.message}`)
    }

    // Step 1: Generate script using AI
    log('SCRIPT', '🤖 Starting AI script generation')
    const script = await generateScript(formData, projectId)
    log('SCRIPT', '✅ Script generation completed', { 
      scriptLength: script.length,
      wordCount: script.split(' ').length 
    })
    
    // Step 2: Generate voice using ElevenLabs
    log('VOICE', '🎤 Starting voice generation with ElevenLabs')
    const audioUrl = await generateVoice(script, formData.voiceStyle, projectId)
    log('VOICE', '✅ Voice generation completed', { audioUrl })
    
    // Step 3: Generate face video using Tavus (if enabled)
    let faceVideoUrl = null
    if (formData.includeFace) {
      log('FACE', '👤 Starting face video generation with Tavus')
      faceVideoUrl = await generateFaceVideo(script, audioUrl, projectId)
      log('FACE', '✅ Face video generation completed', { faceVideoUrl })
    } else {
      log('FACE', '⏭️ Skipping face video generation (disabled by user)')
    }
    
    // Step 4: Combine everything into final video
    log('COMBINE', '🎞️ Starting video combination process')
    const finalVideoUrl = await combineVideo({
      script,
      audioUrl,
      faceVideoUrl,
      codeSnippet: formData.codeSnippet,
      language: formData.language,
      includeCode: formData.includeCode,
      demoType: formData.demoType
    }, projectId)
    log('COMBINE', '✅ Video combination completed', { finalVideoUrl })

    // Update project with completed video
    log('DATABASE', '💾 Updating project with completed video')
    const { error: updateError } = await supabaseClient
      .from('projects')
      .update({
        video_url: finalVideoUrl,
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)

    if (updateError) {
      log('ERROR', '❌ Failed to update project with video URL', updateError)
      throw updateError
    }

    // Create analytics entry
    log('ANALYTICS', '📊 Creating analytics entry')
    const { error: analyticsError } = await supabaseClient
      .from('analytics')
      .insert([{
        project_id: projectId,
        views: 0,
        shares: 0,
        completion_rate: 0
      }])

    if (analyticsError) {
      log('WARNING', '⚠️ Failed to create analytics entry (non-critical)', analyticsError)
    } else {
      log('ANALYTICS', '✅ Analytics entry created successfully')
    }

    log('SUCCESS', '🎉 Demo generation completed successfully!', {
      projectId,
      finalVideoUrl,
      processingTimeSeconds: 'N/A' // Could add timing if needed
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        videoUrl: finalVideoUrl,
        message: 'Demo video generated successfully!'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    log('ERROR', '💥 Fatal error during demo generation', {
      error: error.message,
      stack: error.stack,
      projectId
    })
    
    // Update project status to failed
    try {
      log('CLEANUP', '🧹 Updating project status to failed')
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      await supabaseClient
        .from('projects')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
      
      log('CLEANUP', '✅ Project status updated to failed')
    } catch (updateError) {
      log('ERROR', '❌ Failed to update project status to failed', updateError)
    }

    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check the function logs for detailed error information',
        projectId 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

async function generateScript(formData: any, projectId: string): Promise<string> {
  log('SCRIPT_AI', '🔍 Checking available AI providers')
  
  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  const geminiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY')
  const claudeKey = Deno.env.get('ANTHROPIC_API_KEY')
  
  log('SCRIPT_AI', '🔑 API Key availability check', {
    hasOpenAI: !!openaiKey,
    hasGemini: !!geminiKey,
    hasClaude: !!claudeKey
  })

  // Try Google Gemini first (free and excellent)
  if (geminiKey) {
    log('SCRIPT_AI', '🟢 Using Google Gemini (FREE option)')
    return await generateScriptWithGemini(formData, geminiKey, projectId)
  }
  
  // Fallback to OpenAI
  if (openaiKey) {
    log('SCRIPT_AI', '🟡 Using OpenAI GPT-4 (paid option)')
    return await generateScriptWithOpenAI(formData, openaiKey, projectId)
  }
  
  // Fallback to Claude
  if (claudeKey) {
    log('SCRIPT_AI', '🟣 Using Anthropic Claude')
    return await generateScriptWithClaude(formData, claudeKey, projectId)
  }
  
  log('ERROR', '❌ No AI API keys configured!')
  throw new Error('No AI API keys configured. Please add GOOGLE_GEMINI_API_KEY (free), OPENAI_API_KEY, or ANTHROPIC_API_KEY to your environment variables.')
}

async function generateScriptWithGemini(formData: any, apiKey: string, projectId: string): Promise<string> {
  log('GEMINI', '🚀 Starting Gemini API request')
  
  const prompt = createScriptPrompt(formData)
  log('GEMINI', '📝 Generated prompt', { promptLength: prompt.length })
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    }),
  })

  log('GEMINI', '📡 Received API response', { 
    status: response.status,
    statusText: response.statusText 
  })

  if (!response.ok) {
    const errorText = await response.text()
    log('ERROR', '❌ Gemini API error', { 
      status: response.status,
      error: errorText 
    })
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  log('GEMINI', '✅ Successfully parsed response')
  
  const script = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!script) {
    log('ERROR', '❌ No script content in Gemini response', data)
    throw new Error('No script content received from Gemini')
  }
  
  log('GEMINI', '🎯 Script extracted successfully', { 
    scriptLength: script.length,
    wordCount: script.split(' ').length 
  })
  
  return script
}

async function generateScriptWithOpenAI(formData: any, apiKey: string, projectId: string): Promise<string> {
  log('OPENAI', '🚀 Starting OpenAI API request')
  
  const prompt = createScriptPrompt(formData)
  log('OPENAI', '📝 Generated prompt', { promptLength: prompt.length })
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
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

  log('OPENAI', '📡 Received API response', { 
    status: response.status,
    statusText: response.statusText 
  })

  if (!response.ok) {
    const errorText = await response.text()
    log('ERROR', '❌ OpenAI API error', { 
      status: response.status,
      error: errorText 
    })
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  log('OPENAI', '✅ Successfully parsed response')
  
  const script = data.choices?.[0]?.message?.content
  if (!script) {
    log('ERROR', '❌ No script content in OpenAI response', data)
    throw new Error('No script content received from OpenAI')
  }
  
  log('OPENAI', '🎯 Script extracted successfully', { 
    scriptLength: script.length,
    wordCount: script.split(' ').length 
  })
  
  return script
}

async function generateScriptWithClaude(formData: any, apiKey: string, projectId: string): Promise<string> {
  log('CLAUDE', '🚀 Starting Claude API request')
  
  const prompt = createScriptPrompt(formData)
  log('CLAUDE', '📝 Generated prompt', { promptLength: prompt.length })
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    }),
  })

  log('CLAUDE', '📡 Received API response', { 
    status: response.status,
    statusText: response.statusText 
  })

  if (!response.ok) {
    const errorText = await response.text()
    log('ERROR', '❌ Claude API error', { 
      status: response.status,
      error: errorText 
    })
    throw new Error(`Claude API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  log('CLAUDE', '✅ Successfully parsed response')
  
  const script = data.content?.[0]?.text
  if (!script) {
    log('ERROR', '❌ No script content in Claude response', data)
    throw new Error('No script content received from Claude')
  }
  
  log('CLAUDE', '🎯 Script extracted successfully', { 
    scriptLength: script.length,
    wordCount: script.split(' ').length 
  })
  
  return script
}

async function generateVoice(script: string, voiceStyle: string, projectId: string): Promise<string> {
  log('VOICE', '🔍 Checking ElevenLabs API key')
  
  const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY')
  if (!elevenlabsApiKey) {
    log('ERROR', '❌ ElevenLabs API key not configured')
    throw new Error('ELEVENLABS_API_KEY is required for voice generation')
  }

  log('VOICE', '🎵 Mapping voice style to ElevenLabs voice ID', { voiceStyle })
  
  // Map voice styles to ElevenLabs voice IDs
  const voiceMap = {
    professional: 'pNInz6obpgDQGcFmaJgB', // Adam
    casual: '21m00Tcm4TlvDq8ikWAM',      // Rachel
    enthusiastic: 'AZnzlk1XvdvUeBnXmlld'  // Domi
  }

  const voiceId = voiceMap[voiceStyle as keyof typeof voiceMap] || voiceMap.professional
  log('VOICE', '🎤 Selected voice ID', { voiceId, voiceStyle })

  log('VOICE', '📡 Making ElevenLabs API request')
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

  log('VOICE', '📡 Received ElevenLabs response', { 
    status: response.status,
    statusText: response.statusText,
    contentType: response.headers.get('content-type')
  })

  if (!response.ok) {
    const errorText = await response.text()
    log('ERROR', '❌ ElevenLabs API error', { 
      status: response.status,
      error: errorText 
    })
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`)
  }

  // Upload audio to Supabase Storage
  log('VOICE', '💾 Uploading audio to Supabase Storage')
  const audioBuffer = await response.arrayBuffer()
  const audioFileName = `audio_${projectId}_${Date.now()}.mp3`
  
  log('VOICE', '📤 Starting file upload', { 
    fileName: audioFileName,
    fileSize: audioBuffer.byteLength 
  })
  
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
    log('ERROR', '❌ Failed to upload audio to storage', uploadError)
    throw new Error(`Failed to upload audio: ${uploadError.message}`)
  }

  log('VOICE', '✅ Audio uploaded successfully', { uploadPath: uploadData.path })

  const { data: { publicUrl } } = supabaseClient.storage
    .from('demo-assets')
    .getPublicUrl(audioFileName)

  log('VOICE', '🔗 Generated public URL', { publicUrl })
  return publicUrl
}

async function generateFaceVideo(script: string, audioUrl: string, projectId: string): Promise<string> {
  log('FACE', '🔍 Checking Tavus API key')
  
  const tavusApiKey = Deno.env.get('TAVUS_API_KEY')
  if (!tavusApiKey) {
    log('WARNING', '⚠️ Tavus API key not configured, skipping face video generation')
    return audioUrl // Return audio URL as fallback
  }

  log('FACE', '🎬 Starting Tavus video generation')
  const response = await fetch('https://tavusapi.com/v2/videos', {
    method: 'POST',
    headers: {
      'x-api-key': tavusApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      script: script,
      replica_id: 'default', // Use default avatar
      background_url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1920&h=1080&fit=crop',
      audio_url: audioUrl // Moved audio_url to top level
    }),
  })

  log('FACE', '📡 Received Tavus response', { 
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

  const data = await response.json()
  const videoId = data.video_id
  
  log('FACE', '⏳ Starting video generation polling', { videoId })
  
  // Poll for completion
  let attempts = 0
  const maxAttempts = 30 // 5 minutes max
  const pollInterval = 10000 // 10 seconds

  while (attempts < maxAttempts) {
    log('FACE', `🔄 Polling attempt ${attempts + 1}/${maxAttempts}`)
    
    await new Promise(resolve => setTimeout(resolve, pollInterval))
    
    const statusResponse = await fetch(`https://tavusapi.com/v2/videos/${videoId}`, {
      headers: {
        'x-api-key': tavusApiKey,
      },
    })

    if (statusResponse.ok) {
      const statusData = await statusResponse.json()
      log('FACE', '📊 Video status update', { 
        status: statusData.status,
        progress: statusData.progress || 'N/A'
      })
      
      if (statusData.status === 'completed') {
        log('FACE', '✅ Tavus video generation completed!', { 
          downloadUrl: statusData.download_url 
        })
        return statusData.download_url
      } else if (statusData.status === 'failed') {
        log('ERROR', '❌ Tavus video generation failed', statusData)
        throw new Error('Tavus video generation failed')
      }
    } else {
      log('WARNING', '⚠️ Failed to check video status', { 
        status: statusResponse.status 
      })
    }
    
    attempts++
  }

  log('ERROR', '⏰ Tavus video generation timed out')
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
}, projectId: string): Promise<string> {
  log('COMBINE', '🎞️ Starting video combination process', {
    hasFaceVideo: !!params.faceVideoUrl,
    includeCode: params.includeCode,
    demoType: params.demoType,
    language: params.language
  })
  
  // For now, return the face video or audio URL
  // In a production environment, you would use FFmpeg or similar to combine:
  // - Face video (if enabled)
  // - Code visualization
  // - Audio narration
  // - Branding elements
  
  if (params.faceVideoUrl) {
    log('COMBINE', '✅ Using face video as final output', { 
      finalUrl: params.faceVideoUrl 
    })
    return params.faceVideoUrl
  }
  
  // If no face video, create a simple video with code and audio
  // This would typically involve video generation libraries
  log('COMBINE', '✅ Using audio as final output (no face video)', { 
    finalUrl: params.audioUrl 
  })
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