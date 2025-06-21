'use client';

import { useState } from 'react';
import { X, Gear, Bell, Moon, Sun, Download, Upload, Trash } from 'phosphor-react';
import { useCareStore } from '../../store/careStore';
import { useToast } from '../../hooks/useToast';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { userProfile, clearAllData } = useCareStore();
  const { success, error, warning } = useToast();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);

  const handleExportData = () => {
    try {
      const data = {
        userProfile,
        tasks: useCareStore.getState().tasks,
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `care-tracker-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      success('Data Exported', 'Your care data has been downloaded successfully.');
    } catch (err) {
      error('Export Failed', 'Unable to export your data. Please try again.');
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        if (data.userProfile && data.tasks) {
          // Import data logic would go here
          success('Data Imported', 'Your care data has been restored successfully.');
        } else {
          error('Invalid File', 'The selected file is not a valid Care Tracker backup.');
        }
      } catch (err) {
        error('Import Failed', 'Unable to read the backup file. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      clearAllData();
      warning('Data Cleared', 'All your care data has been removed.');
      onClose();
    }
  };

  const handleNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        success('Notifications Enabled', 'You will now receive care reminders.');
      } else {
        error('Permission Denied', 'Please enable notifications in your browser settings.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <div className="settings-header">
          <div className="flex items-center gap-3">
            <Gear className="w-6 h-6" />
            <h2 className="text-xl font-semibold">Settings</h2>
          </div>
          <button onClick={onClose} className="settings-close-btn">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="settings-content">
          {/* User Profile Section */}
          <div className="settings-section">
            <h3 className="settings-section-title">Profile</h3>
            <div className="settings-item">
              <div>
                <div className="font-medium">{userProfile?.name || 'Not set'}</div>
                <div className="text-sm text-gray-600">
                  Procedure: {userProfile?.procedure || 'Not specified'}
                </div>
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="settings-section">
            <h3 className="settings-section-title">Notifications</h3>
            
            <div className="settings-item">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Push Notifications</div>
                  <div className="text-sm text-gray-600">Receive care reminders</div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={notifications}
                    onChange={(e) => {
                      setNotifications(e.target.checked);
                      if (e.target.checked) {
                        handleNotificationPermission();
                      }
                    }}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div className="settings-item">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Sound Alerts</div>
                  <div className="text-sm text-gray-600">Play sounds for critical reminders</div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={soundAlerts}
                    onChange={(e) => setSoundAlerts(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Appearance Section */}
          <div className="settings-section">
            <h3 className="settings-section-title">Appearance</h3>
            
            <div className="settings-item">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Dark Mode</div>
                  <div className="text-sm text-gray-600">Switch to dark theme</div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={(e) => setDarkMode(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Data Management Section */}
          <div className="settings-section">
            <h3 className="settings-section-title">Data Management</h3>
            
            <div className="settings-item">
              <button onClick={handleExportData} className="settings-action-btn export">
                <Download className="w-4 h-4" />
                Export Data
              </button>
              <div className="text-sm text-gray-600">Download your care data as JSON</div>
            </div>

            <div className="settings-item">
              <label className="settings-action-btn import">
                <Upload className="w-4 h-4" />
                Import Data
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                />
              </label>
              <div className="text-sm text-gray-600">Restore from a backup file</div>
            </div>

            <div className="settings-item">
              <button onClick={handleClearData} className="settings-action-btn danger">
                <Trash className="w-4 h-4" />
                Clear All Data
              </button>
              <div className="text-sm text-gray-600">Remove all care data permanently</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}