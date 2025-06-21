'use client'

import { useState, useEffect } from 'react'
import { useCareStore } from '@/store/careStore'
import { UserProfile, NotificationMethod, ReminderFrequency } from '@/types'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PdfUploadZone } from '@/components/pdf/PdfUploadZone'

export function OnboardingFlow() {
  const [currentScreen, setCurrentScreen] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const { setUserProfile, completeOnboarding, loadSampleData } = useCareStore()

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

  const nextScreen = () => {
    if (currentScreen < totalScreens) {
      setCurrentScreen(currentScreen + 1)
    }
  }

  const previousScreen = () => {
    if (currentScreen > 1) {
      setCurrentScreen(currentScreen - 1)
    }
  }

  const skipToBasicInfo = () => {
    setCurrentScreen(3)
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
      
      // Load sample data to populate the timeline immediately
      loadSampleData()
      
      completeOnboarding()
    } catch (error) {
      console.error('Error completing onboarding:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const totalScreens = 4
  const progress = (currentScreen / totalScreens) * 100

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 1:
        return (
          <div className="onboarding-screen">
            <div className="welcome-icon">🏥</div>
            <h1 className="welcome-title">Welcome to Post Pal</h1>
            <p className="welcome-subtitle">Your personal recovery companion that transforms complex medical instructions into simple daily tasks</p>
            
            <div style={{ flex: 1 }}></div>
            
            <div className="button-group">
              <button className="btn btn-primary" onClick={nextScreen}>Get Started</button>
            </div>
          </div>
        )
      
      case 2:
        return (
          <div className="onboarding-screen">
            <div className="step-indicator">
              <div className="step-dot active"></div>
              <div className="step-dot"></div>
              <div className="step-dot"></div>
              <div className="step-dot"></div>
            </div>
            
            <h2 className="welcome-title">How It Works</h2>
            
            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon icon-purple">📄</div>
                <div className="feature-content">
                  <div className="feature-title">Upload Your Instructions</div>
                  <div className="feature-description">Simply upload your discharge papers or care instructions PDF</div>
                </div>
              </div>
              
              <div className="feature-item">
                <div className="feature-icon icon-green">🤖</div>
                <div className="feature-content">
                  <div className="feature-title">Post Pal Creates Your Timeline</div>
                  <div className="feature-description">We'll organize everything into an easy-to-follow daily schedule</div>
                </div>
              </div>
              
              <div className="feature-item">
                <div className="feature-icon icon-orange">🔔</div>
                <div className="feature-content">
                  <div className="feature-title">Get Timely Reminders</div>
                  <div className="feature-description">Never miss a medication, appointment, or important restriction</div>
                </div>
              </div>
            </div>
            
            <div style={{ flex: 1 }}></div>
            
            <div className="button-group">
              <button className="btn btn-secondary" onClick={previousScreen}>Back</button>
              <button className="btn btn-primary" onClick={nextScreen}>Continue</button>
            </div>
          </div>
        )
      
      case 3:
        const canProceed = formData.name && formData.procedure && formData.dischargeDate && formData.dischargeTime
        
        return (
          <div className="onboarding-screen">
            <div className="step-indicator">
              <div className="step-dot"></div>
              <div className="step-dot active"></div>
              <div className="step-dot"></div>
              <div className="step-dot"></div>
            </div>
            
            <h2 className="welcome-title">Let's Get to Know You</h2>
            <p className="welcome-subtitle">This helps us personalize your recovery experience</p>
            
            <form style={{ marginTop: '30px' }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter your first name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Procedure Type</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter your procedure type"
                  value={formData.procedure}
                  onChange={(e) => handleInputChange('procedure', e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Procedure Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.dischargeDate}
                  onChange={(e) => handleInputChange('dischargeDate', e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Procedure Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={formData.dischargeTime}
                  onChange={(e) => handleInputChange('dischargeTime', e.target.value)}
                />
                <p className="form-hint">This helps us track your recovery progress accurately</p>
              </div>
            </form>
            
            <div style={{ flex: 1 }}></div>
            
            <div className="button-group">
              <button className="btn btn-secondary" onClick={previousScreen}>Back</button>
              <button
                className="btn btn-primary"
                onClick={nextScreen}
                disabled={!canProceed}
              >
                Continue
              </button>
            </div>
            <button className="btn-skip" onClick={skipToBasicInfo}>Skip for now</button>
          </div>
        )
      
      case 4:
        return (
          <div className="onboarding-screen">
            <div className="step-indicator">
              <div className="step-dot"></div>
              <div className="step-dot"></div>
              <div className="step-dot active"></div>
              <div className="step-dot"></div>
            </div>
            
            <h2 className="welcome-title">Upload Your Care Instructions</h2>
            <p className="welcome-subtitle">We'll turn your medical documents into an easy-to-follow timeline</p>
            
            <div style={{ marginTop: '30px' }}>
              <PdfUploadZone
                onUploadComplete={(result: any) => {
                  console.log('PDF processing completed:', result)
                  setUploadedFile(result.originalFile || null)
                  handleInputChange('pdfFile', result.originalFile || null)
                }}
                onUploadError={(error: string) => {
                  console.error('PDF upload error:', error)
                }}
                maxFileSize={10 * 1024 * 1024} // 10MB
              />
            </div>
            
            <p style={{ fontSize: '14px', color: '#64748b', textAlign: 'center', marginTop: '20px' }}>
              Your documents are encrypted and secure. We only use them to create your recovery plan.
            </p>
            
            <div style={{ flex: 1 }}></div>
            
            <div className="button-group">
              <button className="btn btn-secondary" onClick={previousScreen}>Back</button>
              <button
                className="btn btn-primary"
                onClick={handleComplete}
                disabled={isLoading}
              >
                {isLoading && <LoadingSpinner size="sm" />}
                Complete Setup
              </button>
            </div>
          </div>
        )
      
      default:
        return (
          <div className="onboarding-screen">
            <div className="welcome-icon">🏥</div>
            <h1 className="welcome-title">Welcome to Post Pal</h1>
            <p className="welcome-subtitle">Your personal recovery companion that transforms complex medical instructions into simple daily tasks</p>
            
            <div style={{ flex: 1 }}></div>
            
            <div className="button-group">
              <button className="btn btn-primary" onClick={nextScreen}>Get Started</button>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="onboarding-container-wrapper">
      <div className="onboarding-container">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        
        <div className="screen active">
          {renderCurrentScreen()}
        </div>
      </div>
    </div>
  )
}