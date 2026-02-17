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
  Card,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Fab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  useTheme,
  useMediaQuery,
  Paper,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  PhotoCamera as PhotoCameraIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { reportService } from '../../api/reportService';
import { PhotoViewer } from '../../components/PhotoViewer';
import { Report, ReportStatus, UserRole } from '../../types';

const AccountantReviewPage: React.FC = () => {
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
  
  const [finalAmount, setFinalAmount] = useState<string>('');
  const [finalAmountTouched, setFinalAmountTouched] = useState(false);
  const [comment, setComment] = useState<string>('');
  const [expandedPhotos, setExpandedPhotos] = useState(true);
  
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
        
        if (user?.role !== UserRole.ACCOUNTANT) {
          navigate('/reports');
          return;
        }
        
        if (reportData.status !== ReportStatus.AWAITING_ACCOUNTANT) {
          navigate(`/reports/${id}`);
          return;
        }
        
        setReport(reportData);
        // НЕ устанавливаем предзаполненную сумму, чтобы бухгалтер ввел её сам
        setFinalAmount('');
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
    
    const amount = parseFloat(finalAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Укажите корректную сумму');
      return;
    }

    try {
      setLoading(true);
      await reportService.reviewByAccountant(
        report.id,
        'approve',
        amount,
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
      await reportService.reviewByAccountant(
        report.id,
        'reject',
        undefined,
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

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFinalAmount(value);
    }
  };

  const handleAmountBlur = () => {
    setFinalAmountTouched(true);
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

  // Валидация суммы
  const isAmountValid = finalAmount !== '' && !isNaN(parseFloat(finalAmount)) && parseFloat(finalAmount) > 0;
  const showAmountError = finalAmountTouched && !isAmountValid;

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

        {/* Единая карточка */}
        <Card sx={{ 
          borderRadius: 12, 
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
          backgroundColor: '#ffffff',
        }}>
          {/* Header с статусом - светлый фон */}
          <Box sx={{ 
            p: { xs: 2.5, sm: 3 }, 
            borderBottom: '1px solid rgba(0,0,0,0.05)',
            backgroundColor: '#faf9fc', // Светлый фиолетовый оттенок
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
              <Typography variant="h5" color="#2a0f35" fontWeight={600}>
                Проверка отчета #{report.id}
              </Typography>
              <Chip
                label="Ожидает проверки"
                size="small"
                sx={{
                  backgroundColor: 'rgba(106, 61, 122, 0.12)',
                  color: '#6d3f57',
                  fontWeight: 600,
                  borderRadius: 6,
                }}
              />
            </Box>
          </Box>

          {/* Блок с составителем и датой */}
          <Box sx={{ 
            p: { xs: 2.5, sm: 3 },
            borderBottom: '1px solid rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            backgroundColor: '#ffffff',
          }}>
            <Avatar 
              sx={{ 
                width: 56, 
                height: 56, 
                bgcolor: '#674fb6',
                fontSize: '1.2rem',
                fontWeight: 500,
              }}
            >
              {report.sellerName?.charAt(0)?.toUpperCase() || 'П'}
            </Avatar>
            <Box>
              <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontSize: '0.7rem', letterSpacing: 0.5 }}>
                СОСТАВИТЕЛЬ
              </Typography>
              <Typography variant="h6" color="#2a0f35" fontWeight={600} sx={{ lineHeight: 1.2, mb: 0.5 }}>
                {report.sellerName || `Пользователь ${report.sellerId}`}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ScheduleIcon sx={{ fontSize: 16, color: '#4c5454', opacity: 0.7 }} />
                <Typography variant="body2" color="#4c5454" sx={{ fontSize: '0.85rem' }}>
                  {formatDate(report.date)} в {formatTime(report.date)}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Финансовая информация */}
          <Box sx={{ 
            p: { xs: 2.5, sm: 3 },
            borderBottom: '1px solid rgba(0,0,0,0.05)',
            backgroundColor: '#ffffff',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <Box 
              sx={{ 
                position: 'absolute', 
                top: 0, 
                right: 0, 
                width: 120, 
                height: 120, 
                opacity: 0.03,
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
            
            <Box sx={{ position: 'relative', zIndex: 1 }}>
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
              </Grid>
            </Box>
          </Box>

          {/* Комментарий составителя - отдельный блок с закругленными углами */}
          {report.comment && (
            <Box sx={{ 
              p: { xs: 2.5, sm: 3 },
              borderBottom: '1px solid rgba(0,0,0,0.05)',
              backgroundColor: '#ffffff',
            }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 4,
                  backgroundColor: '#f8f4ff', // Светло-фиолетовый фон
                  border: '1px solid rgba(103, 79, 182, 0.1)',
                }}
              >
                <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: 0.5 }}>
                  КОММЕНТАРИЙ СОСТАВИТЕЛЯ
                </Typography>
                <Typography variant="body2" color="#2a0f35" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem', lineHeight: 1.6 }}>
                  {report.comment}
                </Typography>
              </Paper>
            </Box>
          )}

          {/* Фотографии перевода - Аккордеон */}
          {report.transferPhotos && report.transferPhotos.length > 0 && (
            <Card sx={{ 
              borderRadius: 0,
              boxShadow: 'none',
              borderBottom: '1px solid rgba(0,0,0,0.05)',
            }}>
              <Accordion 
                expanded={expandedPhotos}
                onChange={() => setExpandedPhotos(!expandedPhotos)}
                sx={{
                  boxShadow: 'none',
                  '&:before': { display: 'none' },
                  backgroundColor: '#ffffff',
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: '#674fb6' }} />}
                  sx={{
                    px: { xs: 2.5, sm: 3 },
                    py: 1,
                    borderBottom: expandedPhotos ? '1px solid rgba(0,0,0,0.05)' : 'none',
                    '&.Mui-expanded': { minHeight: 56 },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <PhotoCameraIcon sx={{ color: '#674fb6' }} />
                    <Box>
                      <Typography variant="subtitle1" color="#2a0f35" fontWeight={600}>
                        Фотографии перевода
                      </Typography>
                      <Typography variant="caption" color="#4c5454">
                        {report.transferPhotos.length} {report.transferPhotos.length === 1 ? 'фотография' : 
                          report.transferPhotos.length >= 2 && report.transferPhotos.length <= 4 ? 'фотографии' : 'фотографий'}
                      </Typography>
                    </Box>
                  </Box>
                </AccordionSummary>
                
                <AccordionDetails sx={{ 
                  p: { xs: 2.5, sm: 3 }, 
                  backgroundColor: '#f5f3f6',
                }}>
                  <Grid container spacing={2}>
                    {report.transferPhotos.map((photo, index) => (
                      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                        <Box
                          onClick={() => handleViewPhoto(report.transferPhotos, index)}
                          sx={{
                            width: '100%',
                            height: 200,
                            borderRadius: 8,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            backgroundColor: '#ffffff',
                            backgroundImage: `url(${reportService.getPhotoUrl(photo)})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            transition: 'transform 0.2s ease',
                            '&:hover': {
                              transform: { xs: 'none', md: 'scale(1.01)' },
                            },
                            position: 'relative',
                            border: '1px solid rgba(103, 79, 182, 0.1)',
                          }}
                        >
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 12,
                              right: 12,
                              backgroundColor: 'rgba(42, 15, 53, 0.6)',
                              borderRadius: '50%',
                              p: 0.8,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 32,
                              height: 32,
                              backdropFilter: 'blur(4px)',
                            }}
                          >
                            <PhotoCameraIcon sx={{ color: 'white', fontSize: 18 }} />
                          </Box>
                          {report.transferPhotos.length > 1 && (
                            <Box
                              sx={{
                                position: 'absolute',
                                bottom: 12,
                                right: 12,
                                backgroundColor: 'rgba(42, 15, 53, 0.7)',
                                backdropFilter: 'blur(4px)',
                                borderRadius: 6,
                                px: 1.5,
                                py: 0.5,
                              }}
                            >
                              <Typography variant="caption" sx={{ color: 'white', fontWeight: 600 }}>
                                {index + 1} / {report.transferPhotos.length}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Card>
          )}

          {/* Кнопки действий - по центру, с фоном */}
          <Box sx={{ 
            p: { xs: 2.5, sm: 3 },
            display: 'flex', 
            gap: 2,
            justifyContent: 'center',
            flexDirection: { xs: 'row', md: 'row' },
            backgroundColor: '#faf9fc', // Светлый фиолетовый оттенок
            borderTop: '1px solid rgba(103, 79, 182, 0.1)',
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
              onClick={() => {
                setApproveDialog(true);
                setFinalAmountTouched(false);
              }}
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
        </Card>
      </Container>

      {/* Диалог утверждения */}
      <Dialog
        open={approveDialog}
        onClose={() => {
          setApproveDialog(false);
          setComment('');
          setFinalAmount('');
          setFinalAmountTouched(false);
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
        <DialogTitle sx={{ p: 3, pb: 1 }}>
          <Typography variant="h6" color="#2a0f35" fontWeight={600} sx={{ mb: 0.5 }}>
            Утверждение отчета
          </Typography>
          <Typography variant="body2" color="#4c5454" sx={{ fontSize: '0.85rem' }}>
            Укажите окончательную сумму перевода
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 2 }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="caption" color="#4c5454" sx={{ mb: 0.5, display: 'block', fontWeight: 600, fontSize: '0.75rem' }}>
                ОКОНЧАТЕЛЬНАЯ СУММА ПЕРЕВОДА <Box component="span" sx={{ color: '#ca0ec0' }}>*</Box>
              </Typography>
              <TextField
                fullWidth
                placeholder="0.00"
                type="text"
                value={finalAmount}
                onChange={handleAmountChange}
                onBlur={handleAmountBlur}
                InputProps={{
                  endAdornment: <InputAdornment position="end">₽</InputAdornment>,
                }}
                sx={{ 
                  '& .MuiOutlinedInput-root': { 
                    borderRadius: 4,
                    backgroundColor: '#f8f7fa',
                    '& fieldset': {
                      borderColor: showAmountError ? '#ca0ec0' : 'rgba(103, 79, 182, 0.2)',
                    },
                    '&:hover fieldset': {
                      borderColor: showAmountError ? '#ca0ec0' : 'rgba(103, 79, 182, 0.4)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: showAmountError ? '#ca0ec0' : '#674fb6',
                    },
                  },
                }}
                error={showAmountError}
                helperText={showAmountError ? 'Укажите сумму перевода' : ''}
                required
              />
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
        <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
          <Button
            onClick={() => {
              setApproveDialog(false);
              setComment('');
              setFinalAmount('');
              setFinalAmountTouched(false);
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
            disabled={!isAmountValid}
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
        <DialogTitle sx={{ p: 3, pb: 1 }}>
          <Typography variant="h6" color="#2a0f35" fontWeight={600} sx={{ mb: 0.5 }}>
            Отклонение отчета
          </Typography>
          <Typography variant="body2" color="#4c5454" sx={{ fontSize: '0.85rem' }}>
            Укажите причину для возврата отчета на доработку
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 2 }}>
          <Box>
            <Typography variant="caption" color="#4c5454" sx={{ mb: 0.5, display: 'block', fontWeight: 600, fontSize: '0.75rem' }}>
              ПРИЧИНА ОТКЛОНЕНИЯ <Box component="span" sx={{ color: '#ca0ec0' }}>*</Box>
            </Typography>
            <TextField
              fullWidth
              placeholder="Опишите, что нужно исправить в отчете"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              multiline
              rows={4}
              error={!comment.trim()}
              helperText={!comment.trim() ? 'Укажите причину отклонения' : ''}
              sx={{ 
                '& .MuiOutlinedInput-root': { 
                  borderRadius: 4,
                  backgroundColor: '#f8f7fa',
                },
              }}
              autoFocus
              required
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
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

export default AccountantReviewPage;