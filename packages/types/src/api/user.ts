/**
 * User API types
 */

import type { UserPreferences } from '../models';

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
