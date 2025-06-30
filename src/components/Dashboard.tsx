import React, { useEffect, useState } from 'react'
import { Plus, Video, BarChart3, Settings, Github, Play, Edit, Trash2, Eye, Share2, Clock, CheckCircle, XCircle, Loader2, MessageCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, Project } from '../lib/supabase'
import CreateProject from './CreateProject'
import LiveConversation from './LiveConversation'

const Dashboard = () => {
  const { user, profile } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showLiveConversation, setShowLiveConversation] = useState(false)
  const [conversationProject, setConversationProject] = useState<Project | null>(null)

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'processing':
        return <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'processing':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
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

  if (showCreateProject) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <CreateProject onBack={() => setShowCreateProject(false)} />
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
            <button 
              onClick={() => setShowCreateProject(true)}
              disabled={!canCreateMore}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-5 w-5" />
              <span>New Demo</span>
            </button>
          </div>
          
          {!canCreateMore && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800">
                You've reached your monthly limit of {limits.videos} videos. 
                <a href="#pricing" className="font-medium underline ml-1">Upgrade your plan</a> to create more demos.
              </p>
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

        {/* Projects */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Your Demo Videos</h2>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>{projects.filter(p => p.status === 'processing').length} processing</span>
                <span>•</span>
                <span>{projects.filter(p => p.status === 'completed').length} completed</span>
              </div>
            </div>
          </div>
          
          {projects.length === 0 ? (
            <div className="p-12 text-center">
              <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No demo videos yet</h3>
              <p className="text-gray-600 mb-6">
                Create your first AI-powered demo video from your code snippet.
              </p>
              <button 
                onClick={() => setShowCreateProject(true)}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 mx-auto"
              >
                <Plus className="h-5 w-5" />
                <span>Create Your First Demo</span>
              </button>
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
                        {getStatusIcon(project.status)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                          {project.status}
                        </span>
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
                          AI is analyzing your code and generating your demo video. This usually takes 2-5 minutes.
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {project.status === 'failed' && (
                    <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-red-800">
                          Failed to generate video. Please try again or contact support.
                        </span>
                        <button className="text-sm text-red-600 hover:text-red-700 font-medium">
                          Retry
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