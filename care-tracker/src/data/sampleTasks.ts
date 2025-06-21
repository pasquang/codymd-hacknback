import {
  CareTask,
  TaskType,
  TaskStatus,
  TaskActionType,
  TaskCategory,
  ReminderType
} from '@/types'

export const sampleTasks: CareTask[] = [
  {
    id: '1',
    title: 'Take Aspirin',
    description: 'Take 81mg aspirin as prescribed to prevent blood clots',
    type: TaskType.MEDICATION,
    status: TaskStatus.PENDING,
    actionType: TaskActionType.DO,
    scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    estimatedDuration: 5,
    instructions: [
      'Take with food to prevent stomach upset',
      'Do not skip doses',
      'Contact doctor if you experience unusual bleeding'
    ],
    reminders: [
      {
        id: 'r1',
        taskId: '1',
        type: ReminderType.MEDICATION,
        scheduledTime: new Date(Date.now() + 1.75 * 60 * 60 * 1000),
        message: 'Time to take your aspirin',
        isActive: true,
        isSent: false
      }
    ],
    dependencies: [],
    category: TaskCategory.IMMEDIATE,
    metadata: {
      source: 'discharge_instructions',
      confidence: 0.95,
      originalText: 'Patient should take 81mg aspirin daily',
      pageNumber: 1
    }
  },
  {
    id: '2',
    title: 'Check Catheter Site',
    description: 'Inspect the catheter insertion site for signs of bleeding or infection',
    type: TaskType.WOUND_CARE,
    status: TaskStatus.PENDING,
    actionType: TaskActionType.DO,
    scheduledTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
    estimatedDuration: 10,
    instructions: [
      'Look for unusual swelling, redness, or warmth',
      'Check for any bleeding or discharge',
      'Keep the area clean and dry',
      'Call doctor immediately if you notice any concerning changes'
    ],
    reminders: [
      {
        id: 'r2',
        taskId: '2',
        type: ReminderType.TASK_DUE,
        scheduledTime: new Date(Date.now() + 3.75 * 60 * 60 * 1000),
        message: 'Time to check your catheter site',
        isActive: true,
        isSent: false
      }
    ],
    dependencies: [],
    category: TaskCategory.IMMEDIATE,
    metadata: {
      source: 'discharge_instructions',
      confidence: 0.98,
      originalText: 'Monitor catheter site every 4 hours for first 24 hours',
      pageNumber: 2
    }
  },
  {
    id: '3',
    title: 'Light Walking',
    description: 'Take a short 5-10 minute walk to promote circulation',
    type: TaskType.EXERCISE,
    status: TaskStatus.COMPLETED,
    actionType: TaskActionType.DO,
    scheduledTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    completedTime: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
    estimatedDuration: 10,
    instructions: [
      'Start slowly and gradually increase pace',
      'Stop if you feel dizzy or short of breath',
      'Avoid stairs for the first 24 hours',
      'Have someone accompany you'
    ],
    reminders: [],
    dependencies: [],
    category: TaskCategory.IMMEDIATE,
    metadata: {
      source: 'discharge_instructions',
      confidence: 0.92,
      originalText: 'Encourage early ambulation to prevent complications',
      pageNumber: 3
    }
  },
  {
    id: '4',
    title: 'Follow-up Appointment',
    description: 'Cardiology follow-up appointment with Dr. Smith',
    type: TaskType.APPOINTMENT,
    status: TaskStatus.PENDING,
    actionType: TaskActionType.DO,
    scheduledTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    estimatedDuration: 60,
    instructions: [
      'Bring all current medications',
      'Prepare list of questions or concerns',
      'Arrive 15 minutes early for check-in',
      'Bring insurance card and ID'
    ],
    reminders: [
      {
        id: 'r4',
        taskId: '4',
        type: ReminderType.APPOINTMENT,
        scheduledTime: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        message: 'Reminder: Cardiology appointment tomorrow',
        isActive: true,
        isSent: false
      }
    ],
    dependencies: [],
    category: TaskCategory.SHORT_TERM,
    metadata: {
      source: 'discharge_instructions',
      confidence: 1.0,
      originalText: 'Schedule follow-up appointment with cardiology in 1 week',
      pageNumber: 4
    }
  },
  {
    id: '5',
    title: 'Drink Plenty of Water',
    description: 'Stay hydrated by drinking 8-10 glasses of water throughout the day',
    type: TaskType.DIET,
    status: TaskStatus.PENDING,
    actionType: TaskActionType.DO,
    scheduledTime: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour from now
    estimatedDuration: 5,
    instructions: [
      'Aim for 8-10 glasses of water daily',
      'Avoid excessive caffeine',
      'Monitor urine color - should be light yellow',
      'Spread water intake throughout the day'
    ],
    reminders: [
      {
        id: 'r5',
        taskId: '5',
        type: ReminderType.TASK_DUE,
        scheduledTime: new Date(Date.now() + 0.75 * 60 * 60 * 1000),
        message: 'Remember to stay hydrated',
        isActive: true,
        isSent: false
      }
    ],
    dependencies: [],
    category: TaskCategory.IMMEDIATE,
    metadata: {
      source: 'discharge_instructions',
      confidence: 0.88,
      originalText: 'Maintain adequate hydration',
      pageNumber: 3
    }
  },
  {
    id: '6',
    title: 'Avoid Heavy Lifting',
    description: 'Do not lift anything heavier than 10 pounds for the next 2 weeks',
    type: TaskType.ACTIVITY_RESTRICTION,
    status: TaskStatus.PENDING,
    actionType: TaskActionType.DO_NOT,
    scheduledTime: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6 hours from now
    estimatedDuration: 1,
    instructions: [
      'No lifting over 10 pounds (4.5 kg)',
      'Avoid pushing or pulling heavy objects',
      'Ask for help with groceries, laundry, etc.',
      'This restriction lasts for 2 weeks'
    ],
    reminders: [],
    dependencies: [],
    category: TaskCategory.SHORT_TERM,
    metadata: {
      source: 'discharge_instructions',
      confidence: 0.96,
      originalText: 'No lifting >10 lbs for 2 weeks post-procedure',
      pageNumber: 2
    }
  }
]

export function loadSampleTasks(): CareTask[] {
  return sampleTasks.map(task => ({
    ...task,
    scheduledTime: new Date(task.scheduledTime),
    completedTime: task.completedTime ? new Date(task.completedTime) : undefined,
    reminders: task.reminders.map(reminder => ({
      ...reminder,
      scheduledTime: new Date(reminder.scheduledTime)
    }))
  }))
}