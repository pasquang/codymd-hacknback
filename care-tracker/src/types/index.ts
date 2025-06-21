import { z } from 'zod'

// Core data types
export interface CareTask {
  id: string
  title: string
  description: string
  type: TaskType
  status: TaskStatus
  actionType: TaskActionType
  scheduledTime: Date
  completedTime?: Date
  estimatedDuration: number // in minutes
  instructions: string[]
  reminders: Reminder[]
  dependencies: string[] // task IDs that must be completed first
  category: TaskCategory
  metadata: TaskMetadata
}

export interface Reminder {
  id: string
  taskId: string
  type: ReminderType
  scheduledTime: Date
  message: string
  isActive: boolean
  isSent: boolean
}

export interface UserProfile {
  id: string
  name: string
  dateOfBirth: Date
  procedure: string
  dischargeDate: Date
  emergencyContact: EmergencyContact
  preferences: UserPreferences
  medicalInfo: MedicalInfo
}

export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
  email?: string
}

export interface UserPreferences {
  reminderFrequency: ReminderFrequency
  notificationMethods: NotificationMethod[]
  timeZone: string
  language: string
  accessibilitySettings: AccessibilitySettings
}

export interface AccessibilitySettings {
  highContrast: boolean
  largeText: boolean
  reduceMotion: boolean
  screenReader: boolean
}

export interface MedicalInfo {
  allergies: string[]
  medications: Medication[]
  restrictions: string[]
  doctorContact: DoctorContact
}

export interface Medication {
  name: string
  dosage: string
  frequency: string
  instructions: string
  startDate: Date
  endDate?: Date
}

export interface DoctorContact {
  name: string
  specialty: string
  phone: string
  email?: string
  address?: string
}

export interface TaskMetadata {
  source: string // e.g., "discharge_instructions", "doctor_note"
  confidence: number // 0-1 for AI-extracted tasks
  originalText?: string
  pageNumber?: number
}

export interface ProgressStats {
  totalTasks: number
  completedTasks: number
  overdueTasks: number
  upcomingTasks: number
  completionRate: number
  streakDays: number
  lastActivityDate: Date
}

export interface NotificationSettings {
  enabled: boolean
  methods: NotificationMethod[]
  quietHours: {
    start: string // HH:MM format
    end: string // HH:MM format
  }
  reminderAdvance: number // minutes before task
}

// Enums
export enum TaskType {
  MEDICATION = 'medication',
  APPOINTMENT = 'appointment',
  EXERCISE = 'exercise',
  WOUND_CARE = 'wound_care',
  DIET = 'diet',
  ACTIVITY_RESTRICTION = 'activity_restriction',
  MONITORING = 'monitoring',
  EDUCATION = 'education',
  OTHER = 'other'
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
  OVERDUE = 'overdue'
}

export enum TaskActionType {
  DO = 'do',        // Green - things patient should do
  DO_NOT = 'do_not' // Red - things patient should not do
}

export enum TaskCategory {
  IMMEDIATE = 'immediate', // 0-24 hours
  SHORT_TERM = 'short_term', // 1-7 days
  MEDIUM_TERM = 'medium_term', // 1-4 weeks
  LONG_TERM = 'long_term' // 1+ months
}

export enum ReminderType {
  TASK_DUE = 'task_due',
  MEDICATION = 'medication',
  APPOINTMENT = 'appointment',
  CHECK_IN = 'check_in'
}

export enum ReminderFrequency {
  NONE = 'none',
  MINIMAL = 'minimal',
  NORMAL = 'normal',
  FREQUENT = 'frequent'
}

export enum NotificationMethod {
  BROWSER = 'browser',
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push'
}

// Zod schemas for validation
export const CareTaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string(),
  type: z.nativeEnum(TaskType),
  status: z.nativeEnum(TaskStatus),
  actionType: z.nativeEnum(TaskActionType),
  scheduledTime: z.date(),
  completedTime: z.date().optional(),
  estimatedDuration: z.number().min(1),
  instructions: z.array(z.string()),
  reminders: z.array(z.object({
    id: z.string(),
    taskId: z.string(),
    type: z.nativeEnum(ReminderType),
    scheduledTime: z.date(),
    message: z.string(),
    isActive: z.boolean(),
    isSent: z.boolean()
  })),
  dependencies: z.array(z.string()),
  category: z.nativeEnum(TaskCategory),
  metadata: z.object({
    source: z.string(),
    confidence: z.number().min(0).max(1),
    originalText: z.string().optional(),
    pageNumber: z.number().optional()
  })
})

export const UserProfileSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  dateOfBirth: z.date(),
  procedure: z.string(),
  dischargeDate: z.date(),
  emergencyContact: z.object({
    name: z.string().min(1),
    relationship: z.string(),
    phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/),
    email: z.string().email().optional()
  }),
  preferences: z.object({
    reminderFrequency: z.nativeEnum(ReminderFrequency),
    notificationMethods: z.array(z.nativeEnum(NotificationMethod)),
    timeZone: z.string(),
    language: z.string(),
    accessibilitySettings: z.object({
      highContrast: z.boolean(),
      largeText: z.boolean(),
      reduceMotion: z.boolean(),
      screenReader: z.boolean()
    })
  }),
  medicalInfo: z.object({
    allergies: z.array(z.string()),
    medications: z.array(z.object({
      name: z.string(),
      dosage: z.string(),
      frequency: z.string(),
      instructions: z.string(),
      startDate: z.date(),
      endDate: z.date().optional()
    })),
    restrictions: z.array(z.string()),
    doctorContact: z.object({
      name: z.string(),
      specialty: z.string(),
      phone: z.string(),
      email: z.string().email().optional(),
      address: z.string().optional()
    })
  })
})

// Utility types
export type CreateCareTaskInput = Omit<CareTask, 'id' | 'status' | 'completedTime'>
export type UpdateCareTaskInput = Partial<Omit<CareTask, 'id'>>
export type TaskFilter = {
  status?: TaskStatus[]
  type?: TaskType[]
  actionType?: TaskActionType[]
  category?: TaskCategory[]
  dateRange?: {
    start: Date
    end: Date
  }
}

// API response types
export interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
  errors?: string[]
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}