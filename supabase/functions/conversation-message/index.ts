const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ConversationMessageRequest {
  sessionId: string
  message: string
  codeSnippet: string
  title: string
  projectId?: string
}

// Logging utility
function log(step: string, message: string, data?: any) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] 💬 MESSAGE - ${step}: ${message}`)
  if (data) {
    console.log(`[${timestamp}] 📊 Data:`, JSON.stringify(data, null, 2))
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    log('INIT', '🚀 Processing conversation message with enhanced context')
    
    const requestData: ConversationMessageRequest = await req.json()
    const { sessionId, message, codeSnippet, title, projectId } = requestData
    
    log('REQUEST', 'Received message request', {
      sessionId,
      messageLength: message.length,
      title,
      projectId,
      codeLength: codeSnippet.length
    })

    // Initialize Supabase client to get full project context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get full project details for enhanced context
    let projectContext = null
    if (projectId) {
      log('DATABASE', '🔍 Fetching full project context')
      const { data: project, error: projectError } = await supabaseClient
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (!projectError && project) {
        projectContext = project
        log('CONTEXT', '✅ Retrieved project context', {
          title: project.title,
          description: project.description,
          codeLength: project.code_snippet.length,
          status: project.status
        })
      }
    }

    // Generate AI response with enhanced context
    const response = await generateAIResponse(
      message, 
      codeSnippet, 
      title, 
      projectContext
    )
    
    log('SUCCESS', '✅ AI response generated successfully', {
      responseLength: response.length
    })

    return new Response(
      JSON.stringify({
        success: true,
        response: response
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    log('ERROR', '💥 Fatal error processing message', {
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

async function generateAIResponse(
  userMessage: string, 
  codeSnippet: string, 
  title: string, 
  projectContext: any = null
): Promise<string> {
  log('AI', '🤖 Generating AI response with enhanced context')
  
  const geminiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY')
  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  const claudeKey = Deno.env.get('ANTHROPIC_API_KEY')
  
  // Try Google Gemini first (free and excellent)
  if (geminiKey) {
    log('AI', '🟢 Using Google Gemini for conversation')
    return await generateResponseWithGemini(userMessage, codeSnippet, title, projectContext, geminiKey)
  }
  
  // Fallback to OpenAI
  if (openaiKey) {
    log('AI', '🟡 Using OpenAI for conversation')
    return await generateResponseWithOpenAI(userMessage, codeSnippet, title, projectContext, openaiKey)
  }
  
  // Fallback to Claude
  if (claudeKey) {
    log('AI', '🟣 Using Claude for conversation')
    return await generateResponseWithClaude(userMessage, codeSnippet, title, projectContext, claudeKey)
  }
  
  throw new Error('No AI API keys configured for conversation')
}

async function generateResponseWithGemini(
  userMessage: string, 
  codeSnippet: string, 
  title: string, 
  projectContext: any,
  apiKey: string
): Promise<string> {
  const prompt = createEnhancedConversationPrompt(userMessage, codeSnippet, title, projectContext)
  
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
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text
  
  if (!aiResponse) {
    throw new Error('No response content received from Gemini')
  }
  
  return aiResponse
}

async function generateResponseWithOpenAI(
  userMessage: string, 
  codeSnippet: string, 
  title: string, 
  projectContext: any,
  apiKey: string
): Promise<string> {
  const prompt = createEnhancedConversationPrompt(userMessage, codeSnippet, title, projectContext)
  
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
          content: 'You are an expert software engineer having a detailed conversation about code. You have deep knowledge of the project context and can answer specific questions about implementation, architecture, best practices, and improvements. Keep responses helpful, detailed when needed, but conversational.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1024,
      temperature: 0.8,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const aiResponse = data.choices?.[0]?.message?.content
  
  if (!aiResponse) {
    throw new Error('No response content received from OpenAI')
  }
  
  return aiResponse
}

async function generateResponseWithClaude(
  userMessage: string, 
  codeSnippet: string, 
  title: string, 
  projectContext: any,
  apiKey: string
): Promise<string> {
  const prompt = createEnhancedConversationPrompt(userMessage, codeSnippet, title, projectContext)
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: prompt
      }]
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Claude API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const aiResponse = data.content?.[0]?.text
  
  if (!aiResponse) {
    throw new Error('No response content received from Claude')
  }
  
  return aiResponse
}

function createEnhancedConversationPrompt(
  userMessage: string, 
  codeSnippet: string, 
  title: string, 
  projectContext: any
): string {
  let prompt = `You are an expert software engineer having a detailed conversation about this project: "${title}"

PROJECT CONTEXT:
- Title: ${title}
${projectContext?.description ? `- Description: ${projectContext.description}` : ''}
${projectContext?.status ? `- Status: ${projectContext.status}` : ''}
${projectContext?.created_at ? `- Created: ${new Date(projectContext.created_at).toLocaleDateString()}` : ''}

FULL CODE CONTEXT:
\`\`\`
${codeSnippet}
\`\`\`

USER QUESTION: "${userMessage}"

INSTRUCTIONS:
You are an expert who has deep knowledge of this specific codebase. Please provide a helpful, detailed response that:

1. **Directly addresses the user's question** about this specific code
2. **References specific parts of the code** when relevant (mention function names, variables, patterns)
3. **Provides context-aware insights** based on the actual implementation
4. **Suggests improvements or alternatives** if appropriate
5. **Explains the "why" behind design decisions** visible in the code
6. **Offers practical next steps** or related considerations

Keep your response:
- **Conversational and engaging** (like talking to a colleague)
- **Technically accurate** and specific to this codebase
- **Helpful and actionable** with concrete suggestions
- **Appropriately detailed** based on the complexity of the question

If the user asks about something not directly in the code, relate it back to what IS in the code and how it could be extended or modified.`

  return prompt
}

// Import createClient function
import { createClient } from 'npm:@supabase/supabase-js@2'