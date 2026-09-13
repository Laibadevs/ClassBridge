'use client';

import type { ReactNode } from 'react';
import AppShell, { type AppNavItem } from '@/components/shared/AppShell';
import {
  DashboardGridIcon,
  UsersIcon,
  CalendarCheckIcon,
  ClipboardIcon,
  MessageIcon,
  BarChartIcon,
  BellIcon,
  SettingsIcon,
} from '@/components/icons';

const navItems: AppNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardGridIcon, href: '/teacher' },
  { id: 'students', label: 'Students', icon: UsersIcon, href: '/teacher/students' },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheckIcon, href: '/teacher/attendance' },
  { id: 'grades', label: 'Grades', icon: ClipboardIcon, href: '/teacher/grades' },
  { id: 'updates', label: 'Parent Updates', icon: MessageIcon, href: '/teacher/updates' },
  { id: 'announcements', label: 'Announcements', icon: BellIcon, href: '/teacher/announcements' },
  { id: 'progress', label: 'Progress Reports', icon: BarChartIcon, href: '/teacher/progress' },
];

const bottomItems: AppNavItem[] = [{ id: 'settings', label: 'Settings', icon: SettingsIcon }];

/** Shared chrome for every authenticated teacher screen. */
export default function TeacherShell({ userName, children }: { userName: string; children: ReactNode }) {
  return (
    <AppShell
      userName={userName}
      roleLabel="Teacher"
      navItems={navItems}
      bottomItems={bottomItems}
      searchPlaceholder="Search students, classes…"
    >
      {children}
    </AppShell>
  );
}
