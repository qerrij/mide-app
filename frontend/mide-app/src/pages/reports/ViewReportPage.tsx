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
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Inventory as InventoryIcon,
  AttachMoney as AttachMoneyIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
  PhotoCamera as PhotoCameraIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { reportService } from '../../api/reportService';
import { PhotoViewer } from '../../components/PhotoViewer';
import { Report, ReportStatus, UserRole, getReportStatusText, getReportStatusColor } from '../../types';

const ViewReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedProducts, setExpandedProducts] = useState(true);
  const [photoViewer, setPhotoViewer] = useState<{
    open: boolean;
    photos: string[];
    currentIndex: number;
  }>({
    open: false,
    photos: [],
    currentIndex: 0,
  });

  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoading(true);
        if (!id) throw new Error('ID отчета не указан');
        
        const reportData = await reportService.getReportById(parseInt(id));
        setReport(reportData);
      } catch (err: any) {
        setError(err.message || 'Ошибка при загрузке отчета');
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [id]);

  const handleViewPhoto = (photos: string[], index: number) => {
    setPhotoViewer({
      open: true,
      photos,
      currentIndex: index,
    });
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

  const getStatusIcon = (status: ReportStatus) => {
    switch (status) {
      case ReportStatus.APPROVED:
        return <CheckCircleIcon sx={{ color: '#4caf50' }} />;
      case ReportStatus.REJECTED:
        return <CancelIcon sx={{ color: '#f44336' }} />;
      default:
        return <PendingIcon sx={{ color: '#ff9800' }} />;
    }
  };

  const canUserFix = (): boolean => {
    if (!user || !report) return false;
    return user.id === report.sellerId && report.status === ReportStatus.AWAITING_FIX;
  };

  const canUserReview = (): boolean => {
    if (!user || !report) return false;
    
    if (user.role === UserRole.ACCOUNTANT && report.status === ReportStatus.AWAITING_ACCOUNTANT) {
      return true;
    }
    
    if ([UserRole.MENTOR, UserRole.SENIOR_SELLER, UserRole.ADMIN, UserRole.OWNER].includes(user.role) 
        && report.status === ReportStatus.AWAITING_MANAGER) {
      return true;
    }
    
    return false;
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

  if (!report) {
    return (
      <Box sx={{ minHeight: '100vh', background: '#f5f3f6', py: 4 }}>
        <Container maxWidth="lg">
          <Alert severity="error" sx={{ borderRadius: 8 }}>
            Отчет не найден
          </Alert>
        </Container>
      </Box>
    );
  }

  const totalQuantity = report.products.reduce((sum, p) => sum + p.quantity, 0);
  const totalAmount = report.products.reduce((sum, p) => sum + (p.quantity * p.soldAmount), 0);

  return (
    <Box sx={{ minHeight: '100vh', py: 3, backgroundColor: '#f5f3f6' }}>
      {isMobile && (
        <Fab
          onClick={() => navigate('/reports')}
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
        {!isMobile && (
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/reports')}
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
            }}
          >
            Назад к отчетам
          </Button>
        )}

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
            }}
          >
            {error}
          </Alert>
        )}

        {/* Основная информация */}
        <Card sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 8, boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)' }}>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {getStatusIcon(report.status)}
              <Typography variant="h5" component="h1" color="#2a0f35" fontWeight={600}>
                Отчет #{report.id}
              </Typography>
            </Box>
            <Chip
              label={getReportStatusText(report.status)}
              size="small"
              sx={{
                backgroundColor: `${getReportStatusColor(report.status)}15`,
                color: getReportStatusColor(report.status),
                fontWeight: 500,
                borderRadius: 6,
              }}
            />
          </Box>

          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Avatar sx={{ width: 40, height: 40, bgcolor: '#674fb6' }}>
                {report.sellerName?.charAt(0) || 'П'}
              </Avatar>
              <Box>
                <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                  Составитель
                </Typography>
                <Typography variant="body1" color="#2a0f35" fontWeight={500}>
                  {report.sellerName || `Пользователь ${report.sellerId}`}
                </Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                Дата создания
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ScheduleIcon sx={{ fontSize: 18, color: '#4c5454' }} />
                <Typography variant="body2" color="#2a0f35">
                  {formatDateTime(report.date)}
                </Typography>
              </Box>
            </Box>

            {report.comment && (
              <Box>
                <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                  Комментарий составителя
                </Typography>
                <Typography variant="body2" color="#2a0f35" sx={{ whiteSpace: 'pre-wrap' }}>
                  {report.comment}
                </Typography>
              </Box>
            )}
          </Stack>
        </Card>

        {/* Финансовая информация - в стиле блока статуса ревизий */}
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
            <Typography variant="body2" color="#4c5454" gutterBottom>
              Финансовые показатели отчета
            </Typography>
            
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Box>
                  <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                    Сумма за товары
                  </Typography>
                  <Typography 
                    variant="h3" 
                    color="#2a0f35" 
                    sx={{ 
                      fontWeight: 'bold',
                      fontSize: { xs: '2rem', sm: '2.5rem', md: '2.8rem' },
                      lineHeight: 1.2,
                    }}
                  >
                    {totalAmount.toFixed(2)}₽
                  </Typography>
                  <Typography variant="caption" color="#4c5454">
                    {totalQuantity} шт. / {report.products.length} позиций
                  </Typography>
                </Box>
              </Grid>
              
              <Grid size={{ xs: 12, md: 6 }}>
                <Box>
                  <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                    Сумма перевода (указана продавцом)
                  </Typography>
                  <Typography 
                    variant="h3" 
                    color="#674fb6" 
                    sx={{ 
                      fontWeight: 'bold',
                      fontSize: { xs: '2rem', sm: '2.5rem', md: '2.8rem' },
                      lineHeight: 1.2,
                    }}
                  >
                    {report.accountantAmount?.toFixed(2)}₽
                  </Typography>
                </Box>
              </Grid>

              {report.accountantFinalAmount && (
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                      Утвержденная сумма (бухгалтер)
                    </Typography>
                    <Typography 
                      variant="h2" 
                      color="#4caf50" 
                      sx={{ 
                        fontWeight: 'bold',
                        fontSize: { xs: '2.2rem', sm: '2.8rem', md: '3.2rem' },
                        lineHeight: 1.2,
                      }}
                    >
                      {report.accountantFinalAmount.toFixed(2)}₽
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        </Card>

        {/* Товары в отчете - Аккордеон */}
        <Card sx={{ 
          mb: 3, 
          borderRadius: 8, 
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
        }}>
          <Accordion 
            expanded={expandedProducts}
            onChange={() => setExpandedProducts(!expandedProducts)}
            sx={{
              boxShadow: 'none',
              '&:before': { display: 'none' },
              backgroundColor: '#ffffff',
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: '#674fb6' }} />}
              sx={{
                px: { xs: 2, sm: 3 },
                py: 1,
                borderBottom: expandedProducts ? '1px solid rgba(0,0,0,0.05)' : 'none',
                '&.Mui-expanded': { minHeight: 56 },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                <InventoryIcon sx={{ color: '#674fb6' }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" color="#2a0f35" fontWeight={600}>
                    Товары в отчете
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="caption" color="#4c5454">
                      {report.products.length} позиций • {totalQuantity} шт.
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: '#674fb6', 
                        fontWeight: 600,
                        backgroundColor: 'rgba(103, 79, 182, 0.08)',
                        px: 1,
                        py: 0.25,
                        borderRadius: 4,
                      }}
                    >
                      {totalAmount.toFixed(2)}₽
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </AccordionSummary>
            
            <AccordionDetails sx={{ p: { xs: 2, sm: 3 }, backgroundColor: '#f5f3f6' }}>
              <Stack spacing={1.5}>
                {report.products.map((item, index) => (
                  <Card
                    key={index}
                    sx={{
                      p: 2,
                      borderRadius: 8,
                      backgroundColor: '#ffffff',
                      boxShadow: '0 2px 8px rgba(106, 61, 122, 0.08)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'box-shadow 0.2s ease',
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(106, 61, 122, 0.12)',
                      },
                    }}
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" fontWeight={600} color="#2a0f35" noWrap>
                        {item.product?.name || `Товар #${item.productId}`}
                      </Typography>
                      <Typography variant="caption" color="#4c5454">
                        {item.product?.sku || `SKU${item.productId}`}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: { xs: 1.5, sm: 3 },
                      flexWrap: 'wrap',
                      justifyContent: 'flex-end',
                    }}>
                      <Box sx={{ 
                        backgroundColor: 'rgba(103, 79, 182, 0.08)',
                        borderRadius: 6,
                        px: 1.5,
                        py: 0.5,
                      }}>
                        <Typography variant="body2" color="#674fb6" fontWeight={600}>
                          {item.quantity} шт.
                        </Typography>
                      </Box>
                      
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="#4c5454" display="block">
                          {item.soldAmount.toFixed(2)}₽/шт
                        </Typography>
                        <Typography variant="body2" fontWeight={600} color="#2a0f35">
                          = {(item.quantity * item.soldAmount).toFixed(2)}₽
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Card>

        {/* Фотографии */}
        {report.transferPhotos && report.transferPhotos.length > 0 && (
          <Card sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 8, boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)' }}>
            <Typography variant="h6" color="#2a0f35" fontWeight={600} sx={{ mb: 2 }}>
              Фотографии перевода ({report.transferPhotos.length})
            </Typography>

            <Grid container spacing={1.5}>
              {report.transferPhotos.map((photo, index) => (
                <Grid size={{ xs: 6, sm: 4, md: 2.4 }} key={index}>
                  <Box
                    onClick={() => handleViewPhoto(report.transferPhotos, index)}
                    sx={{
                      position: 'relative',
                      width: '100%',
                      paddingBottom: '100%',
                      borderRadius: 8,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      backgroundColor: '#f5f3f6',
                      backgroundImage: `url(${reportService.getPhotoUrl(photo)})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      '&:hover': {
                        transform: { xs: 'none', md: 'scale(1.02)' },
                        boxShadow: '0 4px 12px rgba(106, 61, 122, 0.15)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        backgroundColor: 'rgba(42, 15, 53, 0.5)',
                        borderRadius: '50%',
                        p: 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: { xs: 28, md: 24 },
                        height: { xs: 28, md: 24 },
                      }}
                    >
                      <PhotoCameraIcon sx={{ color: 'white', fontSize: { xs: 16, md: 14 } }} />
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Card>
        )}

        {/* Информация о проверках */}
        {(report.accountantStatus || report.status === ReportStatus.APPROVED || report.status === ReportStatus.REJECTED) && (
          <Card sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 8, boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)' }}>
            <Typography variant="h6" color="#2a0f35" fontWeight={600} sx={{ mb: 2 }}>
              История проверок
            </Typography>

            <Stack spacing={2}>
              {report.accountantStatus && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Box sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: report.accountantStatus === ReportStatus.APPROVED
                      ? 'rgba(76, 175, 80, 0.15)'
                      : 'rgba(244, 67, 54, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {report.accountantStatus === ReportStatus.APPROVED
                      ? <CheckCircleIcon sx={{ fontSize: 18, color: '#4caf50' }} />
                      : <CancelIcon sx={{ fontSize: 18, color: '#f44336' }} />
                    }
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={500} color="#2a0f35">
                      {report.accountantStatus === ReportStatus.APPROVED ? 'Утвержден бухгалтером' : 'Отклонен бухгалтером'}
                    </Typography>
                    <Typography variant="caption" color="#4c5454" display="block">
                      {report.accountantName || `Пользователь ${report.accountantReviewedBy}`} • {formatDateTime(report.accountantReviewDate)}
                    </Typography>
                    {report.accountantComment && (
                      <Typography variant="body2" color="#4c5454" sx={{ mt: 0.5 }}>
                        {report.accountantComment}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}

              {report.status === ReportStatus.APPROVED && report.reviewedBy && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Box sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(76, 175, 80, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <CheckCircleIcon sx={{ fontSize: 18, color: '#4caf50' }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={500} color="#2a0f35">
                      Финальное утверждение
                    </Typography>
                    <Typography variant="caption" color="#4c5454" display="block">
                      {report.reviewerName || `Пользователь ${report.reviewedBy}`} • {formatDateTime(report.reviewDate)}
                    </Typography>
                  </Box>
                </Box>
              )}

              {report.status === ReportStatus.REJECTED && report.reviewedBy && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Box sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(244, 67, 54, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <CancelIcon sx={{ fontSize: 18, color: '#f44336' }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={500} color="#2a0f35">
                      Отклонен {report.reviewerName || `Пользователь ${report.reviewedBy}`}
                    </Typography>
                    <Typography variant="caption" color="#4c5454" display="block">
                      {formatDateTime(report.reviewDate)}
                    </Typography>
                    {report.comment && (
                      <Typography variant="body2" color="#4c5454" sx={{ mt: 0.5 }}>
                        {report.comment}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            </Stack>
          </Card>
        )}

        {/* Кнопки действий */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          {canUserFix() && (
            <Button
              variant="contained"
              onClick={() => navigate(`/reports/${report.id}/fix`)}
              sx={{
                borderRadius: 8,
                backgroundColor: '#f44336',
                '&:hover': { backgroundColor: '#d32f2f' },
                px: 4,
                py: 1.2,
              }}
            >
              Исправить отчет
            </Button>
          )}
          
          {canUserReview() && user?.role === UserRole.ACCOUNTANT && (
            <Button
              variant="contained"
              onClick={() => navigate(`/reports/${report.id}/accountant-review`)}
              sx={{
                borderRadius: 8,
                backgroundColor: '#674fb6',
                '&:hover': { backgroundColor: '#483399' },
                px: 4,
                py: 1.2,
              }}
            >
              Проверить как бухгалтер
            </Button>
          )}
          
          {canUserReview() && [UserRole.MENTOR, UserRole.SENIOR_SELLER, UserRole.ADMIN, UserRole.OWNER].includes(user?.role as UserRole) && (
            <Button
              variant="contained"
              onClick={() => navigate(`/reports/${report.id}/final-approval`)}
              sx={{
                borderRadius: 8,
                backgroundColor: '#3f1f4b',
                '&:hover': { backgroundColor: '#2a0f35' },
                px: 4,
                py: 1.2,
              }}
            >
              Утвердить как руководитель
            </Button>
          )}
        </Box>
      </Container>

      {/* Просмотр фото */}
      <PhotoViewer
        open={photoViewer.open}
        photos={photoViewer.photos}
        currentIndex={photoViewer.currentIndex}
        onClose={() => setPhotoViewer(prev => ({ ...prev, open: false }))}
        onIndexChange={(index) => setPhotoViewer(prev => ({ ...prev, currentIndex: index }))}
        getPhotoUrl={reportService.getPhotoUrl}
        forceMobile={false}
        disableThumbnails={photoViewer.photos.length <= 1}
      />
    </Box>
  );
};

export default ViewReportPage;