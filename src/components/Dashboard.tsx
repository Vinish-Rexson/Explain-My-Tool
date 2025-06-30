import React, { useEffect, useState } from 'react'
import { Plus, Video, BarChart3, Settings, Github } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, Project } from '../lib/supabase'

const Dashboard = () => {
  const { user, profile } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchProjects()
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
            <button className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>New Demo</span>
            </button>
          </div>
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
            <h2 className="text-xl font-semibold text-gray-900">Your Demo Videos</h2>
          </div>
          
          {projects.length === 0 ? (
            <div className="p-12 text-center">
              <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No demo videos yet</h3>
              <p className="text-gray-600 mb-6">
                Create your first AI-powered demo video from your code snippet.
              </p>
              <button className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 mx-auto">
                <Plus className="h-5 w-5" />
                <span>Create Your First Demo</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {projects.map((project) => (
                <div key={project.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        {project.title}
                      </h3>
                      {project.description && (
                        <p className="text-gray-600 mb-2">{project.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                          {project.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {project.video_url && (
                        <button className="text-purple-600 hover:text-purple-700 font-medium">
                          View Video
                        </button>
                      )}
                      <button className="text-gray-600 hover:text-gray-900">
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard