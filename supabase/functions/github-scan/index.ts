const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GitHubScanRequest {
  repositoryId: string
  maxFiles?: number
}

// Logging utility
function log(step: string, message: string, data?: any) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] 🔍 GITHUB_SCAN - ${step}: ${message}`)
  if (data) {
    console.log(`[${timestamp}] 📊 Data:`, JSON.stringify(data, null, 2))
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    log('INIT', '🚀 Starting repository code scanning')
    
    const requestData: GitHubScanRequest = await req.json()
    const { repositoryId, maxFiles = 10 } = requestData
    
    log('REQUEST', 'Repository scan parameters', { repositoryId, maxFiles })

    // Get the current user from Supabase
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      log('ERROR', '❌ No authorization header')
      throw new Error('Authorization required')
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from JWT token
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt)
    
    if (userError || !user) {
      log('ERROR', '❌ Failed to get user from token', userError)
      throw new Error('Invalid authentication token')
    }

    // Get repository details
    log('DATABASE', '🔍 Fetching repository details')
    const { data: repository, error: repoError } = await supabaseClient
      .from('repositories')
      .select('*, profiles!inner(github_access_token)')
      .eq('id', repositoryId)
      .eq('user_id', user.id)
      .single()

    if (repoError || !repository) {
      log('ERROR', '❌ Repository not found', repoError)
      throw new Error('Repository not found or access denied')
    }

    const accessToken = repository.profiles.github_access_token
    if (!accessToken) {
      log('ERROR', '❌ No GitHub access token')
      throw new Error('GitHub access token not found')
    }

    // Scan repository files
    log('GITHUB', '📁 Scanning repository files')
    const codeAnalysis = await scanRepositoryCode(
      repository.full_name,
      accessToken,
      maxFiles
    )

    log('SUCCESS', '✅ Repository scan completed', {
      filesScanned: codeAnalysis.files.length,
      totalLines: codeAnalysis.totalLines,
      primaryLanguage: codeAnalysis.primaryLanguage
    })

    return new Response(
      JSON.stringify({
        success: true,
        repository: {
          id: repository.id,
          name: repository.name,
          full_name: repository.full_name,
          description: repository.description,
          language: repository.language,
          html_url: repository.html_url
        },
        codeAnalysis
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    log('ERROR', '💥 Fatal error during repository scan', {
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

async function scanRepositoryCode(
  fullName: string,
  accessToken: string,
  maxFiles: number
): Promise<{
  files: Array<{
    path: string
    content: string
    language: string
    size: number
    lines: number
  }>
  summary: string
  totalLines: number
  primaryLanguage: string
  keyFeatures: string[]
}> {
  log('SCAN', '🔍 Starting repository code scan', { fullName, maxFiles })

  // Get repository contents
  const contentsResponse = await fetch(`https://api.github.com/repos/${fullName}/contents`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'ExplainMyTool-App',
    },
  })

  if (!contentsResponse.ok) {
    throw new Error(`Failed to fetch repository contents: ${contentsResponse.status}`)
  }

  const contents = await contentsResponse.json()
  
  // Filter for code files and prioritize important ones
  const codeFiles = contents
    .filter((item: any) => item.type === 'file')
    .filter((file: any) => isCodeFile(file.name))
    .sort((a: any, b: any) => getFilePriority(b.name) - getFilePriority(a.name))
    .slice(0, maxFiles)

  log('SCAN', `📄 Found ${codeFiles.length} code files to analyze`)

  const files = []
  let totalLines = 0
  const languageCount: { [key: string]: number } = {}

  // Fetch and analyze each file
  for (const file of codeFiles) {
    try {
      log('SCAN', `📖 Analyzing file: ${file.name}`)
      
      const fileResponse = await fetch(file.download_url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'ExplainMyTool-App',
        },
      })

      if (!fileResponse.ok) {
        log('WARNING', `⚠️ Failed to fetch file: ${file.name}`)
        continue
      }

      const content = await fileResponse.text()
      
      // Skip binary files or very large files
      if (content.length > 50000 || isBinaryContent(content)) {
        log('SCAN', `⏭️ Skipping large/binary file: ${file.name}`)
        continue
      }

      const language = getFileLanguage(file.name)
      const lines = content.split('\n').length
      
      files.push({
        path: file.path,
        content: content,
        language: language,
        size: content.length,
        lines: lines
      })

      totalLines += lines
      languageCount[language] = (languageCount[language] || 0) + lines

    } catch (error) {
      log('WARNING', `⚠️ Error processing file ${file.name}:`, error)
    }
  }

  // Determine primary language
  const primaryLanguage = Object.entries(languageCount)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown'

  // Generate summary and key features
  const summary = generateCodeSummary(files, primaryLanguage)
  const keyFeatures = extractKeyFeatures(files)

  log('SCAN', '✅ Code analysis completed', {
    filesAnalyzed: files.length,
    totalLines,
    primaryLanguage,
    keyFeatures: keyFeatures.length
  })

  return {
    files,
    summary,
    totalLines,
    primaryLanguage,
    keyFeatures
  }
}

function isCodeFile(filename: string): boolean {
  const codeExtensions = [
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h',
    '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala',
    '.vue', '.svelte', '.html', '.css', '.scss', '.sass', '.less',
    '.sql', '.sh', '.bash', '.ps1', '.yaml', '.yml', '.json',
    '.xml', '.md', '.dockerfile', '.makefile'
  ]
  
  const extension = '.' + filename.split('.').pop()?.toLowerCase()
  return codeExtensions.includes(extension) || 
         filename.toLowerCase().includes('dockerfile') ||
         filename.toLowerCase().includes('makefile')
}

function getFilePriority(filename: string): number {
  const priorities: { [key: string]: number } = {
    'index': 100,
    'main': 95,
    'app': 90,
    'server': 85,
    'api': 80,
    'router': 75,
    'controller': 70,
    'service': 65,
    'model': 60,
    'component': 55,
    'utils': 50,
    'config': 45,
    'readme': 40,
    'package': 35,
    'dockerfile': 30,
    'makefile': 25
  }

  const lowerName = filename.toLowerCase()
  for (const [key, priority] of Object.entries(priorities)) {
    if (lowerName.includes(key)) {
      return priority
    }
  }
  
  return 10
}

function getFileLanguage(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase()
  
  const languageMap: { [key: string]: string } = {
    'js': 'JavaScript',
    'jsx': 'JavaScript',
    'ts': 'TypeScript',
    'tsx': 'TypeScript',
    'py': 'Python',
    'java': 'Java',
    'cpp': 'C++',
    'c': 'C',
    'h': 'C',
    'cs': 'C#',
    'php': 'PHP',
    'rb': 'Ruby',
    'go': 'Go',
    'rs': 'Rust',
    'swift': 'Swift',
    'kt': 'Kotlin',
    'scala': 'Scala',
    'vue': 'Vue',
    'svelte': 'Svelte',
    'html': 'HTML',
    'css': 'CSS',
    'scss': 'SCSS',
    'sass': 'SASS',
    'less': 'LESS',
    'sql': 'SQL',
    'sh': 'Shell',
    'bash': 'Shell',
    'ps1': 'PowerShell',
    'yaml': 'YAML',
    'yml': 'YAML',
    'json': 'JSON',
    'xml': 'XML',
    'md': 'Markdown'
  }
  
  return languageMap[extension || ''] || 'Unknown'
}

function isBinaryContent(content: string): boolean {
  // Check for null bytes which indicate binary content
  return content.includes('\0')
}

function generateCodeSummary(files: any[], primaryLanguage: string): string {
  const fileTypes = files.reduce((acc, file) => {
    acc[file.language] = (acc[file.language] || 0) + 1
    return acc
  }, {} as { [key: string]: number })

  const totalFiles = files.length
  const totalLines = files.reduce((sum, file) => sum + file.lines, 0)
  
  let summary = `This ${primaryLanguage} project contains ${totalFiles} code files with ${totalLines} total lines of code. `
  
  if (fileTypes.JavaScript || fileTypes.TypeScript) {
    summary += "It appears to be a web application with frontend components. "
  }
  
  if (files.some(f => f.path.includes('api') || f.path.includes('server'))) {
    summary += "The project includes backend/API functionality. "
  }
  
  if (files.some(f => f.path.includes('component') || f.path.includes('Component'))) {
    summary += "It uses a component-based architecture. "
  }
  
  return summary.trim()
}

function extractKeyFeatures(files: any[]): string[] {
  const features = new Set<string>()
  
  files.forEach(file => {
    const content = file.content.toLowerCase()
    const path = file.path.toLowerCase()
    
    // Framework detection
    if (content.includes('react') || content.includes('jsx')) features.add('React Framework')
    if (content.includes('vue') || path.includes('vue')) features.add('Vue.js Framework')
    if (content.includes('angular') || content.includes('@angular')) features.add('Angular Framework')
    if (content.includes('express') || content.includes('app.listen')) features.add('Express.js Server')
    if (content.includes('fastapi') || content.includes('flask')) features.add('Python Web Framework')
    
    // Database detection
    if (content.includes('mongoose') || content.includes('mongodb')) features.add('MongoDB Database')
    if (content.includes('sequelize') || content.includes('prisma')) features.add('SQL Database ORM')
    if (content.includes('supabase')) features.add('Supabase Backend')
    
    // Authentication
    if (content.includes('auth') || content.includes('login') || content.includes('jwt')) features.add('Authentication System')
    
    // API patterns
    if (content.includes('api') || content.includes('endpoint')) features.add('REST API')
    if (content.includes('graphql')) features.add('GraphQL API')
    
    // Frontend features
    if (content.includes('router') || content.includes('routing')) features.add('Client-side Routing')
    if (content.includes('state') || content.includes('redux') || content.includes('zustand')) features.add('State Management')
    
    // Testing
    if (content.includes('test') || content.includes('jest') || content.includes('cypress')) features.add('Testing Framework')
    
    // Deployment
    if (path.includes('dockerfile') || content.includes('docker')) features.add('Docker Containerization')
    if (path.includes('vercel') || path.includes('netlify')) features.add('Cloud Deployment')
  })
  
  return Array.from(features).slice(0, 8) // Limit to top 8 features
}

// Import createClient function
import { createClient } from 'npm:@supabase/supabase-js@2'