import React, { useState, useEffect } from 'react'
import { ArrowLeft, Upload, Code, Wand2, Play, Loader2, CheckCircle, AlertCircle, Github, FileText, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface CreateProjectProps {
  onBack: () => void
  selectedRepository?: any // Repository data from GitHub
}

interface ProcessingStep {
  id: string
  name: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  message?: string
  timestamp?: string
}

const CreateProject: React.FC<CreateProjectProps> = ({ onBack, selectedRepository }) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [scanningRepo, setScanningRepo] = useState(false)
  const [repoAnalysis, setRepoAnalysis] = useState<any>(null)
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([])
  const [showProcessingDetails, setShowProcessingDetails] = useState(false)
  const [formData, setFormData] = useState({
    title: selectedRepository?.name || '',
    description: selectedRepository?.description || '',
    codeSnippet: '',
    language: selectedRepository?.language?.toLowerCase() || 'javascript',
    demoType: 'walkthrough', // walkthrough, pitch, tutorial
    voiceStyle: 'professional', // professional, casual, enthusiastic
    includeCode: true,
    includeFace: true,
    isFromRepository: !!selectedRepository,
    repositoryId: selectedRepository?.id || null,
    repositoryUrl: selectedRepository?.html_url || null
  })

  const languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'react', label: 'React' },
    { value: 'vue', label: 'Vue.js' },
    { value: 'angular', label: 'Angular' },
    { value: 'nodejs', label: 'Node.js' },
    { value: 'php', label: 'PHP' },
    { value: 'java', label: 'Java' },
    { value: 'csharp', label: 'C#' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' }
  ]

  const demoTypes = [
    {
      value: 'walkthrough',
      label: 'Code Walkthrough',
      description: 'Explain how your code works step by step'
    },
    {
      value: 'pitch',
      label: 'Feature Pitch',
      description: 'Showcase your feature to stakeholders'
    },
    {
      value: 'tutorial',
      label: 'Tutorial',
      description: 'Teach others how to implement this feature'
    }
  ]

  const voiceStyles = [
    {
      value: 'professional',
      label: 'Professional',
      description: 'Clear, authoritative tone for business presentations'
    },
    {
      value: 'casual',
      label: 'Casual',
      description: 'Friendly, conversational tone for team demos'
    },
    {
      value: 'enthusiastic',
      label: 'Enthusiastic',
      description: 'Energetic tone for product launches'
    }
  ]

  // Scan repository when component mounts with selected repository
  useEffect(() => {
    if (selectedRepository && !repoAnalysis) {
      scanRepository()
    }
  }, [selectedRepository])

  const scanRepository = async () => {
    if (!selectedRepository || !user) return

    setScanningRepo(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-scan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositoryId: selectedRepository.id,
          maxFiles: 10
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to scan repository')
      }

      const data = await response.json()
      setRepoAnalysis(data.codeAnalysis)
      
      // Auto-fill form with repository analysis
      setFormData(prev => ({
        ...prev,
        title: selectedRepository.name,
        description: data.codeAnalysis.summary,
        language: data.codeAnalysis.primaryLanguage.toLowerCase(),
        codeSnippet: generateCodeSnippet(data.codeAnalysis)
      }))

    } catch (error: any) {
      console.error('Error scanning repository:', error)
      alert(`Failed to scan repository: ${error.message}`)
    } finally {
      setScanningRepo(false)
    }
  }

  const generateCodeSnippet = (analysis: any) => {
    // Combine the most important files into a representative code snippet
    const importantFiles = analysis.files
      .filter((file: any) => file.lines < 100) // Focus on smaller, more readable files
      .slice(0, 3) // Take top 3 files
    
    let snippet = `// ${analysis.summary}\n\n`
    
    if (analysis.keyFeatures.length > 0) {
      snippet += `// Key Features: ${analysis.keyFeatures.join(', ')}\n\n`
    }
    
    importantFiles.forEach((file: any, index: number) => {
      snippet += `// File: ${file.path}\n`
      snippet += file.content.split('\n').slice(0, 20).join('\n') // First 20 lines
      if (file.lines > 20) {
        snippet += '\n// ... (truncated)\n'
      }
      if (index < importantFiles.length - 1) {
        snippet += '\n\n'
      }
    })
    
    return snippet
  }

  const initializeProcessingSteps = () => {
    const steps: ProcessingStep[] = [
      { id: 'init', name: 'Initializing', status: 'pending' },
      { id: 'script', name: 'Generating AI Script', status: 'pending' },
      { id: 'voice', name: 'Creating Voice Narration', status: 'pending' },
    ]

    if (formData.includeFace) {
      steps.push({ id: 'face', name: 'Generating Face Video', status: 'pending' })
    }

    steps.push(
      { id: 'combine', name: 'Combining Video Elements', status: 'pending' },
      { id: 'finalize', name: 'Finalizing Video', status: 'pending' }
    )

    setProcessingSteps(steps)
  }

  const updateProcessingStep = (stepId: string, status: ProcessingStep['status'], message?: string) => {
    setProcessingSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { 
            ...step, 
            status, 
            message, 
            timestamp: new Date().toLocaleTimeString() 
          }
        : step
    ))
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleCreateProject = async () => {
    if (!user) return

    setLoading(true)
    setShowProcessingDetails(true)
    initializeProcessingSteps()

    try {
      updateProcessingStep('init', 'processing', 'Creating project in database...')

      // Create project in database
      const { data: project, error } = await supabase
        .from('projects')
        .insert([{
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          code_snippet: formData.codeSnippet,
          status: 'processing'
        }])
        .select()
        .single()

      if (error) throw error

      updateProcessingStep('init', 'completed', 'Project created successfully')

      // Start AI processing
      await processWithAI(project.id)

      // Navigate back to dashboard
      navigate('/dashboard')
    } catch (error: any) {
      console.error('Error creating project:', error)
      updateProcessingStep('init', 'error', `Failed to create project: ${error.message}`)
      alert('Failed to create project. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const processWithAI = async (projectId: string) => {
    try {
      updateProcessingStep('script', 'processing', 'Analyzing your code with AI...')

      // Call our edge function to process the project
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-demo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          formData: {
            ...formData,
            repositoryAnalysis: repoAnalysis // Include repository analysis for better AI processing
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start AI processing')
      }

      const result = await response.json()
      
      if (result.success) {
        updateProcessingStep('script', 'completed', 'AI script generated')
        updateProcessingStep('voice', 'completed', 'Voice narration created')
        if (formData.includeFace) {
          updateProcessingStep('face', 'completed', 'Face video generated')
        }
        updateProcessingStep('combine', 'completed', 'Video elements combined')
        updateProcessingStep('finalize', 'completed', 'Video processing complete!')
      } else {
        throw new Error(result.error || 'Processing failed')
      }
    } catch (error: any) {
      console.error('Error starting AI processing:', error)
      
      // Update all remaining steps to error
      setProcessingSteps(prev => prev.map(step => 
        step.status === 'pending' || step.status === 'processing'
          ? { ...step, status: 'error' as const, message: error.message }
          : step
      ))

      // Update project status to failed
      await supabase
        .from('projects')
        .update({ status: 'failed' })
        .eq('id', projectId)
    }
  }

  const renderRepositoryInfo = () => {
    if (!selectedRepository) return null

    return (
      <div className="mb-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
        <div className="flex items-start space-x-4">
          <div className="bg-gray-900 p-2 rounded-lg">
            <Github className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Creating Demo from Repository
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Repository:</span>
                <p className="text-gray-600">{selectedRepository.full_name}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Language:</span>
                <p className="text-gray-600">{selectedRepository.language || 'Mixed'}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Stars:</span>
                <p className="text-gray-600">{selectedRepository.stargazers_count}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Forks:</span>
                <p className="text-gray-600">{selectedRepository.forks_count}</p>
              </div>
            </div>
            
            {scanningRepo && (
              <div className="mt-4 flex items-center space-x-2 text-blue-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Scanning repository code...</span>
              </div>
            )}
            
            {repoAnalysis && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Repository scanned successfully!</span>
                </div>
                <div className="text-sm text-gray-600">
                  <p><strong>Files analyzed:</strong> {repoAnalysis.files.length}</p>
                  <p><strong>Total lines:</strong> {repoAnalysis.totalLines.toLocaleString()}</p>
                  <p><strong>Primary language:</strong> {repoAnalysis.primaryLanguage}</p>
                  {repoAnalysis.keyFeatures.length > 0 && (
                    <p><strong>Key features:</strong> {repoAnalysis.keyFeatures.join(', ')}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      {renderRepositoryInfo()}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Project Title *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
          placeholder="e.g., User Authentication System"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
          rows={3}
          placeholder="Brief description of what this feature does..."
        />
        {repoAnalysis && (
          <p className="mt-2 text-sm text-gray-500">
            ✨ Auto-generated from repository analysis
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Programming Language *
        </label>
        <select
          value={formData.language}
          onChange={(e) => handleInputChange('language', e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
        >
          {languages.map(lang => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      {!selectedRepository && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Code Snippet *
          </label>
          <textarea
            value={formData.codeSnippet}
            onChange={(e) => handleInputChange('codeSnippet', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors font-mono text-sm"
            rows={12}
            placeholder="Paste your code here..."
            required
          />
          <p className="mt-2 text-sm text-gray-500">
            Paste the main code you want to explain in your demo video
          </p>
        </div>
      )}

      {selectedRepository && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Repository Code Analysis
          </label>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center space-x-2 mb-3">
              <FileText className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-gray-900">Auto-generated from repository scan</span>
            </div>
            <textarea
              value={formData.codeSnippet}
              onChange={(e) => handleInputChange('codeSnippet', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors font-mono text-xs"
              rows={8}
              placeholder="Repository code will be analyzed automatically..."
            />
            <p className="mt-2 text-xs text-gray-500">
              ✨ This code snippet was automatically generated from your repository's most important files. You can edit it if needed.
            </p>
          </div>
        </div>
      )}
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Demo Type *
        </label>
        <div className="grid grid-cols-1 gap-4">
          {demoTypes.map(type => (
            <label
              key={type.value}
              className={`relative flex cursor-pointer rounded-xl border p-4 focus:outline-none ${
                formData.demoType === type.value
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="demoType"
                value={type.value}
                checked={formData.demoType === type.value}
                onChange={(e) => handleInputChange('demoType', e.target.value)}
                className="sr-only"
              />
              <div className="flex-1">
                <div className="flex items-center">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">{type.label}</div>
                    <div className="text-gray-500">{type.description}</div>
                  </div>
                </div>
              </div>
              {formData.demoType === type.value && (
                <div className="text-purple-600">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Voice Style *
        </label>
        <div className="grid grid-cols-1 gap-4">
          {voiceStyles.map(style => (
            <label
              key={style.value}
              className={`relative flex cursor-pointer rounded-xl border p-4 focus:outline-none ${
                formData.voiceStyle === style.value
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="voiceStyle"
                value={style.value}
                checked={formData.voiceStyle === style.value}
                onChange={(e) => handleInputChange('voiceStyle', e.target.value)}
                className="sr-only"
              />
              <div className="flex-1">
                <div className="flex items-center">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">{style.label}</div>
                    <div className="text-gray-500">{style.description}</div>
                  </div>
                </div>
              </div>
              {formData.voiceStyle === style.value && (
                <div className="text-purple-600">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </label>
          ))}
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Wand2 className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Customize Your Video
        </h3>
        <p className="text-gray-600">
          Fine-tune how your demo video will be generated
        </p>
      </div>

      <div className="space-y-4">
        <label className="flex items-center space-x-3 p-4 border border-gray-300 rounded-xl hover:bg-gray-50 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.includeCode}
            onChange={(e) => handleInputChange('includeCode', e.target.checked)}
            className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
          />
          <div className="flex-1">
            <div className="font-medium text-gray-900">Include Code Visualization</div>
            <div className="text-sm text-gray-500">Show syntax-highlighted code in the video</div>
          </div>
        </label>

        <label className="flex items-center space-x-3 p-4 border border-gray-300 rounded-xl hover:bg-gray-50 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.includeFace}
            onChange={(e) => handleInputChange('includeFace', e.target.checked)}
            className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
          />
          <div className="flex-1">
            <div className="font-medium text-gray-900">Include Face-Talking Avatar</div>
            <div className="text-sm text-gray-500">Add a realistic AI-generated presenter</div>
          </div>
        </label>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
        <h4 className="font-semibold text-gray-900 mb-3">Preview Settings</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Source:</span>
            <span className="font-medium text-gray-900">
              {selectedRepository ? `GitHub Repository (${selectedRepository.name})` : 'Manual Code Input'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Demo Type:</span>
            <span className="font-medium text-gray-900 capitalize">{formData.demoType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Voice Style:</span>
            <span className="font-medium text-gray-900 capitalize">{formData.voiceStyle}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Language:</span>
            <span className="font-medium text-gray-900">
              {languages.find(l => l.value === formData.language)?.label}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Features:</span>
            <span className="font-medium text-gray-900">
              {[
                formData.includeCode && 'Code',
                formData.includeFace && 'Avatar'
              ].filter(Boolean).join(', ') || 'Voice Only'}
            </span>
          </div>
          {repoAnalysis && (
            <div className="flex justify-between">
              <span className="text-gray-600">Repository Analysis:</span>
              <span className="font-medium text-gray-900">
                {repoAnalysis.files.length} files, {repoAnalysis.totalLines} lines
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderProcessingDetails = () => (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Loader2 className="h-8 w-8 text-white animate-spin" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Generating Your Demo Video
        </h3>
        <p className="text-gray-600">
          {selectedRepository 
            ? `Our AI is analyzing your ${selectedRepository.name} repository and creating a professional demo video.`
            : 'Our AI is working hard to create your professional demo video.'
          } This usually takes 2-5 minutes.
        </p>
      </div>

      <div className="space-y-4">
        {processingSteps.map((step, index) => (
          <div key={step.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
            <div className="flex-shrink-0">
              {step.status === 'completed' && (
                <CheckCircle className="h-6 w-6 text-green-500" />
              )}
              {step.status === 'processing' && (
                <Loader2 className="h-6 w-6 text-purple-500 animate-spin" />
              )}
              {step.status === 'error' && (
                <AlertCircle className="h-6 w-6 text-red-500" />
              )}
              {step.status === 'pending' && (
                <div className="h-6 w-6 rounded-full border-2 border-gray-300"></div>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">{step.name}</h4>
                {step.timestamp && (
                  <span className="text-xs text-gray-500">{step.timestamp}</span>
                )}
              </div>
              {step.message && (
                <p className={`text-sm mt-1 ${
                  step.status === 'error' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {step.message}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500 mb-4">
          You can safely close this window. We'll notify you when your video is ready.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  )

  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.title.trim() && (formData.codeSnippet.trim() || selectedRepository)
      case 2:
        return formData.demoType && formData.voiceStyle
      case 3:
        return true
      default:
        return false
    }
  }

  if (showProcessingDetails) {
    return (
      <div className="max-w-4xl mx-auto">
        {renderProcessingDetails()}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Dashboard</span>
        </button>
        
        <div className="flex items-center space-x-4">
          {[1, 2, 3].map((stepNumber) => (
            <div
              key={stepNumber}
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                stepNumber === step
                  ? 'bg-purple-600 text-white'
                  : stepNumber < step
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {stepNumber < step ? '✓' : stepNumber}
            </div>
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {step === 1 && (selectedRepository ? 'Repository Analysis' : 'Project Details')}
            {step === 2 && 'Demo Configuration'}
            {step === 3 && 'Final Settings'}
          </h2>
          <p className="text-gray-600">
            {step === 1 && (selectedRepository 
              ? 'Review the automatically analyzed repository code and project details'
              : 'Tell us about your project and paste your code'
            )}
            {step === 2 && 'Choose how you want your demo to be presented'}
            {step === 3 && 'Review and customize your video generation settings'}
          </p>
        </div>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onBack()}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
          >
            {step === 1 ? 'Cancel' : 'Previous'}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!isStepValid() || scanningRepo}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {scanningRepo ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Scanning Repository...</span>
                </>
              ) : (
                <>
                  <span>Next Step</span>
                  <Zap className="h-5 w-5" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleCreateProject}
              disabled={loading || !isStepValid()}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Creating Demo...</span>
                </>
              ) : (
                <>
                  <Wand2 className="h-5 w-5" />
                  <span>Generate Demo Video</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default CreateProject