import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  CareTask,
  UserProfile,
  TaskStatus,
  TaskType,
  TaskActionType,
  TaskCategory,
  ProgressStats,
  NotificationSettings,
  NotificationMethod,
  TaskFilter,
  CreateCareTaskInput,
  UpdateCareTaskInput
} from '@/types'

interface CareStore {
  // State
  userProfile: UserProfile | null
  tasks: CareTask[]
  isOnboarded: boolean
  isLoading: boolean
  currentFilter: TaskFilter
  notificationSettings: NotificationSettings
  progressStats: ProgressStats

  // Actions
  initializeStore: () => void
  setUserProfile: (profile: UserProfile) => void
  completeOnboarding: () => void
  
  // Task management
  addTask: (task: CreateCareTaskInput) => void
  updateTask: (taskId: string, updates: UpdateCareTaskInput) => void
  deleteTask: (taskId: string) => void
  completeTask: (taskId: string) => void
  skipTask: (taskId: string) => void
  
  // Task filtering and querying
  setTaskFilter: (filter: TaskFilter) => void
  getFilteredTasks: () => CareTask[]
  getTasksByStatus: (status: TaskStatus) => CareTask[]
  getTasksByType: (type: TaskType) => CareTask[]
  getUpcomingTasks: (hours?: number) => CareTask[]
  getOverdueTasks: () => CareTask[]
  
  // Progress tracking
  updateProgressStats: () => void
  getCompletionRate: () => number
  getStreakDays: () => number
  
  // Notifications
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void
  
  // Utility
  resetStore: () => void
  clearAllData: () => void
  loadSampleData: () => void
}

const defaultNotificationSettings: NotificationSettings = {
  enabled: true,
  methods: [NotificationMethod.BROWSER],
  quietHours: {
    start: '22:00',
    end: '07:00'
  },
  reminderAdvance: 15
}

const defaultProgressStats: ProgressStats = {
  totalTasks: 0,
  completedTasks: 0,
  overdueTasks: 0,
  upcomingTasks: 0,
  completionRate: 0,
  streakDays: 0,
  lastActivityDate: new Date()
}

export const useCareStore = create<CareStore>()(
  persist(
    (set, get) => ({
      // Initial state
      userProfile: null,
      tasks: [],
      isOnboarded: false,
      isLoading: true,
      currentFilter: {},
      notificationSettings: defaultNotificationSettings,
      progressStats: defaultProgressStats,

      // Initialize store
      initializeStore: () => {
        const state = get()
        state.updateProgressStats()
        set({ isLoading: false })
      },

      // User profile management
      setUserProfile: (profile: UserProfile) => {
        set({ userProfile: profile })
      },

      completeOnboarding: () => {
        set({ isOnboarded: true })
      },

      // Task management
      addTask: (taskInput: CreateCareTaskInput) => {
        const newTask: CareTask = {
          ...taskInput,
          id: crypto.randomUUID(),
          status: TaskStatus.PENDING,
          completedTime: undefined
        }
        
        set((state) => ({
          tasks: [...state.tasks, newTask]
        }))
        
        get().updateProgressStats()
      },

      updateTask: (taskId: string, updates: UpdateCareTaskInput) => {
        set((state) => ({
          tasks: state.tasks.map(task =>
            task.id === taskId ? { ...task, ...updates } : task
          )
        }))
        
        get().updateProgressStats()
      },

      deleteTask: (taskId: string) => {
        set((state) => ({
          tasks: state.tasks.filter(task => task.id !== taskId)
        }))
        
        get().updateProgressStats()
      },

      completeTask: (taskId: string) => {
        const now = new Date()
        set((state) => ({
          tasks: state.tasks.map(task =>
            task.id === taskId 
              ? { ...task, status: TaskStatus.COMPLETED, completedTime: now }
              : task
          )
        }))
        
        get().updateProgressStats()
      },

      skipTask: (taskId: string) => {
        set((state) => ({
          tasks: state.tasks.map(task =>
            task.id === taskId 
              ? { ...task, status: TaskStatus.SKIPPED }
              : task
          )
        }))
        
        get().updateProgressStats()
      },

      // Task filtering and querying
      setTaskFilter: (filter: TaskFilter) => {
        set({ currentFilter: filter })
      },

      getFilteredTasks: () => {
        const { tasks, currentFilter } = get()
        
        return tasks.filter(task => {
          // Status filter
          if (currentFilter.status && !currentFilter.status.includes(task.status)) {
            return false
          }
          
          // Type filter
          if (currentFilter.type && !currentFilter.type.includes(task.type)) {
            return false
          }
          
          // Priority filter
          if (currentFilter.actionType && !currentFilter.actionType.includes(task.actionType)) {
            return false
          }
          
          // Category filter
          if (currentFilter.category && !currentFilter.category.includes(task.category)) {
            return false
          }
          
          // Date range filter
          if (currentFilter.dateRange) {
            const taskDate = new Date(task.scheduledTime)
            if (taskDate < currentFilter.dateRange.start || taskDate > currentFilter.dateRange.end) {
              return false
            }
          }
          
          return true
        })
      },

      getTasksByStatus: (status: TaskStatus) => {
        return get().tasks.filter(task => task.status === status)
      },

      getTasksByType: (type: TaskType) => {
        return get().tasks.filter(task => task.type === type)
      },

      getUpcomingTasks: (hours = 24) => {
        const now = new Date()
        const futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000)
        
        return get().tasks.filter(task => {
          const taskTime = new Date(task.scheduledTime)
          return taskTime >= now && taskTime <= futureTime && task.status === TaskStatus.PENDING
        })
      },

      getOverdueTasks: () => {
        const now = new Date()
        
        return get().tasks.filter(task => {
          const taskTime = new Date(task.scheduledTime)
          return taskTime < now && task.status === TaskStatus.PENDING
        }).map(task => ({ ...task, status: TaskStatus.OVERDUE }))
      },

      // Progress tracking
      updateProgressStats: () => {
        const { tasks } = get()
        const now = new Date()
        
        const totalTasks = tasks.length
        const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED).length
        const overdueTasks = get().getOverdueTasks().length
        const upcomingTasks = get().getUpcomingTasks().length
        const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
        
        // Calculate streak days
        const completedTasksByDate = tasks
          .filter(t => t.status === TaskStatus.COMPLETED && t.completedTime)
          .sort((a, b) => new Date(b.completedTime!).getTime() - new Date(a.completedTime!).getTime())
        
        let streakDays = 0
        let currentDate = new Date()
        currentDate.setHours(0, 0, 0, 0)
        
        for (let i = 0; i < 30; i++) { // Check last 30 days
          const dayTasks = completedTasksByDate.filter(task => {
            const taskDate = new Date(task.completedTime!)
            taskDate.setHours(0, 0, 0, 0)
            return taskDate.getTime() === currentDate.getTime()
          })
          
          if (dayTasks.length > 0) {
            streakDays++
            currentDate.setDate(currentDate.getDate() - 1)
          } else {
            break
          }
        }
        
        set({
          progressStats: {
            totalTasks,
            completedTasks,
            overdueTasks,
            upcomingTasks,
            completionRate,
            streakDays,
            lastActivityDate: now
          }
        })
      },

      getCompletionRate: () => {
        return get().progressStats.completionRate
      },

      getStreakDays: () => {
        return get().progressStats.streakDays
      },

      // Notifications
      updateNotificationSettings: (settings: Partial<NotificationSettings>) => {
        set((state) => ({
          notificationSettings: { ...state.notificationSettings, ...settings }
        }))
      },

      // Utility
      resetStore: () => {
        set({
          userProfile: null,
          tasks: [],
          isOnboarded: false,
          isLoading: false,
          currentFilter: {},
          notificationSettings: defaultNotificationSettings,
          progressStats: defaultProgressStats
        })
      },

      clearAllData: () => {
        // Clear all data including session storage
        sessionStorage.removeItem('care-tracker-storage')
        set({
          userProfile: null,
          tasks: [],
          isOnboarded: false,
          isLoading: false,
          currentFilter: {},
          notificationSettings: defaultNotificationSettings,
          progressStats: defaultProgressStats
        })
      },

      loadSampleData: () => {
        const { loadSampleTasks } = require('@/data/sampleTasks')
        const sampleTasks = loadSampleTasks()
        set({ tasks: sampleTasks })
        get().updateProgressStats()
      }
    }),
    {
      name: 'care-tracker-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        userProfile: state.userProfile,
        tasks: state.tasks,
        isOnboarded: state.isOnboarded,
        notificationSettings: state.notificationSettings,
        progressStats: state.progressStats
      })
    }
  )
)