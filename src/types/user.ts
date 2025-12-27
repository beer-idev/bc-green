export type UserAddress = {
  line1: string;
  district: string;
  province: string;
  zip: string;
};

export type UserProfile = {
  id: string;
  displayName: string;
  email: string;
  phone: string;
  address: UserAddress;
  avatarUrl?: string;
  role?: "user" | "technician" | "admin";
};
