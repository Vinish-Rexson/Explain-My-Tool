import { supabase } from './supabase'

export interface AnalyticsData {
  project_id: string
  views: number
  shares: number
  completion_rate: number
  created_at: string
  updated_at: string
}

export class AnalyticsService {
  static async trackView(projectId: string): Promise<void> {
    try {
      // First, try to get existing analytics
      const { data: existing, error: fetchError } = await supabase
        .from('analytics')
        .select('*')
        .eq('project_id', projectId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError
      }

      if (existing) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('analytics')
          .update({
            views: existing.views + 1,
            updated_at: new Date().toISOString()
          })
          .eq('project_id', projectId)

        if (updateError) throw updateError
      } else {
        // Create new record
        const { error: insertError } = await supabase
          .from('analytics')
          .insert([{
            project_id: projectId,
            views: 1,
            shares: 0,
            completion_rate: 0
          }])

        if (insertError) throw insertError
      }
    } catch (error) {
      console.error('Error tracking view:', error)
    }
  }

  static async trackShare(projectId: string): Promise<void> {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('analytics')
        .select('*')
        .eq('project_id', projectId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError
      }

      if (existing) {
        const { error: updateError } = await supabase
          .from('analytics')
          .update({
            shares: existing.shares + 1,
            updated_at: new Date().toISOString()
          })
          .eq('project_id', projectId)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('analytics')
          .insert([{
            project_id: projectId,
            views: 0,
            shares: 1,
            completion_rate: 0
          }])

        if (insertError) throw insertError
      }
    } catch (error) {
      console.error('Error tracking share:', error)
    }
  }

  static async updateCompletionRate(projectId: string, completionRate: number): Promise<void> {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('analytics')
        .select('*')
        .eq('project_id', projectId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError
      }

      if (existing) {
        const { error: updateError } = await supabase
          .from('analytics')
          .update({
            completion_rate: completionRate,
            updated_at: new Date().toISOString()
          })
          .eq('project_id', projectId)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('analytics')
          .insert([{
            project_id: projectId,
            views: 0,
            shares: 0,
            completion_rate: completionRate
          }])

        if (insertError) throw insertError
      }
    } catch (error) {
      console.error('Error updating completion rate:', error)
    }
  }

  static async getProjectAnalytics(projectId: string): Promise<AnalyticsData | null> {
    try {
      const { data, error } = await supabase
        .from('analytics')
        .select('*')
        .eq('project_id', projectId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return data
    } catch (error) {
      console.error('Error fetching analytics:', error)
      return null
    }
  }

  static async getUserAnalytics(userId: string): Promise<{
    totalViews: number
    totalShares: number
    averageCompletionRate: number
    totalProjects: number
  }> {
    try {
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', userId)

      if (projectsError) throw projectsError

      if (!projects || projects.length === 0) {
        return {
          totalViews: 0,
          totalShares: 0,
          averageCompletionRate: 0,
          totalProjects: 0
        }
      }

      const projectIds = projects.map(p => p.id)

      const { data: analytics, error: analyticsError } = await supabase
        .from('analytics')
        .select('*')
        .in('project_id', projectIds)

      if (analyticsError) throw analyticsError

      if (!analytics || analytics.length === 0) {
        return {
          totalViews: 0,
          totalShares: 0,
          averageCompletionRate: 0,
          totalProjects: projects.length
        }
      }

      const totalViews = analytics.reduce((sum, a) => sum + a.views, 0)
      const totalShares = analytics.reduce((sum, a) => sum + a.shares, 0)
      const averageCompletionRate = analytics.reduce((sum, a) => sum + a.completion_rate, 0) / analytics.length

      return {
        totalViews,
        totalShares,
        averageCompletionRate,
        totalProjects: projects.length
      }
    } catch (error) {
      console.error('Error fetching user analytics:', error)
      return {
        totalViews: 0,
        totalShares: 0,
        averageCompletionRate: 0,
        totalProjects: 0
      }
    }
  }
}