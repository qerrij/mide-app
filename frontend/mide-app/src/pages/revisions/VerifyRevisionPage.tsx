import React, { useState, useEffect } from 'react';
import {
  Container,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Fab,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  LocationCity as CityIcon,
  Home as ClusterIcon,
  Public as PublicIcon,
  ExpandMore as ExpandMoreIcon,
  Inventory as InventoryIcon,
  PhotoCamera as PhotoCameraIcon,
  Schedule as ScheduleIcon,
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
  UserDiscrepancySummary,
  getTargetName,
} from '../../types';

const VerifyRevisionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [revision, setRevision] = useState<Revision | null>(null);
  const [requestedByName, setRequestedByName] = useState<string>('');
  const [discrepancies, setDiscrepancies] = useState<UserDiscrepancySummary[]>([]);

  const [approveDialog, setApproveDialog] = useState(false);
  const [successDialog, setSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [comment, setComment] = useState('');
  const [expandedUsers, setExpandedUsers] = useState<number[]>([]);

  const [photoViewer, setPhotoViewer] = useState<{
    open: boolean;
    photos: string[];
    currentIndex: number;
  }>({
    open: false,
    photos: [],
    currentIndex: 0,
  });

  // Загрузка данных ревизии
  useEffect(() => {
    const loadRevision = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!id) {
          throw new Error('ID ревизии не указан');
        }

        const revisionData = await revisionService.getRevisionById(parseInt(id));

        if (revisionData.status !== RevisionStatus.COMPLETED) {
          throw new Error('Эта ревизия не готова к проверке');
        }

        if (user?.id !== revisionData.requestedById) {
          throw new Error('Только тот, кто запросил ревизию, может её проверять');
        }

        setRequestedByName(revisionData.requestedByName || `Пользователь ${revisionData.requestedById}`);
        setRevision(revisionData);

        // Получаем расхождения с сервера
        try {
          const calculatedDiscrepancies = await revisionService.calculateDiscrepancies(parseInt(id));
          setDiscrepancies(calculatedDiscrepancies);
        } catch (error) {
          console.error('Error calculating discrepancies:', error);
          setDiscrepancies([]);
        }

      } catch (err: any) {
        setError(err.message || 'Ошибка при загрузке ревизии');
        console.error('Error loading revision:', err);
      } finally {
        setLoading(false);
      }
    };

    loadRevision();
  }, [id, user]);

  const handleViewPhoto = (photos: string[], index: number) => {
    setPhotoViewer({
      open: true,
      photos,
      currentIndex: index,
    });
  };

  const handleApprove = async () => {
    if (!revision || !id) return;

    try {
      setVerifying(true);
      await revisionService.verifyRevision(
        parseInt(id),
        comment || 'Ревизия проверена'
      );
      setSuccessMessage('Ревизия успешно проверена');
      setSuccessDialog(true);
    } catch (err: any) {
      setError(err.message || 'Ошибка при проверке ревизии');
    } finally {
      setVerifying(false);
      setApproveDialog(false);
    }
  };

  const handleCancel = () => {
    navigate(`/revisions/${revision?.id}`);
  };

  const handleAccordionChange = (userId: number) => {
    setExpandedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const formatDate = (date: Date): string => {
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

  const getTotalDiscrepancy = () => {
    if (discrepancies.length === 0) return 0;
    return discrepancies.reduce((sum, ud) => sum + ud.totalDiscrepancy, 0);
  };

  const getExpectedQuantity = (userId: number, productId: number): number => {
    const userFilling = revision?.fillings.find(f => f.userId === userId);
    if (!userFilling) return 0;
    const item = userFilling.items.find(i => i.productId === productId);
    return item?.quantity || 0;
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', background: '#f5f3f6', py: 4 }}>
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
      <Box sx={{ minHeight: '100vh', background: '#f5f3f6', py: 4 }}>
        <Container maxWidth="lg">
          <Alert severity="error" sx={{ borderRadius: 4 }}>
            Ревизия не найдена
          </Alert>
        </Container>
      </Box>
    );
  }

  const totalDiscrepancy = getTotalDiscrepancy();
  const isPositiveTotal = totalDiscrepancy > 0;
  const isNegativeTotal = totalDiscrepancy < 0;
  const completedFillings = revision.fillings.filter(f => f.isCompleted);

  return (
    <Box sx={{ minHeight: '100vh', py: 3, backgroundColor: '#f5f3f6' }}>
      {/* Плавающая кнопка назад для мобильных */}
      {isMobile && (
        <Fab
          onClick={() => navigate(`/revisions/${revision.id}`)}
          sx={{
            position: 'fixed',
            top: 64,
            left: 16,
            zIndex: 1000,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.9)' },
            width: 44,
            height: 44,
            mt: 1,
          }}
        >
          <ArrowBackIcon sx={{ color: 'rgba(103, 79, 182, 0.8)', fontSize: 22 }} />
        </Fab>
      )}

      <Container maxWidth="lg" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
        {/* Кнопка назад для десктопа */}
        {!isMobile && (
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/revisions/${revision.id}`)}
            sx={{
              borderRadius: 4,
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
            }}
          >
            Назад к ревизии
          </Button>
        )}

        {isMobile && <Box sx={{ height: 16, mb: 2 }} />}

        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              borderRadius: 4,
              backgroundColor: 'rgba(202, 14, 192, 0.08)',
              border: '1px solid rgba(202, 14, 192, 0.2)',
              color: '#ca0ec0',
            }}
          >
            {error}
          </Alert>
        )}

        {/* Основная информация */}
        <Card sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 8, boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)' }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h5" component="h1" color="#2a0f35" fontWeight={600} gutterBottom>
              Проверка ревизии #{revision.id}
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
                }}
              />
              <Chip
                label={`${completedFillings.length}/${revision.fillings.length} заполнили`}
                size="small"
                sx={{
                  backgroundColor: '#f5f3f6',
                  color: '#4c5454',
                  borderRadius: 6,
                }}
              />
            </Box>
          </Box>

          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Avatar sx={{ width: 44, height: 44, bgcolor: '#674fb6' }}>
                {revision.requestedByName?.charAt(0)?.toUpperCase() || 'П'}
              </Avatar>
              <Box>
                <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontSize: '0.7rem', letterSpacing: 0.5 }}>
                  ЗАПРОСИЛ
                </Typography>
                <Typography variant="body1" color="#2a0f35" fontWeight={600}>
                  {requestedByName}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <ScheduleIcon sx={{ fontSize: 16, color: '#4c5454', opacity: 0.7 }} />
                  <Typography variant="caption" color="#4c5454">
                    {formatDateTime(revision.requestedAt)}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ pl: { xs: 0, sm: 1 } }}>
              <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontSize: '0.7rem', letterSpacing: 0.5 }}>
                ЦЕЛЬ РЕВИЗИИ
              </Typography>
              <Typography variant="body1" color="#2a0f35" fontWeight={500}>
                {getTargetName(revision)}
              </Typography>
            </Box>

            {revision.comment && (
              <Box sx={{ p: 2, backgroundColor: '#f5f3f6', borderRadius: 8 }}>
                <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontSize: '0.7rem', fontWeight: 500, letterSpacing: 0.5 }}>
                  КОММЕНТАРИЙ
                </Typography>
                <Typography variant="body2" color="#2a0f35" sx={{ whiteSpace: 'pre-wrap' }}>
                  {revision.comment}
                </Typography>
              </Box>
            )}
          </Stack>
        </Card>

        {/* Общий итог ревизии */}
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

          <Box sx={{ position: 'relative', zIndex: 1, py: { xs: 2, sm: 3 } }}>
            <Typography variant="body2" color="#4c5454" gutterBottom>
              {totalDiscrepancy !== 0
                ? (isPositiveTotal ? 'Заполнено больше инвентаря на' : 'Заполнено меньше инвентаря на')
                : 'Ревизия сбалансирована'
              }
            </Typography>

            <Typography
              variant="h1"
              color={isPositiveTotal ? '#1976d2' : isNegativeTotal ? '#d32f2f' : '#2e7d32'}
              sx={{
                fontWeight: 'bold',
                my: 1,
                fontSize: { xs: '3rem', sm: '4rem' }
              }}
            >
              {isPositiveTotal ? '+' : ''}{totalDiscrepancy}
            </Typography>

            {totalDiscrepancy !== 0 && (
              <Typography variant="caption" color="#4c5454">
                {isPositiveTotal ? 'Обнаружен излишек' : 'Обнаружена недостача'}
              </Typography>
            )}
          </Box>
        </Card>

        {/* Данные участников */}
        {completedFillings.length > 0 && (
          <Card sx={{
            mb: 3,
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
          }}>
            <Box sx={{ p: { xs: 2, sm: 2.5 }, pb: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GroupIcon sx={{ color: '#674fb6' }} />
                  <Typography variant="subtitle1" color="#2a0f35" fontWeight={600}>
                    Расхождения по участникам
                  </Typography>
                </Box>
                <Chip
                  label={discrepancies.length}
                  size="small"
                  sx={{
                    backgroundColor: '#f5f3f6',
                    color: '#4c5454',
                    fontWeight: 500,
                    borderRadius: 8,
                  }}
                />
              </Box>
            </Box>

            <Box sx={{ width: '100%' }}>
              {discrepancies.map((userDiscrepancy) => {
                const userFilling = revision.fillings.find(f => f.userId === userDiscrepancy.userId);
                const isExpanded = expandedUsers.includes(userDiscrepancy.userId);
                const userTotal = userDiscrepancy.totalDiscrepancy;
                const userIsPositive = userTotal > 0;
                const userIsNegative = userTotal < 0;
                const hasDiscrepancies = userDiscrepancy.discrepancies.length > 0;

                return (
                  <Box
                    key={userDiscrepancy.userId}
                    sx={{
                      borderBottom: '1px solid rgba(0,0,0,0.05)',
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <Accordion
                      expanded={isExpanded}
                      onChange={() => handleAccordionChange(userDiscrepancy.userId)}
                      sx={{
                        boxShadow: 'none',
                        '&:before': { display: 'none' },
                        '&.Mui-expanded': { margin: 0 },
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
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                          <Avatar sx={{ width: 44, height: 44, bgcolor: '#674fb6' }}>
                            {userDiscrepancy.userName?.charAt(0)?.toUpperCase() || 'П'}
                          </Avatar>

                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" color="#2a0f35" fontWeight={600} noWrap>
                              {userDiscrepancy.userName || `Пользователь ${userDiscrepancy.userId}`}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5, flexWrap: 'wrap' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <InventoryIcon sx={{ fontSize: 14, color: '#4c5454' }} />
                                <Typography variant="caption" color="#4c5454">
                                  {userFilling?.items.length || 0} товаров
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <PhotoCameraIcon sx={{ fontSize: 14, color: '#4c5454' }} />
                                <Typography variant="caption" color="#4c5454">
                                  {userFilling?.photos.length || 0} фото
                                </Typography>
                              </Box>
                            </Box>
                          </Box>

                          {hasDiscrepancies && (
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

                      <AccordionDetails sx={{ px: 0, pb: 3, backgroundColor: '#f5f3f6' }}>
                        <Box sx={{ px: { xs: 2, sm: 2.5 } }}>
                          <Stack spacing={2}>
                            {/* Таблица расхождений */}
                            {hasDiscrepancies && (
                              <Box>
                                <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontWeight: 600 }}>
                                  Детали расхождений
                                </Typography>

                                <Grid container spacing={1.5}>
                                  {userDiscrepancy.discrepancies.map((disc, idx) => {
                                    const expectedQuantity = getExpectedQuantity(userDiscrepancy.userId, disc.productId);
                                    const discrepancy = disc.discrepancy || 0;
                                    const isPositive = discrepancy > 0;
                                    const isZero = discrepancy === 0;

                                    return (
                                      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx}>
                                        <Card
                                          sx={{
                                            p: 2,
                                            borderRadius: 8,
                                            backgroundColor: '#ffffff',
                                            boxShadow: '0 2px 8px rgba(106, 61, 122, 0.08)',
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
                                              {disc.productName || `Товар ${disc.productId}`}
                                            </Typography>
                                            <Typography variant="caption" color="#4c5454" display="block" noWrap>
                                              {disc.productSku || `SKU${disc.productId}`}
                                            </Typography>
                                          </Box>

                                          <Box sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            mt: 1.5,
                                            pt: 1.5,
                                            borderTop: '1px dashed rgba(0,0,0,0.1)'
                                          }}>
                                            <Box sx={{ textAlign: 'center', flex: 1 }}>
                                              <Typography variant="caption" color="#4c5454" display="block">
                                                Заполнено
                                              </Typography>
                                              <Typography variant="body2" fontWeight={600}>
                                                {expectedQuantity}
                                              </Typography>
                                            </Box>

                                            <Box sx={{ textAlign: 'center', flex: 1 }}>
                                              <Typography variant="caption" color="#4c5454" display="block">
                                                Расхождение
                                              </Typography>
                                              {!isZero ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                  {isPositive ? (
                                                    <ArrowUpwardIcon sx={{ fontSize: 14, color: '#2196f3', mr: 0.5 }} />
                                                  ) : (
                                                    <ArrowDownwardIcon sx={{ fontSize: 14, color: '#f44336', mr: 0.5 }} />
                                                  )}
                                                  <Typography
                                                    variant="body2"
                                                    fontWeight={600}
                                                    color={isPositive ? '#2196f3' : '#f44336'}
                                                  >
                                                    {isPositive ? '+' : ''}{discrepancy}
                                                  </Typography>
                                                </Box>
                                              ) : (
                                                <Typography variant="body2" fontWeight={600} color="#4caf50">
                                                  0
                                                </Typography>
                                              )}
                                            </Box>

                                            <Box sx={{ textAlign: 'center', flex: 1 }}>
                                              <Typography variant="caption" color="#4c5454" display="block">
                                                Статус
                                              </Typography>
                                              {!isZero ? (
                                                <Chip
                                                  size="small"
                                                  label={isPositive ? 'Излишек' : 'Недостача'}
                                                  sx={{
                                                    backgroundColor: isPositive ? '#2196f315' : '#f4433615',
                                                    color: isPositive ? '#2196f3' : '#f44336',
                                                    fontSize: '0.7rem',
                                                    height: 24,
                                                  }}
                                                />
                                              ) : (
                                                <Chip
                                                  size="small"
                                                  label="Ок"
                                                  sx={{
                                                    backgroundColor: '#4caf5015',
                                                    color: '#4caf50',
                                                    fontSize: '0.7rem',
                                                    height: 24,
                                                  }}
                                                />
                                              )}
                                            </Box>
                                          </Box>
                                        </Card>
                                      </Grid>
                                    );
                                  })}
                                </Grid>
                              </Box>
                            )}

                            {/* Фотографии */}
                            {userFilling?.photos && userFilling.photos.length > 0 && (
                              <Box>
                                <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontWeight: 600 }}>
                                  Фотографии ({userFilling.photos.length})
                                </Typography>

                                <Grid container spacing={1.5}>
                                  {userFilling.photos.map((photo, index) => (
                                    <Grid size={{ xs: 6, sm: 4, md: 3 }} key={index}>
                                      <Box
                                        onClick={() => handleViewPhoto(userFilling.photos, index)}
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

        {/* Кнопки действий */}
        <Box sx={{
          display: 'flex',
          gap: 2,
          justifyContent: 'center',
          flexDirection: { xs: 'row', md: 'row' },
          mb: 2,
        }}>
          <Button
            variant="outlined"
            startIcon={<CancelIcon />}
            onClick={handleCancel}
            disabled={verifying}
            sx={{
              borderRadius: 4,
              px: 4,
              py: 1.2,
              fontSize: '0.95rem',
              fontWeight: 600,
              borderWidth: 1.5,
              borderColor: 'rgba(103, 79, 182, 0.5)',
              color: '#674fb6',
              '&:hover': {
                borderWidth: 1.5,
                borderColor: '#674fb6',
                backgroundColor: 'rgba(103, 79, 182, 0.04)',
              },
            }}
          >
            Отмена
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckCircleIcon />}
            onClick={() => setApproveDialog(true)}
            disabled={verifying}
            sx={{
              borderRadius: 4,
              backgroundColor: '#3f1f4b',
              '&:hover': { backgroundColor: '#2a0f35' },
              px: 4,
              py: 1.2,
              fontSize: '0.95rem',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(63, 31, 75, 0.25)',
            }}
          >
            Проверить
          </Button>
        </Box>
      </Container>

      {/* Диалог проверки */}
      <Dialog
        open={approveDialog}
        onClose={() => {
          setApproveDialog(false);
          setComment('');
        }}
        PaperProps={{
          sx: {
            borderRadius: 4,
            maxWidth: 520,
            width: '100%',
            m: 2,
            boxShadow: '0 8px 24px rgba(106, 61, 122, 0.15)',
          }
        }}
      >
        <DialogTitle sx={{ p: 2.5, pb: 1 }}>
          <Typography variant="h6" color="#2a0f35" fontWeight={600} sx={{ mb: 0.5 }}>
            Подтверждение проверки
          </Typography>
          <Typography variant="body2" color="#4c5454" sx={{ fontSize: '0.85rem' }}>
            Вы уверены, что хотите завершить проверку ревизии?
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 2.5, pt: 2 }}>
          <Stack spacing={2.5}>
            <Box sx={{
              p: 2,
              backgroundColor: isPositiveTotal ? 'rgba(25, 118, 210, 0.04)' : 
                             isNegativeTotal ? 'rgba(211, 47, 47, 0.04)' : 'rgba(46, 125, 50, 0.04)',
              borderRadius: 4,
              border: `1px solid ${
                isPositiveTotal ? '#1976d2' : 
                isNegativeTotal ? '#d32f2f' : '#2e7d32'
              }20`,
            }}>
              <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                ИТОГ РЕВИЗИИ
              </Typography>
              <Typography variant="h5" color={isPositiveTotal ? '#1976d2' : isNegativeTotal ? '#d32f2f' : '#2e7d32'} fontWeight={700}>
                {isPositiveTotal ? '+' : ''}{totalDiscrepancy}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="#4c5454" sx={{ mb: 0.5, display: 'block', fontWeight: 600, fontSize: '0.75rem' }}>
                КОММЕНТАРИЙ (НЕОБЯЗАТЕЛЬНО)
              </Typography>
              <TextField
                fullWidth
                placeholder="Дополнительная информация по проверке"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                multiline
                rows={3}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 4,
                    backgroundColor: '#f8f7fa',
                  },
                }}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}>
          <Button
            onClick={() => {
              setApproveDialog(false);
              setComment('');
            }}
            sx={{
              borderRadius: 4,
              color: '#4c5454',
              px: 3,
              py: 1,
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 500,
            }}
          >
            Отмена
          </Button>
          <Button
            variant="contained"
            onClick={handleApprove}
            disabled={verifying}
            sx={{
              borderRadius: 4,
              backgroundColor: '#3f1f4b',
              '&:hover': { backgroundColor: '#2a0f35' },
              px: 3,
              py: 1,
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 500,
            }}
          >
            {verifying ? 'Сохранение...' : 'Проверить ревизию'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог успеха */}
      <Dialog
        open={successDialog}
        onClose={() => {
          setSuccessDialog(false);
          navigate(`/revisions/${revision.id}`);
        }}
        PaperProps={{
          sx: {
            borderRadius: 4,
            maxWidth: 400,
            width: '100%',
            m: 2,
            boxShadow: '0 8px 24px rgba(106, 61, 122, 0.15)',
          }
        }}
      >
        <DialogContent sx={{ textAlign: 'center', py: 4, px: 3 }}>
          <CheckCircleIcon sx={{ fontSize: 80, color: '#3f1f4b', mb: 2 }} />
          <Typography variant="h5" color="#2a0f35" fontWeight={600} gutterBottom>
            {successMessage}
          </Typography>
          <Typography variant="body2" color="#4c5454">
            Статус ревизии обновлен
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 4 }}>
          <Button
            variant="contained"
            onClick={() => {
              setSuccessDialog(false);
              navigate(`/revisions/${revision.id}`);
            }}
            sx={{
              borderRadius: 4,
              backgroundColor: '#674fb6',
              '&:hover': { backgroundColor: '#483399' },
              px: 4,
              py: 1,
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 500,
            }}
          >
            К ревизии
          </Button>
        </DialogActions>
      </Dialog>

      {/* Просмотр фото */}
      <PhotoViewer
        open={photoViewer.open}
        photos={photoViewer.photos}
        currentIndex={photoViewer.currentIndex}
        onClose={() => setPhotoViewer(prev => ({ ...prev, open: false }))}
        onIndexChange={(index) => setPhotoViewer(prev => ({ ...prev, currentIndex: index }))}
        getPhotoUrl={revisionService.getPhotoUrl}
        forceMobile={false}
        disableThumbnails={photoViewer.photos.length <= 1}
      />
    </Box>
  );
};

export default VerifyRevisionPage;