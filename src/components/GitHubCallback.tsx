import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Github, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const GitHubCallback = () => {
  const navigate = useNavigate()
  const { updateProfile } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const hasProcessed = useRef(false)

  useEffect(() => {
    // Prevent multiple executions in React StrictMode
    if (hasProcessed.current) {
      return
    }
    
    handleGitHubCallback()
  }, [])

  const handleGitHubCallback = async () => {
    try {
      // Mark as processed to prevent duplicate runs
      hasProcessed.current = true
      
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const state = urlParams.get('state')
      const error = urlParams.get('error')

      // Check for OAuth errors
      if (error) {
        throw new Error(`GitHub OAuth error: ${error}`)
      }

      if (!code) {
        throw new Error('No authorization code received from GitHub')
      }

      // Verify state parameter
      const storedState = localStorage.getItem('github_oauth_state')
      if (!storedState) {
        throw new Error('No stored state found. Please try connecting GitHub again.')
      }
      
      if (state !== storedState) {
        throw new Error('Invalid state parameter. Please try connecting GitHub again.')
      }

      // Clean up stored state only after successful verification
      localStorage.removeItem('github_oauth_state')

      // Get current session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session. Please sign in first.')
      }

      // Exchange code for access token
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-auth`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, state }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to connect GitHub account')
      }

      const data = await response.json()
      
      // Update local profile state
      await updateProfile({
        github_username: data.user.github_username
      })

      setStatus('success')
      setMessage(`Successfully connected GitHub account: @${data.user.github_username}`)
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)

    } catch (error: any) {
      console.error('GitHub callback error:', error)
      setStatus('error')
      setMessage(error.message || 'Failed to connect GitHub account')
      
      // Clean up stored state on error
      localStorage.removeItem('github_oauth_state')
      
      // Redirect to dashboard after a delay even on error
      setTimeout(() => {
        navigate('/dashboard')
      }, 3000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-white p-4 rounded-xl shadow-lg">
              <Github className="h-12 w-12 text-gray-900" />
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            GitHub Integration
          </h2>
          
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            {status === 'loading' && (
              <div className="text-center">
                <Loader2 className="h-8 w-8 text-purple-600 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Connecting GitHub Account
                </h3>
                <p className="text-gray-600">
                  Please wait while we connect your GitHub account...
                </p>
              </div>
            )}
            
            {status === 'success' && (
              <div className="text-center">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Connection Successful!
                </h3>
                <p className="text-gray-600 mb-4">
                  {message}
                </p>
                <p className="text-sm text-gray-500">
                  Redirecting to dashboard...
                </p>
              </div>
            )}
            
            {status === 'error' && (
              <div className="text-center">
                <XCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Connection Failed
                </h3>
                <p className="text-red-600 mb-4">
                  {message}
                </p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Go to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GitHubCallback