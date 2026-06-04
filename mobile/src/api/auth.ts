import { api } from "./client";

export type User = {
  id: number;
  email: string;
  name: string;
  role: string;
  plan: string | null;
  avatarUrl: string | null;
  authProvider: string;
  createdAt: string;
};

export type BotConfig = {
  botType: string;
  status: string;
};

export type DashboardData = {
  user: User;
  subscription: unknown | null;
  bots: BotConfig[];
};

export const auth = {
  login: (email: string, password: string) =>
    api.post<User>("/api/auth/login", { email, password }),

  register: (name: string, email: string, password: string) =>
    api.post<User>("/api/auth/register", { name, email, password }),

  logout: () => api.post<{ message: string }>("/api/auth/logout"),

  me: () => api.get<User>("/api/auth/me"),

  dashboard: () => api.get<DashboardData>("/api/user/dashboard"),
};
