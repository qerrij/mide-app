import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Avatar,
  InputAdornment,
  Alert,
  Snackbar,
  CircularProgress,
  Card,
  CardContent,
  Checkbox,
  Chip,
  alpha,
  useTheme,
  useMediaQuery,
  Divider,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  People,
  Business,
  Telegram,
  Visibility,
  VisibilityOff,
  PersonAdd,
  Groups as GroupsIcon,
  Domain,
  Refresh,
  Person,
  SupervisorAccount,
  AdminPanelSettings,
  BusinessCenter,
  AttachMoney,
  Close,
  LinkOff,
  Error as ErrorIcon,
  Info as InfoIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { 
  User, 
  UserRole, 
  CreateUserDto, 
  UpdateUserDto, 
  getRoleName, 
  Group, 
  Cluster, 
  CreateGroupDto, 
  CreateClusterDto,
  UpdateGroupDto,
  UpdateClusterDto
} from '../../types';
import { assignmentsService } from '../../api/assignmentsService';
import { userService } from '../../api/userService';
import { groupService } from '../../api/groupService';
import { clusterService } from '../../api/clusterService';
import AccountantAssignmentDialog from './AccountantAssignmentDialog';

// iOS стили
const iOSStyles = {
  button: {
    borderRadius: 6,
    textTransform: 'none',
    fontWeight: 600,
    padding: '6px 12px',
  },
  tabChip: {
    borderRadius: 4,
    height: 36,
    fontWeight: 500,
    fontSize: '0.85rem',
    padding: '8px 16px',
  },
  card: {
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    transition: 'transform 0.15s, box-shadow 0.15s',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    '&:hover': {
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
    },
  },
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    p: 2,
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    py: 0.5,
    borderBottom: '1px dashed',
    borderColor: 'divider',
  },
  roleChip: {
    borderRadius: 4,
    height: 24,
    fontWeight: 500,
    fontSize: '0.75rem',
  },
  actionButton: {
    fontSize: '0.7rem',
    minWidth: 70,
    height: 28,
  },
  unassignButton: {
    fontSize: '0.65rem',
    minWidth: 60,
    height: 24,
    color: '#d32f2f',
    borderColor: '#d32f2f',
    '&:hover': {
      backgroundColor: alpha('#d32f2f', 0.05),
      borderColor: '#d32f2f',
    },
  },
};

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info';
}

interface UnassignDialogState {
  open: boolean;
  user: User | null;
  type: string;
  data?: any;
}

// Компонент пинов-табов
interface TabChipsProps {
  value: number;
  onChange: (newValue: number) => void;
  tabs: Array<{
    label: string;
    icon: React.ReactNode;
    value: number;
    count?: number;
    color?: string;
  }>;
}

const TabChips: React.FC<TabChipsProps> = ({ value, onChange, tabs }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        gap: 1, 
        p: 1.5,
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        flexWrap: 'wrap',
      }}
    >
      {tabs.map((tab) => (
        <Button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          variant={value === tab.value ? 'contained' : 'outlined'}
          startIcon={tab.icon}
          sx={{
            ...iOSStyles.tabChip,
            flex: isMobile ? 1 : '0 1 auto',
            backgroundColor: value === tab.value 
              ? (tab.color || theme.palette.primary.main) 
              : 'transparent',
            borderColor: value === tab.value 
              ? 'transparent' 
              : alpha(tab.color || theme.palette.primary.main, 0.3),
            color: value === tab.value ? 'white' : theme.palette.text.primary,
            '&:hover': {
              backgroundColor: value === tab.value 
                ? (tab.color || theme.palette.primary.dark)
                : alpha(tab.color || theme.palette.primary.main, 0.08),
            },
          }}
        >
          {tab.label}
          {tab.count !== undefined && (
            <Chip
              label={tab.count}
              size="small"
              sx={{
                ml: 1,
                height: 20,
                minWidth: 20,
                fontSize: '0.7rem',
                backgroundColor: value === tab.value 
                  ? alpha('#fff', 0.2)
                  : alpha(tab.color || theme.palette.primary.main, 0.1),
                color: value === tab.value ? '#fff' : 'inherit',
              }}
            />
          )}
        </Button>
      ))}
    </Box>
  );
};

// Компонент карточки пользователя
interface UserCardProps {
  user: User;
  groups: Group[];
  clusters: Cluster[];
  users: User[];
  loading: boolean;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onAssign: (user: User, type: 'mentor' | 'group' | 'cluster' | 'admin') => void;
  onUnassignClick: (user: User, type: string, data?: any) => void;
  onOpenAccountantAssignment: (user: User) => void;
  getRoleColor: (role: UserRole) => string;
  getRoleIcon: (role: UserRole) => React.ReactNode;
}

const UserCard: React.FC<UserCardProps> = ({
  user,
  groups,
  clusters,
  users,
  loading,
  onEdit,
  onDelete,
  onAssign,
  onUnassignClick,
  onOpenAccountantAssignment,
  getRoleColor,
  getRoleIcon,
}) => {
  const theme = useTheme();
  
  const getUserGroupInfo = () => {
    const group = groups.find(g => g.id === user.groupId);
    const cluster = clusters.find(c => c.id === user.clusterId);
    const mentor = users.find(u => u.id === user.mentorId);
    const seniorSeller = users.find(u => u.id === user.seniorSellerId);
    return { group, cluster, mentor, seniorSeller };
  };

  const { group, cluster, mentor, seniorSeller } = getUserGroupInfo();
  const sellersCount = users.filter(u => u.mentorId === user.id).length;

  const renderAdminClusters = () => {
    if (!user.adminClusterIds || user.adminClusterIds.length === 0) return null;
    
    return (
      <Box sx={{ mt: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
          Кусты под управлением:
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {user.adminClusterIds.map((clusterId: number) => {
            const cluster = clusters.find(c => c.id === clusterId);
            return (
              <Box key={clusterId} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2">
                  • {cluster ? cluster.name : `Куст #${clusterId}`}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onUnassignClick(user, 'admin', { clusterId })}
                  sx={iOSStyles.unassignButton}
                >
                  Отвязать
                </Button>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  const renderAccountantAssignments = () => {
    if (!user.accountantUserIds || user.accountantUserIds.length === 0) return null;
    
    return (
      <Box sx={{ mt: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
          Привязано пользователей: {user.accountantUserIds.length}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {user.accountantUserIds.slice(0, 3).map((userId: number) => {
            const assignedUser = users.find(u => u.id === userId);
            return assignedUser ? (
              <Chip
                key={userId}
                label={assignedUser.fullName}
                size="small"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            ) : null;
          })}
          {user.accountantUserIds.length > 3 && (
            <Chip
              label={`+${user.accountantUserIds.length - 3}`}
              size="small"
              variant="outlined"
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Card sx={iOSStyles.card}>
      <CardContent sx={iOSStyles.cardContent}>
        {/* Заголовок с аватаром и ролью */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar 
            sx={{ 
              bgcolor: getRoleColor(user.role), 
              mr: 2,
              width: 48,
              height: 48,
            }}
          >
            {user.fullName.charAt(0)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight="bold" noWrap>
              {user.fullName}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {getRoleIcon(user.role)}
              <Typography variant="body2" color="text.secondary" noWrap>
                {getRoleName(user.role)}
              </Typography>
            </Box>
          </Box>
          <Chip
            label={user.username}
            size="small"
            sx={{ 
              ...iOSStyles.roleChip,
              backgroundColor: alpha(getRoleColor(user.role), 0.1),
              color: getRoleColor(user.role),
            }}
          />
        </Box>

        {/* Основная информация */}
        <Box sx={{ mb: 2 }}>
          {user.telegram && (
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Telegram:</strong> {user.telegram}
            </Typography>
          )}
          
          {user.city && (
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Город:</strong> {user.city}
            </Typography>
          )}
          
          {user.rate !== undefined && user.rate > 0 && (
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              <strong>Ставка:</strong> {user.rate}₽ за товар
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Связи - прокручиваемая область если много контента */}
        <Box sx={{ 
          flex: 1,
          overflowY: 'auto',
          maxHeight: 200,
          pr: 0.5,
          mb: 1,
        }}>
          {/* Для продавца */}
          {user.role === UserRole.SELLER && (
            <Stack spacing={1}>
              {group && (
                <Box sx={iOSStyles.infoRow}>
                  <Typography variant="body2">
                    <strong>Группа:</strong> {group.name}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => onUnassignClick(user, 'group')}
                    sx={iOSStyles.unassignButton}
                  >
                    Отвязать
                  </Button>
                </Box>
              )}
              {mentor && (
                <Box sx={iOSStyles.infoRow}>
                  <Typography variant="body2">
                    <strong>Наставник:</strong> {mentor.fullName}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => onUnassignClick(user, 'mentor')}
                    sx={iOSStyles.unassignButton}
                  >
                    Отвязать
                  </Button>
                </Box>
              )}
              {cluster && (
                <Box sx={iOSStyles.infoRow}>
                  <Typography variant="body2">
                    <strong>Куст:</strong> {cluster.name}
                  </Typography>
                </Box>
              )}
              {seniorSeller && (
                <Typography variant="body2">
                  <strong>Старший продавец:</strong> {seniorSeller.fullName}
                </Typography>
              )}
            </Stack>
          )}

          {/* Для наставника */}
          {user.role === UserRole.MENTOR && (
            <Stack spacing={1}>
              {group && (
                <Box sx={iOSStyles.infoRow}>
                  <Typography variant="body2">
                    <strong>Управляет группой:</strong> {group.name}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => onUnassignClick(user, 'mentorFromGroup')}
                    sx={iOSStyles.unassignButton}
                  >
                    Отвязать
                  </Button>
                </Box>
              )}
              {cluster && (
                <Box sx={iOSStyles.infoRow}>
                  <Typography variant="body2">
                    <strong>Куст:</strong> {cluster.name}
                  </Typography>
                </Box>
              )}
              {seniorSeller && (
                <Typography variant="body2">
                  <strong>Старший продавец:</strong> {seniorSeller.fullName}
                </Typography>
              )}
              <Typography variant="body2">
                <strong>Продавцов в группе:</strong> {sellersCount}
              </Typography>
            </Stack>
          )}

          {/* Для старшего продавца */}
          {user.role === UserRole.SENIOR_SELLER && (
            <Stack spacing={1}>
              {cluster && (
                <Box sx={iOSStyles.infoRow}>
                  <Typography variant="body2">
                    <strong>Управляет кустом:</strong> {cluster.name}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => onUnassignClick(user, 'seniorFromCluster')}
                    sx={iOSStyles.unassignButton}
                  >
                    Отвязать
                  </Button>
                </Box>
              )}
              {cluster && (
                <Typography variant="body2">
                  <strong>Групп в кусте:</strong> {groups.filter(g => g.clusterId === cluster.id).length}
                </Typography>
              )}
            </Stack>
          )}

          {/* Для администратора */}
          {user.role === UserRole.ADMIN && renderAdminClusters()}

          {/* Для бухгалтера */}
          {user.role === UserRole.ACCOUNTANT && renderAccountantAssignments()}
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Кнопки действий - всегда внизу */}
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 0.5,
          mt: 'auto',
        }}>
          {/* Кнопки назначения */}
          {user.role === UserRole.SELLER && (
            <>
              {!user.mentorId && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onAssign(user, 'mentor')}
                  disabled={loading}
                  sx={iOSStyles.actionButton}
                >
                  Наставник
                </Button>
              )}
              {!user.groupId && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onAssign(user, 'group')}
                  disabled={loading}
                  sx={iOSStyles.actionButton}
                >
                  В группу
                </Button>
              )}
            </>
          )}
          
          {user.role === UserRole.MENTOR && !user.clusterId && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => onAssign(user, 'cluster')}
              disabled={loading}
              sx={iOSStyles.actionButton}
            >
              В куст
            </Button>
          )}
          
          {user.role === UserRole.SENIOR_SELLER && !user.clusterId && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => onAssign(user, 'cluster')}
              disabled={loading}
              sx={iOSStyles.actionButton}
            >
              Назначить
            </Button>
          )}
          
          {user.role === UserRole.ADMIN && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => onAssign(user, 'admin')}
              disabled={loading}
              sx={iOSStyles.actionButton}
            >
              Кусты
            </Button>
          )}
          
          {user.role === UserRole.ACCOUNTANT && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => onOpenAccountantAssignment(user)}
              sx={{ 
                ...iOSStyles.actionButton,
                color: '#ff9800', 
                borderColor: '#ff9800',
                '&:hover': {
                  backgroundColor: alpha('#ff9800', 0.1),
                },
              }}
              disabled={loading}
            >
              Назначить
            </Button>
          )}
          
          {/* Кнопки редактирования и удаления */}
          <Button
            size="small"
            startIcon={<Edit />}
            onClick={() => onEdit(user)}
            disabled={loading}
            sx={iOSStyles.actionButton}
          />
          
          <Button
            size="small"
            startIcon={<Delete />}
            color="error"
            onClick={() => onDelete(user)}
            disabled={user.role === UserRole.OWNER || loading}
            sx={iOSStyles.actionButton}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

// Компонент карточки группы
interface GroupCardProps {
  group: Group;
  users: User[];
  groups: Group[];
  clusters: Cluster[];
  loading: boolean;
  onEdit: (group: Group) => void;
  onDelete: (group: Group) => void;
  onAddToCluster: (group: Group) => void;
  onRemoveFromCluster: (group: Group, clusterId: number) => void;
  onUnassignClick: (user: User, type: string, data?: any) => void;
  getRoleColor: (role: UserRole) => string;
}

const GroupCard: React.FC<GroupCardProps> = ({
  group,
  users,
  groups,
  clusters,
  loading,
  onEdit,
  onDelete,
  onAddToCluster,
  onRemoveFromCluster,
  onUnassignClick,
  getRoleColor,
}) => {
  const theme = useTheme();
  
  const mentor = users.find(u => u.id === group.mentorId);
  const cluster = clusters.find(c => c.id === group.clusterId);
  const seniorSeller = users.find(u => u.id === group.seniorSellerId);
  const sellersInGroup = users.filter(u => u.groupId === group.id);
  const groupsInSameCluster = cluster ? groups.filter(g => g.clusterId === cluster.id) : [];

  return (
    <Card sx={iOSStyles.card}>
      <CardContent sx={iOSStyles.cardContent}>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }} noWrap>
          {group.name}
        </Typography>
        
        {group.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {group.description}
          </Typography>
        )}
        
        <Box sx={{ flex: 1, mb: 2 }}>
          {/* Наставник */}
          <Box sx={iOSStyles.infoRow}>
            <Typography variant="body2">
              <strong>Наставник:</strong>{' '}
              {mentor ? (
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  <Avatar sx={{ width: 20, height: 20, bgcolor: getRoleColor(mentor.role) }}>
                    {mentor.fullName.charAt(0)}
                  </Avatar>
                  {mentor.fullName}
                </Box>
              ) : 'Не назначен'}
            </Typography>
          </Box>
          
          {/* Куст */}
          <Box sx={iOSStyles.infoRow}>
            <Typography variant="body2">
              <strong>Куст:</strong> {cluster ? cluster.name : 'Не назначен'}
            </Typography>
            {cluster && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => onRemoveFromCluster(group, cluster.id)}
                sx={iOSStyles.unassignButton}
              >
                Отвязать
              </Button>
            )}
          </Box>
          
          {/* Старший продавец */}
          {seniorSeller && (
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Старший продавец:</strong> {seniorSeller.fullName}
            </Typography>
          )}
          
          {/* Статистика */}
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>Продавцов в группе:</strong> {sellersInGroup.length}
          </Typography>
          
          {cluster && (
            <Typography variant="body2">
              <strong>Групп в кусте:</strong> {groupsInSameCluster.length}
            </Typography>
          )}
        </Box>
        
        {/* Продавцы в группе */}
        {sellersInGroup.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
              Продавцы:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: 60, overflowY: 'auto' }}>
              {sellersInGroup.map(seller => (
                <Chip
                  key={seller.id}
                  label={seller.fullName}
                  size="small"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              ))}
            </Box>
          </Box>
        )}
        
        <Divider sx={{ my: 1 }} />
        
        {/* Кнопки действий */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 'auto' }}>
          {!group.clusterId && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => onAddToCluster(group)}
              disabled={loading}
              sx={iOSStyles.actionButton}
            >
              В куст
            </Button>
          )}
          
          <Button
            size="small"
            startIcon={<Edit />}
            onClick={() => onEdit(group)}
            disabled={loading}
            sx={iOSStyles.actionButton}
          />
          
          <Button
            size="small"
            startIcon={<Delete />}
            color="error"
            onClick={() => onDelete(group)}
            disabled={sellersInGroup.length > 0 || loading}
            sx={iOSStyles.actionButton}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

// Компонент карточки куста
interface ClusterCardProps {
  cluster: Cluster;
  users: User[];
  groups: Group[];
  clusters: Cluster[];
  loading: boolean;
  onEdit: (cluster: Cluster) => void;
  onDelete: (cluster: Cluster) => void;
  onAddGroup: (cluster: Cluster, groupId: number) => void;
  onRemoveGroup: (cluster: Cluster, groupId: number) => void;
  onUnassignClick: (user: User, type: string, data?: any) => void;
  getRoleColor: (role: UserRole) => string;
}

const ClusterCard: React.FC<ClusterCardProps> = ({
  cluster,
  users,
  groups,
  loading,
  onEdit,
  onDelete,
  onAddGroup,
  onRemoveGroup,
  onUnassignClick,
  getRoleColor,
}) => {
  const theme = useTheme();
  
  const seniorSeller = users.find(u => u.id === cluster.seniorSellerId);
  const admin = users.find(u => u.id === cluster.adminId);
  const groupsInCluster = groups.filter(group => group.clusterId === cluster.id);
  const sellersInCluster = users.filter(u => u.clusterId === cluster.id);
  const groupsWithoutCluster = groups.filter(g => !g.clusterId);

  return (
    <Card sx={iOSStyles.card}>
      <CardContent sx={iOSStyles.cardContent}>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }} noWrap>
          {cluster.name}
        </Typography>
        
        {cluster.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {cluster.description}
          </Typography>
        )}
        
        <Box sx={{ flex: 1, mb: 2 }}>
          {/* Старший продавец */}
          <Box sx={iOSStyles.infoRow}>
            <Typography variant="body2">
              <strong>Старший продавец:</strong>{' '}
              {seniorSeller ? (
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  <Avatar sx={{ width: 20, height: 20, bgcolor: getRoleColor(seniorSeller.role) }}>
                    {seniorSeller.fullName.charAt(0)}
                  </Avatar>
                  {seniorSeller.fullName}
                </Box>
              ) : 'Не назначен'}
            </Typography>
            {seniorSeller && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => onUnassignClick(seniorSeller, 'seniorFromCluster')}
                sx={iOSStyles.unassignButton}
              >
                Отвязать
              </Button>
            )}
          </Box>
          
          {/* Администратор */}
          <Box sx={iOSStyles.infoRow}>
            <Typography variant="body2">
              <strong>Администратор:</strong>{' '}
              {admin ? (
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  <Avatar sx={{ width: 20, height: 20, bgcolor: getRoleColor(admin.role) }}>
                    {admin.fullName.charAt(0)}
                  </Avatar>
                  {admin.fullName}
                </Box>
              ) : 'Не назначен'}
            </Typography>
            {admin && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => onUnassignClick(admin, 'admin', { clusterId: cluster.id })}
                sx={iOSStyles.unassignButton}
              >
                Отвязать
              </Button>
            )}
          </Box>
          
          {/* Статистика */}
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            <strong>Групп в кусте:</strong> {groupsInCluster.length}
          </Typography>
          
          <Typography variant="body2">
            <strong>Продавцов в кусте:</strong> {sellersInCluster.length}
          </Typography>
        </Box>
        
        {/* Группы в кусте */}
        {groupsInCluster.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
              Группы в кусте:
            </Typography>
            <Box sx={{ maxHeight: 80, overflowY: 'auto', pr: 0.5 }}>
              {groupsInCluster.map(group => {
                const groupMentor = users.find(u => u.id === group.mentorId);
                return (
                  <Box key={group.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                      • {group.name}
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => onRemoveGroup(cluster, group.id)}
                      sx={iOSStyles.unassignButton}
                    >
                      Отвязать
                    </Button>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
        
        {/* Доступные группы для добавления */}
        {groupsWithoutCluster.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
              Добавить группу:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxHeight: 60, overflowY: 'auto' }}>
              {groupsWithoutCluster.slice(0, 3).map(group => (
                <Chip
                  key={group.id}
                  label={group.name}
                  size="small"
                  onClick={() => onAddGroup(cluster, group.id)}
                  disabled={loading}
                  sx={{ height: 24, fontSize: '0.7rem' }}
                />
              ))}
              {groupsWithoutCluster.length > 3 && (
                <Chip
                  label={`+${groupsWithoutCluster.length - 3}`}
                  size="small"
                  variant="outlined"
                  sx={{ height: 24, fontSize: '0.7rem' }}
                />
              )}
            </Box>
          </Box>
        )}
        
        <Divider sx={{ my: 1 }} />
        
        {/* Кнопки действий */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 'auto' }}>
          <Button
            size="small"
            startIcon={<Edit />}
            onClick={() => onEdit(cluster)}
            disabled={loading}
            sx={iOSStyles.actionButton}
          />
          
          <Button
            size="small"
            startIcon={<Delete />}
            color="error"
            onClick={() => onDelete(cluster)}
            disabled={groupsInCluster.length > 0 || sellersInCluster.length > 0 || loading}
            sx={iOSStyles.actionButton}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

// Основной компонент (остается без изменений, только импорты обновлены)
const StaffPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Данные
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);

  // Диалоги
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState<User | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState<User | null>(null);
  const [openCreateGroupDialog, setOpenCreateGroupDialog] = useState(false);
  const [openEditGroupDialog, setOpenEditGroupDialog] = useState<Group | null>(null);
  const [openCreateClusterDialog, setOpenCreateClusterDialog] = useState(false);
  const [openEditClusterDialog, setOpenEditClusterDialog] = useState<Cluster | null>(null);
  const [openAssignDialog, setOpenAssignDialog] = useState<{
    open: boolean;
    user: User | null;
    type: 'mentor' | 'group' | 'cluster' | 'admin' | null;
  }>({ open: false, user: null, type: null });

  // Диалоги подтверждения отвязки
  const [unassignDialog, setUnassignDialog] = useState<UnassignDialogState>({
    open: false,
    user: null,
    type: '',
    data: undefined
  });

  // Диалог назначения бухгалтера
  const [openAccountantAssignmentDialog, setOpenAccountantAssignmentDialog] = useState<{
    open: boolean;
    accountantId: number;
    accountantName: string;
  }>({ open: false, accountantId: 0, accountantName: '' });

  // Формы
  const [newUser, setNewUser] = useState<CreateUserDto>({
    username: '',
    password: 'TempPass123!',
    fullName: '',
    role: UserRole.SELLER,
    telegram: '',
    city: '',
    rate: 0,
  });

  const [editUser, setEditUser] = useState<UpdateUserDto>({});
  const [showPassword, setShowPassword] = useState(false);

  const [newGroup, setNewGroup] = useState<CreateGroupDto>({
    name: '',
    mentorId: 0,
    description: '',
  });

  const [editGroup, setEditGroup] = useState<UpdateGroupDto>({});

  const [newCluster, setNewCluster] = useState<CreateClusterDto>({
    name: '',
    seniorSellerId: 0,
    description: '',
  });

  const [editCluster, setEditCluster] = useState<UpdateClusterDto>({});

  // Для диалогов назначения
  const [selectedMentor, setSelectedMentor] = useState<number>(0);
  const [selectedGroup, setSelectedGroup] = useState<number>(0);
  const [selectedCluster, setSelectedCluster] = useState<number>(0);
  const [selectedClustersForAdmin, setSelectedClustersForAdmin] = useState<number[]>([]);

  // Поиск
  const [searchQuery, setSearchQuery] = useState('');

  // Загрузка данных
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadUsers(),
        loadGroups(),
        loadClusters(),
      ]);
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
      showSnackbar('Ошибка при загрузке данных', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await userService.getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Ошибка при загрузке пользователей:', error);
      throw error;
    }
  };

  const loadGroups = async () => {
    try {
      const data = await groupService.getAllGroups();
      // Обогащаем данные групп информацией о наставниках
      const enrichedGroups = data.map(group => ({
        ...group,
        mentorName: users.find(u => u.id === group.mentorId)?.fullName || 'Не назначен',
        clusterName: clusters.find(c => c.id === group.clusterId)?.name || 'Не назначен',
        seniorSellerName: users.find(u => u.id === group.seniorSellerId)?.fullName || 'Не назначен',
      }));
      setGroups(enrichedGroups);
    } catch (error) {
      console.error('Ошибка при загрузке групп:', error);
      throw error;
    }
  };

  const loadClusters = async () => {
    try {
      const data = await clusterService.getAllClusters();
      setClusters(data);
    } catch (error) {
      console.error('Ошибка при загрузке кустов:', error);
      throw error;
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getRoleColor = (role: UserRole): string => {
    const colors = {
      [UserRole.OWNER]: '#ca0ec0',
      [UserRole.ADMIN]: '#2a436d',
      [UserRole.SENIOR_SELLER]: '#3f1f4b',
      [UserRole.MENTOR]: '#56b8d1',
      [UserRole.SELLER]: '#674fb6',
      [UserRole.ACCOUNTANT]: '#ff9800',
    };
    return colors[role];
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.OWNER:
        return <BusinessCenter sx={{ fontSize: 16 }} />;
      case UserRole.ADMIN:
        return <AdminPanelSettings sx={{ fontSize: 16 }} />;
      case UserRole.SENIOR_SELLER:
        return <SupervisorAccount sx={{ fontSize: 16 }} />;
      case UserRole.MENTOR:
        return <Person sx={{ fontSize: 16 }} />;
      case UserRole.SELLER:
        return <People sx={{ fontSize: 16 }} />;
      case UserRole.ACCOUNTANT:
        return <AttachMoney sx={{ fontSize: 16 }} />;
      default:
        return <Person sx={{ fontSize: 16 }} />;
    }
  };

  // ================ УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ================
  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.fullName) {
      showSnackbar('Заполните обязательные поля', 'error');
      return;
    }

    try {
      setLoading(true);
      await userService.createUser(newUser);
      await loadUsers();
      setOpenCreateDialog(false);
      resetNewUserForm();
      showSnackbar('Пользователь успешно создан', 'success');
    } catch (error: any) {
      console.error('Ошибка при создании пользователя:', error);
      const errorMessage = error.response?.data?.detail || 
                         error.response?.data?.message || 
                         'Ошибка при создании пользователя';
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!openEditDialog) return;

    try {
      setLoading(true);
      await userService.updateUser(openEditDialog.id, editUser);
      await loadUsers();
      setOpenEditDialog(null);
      setEditUser({});
      showSnackbar('Пользователь успешно обновлен', 'success');
    } catch (error: any) {
      console.error('Ошибка при обновлении пользователя:', error);
      const errorMessage = error.response?.data?.detail || 
                         error.response?.data?.message || 
                         'Ошибка при обновлении пользователя';
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!openDeleteDialog) return;

    if (openDeleteDialog.role === UserRole.OWNER) {
      showSnackbar('Нельзя удалить владельца системы', 'error');
      return;
    }

    if (openDeleteDialog.id === currentUser?.id) {
      showSnackbar('Вы не можете удалить свой аккаунт', 'error');
      return;
    }

    try {
      setLoading(true);
      await userService.deleteUser(openDeleteDialog.id);
      await loadUsers();
      setOpenDeleteDialog(null);
      showSnackbar('Пользователь успешно удален', 'success');
    } catch (error: any) {
      console.error('Ошибка при удалении пользователя:', error);
      const errorMessage = error.response?.data?.detail || 
                         error.response?.data?.message || 
                         'Ошибка при удалении пользователя';
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetNewUserForm = () => {
    setNewUser({
      username: '',
      password: 'TempPass123!',
      fullName: '',
      role: UserRole.SELLER,
      telegram: '',
      city: '',
      rate: 0,
    });
  };

  // ================ УПРАВЛЕНИЕ ГРУППАМИ ================
  const handleCreateGroup = async () => {
    if (!newGroup.name || !newGroup.mentorId) {
      showSnackbar('Заполните обязательные поля', 'error');
      return;
    }

    try {
      setLoading(true);
      await groupService.createGroup(newGroup);
      await loadGroups();
      await loadUsers();
      setOpenCreateGroupDialog(false);
      setNewGroup({ name: '', mentorId: 0, description: '' });
      showSnackbar('Группа успешно создана', 'success');
    } catch (error: any) {
      console.error('Ошибка при создании группы:', error);
      const errorMessage = error.response?.data?.detail || 
                         error.response?.data?.message || 
                         'Ошибка при создании группы';
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGroup = async () => {
    if (!openEditGroupDialog) return;

    try {
      setLoading(true);
      await groupService.updateGroup(openEditGroupDialog.id, editGroup);
      await loadGroups();
      setOpenEditGroupDialog(null);
      setEditGroup({});
      showSnackbar('Группа успешно обновлена', 'success');
    } catch (error: any) {
      console.error('Ошибка при обновлении группы:', error);
      const errorMessage = error.response?.data?.detail || 
                         error.response?.data?.message || 
                         'Ошибка при обновлении группы';
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (group: Group) => {
    try {
      setLoading(true);
      await groupService.deleteGroup(group.id);
      await loadGroups();
      await loadUsers();
      showSnackbar('Группа успешно удалена', 'success');
    } catch (error: any) {
      console.error('Ошибка при удалении группы:', error);
      const errorMessage = error.response?.data?.detail || 
                         error.response?.data?.message || 
                         'Ошибка при удалении группы';
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ================ УПРАВЛЕНИЕ КУСТАМИ ================
  const handleCreateCluster = async () => {
    if (!newCluster.name || !newCluster.seniorSellerId) {
      showSnackbar('Заполните обязательные поля', 'error');
      return;
    }

    try {
      setLoading(true);
      await clusterService.createCluster(newCluster);
      await loadClusters();
      await loadUsers();
      setOpenCreateClusterDialog(false);
      setNewCluster({ name: '', seniorSellerId: 0, description: '' });
      showSnackbar('Куст успешно создан', 'success');
    } catch (error: any) {
      console.error('Ошибка при создании куста:', error);
      const errorMessage = error.response?.data?.detail || 
                         error.response?.data?.message || 
                         'Ошибка при создании куста';
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCluster = async () => {
    if (!openEditClusterDialog) return;

    try {
      setLoading(true);
      await clusterService.updateCluster(openEditClusterDialog.id, editCluster);
      await loadClusters();
      setOpenEditClusterDialog(null);
      setEditCluster({});
      showSnackbar('Куст успешно обновлен', 'success');
    } catch (error: any) {
      console.error('Ошибка при обновлении куста:', error);
      const errorMessage = error.response?.data?.detail || 
                         error.response?.data?.message || 
                         'Ошибка при обновлении куста';
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCluster = async (cluster: Cluster) => {
    try {
      setLoading(true);
      await clusterService.deleteCluster(cluster.id);
      await loadClusters();
      await loadUsers();
      await loadGroups();
      showSnackbar('Куст успешно удален', 'success');
    } catch (error: any) {
      console.error('Ошибка при удалении куста:', error);
      const errorMessage = error.response?.data?.detail || 
                         error.response?.data?.message || 
                         'Ошибка при удалении куста';
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ================ ФУНКЦИИ ОТВЯЗКИ ================
  const handleUnassignClick = (user: User, type: string, data?: any) => {
    setUnassignDialog({ open: true, user, type, data });
  };

  const handleConfirmUnassign = async () => {
    const { user, type, data } = unassignDialog;
    if (!user) return;

    setLoading(true);
    try {
      switch (type) {
        case 'mentor':
          await assignmentsService.removeSellerFromGroup(user.id);
          showSnackbar('Продавец отвязан от наставника', 'success');
          break;
        case 'group':
          await assignmentsService.removeSellerFromGroup(user.id);
          showSnackbar('Продавец удален из группы', 'success');
          break;
        case 'mentorFromGroup':
          await assignmentsService.removeMentorFromGroup(user.id);
          showSnackbar('Наставник отвязан от группы', 'success');
          break;
        case 'seniorFromCluster':
          await assignmentsService.removeSeniorFromCluster(user.id);
          showSnackbar('Старший продавец отвязан от куста', 'success');
          break;
        case 'admin':
          if (data?.clusterId) {
            await assignmentsService.removeAdminFromCluster(user.id, data.clusterId);
            showSnackbar('Администратор отвязан от куста', 'success');
          }
          break;
        case 'groupFromCluster':
          if (data?.groupId && data?.clusterId) {
            await clusterService.removeGroupFromCluster(data.clusterId, data.groupId);
            showSnackbar('Группа удалена из куста', 'success');
          }
          break;
      }
      await loadAllData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Ошибка при отвязке';
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
      setUnassignDialog({ open: false, user: null, type: '' });
    }
  };

  // ================ ФУНКЦИИ НАЗНАЧЕНИЯ ================
  const openAssignmentDialog = (user: User, type: 'mentor' | 'group' | 'cluster' | 'admin') => {
    setOpenAssignDialog({ open: true, user, type });
    
    // Устанавливаем начальные значения
    if (type === 'mentor') {
      if (user.role === UserRole.MENTOR && user.groupId) {
        setSelectedGroup(user.groupId);
      }
      setSelectedMentor(user.mentorId || 0);
    }
    if (type === 'group') setSelectedGroup(user.groupId || 0);
    if (type === 'cluster') setSelectedCluster(user.clusterId || 0);
    if (type === 'admin') setSelectedClustersForAdmin(user.adminClusterIds || []);
  };

  const handleOpenAccountantAssignment = (accountant: User) => {
    setOpenAccountantAssignmentDialog({
      open: true,
      accountantId: accountant.id,
      accountantName: accountant.fullName,
    });
  };

  const handleAccountantAssignmentSuccess = () => {
    showSnackbar('Назначения успешно сохранены', 'success');
    loadUsers();
  };

  const handleAssign = async () => {
    const { user, type } = openAssignDialog;
    if (!user || !type) return;

    try {
      setLoading(true);
      
      switch (type) {
        case 'mentor':
          if (!selectedMentor) {
            showSnackbar('Выберите наставника', 'error');
            return;
          }
          
          const mentor = users.find(u => u.id === selectedMentor);
          if (mentor?.groupId) {
            await assignmentsService.assignSellerToGroup(user.id, mentor.groupId);
            showSnackbar('Продавец добавлен в группу наставника', 'success');
          } else {
            await assignmentsService.assignSellerToMentor(user.id, selectedMentor);
            showSnackbar('Продавец назначен наставнику и создана новая группа', 'success');
          }
          break;
        
        case 'group':
          if (!selectedGroup) {
            showSnackbar('Выберите группу', 'error');
            return;
          }
          
          await assignmentsService.assignSellerToGroup(user.id, selectedGroup);
          showSnackbar('Продавец добавлен в группу', 'success');
          break;
        
        case 'cluster':
          if (!selectedCluster) {
            showSnackbar('Выберите куст', 'error');
            return;
          }
          
          if (user.role === UserRole.MENTOR) {
            await assignmentsService.assignMentorToCluster(user.id, selectedCluster);
            showSnackbar('Наставник добавлен в куст', 'success');
          } else if (user.role === UserRole.SENIOR_SELLER) {
            await assignmentsService.assignSeniorToCluster(user.id, selectedCluster);
            showSnackbar('Старший продавец назначен кусту', 'success');
          }
          break;
        
        case 'admin':
          if (selectedClustersForAdmin.length === 0) {
            showSnackbar('Выберите хотя бы один куст', 'error');
            return;
          }
          
          const currentClusters = user.adminClusterIds || [];
          const clustersToAdd = selectedClustersForAdmin.filter(id => !currentClusters.includes(id));
          
          for (const clusterId of clustersToAdd) {
            await assignmentsService.assignAdminToCluster(user.id, clusterId);
          }
          
          showSnackbar(`Добавлено ${clustersToAdd.length} кустов администратору`, 'success');
          break;
      }
      
      await loadAllData();
      setOpenAssignDialog({ open: false, user: null, type: null });
      
      setSelectedMentor(0);
      setSelectedGroup(0);
      setSelectedCluster(0);
      setSelectedClustersForAdmin([]);
      
    } catch (error: any) {
      console.error('Ошибка при назначении:', error);
      const errorMessage = error.response?.data?.detail || 'Ошибка при назначении';
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ================ ФУНКЦИИ ДЛЯ ДОБАВЛЕНИЯ ГРУПП В КУСТ ================
  const handleAddGroupToCluster = async (cluster: Cluster, groupId: number) => {
    try {
      setLoading(true);
      await assignmentsService.assignGroupToCluster(groupId, cluster.id);
      showSnackbar('Группа добавлена в куст', 'success');
      await loadAllData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Ошибка при добавлении группы в куст';
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveGroupFromCluster = async (cluster: Cluster, groupId: number) => {
    handleUnassignClick(
      { id: 0, fullName: '' } as User, 
      'groupFromCluster', 
      { groupId, clusterId: cluster.id }
    );
  };

  // Фильтрация пользователей
  const filteredUsers = users.filter(user => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        user.username.toLowerCase().includes(query) ||
        user.fullName.toLowerCase().includes(query) ||
        user.telegram?.toLowerCase().includes(query) ||
        user.city?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Фильтры для диалогов
  const availableMentors = users.filter(u => u.role === UserRole.MENTOR);
  const availableSeniorSellers = users.filter(u => u.role === UserRole.SENIOR_SELLER && !u.clusterId);
  const groupsWithoutCluster = groups.filter(g => !g.clusterId);

  // Подсчеты для табов
  const stats = {
    users: users.length,
    groups: groups.length,
    clusters: clusters.length,
  };

  // Цвета для табов
  const tabColors = {
    0: '#674fb6', // Пользователи
    1: '#56b8d1', // Группы
    2: '#3f1f4b', // Кусты
  };

  const tabs = [
    { label: 'Пользователи', icon: <People />, value: 0, count: stats.users, color: tabColors[0] },
    { label: 'Группы', icon: <GroupsIcon />, value: 1, count: stats.groups, color: tabColors[1] },
    { label: 'Кусты', icon: <Business />, value: 2, count: stats.clusters, color: tabColors[2] },
  ];

  if (loading && users.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Загрузка данных...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Заголовок */}
      <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Typography variant="h4" component="h1" color="#2a0f35">
            Управление персоналом
          </Typography>
          <Typography variant="body1" color="#4c5454">
            Управление пользователями, группами и кустами
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: { md: 'right' } }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadAllData}
            sx={iOSStyles.button}
            disabled={loading}
          >
            {loading ? 'Обновление...' : 'Обновить'}
          </Button>
        </Grid>
      </Grid>

      {/* Поиск */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Поиск по имени, логину, телеграм или городу..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ color: '#4c5454', mr: 1 }} />,
          }}
        />
      </Paper>

      {/* Пины-табы */}
      <Paper sx={{ mb: 3 }}>
        <TabChips value={activeTab} onChange={setActiveTab} tabs={tabs} />

        {/* Вкладка пользователей */}
        {activeTab === 0 && (
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<PersonAdd />}
                onClick={() => setOpenCreateDialog(true)}
                sx={{ 
                  ...iOSStyles.button,
                  backgroundColor: tabColors[0],
                  '&:hover': { backgroundColor: alpha(tabColors[0], 0.8) },
                }}
                disabled={loading}
              >
                Добавить пользователя
              </Button>
            </Box>

            <Grid container spacing={2}>
              {filteredUsers.map(user => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={user.id}>
                  <UserCard
                    user={user}
                    groups={groups}
                    clusters={clusters}
                    users={users}
                    loading={loading}
                    onEdit={(user) => {
                      setOpenEditDialog(user);
                      setEditUser({
                        username: user.username,
                        fullName: user.fullName,
                        telegram: user.telegram,
                        city: user.city,
                        role: user.role,
                        rate: user.rate,
                      });
                    }}
                    onDelete={(user) => setOpenDeleteDialog(user)}
                    onAssign={openAssignmentDialog}
                    onUnassignClick={handleUnassignClick}
                    onOpenAccountantAssignment={handleOpenAccountantAssignment}
                    getRoleColor={getRoleColor}
                    getRoleIcon={getRoleIcon}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Вкладка групп */}
        {activeTab === 1 && (
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<GroupsIcon />}
                onClick={() => setOpenCreateGroupDialog(true)}
                sx={{ 
                  ...iOSStyles.button,
                  backgroundColor: tabColors[1],
                  '&:hover': { backgroundColor: alpha(tabColors[1], 0.8) },
                }}
                disabled={loading}
              >
                Создать группу
              </Button>
            </Box>

            <Grid container spacing={2}>
              {groups.map(group => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={group.id}>
                  <GroupCard
                    group={group}
                    users={users}
                    groups={groups}
                    clusters={clusters}
                    loading={loading}
                    onEdit={(group) => {
                      setOpenEditGroupDialog(group);
                      setEditGroup({
                        name: group.name,
                        description: group.description,
                      });
                    }}
                    onDelete={handleDeleteGroup}
                    onAddToCluster={(group) => {
                      const cluster = clusters.find(c => c.id === group.clusterId);
                      if (!cluster && groupsWithoutCluster.length > 0) {
                        const dialog = window.prompt(
                          'Выберите куст для добавления группы:\n' +
                          clusters.map(c => `${c.id}: ${c.name}`).join('\n') +
                          '\n\nВведите ID куста:'
                        );
                        if (dialog && !isNaN(Number(dialog))) {
                          const selectedCluster = clusters.find(c => c.id === Number(dialog));
                          if (selectedCluster) {
                            handleAddGroupToCluster(selectedCluster, group.id);
                          }
                        }
                      }
                    }}
                    onRemoveFromCluster={(group, clusterId) => {
                      handleUnassignClick(
                        {} as User,
                        'groupFromCluster',
                        { groupId: group.id, clusterId }
                      );
                    }}
                    onUnassignClick={handleUnassignClick}
                    getRoleColor={getRoleColor}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Вкладка кустов */}
        {activeTab === 2 && (
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Button
                variant="contained"
                startIcon={<Domain />}
                onClick={() => setOpenCreateClusterDialog(true)}
                sx={{ 
                  ...iOSStyles.button,
                  backgroundColor: tabColors[2],
                  '&:hover': { backgroundColor: alpha(tabColors[2], 0.8) },
                }}
                disabled={loading}
              >
                Создать куст
              </Button>
            </Box>

            <Grid container spacing={2}>
              {clusters.map(cluster => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={cluster.id}>
                  <ClusterCard
                    cluster={cluster}
                    users={users}
                    groups={groups}
                    clusters={clusters}
                    loading={loading}
                    onEdit={(cluster) => {
                      setOpenEditClusterDialog(cluster);
                      setEditCluster({
                        name: cluster.name,
                        description: cluster.description,
                      });
                    }}
                    onDelete={handleDeleteCluster}
                    onAddGroup={handleAddGroupToCluster}
                    onRemoveGroup={handleRemoveGroupFromCluster}
                    onUnassignClick={handleUnassignClick}
                    getRoleColor={getRoleColor}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Диалоги (без изменений) */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Создать пользователя</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Логин"
              fullWidth
              required
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            />
            <TextField
              label="Пароль"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              required
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="ФИО"
              fullWidth
              required
              value={newUser.fullName}
              onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Роль</InputLabel>
              <Select
                label="Роль"
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
              >
                {Object.values(UserRole).map((role) => (
                  <MenuItem key={role} value={role}>
                    {getRoleName(role)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Telegram"
              fullWidth
              value={newUser.telegram || ''}
              onChange={(e) => setNewUser({ ...newUser, telegram: e.target.value })}
            />
            <TextField
              label="Город"
              fullWidth
              value={newUser.city || ''}
              onChange={(e) => setNewUser({ ...newUser, city: e.target.value })}
            />
            <TextField
              label="Ставка за товар (₽)"
              type="number"
              fullWidth
              value={newUser.rate || ''}
              onChange={(e) => setNewUser({ ...newUser, rate: Number(e.target.value) })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={handleCreateUser} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог редактирования пользователя */}
      <Dialog open={!!openEditDialog} onClose={() => setOpenEditDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Редактировать пользователя</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Логин"
              fullWidth
              value={editUser.username || ''}
              onChange={(e) => setEditUser({ ...editUser, username: e.target.value })}
            />
            <TextField
              label="ФИО"
              fullWidth
              value={editUser.fullName || ''}
              onChange={(e) => setEditUser({ ...editUser, fullName: e.target.value })}
            />
            <TextField
              label="Telegram"
              fullWidth
              value={editUser.telegram || ''}
              onChange={(e) => setEditUser({ ...editUser, telegram: e.target.value })}
            />
            <TextField
              label="Город"
              fullWidth
              value={editUser.city || ''}
              onChange={(e) => setEditUser({ ...editUser, city: e.target.value })}
            />
            <TextField
              label="Ставка за товар (₽)"
              type="number"
              fullWidth
              value={editUser.rate || ''}
              onChange={(e) => setEditUser({ ...editUser, rate: Number(e.target.value) })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(null)} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={handleUpdateUser} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог удаления пользователя */}
      <Dialog open={!!openDeleteDialog} onClose={() => setOpenDeleteDialog(null)}>
        <DialogTitle>Подтверждение удаления</DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите удалить пользователя "{openDeleteDialog?.fullName}"?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            Это действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(null)} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Удалить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог создания группы */}
      <Dialog open={openCreateGroupDialog} onClose={() => setOpenCreateGroupDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Создать группу</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Название группы"
              fullWidth
              required
              value={newGroup.name}
              onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
            />
            <FormControl fullWidth required>
              <InputLabel>Наставник</InputLabel>
              <Select
                label="Наставник"
                value={newGroup.mentorId}
                onChange={(e) => setNewGroup({ ...newGroup, mentorId: Number(e.target.value) })}
              >
                <MenuItem value={0}>-- Выберите наставника --</MenuItem>
                {availableMentors.map((mentor) => (
                  <MenuItem key={mentor.id} value={mentor.id}>
                    {mentor.fullName} ({mentor.username})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Описание"
              fullWidth
              multiline
              rows={3}
              value={newGroup.description || ''}
              onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateGroupDialog(false)} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={handleCreateGroup} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог редактирования группы */}
      <Dialog open={!!openEditGroupDialog} onClose={() => setOpenEditGroupDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Редактировать группу</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Название группы"
              fullWidth
              value={editGroup.name || ''}
              onChange={(e) => setEditGroup({ ...editGroup, name: e.target.value })}
            />
            <TextField
              label="Описание"
              fullWidth
              multiline
              rows={3}
              value={editGroup.description || ''}
              onChange={(e) => setEditGroup({ ...editGroup, description: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditGroupDialog(null)} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={handleUpdateGroup} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог создания куста */}
      <Dialog open={openCreateClusterDialog} onClose={() => setOpenCreateClusterDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Создать куст</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Название куста"
              fullWidth
              required
              value={newCluster.name}
              onChange={(e) => setNewCluster({ ...newCluster, name: e.target.value })}
            />
            <FormControl fullWidth required>
              <InputLabel>Старший продавец</InputLabel>
              <Select
                label="Старший продавец"
                value={newCluster.seniorSellerId}
                onChange={(e) => setNewCluster({ ...newCluster, seniorSellerId: Number(e.target.value) })}
              >
                <MenuItem value={0}>-- Выберите старшего продавца --</MenuItem>
                {availableSeniorSellers.map((senior) => (
                  <MenuItem key={senior.id} value={senior.id}>
                    {senior.fullName} ({senior.username})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Описание"
              fullWidth
              multiline
              rows={3}
              value={newCluster.description || ''}
              onChange={(e) => setNewCluster({ ...newCluster, description: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateClusterDialog(false)} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={handleCreateCluster} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог редактирования куста */}
      <Dialog open={!!openEditClusterDialog} onClose={() => setOpenEditClusterDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Редактировать куст</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Название куста"
              fullWidth
              value={editCluster.name || ''}
              onChange={(e) => setEditCluster({ ...editCluster, name: e.target.value })}
            />
            <TextField
              label="Описание"
              fullWidth
              multiline
              rows={3}
              value={editCluster.description || ''}
              onChange={(e) => setEditCluster({ ...editCluster, description: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditClusterDialog(null)} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={handleUpdateCluster} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} /> : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог назначения */}
      <Dialog 
        open={openAssignDialog.open} 
        onClose={() => setOpenAssignDialog({ open: false, user: null, type: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {openAssignDialog.type === 'mentor' && 'Назначить наставника'}
          {openAssignDialog.type === 'group' && 'Добавить в группу'}
          {openAssignDialog.type === 'cluster' && 'Добавить в куст'}
          {openAssignDialog.type === 'admin' && 'Назначить кусты администратору'}
        </DialogTitle>
        <DialogContent>
          {openAssignDialog.type === 'mentor' && (
            <>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Выберите наставника</InputLabel>
                <Select
                  value={selectedMentor}
                  label="Выберите наставника"
                  onChange={(e) => {
                    setSelectedMentor(Number(e.target.value));
                    const mentor = users.find(u => u.id === Number(e.target.value));
                    if (mentor?.groupId) {
                      const group = groups.find(g => g.id === mentor.groupId);
                      if (group) {
                        showSnackbar(`У наставника уже есть группа: "${group.name}"`, 'info');
                      }
                    }
                  }}
                >
                  <MenuItem value={0}>-- Не выбран --</MenuItem>
                  {availableMentors.map((mentor) => (
                    <MenuItem key={mentor.id} value={mentor.id}>
                      {mentor.fullName} ({mentor.username})
                      {mentor.groupId ? ' (есть группа)' : ' (без группы)'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {selectedMentor > 0 && (
                <Box sx={{ mt: 2, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="body2">
                    {(() => {
                      const mentor = users.find(u => u.id === selectedMentor);
                      if (!mentor) return null;
                      
                      if (mentor.groupId) {
                        const group = groups.find(g => g.id === mentor.groupId);
                        return (
                          <>
                            У наставника уже есть группа: <strong>{group?.name}</strong>
                            <br />
                            Продавец будет добавлен в эту группу.
                          </>
                        );
                      } else {
                        return (
                          <>
                            У наставника нет группы.
                            <br />
                            Будет создана новая группа с этим наставником.
                          </>
                        );
                      }
                    })()}
                  </Typography>
                </Box>
              )}
            </>
          )}
          
          {openAssignDialog.type === 'group' && (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Выберите группу</InputLabel>
              <Select
                value={selectedGroup}
                label="Выберите группу"
                onChange={(e) => setSelectedGroup(Number(e.target.value))}
              >
                <MenuItem value={0}>-- Не выбрана --</MenuItem>
                {groups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name} (Наставник: {users.find(u => u.id === group.mentorId)?.fullName || 'Не назначен'})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          
          {openAssignDialog.type === 'cluster' && (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Выберите куст</InputLabel>
              <Select
                value={selectedCluster}
                label="Выберите куст"
                onChange={(e) => setSelectedCluster(Number(e.target.value))}
              >
                <MenuItem value={0}>-- Не выбран --</MenuItem>
                {clusters.map((cluster) => (
                  <MenuItem key={cluster.id} value={cluster.id}>
                    {cluster.name} (Старший продавец: {users.find(u => u.id === cluster.seniorSellerId)?.fullName || 'Не назначен'})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          
          {openAssignDialog.type === 'admin' && (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Выберите кусты</InputLabel>
              <Select
                multiple
                value={selectedClustersForAdmin}
                label="Выберите кусты"
                onChange={(e) => setSelectedClustersForAdmin(e.target.value as number[])}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((clusterId) => {
                      const cluster = clusters.find(c => c.id === clusterId);
                      return (
                        <Chip 
                          key={clusterId} 
                          label={cluster ? cluster.name : `Куст #${clusterId}`}
                          size="small"
                        />
                      );
                    })}
                  </Box>
                )}
              >
                {clusters.map((cluster) => (
                  <MenuItem key={cluster.id} value={cluster.id}>
                    <Checkbox checked={selectedClustersForAdmin.includes(cluster.id)} />
                    {cluster.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenAssignDialog({ open: false, user: null, type: null })}
            disabled={loading}
          >
            Отмена
          </Button>
          <Button 
            onClick={handleAssign}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Назначить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог подтверждения отвязки */}
      <Dialog
        open={unassignDialog.open}
        onClose={() => setUnassignDialog({ open: false, user: null, type: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: theme.palette.error.main }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ErrorIcon />
            Подтверждение отвязки
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Вы уверены, что хотите отвязать:
          </Typography>
          {unassignDialog.type === 'mentor' && (
            <Typography>
              Продавца <strong>{unassignDialog.user?.fullName}</strong> от наставника?
            </Typography>
          )}
          {unassignDialog.type === 'group' && (
            <Typography>
              Продавца <strong>{unassignDialog.user?.fullName}</strong> от группы?
            </Typography>
          )}
          {unassignDialog.type === 'mentorFromGroup' && (
            <Typography>
              Наставника <strong>{unassignDialog.user?.fullName}</strong> от группы?
            </Typography>
          )}
          {unassignDialog.type === 'seniorFromCluster' && (
            <Typography>
              Старшего продавца <strong>{unassignDialog.user?.fullName}</strong> от куста?
            </Typography>
          )}
          {unassignDialog.type === 'admin' && (
            <Typography>
              Администратора <strong>{unassignDialog.user?.fullName}</strong> от куста?
            </Typography>
          )}
          {unassignDialog.type === 'groupFromCluster' && (
            <Typography>
              Группу из куста?
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Это действие можно отменить позже через повторное назначение.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setUnassignDialog({ open: false, user: null, type: '' })}
            disabled={loading}
          >
            Отмена
          </Button>
          <Button 
            onClick={handleConfirmUnassign}
            color="error"
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Отвязать'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог назначения бухгалтера */}
      <AccountantAssignmentDialog
        open={openAccountantAssignmentDialog.open}
        onClose={() => setOpenAccountantAssignmentDialog({ open: false, accountantId: 0, accountantName: '' })}
        accountantId={openAccountantAssignmentDialog.accountantId}
        accountantName={openAccountantAssignmentDialog.accountantName}
        onSuccess={handleAccountantAssignmentSuccess}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default StaffPage;