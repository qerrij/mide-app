import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  Card,
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Fab,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  PhotoCamera as PhotoCameraIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  LocationCity as CityIcon,
  Home as ClusterIcon,
  Public as PublicIcon,
  People as PeopleIcon,
  ExpandMore as ExpandMoreIcon,
  Photo as PhotoIcon,
  Inventory as InventoryIcon,
  Edit as EditIcon,
  CalendarToday as CalendarIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  Verified as VerifiedIcon,
  LocationCity,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { PhotoViewer } from '../../components/PhotoViewer';
import { useAuth } from '../../contexts/AuthContext';
import { revisionService } from '../../api/revisionService';
import {
  Revision,
  RevisionStatus,
  getRevisionStatusText,
  getRevisionTypeText,
  getRevisionStatusColor,
  RevisionFilling,
  isGroupRevision,
  getTargetName as getTargetNameHelper,
} from '../../types';

const ViewRevisionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState<Revision | null>(null);
  const [userFilling, setUserFilling] = useState<RevisionFilling | null>(null);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{ photos: string[], index: number } | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<number[]>([]);

  // Загрузка данных ревизии
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!id) {
          throw new Error('ID ревизии не указан');
        }
        
        const revisionId = parseInt(id);
        const revisionData = await revisionService.getRevisionById(revisionId);
        setRevision(revisionData);
        
        const isOwner = revisionData.requestedById === user?.id;
        const isGroupRev = isGroupRevision(revisionData.type);
        
        if (!isOwner || !isGroupRev) {
          const myFilling = await revisionService.getMyFilling(revisionId);
          setUserFilling(myFilling);
          
          if (myFilling) {
            setRevision({
              ...revisionData,
              fillings: [myFilling],
              totalFilled: 1,
              totalUsers: 1,
            });
          }
        }
        
      } catch (err: any) {
        setError(err.message || 'Ошибка при загрузке ревизии');
        console.error('Error loading revision:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [id, user]);

  const isOwner = revision?.requestedById === user?.id;
  const isGroupRev = revision ? isGroupRevision(revision.type) : false;
  
  const getTargetName = (revision: Revision): string => {
    return getTargetNameHelper(revision);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'USER':
        return <PersonIcon sx={{ fontSize: 18 }} />;
      case 'GROUP':
        return <GroupIcon sx={{ fontSize: 18 }} />;
      case 'CLUSTER':
        return <ClusterIcon sx={{ fontSize: 18 }} />;
      case 'CITY':
        return <CityIcon sx={{ fontSize: 18 }} />;
      case 'GENERAL':
        return <PublicIcon sx={{ fontSize: 18 }} />;
      default:
        return <PersonIcon sx={{ fontSize: 18 }} />;
    }
  };

  const formatDate = (date?: Date): string => {
    if (!date) return 'Не указано';
    return new Date(date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date): string => {
    return new Date(date).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateTime = (date?: Date): string => {
    if (!date) return 'Не указано';
    return `${formatDate(date)} в ${formatTime(date)}`;
  };

  const handleViewPhoto = (photos: string[], index: number) => {
    setSelectedPhoto({ photos, index });
    setShowPhotoDialog(true);
  };

  const handleAccordionChange = (userId: number) => {
    setExpandedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const canVerifyRevision = isOwner && revision?.status === RevisionStatus.COMPLETED;

  const hasUserFilledRevision = (): boolean => {
    if (!user || !revision) return false;
    return revision.fillings?.some(f => f.userId === user.id && f.isCompleted) || false;
  };

  // Получение ожидаемого количества из расхождений
  const getExpectedQuantity = (userId: number, productId: number): number => {
    if (!revision?.discrepancies) return 0;
    const discrepancy = revision.discrepancies.find(
      d => d.userId === userId && d.productId === productId
    );
    return discrepancy?.expectedQuantity || 0;
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: '#f5f3f6',
          py: 4,
        }}
      >
        <Container maxWidth="lg">
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <CircularProgress sx={{ color: '#674fb6' }} />
          </Box>
        </Container>
      </Box>
    );
  }

  if (!revision) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: '#f5f3f6',
          py: 4,
        }}
      >
        <Container maxWidth="lg">
          <Alert 
            severity="error" 
            sx={{ 
              borderRadius: 8,
              backgroundColor: 'rgba(202, 14, 192, 0.08)',
              border: '1px solid rgba(202, 14, 192, 0.2)',
              color: '#ca0ec0',
              '& .MuiAlert-icon': {
                color: '#ca0ec0',
              }
            }}
          >
            Ревизия не найдена
          </Alert>
        </Container>
      </Box>
    );
  }

  const completedFillings = revision.fillings?.filter(f => f.isCompleted) || [];
  const isRevisionVerified = revision.status === RevisionStatus.VERIFIED;
  const userHasFilled = hasUserFilledRevision();

  // Функция для расчета общего расхождения
  const calculateTotalDiscrepancy = () => {
    if (!revision.discrepancies || revision.discrepancies.length === 0) return 0;
    
    const nonZeroDiscrepancies = revision.discrepancies.filter(d => d.discrepancy !== 0);
    return nonZeroDiscrepancies.reduce((sum, d) => sum + d.discrepancy, 0);
  };

  const totalDiscrepancy = calculateTotalDiscrepancy();
  const isPositiveTotal = totalDiscrepancy > 0;
  const isNegativeTotal = totalDiscrepancy < 0;

  return (
    <Box sx={{ minHeight: '100vh', py: 3, position: 'relative'}}>
      {/* Плавающая кнопка назад для мобильных устройств */}
      {isMobile && (
        <Fab
          onClick={() => navigate('/revisions')}
          sx={{
            position: 'fixed',
            top: 64,
            left: 16,
            zIndex: 1000,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
            '&:hover': { 
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
            },
            width: 44,
            height: 44,
            mt: 1,
          }}
        >
          <ArrowBackIcon sx={{ 
            color: 'rgba(103, 79, 182, 0.8)',
            fontSize: 22 
          }} />
        </Fab>
      )}

      <Container maxWidth="lg" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
        {/* Кнопка назад для десктопа */}
        {!isMobile && (
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/revisions')}
            sx={{
              borderRadius: 8,
              color: '#674fb6',
              textTransform: 'none',
              fontSize: '0.9rem',
              mb: 3,
              px: 2,
              py: 1,
              border: '1px solid rgba(103, 79, 182, 0.2)',
              '&:hover': { 
                backgroundColor: 'rgba(103, 79, 182, 0.04)',
                border: '1px solid rgba(103, 79, 182, 0.3)',
              },
              position: 'relative',
              zIndex: 1,
            }}
          >
            Назад к ревизиям
          </Button>
        )}

        {/* Для мобилок добавляем отступ сверху для кнопки */}
        {isMobile && <Box sx={{ height: 16, mb: 2 }} />}

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3, 
              borderRadius: 8,
              backgroundColor: 'rgba(202, 14, 192, 0.08)',
              border: '1px solid rgba(202, 14, 192, 0.2)',
              color: '#ca0ec0',
              '& .MuiAlert-icon': {
                color: '#ca0ec0',
              }
            }}
          >
            {error}
          </Alert>
        )}

        {/* Шапка с основной информацией */}
        <Card 
          sx={{ 
            p: { xs: 2, sm: 2.5 },
            mb: 3,
            borderRadius: 8,
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
          }}
        >
          <Box sx={{ mb: 2 }}>
            <Typography variant="h5" component="h1" color="#2a0f35" fontWeight={600} gutterBottom>
              Ревизия #{revision.id}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {getTypeIcon(revision.type)}
                <Typography variant="body2" color="#674fb6" fontWeight={500}>
                  {getRevisionTypeText(revision.type)}
                </Typography>
              </Box>
              <Chip
                label={getRevisionStatusText(revision.status)}
                size="small"
                sx={{
                  backgroundColor: `${getRevisionStatusColor(revision.status)}15`,
                  color: getRevisionStatusColor(revision.status),
                  fontWeight: 500,
                  borderRadius: 6,
                  fontSize: '0.7rem',
                }}
              />
              {!isOwner && userHasFilled && (
                <Chip
                  label="Заполнено вами"
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(63, 31, 75, 0.1)',
                    color: '#3f1f4b',
                    borderRadius: 6,
                    fontSize: '0.7rem',
                  }}
                />
              )}
              {isOwner && isGroupRev && revision.totalFilled !== undefined && revision.totalUsers !== undefined && (
                <Chip
                  icon={<PeopleIcon sx={{ fontSize: 14 }} />}
                  label={`${revision.totalFilled}/${revision.totalUsers}`}
                  size="small"
                  sx={{
                    backgroundColor: '#f5f3f6',
                    color: '#56b8d1',
                    borderRadius: 6,
                    fontSize: '0.7rem',
                  }}
                />
              )}
            </Box>
          </Box>

          <Stack spacing={2}>
            <Grid container spacing={2}>
              {/* Запрос */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Avatar
                    sx={{ 
                      width: 36, 
                      height: 36, 
                      bgcolor: '#674fb6',
                      flexShrink: 0,
                      fontSize: '0.9rem',
                    }}
                  >
                    {revision.requestedByName?.charAt(0) || 'П'}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                      Запросил
                    </Typography>
                    <Typography variant="body2" color="#2a0f35" fontWeight={500}>
                      {revision.requestedByName || `Пользователь ${revision.requestedById}`}
                    </Typography>
                    <Typography variant="caption" color="#4c5454">
                      {formatDateTime(revision.requestedAt)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              
              {/* Цель ревизии */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ pl: { xs: 0, sm: 0.5 } }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1.5,
                    mb: 0.5 
                  }}>
                    <Box sx={{ 
                      width: 36, 
                      height: 36, 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <LocationCity sx={{ 
                        fontSize: 20, 
                        color: '#4c5454',
                        opacity: 0.7 
                      }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                        Цель ревизии
                      </Typography>
                      <Typography variant="body2" color="#2a0f35" fontWeight={500}>
                        {getTargetName(revision)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Grid>
            </Grid>

            {/* Комментарий */}
            {revision.comment && (
              <Box>
                <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                  Комментарий
                </Typography>
                <Typography variant="body2" color="#2a0f35" sx={{ whiteSpace: 'pre-wrap' }}>
                  {revision.comment}
                </Typography>
              </Box>
            )}

            {/* Комментарий проверки */}
            {revision.verificationComment && (
              <Box>
                <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                  Комментарий проверки
                </Typography>
                <Typography variant="body2" color="#2a0f35" sx={{ whiteSpace: 'pre-wrap' }}>
                  {revision.verificationComment}
                </Typography>
              </Box>
            )}
          </Stack>
        </Card>

        {/* Блок статуса ревизии */}
        <Card 
          sx={{ 
            p: { xs: 2, sm: 2.5 },
            mb: 3,
            borderRadius: 8,
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Фоновый слой для проверенных ревизий */}
          {isRevisionVerified && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: isPositiveTotal 
                  ? 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)'
                  : isNegativeTotal
                    ? 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)'
                    : 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                opacity: 0.7,
                zIndex: 0,
              }}
            />
          )}

          <Box sx={{ 
            position: 'relative', 
            zIndex: 1, 
            py: { xs: 2, sm: 3 },
            px: { xs: 2, sm: 4 },
          }}>
            {isRevisionVerified ? (
              <Box>
                {totalDiscrepancy === 0 ? (
                  <>
                    <Typography variant="body2" color="#4c5454" gutterBottom>
                      Ревизия сбалансирована
                    </Typography>
                    <Typography 
                      variant="h1" 
                      color="#2e7d32"
                      sx={{ 
                        fontWeight: 'bold', 
                        my: 1,
                        fontSize: { xs: '3rem', sm: '4rem' }
                      }}
                    >
                      0
                    </Typography>
                    <Typography variant="caption" color="#4c5454">
                      Расхождений не обнаружено
                    </Typography>
                  </>
                ) : (
                  <>
                    <Typography variant="body2" color="#4c5454" gutterBottom>
                      {totalDiscrepancy > 0 ? 'Ревизия в плюсе' : 'Ревизия в минусе'}
                    </Typography>
                    <Typography 
                      variant="h1" 
                      color={totalDiscrepancy > 0 ? '#1976d2' : '#d32f2f'}
                      sx={{ 
                        fontWeight: 'bold', 
                        my: 1,
                        fontSize: { xs: '3rem', sm: '4rem' }
                      }}
                    >
                      {totalDiscrepancy > 0 ? '+' : ''}{totalDiscrepancy}
                    </Typography>
                    <Typography variant="caption" color="#4c5454">
                      {totalDiscrepancy > 0 ? 'Обнаружен излишек' : 'Обнаружена недостача'}
                    </Typography>
                  </>
                )}
              </Box>
            ) : (
              <Box>
                <Typography variant="body2" color="#4c5454" gutterBottom>
                  {revision.status === RevisionStatus.COMPLETED 
                    ? 'Ревизия заполнена всеми участниками'
                    : 'Статус ревизии'}
                </Typography>
                <Typography 
                  variant="h2" 
                  color="#2a0f35" 
                  sx={{ 
                    fontWeight: 'bold', 
                    my: 1,
                    fontSize: { xs: '2rem', sm: '2.5rem' }
                  }}
                >
                  {getRevisionStatusText(revision.status)}
                </Typography>
                {isOwner && isGroupRev && revision.totalFilled !== undefined && revision.totalUsers !== undefined && (
                  <Typography variant="caption" color="#4c5454">
                    {revision.totalFilled} из {revision.totalUsers} заполнили
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Card>

        {isGroupRev && !isRevisionVerified && revision.fillings && revision.fillings.length > 0 && (
  <Card 
    sx={{ 
      p: { xs: 2, sm: 2.5 },
      mb: 3,
      borderRadius: 8,
      backgroundColor: '#ffffff',
      boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
      width: '100%',
    }}
  >
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" color="#2a0f35" fontWeight={600}>
        Участники ревизии
      </Typography>
      <Typography variant="caption" color="#4c5454">
        {revision.totalFilled || 0} из {revision.totalUsers || revision.fillings.length} заполнили
      </Typography>
    </Box>

    <Grid container spacing={1.5}>
      {revision.fillings.map((filling) => {
        const isFilled = filling.isCompleted;
        
        return (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={filling.id}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 6,
                backgroundColor: isFilled ? 'rgba(76, 175, 80, 0.08)' : '#f5f3f6',
                border: '1px solid',
                borderColor: isFilled ? 'rgba(76, 175, 80, 0.2)' : 'rgba(0, 0, 0, 0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                transition: 'transform 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
                },
              }}
            >
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: isFilled ? '#4caf50' : '#674fb6',
                  fontSize: '0.9rem',
                }}
              >
                {filling.userName?.charAt(0) || 'П'}
              </Avatar>
              
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography 
                  variant="body2" 
                  color="#2a0f35" 
                  fontWeight={600}
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {filling.userName || `Пользователь ${filling.userId}`}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <Chip
                    label={isFilled ? 'Заполнено' : 'Ожидает'}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      backgroundColor: isFilled ? 'rgba(76, 175, 80, 0.1)' : 'rgba(158, 158, 158, 0.1)',
                      color: isFilled ? '#4caf50' : '#9e9e9e',
                      fontWeight: 500,
                    }}
                  />
                  {isFilled && filling.filledAt && (
                    <Typography variant="caption" color="#4c5454" sx={{ fontSize: '0.65rem' }}>
                      {formatTime(filling.filledAt)}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </Grid>
        );
      })}
    </Grid>

    {/* Статистика по заполнениям */}
    <Box sx={{ 
      mt: 2, 
      pt: 2, 
      borderTop: '1px dashed rgba(0,0,0,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 2,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ 
            width: 10, 
            height: 10, 
            borderRadius: '50%', 
            backgroundColor: '#4caf50',
          }} />
          <Typography variant="caption" color="#4c5454">
            Заполнили: {revision.fillings.filter(f => f.isCompleted).length}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ 
            width: 10, 
            height: 10, 
            borderRadius: '50%', 
            backgroundColor: '#9e9e9e',
          }} />
          <Typography variant="caption" color="#4c5454">
            Ожидают: {revision.fillings.filter(f => !f.isCompleted).length}
          </Typography>
        </Box>
      </Box>

      {revision.totalFilled !== undefined && revision.totalUsers !== undefined && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 100,
              height: 6,
              borderRadius: 3,
              backgroundColor: 'rgba(0,0,0,0.1)',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                width: `${(revision.totalFilled / revision.totalUsers) * 100}%`,
                height: '100%',
                backgroundColor: '#4caf50',
                borderRadius: 3,
              }}
            />
          </Box>
          <Typography variant="caption" color="#4c5454" fontWeight={500}>
            {Math.round((revision.totalFilled / revision.totalUsers) * 100)}%
          </Typography>
        </Box>
      )}
    </Box>
  </Card>
)}

        {/* Данные участников */}
        {completedFillings.length > 0 && (
          <Card 
            sx={{ 
              p: 0,
              mb: 3,
              borderRadius: 8,
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
              width: '100%',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ 
              p: { xs: 2, sm: 2.5 },
              pb: 2,
              borderBottom: '1px solid rgba(0,0,0,0.05)',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1" color="#2a0f35" fontWeight={600}>
                  {isOwner && isGroupRev 
                    ? `Данные участников (${completedFillings.length})` 
                    : 'Ваши данные'}
                </Typography>
                <Chip
                  label={`${completedFillings.length}`}
                  size="small"
                  sx={{
                    backgroundColor: '#f5f3f6',
                    color: '#4c5454',
                    fontWeight: 500,
                    borderRadius: 8,
                    fontSize: '0.8rem',
                  }}
                />
              </Box>
            </Box>

            <Box sx={{ width: '100%' }}>
              {completedFillings.map((filling) => {
                const isExpanded = expandedUsers.includes(filling.userId);
                const userDiscrepancies = isRevisionVerified 
                  ? revision.discrepancies?.filter(d => d.userId === filling.userId) || []
                  : [];
                const userTotal = userDiscrepancies.reduce((sum, d) => sum + d.discrepancy, 0);
                const userIsPositive = userTotal > 0;
                const userIsNegative = userTotal < 0;
                
                return (
                  <Box
                    key={filling.id}
                    sx={{
                      borderBottom: '1px solid rgba(0,0,0,0.05)',
                      '&:last-child': { borderBottom: 'none' },
                      width: '100%',
                    }}
                  >
                    <Accordion 
                      expanded={isExpanded}
                      onChange={() => handleAccordionChange(filling.userId)}
                      sx={{
                        boxShadow: 'none',
                        '&:before': { display: 'none' },
                        '&.Mui-expanded': { margin: 0 },
                        width: '100%',
                        backgroundColor: 'transparent',
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          minHeight: 72,
                          '&.Mui-expanded': { minHeight: 72 },
                          px: { xs: 2, sm: 2.5 },
                          py: 2,
                          width: '100%',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                          <Avatar
                            sx={{ 
                              width: 44, 
                              height: 44, 
                              bgcolor: '#674fb6',
                              fontSize: '1rem',
                            }}
                          >
                            {filling.userName?.charAt(0) || 'П'}
                          </Avatar>
                          
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" color="#2a0f35" fontWeight={600} noWrap>
                              {filling.userName || `Пользователь ${filling.userId}`}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5, flexWrap: 'wrap' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <InventoryIcon sx={{ fontSize: 14, color: '#4c5454' }} />
                                <Typography variant="caption" color="#4c5454">
                                  {filling.items.length} товаров
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <PhotoIcon sx={{ fontSize: 14, color: '#4c5454' }} />
                                <Typography variant="caption" color="#4c5454">
                                  {filling.photos.length} фото
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                          
                          {isRevisionVerified && userTotal !== 0 && (
                            <Box sx={{ flexShrink: 0 }}>
                              <Chip
                                icon={userIsPositive ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
                                label={`${userIsPositive ? '+' : ''}${userTotal}`}
                                size="small"
                                sx={{
                                  backgroundColor: userIsPositive ? '#2196f315' : '#f4433615',
                                  color: userIsPositive ? '#2196f3' : '#f44336',
                                  fontWeight: 600,
                                  fontSize: '0.85rem',
                                  minWidth: 70,
                                }}
                              />
                            </Box>
                          )}
                        </Box>
                      </AccordionSummary>
                      
                      <AccordionDetails sx={{ 
                        px: 0, 
                        pb: 3, 
                        width: '100%',
                        backgroundColor: '#f5f3f6',
                      }}>
                        <Box sx={{ 
                          px: { xs: 2, sm: 2.5 },
                          width: '100%',
                        }}>
                          <Stack spacing={2} sx={{ width: '100%' }}>
                            {filling.items.length > 0 && (
                              <Box sx={{ width: '100%' }}>
                                <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                                  Товары ({filling.items.length})
                                </Typography>
                                
                                <Grid container spacing={2} sx={{ width: '100%', mt: 0.5 }}>
                                  {filling.items.map((item, idx) => {
                                    const discrepancy = isRevisionVerified
                                      ? userDiscrepancies.find(d => d.productId === item.productId)
                                      : null;
                                    
                                    const expectedQuantity = isRevisionVerified && discrepancy
                                      ? discrepancy.expectedQuantity
                                      : 0;
                                    
                                    const receivedQuantity = item.quantity;
                                    const difference = discrepancy?.discrepancy || 0;
                                    const isPositive = difference > 0;
                                    const isNegative = difference < 0;
                                    const hasDiscrepancy = isRevisionVerified && difference !== 0;
                                    
                                    // Для непроверенных ревизий показываем только полученное количество
                                    if (!isRevisionVerified) {
                                      return (
                                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx}>
                                          <Card
                                            sx={{
                                              p: 2,
                                              borderRadius: 8,
                                              backgroundColor: '#ffffff',
                                              boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
                                              height: '100%',
                                              transition: 'transform 0.2s ease',
                                              '&:hover': {
                                                transform: 'translateY(-2px)',
                                                boxShadow: '0 6px 16px rgba(106, 61, 122, 0.15)',
                                              },
                                            }}
                                          >
                                            <Box sx={{ mb: 1.5 }}>
                                              <Typography variant="body2" color="#2a0f35" fontWeight={600} noWrap>
                                                {item.productName || `Товар ${item.productId}`}
                                              </Typography>
                                              <Typography variant="caption" color="#4c5454" display="block" noWrap>
                                                {item.categoryName || 'Категория'}
                                              </Typography>
                                            </Box>
                                            
                                            <Box sx={{ 
                                              display: 'flex', 
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              mt: 1.5,
                                              pt: 1.5,
                                              borderTop: '1px dashed rgba(0,0,0,0.1)'
                                            }}>
                                              <Box sx={{ textAlign: 'center' }}>
                                                <Typography variant="caption" color="#4c5454" display="block">
                                                  Заполнено
                                                </Typography>
                                                <Typography variant="body2" fontWeight={600} color="#4caf50">
                                                  {receivedQuantity} шт.
                                                </Typography>
                                              </Box>
                                            </Box>
                                          </Card>
                                        </Grid>
                                      );
                                    }
                                    
                                    // Для проверенных ревизий
                                  // Для проверенных ревизий
                                    return (
                                      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx}>
                                        <Card
                                          sx={{
                                            p: 2,
                                            borderRadius: 8,
                                            backgroundColor: '#ffffff',
                                            boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
                                            height: '100%',
                                            transition: 'transform 0.2s ease',
                                            border: hasDiscrepancy ? '1px solid' : 'none',
                                            borderColor: isPositive ? 'rgba(33, 150, 243, 0.3)' : isNegative ? 'rgba(244, 67, 54, 0.3)' : 'transparent',
                                            '&:hover': {
                                              transform: 'translateY(-2px)',
                                              boxShadow: hasDiscrepancy 
                                                ? isPositive 
                                                  ? '0 6px 16px rgba(33, 150, 243, 0.2)' 
                                                  : '0 6px 16px rgba(244, 67, 54, 0.2)'
                                                : '0 6px 16px rgba(106, 61, 122, 0.15)',
                                            },
                                          }}
                                        >
                                          <Box sx={{ 
                                            display: 'flex', 
                                            alignItems: 'flex-start',
                                            justifyContent: 'space-between',
                                            mb: 1.5,
                                            minHeight: 48,
                                          }}>
                                            <Box sx={{ flex: 1, minWidth: 0, pr: 1 }}>
                                              <Typography variant="body2" color="#2a0f35" fontWeight={600} noWrap>
                                                {item.productName || `Товар ${item.productId}`}
                                              </Typography>
                                              <Typography variant="caption" color="#4c5454" display="block" noWrap>
                                                {item.categoryName || 'Категория'}
                                              </Typography>
                                            </Box>
                                            
                                            {hasDiscrepancy && (
                                              <Chip
                                                label={isPositive ? 'Излишек' : 'Недостача'}
                                                size="small"
                                                sx={{
                                                  backgroundColor: isPositive ? '#2196f315' : '#f4433615',
                                                  color: isPositive ? '#2196f3' : '#f44336',
                                                  fontWeight: 500,
                                                  borderRadius: 6,
                                                  fontSize: '0.65rem',
                                                  height: 20,
                                                  flexShrink: 0,
                                                  '& .MuiChip-label': { px: 1 },
                                                }}
                                              />
                                            )}
                                          </Box>
                                          
                                          <Box sx={{ 
                                            display: 'flex', 
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            mt: 1.5,
                                            pt: 1.5,
                                            borderTop: '1px dashed rgba(0,0,0,0.1)'
                                          }}>
                                            {hasDiscrepancy ? (
                                              // Для товаров с расхождениями - 3 колонки
                                              <>
                                                <Box sx={{ textAlign: 'center' }}>
                                                  <Typography variant="caption" color="#4c5454" display="block">
                                                    Ожидалось
                                                  </Typography>
                                                  <Typography variant="body2" fontWeight={600}>
                                                    {expectedQuantity}
                                                  </Typography>
                                                </Box>
                                                
                                                <Box sx={{ textAlign: 'center' }}>
                                                  <Typography variant="caption" color="#4c5454" display="block">
                                                    Получено
                                                  </Typography>
                                                  <Typography 
                                                    variant="body2" 
                                                    fontWeight={600}
                                                    color={isNegative ? '#f44336' : isPositive ? '#2196f3' : '#4caf50'}
                                                  >
                                                    {receivedQuantity}
                                                  </Typography>
                                                </Box>
                                                
                                                <Box sx={{ textAlign: 'center' }}>
                                                  <Typography variant="caption" color="#4c5454" display="block">
                                                    Расхождение
                                                  </Typography>
                                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {isPositive && <ArrowUpwardIcon sx={{ fontSize: 14, color: '#2196f3', mr: 0.5 }} />}
                                                    {isNegative && <ArrowDownwardIcon sx={{ fontSize: 14, color: '#f44336', mr: 0.5 }} />}
                                                    <Typography 
                                                      variant="body2" 
                                                      fontWeight={600}
                                                      color={isPositive ? '#2196f3' : '#f44336'}
                                                    >
                                                      {isPositive ? '+' : ''}{difference}
                                                    </Typography>
                                                  </Box>
                                                </Box>
                                              </>
                                            ) : (
                                              // Для товаров без расхождений - 2 колонки
                                              <>
                                                <Box sx={{ textAlign: 'center' }}>
                                                  <Typography variant="caption" color="#4c5454" display="block">
                                                    Получено
                                                  </Typography>
                                                  <Typography variant="body2" fontWeight={600} color="#4caf50">
                                                    {receivedQuantity}
                                                  </Typography>
                                                </Box>
                                                
                                                <Box sx={{ textAlign: 'center' }}>
                                                  <Typography variant="caption" color="#4c5454" display="block">
                                                    Расхождение
                                                  </Typography>
                                                  <Typography variant="body2" fontWeight={600} color="#4caf50">
                                                    0
                                                  </Typography>
                                                </Box>
                                              </>
                                            )}
                                          </Box>
                                        </Card>
                                      </Grid>
                                    );
                                  })}
                                </Grid>
                              </Box>
                            )}
                            
                            {filling.photos.length > 0 && (
                              <Box sx={{ width: '100%' }}>
                                <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                                  Фотографии ({filling.photos.length})
                                </Typography>
                                
                                <Grid container spacing={1.5} sx={{ width: '100%' }}>
                                  {filling.photos.map((photo, index) => (
                                    <Grid size={{ xs: 6, sm: 4, md: 3 }} key={index}>
                                      <Box
                                        onClick={() => handleViewPhoto(filling.photos, index)}
                                        sx={{
                                          position: 'relative',
                                          height: 100,
                                          borderRadius: 8,
                                          overflow: 'hidden',
                                          cursor: 'pointer',
                                          backgroundColor: '#f5f3f6',
                                          backgroundImage: `url(${revisionService.getPhotoUrl(photo)})`,
                                          backgroundSize: 'cover',
                                          backgroundPosition: 'center',
                                          transition: 'transform 0.2s ease',
                                          '&:hover': { 
                                            transform: 'scale(1.02)',
                                            boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
                                          },
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            position: 'absolute',
                                            top: 6,
                                            right: 6,
                                            backgroundColor: 'rgba(42, 15, 53, 0.5)',
                                            borderRadius: '50%',
                                            p: 0.5,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 24,
                                            height: 24,
                                          }}
                                        >
                                          <PhotoCameraIcon sx={{ color: 'white', fontSize: 14 }} />
                                        </Box>
                                      </Box>
                                      <Typography variant="caption" align="center" display="block" sx={{ mt: 0.5, color: '#4c5454' }}>
                                        Фото {index + 1}
                                      </Typography>
                                    </Grid>
                                  ))}
                                </Grid>
                              </Box>
                            )}
                            
                            {filling.items.length === 0 && filling.photos.length === 0 && (
                              <Box sx={{ textAlign: 'center', py: 3, width: '100%' }}>
                                <Typography variant="body2" color="#4c5454">
                                  Нет данных для отображения
                                </Typography>
                              </Box>
                            )}
                          </Stack>
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  </Box>
                );
              })}
            </Box>
          </Card>
        )}

        {/* Сообщение если нет заполненных данных */}
        {completedFillings.length === 0 && (
          <Card
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 8,
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
              mb: 3,
              width: '100%',
            }}
          >
            <Typography variant="body1" color="#4c5454">
              Нет заполненных данных
            </Typography>
            <Typography variant="body2" color="#4c5454" sx={{ mt: 0.5 }}>
              {userHasFilled ? 'Вы еще не заполнили эту ревизию' : 'Участники еще не заполнили ревизию'}
            </Typography>
          </Card>
        )}

        {/* Блок с хронологией в конце */}
        <Card 
          sx={{ 
            p: { xs: 2, sm: 2.5 },
            borderRadius: 8,
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
          }}
        >
          <Typography variant="subtitle1" color="#2a0f35" fontWeight={600} gutterBottom>
            Хронология
          </Typography>
          
          <Stack spacing={2}>
            {/* Создана */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Box sx={{ 
                width: 32, 
                height: 32, 
                borderRadius: '50%', 
                backgroundColor: 'rgba(103, 79, 182, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <CalendarIcon sx={{ fontSize: 18, color: '#674fb6' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="#2a0f35" fontWeight={500}>
                  Создана
                </Typography>
                <Typography variant="caption" color="#4c5454">
                  {formatDateTime(revision.requestedAt)}
                </Typography>
              </Box>
            </Box>

            {/* Заполнена */}
            {revision.completedAt && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: '50%', 
                  backgroundColor: 'rgba(63, 31, 75, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <CheckCircleOutlineIcon sx={{ fontSize: 18, color: '#3f1f4b' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="#2a0f35" fontWeight={500}>
                    Заполнена
                  </Typography>
                  <Typography variant="caption" color="#4c5454">
                    {formatDateTime(revision.completedAt)}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Проверена */}
            {revision.verifiedAt && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: '50%', 
                  backgroundColor: 'rgba(202, 14, 192, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <VerifiedIcon sx={{ fontSize: 18, color: '#ca0ec0' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="#2a0f35" fontWeight={500}>
                    Проверена
                  </Typography>
                  <Typography variant="caption" color="#4c5454">
                    {formatDateTime(revision.verifiedAt)}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Кнопки действий (только для владельца и если ревизия не проверена) */}
            {!isRevisionVerified && (
              <Box sx={{ pt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {canVerifyRevision && (
                  <Button
                    variant="contained"
                    startIcon={<VerifiedIcon />}
                    onClick={() => navigate(`/revisions/${revision.id}/verify`)}
                    sx={{
                      borderRadius: 8,
                      backgroundColor: '#3f1f4b',
                      '&:hover': { backgroundColor: '#2a0f35' },
                      py: 1,
                      textTransform: 'none',
                      fontSize: '0.9rem',
                    }}
                  >
                    Проверить ревизию
                  </Button>
                )}
                {!userHasFilled && revision.status === RevisionStatus.IN_PROGRESS && (
                  <Button
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={() => navigate(`/revisions/${revision.id}/fill`)}
                    sx={{
                      borderRadius: 8,
                      backgroundColor: '#674fb6',
                      '&:hover': { backgroundColor: '#483399' },
                      py: 1,
                      textTransform: 'none',
                      fontSize: '0.9rem',
                    }}
                  >
                    Заполнить ревизию
                  </Button>
                )}
              </Box>
            )}
          </Stack>
        </Card>
      </Container>

      {/* Диалог фото для десктопа */}
      {selectedPhoto && (
        <PhotoViewer
          open={showPhotoDialog}
          photos={selectedPhoto.photos}
          currentIndex={selectedPhoto.index}
          onClose={() => setShowPhotoDialog(false)}
          onIndexChange={(index) => setSelectedPhoto({ ...selectedPhoto, index })}
          getPhotoUrl={revisionService.getPhotoUrl}
        />
      )}
    </Box>
  );
};

export default ViewRevisionPage;