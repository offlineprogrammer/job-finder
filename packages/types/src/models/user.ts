/**
 * User domain model
 */

export interface User {
  user_id: string; // Cognito sub
  email: string;
  preferences: UserPreferences;
  created_at: string; // ISO8601
  updated_at: string; // ISO8601
  last_login_at?: string; // ISO8601
}

export interface UserPreferences {
  email_notifications: boolean;
  default_location?: string;
  default_salary_range?: {
    min: number;
    max: number;
  };
}
