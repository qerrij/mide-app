import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
} from '@mui/material';
import { ArrowBack, ArrowForward, Send } from '@mui/icons-material';
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
} from '../../types';
import { assignmentsService } from '../../api/assignmentsService';

const RequestRevisionPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
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
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [selectedGroupId, setSelectedGroupId] = useState<number | ''>('');
  const [selectedClusterId, setSelectedClusterId] = useState<number | ''>('');
  const [selectedCity, setSelectedCity] = useState<string>('');

  // Загрузка данных в зависимости от роли пользователя

// RequestRevisionPage.tsx - исправленный useEffect
useEffect(() => {
  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Теперь бекенд сам фильтрует данные по роли пользователя
      const [usersData, groupsData, clustersData] = await Promise.all([
        userService.getAllUsers(),
        groupService.getAllGroups(),
        clusterService.getAllClusters()
      ]);
      
      // Для не-OWNER ролей, бекенд уже вернул только доступных пользователей
      // Но все равно фильтруем OWNER и ADMIN для запроса ревизии
      setUsers(usersData.filter(u => 
        u.role !== UserRole.OWNER && 
        u.role !== UserRole.ADMIN
      ));
      
      setGroups(groupsData);
      setClusters(clustersData);
      
      // Собираем уникальные города
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
}, [user]);

  // Проверка, может ли пользователь запросить общую ревизию
  const canRequestGeneralRevision = user?.role === UserRole.OWNER;

  const handleNext = () => {
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const revisionData: any = {
        type: revisionType,
        comment: comment || undefined,
      };
      
      // Устанавливаем target в зависимости от типа
      switch (revisionType) {
        case RevisionType.USER:
          if (!selectedUserId) {
            throw new Error('Выберите пользователя');
          }
          revisionData.targetUserId = selectedUserId;
          break;
        case RevisionType.GROUP:
          if (!selectedGroupId) {
            throw new Error('Выберите группу');
          }
          revisionData.targetGroupId = selectedGroupId;
          break;
        case RevisionType.CLUSTER:
          if (!selectedClusterId) {
            throw new Error('Выберите куст');
          }
          revisionData.targetClusterId = selectedClusterId;
          break;
        case RevisionType.CITY:
          if (!selectedCity) {
            throw new Error('Выберите город');
          }
          revisionData.targetCity = selectedCity;
          break;
        // Для GENERAL не нужны дополнительные поля
      }
      
      await revisionService.requestRevision(revisionData);
      setSuccess(true);
      
      // Перенаправляем через 2 секунды
      setTimeout(() => {
        navigate('/revisions');
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || 'Ошибка при создании ревизии');
    } finally {
      setLoading(false);
    }
  };

  const steps = ['Выбор типа', 'Выбор цели', 'Дополнительно'];

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Typography variant="h6" gutterBottom color="#2a0f35">
                Выберите тип ревизии
              </Typography>
              <Typography variant="body2" color="#4c5454" sx={{ mb: 3 }}>
                Тип определяет, кто будет заполнять ревизию
              </Typography>
            </Grid>
            
            {[
              { 
                type: RevisionType.USER, 
                title: 'Пользователь', 
                description: 'Ревизия конкретного продавца' 
              },
              { 
                type: RevisionType.GROUP, 
                title: 'Группа', 
                description: 'Ревизия всех продавцов в группе' 
              },
              { 
                type: RevisionType.CLUSTER, 
                title: 'Куст', 
                description: 'Ревизия всех продавцов в кусте' 
              },
              { 
                type: RevisionType.CITY, 
                title: 'Город', 
                description: 'Ревизия всех продавцов в городе' 
              },
              { 
                type: RevisionType.GENERAL, 
                title: 'Общая', 
                description: 'Ревизия всех продавцов системы',
                disabled: !canRequestGeneralRevision
              },
            ].map((item) => (
              <Grid size={{ xs: 12, sm: 6 }} key={item.type}>
                <Card
                  sx={{
                    cursor: item.disabled ? 'not-allowed' : 'pointer',
                    border: revisionType === item.type ? '2px solid #2196f3' : '1px solid #e0e0e0',
                    backgroundColor: revisionType === item.type ? '#2196f310' : 
                                   item.disabled ? '#f5f5f5' : 'white',
                    opacity: item.disabled ? 0.6 : 1,
                    '&:hover': item.disabled ? {} : {
                      borderColor: '#2196f3',
                      backgroundColor: '#2196f310',
                    },
                  }}
                  onClick={() => !item.disabled && setRevisionType(item.type)}
                >
                  <CardContent>
                    <Typography 
                      variant="subtitle1" 
                      sx={{ 
                        color: item.disabled ? '#9e9e9e' : '#2a0f35', 
                        mb: 1 
                      }}
                    >
                      {item.title}
                      {item.disabled && (
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: '#f44336', 
                            ml: 1 
                          }}
                        >
                          (только для владельца)
                        </Typography>
                      )}
                    </Typography>
                    <Typography variant="body2" color={item.disabled ? '#9e9e9e' : '#4c5454'}>
                      {item.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        );
      
      case 1:
        return (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Typography variant="h6" gutterBottom color="#2a0f35">
                Выберите цель ревизии
              </Typography>
            </Grid>
            
            {revisionType === RevisionType.USER && (
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>Пользователь</InputLabel>
                  <Select
                    value={selectedUserId}
                    label="Пользователь"
                    onChange={(e) => setSelectedUserId(e.target.value as number)}
                  >
                    <MenuItem value="">Выберите пользователя</MenuItem>
                    {users.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.fullName} ({user.username})
                        {user.role && ` - ${user.role}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {users.length === 0 && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Нет доступных пользователей для ревизии
                  </Alert>
                )}
              </Grid>
            )}
            
            {revisionType === RevisionType.GROUP && (
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>Группа</InputLabel>
                  <Select
                    value={selectedGroupId}
                    label="Группа"
                    onChange={(e) => setSelectedGroupId(e.target.value as number)}
                  >
                    <MenuItem value="">Выберите группу</MenuItem>
                    {groups.map((group) => (
                      <MenuItem key={group.id} value={group.id}>
                        {group.name}
                        {group.mentorName && ` (Наставник: ${group.mentorName})`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {groups.length === 0 && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Нет доступных групп для ревизии
                  </Alert>
                )}
              </Grid>
            )}
            
            {revisionType === RevisionType.CLUSTER && (
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>Куст</InputLabel>
                  <Select
                    value={selectedClusterId}
                    label="Куст"
                    onChange={(e) => setSelectedClusterId(e.target.value as number)}
                  >
                    <MenuItem value="">Выберите куст</MenuItem>
                    {clusters.map((cluster) => (
                      <MenuItem key={cluster.id} value={cluster.id}>
                        {cluster.name}
                        {cluster.seniorSellerName && ` (Старший: ${cluster.seniorSellerName})`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {clusters.length === 0 && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Нет доступных кустов для ревизии
                  </Alert>
                )}
              </Grid>
            )}
            
            {revisionType === RevisionType.CITY && (
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>Город</InputLabel>
                  <Select
                    value={selectedCity}
                    label="Город"
                    onChange={(e) => setSelectedCity(e.target.value)}
                  >
                    <MenuItem value="">Выберите город</MenuItem>
                    {cities.map((city) => (
                      <MenuItem key={city} value={city}>
                        {city}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {cities.length === 0 && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Нет доступных городов для ревизии
                  </Alert>
                )}
              </Grid>
            )}
            
            {revisionType === RevisionType.GENERAL && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="info">
                  Общая ревизия будет отправлена всем продавцам системы
                </Alert>
              </Grid>
            )}
          </Grid>
        );
      
      case 2:
        return (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Typography variant="h6" gutterBottom color="#2a0f35">
                Дополнительная информация
              </Typography>
            </Grid>
            
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Комментарий (необязательно)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Укажите причину ревизии или дополнительные инструкции..."
              />
            </Grid>
            
            <Grid size={{ xs: 12 }}>
              <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                <Typography variant="subtitle2" gutterBottom color="#2a0f35">
                  Сводка ревизии
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="body2">
                    <strong>Тип:</strong> {getRevisionTypeText(revisionType)}
                  </Typography>
                  {revisionType === RevisionType.USER && selectedUserId && (
                    <Typography variant="body2">
                      <strong>Пользователь:</strong> {users.find(u => u.id === selectedUserId)?.fullName}
                    </Typography>
                  )}
                  {revisionType === RevisionType.GROUP && selectedGroupId && (
                    <Typography variant="body2">
                      <strong>Группа:</strong> {groups.find(g => g.id === selectedGroupId)?.name}
                    </Typography>
                  )}
                  {revisionType === RevisionType.CLUSTER && selectedClusterId && (
                    <Typography variant="body2">
                      <strong>Куст:</strong> {clusters.find(c => c.id === selectedClusterId)?.name}
                    </Typography>
                  )}
                  {revisionType === RevisionType.CITY && selectedCity && (
                    <Typography variant="body2">
                      <strong>Город:</strong> {selectedCity}
                    </Typography>
                  )}
                  {comment && (
                    <Typography variant="body2">
                      <strong>Комментарий:</strong> {comment}
                    </Typography>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        );
      
      default:
        return 'Неизвестный шаг';
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/revisions')}
          sx={{ mb: 2 }}
        >
          Назад к ревизиям
        </Button>
        
        <Typography variant="h4" component="h1" gutterBottom color="#2a0f35">
          Запрос ревизии
        </Typography>
        
        <Stepper activeStep={step} sx={{ mt: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Ревизия успешно запрошена! Вы будете перенаправлены на страницу ревизий...
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" sx={{ py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          getStepContent(step)
        )}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          disabled={step === 0 || loading}
          onClick={handleBack}
          startIcon={<ArrowBack />}
        >
          Назад
        </Button>
        
        <Box>
          {step === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Send />}
              sx={{
                backgroundColor: '#2196f3',
                '&:hover': { backgroundColor: '#1976d2' },
              }}
            >
              {loading ? 'Отправка...' : 'Запросить ревизию'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
              endIcon={<ArrowForward />}
              sx={{
                backgroundColor: '#2196f3',
                '&:hover': { backgroundColor: '#1976d2' },
              }}
            >
              Далее
            </Button>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default RequestRevisionPage;