/**
 * Core TypeScript interfaces matching backend Pydantic schemas.
 */

import type { UserRole } from '@/lib/constants';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  school_id: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface School {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  zip_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Bus {
  id: string;
  school_id: string;
  bus_number: string;
  registration_number: string | null;
  model: string | null;
  capacity: number;
  assigned_route_id: string | null;
  status: string;
  current_speed: number;
  current_latitude: number | null;
  current_longitude: number | null;
  created_at: string;
}

export interface Driver {
  id: string;
  user_id: string;
  license_number: string | null;
  license_expiry: string | null;
  assigned_bus_id: string | null;
  status: string;
  emergency_contact: string | null;
  created_at: string;
  user?: User;
}

export interface Student {
  id: string;
  school_id: string;
  parent_id: string | null;
  full_name: string;
  class_name: string | null;
  section: string | null;
  roll_number: string | null;
  pickup_stop_id: string | null;
  drop_stop_id: string | null;
  assigned_bus_id: string | null;
  created_at: string;
}

export interface Route {
  id: string;
  school_id: string;
  name: string;
  description: string | null;
  estimated_duration_mins: number | null;
  estimated_distance_km: number | null;
  is_active: boolean;
  created_at: string;
}

export interface BusStop {
  id: string;
  school_id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  created_at: string;
}

export interface RouteStop {
  id: string;
  route_id: string;
  stop_id: string;
  sequence_order: number;
  estimated_arrival: string | null;
  stop?: BusStop;
}

export interface Trip {
  id: string;
  bus_id: string;
  driver_id: string;
  route_id: string | null;
  status: string;
  trip_type: string;
  started_at: string | null;
  ended_at: string | null;
  distance_km: number;
  avg_speed_kmh: number;
  created_at: string;
}

export interface LocationData {
  bus_id: string;
  driver_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  accuracy: number;
  timestamp: string;
  route_progress?: {
    next_stop_name: string;
    stops_remaining: number;
    distance_to_next_km: number;
  };
}

export interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string;
  is_read: boolean;
  trip_id: string | null;
  created_at: string;
}

export interface DashboardStats {
  total_schools: number;
  total_buses: number;
  active_buses: number;
  total_drivers: number;
  online_drivers: number;
  total_students: number;
  total_parents: number;
  total_routes: number;
  today_trips: number;
  active_trips: number;
  total_distance_km: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface DriverStudentInfo {
  student_id: string;
  student_name: string;
  class_name: string | null;
  section: string | null;
  roll_number: string | null;
  pickup_stop_name: string | null;
  drop_stop_name: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  parent_email: string | null;
}

export interface DriverConnectionsResponse {
  driver_name: string;
  bus_number: string | null;
  route_name: string | null;
  students: DriverStudentInfo[];
}

// ─── Route Creation & Live Tracking Types ─────────────────────

export interface PickupPoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  landmark: string | null;
  locality: string | null;
  city: string | null;
  postal_code: string | null;
  school_id: string;
  created_at: string;
}

export interface RouteStopDetail {
  sequence: number;
  stop_id: string;
  route_stop_id: string;
  name: string;
  landmark: string | null;
  locality: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  distance_from_prev_km: number | null;
  duration_from_prev_mins: number | null;
  students: { id: string; name: string; class: string | null }[];
  student_count: number;
}

export interface RouteWithStops {
  id: string;
  name: string;
  status: string;
  total_distance_km: number | null;
  total_duration_mins: number | null;
  route_geometry: string | null;
  stops: RouteStopDetail[];
  school: {
    name: string;
    latitude: number | null;
    longitude: number | null;
    address?: string | null;
  } | null;
}

export interface RouteProgressData {
  trip_id: string;
  route_id: string;
  current_stop_index: number;
  completed_stops: { stop_id: string; stop_name?: string; completed_at: string }[];
  status: string;
  next_stop: {
    name: string;
    landmark: string | null;
    latitude: number;
    longitude: number;
    sequence: number;
  } | null;
  prev_stop: {
    name: string;
    landmark: string | null;
    latitude: number;
    longitude: number;
    sequence: number;
  } | null;
  stops_remaining: number;
  total_stops: number;
}
