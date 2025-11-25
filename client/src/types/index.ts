// TypeScript type definitions for the application

export interface User {
  id: string;
  username: string;
  role: 'Admin' | 'Manager' | 'Viewer';
}

export interface Skill {
  name: string;
  level: number; // 1-5
  last_used?: Date;
}

export interface Department {
  name: string;
  subgroup?: string;
  critical_skills?: string[];
}

export interface Employee {
  _id?: string;
  employee_id: string;
  name: string;
  email: string;
  department: Department;
  skills: Skill[];
  experience: {
    years: number;
    domain?: string;
  };
  location?: string;
  training_history?: TrainingRecord[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Course {
  _id?: string;
  title: string;
  description?: string;
  department: string;
  prerequisites?: string[];
  delivery_mode: 'Online' | 'In-Person' | 'Hybrid';
  duration: number;
  max_participants?: number;
  required_skills?: string[];
  target_experience_level?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Recommendation {
  _id?: string;
  employee_id: string | Employee;
  course_id: string | Course;
  confidence_score: number;
  rank: number;
  override_flag?: boolean;
  override_reason?: string;
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Completed';
  generated_at?: Date;
  updatedAt?: Date;
}

export interface TrainingRecord {
  course_id: string | Course;
  completion_date: Date;
  assessment_score?: number;
  status?: 'Completed' | 'In Progress' | 'Failed';
  feedback?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  count?: number;
}

