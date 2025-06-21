'use client'

import { useState, useEffect } from 'react'
import { useCareStore } from '@/store/careStore'
import { UserProfile, NotificationMethod, ReminderFrequency } from '@/types'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const { setUserProfile, completeOnboarding } = useCareStore()

  // Get current date and time for defaults
  const getCurrentDateTime = () => {
    const now = new Date()
    const date = now.toISOString().split('T')[0] // YYYY-MM-DD format
    const time = now.toTimeString().slice(0, 5) // HH:MM format
    return { date, time }
  }

  const [formData, setFormData] = useState(() => {
    const { date, time } = getCurrentDateTime()
    return {
      name: '',
      procedure: '',
      dischargeDate: date,
      dischargeTime: time,
      pdfFile: null as File | null
    }
  })

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file)
      handleInputChange('pdfFile', file)
    } else {
      alert('Please select a valid PDF file.')
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)
    
    try {
      // Combine date and time into a single Date object
      const dischargeDateTimeString = `${formData.dischargeDate}T${formData.dischargeTime}:00`
      const dischargeDateTime = new Date(dischargeDateTimeString)

      const userProfile: UserProfile = {
        id: crypto.randomUUID(),
        name: formData.name,
        dateOfBirth: new Date('1980-01-01'), // Default for demo
        procedure: formData.procedure,
        dischargeDate: dischargeDateTime,
        emergencyContact: {
          name: 'Emergency Contact', // Default placeholder
          relationship: 'family',
          phone: '(555) 123-4567'
        },
        preferences: {
          reminderFrequency: ReminderFrequency.NORMAL,
          notificationMethods: [NotificationMethod.BROWSER],
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: 'en',
          accessibilitySettings: {
            highContrast: false,
            largeText: false,
            reduceMotion: false,
            screenReader: false
          }
        },
        medicalInfo: {
          allergies: [],
          medications: [],
          restrictions: [],
          doctorContact: {
            name: 'Dr. Smith', // Default placeholder
            specialty: 'General Medicine',
            phone: '(555) 987-6543'
          }
        }
      }

      setUserProfile(userProfile)
      completeOnboarding()
    } catch (error) {
      console.error('Error completing onboarding:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const steps = [
    {
      title: 'Welcome to Care Tracker',
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Let's get you set up
            </h2>
            <p className="text-gray-600">
              We'll help you organize your recovery journey with a personalized care plan.
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Your Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter your full name"
              />
            </div>
            
            <div>
              <label htmlFor="procedure" className="block text-sm font-medium text-gray-700 mb-1">
                Recent Procedure
              </label>
              <input
                type="text"
                id="procedure"
                value={formData.procedure}
                onChange={(e) => handleInputChange('procedure', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Heart Catheterization"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="dischargeDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Discharge Date
                </label>
                <input
                  type="date"
                  id="dischargeDate"
                  value={formData.dischargeDate}
                  onChange={(e) => handleInputChange('dischargeDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div>
                <label htmlFor="dischargeTime" className="block text-sm font-medium text-gray-700 mb-1">
                  Discharge Time
                </label>
                <input
                  type="time"
                  id="dischargeTime"
                  value={formData.dischargeTime}
                  onChange={(e) => handleInputChange('dischargeTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Upload Discharge Instructions',
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Upload Your PDF
            </h2>
            <p className="text-gray-600">
              Upload your discharge instructions PDF to automatically generate your care timeline.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 text-gray-400">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                
                <div>
                  <label htmlFor="pdfUpload" className="cursor-pointer">
                    <span className="text-primary-600 hover:text-primary-700 font-medium">
                      Click to upload
                    </span>
                    <span className="text-gray-500"> or drag and drop</span>
                  </label>
                  <input
                    type="file"
                    id="pdfUpload"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <p className="text-sm text-gray-500 mt-1">PDF files only</p>
                </div>
                
                {uploadedFile && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-800">
                          {uploadedFile.name}
                        </p>
                        <p className="text-sm text-green-600">
                          File uploaded successfully
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> Your PDF will be processed to extract care instructions and create a personalized timeline. This may take a few moments.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ]

  const currentStepData = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1
  const canProceed = currentStep === 0
    ? formData.name && formData.procedure && formData.dischargeDate && formData.dischargeTime
    : uploadedFile !== null

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-500">Step {currentStep + 1} of {steps.length}</span>
            <span className="text-sm text-gray-500">{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="mb-8">
          {currentStepData.content}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="px-4 py-2 text-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          {isLastStep ? (
            <button
              onClick={handleComplete}
              disabled={!canProceed || isLoading}
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading && <LoadingSpinner size="sm" />}
              Complete Setup
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canProceed}
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  )
}