'use client';

import type { ReactNode } from 'react';
import AppShell, { type AppNavItem } from '@/components/shared/AppShell';
import {
  DashboardGridIcon,
  BarChartIcon,
  MessageIcon,
  CalendarCheckIcon,
  BellIcon,
  UserIcon,
  SettingsIcon,
} from '@/components/icons';

// Progress and Updates are full pages of their own; Attendance is still to come.
const navItems: AppNavItem[] = [
  { id: 'overview', label: 'Overview', icon: DashboardGridIcon, href: '/parent' },
  { id: 'progress', label: 'Progress', icon: BarChartIcon, href: '/parent/progress' },
  { id: 'updates', label: 'Updates', icon: MessageIcon, href: '/parent/updates' },
  { id: 'announcements', label: 'Announcements', icon: BellIcon, href: '/parent/announcements' },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheckIcon },
];

const bottomItems: AppNavItem[] = [
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

interface ParentShellProps {
  userName: string;
  /** Short salutation shown in the sticky header, e.g. "Assalam-o-Alaikum 👋". */
  greeting: string;
  children: ReactNode;
}

/** Shared chrome for every authenticated parent screen. */
export default function ParentShell({ userName, greeting, children }: ParentShellProps) {
  return (
    <AppShell
      userName={userName}
      roleLabel="Parent"
      navItems={navItems}
      bottomItems={bottomItems}
      headerLead={
        <p className="truncate text-sm font-semibold text-ink sm:text-base">{greeting}</p>
      }
    >
      {children}
    </AppShell>
  );
}
