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

export enum RevisionStatus {
  REQUESTED = 'REQUESTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED'
}

export enum RevisionType {
  USER = 'USER',
  GROUP = 'GROUP',
  CLUSTER = 'CLUSTER',
  CITY = 'CITY',
  GENERAL = 'GENERAL'
}

// Элементы заполнения ревизии (новая система)
export interface RevisionFillingItem {
  productId: number;
  categoryId: number;
  quantity: number;
}

export interface RevisionFillingItemResponse extends RevisionFillingItem {
  id: number;
  productName?: string;
  productSku?: string;
  categoryName?: string;
}

// Заполнение ревизии пользователем
export interface RevisionFilling {
  id: number;
  revisionId: number;
  userId: number;
  userName?: string;
  status: RevisionStatus;
  photos: string[];
  filledAt?: Date;
  isCompleted: boolean;
  items: RevisionFillingItemResponse[];
}

export interface RevisionFillingCreateDto {
  userId: number;
  items: RevisionFillingItem[];
  photos: string[];
}

// Старые интерфейсы для обратной совместимости
export interface RevisionItem {
  productId: number;
  categoryId: number;
  quantity: number;
}

export interface RevisionItemResponse extends RevisionItem {
  id: number;
  productName?: string;
  productSku?: string;
  categoryName?: string;
  actualQuantity?: number;
}

// Расхождения
export interface RevisionDiscrepancy {
  id: number;
  productId: number;
  userId: number;
  expectedQuantity: number;
  actualQuantity: number;
  discrepancy: number;
  isPositive: boolean;
  productName?: string;
  productSku?: string;
  userName?: string;
  categoryName?: string;
}

// Основная модель ревизии (обновленная)
export interface Revision {
  id: number;
  requestedById: number;
  requestedByName?: string;
  type: RevisionType;
  status: RevisionStatus;
  targetUserId?: number;
  targetGroupId?: number;
  targetClusterId?: number;
  targetCity?: string;
  targetUserName?: string;
  targetGroupName?: string;
  targetClusterName?: string;
  comment?: string;
  verificationComment?: string;
  verifiedById?: number;
  verifiedByName?: string;
  requestedAt: Date;
  completedAt?: Date;
  verifiedAt?: Date;
  
  // Для групповых ревизий - заполнения пользователей
  fillings: RevisionFilling[];
  
  // Для обратной совместимости
  items: RevisionItemResponse[];
  discrepancies: RevisionDiscrepancy[];
  photos: string[];  // Теперь фото хранятся в заполнениях
  
  // Статистика по заполнениям (только для групповых ревизий)
  totalFilled?: number;
  totalUsers?: number;
  isGroupRevision?: boolean;
}

export interface RevisionRequestDto {
  type: RevisionType;
  targetUserId?: number;
  targetGroupId?: number;
  targetClusterId?: number;
  targetCity?: string;
  comment?: string;
}

// Старое заполнение (для обратной совместимости)
export interface RevisionFillDto {
  items: RevisionItem[];
  photos: string[];
}

export interface RevisionVerifyDto {
  verificationComment?: string;
}

// Сводная информация по ревизии
export interface ProductSummary {
  productId: number;
  productName?: string;
  productSku?: string;
  categoryName?: string;
  totalQuantity: number;
  userQuantities: Array<{
    userId: number;
    userName?: string;
    quantity: number;
  }>;
}

export interface UserDiscrepancyDetail {
  productId: number;
  productName?: string;
  expected: number;
  actual: number;
  discrepancy: number;
  isPositive: boolean;
}

export interface UserDiscrepancySummary {
  userId: number;
  userName?: string;
  totalDiscrepancy: number;
  positiveTotal: number;
  negativeTotal: number;
  discrepancies: UserDiscrepancyDetail[];
}

export interface ProductDiscrepancyDetail {
  userId: number;
  userName?: string;
  expected: number;
  actual: number;
  discrepancy: number;
  isPositive: boolean;
}

export interface ProductDiscrepancySummary {
  productId: number;
  productName?: string;
  totalDiscrepancy: number;
  positiveTotal: number;
  negativeTotal: number;
  userDiscrepancies: ProductDiscrepancyDetail[];
}

export interface RevisionSummaryResponse {
  revision: Revision;
  productSummary: ProductSummary[];
  userDiscrepancies: UserDiscrepancySummary[];
  productDiscrepancies: ProductDiscrepancySummary[];
  totalFilled: number;
  totalUsers: number;
}

// ================ УВЕДОМЛЕНИЯ ================
export enum NotificationType {
  REVISION_REQUEST = 'REVISION_REQUEST',
  REVISION_COMPLETED = 'REVISION_COMPLETED',
  REVISION_VERIFIED = 'REVISION_VERIFIED',
  REPORT_SUBMITTED = 'REPORT_SUBMITTED',
  REPORT_APPROVED = 'REPORT_APPROVED',
  REPORT_REJECTED = 'REPORT_REJECTED',
  REPORT_ACCOUNTANT = 'REPORT_ACCOUNTANT',
  INVENTORY_LOW = 'INVENTORY_LOW',
  SYSTEM_MESSAGE = 'SYSTEM_MESSAGE',
  OTHER = 'OTHER'
}

export enum NotificationStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED'
}

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  entityType?: string;
  entityId?: number;
  status: NotificationStatus;
  senderId?: number;
  senderName?: string;
  priority: number;
  createdAt: Date;
  readAt?: Date;
}

export interface NotificationSummary {
  unreadCount: number;
  lastNotificationAt?: Date;
  notifications: Notification[];
}

export const getRevisionStatusText = (status: RevisionStatus): string => {
  const texts = {
    [RevisionStatus.REQUESTED]: 'Запрошена',
    [RevisionStatus.IN_PROGRESS]: 'В процессе',
    [RevisionStatus.COMPLETED]: 'Заполнена',
    [RevisionStatus.VERIFIED]: 'Проверена',
    [RevisionStatus.REJECTED]: 'Отклонена',
  };
  return texts[status];
};

export const getRevisionTypeText = (type: RevisionType): string => {
  const texts = {
    [RevisionType.USER]: 'Пользователь',
    [RevisionType.GROUP]: 'Группа',
    [RevisionType.CLUSTER]: 'Куст',
    [RevisionType.CITY]: 'Город',
    [RevisionType.GENERAL]: 'Общая',
  };
  return texts[type];
};

export const getRevisionStatusColor = (status: RevisionStatus): string => {
  const colors = {
    [RevisionStatus.REQUESTED]: '#ff9800',
    [RevisionStatus.IN_PROGRESS]: '#2196f3',
    [RevisionStatus.COMPLETED]: '#9c27b0',
    [RevisionStatus.VERIFIED]: '#4caf50',
    [RevisionStatus.REJECTED]: '#f44336',
  };
  return colors[status];
};

export const getNotificationTypeText = (type: NotificationType): string => {
  const texts = {
    [NotificationType.REVISION_REQUEST]: 'Запрос на ревизию',
    [NotificationType.REVISION_COMPLETED]: 'Ревизия заполнена',
    [NotificationType.REVISION_VERIFIED]: 'Ревизия проверена',
    [NotificationType.REPORT_SUBMITTED]: 'Отчет отправлен',
    [NotificationType.REPORT_APPROVED]: 'Отчет утвержден',
    [NotificationType.REPORT_REJECTED]: 'Отчет отклонен',
    [NotificationType.REPORT_ACCOUNTANT]: 'Проверка бухгалтера',
    [NotificationType.INVENTORY_LOW]: 'Низкий остаток',
    [NotificationType.SYSTEM_MESSAGE]: 'Системное сообщение',
    [NotificationType.OTHER]: 'Другое',
  };
  return texts[type];
};

export const getNotificationPriorityColor = (priority: number): string => {
  if (priority >= 5) return '#f44336';
  if (priority >= 4) return '#ff9800';
  if (priority >= 3) return '#2196f3';
  return '#4caf50';
};

// Дополнительные хелперы для работы с ревизиями
export const isGroupRevision = (type: RevisionType): boolean => {
  return type !== RevisionType.USER;
};

export const getTargetName = (revision: Revision): string => {
  if (revision.targetUserName) return revision.targetUserName;
  if (revision.targetGroupName) return revision.targetGroupName;
  if (revision.targetClusterName) return revision.targetClusterName;
  if (revision.targetCity) return `Город: ${revision.targetCity}`;
  if (revision.type === RevisionType.GENERAL) return 'Все пользователи';
  return 'Не указано';
};

export const canFillRevision = (revision: Revision, currentUserId: number): boolean => {
  // Ревизия должна быть запрошена
  if (revision.status !== RevisionStatus.REQUESTED && revision.status !== RevisionStatus.IN_PROGRESS) {
    return false;
  }
  
  // Для индивидуальной ревизии проверяем целевого пользователя
  if (revision.type === RevisionType.USER) {
    return revision.targetUserId === currentUserId;
  }
  
  // Для групповых ревизий - все участники могут заполнять
  return true;
};

export const canVerifyRevision = (revision: Revision, currentUserId: number): boolean => {
  // Проверять может только тот, кто запросил ревизию
  return revision.requestedById === currentUserId && 
         revision.status === RevisionStatus.COMPLETED;
};


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