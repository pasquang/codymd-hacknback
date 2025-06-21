'use client'

import { useMemo } from 'react'
import { useCareStore } from '@/store/careStore'
import { TaskStatus, TaskType } from '@/types'
import { formatDate } from '@/lib/utils'

export function ProgressView() {
  const { tasks, progressStats, userProfile } = useCareStore()

  const progressData = useMemo(() => {
    const today = new Date()
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      return date
    }).reverse()

    const dailyProgress = last7Days.map(date => {
      const dayTasks = tasks.filter(task => {
        const taskDate = new Date(task.scheduledTime)
        return taskDate.toDateString() === date.toDateString()
      })
      
      const completed = dayTasks.filter(t => t.status === TaskStatus.COMPLETED).length
      const total = dayTasks.length
      
      return {
        date,
        completed,
        total,
        percentage: total > 0 ? (completed / total) * 100 : 0
      }
    })

    const taskTypeBreakdown = Object.values(TaskType).map(type => {
      const typeTasks = tasks.filter(t => t.type === type)
      const completed = typeTasks.filter(t => t.status === TaskStatus.COMPLETED).length
      
      return {
        type,
        total: typeTasks.length,
        completed,
        percentage: typeTasks.length > 0 ? (completed / typeTasks.length) * 100 : 0
      }
    }).filter(item => item.total > 0)

    return { dailyProgress, taskTypeBreakdown }
  }, [tasks])

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

  const getTaskTypeName = (type: TaskType) => {
    const names = {
      [TaskType.MEDICATION]: 'Medication',
      [TaskType.APPOINTMENT]: 'Appointments',
      [TaskType.EXERCISE]: 'Exercise',
      [TaskType.WOUND_CARE]: 'Wound Care',
      [TaskType.DIET]: 'Diet & Hydration',
      [TaskType.ACTIVITY_RESTRICTION]: 'Restrictions',
      [TaskType.MONITORING]: 'Monitoring',
      [TaskType.EDUCATION]: 'Education',
      [TaskType.OTHER]: 'Other'
    }
    return names[type] || 'Other'
  }

  const daysSinceProcedure = userProfile 
    ? Math.floor((Date.now() - new Date(userProfile.dischargeDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 1

  return (
    <div className="progress-container">
      {/* Header */}
      <div className="progress-header">
        <h1>Your Progress</h1>
        <div className="recovery-day">
          Day {daysSinceProcedure} of Recovery
        </div>
      </div>

      {/* Overall Stats */}
      <div className="stats-grid">
        <div className="stat-card completion-rate">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <div className="stat-number">{Math.round(progressStats.completionRate)}%</div>
            <div className="stat-label">Completion Rate</div>
          </div>
        </div>

        <div className="stat-card streak">
          <div className="stat-icon">🔥</div>
          <div className="stat-content">
            <div className="stat-number">{progressStats.streakDays}</div>
            <div className="stat-label">Day Streak</div>
          </div>
        </div>

        <div className="stat-card completed">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">{progressStats.completedTasks}</div>
            <div className="stat-label">Tasks Completed</div>
          </div>
        </div>

        <div className="stat-card total">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <div className="stat-number">{progressStats.totalTasks}</div>
            <div className="stat-label">Total Tasks</div>
          </div>
        </div>
      </div>

      {/* Weekly Progress Chart */}
      <div className="progress-section">
        <h2>7-Day Progress</h2>
        <div className="weekly-chart">
          {progressData.dailyProgress.map((day, index) => (
            <div key={index} className="day-column">
              <div className="day-bar-container">
                <div 
                  className="day-bar"
                  style={{ height: `${Math.max(day.percentage, 5)}%` }}
                >
                  <div className="bar-fill"></div>
                </div>
              </div>
              <div className="day-stats">
                <div className="day-completion">{day.completed}/{day.total}</div>
              </div>
              <div className="day-label">
                {formatDate(day.date, 'short')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Task Type Breakdown */}
      <div className="progress-section">
        <h2>Progress by Category</h2>
        <div className="category-breakdown">
          {progressData.taskTypeBreakdown.map((category) => (
            <div key={category.type} className="category-item">
              <div className="category-header">
                <div className="category-info">
                  <span className="category-icon">{getTaskTypeIcon(category.type)}</span>
                  <span className="category-name">{getTaskTypeName(category.type)}</span>
                </div>
                <div className="category-stats">
                  <span className="category-numbers">{category.completed}/{category.total}</span>
                  <span className="category-percentage">{Math.round(category.percentage)}%</span>
                </div>
              </div>
              <div className="category-progress-bar">
                <div 
                  className="category-progress-fill"
                  style={{ width: `${category.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div className="progress-section">
        <h2>Achievements</h2>
        <div className="achievements-grid">
          <div className={`achievement ${progressStats.completedTasks >= 1 ? 'unlocked' : 'locked'}`}>
            <div className="achievement-icon">🎯</div>
            <div className="achievement-content">
              <div className="achievement-title">First Step</div>
              <div className="achievement-description">Complete your first task</div>
            </div>
          </div>

          <div className={`achievement ${progressStats.streakDays >= 3 ? 'unlocked' : 'locked'}`}>
            <div className="achievement-icon">🔥</div>
            <div className="achievement-content">
              <div className="achievement-title">On Fire</div>
              <div className="achievement-description">3-day completion streak</div>
            </div>
          </div>

          <div className={`achievement ${progressStats.completionRate >= 80 ? 'unlocked' : 'locked'}`}>
            <div className="achievement-icon">⭐</div>
            <div className="achievement-content">
              <div className="achievement-title">Star Patient</div>
              <div className="achievement-description">80% completion rate</div>
            </div>
          </div>

          <div className={`achievement ${progressStats.completedTasks >= 20 ? 'unlocked' : 'locked'}`}>
            <div className="achievement-icon">🏆</div>
            <div className="achievement-content">
              <div className="achievement-title">Champion</div>
              <div className="achievement-description">Complete 20 tasks</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recovery Milestones */}
      <div className="progress-section">
        <h2>Recovery Milestones</h2>
        <div className="milestones-timeline">
          <div className={`milestone ${daysSinceProcedure >= 1 ? 'completed' : 'upcoming'}`}>
            <div className="milestone-marker"></div>
            <div className="milestone-content">
              <div className="milestone-title">Day 1 - First 24 Hours</div>
              <div className="milestone-description">Critical recovery period with close monitoring</div>
            </div>
          </div>

          <div className={`milestone ${daysSinceProcedure >= 3 ? 'completed' : 'upcoming'}`}>
            <div className="milestone-marker"></div>
            <div className="milestone-content">
              <div className="milestone-title">Day 3 - Initial Recovery</div>
              <div className="milestone-description">Basic activities and wound care routine</div>
            </div>
          </div>

          <div className={`milestone ${daysSinceProcedure >= 7 ? 'completed' : 'upcoming'}`}>
            <div className="milestone-marker"></div>
            <div className="milestone-content">
              <div className="milestone-title">Week 1 - Stabilization</div>
              <div className="milestone-description">Return to light daily activities</div>
            </div>
          </div>

          <div className={`milestone ${daysSinceProcedure >= 14 ? 'completed' : 'upcoming'}`}>
            <div className="milestone-marker"></div>
            <div className="milestone-content">
              <div className="milestone-title">Week 2 - Progress Check</div>
              <div className="milestone-description">Follow-up appointment and activity increase</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}