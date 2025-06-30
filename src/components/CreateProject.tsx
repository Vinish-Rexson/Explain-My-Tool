import React, { useState } from 'react'
import { ArrowLeft, Upload, Code, Wand2, Play, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface CreateProjectProps {
  onBack: () => void
}

const CreateProject: React.FC<CreateProjectProps> = ({ onBack }) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    codeSnippet: '',
    language: 'javascript',
    demoType: 'walkthrough', // walkthrough, pitch, tutorial
    voiceStyle: 'professional', // professional, casual, enthusiastic
    includeCode: true,
    includeFace: true
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

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleCreateProject = async () => {
    if (!user) return

    setLoading(true)
    try {
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

      // Start AI processing
      await processWithAI(project.id)

      // Navigate back to dashboard
      navigate('/dashboard')
    } catch (error) {
      console.error('Error creating project:', error)
      alert('Failed to create project. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const processWithAI = async (projectId: string) => {
    try {
      // Call our edge function to process the project
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-demo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          formData
        })
      })

      if (!response.ok) {
        throw new Error('Failed to start AI processing')
      }
    } catch (error) {
      console.error('Error starting AI processing:', error)
      // Update project status to failed
      await supabase
        .from('projects')
        .update({ status: 'failed' })
        .eq('id', projectId)
    }
  }

  const renderStep1 = () => (
    <div className="space-y-6">
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
        </div>
      </div>
    </div>
  )

  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.title.trim() && formData.codeSnippet.trim()
      case 2:
        return formData.demoType && formData.voiceStyle
      case 3:
        return true
      default:
        return false
    }
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
            {step === 1 && 'Project Details'}
            {step === 2 && 'Demo Configuration'}
            {step === 3 && 'Final Settings'}
          </h2>
          <p className="text-gray-600">
            {step === 1 && 'Tell us about your project and paste your code'}
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
              disabled={!isStepValid()}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next Step
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