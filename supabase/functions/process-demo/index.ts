import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { title, description, codeSnippet } = await req.json()

    // For now, return a mock response since API keys are not configured
    // In production, you would use the actual APIs with proper environment variables
    const mockResponse = {
      success: true,
      videoUrl: `https://example.com/demo-video-${Date.now()}.mp4`,
      message: 'Demo processing completed successfully (mock response)',
      processingTime: Math.floor(Math.random() * 30) + 10, // Random time between 10-40 seconds
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000))

    return new Response(
      JSON.stringify(mockResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error processing demo:', error)
    
    return new Response(
      JSON.stringify({
        error: 'Failed to process demo',
        details: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})