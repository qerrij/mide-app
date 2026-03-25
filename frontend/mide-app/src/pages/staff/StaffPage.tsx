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
  Chip,
  alpha,
  useTheme,
  useMediaQuery,
  Divider,
  Tooltip,
  Stack,
  Badge,
  Fade,
  Checkbox,
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
  Error as ErrorIcon,
  Assignment as AssignmentIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Lock as LockIcon,
  LockReset as LockResetIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
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

// iOS стили с улучшенной мобильной адаптацией
const iOSStyles = {
  button: {
    borderRadius: 6,
    textTransform: 'none',
    fontWeight: 600,
    padding: { xs: '8px 12px', sm: '6px 12px' },
    fontSize: { xs: '0.9rem', sm: '0.875rem' },
    minHeight: { xs: 44, sm: 36 },
  },
  tabChip: {
    borderRadius: 4,
    height: { xs: 44, sm: 36 },
    fontWeight: 500,
    fontSize: { xs: '0.85rem', sm: '0.85rem' },
    padding: { xs: '8px 12px', sm: '8px 16px' },
    minWidth: { xs: 'auto', sm: 100 },
    flex: { xs: 1, sm: '0 1 auto' },
  },
  compactCard: {
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
    transition: 'transform 0.15s, box-shadow 0.15s',
    cursor: 'pointer',
    '&:hover': {
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      transform: 'translateY(-2px)',
    },
  },
  compactCardContent: {
    p: { xs: 1.5, sm: 1.5 },
    '&:last-child': {
      pb: { xs: 1.5, sm: 1.5 },
    },
  },
  roleChip: {
    borderRadius: 4,
    height: { xs: 28, sm: 24 },
    fontWeight: 500,
    fontSize: { xs: '0.8rem', sm: '0.75rem' },
    maxWidth: { xs: 120, sm: 'none' },
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

interface UserFilters {
  role: UserRole | '';
  groupId: number | '';
  clusterId: number | '';
}

// Компонент компактной карточки пользователя
interface CompactUserCardProps {
  user: User;
  onClick: (user: User) => void;
  getRoleColor: (role: UserRole) => string;
  getRoleIcon: (role: UserRole) => React.ReactNode;
}

const CompactUserCard: React.FC<CompactUserCardProps> = ({ 
  user, 
  onClick, 
  getRoleColor, 
  getRoleIcon 
}) => {
  const theme = useTheme();
  
  return (
    <Card 
      sx={iOSStyles.compactCard} 
      onClick={() => onClick(user)}
    >
      <CardContent sx={iOSStyles.compactCardContent}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            badgeContent={
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: getRoleColor(user.role),
                  border: `2px solid ${theme.palette.background.paper}`,
                }}
              />
            }
          >
            <Avatar 
              sx={{ 
                bgcolor: alpha(getRoleColor(user.role), 0.1),
                color: getRoleColor(user.role),
                width: 44,
                height: 44,
                fontSize: '1.1rem',
                fontWeight: 600,
              }}
            >
              {user.fullName.charAt(0)}
            </Avatar>
          </Badge>
          
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography 
              variant="subtitle2" 
              fontWeight={600}
              sx={{
                fontSize: { xs: '1rem', sm: '0.95rem' },
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                mb: 0.5,
              }}
            >
              {user.fullName}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={`${user.username}`}
                size="small"
                sx={{
                  height: 22,
                  fontSize: '0.7rem',
                  backgroundColor: alpha(theme.palette.text.secondary, 0.1),
                  color: theme.palette.text.secondary,
                }}
              />
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {getRoleIcon(user.role)}
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  {getRoleName(user.role)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

// Компонент модального окна с детальной информацией
interface UserDetailsDialogProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onAssign: (user: User, type: 'mentor' | 'group' | 'cluster' | 'admin') => void;
  onUnassignClick: (user: User, type: string, data?: any) => void;
  onOpenAccountantAssignment: (user: User) => void;
  onChangePassword: (userId: number, newPassword: string) => Promise<void>;
  // Добавить пропс для открытия диалога смены пароля
  onOpenPasswordDialog?: (userId: number, userName: string) => void;
  groups: Group[];
  clusters: Cluster[];
  users: User[];
  loading: boolean;
  getRoleColor: (role: UserRole) => string;
  getRoleIcon: (role: UserRole) => React.ReactNode;
}

const UserDetailsDialog: React.FC<UserDetailsDialogProps> = ({
  open,
  user,
  onClose,
  onEdit,
  onDelete,
  onAssign,
  onUnassignClick,
  onOpenAccountantAssignment,
  onChangePassword,
  groups,
  clusters,
  users,
  loading,
  getRoleColor,
  getRoleIcon,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user: currentUser } = useAuth();
  
  const [assignedUsers, setAssignedUsers] = useState<User[]>([]);
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  useEffect(() => {
    if (user?.role === UserRole.ACCOUNTANT && user.accountantUserIds && user.accountantUserIds.length > 0) {
      const loadUsers = async () => {
        setLoadingAssigned(true);
        try {
          const usersData = await Promise.all(
            user.accountantUserIds!.map(id => userService.getUserById(id))
          );
          setAssignedUsers(usersData);
        } catch (error) {
          console.error('Ошибка при загрузке привязанных пользователей:', error);
        } finally {
          setLoadingAssigned(false);
        }
      };
      loadUsers();
    }
  }, [user?.accountantUserIds]);

  if (!user) return null;

  const getUserGroupInfo = () => {
    const group = groups.find(g => g.id === user.groupId);
    const cluster = clusters.find(c => c.id === user.clusterId);
    const mentor = users.find(u => u.id === user.mentorId);
    const seniorSeller = users.find(u => u.id === user.seniorSellerId);
    return { group, cluster, mentor, seniorSeller };
  };

  const { group, cluster, mentor, seniorSeller } = getUserGroupInfo();
  const sellersCount = users.filter(u => u.mentorId === user.id).length;

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      return;
    }
    
    setChangingPassword(true);
    try {
      await onChangePassword(user.id, newPassword);
      setPasswordDialogOpen(false);
      setNewPassword('');
    } catch (error) {
      console.error('Ошибка при смене пароля:', error);
    } finally {
      setChangingPassword(false);
    }
  };

  const renderRoleSpecificContent = () => {
    switch (user.role) {
      case UserRole.OWNER:
        return (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BusinessCenter sx={{ fontSize: 20, color: getRoleColor(user.role) }} />
              Полный доступ к системе
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Управление всеми разделами
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={`${users.length} пользователей`} size="small" />
              <Chip label={`${groups.length} групп`} size="small" />
              <Chip label={`${clusters.length} кустов`} size="small" />
            </Box>
          </Stack>
        );

      case UserRole.ADMIN:
        return (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AdminPanelSettings sx={{ fontSize: 20, color: getRoleColor(user.role) }} />
              Администратор
            </Typography>
            
            {user.adminClusterIds && user.adminClusterIds.length > 0 ? (
              <>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Кусты под управлением:
                </Typography>
                <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                  {user.adminClusterIds.map((clusterId: number) => {
                    const cluster = clusters.find(c => c.id === clusterId);
                    return (
                      <Box key={clusterId} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">
                          • {cluster ? cluster.name : `Куст #${clusterId}`}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => onUnassignClick(user, 'admin', { clusterId })}
                          sx={{ width: 28, height: 28 }}
                          color="error"
                        >
                          <Close sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Box>
                    );
                  })}
                </Box>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                Нет назначенных кустов
              </Typography>
            )}
            
            {user.rate && user.rate > 0 && (
              <Typography variant="body2">
                <strong>Ставка:</strong> {user.rate}₽
              </Typography>
            )}
          </Stack>
        );

      case UserRole.SENIOR_SELLER:
        return (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SupervisorAccount sx={{ fontSize: 20, color: getRoleColor(user.role) }} />
              Старший продавец
            </Typography>
            
            {cluster ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2">
                    <strong>Куст:</strong> {cluster.name}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => onUnassignClick(user, 'seniorFromCluster')}
                    sx={{ width: 28, height: 28 }}
                    color="error"
                  >
                    <Close sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
                <Typography variant="body2">
                  <strong>Групп в кусте:</strong> {groups.filter(g => g.clusterId === cluster.id).length}
                </Typography>
                <Typography variant="body2">
                  <strong>Продавцов:</strong> {users.filter(u => u.clusterId === cluster.id).length}
                </Typography>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                Не назначен на куст
              </Typography>
            )}
            
            {user.rate && user.rate > 0 && (
              <Typography variant="body2">
                <strong>Ставка:</strong> {user.rate}₽
              </Typography>
            )}
          </Stack>
        );

      case UserRole.MENTOR:
        return (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Person sx={{ fontSize: 20, color: getRoleColor(user.role) }} />
              Наставник
            </Typography>
            
            {group ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2">
                  <strong>Группа:</strong> {group.name}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => onUnassignClick(user, 'mentorFromGroup')}
                  sx={{ width: 28, height: 28 }}
                  color="error"
                >
                  <Close sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                Нет группы
              </Typography>
            )}
            
            {cluster && (
              <Typography variant="body2">
                <strong>Куст:</strong> {cluster.name}
              </Typography>
            )}
            
            <Typography variant="body2">
              <strong>Продавцов:</strong> {sellersCount}
            </Typography>
            
            {user.rate && user.rate > 0 && (
              <Typography variant="body2">
                <strong>Ставка:</strong> {user.rate}₽
              </Typography>
            )}
          </Stack>
        );

      case UserRole.SELLER:
        return (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <People sx={{ fontSize: 20, color: getRoleColor(user.role) }} />
              Продавец
            </Typography>
            
            {group && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2">
                  <strong>Группа:</strong> {group.name}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => onUnassignClick(user, 'group')}
                  sx={{ width: 28, height: 28 }}
                  color="error"
                >
                  <Close sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            )}
            
            {mentor && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2">
                  <strong>Наставник:</strong> {mentor.fullName}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => onUnassignClick(user, 'mentor')}
                  sx={{ width: 28, height: 28 }}
                  color="error"
                >
                  <Close sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            )}
            
            {cluster && (
              <Typography variant="body2">
                <strong>Куст:</strong> {cluster.name}
              </Typography>
            )}
            
            {user.rate && user.rate > 0 && (
              <Typography variant="body2">
                <strong>Ставка:</strong> {user.rate}₽
              </Typography>
            )}
          </Stack>
        );

      case UserRole.ACCOUNTANT:
        return (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AttachMoney sx={{ fontSize: 20, color: getRoleColor(user.role) }} />
              Бухгалтер
            </Typography>
          
          </Stack>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        TransitionComponent={Fade}
        transitionDuration={300}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 4,
            overflow: 'hidden',
            maxHeight: isMobile ? '100%' : '90vh',
            margin: isMobile ? 0 : 2,
          },
        }}
      >
        <DialogTitle sx={{ 
          p: { xs: 2, sm: 2.5 }, 
          pb: { xs: 1.5, sm: 2 },
          backgroundColor: alpha(theme.palette.primary.main, 0.02),
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar 
                sx={{ 
                  bgcolor: getRoleColor(user.role),
                  width: { xs: 48, sm: 56 },
                  height: { xs: 48, sm: 56 },
                  fontSize: { xs: '1.2rem', sm: '1.4rem' },
                }}
              >
                {user.fullName.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={600} color="#2a0f35" sx={{ mb: 0.5 }}>
                  {user.fullName}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={`${user.username}`}
                    size="small"
                    sx={{
                      backgroundColor: alpha(theme.palette.text.secondary, 0.1),
                      color: theme.palette.text.secondary,
                      fontSize: '0.75rem',
                      height: 24,
                    }}
                  />
                  <Chip
                    icon={getRoleIcon(user.role) as any}
                    label={getRoleName(user.role)}
                    size="small"
                    sx={{
                      backgroundColor: alpha(getRoleColor(user.role), 0.1),
                      color: getRoleColor(user.role),
                      fontSize: '0.75rem',
                      height: 24,
                      '& .MuiChip-icon': {
                        fontSize: 14,
                        color: 'inherit',
                      },
                    }}
                  />
                </Box>
              </Box>
            </Box>
            <IconButton onClick={onClose} size="small" sx={{ mt: -0.5, mr: -0.5 }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 2, sm: 2.5 }, pt: { xs: 2, sm: 2 }, mt: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Контактная информация */}
              {(user.telegram || user.city) && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    mb: 3,
                    backgroundColor: alpha(theme.palette.primary.main, 0.03),
                    borderRadius: 3,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  }}
                >
                  {user.telegram && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: user.city ? 1 : 0 }}>
                      <Telegram sx={{ fontSize: 20, color: '#0088cc' }} />
                      <Typography variant="body2">{user.telegram}</Typography>
                    </Box>
                  )}
                  
                  {user.city && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationIcon sx={{ fontSize: 20, color: '#4caf50' }} />
                      <Typography variant="body2">{user.city}</Typography>
                    </Box>
                  )}
                </Paper>
              )}

              {/* Информация о роли */}
              <Typography variant="subtitle2" fontWeight={600} color="#2a0f35" sx={{ mb: 2 }}>
                Информация о должности
              </Typography>
              
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 3,
                  backgroundColor: alpha(theme.palette.background.default, 0.5),
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                }}
              >
                {renderRoleSpecificContent()}
              </Paper>

              {/* Кнопки действий */}
              <Typography variant="subtitle2" fontWeight={600} color="#2a0f35" sx={{ mb: 2 }}>
                Действия
              </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {/* Кнопки назначения */}
                    <Box sx={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: 1,
                      '& .MuiButton-root': {
                        flex: { xs: '1 1 calc(50% - 4px)', sm: '0 1 auto' },
                        minWidth: { xs: 0, sm: 'auto' },
                        whiteSpace: 'nowrap',
                        fontSize: { xs: '0.7rem', sm: '0.875rem' },
                        padding: { xs: '6px 8px', sm: '6px 12px' },
                      }
                    }}>
                    {user.role === UserRole.SELLER && (
                      <>
                        {!user.mentorId && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              onAssign(user, 'mentor');
                            }}
                            disabled={loading}
                            sx={{ flex: { xs: 1, sm: '0 1 auto' } }}
                          >
                            Назначить наставника
                          </Button>
                        )}
                        {!user.groupId && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              onAssign(user, 'group');
                            }}
                            disabled={loading}
                            sx={{ flex: { xs: 1, sm: '0 1 auto' } }}
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
                        onClick={() => {
                          onAssign(user, 'cluster');
                        }}
                        disabled={loading}
                        sx={{ flex: { xs: 1, sm: '0 1 auto' } }}
                      >
                        В куст
                      </Button>
                    )}
                    
                    {user.role === UserRole.SENIOR_SELLER && !user.clusterId && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          onAssign(user, 'cluster');
                        }}
                        disabled={loading}
                        sx={{ flex: { xs: 1, sm: '0 1 auto' } }}
                      >
                        Назначить куст
                      </Button>
                    )}
                    
                    {user.role === UserRole.ADMIN && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          onAssign(user, 'admin');
                        }}
                        disabled={loading}
                        sx={{ flex: { xs: 1, sm: '0 1 auto' } }}
                      >
                        Управление кустами
                      </Button>
                    )}
                    
                    {user.role === UserRole.ACCOUNTANT && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          onOpenAccountantAssignment(user);
                        }}
                        sx={{ 
                          flex: { xs: 1, sm: '0 1 auto' },
                          color: '#ff9800', 
                          borderColor: '#ff9800',
                          '&:hover': {
                            backgroundColor: alpha('#ff9800', 0.1),
                          },
                        }}
                        disabled={loading}
                      >
                        Назначить пользователей
                      </Button>
                    )}
                  </Box>

                  {/* Кнопки управления */}
                  <Divider sx={{ my: 1 }} />

                    <Box sx={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: 1,
                        '& .MuiButton-root': {
                          flex: { xs: '1 1 calc(33.333% - 4px)', sm: '0 1 auto' },
                          minWidth: { xs: 0, sm: 'auto' },
                          whiteSpace: 'nowrap',
                          fontSize: { xs: '0.7rem', sm: '0.875rem' },
                          padding: { xs: '6px 4px', sm: '6px 12px' },
                        }
                      }}>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<LockResetIcon />}
                      onClick={() => setPasswordDialogOpen(true)}
                      sx={{
                        flex: { xs: 1, sm: '0 1 auto' },
                        backgroundColor: '#ff9800',
                        '&:hover': { backgroundColor: '#f57c00' },
                      }}
                    >
                      Сменить пароль
                    </Button>
                    
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<Edit />}
                      onClick={() => {
                        onEdit(user);
                      }}
                      disabled={loading}
                      sx={{
                        flex: { xs: 1, sm: '0 1 auto' },
                        backgroundColor: '#2a436d',
                        '&:hover': { backgroundColor: '#1a365d' },
                      }}
                    >
                      Редактировать
                    </Button>
                    
                    <Button
                      size="small"
                      variant="contained"
                      color="error"
                      startIcon={<Delete />}
                      onClick={() => {
                        onDelete(user);
                      }}
                      disabled={user.role === UserRole.OWNER || user.id === currentUser?.id || loading}
                      sx={{ flex: { xs: 1, sm: '0 1 auto' } }}
                    >
                      Удалить
                    </Button>
                  </Box>
                </Box>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ 
          p: { xs: 2, sm: 2.5 }, 
          pt: { xs: 1.5, sm: 2 }, 
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          backgroundColor: alpha(theme.palette.background.default, 0.5),
        }}>
          <Button
            onClick={onClose}
            variant="contained"
            fullWidth
            sx={{
              borderRadius: 2,
              backgroundColor: '#3f1f4b',
              '&:hover': { backgroundColor: '#2a0f35' },
              textTransform: 'none',
              py: 1,
            }}
          >
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог смены пароля */}
      <Dialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle sx={{ 
          p: 2.5, 
          pb: 2,
          backgroundColor: alpha(theme.palette.warning.main, 0.02),
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight={600} color="#2a0f35">
              Смена пароля
            </Typography>
            <IconButton onClick={() => setPasswordDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Пользователь: {user.fullName}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5, pt: 2 }}>
          <TextField
            fullWidth
            label="Новый пароль"
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            margin="normal"
            helperText="Минимальная длина пароля: 6 символов"
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
        </DialogContent>

        <DialogActions sx={{ 
          p: 2.5, 
          pt: 0, 
          gap: 1,
        }}>
          <Button
            onClick={() => setPasswordDialogOpen(false)}
            variant="outlined"
            fullWidth
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Отмена
          </Button>
          <Button
            onClick={handleChangePassword}
            variant="contained"
            fullWidth
            disabled={!newPassword || newPassword.length < 6 || changingPassword}
            sx={{
              borderRadius: 2,
              backgroundColor: '#ff9800',
              '&:hover': { backgroundColor: '#f57c00' },
              textTransform: 'none',
            }}
          >
            {changingPassword ? <CircularProgress size={24} /> : 'Подтвердить'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

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
        gap: { xs: 0.5, sm: 1 }, 
        p: { xs: 1, sm: 1.5 },
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        flexWrap: 'nowrap',
        overflowX: 'auto',
        '&::-webkit-scrollbar': {
          display: 'none',
        },
        scrollbarWidth: 'none',
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
            backgroundColor: value === tab.value 
              ? (tab.color || theme.palette.primary.main) 
              : 'transparent',
            borderColor: value === tab.value 
              ? 'transparent' 
              : alpha(tab.color || theme.palette.primary.main, 0.3),
            color: value === tab.value ? 'white' : theme.palette.text.primary,
            whiteSpace: 'nowrap',
            '& .MuiButton-startIcon': {
              mr: { xs: 0.5, sm: 1 },
              ml: { xs: -0.5, sm: 0 },
            },
            '&:hover': {
              backgroundColor: value === tab.value 
                ? (tab.color || theme.palette.primary.dark)
                : alpha(tab.color || theme.palette.primary.main, 0.08),
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <span>{isMobile && tab.label === 'Пользователи' ? 'Люди' : 
                     isMobile && tab.label === 'Группы' ? 'Груп.' : 
                     isMobile && tab.label === 'Кусты' ? 'Кусты' : tab.label}</span>
            {tab.count !== undefined && (
              <Chip
                label={tab.count}
                size="small"
                sx={{
                  height: { xs: 18, sm: 20 },
                  minWidth: { xs: 18, sm: 20 },
                  fontSize: { xs: '0.6rem', sm: '0.7rem' },
                  backgroundColor: value === tab.value 
                    ? alpha('#fff', 0.2)
                    : alpha(tab.color || theme.palette.primary.main, 0.1),
                  color: value === tab.value ? '#fff' : 'inherit',
                  '& .MuiChip-label': {
                    px: { xs: 0.5, sm: 1 },
                  },
                }}
              />
            )}
          </Box>
        </Button>
      ))}
    </Box>
  );
};

// Диалог для добавления группы в куст
interface AddGroupToClusterDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (clusterId: number) => void;
  clusters: Cluster[];
  loading: boolean;
}

const AddGroupToClusterDialog: React.FC<AddGroupToClusterDialogProps> = ({
  open,
  onClose,
  onConfirm,
  clusters,
  loading,
}) => {
  const [selectedClusterId, setSelectedClusterId] = useState<number>(0);

  const handleConfirm = () => {
    if (selectedClusterId) {
      onConfirm(selectedClusterId);
      setSelectedClusterId(0);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Добавить группу в куст</DialogTitle>
      <DialogContent>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Выберите куст</InputLabel>
          <Select
            value={selectedClusterId}
            label="Выберите куст"
            onChange={(e) => setSelectedClusterId(Number(e.target.value))}
          >
            <MenuItem value={0}>-- Не выбран --</MenuItem>
            {clusters.map((cluster) => (
              <MenuItem key={cluster.id} value={cluster.id}>
                {cluster.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Отмена
        </Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained" 
          disabled={!selectedClusterId || loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Добавить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Компонент карточки группы
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
  onRemoveFromCluster: (groupId: number, clusterId: number) => void;
  onUnassignClick: (user: User, type: string, data?: any) => void;
  onAssignMentor: (group: Group) => void;  // Новая функция
  onUnassignMentor: (mentorId: number) => void;  // Новая функция
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
  onAssignMentor,
  onUnassignMentor,
  getRoleColor,
}) => {
  const theme = useTheme();
  
  const mentor = users.find(u => u.id === group.mentorId);
  const cluster = clusters.find(c => c.id === group.clusterId);
  const seniorSeller = users.find(u => u.id === group.seniorSellerId);
  const sellersInGroup = users.filter(u => u.groupId === group.id);
  const groupsInSameCluster = cluster ? groups.filter(g => g.clusterId === cluster.id) : [];

  // Доступные наставники (без группы)
  const availableMentors = users.filter(u => 
    u.role === UserRole.MENTOR && 
    !u.groupId  // Наставник без группы
  );

  return (
    <Card sx={iOSStyles.compactCard}>
      <CardContent sx={iOSStyles.compactCardContent}>
        <Tooltip title={group.name} arrow>
          <Typography 
            variant="subtitle1" 
            fontWeight="bold" 
            sx={{ 
              mb: 1, 
              fontSize: { xs: '1.1rem', sm: '1rem' },
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {group.name}
          </Typography>
        </Tooltip>
        
        <Box sx={{ mb: 1.5 }}>
          {/* Наставник */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontSize: { xs: '0.9rem', sm: '0.8rem' } }}>
              <strong>Наставник:</strong>{' '}
              {mentor ? (
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  <Avatar sx={{ width: 20, height: 20, bgcolor: getRoleColor(mentor.role), fontSize: '0.7rem' }}>
                    {mentor.fullName.charAt(0)}
                  </Avatar>
                  <span style={{ fontSize: 'inherit' }}>
                    {mentor.fullName.split(' ')[0]}
                  </span>
                </Box>
              ) : (
                <span style={{ color: theme.palette.text.secondary, fontStyle: 'italic' }}>
                  Не назначен
                </span>
              )}
            </Typography>
            
            {mentor ? (
              // Если есть наставник - показываем кнопку отвязки
              <IconButton
                size="small"
                onClick={() => onUnassignMentor(mentor.id)}
                sx={{ width: 24, height: 24 }}
                color="error"
              >
                <Close sx={{ fontSize: 16 }} />
              </IconButton>
            ) : (
              // Если нет наставника - показываем кнопку назначения
              <Button
                size="small"
                variant="outlined"
                onClick={() => onAssignMentor(group)}
                disabled={loading}
                sx={{ 
                  minWidth: 'auto',
                  height: 24,
                  fontSize: '0.7rem',
                  py: 0,
                  px: 1,
                  color: theme.palette.primary.main,
                  borderColor: theme.palette.primary.main,
                }}
              >
                Назначить
              </Button>
            )}
          </Box>
          
          {/* Куст */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontSize: { xs: '0.9rem', sm: '0.8rem' } }}>
              <strong>Куст:</strong>{' '}
              {cluster ? cluster.name : (
                <span style={{ color: theme.palette.text.secondary, fontStyle: 'italic' }}>
                  Не назначен
                </span>
              )}
            </Typography>
            {cluster && (
              <IconButton
                size="small"
                onClick={() => onRemoveFromCluster(group.id, cluster.id)}
                sx={{ width: 24, height: 24 }}
                color="error"
              >
                <Close sx={{ fontSize: 16 }} />
              </IconButton>
            )}
          </Box>
          
          {/* Старший продавец (если есть) */}
          {seniorSeller && (
            <Typography variant="body2" sx={{ fontSize: { xs: '0.9rem', sm: '0.8rem' } }}>
              <strong>Старший:</strong> {seniorSeller.fullName}
            </Typography>
          )}
          
          {/* Статистика */}
          <Typography variant="body2" sx={{ fontSize: { xs: '0.9rem', sm: '0.8rem' } }}>
            <strong>Продавцов:</strong> {sellersInGroup.length}
          </Typography>
        </Box>
        
        <Divider sx={{ my: 1 }} />
        
        {/* Кнопки действий */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
          {!group.clusterId && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => onAddToCluster(group)}
              disabled={loading}
              sx={{ fontSize: '0.7rem', minWidth: 60, height: 28 }}
            >
              В куст
            </Button>
          )}
          
          <Tooltip title="Редактировать" arrow>
            <Button
              size="small"
              variant="outlined"
              onClick={() => onEdit(group)}
              disabled={loading}
              sx={{ minWidth: 28, height: 28, p: 0 }}
            >
              <Edit sx={{ fontSize: 16 }} />
            </Button>
          </Tooltip>
          
          <Tooltip title="Удалить" arrow>
            <span>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => onDelete(group)}
                disabled={sellersInGroup.length > 0 || loading}
                sx={{ minWidth: 28, height: 28, p: 0 }}
              >
                <Delete sx={{ fontSize: 16 }} />
              </Button>
            </span>
          </Tooltip>
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
  onAddGroup: (clusterId: number, groupId: number) => void;
  onRemoveGroup: (groupId: number, clusterId: number) => void;
  onUnassignClick: (user: User, type: string, data?: any) => void;
  onAssignAdmin: (cluster: Cluster) => void;  // Новая функция
  onAssignSenior: (cluster: Cluster) => void;  // Новая функция
  onUnassignAdmin: (adminId: number, clusterId: number) => void;  // Новая функция
  getRoleColor: (role: UserRole) => string;
}

const ClusterCard: React.FC<ClusterCardProps> = ({
  cluster,
  users,
  groups,
  loading,
  onEdit,
  onDelete,
  onRemoveGroup,
  onUnassignClick,
  onAssignAdmin,
  onAssignSenior,
  onUnassignAdmin,
  getRoleColor,
}) => {
  const theme = useTheme();
  
  const seniorSeller = users.find(u => u.id === cluster.seniorSellerId);
  const admin = users.find(u => u.id === cluster.adminId);
  const groupsInCluster = groups.filter(group => group.clusterId === cluster.id);
  const sellersInCluster = users.filter(u => u.clusterId === cluster.id);

  // Доступные администраторы
  const availableAdmins = users.filter(u => u.role === UserRole.ADMIN);
  
  // Доступные старшие продавцы (без куста)
  const availableSeniorSellers = users.filter(u => 
    u.role === UserRole.SENIOR_SELLER && 
    !u.clusterId
  );

  return (
    <Card sx={iOSStyles.compactCard}>
      <CardContent sx={iOSStyles.compactCardContent}>
        <Tooltip title={cluster.name} arrow>
          <Typography 
            variant="subtitle1" 
            fontWeight="bold" 
            sx={{ 
              mb: 1, 
              fontSize: { xs: '1.1rem', sm: '1rem' },
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {cluster.name}
          </Typography>
        </Tooltip>
        
        <Box sx={{ mb: 1.5 }}>
          {/* Старший продавец */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontSize: { xs: '0.9rem', sm: '0.8rem' } }}>
              <strong>Старший:</strong>{' '}
              {seniorSeller ? (
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  <Avatar sx={{ width: 20, height: 20, bgcolor: getRoleColor(seniorSeller.role), fontSize: '0.7rem' }}>
                    {seniorSeller.fullName.charAt(0)}
                  </Avatar>
                  <span style={{ fontSize: 'inherit' }}>
                    {seniorSeller.fullName.split(' ')[0]}
                  </span>
                </Box>
              ) : (
                <span style={{ color: theme.palette.text.secondary, fontStyle: 'italic' }}>
                  Не назначен
                </span>
              )}
            </Typography>
            
            {seniorSeller ? (
              // Если есть старший - показываем кнопку отвязки
              <IconButton
                size="small"
                onClick={() => onUnassignClick(seniorSeller, 'seniorFromCluster')}
                sx={{ width: 24, height: 24 }}
                color="error"
              >
                <Close sx={{ fontSize: 16 }} />
              </IconButton>
            ) : (
              // Если нет старшего - показываем кнопку назначения
              <Button
                size="small"
                variant="outlined"
                onClick={() => onAssignSenior(cluster)}
                disabled={loading}
                sx={{ 
                  minWidth: 'auto',
                  height: 24,
                  fontSize: '0.7rem',
                  py: 0,
                  px: 1,
                  color: theme.palette.primary.main,
                  borderColor: theme.palette.primary.main,
                }}
              >
                Назначить
              </Button>
            )}
          </Box>
          
          {/* Администратор */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontSize: { xs: '0.9rem', sm: '0.8rem' } }}>
              <strong>Админ:</strong>{' '}
              {admin ? (
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  <Avatar sx={{ width: 20, height: 20, bgcolor: getRoleColor(admin.role), fontSize: '0.7rem' }}>
                    {admin.fullName.charAt(0)}
                  </Avatar>
                  <span style={{ fontSize: 'inherit' }}>
                    {admin.fullName.split(' ')[0]}
                  </span>
                </Box>
              ) : (
                <span style={{ color: theme.palette.text.secondary, fontStyle: 'italic' }}>
                  Не назначен
                </span>
              )}
            </Typography>
            
            {admin ? (
              // Если есть админ - показываем кнопку отвязки
              <IconButton
                size="small"
                onClick={() => onUnassignAdmin(admin.id, cluster.id)}
                sx={{ width: 24, height: 24 }}
                color="error"
              >
                <Close sx={{ fontSize: 16 }} />
              </IconButton>
            ) : (
              // Если нет админа - показываем кнопку назначения
              <Button
                size="small"
                variant="outlined"
                onClick={() => onAssignAdmin(cluster)}
                disabled={loading}
                sx={{ 
                  minWidth: 'auto',
                  height: 24,
                  fontSize: '0.7rem',
                  py: 0,
                  px: 1,
                  color: theme.palette.primary.main,
                  borderColor: theme.palette.primary.main,
                }}
              >
                Назначить
              </Button>
            )}
          </Box>
          
          {/* Статистика */}
          <Typography variant="body2" sx={{ fontSize: { xs: '0.9rem', sm: '0.8rem' } }}>
            <strong>Групп:</strong> {groupsInCluster.length}
          </Typography>
        </Box>
        
        {/* Группы в кусте (первые 2) */}
        {groupsInCluster.length > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5, fontSize: { xs: '0.9rem', sm: '0.8rem' } }}>
              Группы:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {groupsInCluster.slice(0, 2).map(group => (
                <Box key={group.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.75rem' } }}>
                    • {group.name}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => onRemoveGroup(group.id, cluster.id)}
                    sx={{ width: 20, height: 20 }}
                    color="error"
                  >
                    <Close sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              ))}
              {groupsInCluster.length > 2 && (
                <Typography variant="caption" color="text.secondary">
                  и еще {groupsInCluster.length - 2}...
                </Typography>
              )}
            </Box>
          </Box>
        )}
        
        <Divider sx={{ my: 1 }} />
        
        {/* Кнопки действий */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
          <Tooltip title="Редактировать" arrow>
            <Button
              size="small"
              variant="outlined"
              onClick={() => onEdit(cluster)}
              disabled={loading}
              sx={{ minWidth: 28, height: 28, p: 0 }}
            >
              <Edit sx={{ fontSize: 16 }} />
            </Button>
          </Tooltip>
          
          <Tooltip title="Удалить" arrow>
            <span>
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => onDelete(cluster)}
                disabled={groupsInCluster.length > 0 || sellersInCluster.length > 0 || loading}
                sx={{ minWidth: 28, height: 28, p: 0 }}
              >
                <Delete sx={{ fontSize: 16 }} />
              </Button>
            </span>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );
};

// Основной компонент
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

  const [userFilters, setUserFilters] = useState<UserFilters>({
    role: '',
    groupId: '',
    clusterId: '',
  });
  
  const [showFilters, setShowFilters] = useState(false);

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
  const [openAddGroupToClusterDialog, setOpenAddGroupToClusterDialog] = useState<{
    open: boolean;
    group: Group | null;
  }>({ open: false, group: null });
  const [openUserDetailsDialog, setOpenUserDetailsDialog] = useState<User | null>(null);

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

  const [openAssignMentorDialog, setOpenAssignMentorDialog] = useState(false);
  const [selectedGroupForMentor, setSelectedGroupForMentor] = useState<Group | null>(null);
  const [selectedMentorForGroup, setSelectedMentorForGroup] = useState<number | null>(null);

  // Состояния для управления администраторами в кустах
  const [openAssignAdminDialog, setOpenAssignAdminDialog] = useState(false);
  const [selectedClusterForAdmin, setSelectedClusterForAdmin] = useState<Cluster | null>(null);
  const [selectedAdminForCluster, setSelectedAdminForCluster] = useState<number | null>(null);

  // Состояния для управления старшими продавцами в кустах
  const [openAssignSeniorDialog, setOpenAssignSeniorDialog] = useState(false);
  const [selectedClusterForSenior, setSelectedClusterForSenior] = useState<Cluster | null>(null);
  const [selectedSeniorForCluster, setSelectedSeniorForCluster] = useState<number | null>(null);

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
      setGroups(data);
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
        return <BusinessCenter sx={{ fontSize: 18 }} />;
      case UserRole.ADMIN:
        return <AdminPanelSettings sx={{ fontSize: 18 }} />;
      case UserRole.SENIOR_SELLER:
        return <SupervisorAccount sx={{ fontSize: 18 }} />;
      case UserRole.MENTOR:
        return <Person sx={{ fontSize: 18 }} />;
      case UserRole.SELLER:
        return <People sx={{ fontSize: 18 }} />;
      case UserRole.ACCOUNTANT:
        return <AttachMoney sx={{ fontSize: 18 }} />;
      default:
        return <Person sx={{ fontSize: 18 }} />;
    }
  };

  // ================ ФУНКЦИИ ДЛЯ УПРАВЛЕНИЯ НАСТАВНИКАМИ В ГРУППАХ ================
  const handleAssignMentorToGroup = (group: Group) => {
    // Открываем диалог назначения наставника
    setSelectedGroupForMentor(group);
    setOpenAssignMentorDialog(true);
  };

  const handleUnassignMentorFromGroup = async (mentorId: number) => {
    try {
      setLoading(true);
      await assignmentsService.removeMentorFromGroup(mentorId);
      showSnackbar('Наставник успешно отвязан от группы', 'success');
      await loadAllData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Ошибка при отвязке наставника';
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAssignMentor = async () => {
    if (!selectedGroupForMentor || !selectedMentorForGroup) return;
    
    try {
      setLoading(true);
      await assignmentsService.assignMentorToGroup(selectedMentorForGroup, selectedGroupForMentor.id);
      showSnackbar('Наставник успешно назначен группе', 'success');
      await loadAllData();
      setOpenAssignMentorDialog(false);
      setSelectedGroupForMentor(null);
      setSelectedMentorForGroup(null);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Ошибка при назначении наставника';
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ================ ФУНКЦИИ ДЛЯ УПРАВЛЕНИЯ АДМИНИСТРАТОРАМИ В КУСТАХ ================
  const handleAssignAdminToCluster = (cluster: Cluster) => {
    setSelectedClusterForAdmin(cluster);
    setOpenAssignAdminDialog(true);
  };

  const handleUnassignAdminFromCluster = async (adminId: number, clusterId: number) => {
    try {
      setLoading(true);
      await assignmentsService.removeAdminFromCluster(adminId, clusterId);
      showSnackbar('Администратор успешно отвязан от куста', 'success');
      await loadAllData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Ошибка при отвязке администратора';
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAssignAdmin = async () => {
    if (!selectedClusterForAdmin || !selectedAdminForCluster) return;
    
    try {
      setLoading(true);
      await assignmentsService.assignAdminToCluster(selectedAdminForCluster, selectedClusterForAdmin.id);
      showSnackbar('Администратор успешно назначен кусту', 'success');
      await loadAllData();
      setOpenAssignAdminDialog(false);
      setSelectedClusterForAdmin(null);
      setSelectedAdminForCluster(null);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Ошибка при назначении администратора';
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ================ ФУНКЦИИ ДЛЯ УПРАВЛЕНИЯ СТАРШИМИ ПРОДАВЦАМИ В КУСТАХ ================
  const handleAssignSeniorToCluster = (cluster: Cluster) => {
    setSelectedClusterForSenior(cluster);
    setOpenAssignSeniorDialog(true);
  };

  const handleConfirmAssignSenior = async () => {
    if (!selectedClusterForSenior || !selectedSeniorForCluster) return;
    
    try {
      setLoading(true);
      await assignmentsService.assignSeniorToCluster(selectedSeniorForCluster, selectedClusterForSenior.id);
      showSnackbar('Старший продавец успешно назначен кусту', 'success');
      await loadAllData();
      setOpenAssignSeniorDialog(false);
      setSelectedClusterForSenior(null);
      setSelectedSeniorForCluster(null);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Ошибка при назначении старшего продавца';
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ================ УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ================
  const handleCreateUser = async () => {
    // Очищаем поля от лишних пробелов
    const trimmedUser = {
      ...newUser,
      username: newUser.username?.trim(),
      fullName: newUser.fullName?.trim(),
      telegram: newUser.telegram?.trim(),
      city: newUser.city?.trim(),
      password: newUser.password, // пароль не очищаем
      role: newUser.role,
      rate: newUser.rate,
    };

    if (!trimmedUser.username || !trimmedUser.fullName) {
      showSnackbar('Заполните обязательные поля', 'error');
      return;
    }

    try {
      setLoading(true);
      await userService.createUser(trimmedUser);
      await loadUsers();
      setOpenCreateDialog(false);
      resetNewUserForm();
      showSnackbar('Пользователь успешно создан', 'success');
    } catch (error: any) {
      console.error('Ошибка при создании пользователя:', error);
      
      const getErrorMessage = (error: any): string => {
        if (error.response?.data) {
          const data = error.response.data;
          if (data.detail) {
            if (Array.isArray(data.detail)) {
              return data.detail
                .map((err: any) => {
                  if (err.msg) {
                    return err.msg.replace('Value error, ', '');
                  }
                  return JSON.stringify(err);
                })
                .join(', ');
            }
            if (typeof data.detail === 'string') {
              return data.detail;
            }
          }
          if (data.message) {
            return data.message;
          }
          if (typeof data === 'string') {
            return data;
          }
        }
        if (error.message) {
          return error.message;
        }
        return 'Произошла ошибка при создании пользователя';
      };

      const errorMessage = getErrorMessage(error);
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!openEditDialog) return;

    // Очищаем поля от лишних пробелов
    const trimmedEditUser: UpdateUserDto = {};
    
    if (editUser.username !== undefined) {
      trimmedEditUser.username = editUser.username?.trim();
    }
    if (editUser.fullName !== undefined) {
      trimmedEditUser.fullName = editUser.fullName?.trim();
    }
    if (editUser.telegram !== undefined) {
      trimmedEditUser.telegram = editUser.telegram?.trim();
    }
    if (editUser.city !== undefined) {
      trimmedEditUser.city = editUser.city?.trim();
    }
    if (editUser.role !== undefined) {
      trimmedEditUser.role = editUser.role;
    }
    if (editUser.rate !== undefined) {
      trimmedEditUser.rate = editUser.rate;
    }

    try {
      setLoading(true);
      await userService.updateUser(openEditDialog.id, trimmedEditUser);
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

  const handleChangePassword = async (userId: number, newPassword: string) => {
    try {
      await userService.changeUserPassword(userId, newPassword);
      showSnackbar('Пароль успешно изменен', 'success');
    } catch (error: any) {
      console.error('Ошибка при смене пароля:', error);
      const errorMessage = error.response?.data?.detail || 
                         error.response?.data?.message || 
                         'Ошибка при смене пароля';
      showSnackbar(errorMessage, 'error');
      throw error;
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
    // Очищаем поля от лишних пробелов
    const trimmedGroup = {
      ...newGroup,
      name: newGroup.name?.trim(),
      description: newGroup.description?.trim(),
      mentorId: newGroup.mentorId,
    };

    if (!trimmedGroup.name || !trimmedGroup.mentorId) {
      showSnackbar('Заполните обязательные поля', 'error');
      return;
    }

    try {
      setLoading(true);
      await groupService.createGroup(trimmedGroup);
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

    // Очищаем поля от лишних пробелов
    const trimmedEditGroup: UpdateGroupDto = {};
    
    if (editGroup.name !== undefined) {
      trimmedEditGroup.name = editGroup.name?.trim();
    }
    if (editGroup.description !== undefined) {
      trimmedEditGroup.description = editGroup.description?.trim();
    }

    try {
      setLoading(true);
      await groupService.updateGroup(openEditGroupDialog.id, trimmedEditGroup);
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
    // Очищаем поля от лишних пробелов
    const trimmedCluster = {
      ...newCluster,
      name: newCluster.name?.trim(),
      description: newCluster.description?.trim(),
      seniorSellerId: newCluster.seniorSellerId,
    };

    if (!trimmedCluster.name || !trimmedCluster.seniorSellerId) {
      showSnackbar('Заполните обязательные поля', 'error');
      return;
    }

    try {
      setLoading(true);
      await clusterService.createCluster(trimmedCluster);
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

    // Очищаем поля от лишних пробелов
    const trimmedEditCluster: UpdateClusterDto = {};
    
    if (editCluster.name !== undefined) {
      trimmedEditCluster.name = editCluster.name?.trim();
    }
    if (editCluster.description !== undefined) {
      trimmedEditCluster.description = editCluster.description?.trim();
    }

    try {
      setLoading(true);
      await clusterService.updateCluster(openEditClusterDialog.id, trimmedEditCluster);
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
    
    if (type === 'mentor') {
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
  const handleAddGroupToClusterClick = (group: Group) => {
    setOpenAddGroupToClusterDialog({ open: true, group });
  };

  const handleAddGroupToCluster = async (clusterId: number) => {
    const { group } = openAddGroupToClusterDialog;
    if (!group) return;

    try {
      setLoading(true);
      await assignmentsService.assignGroupToCluster(group.id, clusterId);
      showSnackbar('Группа добавлена в куст', 'success');
      await loadAllData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Ошибка при добавлении группы в куст';
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
      setOpenAddGroupToClusterDialog({ open: false, group: null });
    }
  };

  const handleRemoveGroupFromCluster = async (groupId: number, clusterId: number) => {
    handleUnassignClick(
      { id: 0, fullName: '' } as User, 
      'groupFromCluster', 
      { groupId, clusterId }
    );
  };

  // Фильтрация пользователей
  const resetFilters = () => {
    setUserFilters({
      role: '',
      groupId: '',
      clusterId: '',
    });
  };

  // Обновленная фильтрация пользователей
  const filteredUsers = users.filter(user => {
    // Поиск по тексту
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        user.username.toLowerCase().includes(query) ||
        user.fullName.toLowerCase().includes(query) ||
        user.telegram?.toLowerCase().includes(query) ||
        user.city?.toLowerCase().includes(query);
      
      if (!matchesSearch) return false;
    }

    // Фильтр по роли
    if (userFilters.role && user.role !== userFilters.role) {
      return false;
    }

    // Фильтр по группе
    if (userFilters.groupId) {
      if (user.groupId !== userFilters.groupId) return false;
    }

    // Фильтр по кусту
    if (userFilters.clusterId) {
      if (user.clusterId !== userFilters.clusterId) return false;
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
    0: '#674fb6',
    1: '#56b8d1',
    2: '#3f1f4b',
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
    <Container maxWidth="lg" sx={{ mt: { xs: 2, sm: 4 }, mb: { xs: 2, sm: 4 }, px: { xs: 1, sm: 2 } }}>
      {/* Заголовок */}
      <Grid container spacing={2} alignItems="center" sx={{ mb: { xs: 2, sm: 3 } }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Typography variant="h4" component="h1" color="#2a0f35" sx={{ fontSize: { xs: '1.8rem', sm: '2rem' } }}>
            Управление персоналом
          </Typography>
          <Typography variant="body1" color="#4c5454" sx={{ fontSize: { xs: '1rem', sm: '1rem' } }}>
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
            fullWidth={isMobile}
          >
            {loading ? 'Обновление...' : 'Обновить'}
          </Button>
        </Grid>
      </Grid>

      {/* Поиск */}
      <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: { xs: 2, sm: 3 } }}>
        <TextField
          fullWidth
          size="small"
          placeholder={isMobile ? "Поиск..." : "Поиск по имени, логину, телеграм или городу..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ color: '#4c5454', mr: 1, fontSize: { xs: 24, sm: 24 } }} />,
            sx: { fontSize: { xs: '1rem', sm: '0.9rem' } }
          }}
        />
      </Paper>

      {/* Пины-табы */}
      <Paper sx={{ mb: { xs: 2, sm: 3 } }}>
        <TabChips value={activeTab} onChange={setActiveTab} tabs={tabs} />


            {activeTab === 0 && (
              <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: { xs: 2, sm: 3 } }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder={isMobile ? "Поиск..." : "Поиск по имени, логину, телеграм или городу..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: <Search sx={{ color: '#4c5454', mr: 1, fontSize: { xs: 24, sm: 24 } }} />,
                      sx: { fontSize: { xs: '1rem', sm: '0.9rem' } }
                    }}
                  />
                  <Tooltip title="Фильтры">
                    <Badge
                      color="primary"
                      variant="dot"
                      invisible={!userFilters.role && !userFilters.groupId && !userFilters.clusterId}
                    >
                      <IconButton
                        onClick={() => setShowFilters(!showFilters)}
                        sx={{
                          bgcolor: showFilters ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) },
                        }}
                      >
                        <FilterIcon />
                      </IconButton>
                    </Badge>
                  </Tooltip>
                </Box>

                {/* Панель фильтров - показываем только если showFilters = true */}
                {showFilters && (
                  <Fade in={showFilters}>
                    <Box
                      sx={{
                        mt: 2,
                        pt: 2,
                        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#2a0f35', fontWeight: 600 }}>
                        Фильтры
                      </Typography>
                      
                      <Grid container spacing={2} alignItems="flex-end">
                        {/* Фильтр по роли */}
                        <Grid size={{ xs: 12, sm: 4 }}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Роль</InputLabel>
                            <Select
                              value={userFilters.role}
                              label="Роль"
                              onChange={(e) => setUserFilters({ ...userFilters, role: e.target.value as UserRole | '' })}
                              sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}
                            >
                              <MenuItem value="">Все роли</MenuItem>
                              {Object.values(UserRole).map((role) => (
                                <MenuItem key={role} value={role}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {getRoleIcon(role)}
                                    {getRoleName(role)}
                                  </Box>
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>

                        {/* Фильтр по группе */}
                        <Grid size={{ xs: 12, sm: 3 }}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Группа</InputLabel>
                            <Select
                              value={userFilters.groupId}
                              label="Группа"
                              onChange={(e) => setUserFilters({ ...userFilters, groupId: e.target.value as number | '' })}
                              sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}
                            >
                              <MenuItem value="">Все группы</MenuItem>
                              {groups.map((group) => (
                                <MenuItem key={group.id} value={group.id}>
                                  {group.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>

                        {/* Фильтр по кусту */}
                        <Grid size={{ xs: 12, sm: 3 }}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Куст</InputLabel>
                            <Select
                              value={userFilters.clusterId}
                              label="Куст"
                              onChange={(e) => setUserFilters({ ...userFilters, clusterId: e.target.value as number | '' })}
                              sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}
                            >
                              <MenuItem value="">Все кусты</MenuItem>
                              {clusters.map((cluster) => (
                                <MenuItem key={cluster.id} value={cluster.id}>
                                  {cluster.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>

                        {/* Кнопка сброса фильтров */}
                        <Grid size={{ xs: 12, sm: 2 }}>
                          <Button
                            fullWidth
                            size="small"
                            variant="outlined"
                            onClick={resetFilters}
                            startIcon={<ClearIcon />}
                            disabled={!userFilters.role && !userFilters.groupId && !userFilters.clusterId}
                            sx={{
                              height: 40,
                              fontSize: { xs: '1rem', sm: '0.8rem' },
                              borderColor: alpha(theme.palette.error.main, 0.5),
                              color: theme.palette.error.main,
                              '&:hover': {
                                borderColor: theme.palette.error.main,
                                backgroundColor: alpha(theme.palette.error.main, 0.05),
                              },
                            }}
                          >
                            Сбросить
                          </Button>
                        </Grid>
                      </Grid>

                      {/* Информация о количестве отфильтрованных пользователей */}
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          Найдено: {filteredUsers.length} из {users.length} пользователей
                        </Typography>
                        
                        {/* Активные фильтры в виде чипов */}
                        {(userFilters.role || userFilters.groupId || userFilters.clusterId) && (
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {userFilters.role && (
                              <Chip
                                size="small"
                                label={`Роль: ${getRoleName(userFilters.role)}`}
                                onDelete={() => setUserFilters({ ...userFilters, role: '' })}
                                sx={{
                                  backgroundColor: alpha(getRoleColor(userFilters.role), 0.1),
                                  color: getRoleColor(userFilters.role),
                                  '& .MuiChip-deleteIcon': {
                                    color: getRoleColor(userFilters.role),
                                  },
                                }}
                              />
                            )}
                            {userFilters.groupId && (
                              <Chip
                                size="small"
                                label={`Группа: ${groups.find(g => g.id === userFilters.groupId)?.name || ''}`}
                                onDelete={() => setUserFilters({ ...userFilters, groupId: '' })}
                              />
                            )}
                            {userFilters.clusterId && (
                              <Chip
                                size="small"
                                label={`Куст: ${clusters.find(c => c.id === userFilters.clusterId)?.name || ''}`}
                                onDelete={() => setUserFilters({ ...userFilters, clusterId: '' })}
                              />
                            )}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Fade>
                )}
              </Paper>
            )}
        {/* Вкладка пользователей */}
        {activeTab === 0 && (
          <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
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
                fullWidth={isMobile}
              >
                Добавить пользователя
              </Button>
            </Box>

            <Grid container spacing={1.5}>
              {filteredUsers.map(user => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={user.id}>
                  <CompactUserCard
                    user={user}
                    onClick={setOpenUserDetailsDialog}
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
          <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
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
                fullWidth={isMobile}
              >
                Создать группу
              </Button>
            </Box>

            <Grid container spacing={1.5}>
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
                    onAddToCluster={handleAddGroupToClusterClick}
                    onRemoveFromCluster={handleRemoveGroupFromCluster}
                    onUnassignClick={handleUnassignClick}
                    onAssignMentor={handleAssignMentorToGroup}
                    onUnassignMentor={handleUnassignMentorFromGroup}
                    getRoleColor={getRoleColor}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Вкладка кустов */}
        {activeTab === 2 && (
          <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
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
                fullWidth={isMobile}
              >
                Создать куст
              </Button>
            </Box>

            <Grid container spacing={1.5}>
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
                    onAddGroup={(clusterId, groupId) => handleAddGroupToCluster(clusterId)}
                    onRemoveGroup={handleRemoveGroupFromCluster}
                    onUnassignClick={handleUnassignClick}
                    onAssignAdmin={handleAssignAdminToCluster}
                    onAssignSenior={handleAssignSeniorToCluster}
                    onUnassignAdmin={handleUnassignAdminFromCluster}
                    getRoleColor={getRoleColor}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Модальное окно с деталями пользователя */}
      <UserDetailsDialog
        open={!!openUserDetailsDialog}
        user={openUserDetailsDialog}
        onClose={() => setOpenUserDetailsDialog(null)}
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
        onChangePassword={handleChangePassword}
        groups={groups}
        clusters={clusters}
        users={users}
        loading={loading}
        getRoleColor={getRoleColor}
        getRoleIcon={getRoleIcon}
      />

      {/* Диалог добавления группы в куст */}
      <AddGroupToClusterDialog
        open={openAddGroupToClusterDialog.open}
        onClose={() => setOpenAddGroupToClusterDialog({ open: false, group: null })}
        onConfirm={handleAddGroupToCluster}
        clusters={clusters}
        loading={loading}
      />

      {/* Остальные диалоги (создание, редактирование, удаление) */}
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
              sx={{ '& .MuiInputBase-input': { fontSize: { xs: '1rem', sm: '0.9rem' } } }}
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
              sx={{ '& .MuiInputBase-input': { fontSize: { xs: '1rem', sm: '0.9rem' } } }}
            />
            <TextField
              label="ФИО"
              fullWidth
              required
              value={newUser.fullName}
              onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
              sx={{ '& .MuiInputBase-input': { fontSize: { xs: '1rem', sm: '0.9rem' } } }}
            />
            <FormControl fullWidth>
              <InputLabel>Роль</InputLabel>
              <Select
                label="Роль"
                value={newUser.role}
                onChange={(e) => {
                  const role = e.target.value as UserRole;
                  setNewUser({ 
                    ...newUser, 
                    role,
                    // Очищаем ставку если выбрана роль без ставки
                    rate: (role === UserRole.OWNER || role === UserRole.ACCOUNTANT) ? 0 : newUser.rate
                  });
                }}
                sx={{ '& .MuiSelect-select': { fontSize: { xs: '1rem', sm: '0.9rem' } } }}
              >
                {Object.values(UserRole).map((role) => (
                  <MenuItem key={role} value={role} sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>
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
              sx={{ '& .MuiInputBase-input': { fontSize: { xs: '1rem', sm: '0.9rem' } } }}
            />
            <TextField
              label="Город"
              fullWidth
              value={newUser.city || ''}
              onChange={(e) => setNewUser({ ...newUser, city: e.target.value })}
              sx={{ '& .MuiInputBase-input': { fontSize: { xs: '1rem', sm: '0.9rem' } } }}
            />
            
            {/* Поле ставки - показываем только для ролей, которым нужна ставка */}
            {newUser.role !== UserRole.OWNER && newUser.role !== UserRole.ACCOUNTANT && (
              <TextField
                label="Ставка за товар (₽)"
                type="number"
                fullWidth
                value={newUser.rate || ''}
                onChange={(e) => setNewUser({ ...newUser, rate: Number(e.target.value) })}
                sx={{ '& .MuiInputBase-input': { fontSize: { xs: '1rem', sm: '0.9rem' } } }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)} disabled={loading} sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>
            Отмена
          </Button>
          <Button onClick={handleCreateUser} variant="contained" disabled={loading} sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>
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
              sx={{ '& .MuiInputBase-input': { fontSize: { xs: '1rem', sm: '0.9rem' } } }}
            />
            <TextField
              label="ФИО"
              fullWidth
              value={editUser.fullName || ''}
              onChange={(e) => setEditUser({ ...editUser, fullName: e.target.value })}
              sx={{ '& .MuiInputBase-input': { fontSize: { xs: '1rem', sm: '0.9rem' } } }}
            />
            <FormControl fullWidth>
              <InputLabel>Роль</InputLabel>
              <Select
                label="Роль"
                value={editUser.role || openEditDialog?.role || ''}
                onChange={(e) => {
                  const role = e.target.value as UserRole;
                  setEditUser({ 
                    ...editUser, 
                    role,
                    // Очищаем ставку если выбрана роль без ставки
                    rate: (role === UserRole.OWNER || role === UserRole.ACCOUNTANT) ? 0 : editUser.rate
                  });
                }}
                sx={{ '& .MuiSelect-select': { fontSize: { xs: '1rem', sm: '0.9rem' } } }}
              >
                {Object.values(UserRole).map((role) => (
                  <MenuItem key={role} value={role} sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>
                    {getRoleName(role)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Telegram"
              fullWidth
              value={editUser.telegram || ''}
              onChange={(e) => setEditUser({ ...editUser, telegram: e.target.value })}
              sx={{ '& .MuiInputBase-input': { fontSize: { xs: '1rem', sm: '0.9rem' } } }}
            />
            <TextField
              label="Город"
              fullWidth
              value={editUser.city || ''}
              onChange={(e) => setEditUser({ ...editUser, city: e.target.value })}
              sx={{ '& .MuiInputBase-input': { fontSize: { xs: '1rem', sm: '0.9rem' } } }}
            />
            
            {/* Поле ставки - показываем только для ролей, которым нужна ставка */}
            {editUser.role !== UserRole.OWNER && editUser.role !== UserRole.ACCOUNTANT && 
            openEditDialog?.role !== UserRole.OWNER && openEditDialog?.role !== UserRole.ACCOUNTANT && (
              <TextField
                label="Ставка за товар (₽)"
                type="number"
                fullWidth
                value={editUser.rate || ''}
                onChange={(e) => setEditUser({ ...editUser, rate: Number(e.target.value) })}
                sx={{ '& .MuiInputBase-input': { fontSize: { xs: '1rem', sm: '0.9rem' } } }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(null)} disabled={loading} sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>
            Отмена
          </Button>
          <Button onClick={handleUpdateUser} variant="contained" disabled={loading} sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>
            {loading ? <CircularProgress size={24} /> : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог удаления пользователя */}
      <Dialog open={!!openDeleteDialog} onClose={() => setOpenDeleteDialog(null)}>
        <DialogTitle>Подтверждение удаления</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>
            Вы уверены, что хотите удалить пользователя "{openDeleteDialog?.fullName}"?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2, fontSize: { xs: '0.95rem', sm: '0.85rem' } }}>
            Это действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(null)} disabled={loading} sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>
            Отмена
          </Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained" disabled={loading} sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>
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
              sx={{ '& .MuiInputBase-input': { fontSize: { xs: '1rem', sm: '0.9rem' } } }}
            />
            <FormControl fullWidth required>
              <InputLabel>Наставник</InputLabel>
              <Select
                label="Наставник"
                value={newGroup.mentorId}
                onChange={(e) => setNewGroup({ ...newGroup, mentorId: Number(e.target.value) })}
                sx={{ '& .MuiSelect-select': { fontSize: { xs: '1rem', sm: '0.9rem' } } }}
              >
                <MenuItem value={0} sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>-- Выберите наставника --</MenuItem>
                {availableMentors.map((mentor) => (
                  <MenuItem key={mentor.id} value={mentor.id} sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>
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
              sx={{ '& .MuiInputBase-input': { fontSize: { xs: '1rem', sm: '0.9rem' } } }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateGroupDialog(false)} disabled={loading} sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>
            Отмена
          </Button>
          <Button onClick={handleCreateGroup} variant="contained" disabled={loading} sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>
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
              sx={{ '& .MuiInputBase-input': { fontSize: { xs: '1rem', sm: '0.9rem' } } }}
            />
            <TextField
              label="Описание"
              fullWidth
              multiline
              rows={3}
              value={editGroup.description || ''}
              onChange={(e) => setEditGroup({ ...editGroup, description: e.target.value })}
              sx={{ '& .MuiInputBase-input': { fontSize: { xs: '1rem', sm: '0.9rem' } } }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditGroupDialog(null)} disabled={loading} sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>
            Отмена
          </Button>
          <Button onClick={handleUpdateGroup} variant="contained" disabled={loading} sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>
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
              sx={{ '& .MuiInputBase-input': { fontSize: { xs: '1rem', sm: '0.9rem' } } }}
            />
            <FormControl fullWidth required>
              <InputLabel>Старший продавец</InputLabel>
              <Select
                label="Старший продавец"
                value={newCluster.seniorSellerId}
                onChange={(e) => setNewCluster({ ...newCluster, seniorSellerId: Number(e.target.value) })}
                sx={{ '& .MuiSelect-select': { fontSize: { xs: '1rem', sm: '0.9rem' } } }}
              >
                <MenuItem value={0} sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>-- Выберите старшего продавца --</MenuItem>
                {availableSeniorSellers.map((senior) => (
                  <MenuItem key={senior.id} value={senior.id} sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>
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
              sx={{ '& .MuiInputBase-input': { fontSize: { xs: '1rem', sm: '0.9rem' } } }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateClusterDialog(false)} disabled={loading} sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>
            Отмена
          </Button>
          <Button onClick={handleCreateCluster} variant="contained" disabled={loading} sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>
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
              sx={{ '& .MuiInputBase-input': { fontSize: { xs: '1rem', sm: '0.9rem' } } }}
            />
            <TextField
              label="Описание"
              fullWidth
              multiline
              rows={3}
              value={editCluster.description || ''}
              onChange={(e) => setEditCluster({ ...editCluster, description: e.target.value })}
              sx={{ '& .MuiInputBase-input': { fontSize: { xs: '1rem', sm: '0.9rem' } } }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditClusterDialog(null)} disabled={loading} sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>
            Отмена
          </Button>
          <Button onClick={handleUpdateCluster} variant="contained" disabled={loading} sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>
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
                  sx={{ '& .MuiSelect-select': { fontSize: { xs: '1rem', sm: '0.9rem' } } }}
                >
                  <MenuItem value={0} sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>-- Не выбран --</MenuItem>
                  {availableMentors.map((mentor) => (
                    <MenuItem key={mentor.id} value={mentor.id} sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>
                      {mentor.fullName} ({mentor.username})
                      {mentor.groupId ? ' (есть группа)' : ' (без группы)'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {selectedMentor > 0 && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontSize: { xs: '0.95rem', sm: '0.85rem' } }}>
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
                sx={{ '& .MuiSelect-select': { fontSize: { xs: '1rem', sm: '0.9rem' } } }}
              >
                <MenuItem value={0} sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>-- Не выбрана --</MenuItem>
                {groups.map((group) => (
                  <MenuItem key={group.id} value={group.id} sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>
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
                sx={{ '& .MuiSelect-select': { fontSize: { xs: '1rem', sm: '0.9rem' } } }}
              >
                <MenuItem value={0} sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>-- Не выбран --</MenuItem>
                {clusters.map((cluster) => (
                  <MenuItem key={cluster.id} value={cluster.id} sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>
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
                          sx={{ fontSize: { xs: '0.85rem', sm: '0.75rem' } }}
                        />
                      );
                    })}
                  </Box>
                )}
                sx={{ '& .MuiSelect-select': { fontSize: { xs: '1rem', sm: '0.9rem' } } }}
              >
                {clusters.map((cluster) => (
                  <MenuItem key={cluster.id} value={cluster.id}>
                    <Checkbox checked={selectedClustersForAdmin.includes(cluster.id)} />
                    <span style={{ fontSize: 'inherit' }}>{cluster.name}</span>
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
            sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}
          >
            Отмена
          </Button>
          <Button 
            onClick={handleAssign}
            variant="contained"
            disabled={loading}
            sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}
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
          <Typography sx={{ mb: 2, fontSize: { xs: '1rem', sm: '0.9rem' } }}>
            Вы уверены, что хотите отвязать:
          </Typography>
          {unassignDialog.type === 'mentor' && (
            <Typography sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>
              Продавца <strong>{unassignDialog.user?.fullName}</strong> от наставника?
            </Typography>
          )}
          {unassignDialog.type === 'group' && (
            <Typography sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>
              Продавца <strong>{unassignDialog.user?.fullName}</strong> от группы?
            </Typography>
          )}
          {unassignDialog.type === 'mentorFromGroup' && (
            <Typography sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>
              Наставника <strong>{unassignDialog.user?.fullName}</strong> от группы?
            </Typography>
          )}
          {unassignDialog.type === 'seniorFromCluster' && (
            <Typography sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>
              Старшего продавца <strong>{unassignDialog.user?.fullName}</strong> от куста?
            </Typography>
          )}
          {unassignDialog.type === 'admin' && (
            <Typography sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>
              Администратора <strong>{unassignDialog.user?.fullName}</strong> от куста?
            </Typography>
          )}
          {unassignDialog.type === 'groupFromCluster' && (
            <Typography sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>
              Группу из куста?
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontSize: { xs: '0.95rem', sm: '0.85rem' } }}>
            Это действие можно отменить позже через повторное назначение.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setUnassignDialog({ open: false, user: null, type: '' })}
            disabled={loading}
            sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}
          >
            Отмена
          </Button>
          <Button 
            onClick={handleConfirmUnassign}
            color="error"
            variant="contained"
            disabled={loading}
            sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}
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
      {/* Диалог назначения наставника группе */}
      <Dialog
        open={openAssignMentorDialog}
        onClose={() => {
          setOpenAssignMentorDialog(false);
          setSelectedGroupForMentor(null);
          setSelectedMentorForGroup(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Назначить наставника группе "{selectedGroupForMentor?.name}"
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Выберите наставника</InputLabel>
            <Select
              value={selectedMentorForGroup || 0}
              label="Выберите наставника"
              onChange={(e) => setSelectedMentorForGroup(Number(e.target.value))}
            >
              <MenuItem value={0}>-- Не выбран --</MenuItem>
              {users.filter(u => u.role === UserRole.MENTOR && !u.groupId).map((mentor) => (
                <MenuItem key={mentor.id} value={mentor.id}>
                  {mentor.fullName} ({mentor.username})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenAssignMentorDialog(false);
              setSelectedGroupForMentor(null);
              setSelectedMentorForGroup(null);
            }}
            disabled={loading}
          >
            Отмена
          </Button>
          <Button
            onClick={handleConfirmAssignMentor}
            variant="contained"
            disabled={!selectedMentorForGroup || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Назначить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог назначения администратора кусту */}
      <Dialog
        open={openAssignAdminDialog}
        onClose={() => {
          setOpenAssignAdminDialog(false);
          setSelectedClusterForAdmin(null);
          setSelectedAdminForCluster(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Назначить администратора кусту "{selectedClusterForAdmin?.name}"
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Выберите администратора</InputLabel>
            <Select
              value={selectedAdminForCluster || 0}
              label="Выберите администратора"
              onChange={(e) => setSelectedAdminForCluster(Number(e.target.value))}
            >
              <MenuItem value={0}>-- Не выбран --</MenuItem>
              {users.filter(u => u.role === UserRole.ADMIN).map((admin) => (
                <MenuItem key={admin.id} value={admin.id}>
                  {admin.fullName} ({admin.username})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenAssignAdminDialog(false);
              setSelectedClusterForAdmin(null);
              setSelectedAdminForCluster(null);
            }}
            disabled={loading}
          >
            Отмена
          </Button>
          <Button
            onClick={handleConfirmAssignAdmin}
            variant="contained"
            disabled={!selectedAdminForCluster || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Назначить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог назначения старшего продавца кусту */}
      <Dialog
        open={openAssignSeniorDialog}
        onClose={() => {
          setOpenAssignSeniorDialog(false);
          setSelectedClusterForSenior(null);
          setSelectedSeniorForCluster(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Назначить старшего продавца кусту "{selectedClusterForSenior?.name}"
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Выберите старшего продавца</InputLabel>
            <Select
              value={selectedSeniorForCluster || 0}
              label="Выберите старшего продавца"
              onChange={(e) => setSelectedSeniorForCluster(Number(e.target.value))}
            >
              <MenuItem value={0}>-- Не выбран --</MenuItem>
              {users.filter(u => u.role === UserRole.SENIOR_SELLER && !u.clusterId).map((senior) => (
                <MenuItem key={senior.id} value={senior.id}>
                  {senior.fullName} ({senior.username})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenAssignSeniorDialog(false);
              setSelectedClusterForSenior(null);
              setSelectedSeniorForCluster(null);
            }}
            disabled={loading}
          >
            Отмена
          </Button>
          <Button
            onClick={handleConfirmAssignSenior}
            variant="contained"
            disabled={!selectedSeniorForCluster || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Назначить'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ fontSize: { xs: '1rem', sm: '0.9rem' } }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default StaffPage;