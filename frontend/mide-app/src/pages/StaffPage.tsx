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
  Chip,
  IconButton,
  Avatar,
  InputAdornment,
  Alert,
  Snackbar,
  CircularProgress,
  Tabs,
  Tab,
  Card,
  CardContent,
  Checkbox,
  ListItemText,
  OutlinedInput,
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
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, 
  UserRole, 
  CreateUserDto, 
  UpdateUserDto, 
  getRoleName, 
  Group, 
  Cluster, 
  CreateGroupDto, 
  CreateClusterDto 
} from '../types';
import { userService } from '../api/userService';
import { groupService } from '../api/groupService';
import { clusterService } from '../api/clusterService';
import { assignmentsService } from '../api/assignmentsService';

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info';
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const StaffPage: React.FC = () => {
  const { user: currentUser } = useAuth();
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
  const [openCreateClusterDialog, setOpenCreateClusterDialog] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState<{
    open: boolean;
    user: User | null;
    type: 'mentor' | 'group' | 'cluster' | 'admin' | null;
  }>({ open: false, user: null, type: null });

  // Формы
  const [newUser, setNewUser] = useState<CreateUserDto>({
    username: '',
    password: 'TempPass123!',
    fullName: '',
    role: UserRole.SELLER,
    telegram: '',
    city: '',
  });

  const [editUser, setEditUser] = useState<UpdateUserDto>({});
  const [showPassword, setShowPassword] = useState(false);

  const [newGroup, setNewGroup] = useState<CreateGroupDto>({
    name: '',
    mentorId: 0,
    description: '',
  });

  const [newCluster, setNewCluster] = useState<CreateClusterDto>({
    name: '',
    seniorSellerId: 0,
    description: '',
  });

  // Для диалогов назначения
  const [selectedMentor, setSelectedMentor] = useState<number>(0);
  const [selectedGroup, setSelectedGroup] = useState<number>(0);
  const [selectedCluster, setSelectedCluster] = useState<number>(0);

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
    }
  };

  const handleUpdateUser = async () => {
    if (!openEditDialog) return;

    try {
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
    });
  };

  // ================ УПРАВЛЕНИЕ ГРУППАМИ ================
  const handleCreateGroup = async () => {
    if (!newGroup.name || !newGroup.mentorId) {
      showSnackbar('Заполните обязательные поля', 'error');
      return;
    }

    try {
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
    }
  };

  // ================ УПРАВЛЕНИЕ КУСТАМИ ================
  const handleCreateCluster = async () => {
    if (!newCluster.name || !newCluster.seniorSellerId) {
      showSnackbar('Заполните обязательные поля', 'error');
      return;
    }

    try {
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
    }
  };

  // ================ УПРАВЛЕНИЕ СВЯЗЯМИ ================
  const openAssignmentDialog = (user: User, type: 'mentor' | 'group' | 'cluster' | 'admin') => {
    setOpenAssignDialog({ open: true, user, type });
    
    // Устанавливаем начальные значения
    if (type === 'mentor') setSelectedMentor(user.mentorId || 0);
    if (type === 'group') setSelectedGroup(user.groupId || 0);
    if (type === 'cluster') setSelectedCluster(user.clusterId || 0);
  };

  const handleAssign = async () => {
    const { user, type } = openAssignDialog;
    if (!user || !type) return;

    try {
      switch (type) {
        case 'mentor':
          if (user.role === UserRole.SELLER && selectedMentor > 0) {
            await assignmentsService.assignSellerToMentor(user.id, selectedMentor);
            showSnackbar('Наставник успешно назначен', 'success');
          }
          break;
        
        case 'group':
          if (user.role === UserRole.SELLER && selectedGroup > 0) {
            await assignmentsService.assignSellerToGroup(user.id, selectedGroup);
            showSnackbar('Продавец добавлен в группу', 'success');
          }
          break;
        
        case 'cluster':
          if (user.role === UserRole.MENTOR && selectedCluster > 0) {
            await assignmentsService.assignMentorToCluster(user.id, selectedCluster);
            showSnackbar('Наставник добавлен в куст', 'success');
          } else if (user.role === UserRole.SENIOR_SELLER && selectedCluster > 0) {
            await assignmentsService.assignSeniorToCluster(user.id, selectedCluster);
            showSnackbar('Старший продавец назначен кусту', 'success');
          }
          break;
        
        case 'admin':
          if (user.role === UserRole.ADMIN && selectedCluster > 0) {
            await assignmentsService.assignAdminToCluster(user.id, selectedCluster);
            showSnackbar('Куст назначен администратору', 'success');
          }
          break;
      }
      
      await loadAllData();
      setOpenAssignDialog({ open: false, user: null, type: null });
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 
                         error.response?.data?.message || 
                         'Ошибка при назначении';
      showSnackbar(errorMessage, 'error');
    }
  };

  // Удаление назначения
  const handleRemoveAssignment = async (user: User, assignmentType: 'group' | 'admin_cluster') => {
    try {
      if (assignmentType === 'group' && user.role === UserRole.SELLER) {
        await assignmentsService.removeSellerFromGroup(user.id);
        showSnackbar('Продавец удален из группы', 'success');
      } else if (assignmentType === 'admin_cluster' && user.role === UserRole.ADMIN) {
        // Нужно будет добавить метод для удаления конкретного куста у администратора
        // Пока временная реализация
        showSnackbar('Функция удаления куста у администратора в разработке', 'info');
      }
      
      await loadAllData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 
                         error.response?.data?.message || 
                         'Ошибка при удалении назначения';
      showSnackbar(errorMessage, 'error');
    }
  };

  // Получение информации о связанных объектах
  const getUserGroupInfo = (userId: number) => {
    const user = users.find(u => u.id === userId);
    if (!user) return null;
    
    const group = groups.find(g => g.id === user.groupId);
    const cluster = clusters.find(c => c.id === user.clusterId);
    const mentor = users.find(u => u.id === user.mentorId);
    const seniorSeller = users.find(u => u.id === user.seniorSellerId);

    return { user, group, cluster, mentor, seniorSeller };
  };

  const getGroupClusterInfo = (groupId: number) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return null;
    
    const cluster = clusters.find(c => c.id === group.clusterId);
    const mentor = users.find(u => u.id === group.mentorId);
    const seniorSeller = users.find(u => u.id === group.seniorSellerId);

    return { group, cluster, mentor, seniorSeller };
  };

  const getClusterAdminInfo = (clusterId: number) => {
    const cluster = clusters.find(c => c.id === clusterId);
    if (!cluster) return null;
    
    const admin = users.find(u => u.id === cluster.adminId);
    const seniorSeller = users.find(u => u.id === cluster.seniorSellerId);

    return { cluster, admin, seniorSeller };
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
  const availableMentors = users.filter(u => u.role === UserRole.MENTOR && !u.groupId);
  const availableSeniorSellers = users.filter(u => u.role === UserRole.SENIOR_SELLER && !u.clusterId);
  const sellersWithoutGroup = users.filter(u => u.role === UserRole.SELLER && !u.groupId);

  // Статистика
  const stats = {
    totalUsers: users.length,
    sellers: users.filter(u => u.role === UserRole.SELLER).length,
    mentors: users.filter(u => u.role === UserRole.MENTOR).length,
    seniors: users.filter(u => u.role === UserRole.SENIOR_SELLER).length,
    admins: users.filter(u => u.role === UserRole.ADMIN).length,
    owners: users.filter(u => u.role === UserRole.OWNER).length,
    groups: groups.length,
    clusters: clusters.length,
    sellersWithoutMentor: users.filter(u => u.role === UserRole.SELLER && !u.mentorId).length,
    mentorsWithoutCluster: users.filter(u => u.role === UserRole.MENTOR && !u.clusterId).length,
    seniorsWithoutCluster: users.filter(u => u.role === UserRole.SENIOR_SELLER && !u.clusterId).length,
  };

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
      <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Typography variant="h4" component="h1" color="#2a0f35">
            🏢 Управление персоналом
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
            sx={{ mr: 1 }}
          >
            Обновить
          </Button>
        </Grid>
      </Grid>

      {/* Статистика */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="#674fb6">{stats.totalUsers}</Typography>
            <Typography variant="caption" color="#4c5454">
              Всего пользователей
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="#56b8d1">{stats.groups}</Typography>
            <Typography variant="caption" color="#4c5454">
              Групп
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="#3f1f4b">{stats.clusters}</Typography>
            <Typography variant="caption" color="#4c5454">
              Кустов
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="#ca0ec0">{stats.sellersWithoutMentor}</Typography>
            <Typography variant="caption" color="#4c5454">
              Продавцов без наставника
            </Typography>
          </Paper>
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

      {/* Вкладки */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab icon={<People />} label={`Пользователи (${users.length})`} />
          <Tab icon={<GroupsIcon />} label={`Группы (${groups.length})`} />
          <Tab icon={<Business />} label={`Кусты (${clusters.length})`} />
        </Tabs>

        {/* Вкладка пользователей */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<PersonAdd />}
              onClick={() => setOpenCreateDialog(true)}
              sx={{ backgroundColor: '#674fb6' }}
            >
              Добавить пользователя
            </Button>
          </Box>

          <Grid container spacing={2}>
            {filteredUsers.map(user => {
              const info = getUserGroupInfo(user.id);
              return (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={user.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar sx={{ bgcolor: getRoleColor(user.role), mr: 2 }}>
                          {user.fullName.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {user.fullName}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {getRoleIcon(user.role)}
                            <Typography variant="body2" color="text.secondary">
                              {getRoleName(user.role)}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Логин:</strong> {user.username}
                      </Typography>
                      
                      {user.telegram && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Telegram:</strong> {user.telegram}
                        </Typography>
                      )}
                      
                      {user.city && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Город:</strong> {user.city}
                        </Typography>
                      )}
                      
                      {/* Показываем связи */}
                      {user.role === UserRole.SELLER && (
                        <>
                          {info?.group && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Typography variant="body2">
                                <strong>Группа:</strong> {info.group.name}
                              </Typography>
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleRemoveAssignment(user, 'group')}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Box>
                          )}
                          {info?.mentor && (
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>Наставник:</strong> {info.mentor.fullName}
                            </Typography>
                          )}
                          {info?.cluster && (
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>Куст:</strong> {info.cluster.name}
                            </Typography>
                          )}
                        </>
                      )}
                      
                      {user.role === UserRole.MENTOR && info?.cluster && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Куст:</strong> {info.cluster.name}
                        </Typography>
                      )}
                      
                      {user.role === UserRole.SENIOR_SELLER && info?.cluster && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Управляет кустом:</strong> {info.cluster.name}
                        </Typography>
                      )}
                      
                      {user.role === UserRole.ADMIN && user.adminClusterIds && user.adminClusterIds.length > 0 && (
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="body2">
                            <strong>Кустов под управлением:</strong>
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                            {user.adminClusterIds.map(clusterId => {
                              const cluster = clusters.find(c => c.id === clusterId);
                              return cluster ? (
                                <Chip
                                  key={cluster.id}
                                  label={cluster.name}
                                  size="small"
                                  onDelete={() => handleRemoveAssignment(user, 'admin_cluster')}
                                />
                              ) : null;
                            })}
                          </Box>
                        </Box>
                      )}

                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                        {/* Кнопки управления связями в зависимости от роли */}
                        {user.role === UserRole.SELLER && (
                          <>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => openAssignmentDialog(user, 'mentor')}
                            >
                              {user.mentorId ? 'Сменить наставника' : 'Назначить наставника'}
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => openAssignmentDialog(user, 'group')}
                            >
                              {user.groupId ? 'Сменить группу' : 'Добавить в группу'}
                            </Button>
                          </>
                        )}
                        
                        {(user.role === UserRole.MENTOR || user.role === UserRole.SENIOR_SELLER) && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => openAssignmentDialog(user, 'cluster')}
                          >
                            {user.clusterId ? 'Сменить куст' : 'Назначить куст'}
                          </Button>
                        )}
                        
                        {user.role === UserRole.ADMIN && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => openAssignmentDialog(user, 'admin')}
                          >
                            Управление кустами
                          </Button>
                        )}
                        
                        {/* Кнопки редактирования и удаления */}
                        <Button
                          size="small"
                          startIcon={<Edit />}
                          onClick={() => {
                            setOpenEditDialog(user);
                            setEditUser({
                              username: user.username,
                              fullName: user.fullName,
                              telegram: user.telegram,
                              city: user.city,
                              role: user.role,
                              clusterId: user.clusterId,
                              groupId: user.groupId,
                              mentorId: user.mentorId,
                              seniorSellerId: user.seniorSellerId,
                              adminClusterIds: user.adminClusterIds,
                            });
                          }}
                        >
                          Редактировать
                        </Button>
                        <Button
                          size="small"
                          startIcon={<Delete />}
                          color="error"
                          onClick={() => setOpenDeleteDialog(user)}
                          disabled={user.role === UserRole.OWNER || user.id === currentUser?.id}
                        >
                          Удалить
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </TabPanel>

        {/* Вкладка групп */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<GroupsIcon />}
              onClick={() => setOpenCreateGroupDialog(true)}
              sx={{ backgroundColor: '#56b8d1' }}
            >
              Создать группу
            </Button>
          </Box>

          <Grid container spacing={2}>
            {groups.map(group => {
              const info = getGroupClusterInfo(group.id);
              return (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={group.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {group.name}
                      </Typography>
                      
                      {group.description && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {group.description}
                        </Typography>
                      )}
                      
                      {info?.mentor && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Наставник:</strong> {info.mentor.fullName}
                        </Typography>
                      )}
                      
                      {info?.cluster && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Куст:</strong> {info.cluster.name}
                        </Typography>
                      )}
                      
                      {info?.seniorSeller && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Старший продавец:</strong> {info.seniorSeller.fullName}
                        </Typography>
                      )}
                      
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Продавцов в группе:</strong> {group.sellerCount || 0}
                      </Typography>
                      
                      <Typography variant="caption" color="text.secondary">
                        Создана: {new Date(group.createdAt).toLocaleDateString('ru-RU')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </TabPanel>

        {/* Вкладка кустов */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<Domain />}
              onClick={() => setOpenCreateClusterDialog(true)}
              sx={{ backgroundColor: '#3f1f4b' }}
            >
              Создать куст
            </Button>
          </Box>

          <Grid container spacing={2}>
            {clusters.map(cluster => {
              const info = getClusterAdminInfo(cluster.id);
              return (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={cluster.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {cluster.name}
                      </Typography>
                      
                      {cluster.description && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {cluster.description}
                        </Typography>
                      )}
                      
                      {info?.seniorSeller && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Старший продавец:</strong> {info.seniorSeller.fullName}
                        </Typography>
                      )}
                      
                      {info?.admin && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          <strong>Администратор:</strong> {info.admin.fullName}
                        </Typography>
                      )}
                      
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Групп в кусте:</strong> {cluster.groupCount || 0}
                      </Typography>
                      
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Продавцов в кусте:</strong> {cluster.sellerCount || 0}
                      </Typography>
                      
                      <Typography variant="caption" color="text.secondary">
                        Создан: {new Date(cluster.createdAt).toLocaleDateString('ru-RU')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </TabPanel>
      </Paper>

      {/* ================ ДИАЛОГИ ================ */}

      {/* Диалог создания пользователя */}
      <Dialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Создание пользователя</DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            Создайте пользователя без связей. Назначить наставника, группу или куст можно позже.
          </Alert>
          
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Логин *"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value.trim() })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Пароль *"
                type={showPassword ? 'text' : 'password'}
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                required
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
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="ФИО *"
                value={newUser.fullName}
                onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Телеграм"
                value={newUser.telegram}
                onChange={(e) => setNewUser({ ...newUser, telegram: e.target.value })}
                placeholder="@username"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Город"
                value={newUser.city}
                onChange={(e) => setNewUser({ ...newUser, city: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Роль *</InputLabel>
                <Select
                  value={newUser.role}
                  label="Роль *"
                  onChange={(e) => setNewUser({ 
                    ...newUser, 
                    role: e.target.value as UserRole
                  })}
                >
                  {[UserRole.SELLER, UserRole.MENTOR, UserRole.SENIOR_SELLER, UserRole.ADMIN].map((role) => (
                    <MenuItem key={role} value={role}>
                      {getRoleName(role)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Отмена</Button>
          <Button
            onClick={handleCreateUser}
            variant="contained"
            disabled={!newUser.username || !newUser.fullName}
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог редактирования пользователя */}
      <Dialog
        open={!!openEditDialog}
        onClose={() => setOpenEditDialog(null)}
        maxWidth="sm"
        fullWidth
      >
        {openEditDialog && (
          <>
            <DialogTitle>Редактирование пользователя</DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Логин"
                    value={editUser.username || ''}
                    onChange={(e) => setEditUser({ ...editUser, username: e.target.value.trim() })}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="ФИО"
                    value={editUser.fullName || ''}
                    onChange={(e) => setEditUser({ ...editUser, fullName: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Телеграм"
                    value={editUser.telegram || ''}
                    onChange={(e) => setEditUser({ ...editUser, telegram: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Город"
                    value={editUser.city || ''}
                    onChange={(e) => setEditUser({ ...editUser, city: e.target.value })}
                  />
                </Grid>

                {/* Поля для администратора */}
                {openEditDialog.role === UserRole.ADMIN && (
                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Кусты под управлением</InputLabel>
                      <Select
                        multiple
                        value={editUser.adminClusterIds || []}
                        onChange={(e) => setEditUser({ 
                          ...editUser, 
                          adminClusterIds: typeof e.target.value === 'string' 
                            ? e.target.value.split(',').map(Number) 
                            : e.target.value 
                        })}
                        input={<OutlinedInput label="Кусты под управлением" />}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {(selected as number[]).map((value) => {
                              const cluster = clusters.find(c => c.id === value);
                              return <Chip key={value} label={cluster?.name || value} size="small" />;
                            })}
                          </Box>
                        )}
                      >
                        {clusters.map(cluster => (
                          <MenuItem key={cluster.id} value={cluster.id}>
                            <Checkbox checked={(editUser.adminClusterIds || []).includes(cluster.id)} />
                            <ListItemText primary={cluster.name} />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenEditDialog(null)}>Отмена</Button>
              <Button onClick={handleUpdateUser} variant="contained">
                Сохранить
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Диалог создания группы */}
      <Dialog
        open={openCreateGroupDialog}
        onClose={() => setOpenCreateGroupDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Создание группы</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Название группы *"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Наставник *</InputLabel>
                <Select
                  value={newGroup.mentorId}
                  label="Наставник *"
                  onChange={(e) => setNewGroup({ ...newGroup, mentorId: Number(e.target.value) })}
                >
                  <MenuItem value={0}>Выберите наставника</MenuItem>
                  {availableMentors.map(mentor => (
                    <MenuItem key={mentor.id} value={mentor.id}>
                      {mentor.fullName} ({mentor.username})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {availableMentors.length === 0 && (
                <Typography variant="caption" color="error">
                  Нет доступных наставников. Сначала создайте наставника.
                </Typography>
              )}
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Описание"
                value={newGroup.description}
                onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateGroupDialog(false)}>Отмена</Button>
          <Button
            onClick={handleCreateGroup}
            variant="contained"
            disabled={!newGroup.name || !newGroup.mentorId}
          >
            Создать группу
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог создания куста */}
      <Dialog
        open={openCreateClusterDialog}
        onClose={() => setOpenCreateClusterDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Создание куста</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Название куста *"
                value={newCluster.name}
                onChange={(e) => setNewCluster({ ...newCluster, name: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Старший продавец *</InputLabel>
                <Select
                  value={newCluster.seniorSellerId}
                  label="Старший продавец *"
                  onChange={(e) => setNewCluster({ ...newCluster, seniorSellerId: Number(e.target.value) })}
                >
                  <MenuItem value={0}>Выберите старшего продавца</MenuItem>
                  {availableSeniorSellers.map(senior => (
                    <MenuItem key={senior.id} value={senior.id}>
                      {senior.fullName} ({senior.username})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {availableSeniorSellers.length === 0 && (
                <Typography variant="caption" color="error">
                  Нет доступных старших продавцов. Сначала создайте старшего продавца.
                </Typography>
              )}
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Описание"
                value={newCluster.description}
                onChange={(e) => setNewCluster({ ...newCluster, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateClusterDialog(false)}>Отмена</Button>
          <Button
            onClick={handleCreateCluster}
            variant="contained"
            disabled={!newCluster.name || !newCluster.seniorSellerId}
          >
            Создать куст
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог назначения связей */}
      <Dialog
        open={openAssignDialog.open}
        onClose={() => setOpenAssignDialog({ open: false, user: null, type: null })}
        maxWidth="sm"
        fullWidth
      >
        {openAssignDialog.user && openAssignDialog.type && (
          <>
            <DialogTitle>
              {openAssignDialog.type === 'mentor' && 'Назначить наставника'}
              {openAssignDialog.type === 'group' && 'Добавить в группу'}
              {openAssignDialog.type === 'cluster' && openAssignDialog.user.role === UserRole.MENTOR 
                ? 'Добавить наставника в куст'
                : openAssignDialog.user.role === UserRole.SENIOR_SELLER
                ? 'Назначить куст старшему продавцу'
                : 'Назначить куст администратору'}
              {openAssignDialog.type === 'admin' && 'Управление кустами администратора'}
            </DialogTitle>
            <DialogContent dividers>
              <Typography gutterBottom>
                Пользователь: <strong>{openAssignDialog.user.fullName}</strong>
              </Typography>
              
              {openAssignDialog.type === 'mentor' && (
                <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                  <InputLabel>Наставник</InputLabel>
                  <Select
                    value={selectedMentor}
                    label="Наставник"
                    onChange={(e) => setSelectedMentor(Number(e.target.value))}
                  >
                    <MenuItem value={0}>Не выбран</MenuItem>
                    {users
                      .filter(u => u.role === UserRole.MENTOR)
                      .map(mentor => (
                        <MenuItem key={mentor.id} value={mentor.id}>
                          {mentor.fullName} ({mentor.username})
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              )}
              
              {openAssignDialog.type === 'group' && (
                <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                  <InputLabel>Группа</InputLabel>
                  <Select
                    value={selectedGroup}
                    label="Группа"
                    onChange={(e) => setSelectedGroup(Number(e.target.value))}
                  >
                    <MenuItem value={0}>Не выбрана</MenuItem>
                    {groups.map(group => (
                      <MenuItem key={group.id} value={group.id}>
                        {group.name} (Наставник: {group.mentorName || 'Не назначен'})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              
              {(openAssignDialog.type === 'cluster' || openAssignDialog.type === 'admin') && (
                <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                  <InputLabel>Куст</InputLabel>
                  <Select
                    value={selectedCluster}
                    label="Куст"
                    onChange={(e) => setSelectedCluster(Number(e.target.value))}
                  >
                    <MenuItem value={0}>Не выбран</MenuItem>
                    {clusters.map(cluster => {
                      const isAssigned = cluster.adminId === openAssignDialog.user?.id;
                      return (
                        <MenuItem key={cluster.id} value={cluster.id} disabled={isAssigned}>
                          {cluster.name}
                          {cluster.seniorSellerName && ` (Старший: ${cluster.seniorSellerName})`}
                          {cluster.adminName && ` (Админ: ${cluster.adminName})`}
                          {isAssigned && ' - уже назначен'}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenAssignDialog({ open: false, user: null, type: null })}>
                Отмена
              </Button>
              <Button
                onClick={handleAssign}
                variant="contained"
                disabled={
                  (openAssignDialog.type === 'mentor' && !selectedMentor) ||
                  (openAssignDialog.type === 'group' && !selectedGroup) ||
                  ((openAssignDialog.type === 'cluster' || openAssignDialog.type === 'admin') && !selectedCluster)
                }
              >
                Назначить
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Диалог подтверждения удаления */}
      <Dialog
        open={!!openDeleteDialog}
        onClose={() => setOpenDeleteDialog(null)}
      >
        {openDeleteDialog && (
          <>
            <DialogTitle>Подтверждение удаления</DialogTitle>
            <DialogContent>
              <Typography>
                Вы уверены, что хотите удалить пользователя{' '}
                <strong>{openDeleteDialog.fullName}</strong> ({openDeleteDialog.username})?
              </Typography>
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                Это действие нельзя отменить.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDeleteDialog(null)}>Отмена</Button>
              <Button onClick={handleDeleteUser} variant="contained" color="error">
                Удалить
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

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