export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  SENIOR_SELLER = 'SENIOR_SELLER',
  MENTOR = 'MENTOR',
  SELLER = 'SELLER'
}

export enum ProductCategory {
  DISPOSABLES = 'DISPOSABLES',
  LIQUIDS = 'LIQUIDS',
  CONSUMABLES = 'CONSUMABLES',
  PODS = 'PODS',
  ENERGY_DRINKS = 'ENERGY_DRINKS'
}

export enum ReportStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum MovementStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export enum RejectionReason {
  DEFECTIVE = 'DEFECTIVE',
  INSUFFICIENT = 'INSUFFICIENT',
  ERROR = 'ERROR',
  OTHER = 'OTHER'
}

export enum DefectStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum NotificationType {
  INVENTORY_REVIEW = 'INVENTORY_REVIEW',
  MOVEMENT_REQUEST = 'MOVEMENT_REQUEST',
  MOVEMENT_CONFIRMED = 'MOVEMENT_CONFIRMED',
  MOVEMENT_REJECTED = 'MOVEMENT_REJECTED',
  DEFECT_REPORTED = 'DEFECT_REPORTED',
  REPORT_SUBMITTED = 'REPORT_SUBMITTED',
  SYSTEM = 'SYSTEM'
}

// ================ ПОЛЬЗОВАТЕЛИ ================
export interface User {
  id: number;
  username: string;
  fullName: string;
  telegram?: string;
  city?: string;
  role: UserRole;
  
  clusterId?: number;
  groupId?: number;
  mentorId?: number;
  seniorSellerId?: number;
  adminClusterIds?: number[];
  
  createdAt: Date;
  updatedAt?: Date;
  lastLogin?: Date;
}

export interface CreateUserDto {
  username: string;
  password: string;
  fullName: string;
  telegram?: string;
  city?: string;
  role: UserRole;
  clusterId?: number;
  groupId?: number;
  mentorId?: number;
  seniorSellerId?: number;
  adminClusterIds?: number[];
}

export interface UpdateUserDto {
  username?: string;
  password?: string;
  fullName?: string;
  telegram?: string;
  city?: string;
  role?: UserRole;
  clusterId?: number;
  groupId?: number;
  mentorId?: number;
  seniorSellerId?: number;
  adminClusterIds?: number[];
}

// ================ ТОВАРЫ ================
export interface Product {
  id: number;
  name: string;
  category: ProductCategory;
  price: number;
  sku: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ================ ОТЧЕТЫ ================
export interface ReportProduct {
  productId: number;
  quantity: number;
  soldAmount: number;
}

export interface ReportProductResponse extends ReportProduct {
  id: number;
  product?: Product;
}

export interface Report {
  id: number;
  sellerId: number;
  sellerName?: string;
  date: Date;
  products: ReportProductResponse[];
  transferAmount: number;
  transferPhotos: string[];
  status: ReportStatus;
  comment?: string;
  reviewedBy?: number;
  reviewDate?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ReportCreateDto {
  products: ReportProduct[];
  comment?: string;
}

export interface ReportUpdateDto {
  status?: ReportStatus;
  comment?: string;
  reviewedBy?: number;
}

export interface ReportFilter {
  skip?: number;
  limit?: number;
  sellerId?: number;
  clusterId?: number;
  mentorId?: number;
  adminId?: number;
  status?: ReportStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface ReportStats {
  totalReports: number;
  submitted: number;
  approved: number;
  rejected: number;
  lastReportDate?: Date;
}

// ================ ДРУГИЕ СУЩНОСТИ ================
export interface Inventory {
  id: number;
  sellerId: number;
  date: Date;
  products: InventoryProduct[];
  photos: string[];
  recipientRole?: UserRole;
  recipientId?: number;
  status: ReportStatus;
}

export interface InventoryProduct {
  productId: number;
  expectedQuantity: number;
  actualQuantity: number;
}

export interface Movement {
  id: number;
  fromSellerId: number;
  toSellerId: number;
  date: Date;
  products: MovementProduct[];
  photos: string[];
  status: MovementStatus;
  rejectionReason?: RejectionReason;
  rejectionComment?: string;
  confirmedBy?: number;
  confirmedAt?: Date;
}

export interface MovementProduct {
  productId: number;
  quantity: number;
  productName: string;
  productCategory: ProductCategory;
}

export interface DefectReport {
  id: number;
  sellerId: number;
  date: Date;
  productId: number;
  quantity: number;
  photos: string[];
  videos?: string[];
  reason: string;
  status: DefectStatus;
  reviewedBy?: number;
  reviewDate?: Date;
  comment?: string;
}

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: Date;
  data?: any;
  relatedId?: number;
}


export interface SellerGroup {
  id: number;
  name: string;
  clusterId: number;
  mentorId: number;
  createdAt: Date;
}

export interface StockItem {
  id: number;
  productId: number;
  sellerId: number;
  quantity: number;
  defectiveQuantity: number;
  lastUpdated: Date;
}

export interface StockSummary {
  productId: number;
  productName: string;
  totalQuantity: number;
  defectiveQuantity: number;
  availableQuantity: number;
  category: ProductCategory;
}

export interface UserStats {
  userId: number;
  totalReports: number;
  totalSales: number;
  totalDefects: number;
  totalMovements: number;
  lastReportDate?: Date;
}

export interface City {
  id: number;
  name: string;
  region: string;
}

// ================ АВТОРИЗАЦИЯ ================
export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// ================ ХЕЛПЕРЫ ================
export const getRoleName = (role: UserRole): string => {
  const names = {
    [UserRole.OWNER]: 'Владелец',
    [UserRole.ADMIN]: 'Администратор',
    [UserRole.SENIOR_SELLER]: 'Старший продавец',
    [UserRole.MENTOR]: 'Наставник',
    [UserRole.SELLER]: 'Продавец',
  };
  return names[role];
};

export const getCategoryName = (category: ProductCategory): string => {
  const names = {
    [ProductCategory.DISPOSABLES]: 'Одноразки',
    [ProductCategory.LIQUIDS]: 'Жидкости',
    [ProductCategory.CONSUMABLES]: 'Расходники',
    [ProductCategory.PODS]: 'Подики',
    [ProductCategory.ENERGY_DRINKS]: 'Энергетики',
  };
  return names[category];
};

export const getStatusColor = (status: ReportStatus | MovementStatus | DefectStatus): string => {
  if (status === ReportStatus.APPROVED || status === MovementStatus.APPROVED || status === DefectStatus.APPROVED) {
    return '#4caf50';
  }
  if (status === ReportStatus.REJECTED || status === MovementStatus.REJECTED || status === DefectStatus.REJECTED) {
    return '#f44336';
  }
  if (status === ReportStatus.SUBMITTED || status === MovementStatus.PENDING || status === DefectStatus.PENDING) {
    return '#ff9800';
  }
  return '#9e9e9e';
};

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
}

// ================ ГРУППЫ И КУСТЫ ================
export interface Group {
  id: number;
  name: string;
  mentorId: number;
  clusterId?: number;
  seniorSellerId?: number;
  description?: string;
  createdAt: Date;
  updatedAt?: Date;
  sellerCount?: number;
  mentorName?: string;
}

export interface CreateGroupDto {
  name: string;
  mentorId: number;
  clusterId?: number;
  seniorSellerId?: number;
  description?: string;
}

export interface UpdateGroupDto {
  name?: string;
  mentorId?: number;
  clusterId?: number;
  seniorSellerId?: number;
  description?: string;
}

export interface Cluster {
  id: number;
  name: string;
  seniorSellerId: number;
  adminId?: number;
  description?: string;
  createdAt: Date;
  updatedAt?: Date;
  groupCount?: number;
  sellerCount?: number;
  seniorSellerName?: string;
  adminName?: string;
}

export interface CreateClusterDto {
  name: string;
  seniorSellerId: number;
  adminId?: number;
  description?: string;
}

export interface UpdateClusterDto {
  name?: string;
  seniorSellerId?: number;
  adminId?: number;
  description?: string;
}