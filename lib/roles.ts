export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  USER: "user",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<string, string> = {
  admin: "管理者",
  manager: "マネージャー",
  user: "一般",
};

export function canApproveOrders(role: string): boolean {
  return role === ROLES.ADMIN || role === ROLES.MANAGER;
}

export function canCreateOrders(_role: string): boolean {
  return true; // All authenticated users can create orders
}
