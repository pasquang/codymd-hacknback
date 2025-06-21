# Care Tracker - Technical Implementation Plan

## Tech Stack

### Core Technologies
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + tailwindcss-animate
- **State Management**: Zustand (lightweight, TypeScript-friendly)
- **Date/Time**: date-fns
- **Icons**: Lucide React
- **PDF Processing**: PDF.js (client-side preview)
- **Notifications**: Web Push API + react-hot-toast
- **Type Safety**: TypeScript
- **Data Validation**: Zod

### Development Tools
- **Code Quality**: ESLint + Prettier
- **Testing**: Jest + React Testing Library
- **Build**: Turbopack (Next.js built-in)

## Project Structure

```
care-tracker/
├── app/
│   ├── (auth)/
│   │   ├── onboarding/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── timeline/
│   │   │   └── page.tsx
│   │   ├── tasks/
│   │   │   └── page.tsx
│   │   ├── progress/
│   │   │   └── page.tsx
│   │   ├── notifications/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── parse-pdf/
│   │   │   └── route.ts
│   │   └── mock-data/
│   │       └── route.ts
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── timeline/
│   │   ├── TimelineContainer.tsx
│   │   ├── TimeMarker.tsx
│   │   ├── ActivityCard.tsx
│   │   ├── MultiDayBar.tsx
│   │   └── index.ts
│   ├── tasks/
│   │   ├── TaskList.tsx
│   │   ├── TaskCard.tsx
│   │   ├── TaskFilters.tsx
│   │   └── index.ts
│   ├── progress/
│   │   ├── ProgressRing.tsx
│   │   ├── CategoryBreakdown.tsx
│   │   ├── AchievementGrid.tsx
│   │   └── index.ts
│   ├── shared/
│   │   ├── BottomNav.tsx
│   │   ├── Header.tsx
│   │   ├── EmergencyInfo.tsx
│   │   ├── NotificationBadge.tsx
│   │   └── index.ts
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Progress.tsx
│       └── index.ts
├── lib/
│   ├── types/
│   │   ├── timeline.types.ts
│   │   ├── user.types.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── date-helpers.ts
│   │   ├── notification-scheduler.ts
│   │   ├── pdf-parser.ts
│   │   └── storage.ts
│   ├── constants/
│   │   └── index.ts
│   └── hooks/
│       ├── useTimeline.ts
│       ├── useNotifications.ts
│       ├── useSessionStorage.ts
│       └── index.ts
├── store/
│   ├── slices/
│   │   ├── timelineSlice.ts
│   │   ├── userSlice.ts
│   │   ├── notificationSlice.ts
│   │   └── index.ts
│   └── index.ts
└── styles/
    └── globals.css
```

## Data Models

### Core Types (lib/types/timeline.types.ts)

```typescript
// Enums
export enum ActivityType {
  CAN_DO = 'can-do',
  CANNOT_DO = 'cannot-do',
  CAUTION = 'caution'
}

export enum ActivityCategory {
  MEDICATION = 'medication',
  ACTIVITY = 'activity',
  WOUND_CARE = 'wound-care',
  HYDRATION = 'hydration',
  DIET = 'diet',
  MILESTONE = 'milestone'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Main interfaces
export interface TimelineActivity {
  id: string;
  title: string;
  description: string;
  type: ActivityType;
  category: ActivityCategory;
  priority: Priority;
  
  // Timing
  startTime: Date;
  endTime?: Date;
  duration?: number; // in days
  recurringPattern?: RecurringPattern;
  
  // Completion tracking
  isCompletable: boolean;
  isCompleted: boolean;
  completedAt?: Date;
  
  // Additional metadata
  icon?: string;
  notes?: string;
  restrictions?: string[];
  milestoneDay?: number;
}

export interface RecurringPattern {
  frequency: 'daily' | 'hourly' | 'weekly';
  interval: number;
  times?: string[]; // specific times like ["08:00", "14:00", "20:00"]
  endDate?: Date;
}

export interface EmergencyInfo {
  symptoms: string[];
  actions: string;
  phoneNumbers: {
    emergency: string;
    doctor: string;
    afterHours: string;
  };
}

export interface CareDocument {
  id: string;
  fileName: string;
  uploadedAt: Date;
  procedureType: string;
  procedureDate: Date;
  recoveryDuration: number; // in days
  parsedData: {
    activities: TimelineActivity[];
    emergencyInfo: EmergencyInfo;
    metadata: {
      institution: string;
      documentDate: Date;
      version: string;
    };
  };
}
```

### User Types (lib/types/user.types.ts)

```typescript
export interface UserProfile {
  id: string;
  name: string;
  procedureType: string;
  procedureDate: Date;
  createdAt: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  notifications: {
    push: boolean;
    email: boolean;
    sms: boolean;
    quietHours: {
      enabled: boolean;
      start: string; // "22:00"
      end: string;   // "07:00"
    };
    reminderTimes: string[];
  };
  display: {
    theme: 'light' | 'dark' | 'system';
    compactView: boolean;
    showCompletedTasks: boolean;
  };
}

export interface UserProgress {
  totalTasks: number;
  completedTasks: number;
  currentDay: number;
  streakDays: number;
  achievements: Achievement[];
  categoryProgress: Record<ActivityCategory, {
    total: number;
    completed: number;
  }>;
}
```

## State Management (Zustand)

### Store Structure (store/index.ts)

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { TimelineSlice, createTimelineSlice } from './slices/timelineSlice';
import { UserSlice, createUserSlice } from './slices/userSlice';
import { NotificationSlice, createNotificationSlice } from './slices/notificationSlice';

export type StoreState = TimelineSlice & UserSlice & NotificationSlice;

// For demo: Using sessionStorage instead of localStorage
const customSessionStorage = {
  getItem: (name: string) => {
    const value = sessionStorage.getItem(name);
    return value ? JSON.parse(value) : null;
  },
  setItem: (name: string, value: any) => {
    sessionStorage.setItem(name, JSON.stringify(value));
  },
  removeItem: (name: string) => {
    sessionStorage.removeItem(name);
  },
};

export const useStore = create<StoreState>()(
  persist(
    (...args) => ({
      ...createTimelineSlice(...args),
      ...createUserSlice(...args),
      ...createNotificationSlice(...args),
    }),
    {
      name: 'care-tracker-storage',
      storage: createJSONStorage(() => customSessionStorage),
    }
  )
);
```

### Timeline Slice (store/slices/timelineSlice.ts)

```typescript
export interface TimelineSlice {
  // State
  activities: TimelineActivity[];
  currentDate: Date;
  selectedDate: Date;
  viewMode: 'hourly' | 'daily';
  isLoading: boolean;
  
  // Actions
  setActivities: (activities: TimelineActivity[]) => void;
  updateActivity: (id: string, updates: Partial<TimelineActivity>) => void;
  toggleActivityCompletion: (id: string) => void;
  setSelectedDate: (date: Date) => void;
  setViewMode: (mode: 'hourly' | 'daily') => void;
  
  // Computed
  getActivitiesForDate: (date: Date) => TimelineActivity[];
  getUpcomingActivities: (hours: number) => TimelineActivity[];
}
```

## Key Components Implementation

### Timeline Container Component

```typescript
// components/timeline/TimelineContainer.tsx
import { useStore } from '@/store';
import { useMemo } from 'react';
import { format, isToday, startOfDay } from 'date-fns';
import { TimeMarker } from './TimeMarker';
import { ActivityCard } from './ActivityCard';
import { groupActivitiesByTime } from '@/lib/utils/timeline-helpers';

export function TimelineContainer() {
  const { 
    activities, 
    selectedDate, 
    viewMode,
    toggleActivityCompletion 
  } = useStore();
  
  const dayActivities = useMemo(() => {
    return activities.filter(activity => {
      const activityDate = startOfDay(new Date(activity.startTime));
      const selected = startOfDay(selectedDate);
      return activityDate.getTime() === selected.getTime();
    });
  }, [activities, selectedDate]);
  
  const groupedActivities = useMemo(() => {
    return groupActivitiesByTime(dayActivities, viewMode);
  }, [dayActivities, viewMode]);
  
  return (
    <div className="relative">
      <div className="absolute left-10 top-0 bottom-0 w-0.5 bg-gray-200" />
      
      {Object.entries(groupedActivities).map(([time, timeActivities]) => (
        <TimeMarker 
          key={time} 
          time={time} 
          isCurrentTime={isCurrentTimeMarker(time)}
        >
          {timeActivities.map(activity => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              onToggleComplete={() => toggleActivityCompletion(activity.id)}
            />
          ))}
        </TimeMarker>
      ))}
    </div>
  );
}
```

### Custom Hooks

```typescript
// lib/hooks/useTimeline.ts
import { useStore } from '@/store';
import { useEffect, useMemo } from 'react';
import { isWithinInterval, addDays } from 'date-fns';

export function useTimeline() {
  const store = useStore();
  const { activities, currentDate, selectedDate } = store;
  
  // Auto-refresh current time
  useEffect(() => {
    const interval = setInterval(() => {
      store.setCurrentDate(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);
  
  // Calculate progress
  const progress = useMemo(() => {
    const total = activities.length;
    const completed = activities.filter(a => a.isCompleted).length;
    return {
      percentage: total > 0 ? (completed / total) * 100 : 0,
      completed,
      remaining: total - completed
    };
  }, [activities]);
  
  // Get activities by priority
  const criticalActivities = useMemo(() => {
    return activities
      .filter(a => a.priority === Priority.CRITICAL && !a.isCompleted)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }, [activities]);
  
  return {
    ...store,
    progress,
    criticalActivities
  };
}
```

## API Integration

### Mock PDF Parser Response

```typescript
// app/api/parse-pdf/route.ts
export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  // In production: Send to backend service
  // For demo: Return mock parsed data
  
  const mockParsedData: CareDocument = {
    id: generateId(),
    fileName: file.name,
    uploadedAt: new Date(),
    procedureType: 'Heart Catheterization',
    procedureDate: new Date(),
    recoveryDuration: 7,
    parsedData: {
      activities: [
        {
          id: generateId(),
          title: 'No Driving',
          description: 'Do not drive for 24 hours after the procedure',
          type: ActivityType.CANNOT_DO,
          category: ActivityCategory.ACTIVITY,
          priority: Priority.HIGH,
          startTime: new Date(),
          duration: 1,
          isCompletable: true,
          isCompleted: false
        },
        // ... more activities
      ],
      emergencyInfo: {
        symptoms: [
          'Sudden chest pain',
          'Shortness of breath',
          'Bleeding at procedure site'
        ],
        actions: 'Call 911 immediately',
        phoneNumbers: {
          emergency: '911',
          doctor: '(734) 936-7375',
          afterHours: '(734) 936-6267'
        }
      },
      metadata: {
        institution: 'Michigan Medicine',
        documentDate: new Date(),
        version: '2023.04'
      }
    }
  };
  
  return Response.json(mockParsedData);
}
```

## Key Implementation Features

### 1. Notification Scheduler

```typescript
// lib/utils/notification-scheduler.ts
export class NotificationScheduler {
  private static instance: NotificationScheduler;
  private scheduledNotifications: Map<string, NodeJS.Timeout> = new Map();
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new NotificationScheduler();
    }
    return this.instance;
  }
  
  async scheduleActivityReminder(activity: TimelineActivity) {
    // Check if notifications are enabled
    const hasPermission = await this.checkPermission();
    if (!hasPermission) return;
    
    // Calculate notification time (15 minutes before)
    const notifyTime = new Date(activity.startTime);
    notifyTime.setMinutes(notifyTime.getMinutes() - 15);
    
    const delay = notifyTime.getTime() - Date.now();
    if (delay <= 0) return;
    
    const timeout = setTimeout(() => {
      this.showNotification({
        title: `Upcoming: ${activity.title}`,
        body: activity.description,
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        tag: activity.id,
        data: {
          activityId: activity.id,
          url: `/timeline?activity=${activity.id}`
        }
      });
    }, delay);
    
    this.scheduledNotifications.set(activity.id, timeout);
  }
  
  private async showNotification(options: NotificationOptions) {
    if ('Notification' in window) {
      const notification = new Notification(options.title, options);
      
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        if (options.data?.url) {
          window.location.href = options.data.url;
        }
        notification.close();
      };
    }
  }
}
```

### 2. Progress Tracking

```typescript
// lib/utils/progress-tracker.ts
export function calculateDailyProgress(activities: TimelineActivity[]): DailyProgress {
  const todayActivities = activities.filter(a => isToday(a.startTime));
  const completed = todayActivities.filter(a => a.isCompleted);
  
  return {
    date: new Date(),
    totalTasks: todayActivities.length,
    completedTasks: completed.length,
    completionRate: todayActivities.length > 0 
      ? (completed.length / todayActivities.length) * 100 
      : 0,
    categories: groupByCategory(todayActivities)
  };
}

export function calculateStreak(progressHistory: DailyProgress[]): number {
  let streak = 0;
  const sortedHistory = [...progressHistory].sort((a, b) => 
    b.date.getTime() - a.date.getTime()
  );
  
  for (const day of sortedHistory) {
    if (day.completionRate >= 80) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}
```

### 3. Responsive Timeline View

```typescript
// components/timeline/ViewModeToggle.tsx
export function ViewModeToggle() {
  const { viewMode, setViewMode } = useStore();
  const [isMobile] = useMediaQuery('(max-width: 640px)');
  
  return (
    <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
      <button
        onClick={() => setViewMode('hourly')}
        className={cn(
          "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
          viewMode === 'hourly' 
            ? "bg-white text-purple-600 shadow-sm" 
            : "text-gray-600 hover:text-gray-900"
        )}
      >
        {isMobile ? 'Hour' : 'Hourly'}
      </button>
      <button
        onClick={() => setViewMode('daily')}
        className={cn(
          "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
          viewMode === 'daily' 
            ? "bg-white text-purple-600 shadow-sm" 
            : "text-gray-600 hover:text-gray-900"
        )}
      >
        {isMobile ? 'Day' : 'Daily'}
      </button>
    </div>
  );
}
```

## Performance Optimizations

### 1. Code Splitting
```typescript
// Use dynamic imports for heavy components
const ProgressView = dynamic(() => import('@/components/progress/ProgressView'), {
  loading: () => <ProgressSkeleton />
});
```

### 2. Memoization
```typescript
// Expensive calculations cached
const timelineData = useMemo(() => 
  processTimelineData(activities, filters),
  [activities, filters]
);
```

### 3. Virtual Scrolling
```typescript
// For long task lists
import { Virtuoso } from 'react-virtuoso';

<Virtuoso
  data={tasks}
  itemContent={(index, task) => <TaskCard key={task.id} task={task} />}
/>
```

## Deployment Considerations

### Environment Variables
```env
NEXT_PUBLIC_API_URL=https://api.caretracker.com
NEXT_PUBLIC_APP_URL=https://app.caretracker.com
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

### Build Configuration
```javascript
// next.config.js
module.exports = {
  output: 'standalone',
  images: {
    domains: ['caretracker.com'],
  },
  experimental: {
    typedRoutes: true,
  }
};
```

## Testing Strategy

### Unit Tests
```typescript
// __tests__/utils/date-helpers.test.ts
describe('groupActivitiesByTime', () => {
  it('should group activities by hour', () => {
    const activities = [/* test data */];
    const result = groupActivitiesByTime(activities, 'hourly');
    expect(result['08:00']).toHaveLength(2);
  });
});
```

### Integration Tests
```typescript
// __tests__/components/Timeline.test.tsx
describe('Timeline Component', () => {
  it('should display activities for selected date', async () => {
    render(<TimelineContainer />);
    const todayActivities = await screen.findAllByRole('article');
    expect(todayActivities).toHaveLength(5);
  });
});
```

## Demo-Specific Considerations

Since this is for a hackathon demo:

1. **Mock Data**: Pre-populate with realistic sample data
2. **Quick Actions**: Add buttons to simulate time passing
3. **Reset Function**: Clear all data and start fresh
4. **Demo Mode Banner**: Show "Demo Mode" indicator
5. **Shareable State**: Export/import state via URL params

```typescript
// lib/utils/demo-helpers.ts
export function generateDemoData(): CareDocument {
  // Generate realistic demo timeline
}

export function simulateTimeProgress(hours: number) {
  // Fast-forward time for demo
}

export function exportDemoState(): string {
  // Create shareable URL
}
```

This implementation plan provides a solid foundation for building the Care Tracker demo with modern best practices, type safety, and excellent user experience.