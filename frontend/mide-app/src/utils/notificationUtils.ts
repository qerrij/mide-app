// utils/notificationUtils.ts
import {
  NotificationType,
  RevisionStatus,
  ReportStatus,
  TransferStatus,
  RejectionStatus,
} from '../types';

// Импортируем иконки
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AssessmentIcon from '@mui/icons-material/Assessment';
import WarningIcon from '@mui/icons-material/Warning';
import TransferWithinAStationIcon from '@mui/icons-material/TransferWithinAStation';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ErrorIcon from '@mui/icons-material/Error';
import CheckIcon from '@mui/icons-material/Check';
import NotificationsIcon from '@mui/icons-material/Notifications';
import InventoryIcon from '@mui/icons-material/Inventory';
import AllInboxIcon from '@mui/icons-material/AllInbox';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';

// ================ ЦВЕТА ================
export const NotificationColors: Record<NotificationType, string> = {
  // Ревизии
  [NotificationType.REVISION_REQUEST]: '#2196f3',
  [NotificationType.REVISION_COMPLETED]: '#4caf50',
  [NotificationType.REVISION_VERIFIED]: '#9c27b0',
  
  // Отчеты
  [NotificationType.REPORT_SUBMITTED]: '#ff9800',
  [NotificationType.REPORT_APPROVED]: '#4caf50',
  [NotificationType.REPORT_REJECTED]: '#f44336',
  [NotificationType.REPORT_ACCOUNTANT]: '#673ab7',
  
  // Перемещения
  [NotificationType.TRANSFER_REQUEST]: '#2196f3',
  [NotificationType.TRANSFER_APPROVED]: '#4caf50',
  [NotificationType.TRANSFER_IN_TRANSIT]: '#ff9800',
  [NotificationType.TRANSFER_DISCREPANCY]: '#f44336',
  [NotificationType.TRANSFER_COMPLETED]: '#4caf50',
  [NotificationType.TRANSFER_REJECTED]: '#f44336',
  [NotificationType.TRANSFER_MANAGER_REQUEST]: '#673ab7',
  [NotificationType.TRANSFER_STATUS]: '#607d8b',
  
  // Брак
  [NotificationType.REJECTION_REQUEST]: '#ff9800',
  [NotificationType.REJECTION_APPROVED]: '#4caf50',
  [NotificationType.REJECTION_REJECTED]: '#f44336',
  
  // Системные
  [NotificationType.INVENTORY_LOW]: '#ff9800',
  [NotificationType.SYSTEM_MESSAGE]: '#607d8b',
  [NotificationType.OTHER]: '#9e9e9e',
};

// ================ ИКОНКИ ================
export const NotificationIcons: Record<NotificationType, React.ElementType> = {
  [NotificationType.REVISION_REQUEST]: AssignmentIcon,
  [NotificationType.REVISION_COMPLETED]: CheckCircleIcon,
  [NotificationType.REVISION_VERIFIED]: AssignmentIcon,
  
  [NotificationType.REPORT_SUBMITTED]: AssessmentIcon,
  [NotificationType.REPORT_APPROVED]: CheckCircleIcon,
  [NotificationType.REPORT_REJECTED]: CancelIcon,
  [NotificationType.REPORT_ACCOUNTANT]: AssessmentIcon,
  
  [NotificationType.TRANSFER_REQUEST]: TransferWithinAStationIcon,
  [NotificationType.TRANSFER_APPROVED]: CheckCircleIcon,
  [NotificationType.TRANSFER_IN_TRANSIT]: LocalShippingIcon,
  [NotificationType.TRANSFER_DISCREPANCY]: WarningIcon,
  [NotificationType.TRANSFER_COMPLETED]: CheckIcon,
  [NotificationType.TRANSFER_REJECTED]: ErrorIcon,
  [NotificationType.TRANSFER_MANAGER_REQUEST]: TransferWithinAStationIcon,
  [NotificationType.TRANSFER_STATUS]: NotificationsIcon,
  
  [NotificationType.REJECTION_REQUEST]: WarningIcon,
  [NotificationType.REJECTION_APPROVED]: CheckCircleIcon,
  [NotificationType.REJECTION_REJECTED]: CancelIcon,
  
  [NotificationType.INVENTORY_LOW]: WarningIcon,
  [NotificationType.SYSTEM_MESSAGE]: NotificationsIcon,
  [NotificationType.OTHER]: NotificationsIcon,
};

// ================ ТИПЫ УВЕДОМЛЕНИЙ ПО КАТЕГОРИЯМ ================
interface NotificationCategory {
  label: string;
  types: NotificationType[];
  getStatuses: () => Array<{ value: string; label: string }>;
}

export const NotificationCategories: Record<string, NotificationCategory> = {
  REVISIONS: {
    label: 'Ревизии',
    types: [
      NotificationType.REVISION_REQUEST,
      NotificationType.REVISION_COMPLETED,
      NotificationType.REVISION_VERIFIED,
    ],
    getStatuses: () => Object.values(RevisionStatus).map(status => ({
      value: status,
      label: getRevisionStatusText(status),
    })),
  },
  REPORTS: {
    label: 'Отчеты',
    types: [
      NotificationType.REPORT_SUBMITTED,
      NotificationType.REPORT_APPROVED,
      NotificationType.REPORT_REJECTED,
      NotificationType.REPORT_ACCOUNTANT,
    ],
    getStatuses: () => Object.values(ReportStatus).map(status => ({
      value: status,
      label: getReportStatusText(status),
    })),
  },
  TRANSFERS: {
    label: 'Перемещения',
    types: [
      NotificationType.TRANSFER_REQUEST,
      NotificationType.TRANSFER_APPROVED,
      NotificationType.TRANSFER_IN_TRANSIT,
      NotificationType.TRANSFER_DISCREPANCY,
      NotificationType.TRANSFER_COMPLETED,
      NotificationType.TRANSFER_REJECTED,
      NotificationType.TRANSFER_MANAGER_REQUEST,
      NotificationType.TRANSFER_STATUS,
    ],
    getStatuses: () => Object.values(TransferStatus).map(status => ({
      value: status,
      label: getTransferStatusText(status),
    })),
  },
  REJECTIONS: {
    label: 'Брак',
    types: [
      NotificationType.REJECTION_REQUEST,
      NotificationType.REJECTION_APPROVED,
      NotificationType.REJECTION_REJECTED,
    ],
    getStatuses: () => Object.values(RejectionStatus).map(status => ({
      value: status,
      label: getRejectionStatusText(status),
    })),
  },
  SYSTEM: {
    label: 'Системные',
    types: [
      NotificationType.INVENTORY_LOW,
      NotificationType.SYSTEM_MESSAGE,
      NotificationType.OTHER,
    ],
    getStatuses: () => [],
  },
};

// ================ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ================
export const getCategoryByNotificationType = (type: NotificationType): string => {
  for (const [key, category] of Object.entries(NotificationCategories)) {
    if (category.types.includes(type)) {
      return key;
    }
  }
  return 'SYSTEM';
};


export const getNotificationTypeFromCategoryAndStatus = (
  categoryKey: string,
  status: string
): NotificationType | undefined => {
  const category = NotificationCategories[categoryKey];
  if (!category || !status) return undefined;
  
  // Маппинг статусов к типам уведомлений с учетом категории
  const statusToTypeMap: Record<string, Record<string, NotificationType[]>> = {
    REVISIONS: {
      [RevisionStatus.REQUESTED]: [NotificationType.REVISION_REQUEST],
      [RevisionStatus.COMPLETED]: [NotificationType.REVISION_COMPLETED],
      [RevisionStatus.VERIFIED]: [NotificationType.REVISION_VERIFIED],
      [RevisionStatus.IN_PROGRESS]: [NotificationType.REVISION_REQUEST],
      [RevisionStatus.REJECTED]: [], // Для ревизий нет отдельного типа уведомления об отклонении
    },
    REPORTS: {
      [ReportStatus.SUBMITTED]: [NotificationType.REPORT_SUBMITTED],
      [ReportStatus.APPROVED]: [NotificationType.REPORT_APPROVED],
      [ReportStatus.REJECTED]: [NotificationType.REPORT_REJECTED],
      [ReportStatus.AWAITING_ACCOUNTANT]: [NotificationType.REPORT_ACCOUNTANT],
      [ReportStatus.AWAITING_MANAGER]: [], // Для этих статусов нет прямых уведомлений
      [ReportStatus.AWAITING_FIX]: [],
      [ReportStatus.DRAFT]: [],
    },
    TRANSFERS: {
      [TransferStatus.REQUESTED]: [NotificationType.TRANSFER_REQUEST],
      [TransferStatus.APPROVED]: [NotificationType.TRANSFER_APPROVED],
      [TransferStatus.IN_TRANSIT]: [NotificationType.TRANSFER_IN_TRANSIT],
      [TransferStatus.CHECKING]: [NotificationType.TRANSFER_DISCREPANCY],
      [TransferStatus.COMPLETED]: [NotificationType.TRANSFER_COMPLETED],
      [TransferStatus.REJECTED]: [NotificationType.TRANSFER_REJECTED],
      [TransferStatus.PENDING_APPROVAL]: [NotificationType.TRANSFER_MANAGER_REQUEST],
      [TransferStatus.ARRIVED]: [NotificationType.TRANSFER_STATUS],
      [TransferStatus.CANCELLED]: [],
    },
    REJECTIONS: {
      [RejectionStatus.PENDING]: [NotificationType.REJECTION_REQUEST],
      [RejectionStatus.APPROVED]: [NotificationType.REJECTION_APPROVED],
      [RejectionStatus.REJECTED]: [NotificationType.REJECTION_REJECTED],
      [RejectionStatus.CANCELLED]: [],
    },
    SYSTEM: {},
  };

  const categoryMap = statusToTypeMap[categoryKey];
  if (!categoryMap) return undefined;

  const possibleTypes = categoryMap[status];
  if (!possibleTypes || possibleTypes.length === 0) return undefined;

  // Возвращаем первый подходящий тип
  return possibleTypes[0];
};

// ================ ТЕКСТЫ СТАТУСОВ ================
// Эти функции нужно импортировать из ваших существующих хелперов
// или реализовать здесь, если их нет

export const getRevisionStatusText = (status: RevisionStatus): string => {
  const texts: Record<RevisionStatus, string> = {
    [RevisionStatus.REQUESTED]: 'Запрошена',
    [RevisionStatus.IN_PROGRESS]: 'В процессе',
    [RevisionStatus.COMPLETED]: 'Заполнена',
    [RevisionStatus.VERIFIED]: 'Проверена',
    [RevisionStatus.REJECTED]: 'Отклонена',
  };
  return texts[status];
};

export const getReportStatusText = (status: ReportStatus): string => {
  const texts: Record<ReportStatus, string> = {
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

export const getTransferStatusText = (status: TransferStatus): string => {
  const texts: Record<TransferStatus, string> = {
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

export const getRejectionStatusText = (status: RejectionStatus): string => {
  const texts: Record<RejectionStatus, string> = {
    [RejectionStatus.PENDING]: 'На рассмотрении',
    [RejectionStatus.APPROVED]: 'Утвержден',
    [RejectionStatus.REJECTED]: 'Отклонен',
    [RejectionStatus.CANCELLED]: 'Отменен',
  };
  return texts[status];
};

export const getNotificationTypeText = (type: NotificationType): string => {
  const texts: Record<NotificationType, string> = {
    [NotificationType.REVISION_REQUEST]: 'Запрос на ревизию',
    [NotificationType.REVISION_COMPLETED]: 'Ревизия заполнена',
    [NotificationType.REVISION_VERIFIED]: 'Ревизия проверена',
    [NotificationType.REPORT_SUBMITTED]: 'Отчет отправлен',
    [NotificationType.REPORT_APPROVED]: 'Отчет утвержден',
    [NotificationType.REPORT_REJECTED]: 'Отчет отклонен',
    [NotificationType.REPORT_ACCOUNTANT]: 'Проверка бухгалтера',
    [NotificationType.INVENTORY_LOW]: 'Низкий остаток',
    [NotificationType.SYSTEM_MESSAGE]: 'Системное сообщение',
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

// ================ ЦВЕТА СТАТУСОВ ================
export const getRevisionStatusColor = (status: RevisionStatus): string => {
  const colors: Record<RevisionStatus, string> = {
    [RevisionStatus.REQUESTED]: '#ff9800',
    [RevisionStatus.IN_PROGRESS]: '#2196f3',
    [RevisionStatus.COMPLETED]: '#9c27b0',
    [RevisionStatus.VERIFIED]: '#4caf50',
    [RevisionStatus.REJECTED]: '#f44336',
  };
  return colors[status];
};

export const getReportStatusColor = (status: ReportStatus): string => {
  const colors: Record<ReportStatus, string> = {
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

export const getTransferStatusColor = (status: TransferStatus): string => {
  const colors: Record<TransferStatus, string> = {
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

export const getRejectionStatusColor = (status: RejectionStatus): string => {
  const colors: Record<RejectionStatus, string> = {
    [RejectionStatus.PENDING]: '#ff9800',
    [RejectionStatus.APPROVED]: '#4caf50',
    [RejectionStatus.REJECTED]: '#f44336',
    [RejectionStatus.CANCELLED]: '#9e9e9e',
  };
  return colors[status];
};