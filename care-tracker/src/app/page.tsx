'use client'

import { useEffect, useState } from 'react'
import { useCareStore } from '@/store/careStore'
import { TimelineView } from '@/components/timeline/TimelineView'
import { AllTasksView } from '@/components/tasks/AllTasksView'
import { ProgressView } from '@/components/progress/ProgressView'
import { ProfileView } from '@/components/profile/ProfileView'
import { BottomNavigation, NavigationTab } from '@/components/navigation/BottomNavigation'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function HomePage() {
  const { isOnboarded, isLoading, initializeStore } = useCareStore()
  const [activeTab, setActiveTab] = useState<NavigationTab>('timeline')

  useEffect(() => {
    initializeStore()
  }, [initializeStore])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isOnboarded) {
    return <OnboardingFlow />
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'timeline':
        return <TimelineView />
      case 'tasks':
        return <AllTasksView />
      case 'progress':
        return <ProgressView />
      case 'profile':
        return <ProfileView />
      default:
        return <TimelineView />
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="app-content">
        {renderActiveView()}
      </div>
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </main>
  )
}