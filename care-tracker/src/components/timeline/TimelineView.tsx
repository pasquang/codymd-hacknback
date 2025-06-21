'use client'

import { useState, useEffect } from 'react'
import { Gear, Pill, FirstAid, Person, Bandaids, Drop, Car, ChartLine, Books, NotePencil, Warning, Clock, Shower } from 'phosphor-react'
import { useCareStore } from '@/store/careStore'
import { TaskStatus, TaskType, TaskActionType } from '@/types'
import { formatDate, formatDuration, getTimeUntil } from '@/lib/utils'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ToastContainer } from '@/components/ui/Toast'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
import { useToast } from '@/hooks/useToast'

export function TimelineView() {
  const {
    tasks,
    userProfile,
    progressStats,
    completeTask,
    skipTask,
    updateProgressStats
  } = useCareStore()
  
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'hourly' | 'daily'>('hourly')
  const [emergencyOpen, setEmergencyOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { toasts, removeToast, success, info } = useToast()

  useEffect(() => {
    updateProgressStats()
  }, [tasks, updateProgressStats])

  const todayTasks = tasks.filter(task => {
    const taskDate = new Date(task.scheduledTime)
    const today = new Date()
    return taskDate.toDateString() === today.toDateString()
  })

  const allDayTasks = todayTasks.filter(task =>
    task.type === TaskType.ACTIVITY_RESTRICTION
  )

  const timedTasks = todayTasks.filter(task =>
    task.type !== TaskType.ACTIVITY_RESTRICTION
  ).sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime())

  const handleCompleteTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    completeTask(taskId)
    
    if (task) {
      success('Task Completed!', `${task.title} has been marked as complete.`)
    }
  }

  const handleSkipTask = (taskId: string) => {
    skipTask(taskId)
  }

  const getTaskTypeIcon = (type: TaskType): JSX.Element => {
    const iconProps = { size: 20, weight: "fill" as const }
    
    const icons = {
      [TaskType.MEDICATION]: <Pill {...iconProps} />,
      [TaskType.APPOINTMENT]: <FirstAid {...iconProps} />,
      [TaskType.EXERCISE]: <Person {...iconProps} />,
      [TaskType.WOUND_CARE]: <Bandaids {...iconProps} />,
      [TaskType.DIET]: <Drop {...iconProps} />,
      [TaskType.ACTIVITY_RESTRICTION]: <Car {...iconProps} />,
      [TaskType.MONITORING]: <ChartLine {...iconProps} />,
      [TaskType.EDUCATION]: <Books {...iconProps} />,
      [TaskType.OTHER]: <NotePencil {...iconProps} />
    }
    return icons[type] || <NotePencil {...iconProps} />
  }

  const getActivityCardClass = (task: any) => {
    if (task.type === TaskType.ACTIVITY_RESTRICTION) return 'activity-card cannot-do'
    if (task.actionType === TaskActionType.DO_NOT) return 'activity-card caution'
    return 'activity-card can-do'
  }

  const getActivityIconClass = (task: any) => {
    if (task.type === TaskType.ACTIVITY_RESTRICTION) return 'activity-icon icon-cannot'
    if (task.actionType === TaskActionType.DO_NOT) return 'activity-icon icon-caution'
    return 'activity-icon icon-can'
  }

  const getCurrentTime = () => {
    const now = new Date()
    return now.getHours()
  }

  const getTimeMarkerClass = (hour: number) => {
    const currentHour = getCurrentTime()
    if (hour < currentHour) return 'time-dot completed'
    if (hour === currentHour) return 'time-dot current'
    return 'time-dot'
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const daysSinceProcedure = Math.floor((Date.now() - new Date(userProfile.dischargeDate).getTime()) / (1000 * 60 * 60 * 24)) + 1

  return (
    <div className="timeline-container">
      {/* Header with Progress */}
      <div className="header">
        <div className="flex justify-between items-start">
          <div>
            <div className="procedure-info">{userProfile.procedure}</div>
            <h1>Your Recovery Timeline</h1>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="settings-btn"
            aria-label="Open settings"
          >
            <Gear size={24} weight="regular" />
          </button>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progressStats.completionRate}%` }}></div>
        </div>
        <div className="progress-text">
          Day {daysSinceProcedure} of 7 - {daysSinceProcedure === 1 ? 'First 24 hours are critical' : 'Recovery in progress'}
        </div>
      </div>

      {/* Emergency Information */}
      <div className="emergency-section">
        <div className="emergency-header" onClick={() => setEmergencyOpen(!emergencyOpen)}>
          <h3>
            <Warning size={20} weight="fill" color="#ef4444" />
            Emergency Warning Signs - Call 911
          </h3>
          <span>{emergencyOpen ? '▲' : '▼'}</span>
        </div>
        {emergencyOpen && (
          <div className="emergency-content">
            <p><strong>Call 911 immediately if you experience:</strong></p>
            <ul>
              <li>Sudden chest pain</li>
              <li>Shortness of breath or trouble breathing</li>
              <li>Feeling light-headed, dizzy, or breaking out in cold sweat</li>
              <li>Irregular heartbeats (heart palpitations)</li>
              <li>Severe itching anywhere on your body</li>
              <li>Sudden or large amount of bleeding/swelling at procedure site</li>
              <li>Leg becomes cold, blue, or numb compared to other leg</li>
            </ul>
            <div className="emergency-number">Emergency: Call 911</div>
            <p style={{ marginTop: '15px' }}><strong>Call your doctor for:</strong></p>
            <ul>
              <li>Temperature higher than 100.5°F for more than 24 hours</li>
              <li>Increased pain not relieved by Tylenol</li>
              <li>Yellow/green drainage at procedure site</li>
            </ul>
          </div>
        )}
      </div>

      {/* Timeline Controls */}
      <div className="timeline-controls">
        <div className="date-selector">
          <button className="date-btn" disabled>←</button>
          <div className="current-date">Today (Day {daysSinceProcedure})</div>
          <button className="date-btn">→</button>
        </div>
        <div className="view-toggle">
          <button
            className={`view-btn ${viewMode === 'hourly' ? 'active' : ''}`}
            onClick={() => setViewMode('hourly')}
          >
            Hourly
          </button>
          <button
            className={`view-btn ${viewMode === 'daily' ? 'active' : ''}`}
            onClick={() => setViewMode('daily')}
          >
            Daily
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="timeline">
        <div className="timeline-line"></div>
        
        {/* Day Summary */}
        <div className="day-summary">
          <h3>First 24 Hours - Critical Recovery Period</h3>
          <p style={{ fontSize: '14px', opacity: 0.9 }}>You must have someone stay with you today</p>
          <div className="summary-stats">
            <div className="stat">
              <div className="stat-number">8</div>
              <div className="stat-label">Glasses of Water</div>
            </div>
            <div className="stat">
              <div className="stat-number">24h</div>
              <div className="stat-label">No Driving</div>
            </div>
            <div className="stat">
              <div className="stat-number">10lbs</div>
              <div className="stat-label">Max Lifting</div>
            </div>
          </div>
        </div>

        {/* All Day Restrictions */}
        {allDayTasks.length > 0 && (
          <div className="all-day-section">
            <div className="all-day-header">
              <Clock size={20} weight="fill" />
              All Day Restrictions (Next 24 Hours)
            </div>
            {allDayTasks.map((task) => (
              <ActivityCard
                key={task.id}
                task={task}
                onComplete={handleCompleteTask}
                onSkip={handleSkipTask}
                getTaskTypeIcon={getTaskTypeIcon}
                getActivityCardClass={getActivityCardClass}
                getActivityIconClass={getActivityIconClass}
              />
            ))}
          </div>
        )}

        {/* Hourly Timeline */}
        {viewMode === 'hourly' && timedTasks.map((task) => {
          const taskTime = new Date(task.scheduledTime)
          const hour = taskTime.getHours()
          
          return (
            <div key={task.id} className="time-marker">
              <div className="time-label">{formatTime(taskTime)}</div>
              <div className={getTimeMarkerClass(hour)}></div>
              
              <ActivityCard
                task={task}
                onComplete={handleCompleteTask}
                onSkip={handleSkipTask}
                getTaskTypeIcon={getTaskTypeIcon}
                getActivityCardClass={getActivityCardClass}
                getActivityIconClass={getActivityIconClass}
              />
            </div>
          )
        })}

        {/* Daily View */}
        {viewMode === 'daily' && (
          <div className="time-marker">
            <div className="time-label">Today</div>
            <div className="time-dot current"></div>
            
            {timedTasks.map((task) => (
              <ActivityCard
                key={task.id}
                task={task}
                onComplete={handleCompleteTask}
                onSkip={handleSkipTask}
                getTaskTypeIcon={getTaskTypeIcon}
                getActivityCardClass={getActivityCardClass}
                getActivityIconClass={getActivityIconClass}
              />
            ))}
          </div>
        )}

        {/* Tomorrow Preview */}
        <div className="time-marker" style={{ opacity: 0.5 }}>
          <div className="time-label">Tomorrow</div>
          <div className="time-dot"></div>
          
          <div className="activity-card can-do">
            <div className="activity-header">
              <div className="activity-title">
                <div className="activity-icon icon-can">
                  <Shower size={20} weight="fill" />
                </div>
                First Shower (24h)
              </div>
            </div>
            <div className="activity-description">
              After 24 hours, you can shower. Remove bandage, wash with mild soap, pat dry, apply new bandage.
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}

interface ActivityCardProps {
  task: any
  onComplete: (taskId: string) => void
  onSkip: (taskId: string) => void
  getTaskTypeIcon: (type: TaskType) => JSX.Element
  getActivityCardClass: (task: any) => string
  getActivityIconClass: (task: any) => string
}

function ActivityCard({
  task,
  onComplete,
  onSkip,
  getTaskTypeIcon,
  getActivityCardClass,
  getActivityIconClass
}: ActivityCardProps) {
  const isCompleted = task.status === TaskStatus.COMPLETED
  const isPending = task.status === TaskStatus.PENDING

  return (
    <div className={getActivityCardClass(task)}>
      <div className="activity-header">
        <div className="activity-title">
          <div className={getActivityIconClass(task)}>
            {getTaskTypeIcon(task.type)}
          </div>
          {task.title}
        </div>
        {isPending && (
          <div
            className={`checkbox ${isCompleted ? 'checked' : ''}`}
            onClick={() => onComplete(task.id)}
          ></div>
        )}
      </div>
      <div className="activity-description">
        {task.description}
      </div>
      {task.type === TaskType.ACTIVITY_RESTRICTION && (
        <div className="duration-label">Restriction continues for 7 days</div>
      )}
    </div>
  )
}