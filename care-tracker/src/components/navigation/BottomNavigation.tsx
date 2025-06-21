'use client'

import { useState } from 'react'

export type NavigationTab = 'timeline' | 'tasks' | 'progress' | 'profile'

interface BottomNavigationProps {
  activeTab: NavigationTab
  onTabChange: (tab: NavigationTab) => void
}

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const navItems = [
    {
      id: 'timeline' as NavigationTab,
      icon: '📅',
      label: 'Timeline'
    },
    {
      id: 'tasks' as NavigationTab,
      icon: '📋',
      label: 'All Tasks'
    },
    {
      id: 'progress' as NavigationTab,
      icon: '📊',
      label: 'Progress'
    },
    {
      id: 'profile' as NavigationTab,
      icon: '👤',
      label: 'Profile'
    }
  ]

  return (
    <div className="bottom-nav">
      {navItems.map((item) => (
        <div
          key={item.id}
          className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
          onClick={() => onTabChange(item.id)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}