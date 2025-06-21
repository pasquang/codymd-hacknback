'use client'

import { useState } from 'react'
import { useCareStore } from '@/store/careStore'
import { formatDate } from '@/lib/utils'

export function ProfileView() {
  const { userProfile, notificationSettings, updateNotificationSettings, clearAllData } = useCareStore()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!userProfile) {
    return (
      <div className="profile-container">
        <div className="empty-state">
          <div className="empty-icon">👤</div>
          <h3>No Profile Found</h3>
          <p>Please complete the onboarding process.</p>
        </div>
      </div>
    )
  }

  const handleNotificationToggle = (setting: keyof typeof notificationSettings, value: any) => {
    updateNotificationSettings({ [setting]: value })
  }

  const handleDeleteAllData = () => {
    if (showDeleteConfirm) {
      clearAllData()
      setShowDeleteConfirm(false)
    } else {
      setShowDeleteConfirm(true)
    }
  }

  const daysSinceProcedure = Math.floor((Date.now() - new Date(userProfile.dischargeDate).getTime()) / (1000 * 60 * 60 * 24)) + 1

  return (
    <div className="profile-container">
      {/* Header */}
      <div className="profile-header">
        <div className="profile-avatar">
          <span className="avatar-icon">👤</span>
        </div>
        <div className="profile-info">
          <h1>{userProfile.name}</h1>
          <p className="profile-subtitle">Day {daysSinceProcedure} of Recovery</p>
        </div>
      </div>

      {/* Medical Information */}
      <div className="profile-section">
        <h2>Medical Information</h2>
        <div className="info-grid">
          <div className="info-item">
            <div className="info-label">Procedure</div>
            <div className="info-value">{userProfile.procedure}</div>
          </div>
          
          <div className="info-item">
            <div className="info-label">Discharge Date</div>
            <div className="info-value">{formatDate(new Date(userProfile.dischargeDate), 'long')}</div>
          </div>
          
          <div className="info-item">
            <div className="info-label">Date of Birth</div>
            <div className="info-value">{formatDate(new Date(userProfile.dateOfBirth), 'long')}</div>
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="profile-section">
        <h2>Emergency Contact</h2>
        <div className="contact-card">
          <div className="contact-header">
            <div className="contact-icon">📞</div>
            <div className="contact-info">
              <div className="contact-name">{userProfile.emergencyContact.name}</div>
              <div className="contact-relationship">{userProfile.emergencyContact.relationship}</div>
            </div>
          </div>
          <div className="contact-details">
            <div className="contact-phone">
              <span className="contact-label">Phone:</span>
              <a href={`tel:${userProfile.emergencyContact.phone}`} className="contact-link">
                {userProfile.emergencyContact.phone}
              </a>
            </div>
            {userProfile.emergencyContact.email && (
              <div className="contact-email">
                <span className="contact-label">Email:</span>
                <a href={`mailto:${userProfile.emergencyContact.email}`} className="contact-link">
                  {userProfile.emergencyContact.email}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Doctor Contact */}
      <div className="profile-section">
        <h2>Doctor Information</h2>
        <div className="contact-card">
          <div className="contact-header">
            <div className="contact-icon">🏥</div>
            <div className="contact-info">
              <div className="contact-name">{userProfile.medicalInfo.doctorContact.name}</div>
              <div className="contact-relationship">{userProfile.medicalInfo.doctorContact.specialty}</div>
            </div>
          </div>
          <div className="contact-details">
            <div className="contact-phone">
              <span className="contact-label">Phone:</span>
              <a href={`tel:${userProfile.medicalInfo.doctorContact.phone}`} className="contact-link">
                {userProfile.medicalInfo.doctorContact.phone}
              </a>
            </div>
            {userProfile.medicalInfo.doctorContact.email && (
              <div className="contact-email">
                <span className="contact-label">Email:</span>
                <a href={`mailto:${userProfile.medicalInfo.doctorContact.email}`} className="contact-link">
                  {userProfile.medicalInfo.doctorContact.email}
                </a>
              </div>
            )}
            {userProfile.medicalInfo.doctorContact.address && (
              <div className="contact-address">
                <span className="contact-label">Address:</span>
                <span>{userProfile.medicalInfo.doctorContact.address}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Medications */}
      {userProfile.medicalInfo.medications.length > 0 && (
        <div className="profile-section">
          <h2>Current Medications</h2>
          <div className="medications-list">
            {userProfile.medicalInfo.medications.map((medication, index) => (
              <div key={index} className="medication-card">
                <div className="medication-header">
                  <div className="medication-icon">💊</div>
                  <div className="medication-info">
                    <div className="medication-name">{medication.name}</div>
                    <div className="medication-dosage">{medication.dosage}</div>
                  </div>
                </div>
                <div className="medication-details">
                  <div className="medication-frequency">
                    <span className="detail-label">Frequency:</span>
                    <span>{medication.frequency}</span>
                  </div>
                  {medication.instructions && (
                    <div className="medication-instructions">
                      <span className="detail-label">Instructions:</span>
                      <span>{medication.instructions}</span>
                    </div>
                  )}
                  <div className="medication-dates">
                    <span className="detail-label">Duration:</span>
                    <span>
                      {formatDate(new Date(medication.startDate), 'short')}
                      {medication.endDate && ` - ${formatDate(new Date(medication.endDate), 'short')}`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Allergies */}
      {userProfile.medicalInfo.allergies.length > 0 && (
        <div className="profile-section">
          <h2>Allergies</h2>
          <div className="allergies-list">
            {userProfile.medicalInfo.allergies.map((allergy, index) => (
              <div key={index} className="allergy-tag">
                <span className="allergy-icon">⚠️</span>
                <span>{allergy}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notification Settings */}
      <div className="profile-section">
        <h2>Notification Settings</h2>
        <div className="settings-list">
          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-label">Enable Notifications</div>
              <div className="setting-description">Receive reminders for tasks and appointments</div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={notificationSettings.enabled}
                onChange={(e) => handleNotificationToggle('enabled', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-label">Reminder Advance Time</div>
              <div className="setting-description">How many minutes before tasks to remind you</div>
            </div>
            <select
              value={notificationSettings.reminderAdvance}
              onChange={(e) => handleNotificationToggle('reminderAdvance', parseInt(e.target.value))}
              className="setting-select"
            >
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
            </select>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-label">Quiet Hours</div>
              <div className="setting-description">No notifications during these hours</div>
            </div>
            <div className="quiet-hours">
              <input
                type="time"
                value={notificationSettings.quietHours.start}
                onChange={(e) => handleNotificationToggle('quietHours', {
                  ...notificationSettings.quietHours,
                  start: e.target.value
                })}
                className="time-input"
              />
              <span>to</span>
              <input
                type="time"
                value={notificationSettings.quietHours.end}
                onChange={(e) => handleNotificationToggle('quietHours', {
                  ...notificationSettings.quietHours,
                  end: e.target.value
                })}
                className="time-input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="profile-section">
        <h2>Data Management</h2>
        <div className="data-actions">
          <button
            onClick={handleDeleteAllData}
            className={`delete-btn ${showDeleteConfirm ? 'confirm' : ''}`}
          >
            {showDeleteConfirm ? 'Confirm Delete All Data' : 'Delete All Data'}
          </button>
          {showDeleteConfirm && (
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="cancel-btn"
            >
              Cancel
            </button>
          )}
        </div>
        {showDeleteConfirm && (
          <div className="delete-warning">
            <p>⚠️ This will permanently delete all your data including tasks, progress, and profile information. This action cannot be undone.</p>
          </div>
        )}
      </div>

      {/* App Information */}
      <div className="profile-section">
        <h2>About</h2>
        <div className="app-info">
          <div className="app-item">
            <span className="app-label">App Version:</span>
            <span>1.0.0</span>
          </div>
          <div className="app-item">
            <span className="app-label">Last Updated:</span>
            <span>{formatDate(new Date(), 'long')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}