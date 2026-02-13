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
  Divider,
  Card,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Fab,
  Fade,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  PhotoCamera as PhotoCameraIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  LocationCity as CityIcon,
  Home as ClusterIcon,
  Public as PublicIcon,
  People as PeopleIcon,
  Schedule as ScheduleIcon,
  ExpandMore as ExpandMoreIcon,
  Photo as PhotoIcon,
  Inventory as InventoryIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  Verified as VerifiedIcon,
  AddCircleOutline as AddCircleOutlineIcon,
  LocationCity,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { PhotoViewer  } from '../../components/PhotoViewer';
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
          <Box 
            sx={{ 
              position: 'absolute', 
              top: 0, 
              right: 0, 
              width: 120, 
              height: 120, 
              opacity: 0.05,
              zIndex: 0,
            }}
          >
            <Box
              sx={{
                width: '100%',
                height: '100%',
                backgroundImage: 'radial-gradient(circle, #674fb6 2px, transparent 2px)',
                backgroundSize: '20px 20px',
              }}
            />
          </Box>
          
          <Box sx={{ position: 'relative', zIndex: 1, py: { xs: 2, sm: 3 } }}>
            {isRevisionVerified ? (
              <Box>
                {totalDiscrepancy === 0 ? (
                  <>
                    <Typography variant="body2" color="#4c5454" gutterBottom>
                      Ревизия сбалансирована
                    </Typography>
                    <Typography 
                      variant="h1" 
                      color="#3f1f4b" 
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
                      color={totalDiscrepancy > 0 ? '#674fb6' : '#ca0ec0'}
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
                                label={`${userTotal > 0 ? '+' : ''}${userTotal}`}
                                size="small"
                                sx={{
                                  backgroundColor: userTotal > 0 ? 'rgba(86, 184, 209, 0.15)' : 'rgba(202, 14, 192, 0.15)',
                                  color: userTotal > 0 ? '#56b8d1' : '#ca0ec0',
                                  fontWeight: 600,
                                  fontSize: '0.85rem',
                                  minWidth: 60,
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
                                
                                <Stack spacing={1.5} sx={{ width: '100%' }}>
                                  {filling.items.map((item, idx) => {
                                    const discrepancy = isRevisionVerified
                                      ? userDiscrepancies.find(d => d.productId === item.productId)
                                      : null;
                                    
                                    return (
                                      <Card
                                        key={idx}
                                        sx={{
                                          p: 2,
                                          borderRadius: 8,
                                          backgroundColor: '#ffffff',
                                          boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          width: '100%',
                                        }}
                                      >
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                          <Typography variant="body2" color="#2a0f35" fontWeight={600} noWrap>
                                            {item.productName || `Товар ${item.productId}`}
                                          </Typography>
                                          <Typography variant="caption" color="#4c5454">
                                            {item.productSku || `SKU${item.productId}`}
                                          </Typography>
                                        </Box>
                                        
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                                          <Box sx={{ 
                                            backgroundColor: 'rgba(103, 79, 182, 0.15)',
                                            borderRadius: 6,
                                            px: 1.5,
                                            py: 0.5,
                                          }}>
                                            <Typography variant="body2" color="#674fb6" fontWeight={600}>
                                              {item.quantity} шт.
                                            </Typography>
                                          </Box>
                                          
                                          {isRevisionVerified && discrepancy && (
                                            <Chip
                                              size="small"
                                              label={`${discrepancy.isPositive ? '+' : ''}${discrepancy.discrepancy}`}
                                              sx={{
                                                backgroundColor: discrepancy.isPositive 
                                                  ? 'rgba(86, 184, 209, 0.15)' 
                                                  : 'rgba(202, 14, 192, 0.15)',
                                                color: discrepancy.isPositive ? '#56b8d1' : '#ca0ec0',
                                                fontWeight: 600,
                                                fontSize: '0.8rem',
                                                minWidth: 45,
                                                borderRadius: 4,
                                                height: 26,
                                              }}
                                            />
                                          )}
                                        </Box>
                                      </Card>
                                    );
                                  })}
                                </Stack>
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
          // Опционально: можно принудительно включить мобильный режим
          // forceMobile={isMobile}
          // Опционально: отключить миниатюры для определенных случаев
          // disableThumbnails={false}
        />
      )}
    </Box>
  );
};

export default ViewRevisionPage;