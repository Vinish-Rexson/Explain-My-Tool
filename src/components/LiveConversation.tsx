import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle, Mic, MicOff, Video, VideoOff, Phone, PhoneOff, Send, Loader2, User, Bot } from 'lucide-react'
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
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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

      // Add welcome message
      addMessage('ai', `Hi! I'm here to discuss your ${title} code with you. What would you like to know about this implementation?`)

    } catch (error) {
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
      // Send message to AI conversation endpoint
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/conversation-message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.id,
          message: userMessage,
          codeSnippet,
          title
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
              <h2 className="text-xl font-bold text-gray-900">Live Code Conversation</h2>
              <p className="text-sm text-gray-600">{title}</p>
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
                  <h3 className="text-lg font-semibold mb-2">AI Code Assistant</h3>
                  <p className="text-gray-300 mb-6">Ready to discuss your code</p>
                  
                  {!session && (
                    <button
                      onClick={initializeConversation}
                      disabled={isLoading}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 mx-auto"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <Video className="h-5 w-5" />
                          <span>Start Conversation</span>
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
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        {message.type === 'ai' && (
                          <Bot className="h-4 w-4 mt-0.5 text-purple-600" />
                        )}
                        {message.type === 'user' && (
                          <User className="h-4 w-4 mt-0.5 text-white" />
                        )}
                        <div>
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
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
                    <div className="bg-white text-gray-900 border border-gray-200 px-4 py-2 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Bot className="h-4 w-4 text-purple-600" />
                        <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                        <span className="text-sm">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about the code implementation, best practices, or request explanations..."
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
              
              <div className="mt-2 text-xs text-gray-500">
                Press Enter to send, Shift+Enter for new line
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LiveConversation