import React, { useEffect, useState } from 'react'
import { Plus, Video, BarChart3, Settings, Github, Play, Edit, Trash2, Eye, Share2, Clock, CheckCircle, XCircle, Loader2, MessageCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, Project } from '../lib/supabase'
import CreateProject from './CreateProject'
import LiveConversation from './LiveConversation'
import GitHubConnect from './GitHubConnect'

const Dashboard = () => {
  const { user, profile } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingTavus, setCheckingTavus] = useState<Set<string>>(new Set())
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showLiveConversation, setShowLiveConversation] = useState(false)
  const [conversationProject, setConversationProject] = useState<Project | null>(null)
  const [showGitHubRepos, setShowGitHubRepos] = useState(false)
  const [selectedRepository, setSelectedRepository] = useState<any>(null)

  useEffect(() => {
    if (user) {
      fetchProjects()
      // Set up real-time subscription for project updates
      const subscription = supabase
        .channel('projects')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'projects',
            filter: `user_id=eq.${user.id}`
          }, 
          () => {
            fetchProjects()
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [user])

  // Immediately check Tavus for processing projects when dashboard loads
  useEffect(() => {
    const processingProjects = projects.filter(p => 
      p.status === 'processing' && 
      p.tavus_video_id && 
      !checkingTavus.has(p.id)
    )

    if (processingProjects.length > 0) {
      console.log('🎬 Found processing projects with Tavus IDs, checking immediately:', processingProjects.map(p => ({ id: p.id, tavusId: p.tavus_video_id })))
      
      // Check all processing projects immediately
      processingProjects.forEach(project => {
        checkTavusVideoStatus(project.id, project.tavus_video_id!)
      })
    }
  }, [projects])

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProjects(data || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkTavusVideoStatus = async (projectId: string, tavusVideoId: string) => {
    // Prevent duplicate checks
    if (checkingTavus.has(projectId)) {
      console.log(`⏭️ Already checking project ${projectId}, skipping`)
      return
    }
    
    console.log(`🎬 Starting Tavus check for project ${projectId}, video ID: ${tavusVideoId}`)
    setCheckingTavus(prev => new Set(prev).add(projectId))
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tavus-poll`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: projectId
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log(`📊 Tavus check result for project ${projectId}:`, result)
        
        if (result.updated > 0) {
          console.log(`✅ Video found and updated from Tavus for project ${projectId}!`)
          // Refresh projects to show the updated status
          await fetchProjects()
        } else {
          console.log(`📝 Video still processing on Tavus for project ${projectId}`)
          // If still processing, schedule another check in 30 seconds
          setTimeout(() => {
            setCheckingTavus(prev => {
              const newSet = new Set(prev)
              newSet.delete(projectId)
              return newSet
            })
            // Check if project is still processing and re-trigger check
            const currentProject = projects.find(p => p.id === projectId)
            if (currentProject?.status === 'processing' && currentProject.tavus_video_id) {
              console.log(`🔄 Re-checking Tavus for project ${projectId} after 30 seconds`)
              checkTavusVideoStatus(projectId, currentProject.tavus_video_id)
            }
          }, 30000)
        }
      } else {
        console.error(`❌ Failed to check Tavus for project ${projectId}:`, response.status)
      }
    } catch (error) {
      console.error(`💥 Error checking Tavus status for project ${projectId}:`, error)
    } finally {
      // Remove from checking set after a delay to allow re-checking
      setTimeout(() => {
        setCheckingTavus(prev => {
          const newSet = new Set(prev)
          newSet.delete(projectId)
          return newSet
        })
      }, 5000) // 5 second delay before allowing re-check
    }
  }

  const manualTavusSync = async () => {
    console.log('🔄 Manual Tavus sync triggered')
    setCheckingTavus(new Set()) // Clear checking state
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tavus-poll`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to sync Tavus videos')
      }

      const result = await response.json()
      console.log('📊 Manual sync result:', result)
      
      // Refresh projects to show updated status
      await fetchProjects()
      
      if (result.updated > 0) {
        alert(`✅ Successfully updated ${result.updated} completed videos!`)
      } else {
        alert('📝 No new completed videos found. Videos may still be processing.')
      }
    } catch (error) {
      console.error('💥 Error syncing Tavus videos:', error)
      alert('❌ Failed to sync videos. Please try again.')
    }
  }

  const retryProject = async (projectId: string) => {
    console.log(`🔄 Retrying project ${projectId}`)
    
    try {
      // First, try to fetch from Tavus if there's a tavus_video_id
      const project = projects.find(p => p.id === projectId)
      if (project?.tavus_video_id) {
        console.log(`🎬 Attempting to fetch video from Tavus: ${project.tavus_video_id}`)
        
        await checkTavusVideoStatus(projectId, project.tavus_video_id)
        
        // Wait a moment and check if it was updated
        setTimeout(async () => {
          await fetchProjects()
          const updatedProject = projects.find(p => p.id === projectId)
          if (updatedProject?.status === 'completed') {
            alert('✅ Video successfully fetched from Tavus!')
            return
          }
        }, 2000)
      }

      // If Tavus fetch didn't work, restart the generation process
      const { error } = await supabase
        .from('projects')
        .update({
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)

      if (error) throw error
      
      // Refresh projects
      await fetchProjects()
      alert('🔄 Project retry initiated. Processing will begin shortly.')
    } catch (error) {
      console.error('💥 Error retrying project:', error)
      alert('❌ Failed to retry project')
    }
  }

  const deleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (error) throw error
      setProjects(projects.filter(p => p.id !== projectId))
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('Failed to delete project')
    }
  }

  const startLiveConversation = (project: Project) => {
    setConversationProject(project)
    setShowLiveConversation(true)
  }

  const handleRepositorySelect = (repo: any) => {
    setSelectedRepository(repo)
    setShowGitHubRepos(false)
    setShowCreateProject(true)
  }

  const handleCreateProjectBack = () => {
    setShowCreateProject(false)
    setSelectedRepository(null)
  }

  const getStatusIcon = (status: string, projectId?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'processing':
        return checkingTavus.has(projectId || '') 
          ? <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          : <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string, projectId?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'processing':
        return checkingTavus.has(projectId || '') 
          ? 'bg-blue-100 text-blue-800'
          : 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string, projectId?: string) => {
    if (status === 'processing' && checkingTavus.has(projectId || '')) {
      return 'checking tavus'
    }
    return status
  }

  const getSubscriptionLimits = () => {
    switch (profile?.subscription_tier) {
      case 'professional':
        return { videos: 25, used: projects.length }
      case 'enterprise':
        return { videos: 'Unlimited', used: projects.length }
      default:
        return { videos: 3, used: projects.length }
    }
  }

  const limits = getSubscriptionLimits()
  const canCreateMore = typeof limits.videos === 'string' || limits.used < limits.videos

  // Count projects with Tavus videos that might be ready
  const pendingTavusProjects = projects.filter(p => 
    (p.status === 'failed' || p.status === 'processing') && p.tavus_video_id
  ).length

  if (showCreateProject) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <CreateProject 
            onBack={handleCreateProjectBack} 
            selectedRepository={selectedRepository}
          />
        </div>
      </div>
    )
  }

  if (showGitHubRepos) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <button
              onClick={() => setShowGitHubRepos(false)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
            >
              <span>← Back to Dashboard</span>
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              Import from GitHub
            </h1>
            <p className="text-gray-600 mt-2">
              Select a repository to create a demo video from your existing code.
            </p>
          </div>
          <GitHubConnect onRepositorySelect={handleRepositorySelect} />
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back, {profile?.full_name || 'Developer'}!
              </h1>
              <p className="text-gray-600">
                Create compelling demo videos from your code in minutes.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {pendingTavusProjects > 0 && (
                <button 
                  onClick={manualTavusSync}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Check Tavus ({pendingTavusProjects})</span>
                </button>
              )}
              <button 
                onClick={() => setShowGitHubRepos(true)}
                className="bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
              >
                <Github className="h-5 w-5" />
                <span>Import from GitHub</span>
              </button>
              <button 
                onClick={() => setShowCreateProject(true)}
                disabled={!canCreateMore}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-5 w-5" />
                <span>New Demo</span>
              </button>
            </div>
          </div>
          
          {!canCreateMore && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800">
                You've reached your monthly limit of {limits.videos} videos. 
                <a href="#pricing" className="font-medium underline ml-1">Upgrade your plan</a> to create more demos.
              </p>
            </div>
          )}

          {pendingTavusProjects > 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-800 font-medium">
                    🎬 {pendingTavusProjects} video{pendingTavusProjects > 1 ? 's' : ''} may be ready from Tavus
                  </p>
                  <p className="text-blue-600 text-sm">
                    Videos are automatically checked when you open the dashboard. Click "Check Tavus" to manually sync now.
                  </p>
                </div>
                <button 
                  onClick={manualTavusSync}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Check Now</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Videos Created</p>
                <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
              </div>
              <Video className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Limit</p>
                <p className="text-2xl font-bold text-gray-900">
                  {typeof limits.videos === 'number' ? `${limits.used}/${limits.videos}` : limits.videos}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Plan</p>
                <p className="text-2xl font-bold text-gray-900 capitalize">
                  {profile?.subscription_tier || 'Free'}
                </p>
              </div>
              <Settings className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">GitHub</p>
                <p className="text-sm font-bold text-gray-900">
                  {profile?.github_username ? 'Connected' : 'Not Connected'}
                </p>
              </div>
              <Github className="h-8 w-8 text-gray-600" />
            </div>
          </div>
        </div>

        {/* GitHub Integration Section */}
        {!profile?.github_username && (
          <div className="mb-8">
            <GitHubConnect showRepositories={false} />
          </div>
        )}

        {/* Projects */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Your Demo Videos</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>{projects.filter(p => p.status === 'processing').length} processing</span>
                <span>•</span>
                <span>{projects.filter(p => p.status === 'completed').length} completed</span>
                {checkingTavus.size > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600">{checkingTavus.size} checking tavus</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {projects.length === 0 ? (
            <div className="p-12 text-center">
              <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No demo videos yet</h3>
              <p className="text-gray-600 mb-6">
                Create your first AI-powered demo video from your code snippet or import from GitHub.
              </p>
              <div className="flex items-center justify-center space-x-4">
                <button 
                  onClick={() => setShowCreateProject(true)}
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="h-5 w-5" />
                  <span>Create Your First Demo</span>
                </button>
                <button 
                  onClick={() => setShowGitHubRepos(true)}
                  className="bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
                >
                  <Github className="h-5 w-5" />
                  <span>Import from GitHub</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {projects.map((project) => (
                <div key={project.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {project.title}
                        </h3>
                        {getStatusIcon(project.status, project.id)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status, project.id)}`}>
                          {getStatusText(project.status, project.id)}
                        </span>
                        {project.tavus_video_id && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Tavus: {project.tavus_video_id}
                          </span>
                        )}
                      </div>
                      
                      {project.description && (
                        <p className="text-gray-600 mb-3">{project.description}</p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                        <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {/* Live Conversation Button */}
                      <button 
                        onClick={() => startLiveConversation(project)}
                        className="flex items-center space-x-1 px-3 py-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                        title="Start live conversation about this code"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>Chat</span>
                      </button>
                      
                      {project.status === 'completed' && project.video_url && (
                        <button 
                          onClick={() => window.open(project.video_url, '_blank')}
                          className="flex items-center space-x-1 px-3 py-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                          <Play className="h-4 w-4" />
                          <span>Watch</span>
                        </button>
                      )}
                      
                      {project.status === 'completed' && (
                        <button className="flex items-center space-x-1 px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors">
                          <Share2 className="h-4 w-4" />
                          <span>Share</span>
                        </button>
                      )}
                      
                      <button className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                        <Eye className="h-4 w-4" />
                        <span>View</span>
                      </button>
                      
                      <button className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                        <Edit className="h-4 w-4" />
                        <span>Edit</span>
                      </button>
                      
                      {(project.status === 'failed' || (project.status === 'processing' && project.tavus_video_id)) && (
                        <button 
                          onClick={() => retryProject(project.id)}
                          className="flex items-center space-x-1 px-3 py-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
                        >
                          <RefreshCw className="h-4 w-4" />
                          <span>Check Tavus</span>
                        </button>
                      )}
                      
                      <button 
                        onClick={() => deleteProject(project.id)}
                        className="flex items-center space-x-1 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                  
                  {project.status === 'processing' && (
                    <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
                        <span className="text-sm text-yellow-800">
                          {checkingTavus.has(project.id) 
                            ? '🎬 Checking Tavus for completed video...'
                            : project.tavus_video_id 
                              ? '📹 Video is being generated by Tavus. Checking automatically...'
                              : '🤖 AI is analyzing your code and generating your demo video. This usually takes 2-5 minutes.'
                          }
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {project.status === 'failed' && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-red-800">
                            {project.tavus_video_id 
                              ? '🎬 Video may be ready on Tavus. Click "Check Tavus" to fetch it.'
                              : '❌ Failed to generate video. Please try again or contact support.'
                            }
                          </span>
                          {project.tavus_video_id && (
                            <p className="text-xs text-red-600 mt-1">
                              Tavus Video ID: {project.tavus_video_id}
                            </p>
                          )}
                        </div>
                        <button 
                          onClick={() => retryProject(project.id)}
                          className="text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          Check Tavus
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live Conversation Modal */}
      {showLiveConversation && conversationProject && (
        <LiveConversation
          projectId={conversationProject.id}
          codeSnippet={conversationProject.code_snippet}
          title={conversationProject.title}
          onClose={() => {
            setShowLiveConversation(false)
            setConversationProject(null)
          }}
        />
      )}
    </div>
  )
}

export default Dashboard