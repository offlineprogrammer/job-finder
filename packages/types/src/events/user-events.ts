/**
 * User-related EventBridge events
 */

export interface UserRegisteredEvent {
  source: 'job-finder.user';
  'detail-type': 'User Registered';
  detail: {
    user_id: string;
    email: string;
    registered_at: string;
  };
}

export interface UserProfileUpdatedEvent {
  source: 'job-finder.user';
  'detail-type': 'User Profile Updated';
  detail: {
    user_id: string;
    updated_fields: string[];
    updated_at: string;
  };
}
