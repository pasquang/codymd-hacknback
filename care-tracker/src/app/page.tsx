'use client'

import { useEffect } from 'react'
import { useCareStore } from '@/store/careStore'
import { TimelineView } from '@/components/timeline/TimelineView'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function HomePage() {
  const { isOnboarded, isLoading, initializeStore } = useCareStore()

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

  return (
    <main className="min-h-screen bg-gray-50">
      <TimelineView />
    </main>
  )
}