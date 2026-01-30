export interface User {
  id: number;
  username: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
