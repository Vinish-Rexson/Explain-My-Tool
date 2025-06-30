const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ConversationMessageRequest {
  sessionId: string
  message: string
  codeSnippet: string
  title: string
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
    log('INIT', '🚀 Processing conversation message')
    
    const requestData: ConversationMessageRequest = await req.json()
    const { sessionId, message, codeSnippet, title } = requestData
    
    log('REQUEST', 'Received message request', {
      sessionId,
      messageLength: message.length,
      title
    })

    // Generate AI response
    const response = await generateAIResponse(message, codeSnippet, title)
    
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

async function generateAIResponse(userMessage: string, codeSnippet: string, title: string): Promise<string> {
  log('AI', '🤖 Generating AI response')
  
  const geminiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY')
  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  const claudeKey = Deno.env.get('ANTHROPIC_API_KEY')
  
  // Try Google Gemini first (free and excellent)
  if (geminiKey) {
    log('AI', '🟢 Using Google Gemini for conversation')
    return await generateResponseWithGemini(userMessage, codeSnippet, title, geminiKey)
  }
  
  // Fallback to OpenAI
  if (openaiKey) {
    log('AI', '🟡 Using OpenAI for conversation')
    return await generateResponseWithOpenAI(userMessage, codeSnippet, title, openaiKey)
  }
  
  // Fallback to Claude
  if (claudeKey) {
    log('AI', '🟣 Using Claude for conversation')
    return await generateResponseWithClaude(userMessage, codeSnippet, title, claudeKey)
  }
  
  throw new Error('No AI API keys configured for conversation')
}

async function generateResponseWithGemini(userMessage: string, codeSnippet: string, title: string, apiKey: string): Promise<string> {
  const prompt = createConversationPrompt(userMessage, codeSnippet, title)
  
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
        maxOutputTokens: 512,
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

async function generateResponseWithOpenAI(userMessage: string, codeSnippet: string, title: string, apiKey: string): Promise<string> {
  const prompt = createConversationPrompt(userMessage, codeSnippet, title)
  
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
          content: 'You are an expert software engineer having a friendly conversation about code. Keep responses conversational, helpful, and concise.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 512,
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

async function generateResponseWithClaude(userMessage: string, codeSnippet: string, title: string, apiKey: string): Promise<string> {
  const prompt = createConversationPrompt(userMessage, codeSnippet, title)
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 512,
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

function createConversationPrompt(userMessage: string, codeSnippet: string, title: string): string {
  return `You are having a live conversation about this code project: "${title}"

CODE CONTEXT:
\`\`\`
${codeSnippet}
\`\`\`

USER MESSAGE: "${userMessage}"

Please respond as an expert software engineer in a conversational, friendly way. Keep your response:
- Focused on the user's question about the code
- Conversational and natural (like talking to a colleague)
- Concise but informative (2-3 sentences max)
- Practical and actionable
- Encouraging and supportive

If the user asks about something not directly related to the code, gently redirect them back to discussing the implementation, best practices, or improvements for this specific code.`
}