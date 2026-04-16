import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Autocomplete,
  Chip,
  Stack,
  Divider,
  useTheme,
  useMediaQuery,
  SelectChangeEvent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Send as SendIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Home as HomeIcon,
  LocationCity as LocationCityIcon,
  Language as LanguageIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { revisionService } from '../../api/revisionService';
import { userService } from '../../api/userService';
import { groupService } from '../../api/groupService';
import { clusterService } from '../../api/clusterService';
import {
  RevisionType,
  User,
  UserRole,
  Group,
  Cluster,
  getRevisionTypeText,
  getRoleName,
} from '../../types';

const RequestRevisionPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Данные формы
  const [step, setStep] = useState(0);
  const [revisionType, setRevisionType] = useState<RevisionType>(RevisionType.USER);
  const [comment, setComment] = useState('');
  
  // Данные для выбора
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  
  // Выбранные значения
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | ''>('');
  const [selectedClusterId, setSelectedClusterId] = useState<number | ''>('');
  const [selectedCity, setSelectedCity] = useState<string>('');

  // Диалог выхода
  const [exitDialog, setExitDialog] = useState(false);

  // Ref для отслеживания начального состояния (были ли изменения)
  const initialFormState = useRef({
    revisionType: RevisionType.USER,
    selectedUserId: null as number | null,
    selectedGroupId: '' as number | '',
    selectedClusterId: '' as number | '',
    selectedCity: '',
    comment: '',
  });

  // Загрузка данных
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        const [usersData, groupsData, clustersData] = await Promise.all([
          userService.getAllUsers(),
          groupService.getAllGroups(),
          clusterService.getAllClusters()
        ]);
        
        setUsers(usersData.filter(u => 
          u.role !== UserRole.OWNER && 
          u.role !== UserRole.ADMIN
        ));
        
        setGroups(groupsData);
        setClusters(clustersData);
        
        const uniqueCities = Array.from(new Set(
          usersData
            .filter(u => u.cityName && u.role !== UserRole.OWNER && u.role !== UserRole.ADMIN)
            .map(u => u.cityName!)
        ));
        setCities(uniqueCities);
        
      } catch (err: any) {
        console.error('Error loading data:', err);
        setError(err.message || 'Ошибка при загрузке данных');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [user]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Сортировка пользователей по роли и имени
  const sortedUsers = useMemo(() => {
    return [...users]
      .filter(u => u.role !== UserRole.ACCOUNTANT)
      .sort((a, b) => {
        const roleA = getRoleName(a.role);
        const roleB = getRoleName(b.role);
        if (roleA !== roleB) {
          return roleA.localeCompare(roleB);
        }
        return a.fullName.localeCompare(b.fullName);
      });
  }, [users]);

  // Проверка, может ли пользователь запросить общую ревизию
  const canRequestGeneralRevision = user?.role === UserRole.OWNER;

  // Проверка, были ли изменения в форме
  const hasChanges = (): boolean => {
    if (step === 0 && revisionType !== initialFormState.current.revisionType) {
      return true;
    }
    if (step >= 1) {
      if (revisionType === RevisionType.USER && selectedUserId !== initialFormState.current.selectedUserId) return true;
      if (revisionType === RevisionType.GROUP && selectedGroupId !== initialFormState.current.selectedGroupId) return true;
      if (revisionType === RevisionType.CLUSTER && selectedClusterId !== initialFormState.current.selectedClusterId) return true;
      if (revisionType === RevisionType.CITY && selectedCity !== initialFormState.current.selectedCity) return true;
    }
    if (comment !== initialFormState.current.comment) return true;
    return false;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleExitClick = () => {
    if (hasChanges()) {
      setExitDialog(true);
    } else {
      navigate('/revisions');
    }
  };

  const validateStep = (stepNumber: number): boolean => {
    setError(null);

    if (stepNumber === 1) {
      switch (revisionType) {
        case RevisionType.USER:
          if (!selectedUserId) {
            setError('Выберите пользователя');
            return false;
          }
          break;
        case RevisionType.GROUP:
          if (!selectedGroupId) {
            setError('Выберите группу');
            return false;
          }
          break;
        case RevisionType.CLUSTER:
          if (!selectedClusterId) {
            setError('Выберите куст');
            return false;
          }
          break;
        case RevisionType.CITY:
          if (!selectedCity) {
            setError('Выберите город');
            return false;
          }
          break;
      }
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep(1)) {
      setStep(1);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const revisionData: any = {
        type: revisionType,
        comment: comment || undefined,
      };
      
      switch (revisionType) {
        case RevisionType.USER:
          revisionData.targetUserId = selectedUserId;
          break;
        case RevisionType.GROUP:
          revisionData.targetGroupId = selectedGroupId;
          break;
        case RevisionType.CLUSTER:
          revisionData.targetClusterId = selectedClusterId;
          break;
        case RevisionType.CITY:
          revisionData.targetCity = selectedCity;
          break;
      }
      
      await revisionService.requestRevision(revisionData);
      navigate('/revisions');
      
    } catch (err: any) {
      setError(err.message || 'Ошибка при создании ревизии');
    } finally {
      setLoading(false);
    }
  };

  const getRevisionTypeIcon = (type: RevisionType) => {
    switch (type) {
      case RevisionType.USER: return <PersonIcon />;
      case RevisionType.GROUP: return <GroupIcon />;
      case RevisionType.CLUSTER: return <HomeIcon />;
      case RevisionType.CITY: return <LocationCityIcon />;
      case RevisionType.GENERAL: return <LanguageIcon />;
      default: return <LanguageIcon />;
    }
  };

  const getRevisionTypeColor = (type: RevisionType): string => {
    switch (type) {
      case RevisionType.USER: return '#2196f3';
      case RevisionType.GROUP: return '#9c27b0';
      case RevisionType.CLUSTER: return '#ff9800';
      case RevisionType.CITY: return '#4caf50';
      case RevisionType.GENERAL: return '#f44336';
      default: return '#2196f3';
    }
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="body2" color="#4c5454" sx={{ mb: 3 }}>
              Выберите тип ревизии — это определит, кто будет её заполнять
            </Typography>
            
            <Stack spacing={2}>
              {[
                { 
                  type: RevisionType.USER, 
                  title: 'Пользователь', 
                  description: 'Ревизия конкретного продавца',
                  icon: <PersonIcon />,
                },
                { 
                  type: RevisionType.GROUP, 
                  title: 'Группа', 
                  description: 'Ревизия всех продавцов в группе',
                  icon: <GroupIcon />,
                },
                { 
                  type: RevisionType.CLUSTER, 
                  title: 'Куст', 
                  description: 'Ревизия всех продавцов в кусте',
                  icon: <HomeIcon />,
                },
                { 
                  type: RevisionType.CITY, 
                  title: 'Город', 
                  description: 'Ревизия всех продавцов в городе',
                  icon: <LocationCityIcon />,
                },
                { 
                  type: RevisionType.GENERAL, 
                  title: 'Общая', 
                  description: 'Ревизия всех продавцов системы',
                  icon: <LanguageIcon />,
                  disabled: !canRequestGeneralRevision,
                },
              ].map((item) => (
                <Card
                  key={item.type}
                  sx={{
                    cursor: item.disabled ? 'not-allowed' : 'pointer',
                    borderRadius: 4,
                    position: 'relative',
                    border: '1px solid rgba(103, 79, 182, 0.1)',
                    backgroundColor: revisionType === item.type 
                      ? `${getRevisionTypeColor(item.type)}15` 
                      : '#ffffff',
                    opacity: item.disabled ? 0.6 : 1,
                    transition: 'all 0.2s ease',
                    WebkitTapHighlightColor: 'transparent',
                    
                    ...(revisionType === item.type && {
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: -1,
                        left: -1,
                        right: -1,
                        bottom: -1,
                        borderRadius: 4,
                        border: `1.5px solid ${getRevisionTypeColor(item.type)}`,
                        pointerEvents: 'none',
                      },
                    }),
                    
                    '&:hover': item.disabled ? {} : {
                      backgroundColor: revisionType === item.type 
                        ? `${getRevisionTypeColor(item.type)}15`
                        : `${getRevisionTypeColor(item.type)}08`,
                      borderColor: 'rgba(103, 79, 182, 0.2)',
                      '@media (min-width: 600px)': {
                        transform: 'translateY(-2px)',
                      },
                      ...(revisionType === item.type && {
                        '&::before': {
                          border: `1.5px solid ${getRevisionTypeColor(item.type)}`,
                        },
                      }),
                    },
                    
                    '&:active': item.disabled ? {} : {
                      backgroundColor: revisionType === item.type 
                        ? `${getRevisionTypeColor(item.type)}20`
                        : `${getRevisionTypeColor(item.type)}12`,
                      transform: 'translateY(0)',
                      transition: 'all 0.1s ease',
                    },
                  }}
                  onClick={() => !item.disabled && setRevisionType(item.type)}
                >
                  <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 3,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: `${getRevisionTypeColor(item.type)}15`,
                          color: getRevisionTypeColor(item.type),
                          flexShrink: 0,
                        }}
                      >
                        {item.icon}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="subtitle1" fontWeight={600} color="#2a0f35">
                            {item.title}
                          </Typography>
                          {item.disabled && (
                            <Chip
                              label="Только OWNER"
                              size="small"
                              sx={{
                                backgroundColor: 'rgba(244, 67, 54, 0.1)',
                                color: '#f44336',
                                fontSize: '0.65rem',
                                height: 20,
                              }}
                            />
                          )}
                          {revisionType === item.type && (
                            <CheckCircleIcon sx={{ fontSize: 18, color: getRevisionTypeColor(item.type), ml: 'auto' }} />
                          )}
                        </Box>
                        <Typography variant="body2" color="#4c5454">
                          {item.description}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Box>
        );
      
      case 1:
        return (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: `${getRevisionTypeColor(revisionType)}15`,
                  color: getRevisionTypeColor(revisionType),
                }}
              >
                {getRevisionTypeIcon(revisionType)}
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={600} color="#2a0f35">
                  {getRevisionTypeText(revisionType)}
                </Typography>
                <Typography variant="caption" color="#4c5454">
                  Выберите цель ревизии
                </Typography>
              </Box>
            </Box>
            
            {revisionType === RevisionType.USER && (
              <FormControl fullWidth>
                <Autocomplete
                  options={sortedUsers}
                  getOptionLabel={(option) => option.fullName}
                  loading={loading}
                  loadingText="Загрузка..."
                  noOptionsText="Пользователи не найдены"
                  groupBy={(option) => getRoleName(option.role)}
                  filterOptions={(options, { inputValue }) => 
                    options.filter(option => 
                      option.fullName.toLowerCase().includes(inputValue.toLowerCase()) ||
                      getRoleName(option.role).toLowerCase().includes(inputValue.toLowerCase())
                    )
                  }
                  value={users.find(u => u.id === selectedUserId) || null}
                  onChange={(_, newValue) => {
                    setSelectedUserId(newValue?.id || null);
                  }}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  slotProps={{
                    paper: {
                      sx: {
                        borderRadius: 6,
                        mt: 1,
                        boxShadow: '0 8px 24px rgba(106, 61, 122, 0.12)',
                        border: '1px solid rgba(103, 79, 182, 0.08)',
                        overflow: 'hidden',
                        '& .MuiAutocomplete-listbox': {
                          '& .MuiAutocomplete-option': {
                            transition: 'all 0.15s ease',
                            borderRadius: 3,
                            mx: 1,
                            my: 0.25,
                            '&:hover': {
                              backgroundColor: 'rgba(103, 79, 182, 0.06)',
                            },
                            '&.Mui-focused': {
                              backgroundColor: 'rgba(103, 79, 182, 0.08) !important',
                            },
                          },
                        },
                      },
                    },
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Пользователь *"
                      placeholder="Начните вводить имя или роль..."
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 4,
                          backgroundColor: '#f8f7fa',
                          '&:hover': {
                            backgroundColor: '#f3f1f5',
                          },
                          '&.Mui-focused': {
                            backgroundColor: '#ffffff',
                          },
                        },
                        '& .MuiInputBase-input': {
                          fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' },
                        },
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Box sx={{ py: 1 }}>
                        <Typography 
                          variant="body2" 
                          fontWeight={500}
                          sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                        >
                          {option.fullName}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="#4c5454"
                          sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
                        >
                          {getRoleName(option.role)}
                          {option.cityName && ` • ${option.cityName}`}
                        </Typography>
                      </Box>
                    </li>
                  )}
                  renderGroup={(params) => (
                    <li key={params.key}>
                      <Box sx={{ 
                        px: 2.5, 
                        py: 1.5, 
                        backgroundColor: '#f8f7fa',
                        borderBottom: '1px solid rgba(103, 79, 182, 0.08)',
                        borderTop: '1px solid rgba(103, 79, 182, 0.08)',
                      }}>
                        <Typography variant="caption" fontWeight={600} color="#674fb6" sx={{ letterSpacing: '0.3px' }}>
                          {params.group}
                        </Typography>
                      </Box>
                      <ul style={{ padding: 0, margin: 0 }}>{params.children}</ul>
                    </li>
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      const { key, ...tagProps } = getTagProps({ index });
                      return (
                        <Chip
                          key={key}
                          {...tagProps}
                          label={option.fullName}
                          sx={{
                            maxWidth: '100%',
                            '& .MuiChip-label': {
                              fontSize: { xs: '0.75rem', sm: '0.875rem' },
                              px: 1,
                            },
                          }}
                        />
                      );
                    })
                  }
                />
              </FormControl>
            )}
            
            {revisionType === RevisionType.GROUP && (
              <FormControl fullWidth>
                <InputLabel>Группа *</InputLabel>
                <Select
                  value={selectedGroupId}
                  label="Группа *"
                  onChange={(e: SelectChangeEvent<number | ''>) => setSelectedGroupId(e.target.value as number)}
                  MenuProps={{ disableScrollLock: true }}
                  sx={{
                    borderRadius: 4,
                    backgroundColor: '#f8f7fa',
                    '&:hover': { backgroundColor: '#f3f1f5' },
                    '&.Mui-focused': { backgroundColor: '#ffffff' },
                    '& .MuiSelect-select': {
                      WebkitTapHighlightColor: 'transparent',
                    },
                  }}
                >
                  <MenuItem value="">
                    <em>Выберите группу</em>
                  </MenuItem>
                  {groups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {group.name}
                        </Typography>
                        {group.mentorName && (
                          <Typography variant="caption" color="#4c5454">
                            Наставник: {group.mentorName}
                          </Typography>
                        )}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            
            {revisionType === RevisionType.CLUSTER && (
              <FormControl fullWidth>
                <InputLabel>Куст *</InputLabel>
                <Select
                  value={selectedClusterId}
                  label="Куст *"
                  onChange={(e: SelectChangeEvent<number | ''>) => setSelectedClusterId(e.target.value as number)}
                  MenuProps={{ disableScrollLock: true }}
                  sx={{
                    borderRadius: 4,
                    backgroundColor: '#f8f7fa',
                    '&:hover': { backgroundColor: '#f3f1f5' },
                    '&.Mui-focused': { backgroundColor: '#ffffff' },
                    '& .MuiSelect-select': {
                      WebkitTapHighlightColor: 'transparent',
                    },
                  }}
                >
                  <MenuItem value="">
                    <em>Выберите куст</em>
                  </MenuItem>
                  {clusters.map((cluster) => (
                    <MenuItem key={cluster.id} value={cluster.id}>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {cluster.name}
                        </Typography>
                        {cluster.seniorSellerName && (
                          <Typography variant="caption" color="#4c5454">
                            Старший продавец: {cluster.seniorSellerName}
                          </Typography>
                        )}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            
            {revisionType === RevisionType.CITY && (
              <FormControl fullWidth>
                <InputLabel>Город *</InputLabel>
                <Select
                  value={selectedCity}
                  label="Город *"
                  onChange={(e: SelectChangeEvent<string>) => setSelectedCity(e.target.value)}
                  MenuProps={{ disableScrollLock: true }}
                  sx={{
                    borderRadius: 4,
                    backgroundColor: '#f8f7fa',
                    '&:hover': { backgroundColor: '#f3f1f5' },
                    '&.Mui-focused': { backgroundColor: '#ffffff' },
                    '& .MuiSelect-select': {
                      WebkitTapHighlightColor: 'transparent',
                    },
                  }}
                >
                  <MenuItem value="">
                    <em>Выберите город</em>
                  </MenuItem>
                  {cities.map((city) => (
                    <MenuItem key={city} value={city}>
                      {city}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            
            {revisionType === RevisionType.GENERAL && (
              <Alert 
                severity="info" 
                sx={{ 
                  borderRadius: 4,
                  backgroundColor: 'rgba(33, 150, 243, 0.08)',
                  border: '1px solid rgba(33, 150, 243, 0.2)',
                  color: '#1976d2',
                  '& .MuiAlert-icon': { color: '#1976d2' },
                }}
              >
                Общая ревизия будет отправлена всем продавцам системы
              </Alert>
            )}

            {(revisionType === RevisionType.USER && users.length === 0) ||
             (revisionType === RevisionType.GROUP && groups.length === 0) ||
             (revisionType === RevisionType.CLUSTER && clusters.length === 0) ||
             (revisionType === RevisionType.CITY && cities.length === 0) ? (
              <Alert severity="warning" sx={{ mt: 2, borderRadius: 4 }}>
                Нет доступных целей для выбранного типа ревизии
              </Alert>
            ) : null}
          </Box>
        );
      
      case 2:
        return (
          <Box>
            <Typography variant="body2" color="#4c5454" sx={{ mb: 3 }}>
              Проверьте данные перед отправкой запроса
            </Typography>
            
            <Card sx={{ 
              borderRadius: 4, 
              backgroundColor: 'rgba(63, 31, 75, 0.04)',
              border: '1px solid rgba(63, 31, 75, 0.1)',
              mb: 3,
            }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle2" color="#2a0f35" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleIcon sx={{ color: '#3f1f4b', fontSize: 20 }} />
                  Сводка ревизии
                </Typography>
                
                <Divider sx={{ my: 2, borderColor: 'rgba(63, 31, 75, 0.1)' }} />
                
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: `${getRevisionTypeColor(revisionType)}15`,
                        color: getRevisionTypeColor(revisionType),
                      }}
                    >
                      {getRevisionTypeIcon(revisionType)}
                    </Box>
                    <Box>
                      <Typography variant="caption" color="#4c5454" display="block">
                        Тип ревизии
                      </Typography>
                      <Typography variant="body1" fontWeight={600} color="#2a0f35">
                        {getRevisionTypeText(revisionType)}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {(revisionType === RevisionType.USER && selectedUserId) && (
                    <Box>
                      <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                        Пользователь
                      </Typography>
                      <Typography variant="body1" fontWeight={500} color="#2a0f35">
                        {users.find(u => u.id === selectedUserId)?.fullName}
                      </Typography>
                      <Typography variant="caption" color="#4c5454">
                        {getRoleName(users.find(u => u.id === selectedUserId)?.role || UserRole.SELLER)}
                        {users.find(u => u.id === selectedUserId)?.cityName && 
                          ` • ${users.find(u => u.id === selectedUserId)?.cityName}`}
                      </Typography>
                    </Box>
                  )}
                  
                  {(revisionType === RevisionType.GROUP && selectedGroupId) && (
                    <Box>
                      <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                        Группа
                      </Typography>
                      <Typography variant="body1" fontWeight={500} color="#2a0f35">
                        {groups.find(g => g.id === selectedGroupId)?.name}
                      </Typography>
                      {groups.find(g => g.id === selectedGroupId)?.mentorName && (
                        <Typography variant="caption" color="#4c5454">
                          Наставник: {groups.find(g => g.id === selectedGroupId)?.mentorName}
                        </Typography>
                      )}
                    </Box>
                  )}
                  
                  {(revisionType === RevisionType.CLUSTER && selectedClusterId) && (
                    <Box>
                      <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                        Куст
                      </Typography>
                      <Typography variant="body1" fontWeight={500} color="#2a0f35">
                        {clusters.find(c => c.id === selectedClusterId)?.name}
                      </Typography>
                      {clusters.find(c => c.id === selectedClusterId)?.seniorSellerName && (
                        <Typography variant="caption" color="#4c5454">
                          Старший продавец: {clusters.find(c => c.id === selectedClusterId)?.seniorSellerName}
                        </Typography>
                      )}
                    </Box>
                  )}
                  
                  {(revisionType === RevisionType.CITY && selectedCity) && (
                    <Box>
                      <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                        Город
                      </Typography>
                      <Typography variant="body1" fontWeight={500} color="#2a0f35">
                        {selectedCity}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
            
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Комментарий"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Укажите причину ревизии или дополнительные инструкции (необязательно)..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 4,
                  backgroundColor: '#f8f7fa',
                  '&:hover': { backgroundColor: '#f3f1f5' },
                  '&.Mui-focused': { backgroundColor: '#ffffff' },
                },
              }}
            />
          </Box>
        );
      
      default:
        return null;
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f3f6', 
      pt: { xs: 4, md: 8 },
      pb: 4,
    }}>
      <Container 
        maxWidth="md" 
        sx={{ 
          px: { xs: 1, sm: 2, md: 3 },
        }}
      >
        <Paper
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 8,
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
            width: '100%',
          }}
        >
          <Typography variant="h5" gutterBottom color="#2a0f35" fontWeight={600} sx={{ mb: 1 }}>
            Запрос ревизии
          </Typography>
          
          <Typography variant="h6" color="#2a0f35" fontWeight={500} sx={{ mb: 3 }}>
            {step === 0 && 'Выберите тип ревизии'}
            {step === 1 && 'Выберите цель ревизии'}
            {step === 2 && 'Подтверждение'}
          </Typography>

          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: 4,
                backgroundColor: 'rgba(202, 14, 192, 0.08)',
                border: '1px solid rgba(202, 14, 192, 0.2)',
                color: '#ca0ec0',
                '& .MuiAlert-icon': { color: '#ca0ec0' },
              }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {loading && step === 0 ? (
            <Box display="flex" justifyContent="center" sx={{ py: 6 }}>
              <CircularProgress sx={{ color: '#674fb6' }} />
            </Box>
          ) : (
            getStepContent(step)
          )}

          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between', 
            gap: 2,
            mt: 4,
          }}>
            {step > 0 ? (
              <Button
                variant="outlined"
                onClick={handleBack}
                disabled={loading}
                fullWidth={isMobile}
                startIcon={<ArrowBackIcon />}
                sx={{
                  borderRadius: 4,
                  borderColor: '#d8d1e0',
                  color: '#674fb6',
                  order: { xs: 2, sm: 1 },
                  '&:hover': {
                    borderColor: '#674fb6',
                    backgroundColor: 'rgba(103, 79, 182, 0.04)',
                  },
                }}
              >
                Назад
              </Button>
            ) : (
              <Button
                variant="outlined"
                onClick={handleExitClick}
                fullWidth={isMobile}
                sx={{
                  borderRadius: 4,
                  borderColor: '#d8d1e0',
                  color: '#ca0ec0',
                  order: { xs: 2, sm: 1 },
                  '&:hover': {
                    borderColor: '#ca0ec0',
                    backgroundColor: 'rgba(202, 14, 192, 0.04)',
                  },
                }}
              >
                Выйти
              </Button>
            )}
            
            {step === 2 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                fullWidth={isMobile}
                startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                sx={{
                  borderRadius: 4,
                  backgroundColor: '#3f1f4b',
                  order: { xs: 1, sm: 2 },
                  '&:hover': { backgroundColor: '#2a0f35' },
                }}
              >
                {loading ? 'Отправка...' : 'Запросить ревизию'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                fullWidth={isMobile}
                endIcon={<ArrowForwardIcon />}
                sx={{
                  borderRadius: 4,
                  backgroundColor: '#674fb6',
                  order: { xs: 1, sm: 2 },
                  '&:hover': { backgroundColor: '#483399' },
                }}
              >
                Далее
              </Button>
            )}
          </Box>
        </Paper>
      </Container>

      {/* Диалог подтверждения выхода */}
      <Dialog
        open={exitDialog}
        onClose={() => setExitDialog(false)}
        PaperProps={{
          sx: {
            borderRadius: 4,
            maxWidth: { xs: '90%', sm: 450 },
            width: '100%',
            m: 2,
          },
        }}
      >
        <DialogTitle sx={{ p: 2.5, pb: 1 }}>
          <Typography variant="h6" color="#2a0f35" fontWeight={600}>
            Прервать создание ревизии?
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 2.5, pt: 2 }}>
          <Typography variant="body1" color="#4c5454">
            Внесенные данные не сохранятся. Вы уверены, что хотите выйти?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1, gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Button
            onClick={() => setExitDialog(false)}
            sx={{
              borderRadius: 4,
              color: '#4c5454',
              px: 3,
              py: 1,
              textTransform: 'none',
              fontSize: { xs: '0.85rem', sm: '0.95rem' },
              fontWeight: 500,
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            Продолжить
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setExitDialog(false);
              navigate('/revisions');
            }}
            sx={{
              borderRadius: 4,
              backgroundColor: '#ca0ec0',
              '&:hover': { backgroundColor: '#950090' },
              px: 3,
              py: 1,
              textTransform: 'none',
              fontSize: { xs: '0.85rem', sm: '0.95rem' },
              fontWeight: 500,
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            Выйти
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RequestRevisionPage;