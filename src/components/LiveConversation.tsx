import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle, Mic, MicOff, Video, VideoOff, Phone, PhoneOff, Send, Loader2, User, Bot, Code, FileText, Lightbulb, Zap } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface LiveConversationProps {
  projectId: string
  codeSnippet: string
  title: string
  onClose: () => void
}

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
}

interface ConversationSession {
  id: string
  status: 'initializing' | 'active' | 'ended' | 'error'
  tavusSessionId?: string
  conversationUrl?: string
}

const LiveConversation: React.FC<LiveConversationProps> = ({ 
  projectId, 
  codeSnippet, 
  title, 
  onClose 
}) => {
  const { user } = useAuth()
  const [session, setSession] = useState<ConversationSession | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [projectDetails, setProjectDetails] = useState<any>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Fetch full project details for enhanced context
    fetchProjectDetails()
  }, [projectId])

  const fetchProjectDetails = async () => {
    try {
      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (!error && project) {
        setProjectDetails(project)
        console.log('📋 Project details loaded for chat:', {
          title: project.title,
          description: project.description,
          status: project.status,
          codeLength: project.code_snippet.length
        })
      }
    } catch (error) {
      console.error('Error fetching project details:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const initializeConversation = async () => {
    if (!user) return

    setIsLoading(true)
    setConnectionStatus('connecting')

    try {
      // Create conversation session in database
      const { data: sessionData, error: sessionError } = await supabase
        .from('conversation_sessions')
        .insert([{
          user_id: user.id,
          project_id: projectId,
          status: 'initializing',
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (sessionError) throw sessionError

      // Initialize Tavus conversation
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-conversation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionData.id,
          codeSnippet,
          title,
          projectId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to initialize conversation')
      }

      const result = await response.json()
      
      const newSession: ConversationSession = {
        id: sessionData.id,
        status: 'active',
        tavusSessionId: result.tavusSessionId,
        conversationUrl: result.conversationUrl
      }

      setSession(newSession)
      setConnectionStatus('connected')

      // Add enhanced welcome message with project context
      const codeLength = projectDetails?.code_snippet?.length || codeSnippet.length
      const welcomeMessage = `Hi! I'm your AI code assistant with full access to your "${title}" project code (${codeLength.toLocaleString()} characters).

I can help you with:
🔍 **Code Analysis** - Explain specific functions, classes, and logic
🛠️ **Implementation Details** - How your code works and why
🐛 **Debugging Help** - Identify issues and suggest fixes  
🚀 **Improvements** - Optimize performance and code quality
📚 **Architecture** - Explain patterns and design decisions
💡 **Extensions** - Add new features to your existing code

I have the complete code context, so feel free to ask detailed questions about any part of your implementation!

What would you like to explore about your ${title} code?`

      addMessage('ai', welcomeMessage)

    } catch (error: any) {
      console.error('Error initializing conversation:', error)
      setConnectionStatus('disconnected')
      addMessage('ai', 'Sorry, I encountered an error starting our conversation. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const addMessage = (type: 'user' | 'ai', content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || !session || !user) return

    const userMessage = inputMessage.trim()
    setInputMessage('')
    addMessage('user', userMessage)

    setIsLoading(true)

    try {
      // Send message to AI conversation endpoint with project ID for database lookup
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/conversation-message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.id,
          message: userMessage,
          codeSnippet: codeSnippet, // Fallback code
          title: title,
          projectId: projectId // This will trigger database lookup for actual code
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const result = await response.json()
      addMessage('ai', result.response)

    } catch (error) {
      console.error('Error sending message:', error)
      addMessage('ai', 'Sorry, I encountered an error processing your message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const endConversation = async () => {
    if (session) {
      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/end-conversation`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: session.id
          })
        })
      } catch (error) {
        console.error('Error ending conversation:', error)
      }
    }
    
    setSession(null)
    setConnectionStatus('disconnected')
    onClose()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-500'
      case 'connecting': return 'text-yellow-500'
      default: return 'text-gray-500'
    }
  }

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected'
      case 'connecting': return 'Connecting...'
      default: return 'Disconnected'
    }
  }

  // Enhanced quick question suggestions based on code analysis
  const quickQuestions = [
    "Explain how this code works",
    "What are the main functions?", 
    "How can I improve this code?",
    "Are there any security issues?",
    "What design patterns are used?",
    "How would I add error handling?",
    "Explain the data flow",
    "What are potential optimizations?"
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-2 rounded-lg">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI Code Expert</h2>
              <p className="text-sm text-gray-600">{title}</p>
              {projectDetails?.description && (
                <p className="text-xs text-gray-500 mt-1">{projectDetails.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${getConnectionStatusColor()}`}>
              <div className="w-2 h-2 rounded-full bg-current"></div>
              <span className="text-sm font-medium">{getConnectionStatusText()}</span>
            </div>
            
            <button
              onClick={endConversation}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <PhoneOff className="h-4 w-4" />
              <span>End</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Video/Avatar Section */}
          <div className="w-1/2 bg-gray-900 relative">
            {session?.conversationUrl ? (
              <iframe
                src={session.conversationUrl}
                className="w-full h-full"
                allow="camera; microphone"
                title="AI Conversation"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-white">
                  <div className="w-24 h-24 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bot className="h-12 w-12" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">AI Code Expert</h3>
                  <p className="text-gray-300 mb-2">Ready to analyze your {title} code</p>
                  <div className="text-sm text-gray-400 mb-6">
                    <div className="flex items-center justify-center space-x-2">
                      <Code className="h-4 w-4" />
                      <span>{(projectDetails?.code_snippet?.length || codeSnippet.length).toLocaleString()} characters loaded</span>
                    </div>
                  </div>
                  
                  {!session && (
                    <button
                      onClick={initializeConversation}
                      disabled={isLoading}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 mx-auto"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Loading Code Context...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="h-5 w-5" />
                          <span>Start Code Analysis</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Video Controls */}
            {session && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-3 rounded-full transition-colors ${
                    isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'
                  } text-white`}
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
                
                <button
                  onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                  className={`p-3 rounded-full transition-colors ${
                    !isVideoEnabled ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'
                  } text-white`}
                >
                  {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </button>
              </div>
            )}
          </div>

          {/* Chat Section */}
          <div className="w-1/2 flex flex-col">
            {/* Messages */}
            <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
              <div className="space-y-4">
                {messages.length === 0 && session && (
                  <div className="text-center py-8">
                    <div className="grid grid-cols-1 gap-2 max-w-sm mx-auto">
                      <div className="flex items-center justify-center space-x-2 mb-4">
                        <Code className="h-5 w-5 text-purple-600" />
                        <p className="text-sm text-gray-600 font-medium">Ask me anything about your code:</p>
                      </div>
                      {quickQuestions.slice(0, 4).map((question, index) => (
                        <button
                          key={index}
                          onClick={() => setInputMessage(question)}
                          className="text-left px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors text-sm text-gray-700"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        {message.type === 'ai' && (
                          <Bot className="h-4 w-4 mt-0.5 text-purple-600 flex-shrink-0" />
                        )}
                        {message.type === 'user' && (
                          <User className="h-4 w-4 mt-0.5 text-white flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                          <p className={`text-xs mt-2 ${
                            message.type === 'user' ? 'text-purple-200' : 'text-gray-500'
                          }`}>
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white text-gray-900 border border-gray-200 px-4 py-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Bot className="h-4 w-4 text-purple-600" />
                        <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                        <span className="text-sm">Analyzing your code and generating response...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Quick Actions */}
            {session && messages.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center space-x-2 overflow-x-auto">
                  <span className="text-xs text-gray-500 whitespace-nowrap">Quick:</span>
                  {quickQuestions.slice(4).map((question, index) => (
                    <button
                      key={index}
                      onClick={() => setInputMessage(question)}
                      className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:bg-purple-50 hover:border-purple-300 transition-colors whitespace-nowrap"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about specific functions, implementation details, improvements, or any code-related questions..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows={2}
                    disabled={!session || isLoading}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || !session || isLoading}
                  className="bg-purple-600 text-white p-3 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>Press Enter to send, Shift+Enter for new line</span>
                {projectDetails && (
                  <div className="flex items-center space-x-2">
                    <Code className="h-3 w-3" />
                    <span>{projectDetails.code_snippet.length.toLocaleString()} chars of code context</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LiveConversation