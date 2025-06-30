import React, { useState, useEffect } from 'react'
import { Github, RefreshCw, ExternalLink, Star, GitFork, Lock, Globe, Code, Calendar, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface Repository {
  id: string
  github_id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  clone_url: string
  language: string | null
  stargazers_count: number
  forks_count: number
  is_private: boolean
  created_at: string
  updated_at: string
  synced_at: string
}

interface GitHubConnectProps {
  onRepositorySelect?: (repo: Repository) => void
  showRepositories?: boolean
}

const GitHubConnect: React.FC<GitHubConnectProps> = ({ 
  onRepositorySelect, 
  showRepositories = true 
}) => {
  const { user, profile, updateProfile } = useAuth()
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')

  // Check if GitHub is configured
  const isGitHubConfigured = !!import.meta.env.VITE_GITHUB_CLIENT_ID

  useEffect(() => {
    if (profile?.github_username && showRepositories) {
      fetchRepositories()
    }
  }, [profile?.github_username, showRepositories])

  const connectGitHub = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID
    if (!clientId) {
      setError('GitHub integration not configured. Please add VITE_GITHUB_CLIENT_ID to your environment variables.')
      return
    }

    const redirectUri = `${window.location.origin}/github-callback`
    const scope = 'repo,user:email'
    const state = Math.random().toString(36).substring(7)
    
    // Store state in localStorage for verification
    localStorage.setItem('github_oauth_state', state)
    
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`
    
    window.location.href = githubAuthUrl
  }

  const fetchRepositories = async (sync = false) => {
    if (!user) return

    setLoading(true)
    if (sync) setSyncing(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-repos?sync=${sync}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch repositories')
      }

      const data = await response.json()
      setRepositories(data.repositories)
    } catch (error: any) {
      console.error('Error fetching repositories:', error)
      setError(error.message)
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }

  const syncRepositories = () => {
    fetchRepositories(true)
  }

  const disconnectGitHub = async () => {
    if (!confirm('Are you sure you want to disconnect your GitHub account?')) return

    try {
      await updateProfile({
        github_username: null,
        github_access_token: null
      })
      setRepositories([])
    } catch (error: any) {
      setError(error.message)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getLanguageColor = (language: string | null) => {
    const colors: { [key: string]: string } = {
      JavaScript: '#f1e05a',
      TypeScript: '#2b7489',
      Python: '#3572A5',
      Java: '#b07219',
      'C++': '#f34b7d',
      'C#': '#239120',
      PHP: '#4F5D95',
      Ruby: '#701516',
      Go: '#00ADD8',
      Rust: '#dea584',
      Swift: '#ffac45',
      Kotlin: '#F18E33',
    }
    return colors[language || ''] || '#6b7280'
  }

  // Show configuration needed message if GitHub is not configured
  if (!isGitHubConfigured) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-yellow-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            GitHub Integration Not Configured
          </h3>
          <div className="text-left bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700 mb-3">
              To enable GitHub integration, you need to:
            </p>
            <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
              <li>Create a GitHub OAuth App at <a href="https://github.com/settings/developers" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">GitHub Developer Settings</a></li>
              <li>Set the callback URL to: <code className="bg-gray-200 px-1 rounded text-xs">{window.location.origin}/github-callback</code></li>
              <li>Add your Client ID to the <code className="bg-gray-200 px-1 rounded text-xs">.env</code> file as <code className="bg-gray-200 px-1 rounded text-xs">VITE_GITHUB_CLIENT_ID</code></li>
              <li>Add your Client Secret as <code className="bg-gray-200 px-1 rounded text-xs">GITHUB_CLIENT_SECRET</code></li>
              <li>Restart the development server</li>
            </ol>
          </div>
          <p className="text-sm text-gray-500">
            See the README.md file for detailed setup instructions.
          </p>
        </div>
      </div>
    )
  }

  if (!profile?.github_username) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Github className="h-8 w-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Connect Your GitHub Account
          </h3>
          <p className="text-gray-600 mb-6">
            Connect your GitHub account to import repositories and create demos from your existing code.
          </p>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          
          <button
            onClick={connectGitHub}
            className="bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2 mx-auto"
          >
            <Github className="h-5 w-5" />
            <span>Connect GitHub</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Connected Account Info */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center">
              <Github className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                GitHub Connected
              </h3>
              <p className="text-gray-600">
                @{profile.github_username}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={syncRepositories}
              disabled={syncing}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync Repos'}</span>
            </button>
            
            <button
              onClick={disconnectGitHub}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Repositories List */}
      {showRepositories && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Your Repositories
              </h3>
              <span className="text-sm text-gray-500">
                {repositories.length} repositories
              </span>
            </div>
          </div>
          
          {loading && repositories.length === 0 ? (
            <div className="p-12 text-center">
              <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading repositories...</p>
            </div>
          ) : repositories.length === 0 ? (
            <div className="p-12 text-center">
              <Github className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No repositories found</h4>
              <p className="text-gray-600 mb-6">
                Click "Sync Repos" to fetch your GitHub repositories.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {repositories.map((repo) => (
                <div
                  key={repo.id}
                  className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onRepositorySelect?.(repo)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors">
                          {repo.name}
                        </h4>
                        
                        {repo.is_private ? (
                          <Lock className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Globe className="h-4 w-4 text-gray-500" />
                        )}
                        
                        <a
                          href={repo.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-500 hover:text-gray-700 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                      
                      {repo.description && (
                        <p className="text-gray-600 mb-3">{repo.description}</p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        {repo.language && (
                          <div className="flex items-center space-x-1">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: getLanguageColor(repo.language) }}
                            ></div>
                            <span>{repo.language}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4" />
                          <span>{repo.stargazers_count}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <GitFork className="h-4 w-4" />
                          <span>{repo.forks_count}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>Updated {formatDate(repo.updated_at)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {onRepositorySelect && (
                      <button className="ml-4 flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                        <Code className="h-4 w-4" />
                        <span>Create Demo</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default GitHubConnect