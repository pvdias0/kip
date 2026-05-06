export interface User {
  id: number;
  name: string;
  email: string;
  email_verified: boolean;
  terms_of_service_accepted_at: string | null;
  terms_of_service_version: string | null;
  privacy_policy_accepted_at: string | null;
  privacy_policy_version: string | null;
  has_accepted_legal_documents: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}
