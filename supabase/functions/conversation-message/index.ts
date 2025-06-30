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
    log('INIT', '🚀 Processing conversation message with full code context')
    
    const requestData: ConversationMessageRequest = await req.json()
    const { sessionId, message, codeSnippet, title, projectId } = requestData
    
    log('REQUEST', 'Received message request', {
      sessionId,
      messageLength: message.length,
      title,
      projectId,
      codeLength: codeSnippet.length
    })

    // Initialize Supabase client to get the ACTUAL project code
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the ACTUAL project code snippet from database
    let actualCodeSnippet = codeSnippet
    let projectContext = null
    
    if (projectId) {
      log('DATABASE', '🔍 Fetching ACTUAL project code from database')
      const { data: project, error: projectError } = await supabaseClient
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (!projectError && project) {
        // Use the ACTUAL code snippet from the database
        actualCodeSnippet = project.code_snippet
        projectContext = project
        
        log('CONTEXT', '✅ Retrieved ACTUAL project code', {
          title: project.title,
          description: project.description,
          actualCodeLength: project.code_snippet.length,
          passedCodeLength: codeSnippet.length,
          status: project.status,
          usingActualCode: true
        })
      } else {
        log('WARNING', '⚠️ Could not fetch project from database, using passed code')
      }
    }

    // Generate AI response with the ACTUAL code snippet
    const response = await generateAIResponse(
      message, 
      actualCodeSnippet,  // Use actual code from database
      title, 
      projectContext
    )
    
    log('SUCCESS', '✅ AI response generated with actual code context', {
      responseLength: response.length,
      usedCodeLength: actualCodeSnippet.length
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
  log('AI', '🤖 Generating AI response with ACTUAL code context', {
    codeLength: codeSnippet.length,
    hasProjectContext: !!projectContext
  })
  
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
  const prompt = createCodeFocusedPrompt(userMessage, codeSnippet, title, projectContext)
  
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
  const prompt = createCodeFocusedPrompt(userMessage, codeSnippet, title, projectContext)
  
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
          content: 'You are an expert software engineer and code analyst. You have deep knowledge of programming patterns, best practices, and can provide detailed insights about code implementation, architecture, and improvements. Always reference specific parts of the code when answering questions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1024,
      temperature: 0.7,
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
  const prompt = createCodeFocusedPrompt(userMessage, codeSnippet, title, projectContext)
  
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

function createCodeFocusedPrompt(
  userMessage: string, 
  codeSnippet: string, 
  title: string, 
  projectContext: any
): string {
  // Analyze the code to provide better context
  const codeLines = codeSnippet.split('\n').length
  const codeLanguage = detectLanguage(codeSnippet)
  const codeFeatures = analyzeCodeFeatures(codeSnippet)
  
  let prompt = `You are an expert software engineer analyzing this specific codebase: "${title}"

## PROJECT INFORMATION:
- **Title**: ${title}
${projectContext?.description ? `- **Description**: ${projectContext.description}` : ''}
${projectContext?.status ? `- **Status**: ${projectContext.status}` : ''}
- **Code Size**: ${codeLines} lines
- **Language**: ${codeLanguage}
${codeFeatures.length > 0 ? `- **Key Features**: ${codeFeatures.join(', ')}` : ''}

## COMPLETE CODE TO ANALYZE:
\`\`\`${codeLanguage}
${codeSnippet}
\`\`\`

## USER'S QUESTION:
"${userMessage}"

## INSTRUCTIONS:
As an expert code analyst, please provide a detailed, helpful response that:

1. **DIRECTLY ANSWERS** the user's specific question about this code
2. **REFERENCES SPECIFIC CODE PARTS** - mention actual function names, variables, classes, or patterns you see
3. **EXPLAINS THE IMPLEMENTATION** - how the code actually works based on what's written
4. **PROVIDES CONTEXT** - why certain approaches were chosen based on the visible code
5. **SUGGESTS IMPROVEMENTS** - specific, actionable recommendations for this codebase
6. **IDENTIFIES PATTERNS** - architectural decisions, design patterns, or coding practices used

## RESPONSE STYLE:
- Be conversational but technically precise
- Reference actual code elements (function names, variables, etc.)
- Provide specific examples from the code when explaining concepts
- If suggesting changes, show how they would fit with the existing code structure
- Keep responses focused and practical

## IMPORTANT:
- Base your analysis ONLY on the actual code provided above
- Don't make assumptions about code that isn't shown
- If the user asks about something not in the code, explain what IS in the code and how it could be extended
- Always ground your responses in the specific implementation details visible in the code

Please analyze the code thoroughly and provide a helpful, detailed response to the user's question.`

  return prompt
}

function detectLanguage(code: string): string {
  // Simple language detection based on code patterns
  if (code.includes('function ') || code.includes('const ') || code.includes('let ') || code.includes('var ')) {
    if (code.includes('interface ') || code.includes(': string') || code.includes(': number')) {
      return 'typescript'
    }
    return 'javascript'
  }
  if (code.includes('def ') || code.includes('import ') && code.includes('from ')) {
    return 'python'
  }
  if (code.includes('public class ') || code.includes('private ') || code.includes('public static')) {
    return 'java'
  }
  if (code.includes('using ') || code.includes('namespace ') || code.includes('public class')) {
    return 'csharp'
  }
  if (code.includes('<?php') || code.includes('$')) {
    return 'php'
  }
  if (code.includes('func ') || code.includes('package ')) {
    return 'go'
  }
  if (code.includes('fn ') || code.includes('let mut ')) {
    return 'rust'
  }
  
  return 'code'
}

function analyzeCodeFeatures(code: string): string[] {
  const features = []
  
  // Framework detection
  if (code.includes('React') || code.includes('jsx') || code.includes('useState')) {
    features.push('React')
  }
  if (code.includes('Vue') || code.includes('vue')) {
    features.push('Vue.js')
  }
  if (code.includes('Angular') || code.includes('@Component')) {
    features.push('Angular')
  }
  if (code.includes('express') || code.includes('app.listen')) {
    features.push('Express.js')
  }
  
  // Database patterns
  if (code.includes('mongoose') || code.includes('MongoDB')) {
    features.push('MongoDB')
  }
  if (code.includes('supabase') || code.includes('Supabase')) {
    features.push('Supabase')
  }
  if (code.includes('prisma') || code.includes('sequelize')) {
    features.push('ORM')
  }
  
  // Authentication patterns
  if (code.includes('auth') || code.includes('jwt') || code.includes('login') || code.includes('password')) {
    features.push('Authentication')
  }
  
  // API patterns
  if (code.includes('fetch') || code.includes('axios') || code.includes('api')) {
    features.push('API Integration')
  }
  if (code.includes('async') || code.includes('await') || code.includes('Promise')) {
    features.push('Async Programming')
  }
  
  // Testing
  if (code.includes('test') || code.includes('describe') || code.includes('it(')) {
    features.push('Testing')
  }
  
  // State management
  if (code.includes('useState') || code.includes('redux') || code.includes('state')) {
    features.push('State Management')
  }
  
  return features
}

// Import createClient function
import { createClient } from 'npm:@supabase/supabase-js@2'