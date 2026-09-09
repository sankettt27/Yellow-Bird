/**
 * Application constants — colors, roles, config values.
 */

export const APP_NAME = 'Smart School Transport';

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  SCHOOL_ADMIN: 'school_admin',
  DRIVER: 'driver',
  PARENT: 'parent',
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  school_admin: 'School Admin',
  driver: 'Driver',
  parent: 'Parent',
};

export const BUS_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  MAINTENANCE: 'maintenance',
  ON_TRIP: 'on_trip',
} as const;

export const BUS_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  maintenance: 'Maintenance',
  on_trip: 'On Trip',
};

export const BUS_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  on_trip: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

export const DRIVER_STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  on_trip: 'bg-blue-100 text-blue-700',
  offline: 'bg-gray-100 text-gray-600',
  on_leave: 'bg-amber-100 text-amber-700',
};

export const GPS_UPDATE_INTERVAL = 3000; // 3 seconds
