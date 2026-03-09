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
  AWAITING_FIX = 'AWAITING_FIX',          // Ожидает исправления продавцом
  AWAITING_ACCOUNTANT = 'AWAITING_ACCOUNTANT', // Ожидает проверки бухгалтера
  AWAITING_MANAGER = 'AWAITING_MANAGER',   // Ожидает проверки руководителя
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

// Добавляем статусы для бухгалтера

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
  accountantUserIds?: number[];
  
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
  accountantUserIds?: number[];
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
  
  // Поля для бухгалтера
  accountantAmount?: number;
  accountantStatus?: ReportStatus;
  accountantComment?: string;
  accountantFinalAmount?: number;
  accountantReviewedBy?: number;
  accountantReviewDate?: Date;
  accountantName?: string;
  
  // Поле для отслеживания исправлений
  wasWithAccountant: boolean;
  
  createdAt: Date;
  updatedAt?: Date;
}

export interface ReportCreateDto {
  products: ReportProduct[];
  accountantAmount: number;
  comment?: string;
}

export interface ReportFixDto {
  products: ReportProduct[];
  accountantAmount: number;
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
  date_from?: string;
  date_to?: string;
  sort_by?: string;
}

export interface ReportStats {
  totalReports: number;
  awaitingFix: number;
  awaitingAccountant: number;
  awaitingManager: number;
  approved: number;
  rejected: number;
  totalAmount: number;
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
  productSku?: string;
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
  productSku?: string;  // Добавьте это поле
  categoryName?: string;  // Добавьте это поле
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
  
  // Типы для перемещений (добавлены новые)
  TRANSFER_REQUEST = 'TRANSFER_REQUEST',
  TRANSFER_APPROVED = 'TRANSFER_APPROVED',
  TRANSFER_IN_TRANSIT = 'TRANSFER_IN_TRANSIT',
  TRANSFER_DISCREPANCY = 'TRANSFER_DISCREPANCY',
  TRANSFER_COMPLETED = 'TRANSFER_COMPLETED',
  TRANSFER_REJECTED = 'TRANSFER_REJECTED',
  TRANSFER_MANAGER_REQUEST = 'TRANSFER_MANAGER_REQUEST',
  TRANSFER_STATUS = 'TRANSFER_STATUS',
  
  REJECTION_REQUEST = 'REJECTION_REQUEST',
  REJECTION_APPROVED = 'REJECTION_APPROVED',
  REJECTION_REJECTED = 'REJECTION_REJECTED',
  
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
    
    // Типы для перемещений
    [NotificationType.TRANSFER_REQUEST]: 'Запрос перемещения',
    [NotificationType.TRANSFER_APPROVED]: 'Перемещение подтверждено',
    [NotificationType.TRANSFER_IN_TRANSIT]: 'Товар в пути',
    [NotificationType.TRANSFER_DISCREPANCY]: 'Расхождения в перемещении',
    [NotificationType.TRANSFER_COMPLETED]: 'Перемещение завершено',
    [NotificationType.TRANSFER_REJECTED]: 'Перемещение отклонено',
    [NotificationType.TRANSFER_MANAGER_REQUEST]: 'Запрос перемещения от руководителя',
    [NotificationType.TRANSFER_STATUS]: 'Статус перемещения',

    [NotificationType.REJECTION_REQUEST]: 'Запрос на брак',
    [NotificationType.REJECTION_APPROVED]: 'Брак утвержден',
    [NotificationType.REJECTION_REJECTED]: 'Брак отклонен',
    
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

export const getReportStatusText = (status: ReportStatus): string => {
  const texts = {
    [ReportStatus.DRAFT]: 'Черновик',
    [ReportStatus.SUBMITTED]: 'Отправлен',
    [ReportStatus.AWAITING_FIX]: 'Требует исправления',
    [ReportStatus.AWAITING_ACCOUNTANT]: 'Ожидает бухгалтера',
    [ReportStatus.AWAITING_MANAGER]: 'Ожидает руководителя',
    [ReportStatus.APPROVED]: 'Утвержден',
    [ReportStatus.REJECTED]: 'Отклонен',
  };
  return texts[status];
};

export const getReportStatusColor = (status: ReportStatus): string => {
  const colors = {
    [ReportStatus.DRAFT]: '#9e9e9e',
    [ReportStatus.SUBMITTED]: '#ff9800',
    [ReportStatus.AWAITING_FIX]: '#f44336',
    [ReportStatus.AWAITING_ACCOUNTANT]: '#ff9800',
    [ReportStatus.AWAITING_MANAGER]: '#2196f3',
    [ReportStatus.APPROVED]: '#4caf50',
    [ReportStatus.REJECTED]: '#f44336',
  };
  return colors[status];
};

export const getReportActionText = (status: ReportStatus, role?: UserRole): string => {
  if (role === UserRole.ACCOUNTANT && status === ReportStatus.AWAITING_ACCOUNTANT) {
    return 'Проверить';
  }
  if ([UserRole.MENTOR, UserRole.SENIOR_SELLER, UserRole.ADMIN, UserRole.OWNER].includes(role as UserRole) 
      && status === ReportStatus.AWAITING_MANAGER) {
    return 'Утвердить';
  }
  if (role === UserRole.SELLER && status === ReportStatus.AWAITING_FIX) {
    return 'Исправить';
  }
  return 'Просмотреть';
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

// ================ ПЕРЕМЕЩЕНИЯ ================
export enum TransferStatus {
  REQUESTED = 'REQUESTED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  IN_TRANSIT = 'IN_TRANSIT',
  ARRIVED = 'ARRIVED',
  CHECKING = 'CHECKING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export enum TransferItemStatus {
  EXPECTED = 'EXPECTED',
  RECEIVED = 'RECEIVED',
  MISSING = 'MISSING',
  EXCESS = 'EXCESS',
  REJECTED = 'REJECTED'
}

export enum TransferRequestType {
  USER_REQUEST = 'user_request',
  MANAGER_REQUEST = 'manager_request'
}

// Базовые интерфейсы
export interface TransferItemBase {
  productId: number;
  expectedQuantity: number;
  notes?: string;
}

export interface TransferItem extends TransferItemBase {
  id: number;
  transferId: number;
  receivedQuantity?: number;
  status: TransferItemStatus;
  productName?: string;
  productSku?: string;
  productPrice?: number;
}

export interface TransferDiscrepancyItem {
  id: number;
  productId: number;
  expectedQuantity: number;
  actualQuantity: number;
  discrepancy: number;
  productName?: string;
  productSku?: string;
  notes?: string;
}

export interface TransferApproval {
  id: number;
  userId: number;
  approved: boolean;
  notes?: string;
  approvedAt: Date;
  userName?: string;
  userRole?: UserRole;
}

export interface TransferBase {
  title: string;
  description?: string;
  fromUserId: number;
  toUserId: number;
  executorId?: number;
  requestType: TransferRequestType;
}

export interface Transfer extends TransferBase {
  id: number;
  createdById: number;
  status: TransferStatus;
  files: string[];
  arrivalFiles: string[]; // 🔴 НОВОЕ: Файлы при приемке товара
  discrepancyFiles: string[];
  
  // 🔴 ДОБАВЛЕНО: Информация о расхождениях
  discrepancyAcceptedById?: number;
  discrepancyAcceptedAt?: Date;
  discrepancyApprovedById?: number;
  discrepancyApprovedAt?: Date;
  discrepancyAcceptedByName?: string;
  discrepancyApprovedByName?: string;
  
  // Даты
  createdAt: Date;
  approvedAt?: Date;
  startedAt?: Date;
  arrivedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  
  // Информация о пользователях
  createdByName?: string;
  fromUserName?: string;
  toUserName?: string;
  executorName?: string;
  
  // Роли пользователей
  fromUserRole?: UserRole;
  toUserRole?: UserRole;
  executorRole?: UserRole;
  
  // Статистика
  totalItems?: number;
  totalQuantity?: number;
  
  // Подтверждения
  approvalsCount: number;
  pendingApprovals: number[];
  
  // Флаги
  canApprove: boolean;
  canExecute: boolean;
  canApproveDiscrepancy: boolean;
  
  rejectionReason?: string;
}

export interface TransferDetail extends Transfer {
  items: TransferItem[];
  discrepancyItems: TransferDiscrepancyItem[];
  discrepancies?: {
    missingItems: number;
    excessItems: number;
    totalDiscrepancy: number;
    hasDiscrepancies: boolean;
  };
  approvals: TransferApproval[];

}

// DTO для создания
export interface TransferCreateDto extends TransferBase {
  items: TransferItemBase[];
}

export interface TransferCreateManagerRequestDto {
  title: string;
  description?: string;
  fromUserId: number;
  toUserId: number;
  items: TransferItemBase[];
}

export interface TransferApprovalDto {
  approved: boolean;
  notes?: string;
}

export interface TransferArrivalDto {
  action: 'accept' | 'reject' | 'discrepancy';
  items: Array<{
    productId: number;
    actualQuantity: number;
    notes?: string;
  }>;
  notes?: string;
}

export interface TransferExecuteManagerRequestDto {
  executorId?: number;
  notes?: string;
}

export interface TransferRejectManagerRequestDto {
  reason?: string;
}

export const getTransferStatusText = (status: TransferStatus): string => {
  const texts = {
    [TransferStatus.REQUESTED]: 'Запрошено',
    [TransferStatus.PENDING_APPROVAL]: 'Ожидает подтверждения',
    [TransferStatus.APPROVED]: 'Подтверждено',
    [TransferStatus.IN_TRANSIT]: 'В пути',
    [TransferStatus.ARRIVED]: 'Прибыло',
    [TransferStatus.CHECKING]: 'Проверка расхождений',
    [TransferStatus.COMPLETED]: 'Завершено',
    [TransferStatus.REJECTED]: 'Отклонено',
    [TransferStatus.CANCELLED]: 'Отменено',
  };
  return texts[status];
};

export const getTransferStatusColor = (status: TransferStatus): string => {
  const colors = {
    [TransferStatus.REQUESTED]: '#ff9800',
    [TransferStatus.PENDING_APPROVAL]: '#ff9800',
    [TransferStatus.APPROVED]: '#4caf50',
    [TransferStatus.IN_TRANSIT]: '#2196f3',
    [TransferStatus.ARRIVED]: '#9c27b0',
    [TransferStatus.CHECKING]: '#ff9800',
    [TransferStatus.COMPLETED]: '#4caf50',
    [TransferStatus.REJECTED]: '#f44336',
    [TransferStatus.CANCELLED]: '#9e9e9e',
  };
  return colors[status];
};

export const getTransferItemStatusText = (status: TransferItemStatus): string => {
  const texts = {
    [TransferItemStatus.EXPECTED]: 'Ожидается',
    [TransferItemStatus.RECEIVED]: 'Получено',
    [TransferItemStatus.MISSING]: 'Недостача',
    [TransferItemStatus.EXCESS]: 'Излишек',
    [TransferItemStatus.REJECTED]: 'Отклонено',
  };
  return texts[status];
};

export const getTransferItemStatusColor = (status: TransferItemStatus): string => {
  const colors = {
    [TransferItemStatus.EXPECTED]: '#ff9800',
    [TransferItemStatus.RECEIVED]: '#4caf50',
    [TransferItemStatus.MISSING]: '#f44336',
    [TransferItemStatus.EXCESS]: '#2196f3',
    [TransferItemStatus.REJECTED]: '#9e9e9e',
  };
  return colors[status];
};

export const getRequestTypeText = (type: TransferRequestType): string => {
  return type === TransferRequestType.USER_REQUEST 
    ? 'Запрос пользователя' 
    : 'Запрос руководителя';
};


// ================ БРАК (DEFECTS/REJECTIONS) ================
export enum RejectionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

// Товар для создания брака
export interface RejectionItemCreate {
  productId: number;
  quantity: number;
}

// Товар в ответе от сервера
export interface RejectionItemResponse {
  id: number;
  productId: number;
  productName?: string;
  productSku?: string;
  categoryName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// Создание брака
export interface RejectionCreate {
  items: RejectionItemCreate[];
  comment?: string;
}

// Обновление статуса брака
export interface RejectionUpdate {
  status?: RejectionStatus;
  comment?: string;
}

// Полный ответ по браку
export interface Rejection {
  id: number;
  userId: number;
  userName?: string;
  userRole?: string;
  comment?: string;
  status: RejectionStatus;
  photoPaths?: string[];
  videoPaths?: string[];
  totalItems: number;
  totalValue: number;
  items: RejectionItemResponse[];
  createdAt: Date;
  updatedAt?: Date;
  reviewedAt?: Date;
  reviewedBy?: number;
  reviewerName?: string;
}

// Статистика по товарам
export interface RejectionProductStats {
  productId: number;
  productName: string;
  productSku: string;
  categoryId?: number;
  categoryName?: string;
  totalRejected: number;
  totalValue: number;
  usersCount: number;
}

// Статистика по пользователям
export interface RejectionUserStats {
  userId: number;
  userName: string;
  userRole?: string;
  clusterId?: number;
  clusterName?: string;
  totalRejections: number;
  totalValue: number;
  productsCount: number;
}

// Детальная статистика по пользователю и товарам
export interface RejectionUserProductStats {
  userId: number;
  userName: string;
  productId: number;
  productName: string;
  productSku: string;
  categoryId?: number;
  categoryName?: string;
  totalRejected: number;
  totalValue: number;
}

// Общая статистика
export interface RejectionDetailedStats {
  period: string;
  totalRejectedItems: number;
  totalValue: number;
  totalUsers: number;
  totalProducts: number;
  byMonth?: Array<{
    month: string;
    items: number;
    value: number;
    users: number;
  }>;
}

// НОВЫЕ ИНТЕРФЕЙСЫ ДЛЯ ОБЪЕДИНЕННОЙ СТАТИСТИКИ

// Детальная статистика по пользователю (для team-detailed)
export interface RejectionUserStatsDetail {
  userId: number;
  userName: string;
  userRole?: string;
  clusterId?: number;
  clusterName?: string;
  mentorId?: number;
  mentorName?: string;
  totalRejections: number;
  totalItems: number;
  totalValue: number;
  productsCount: number;
  products: RejectionUserProductStats[];
}

// Детальная статистика для команды
export interface TeamRejectionStats {
  currentUser: RejectionUserStats;
  subordinates: RejectionUserStatsDetail[];
  totalStats: {
    totalUsers: number;
    totalRejections: number;
    totalItems: number;
    totalValue: number;
    totalProducts: number;
    dateRange: {
      from?: string;
      to?: string;
    };
  };
}

// Объединенная статистика
export interface CombinedRejectionStats {
  userStats: RejectionUserStats;
  userProductsStats: RejectionUserProductStats[];
  subordinatesStats: RejectionUserStats[];
  summary: {
    totalUsers: number;
    totalRejections: number;
    totalItems: number;  // Добавляем totalItems
    totalValue: number;
    totalProducts: number;
    hasRejections: boolean;
    dateRange: {
      from?: string;
      to?: string;
    };
  };
}

// Доступный товар для брака
export interface AvailableProduct {
  productId: number;
  productName: string;
  productSku: string;
  categoryId?: number;
  categoryName?: string;
  availableQuantity: number;
  price: number;
}

// Хелперы
export const getRejectionStatusText = (status: RejectionStatus): string => {
  const texts = {
    [RejectionStatus.PENDING]: 'На рассмотрении',
    [RejectionStatus.APPROVED]: 'Утвержден',
    [RejectionStatus.REJECTED]: 'Отклонен',
    [RejectionStatus.CANCELLED]: 'Отменен',
  };
  return texts[status];
};

export const getRejectionStatusColor = (status: RejectionStatus): string => {
  const colors = {
    [RejectionStatus.PENDING]: '#ff9800',
    [RejectionStatus.APPROVED]: '#4caf50',
    [RejectionStatus.REJECTED]: '#f44336',
    [RejectionStatus.CANCELLED]: '#9e9e9e',
  };
  return colors[status];
};


// ================ НАЗНАЧЕНИЯ БУХГАЛТЕРОВ ================
export interface AccountantAssignmentUser {
  id: number;
  fullName: string;
  role: UserRole;
  isAssigned: boolean;
}

export interface AccountantAssignmentSeller {
  id: number;
  fullName: string;
  role: UserRole;
  isAssigned: boolean;
}

export interface AccountantAssignmentGroup {
  id: number;
  name: string;
  mentor: AccountantAssignmentUser | null;
  sellers: AccountantAssignmentSeller[];
  allUserIds: number[];
  assignedCount: number;
}

export interface AccountantAssignmentCluster {
  id: number;
  name: string;
  seniorSeller: AccountantAssignmentUser | null;
  groups: AccountantAssignmentGroup[];
  allUserIds: number[];
  assignedCount: number;
}

export interface AccountantAssignmentHierarchy {
  clusters: AccountantAssignmentCluster[];
  unassignedGroups: AccountantAssignmentGroup[];
  unassignedUsers: AccountantAssignmentUser[];
}

export interface CheckConflictResponse {
  conflicts: Array<{
    accountantId: number;
    accountantName: string;
    userIds: number[];
    userNames: string[];
  }>;
  hasConflicts: boolean;
}


// ================ БУХГАЛТЕРИЯ ================
export interface CompanyTransaction {
  id: number;
  balance: number;
  description: string;
  operation_type: 'INCOME' | 'EXPENSE' | 'CORRECTION';
  amount: number;
  reference_id?: number;
  reference_type?: string;
  created_at: string;
  created_by?: number;
  created_by_name?: string;
}

export interface CompanyBalanceResponse {
  balance: number;
}

export interface CompanyBalanceHistory {
  date: string;
  balance: number;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'CORRECTION';
  description: string;
}

// Типы операций для отображения
export const OperationTypeLabels = {
  INCOME: 'Доход',
  EXPENSE: 'Расход',
  CORRECTION: 'Коррекция',
};

export const OperationTypeColors = {
  INCOME: '#4caf50',
  EXPENSE: '#f44336',
  CORRECTION: '#ff9800',
};

export const OperationTypeIcons = {
  INCOME: '💰',
  EXPENSE: '💸',
  CORRECTION: '📝',
};