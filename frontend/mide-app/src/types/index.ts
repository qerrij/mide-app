export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  SENIOR_SELLER = 'SENIOR_SELLER',
  MENTOR = 'MENTOR',
  SELLER = 'SELLER',
  ACCOUNTANT = 'ACCOUNTANT'  // Добавляем новую роль бухгалтера
}

// Удаляем старый ProductCategory enum и заменяем на структуру для работы с ID категорий
export interface ProductCategory {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Добавляем новые статусы для отчетов
export enum ReportStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

// Добавляем статусы для бухгалтера
export enum AccountantReportStatus {
  PENDING = 'PENDING',        // Ожидает проверки бухгалтером
  APPROVED = 'APPROVED',      // Одобрено бухгалтером
  REJECTED = 'REJECTED'       // Отклонено бухгалтером
}

// ================ ПОЛЬЗОВАТЕЛИ ================
export interface User {
  id: number;
  username: string;
  fullName: string;
  telegram?: string;
  city?: string;
  role: UserRole;
  rate?: number;  // Добавляем ставку пользователя
  
  clusterId?: number;
  groupId?: number;
  mentorId?: number;
  seniorSellerId?: number;
  adminId?: number;  // Добавляем adminId
  adminClusterIds?: number[];
  
  createdAt: Date;
  updatedAt?: Date;
  lastLogin?: Date;
  
  // Дополнительные поля для отображения (с сервера)
  groupName?: string;
  clusterName?: string;
  mentorName?: string;
  seniorSellerName?: string;
  adminName?: string;
}

export interface CreateUserDto {
  username: string;
  password: string;
  fullName: string;
  telegram?: string;
  city?: string;
  role: UserRole;
  rate?: number;  // Добавляем ставку
  clusterId?: number;
  groupId?: number;
  mentorId?: number;
  seniorSellerId?: number;
  adminId?: number;
  adminClusterIds?: number[];
}

export interface UpdateUserDto {
  username?: string;
  password?: string;
  fullName?: string;
  telegram?: string;
  city?: string;
  role?: UserRole;
  rate?: number;  // Добавляем ставку
  clusterId?: number;
  groupId?: number;
  mentorId?: number;
  seniorSellerId?: number;
  adminId?: number;
  adminClusterIds?: number[];
}

// ================ ТОВАРЫ ================
export interface Product {
  id: number;
  name: string;
  categoryId: number;  // Меняем с enum на ID категории
  categoryName?: string;  // Добавляем имя категории для отображения
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
  
  // Новые поля для бухгалтера
  accountantAmount?: number;  // Сумма указанная пользователем
  accountantStatus?: AccountantReportStatus;
  accountantComment?: string;
  accountantFinalAmount?: number;  // Окончательная сумма указанная бухгалтером
  accountantReviewedBy?: number;
  accountantReviewDate?: Date;
  accountantName?: string;
  
  createdAt: Date;
  updatedAt?: Date;
}

export interface ReportCreateDto {
  products: ReportProduct[];
  accountantAmount: number;  // Добавляем обязательное поле для суммы бухгалтера
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
  totalAmount: number;
  lastReportDate?: Date;
}

// ================ АВТОРИЗАЦИЯ ================
export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// ================ ГРУППЫ И КУСТЫ ================
export interface Group {
  id: number;
  name: string;
  mentorId: number;
  clusterId?: number;
  seniorSellerId?: number;
  description?: string;
  isActive?: boolean;
  createdAt: Date;
  updatedAt?: Date;
  sellerCount?: number;
  mentorName?: string;
  clusterName?: string;
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
  isActive?: boolean;
}

export interface Cluster {
  id: number;
  name: string;
  seniorSellerId: number;
  adminId?: number;
  description?: string;
  isActive?: boolean;
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
  isActive?: boolean;
}

//==== ЭТО ПОКА ЧТО НЕ НУЖНО ====//

export enum NotificationType {
  INVENTORY_REVIEW = 'INVENTORY_REVIEW',
  MOVEMENT_REQUEST = 'MOVEMENT_REQUEST',
  MOVEMENT_CONFIRMED = 'MOVEMENT_CONFIRMED',
  MOVEMENT_REJECTED = 'MOVEMENT_REJECTED',
  DEFECT_REPORTED = 'DEFECT_REPORTED',
  REPORT_SUBMITTED = 'REPORT_SUBMITTED',
  SYSTEM = 'SYSTEM'
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

export enum DefectStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}



// ================ ХЕЛПЕРЫ ================
export const getRoleName = (role: UserRole): string => {
  const names = {
    [UserRole.OWNER]: 'Владелец',
    [UserRole.ADMIN]: 'Администратор',
    [UserRole.SENIOR_SELLER]: 'Старший продавец',
    [UserRole.MENTOR]: 'Наставник',
    [UserRole.SELLER]: 'Продавец',
    [UserRole.ACCOUNTANT]: 'Бухгалтер',  // Добавляем бухгалтера
  };
  return names[role];
};

export const getStatusColor = (status: ReportStatus | AccountantReportStatus): string => {
  if (status === ReportStatus.APPROVED || status === AccountantReportStatus.APPROVED) {
    return '#4caf50';
  }
  if (status === ReportStatus.REJECTED || status === AccountantReportStatus.REJECTED) {
    return '#f44336';
  }
  if (status === ReportStatus.SUBMITTED) {
    return '#ff9800';
  }
  if (status === AccountantReportStatus.PENDING) {
    return '#ff9800';
  }
  return '#9e9e9e';
};

export const getReportStatusText = (status: ReportStatus): string => {
  const texts = {
    [ReportStatus.DRAFT]: 'Черновик',
    [ReportStatus.SUBMITTED]: 'Отправлен',
    [ReportStatus.APPROVED]: 'Утвержден',
    [ReportStatus.REJECTED]: 'Отклонен',
  };
  return texts[status];
};

export const getAccountantStatusText = (status: AccountantReportStatus): string => {
  const texts = {
    [AccountantReportStatus.PENDING]: 'На проверке у бухгалтера',
    [AccountantReportStatus.APPROVED]: 'Проверен бухгалтером',
    [AccountantReportStatus.REJECTED]: 'Отклонен бухгалтером',
  };
  return texts[status];
};


// ==== ОСТАТКИ ==== //

export interface InventoryItem {
  id: number;
  userId: number;
  productId: number;
  quantity: number;
  reservedQuantity: number;
  productName?: string;
  productSku?: string;
  productPrice?: number;
  userName?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface InventoryResponse {
  quantity: number;
  items: InventoryItem[];
}