'use client'

import { useState, useEffect } from 'react'
import { useCareStore } from '@/store/careStore'
import { TaskStatus, TaskType, TaskPriority } from '@/types'
import { formatDate, formatDuration, getTimeUntil } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function TimelineView() {
  const { 
    tasks, 
    userProfile, 
    progressStats, 
    getFilteredTasks, 
    completeTask, 
    skipTask,
    updateProgressStats 
  } = useCareStore()
  
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'today' | 'week' | 'all'>('today')

  useEffect(() => {
    updateProgressStats()
  }, [tasks, updateProgressStats])

  const filteredTasks = getFilteredTasks()
  const todayTasks = tasks.filter(task => {
    const taskDate = new Date(task.scheduledTime)
    const today = new Date()
    return taskDate.toDateString() === today.toDateString()
  })

  const upcomingTasks = tasks.filter(task => {
    const taskDate = new Date(task.scheduledTime)
    const now = new Date()
    return taskDate > now && task.status === TaskStatus.PENDING
  }).slice(0, 5)

  const overdueTasks = tasks.filter(task => {
    const taskDate = new Date(task.scheduledTime)
    const now = new Date()
    return taskDate < now && task.status === TaskStatus.PENDING
  })

  const handleCompleteTask = (taskId: string) => {
    completeTask(taskId)
  }

  const handleSkipTask = (taskId: string) => {
    skipTask(taskId)
  }

  const getTaskTypeIcon = (type: TaskType) => {
    const icons = {
      [TaskType.MEDICATION]: '💊',
      [TaskType.APPOINTMENT]: '🏥',
      [TaskType.EXERCISE]: '🏃',
      [TaskType.WOUND_CARE]: '🩹',
      [TaskType.DIET]: '🥗',
      [TaskType.ACTIVITY_RESTRICTION]: '⚠️',
      [TaskType.MONITORING]: '📊',
      [TaskType.EDUCATION]: '📚',
      [TaskType.OTHER]: '📝'
    }
    return icons[type] || '📝'
  }

  const getPriorityColor = (priority: TaskPriority) => {
    const colors = {
      [TaskPriority.LOW]: 'bg-green-100 text-green-800',
      [TaskPriority.MEDIUM]: 'bg-yellow-100 text-yellow-800',
      [TaskPriority.HIGH]: 'bg-orange-100 text-orange-800',
      [TaskPriority.CRITICAL]: 'bg-red-100 text-red-800'
    }
    return colors[priority]
  }

  const getStatusColor = (status: TaskStatus) => {
    const colors = {
      [TaskStatus.PENDING]: 'bg-blue-100 text-blue-800',
      [TaskStatus.IN_PROGRESS]: 'bg-purple-100 text-purple-800',
      [TaskStatus.COMPLETED]: 'bg-green-100 text-green-800',
      [TaskStatus.SKIPPED]: 'bg-gray-100 text-gray-800',
      [TaskStatus.OVERDUE]: 'bg-red-100 text-red-800'
    }
    return colors[status]
  }

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {userProfile.name}
            </h1>
            <p className="text-gray-600">
              Recovery from {userProfile.procedure}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Progress</div>
            <div className="text-2xl font-bold text-primary-600">
              {Math.round(progressStats.completionRate)}%
            </div>
          </div>
        </div>

        {/* Progress Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">
              {progressStats.completedTasks}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">
              {progressStats.upcomingTasks}
            </div>
            <div className="text-sm text-gray-600">Upcoming</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">
              {progressStats.overdueTasks}
            </div>
            <div className="text-sm text-gray-600">Overdue</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">
              {progressStats.streakDays}
            </div>
            <div className="text-sm text-gray-600">Day Streak</div>
          </div>
        </div>
      </div>

      {/* Overdue Tasks Alert */}
      {overdueTasks.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-600">⚠️</span>
            <h3 className="font-semibold text-red-800">
              {overdueTasks.length} Overdue Task{overdueTasks.length > 1 ? 's' : ''}
            </h3>
          </div>
          <p className="text-red-700 text-sm">
            Please review and complete these tasks as soon as possible.
          </p>
        </div>
      )}

      {/* View Mode Selector */}
      <div className="flex gap-2">
        {(['today', 'week', 'all'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === mode
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {viewMode === 'today' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Today's Tasks ({todayTasks.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {todayTasks.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No tasks scheduled for today. Great job! 🎉
                </div>
              ) : (
                todayTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={handleCompleteTask}
                    onSkip={handleSkipTask}
                    getTaskTypeIcon={getTaskTypeIcon}
                    getPriorityColor={getPriorityColor}
                    getStatusColor={getStatusColor}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {viewMode === 'week' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Upcoming Tasks ({upcomingTasks.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {upcomingTasks.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No upcoming tasks scheduled.
                </div>
              ) : (
                upcomingTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={handleCompleteTask}
                    onSkip={handleSkipTask}
                    getTaskTypeIcon={getTaskTypeIcon}
                    getPriorityColor={getPriorityColor}
                    getStatusColor={getStatusColor}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {viewMode === 'all' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                All Tasks ({filteredTasks.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {filteredTasks.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No tasks found.
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={handleCompleteTask}
                    onSkip={handleSkipTask}
                    getTaskTypeIcon={getTaskTypeIcon}
                    getPriorityColor={getPriorityColor}
                    getStatusColor={getStatusColor}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface TaskCardProps {
  task: any
  onComplete: (taskId: string) => void
  onSkip: (taskId: string) => void
  getTaskTypeIcon: (type: TaskType) => string
  getPriorityColor: (priority: TaskPriority) => string
  getStatusColor: (status: TaskStatus) => string
}

function TaskCard({ 
  task, 
  onComplete, 
  onSkip, 
  getTaskTypeIcon, 
  getPriorityColor, 
  getStatusColor 
}: TaskCardProps) {
  const isCompleted = task.status === TaskStatus.COMPLETED
  const isPending = task.status === TaskStatus.PENDING
  const timeUntil = getTimeUntil(new Date(task.scheduledTime))

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-4">
        <div className="text-2xl">{getTaskTypeIcon(task.type)}</div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className={`font-medium ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                {task.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {task.description}
              </p>
              
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                  {task.status}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDate(new Date(task.scheduledTime), 'time')} • {formatDuration(task.estimatedDuration)}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <div className="text-sm text-gray-500">
                {timeUntil}
              </div>
              
              {isPending && (
                <div className="flex gap-2">
                  <button
                    onClick={() => onSkip(task.id)}
                    className="px-3 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => onComplete(task.id)}
                    className="px-3 py-1 text-xs text-white bg-primary-600 rounded hover:bg-primary-700"
                  >
                    Complete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}