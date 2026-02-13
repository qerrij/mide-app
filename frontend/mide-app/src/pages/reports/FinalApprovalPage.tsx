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
  Schedule as ScheduleIcon,
  Inventory as InventoryIcon,
  Verified as VerifiedIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { reportService } from '../../api/reportService';
import { PhotoViewer } from '../../components/PhotoViewer';
import { Report, ReportStatus, UserRole } from '../../types';

const FinalApprovalPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [approveDialog, setApproveDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [successDialog, setSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const [comment, setComment] = useState<string>('');
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
        
        if (![UserRole.MENTOR, UserRole.SENIOR_SELLER, UserRole.ADMIN, UserRole.OWNER].includes(user?.role as UserRole)) {
          navigate('/reports');
          return;
        }
        
        if (reportData.status !== ReportStatus.AWAITING_MANAGER) {
          navigate(`/reports/${id}`);
          return;
        }
        
        if (reportData.accountantStatus !== ReportStatus.APPROVED) {
          navigate(`/reports/${id}`);
          return;
        }
        
        setReport(reportData);
      } catch (err: any) {
        setError(err.message || 'Ошибка при загрузке отчета');
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [id, user]);

  const handleViewPhoto = (photos: string[], index: number) => {
    setPhotoViewer({
      open: true,
      photos,
      currentIndex: index,
    });
  };

  const handleApprove = async () => {
    if (!report) return;

    try {
      setLoading(true);
      await reportService.finalApproveReport(
        report.id,
        'approve',
        comment || undefined
      );
      setSuccessMessage('Отчет успешно утвержден');
      setSuccessDialog(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка при утверждении отчета');
    } finally {
      setLoading(false);
      setApproveDialog(false);
    }
  };

  const handleReject = async () => {
    if (!report) return;
    if (!comment.trim()) {
      setError('Укажите причину отклонения');
      return;
    }

    try {
      setLoading(true);
      await reportService.finalApproveReport(
        report.id,
        'reject',
        comment
      );
      setSuccessMessage('Отчет отклонен');
      setSuccessDialog(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка при отклонении отчета');
    } finally {
      setLoading(false);
      setRejectDialog(false);
    }
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
          <Alert severity="error" sx={{ borderRadius: 4 }}>
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
            Назад к отчетам
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

        {/* Основная информация - объединенный блок с составителем */}
        <Card sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 8, boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)' }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h5" component="h1" color="#2a0f35" fontWeight={600} gutterBottom>
              Финальное утверждение #{report.id}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Chip
                label="Ожидает решения"
                size="small"
                sx={{
                  backgroundColor: 'rgba(255, 152, 0, 0.12)',
                  color: '#ed6c02',
                  fontWeight: 600,
                  borderRadius: 8,
                }}
              />
              <Chip
                label="Проверен бухгалтером"
                size="small"
                sx={{
                  backgroundColor: 'rgba(63, 31, 75, 0.1)',
                  color: '#3f1f4b',
                  fontWeight: 600,
                  borderRadius: 8,
                }}
              />
            </Box>
          </Box>

          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Avatar sx={{ width: 44, height: 44, bgcolor: '#674fb6' }}>
                {report.sellerName?.charAt(0)?.toUpperCase() || 'П'}
              </Avatar>
              <Box>
                <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontSize: '0.7rem', letterSpacing: 0.5 }}>
                  СОСТАВИТЕЛЬ
                </Typography>
                <Typography variant="body1" color="#2a0f35" fontWeight={600}>
                  {report.sellerName || `Пользователь ${report.sellerId}`}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <ScheduleIcon sx={{ fontSize: 16, color: '#4c5454', opacity: 0.7 }} />
                  <Typography variant="caption" color="#4c5454">
                    {formatDateTime(report.date)}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {report.comment && (
              <Box sx={{ p: 2, backgroundColor: '#f5f3f6', borderRadius: 8 }}>
                <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontSize: '0.7rem', fontWeight: 500, letterSpacing: 0.5 }}>
                  КОММЕНТАРИЙ СОСТАВИТЕЛЯ
                </Typography>
                <Typography variant="body2" color="#2a0f35" sx={{ whiteSpace: 'pre-wrap' }}>
                  {report.comment}
                </Typography>
              </Box>
            )}
          </Stack>
        </Card>

        {/* Финансовая информация - в стиле страницы просмотра отчета */}
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
              opacity: 0.12,
              zIndex: 0,
              backgroundImage: 'radial-gradient(circle, #56b8d1 1.5px, transparent 1.5px)',
              backgroundSize: '24px 24px',
            }}
          />
          
          <Box sx={{ position: 'relative', zIndex: 1, py: { xs: 2, sm: 3 } }}>
            <Typography variant="body2" color="#4c5454" gutterBottom>
              Финансовые показатели отчета
            </Typography>
            
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, md: 4 }}>
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
                    {report.transferAmount.toFixed(2)}₽
                  </Typography>
                </Box>
              </Grid>
              
              <Grid size={{ xs: 12, md: 4 }}>
                <Box>
                  <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                    Сумма продавца
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

              <Grid size={{ xs: 12, md: 4 }}>
                <Box>
                  <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                    Сумма бухгалтера
                  </Typography>
                  <Typography 
                    variant="h3" 
                    color="#3f1f4b" 
                    sx={{ 
                      fontWeight: 'bold',
                      fontSize: { xs: '2rem', sm: '2.5rem', md: '2.8rem' },
                      lineHeight: 1.2,
                    }}
                  >
                    {report.accountantFinalAmount?.toFixed(2)}₽
                  </Typography>
                </Box>
              </Grid>
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
                        borderRadius: 8,
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
                        borderRadius: 8,
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

        {/* Информация о бухгалтере */}
        {report.accountantName && (
          <Card sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 8, boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <VerifiedIcon sx={{ color: '#3f1f4b' }} />
              <Typography variant="h6" color="#2a0f35" fontWeight={600}>
                Проверка бухгалтера
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Avatar sx={{ width: 48, height: 48, bgcolor: '#3f1f4b' }}>
                {report.accountantName?.charAt(0)?.toUpperCase() || 'Б'}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body1" fontWeight={600} color="#2a0f35">
                  {report.accountantName}
                </Typography>
                <Typography variant="caption" color="#4c5454" display="block" sx={{ mt: 0.5 }}>
                  Проверен {formatDateTime(report.accountantReviewDate)}
                </Typography>
                
                {report.accountantComment && (
                  <Box sx={{ 
                    mt: 2, 
                    p: 2, 
                    backgroundColor: 'rgba(63, 31, 75, 0.04)',
                    borderRadius: 4,
                    borderLeft: '4px solid #3f1f4b',
                  }}>
                    <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: 0.5 }}>
                      КОММЕНТАРИЙ БУХГАЛТЕРА
                    </Typography>
                    <Typography variant="body2" color="#2a0f35">
                      {report.accountantComment}
                    </Typography>
                  </Box>
                )}
              </Box>
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
            onClick={() => setRejectDialog(true)}
            sx={{ 
              borderRadius: 4,
              px: 4, 
              py: 1.2,
              fontSize: '0.95rem',
              fontWeight: 600,
              borderWidth: 1.5,
              borderColor: 'rgba(202, 14, 192, 0.5)',
              color: '#ca0ec0',
              '&:hover': { 
                borderWidth: 1.5,
                borderColor: '#ca0ec0',
                backgroundColor: 'rgba(202, 14, 192, 0.04)',
              },
            }}
          >
            Отклонить
          </Button>
          <Button
            variant="contained"
            startIcon={<CheckCircleIcon />}
            onClick={() => setApproveDialog(true)}
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
            Утвердить
          </Button>
        </Box>
      </Container>

      {/* Диалог утверждения */}
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
            Подтверждение утверждения
          </Typography>
          <Typography variant="body2" color="#4c5454" sx={{ fontSize: '0.85rem' }}>
            Вы уверены, что хотите утвердить отчет?
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 2.5, pt: 2 }}>
          <Stack spacing={2.5}>
            <Box sx={{ 
              p: 2, 
              backgroundColor: 'rgba(63, 31, 75, 0.04)',
              borderRadius: 4,
              border: '1px solid rgba(63, 31, 75, 0.1)',
            }}>
              <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                СУММА К УТВЕРЖДЕНИЮ
              </Typography>
              <Typography variant="h5" color="#3f1f4b" fontWeight={700}>
                {report?.accountantFinalAmount?.toFixed(2)} ₽
              </Typography>
            </Box>
            
            <Box>
              <Typography variant="caption" color="#4c5454" sx={{ mb: 0.5, display: 'block', fontWeight: 600, fontSize: '0.75rem' }}>
                КОММЕНТАРИЙ (НЕОБЯЗАТЕЛЬНО)
              </Typography>
              <TextField
                fullWidth
                placeholder="Дополнительная информация по утверждению"
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
            Утвердить отчет
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог отклонения */}
      <Dialog
        open={rejectDialog}
        onClose={() => {
          setRejectDialog(false);
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
            Отклонение отчета
          </Typography>
          <Typography variant="body2" color="#4c5454" sx={{ fontSize: '0.85rem' }}>
            Укажите причину для возврата отчета на доработку
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 2.5, pt: 2 }}>
          <Box>
            <Typography variant="caption" color="#4c5454" sx={{ mb: 0.5, display: 'block', fontWeight: 600, fontSize: '0.75rem' }}>
              ПРИЧИНА ОТКЛОНЕНИЯ
            </Typography>
            <TextField
              fullWidth
              placeholder="Опишите, что нужно исправить в отчете"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              multiline
              rows={4}
              error={!comment.trim()}
              helperText={!comment.trim() ? 'Обязательное поле' : ''}
              sx={{ 
                '& .MuiOutlinedInput-root': { 
                  borderRadius: 4,
                  backgroundColor: '#f8f7fa',
                },
              }}
              autoFocus
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}>
          <Button
            onClick={() => {
              setRejectDialog(false);
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
            onClick={handleReject}
            disabled={!comment.trim()}
            sx={{ 
              borderRadius: 4,
              backgroundColor: '#ca0ec0',
              '&:hover': { backgroundColor: '#950090' },
              px: 3,
              py: 1,
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 500,
            }}
          >
            Отклонить отчет
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог успеха */}
      <Dialog
        open={successDialog}
        onClose={() => {
          setSuccessDialog(false);
          navigate('/reports');
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
            Отчет перемещен в историю проверок
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 4 }}>
          <Button
            variant="contained"
            onClick={() => {
              setSuccessDialog(false);
              navigate('/reports');
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
            К списку отчетов
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
        getPhotoUrl={reportService.getPhotoUrl}
        forceMobile={false}
        disableThumbnails={photoViewer.photos.length <= 1}
      />
    </Box>
  );
};

export default FinalApprovalPage;