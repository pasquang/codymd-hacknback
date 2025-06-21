'use client'

import { useState } from 'react'
import { Calendar, ClipboardText, ChartLine, User } from 'phosphor-react'

export type NavigationTab = 'timeline' | 'tasks' | 'progress' | 'profile'

interface BottomNavigationProps {
  activeTab: NavigationTab
  onTabChange: (tab: NavigationTab) => void
}

export function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const navItems = [
    {
      id: 'timeline' as NavigationTab,
      icon: <Calendar size={20} weight={activeTab === 'timeline' ? 'fill' : 'regular'} />,
      label: 'Timeline'
    },
    {
      id: 'tasks' as NavigationTab,
      icon: <ClipboardText size={20} weight={activeTab === 'tasks' ? 'fill' : 'regular'} />,
      label: 'All Tasks'
    },
    {
      id: 'progress' as NavigationTab,
      icon: <ChartLine size={20} weight={activeTab === 'progress' ? 'fill' : 'regular'} />,
      label: 'Progress'
    },
    {
      id: 'profile' as NavigationTab,
      icon: <User size={20} weight={activeTab === 'profile' ? 'fill' : 'regular'} />,
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