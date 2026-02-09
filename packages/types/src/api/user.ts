/**
 * User API types
 */

export interface GetUserProfileResponse {
  user_id: string;
  email: string;
  preferences: UserPreferences;
  created_at: string; // ISO8601
  updated_at: string; // ISO8601
}

export interface UpdateUserProfileRequest {
  preferences?: Partial<UserPreferences>;
}

export interface UserPreferences {
  email_notifications: boolean;
  default_location?: string;
  default_salary_range?: {
    min: number;
    max: number;
  };
}
