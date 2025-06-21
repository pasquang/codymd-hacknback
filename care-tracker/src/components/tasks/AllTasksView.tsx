'use client'

import { useState, useMemo } from 'react'
import { useCareStore } from '@/store/careStore'
import { TaskStatus, TaskType, TaskActionType } from '@/types'
import { formatDate } from '@/lib/utils'

export function AllTasksView() {
  const { tasks, completeTask, skipTask, progressStats } = useCareStore()
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')
  const [filterType, setFilterType] = useState<TaskType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Status filter
      if (filterStatus !== 'all' && task.status !== filterStatus) {
        return false
      }
      
      // Type filter
      if (filterType !== 'all' && task.type !== filterType) {
        return false
      }
      
      // Search filter
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !task.description.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      
      return true
    }).sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime())
  }, [tasks, filterStatus, filterType, searchQuery])

  const getTaskTypeIcon = (type: TaskType) => {
    const icons = {
      [TaskType.MEDICATION]: '💊',
      [TaskType.APPOINTMENT]: '🏥',
      [TaskType.EXERCISE]: '🚶',
      [TaskType.WOUND_CARE]: '🩹',
      [TaskType.DIET]: '💧',
      [TaskType.ACTIVITY_RESTRICTION]: '🚗',
      [TaskType.MONITORING]: '📊',
      [TaskType.EDUCATION]: '📚',
      [TaskType.OTHER]: '📝'
    }
    return icons[type] || '📝'
  }

  const getStatusBadge = (status: TaskStatus) => {
    const badges: Record<TaskStatus, { text: string; class: string }> = {
      [TaskStatus.PENDING]: { text: 'Pending', class: 'status-pending' },
      [TaskStatus.IN_PROGRESS]: { text: 'In Progress', class: 'status-in-progress' },
      [TaskStatus.COMPLETED]: { text: 'Completed', class: 'status-completed' },
      [TaskStatus.SKIPPED]: { text: 'Skipped', class: 'status-skipped' },
      [TaskStatus.OVERDUE]: { text: 'Overdue', class: 'status-overdue' }
    }
    return badges[status] || badges[TaskStatus.PENDING]
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getActivityCardClass = (task: any) => {
    if (task.type === TaskType.ACTIVITY_RESTRICTION) return 'task-card cannot-do'
    if (task.actionType === TaskActionType.DO_NOT) return 'task-card caution'
    return 'task-card can-do'
  }

  const getActivityIconClass = (task: any) => {
    if (task.type === TaskType.ACTIVITY_RESTRICTION) return 'task-icon icon-cannot'
    if (task.actionType === TaskActionType.DO_NOT) return 'task-icon icon-caution'
    return 'task-icon icon-can'
  }

  return (
    <div className="all-tasks-container">
      {/* Header */}
      <div className="tasks-header">
        <h1>All Tasks</h1>
        <div className="tasks-stats">
          <div className="stat-item">
            <span className="stat-number">{progressStats.totalTasks}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{progressStats.completedTasks}</span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{progressStats.overdueTasks}</span>
            <span className="stat-label">Overdue</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="tasks-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-group">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as TaskStatus | 'all')}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value={TaskStatus.PENDING}>Pending</option>
            <option value={TaskStatus.COMPLETED}>Completed</option>
            <option value={TaskStatus.SKIPPED}>Skipped</option>
            <option value={TaskStatus.OVERDUE}>Overdue</option>
          </select>
        </div>

        <div className="filter-group">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as TaskType | 'all')}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value={TaskType.MEDICATION}>Medication</option>
            <option value={TaskType.WOUND_CARE}>Wound Care</option>
            <option value={TaskType.EXERCISE}>Exercise</option>
            <option value={TaskType.DIET}>Diet</option>
            <option value={TaskType.ACTIVITY_RESTRICTION}>Restrictions</option>
            <option value={TaskType.MONITORING}>Monitoring</option>
            <option value={TaskType.APPOINTMENT}>Appointments</option>
            <option value={TaskType.EDUCATION}>Education</option>
            <option value={TaskType.OTHER}>Other</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="tasks-list">
        {filteredTasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No tasks found</h3>
            <p>Try adjusting your filters or search query.</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const statusBadge = getStatusBadge(task.status)
            const isPending = task.status === TaskStatus.PENDING
            const isCompleted = task.status === TaskStatus.COMPLETED
            
            return (
              <div key={task.id} className={getActivityCardClass(task)}>
                <div className="task-header">
                  <div className="task-title-section">
                    <div className={getActivityIconClass(task)}>
                      {getTaskTypeIcon(task.type)}
                    </div>
                    <div className="task-info">
                      <h3 className="task-title">{task.title}</h3>
                      <p className="task-time">
                        {formatDate(new Date(task.scheduledTime))} at {formatTime(new Date(task.scheduledTime))}
                      </p>
                    </div>
                  </div>
                  
                  <div className="task-actions">
                    <span className={`status-badge ${statusBadge.class}`}>
                      {statusBadge.text}
                    </span>
                    {isPending && (
                      <div className="task-buttons">
                        <button
                          onClick={() => completeTask(task.id)}
                          className="btn-complete"
                          title="Mark as complete"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => skipTask(task.id)}
                          className="btn-skip"
                          title="Skip task"
                        >
                          ⏭
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="task-description">
                  {task.description}
                </div>
                
                {task.instructions && task.instructions.length > 0 && (
                  <div className="task-instructions">
                    <h4>Instructions:</h4>
                    <ul>
                      {task.instructions.map((instruction, index) => (
                        <li key={index}>{instruction}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {isCompleted && task.completedTime && (
                  <div className="completion-info">
                    Completed on {formatDate(new Date(task.completedTime))} at {formatTime(new Date(task.completedTime))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}