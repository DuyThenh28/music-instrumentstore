export interface SharedProductSummary {
  id: string;
  name: string;
  price: number;
}

export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  phone: string;
  address: string;
  avatarUrl?: string;
  role?: "Admin" | "Staff" | "User";
  updatedAt?: string;
}
