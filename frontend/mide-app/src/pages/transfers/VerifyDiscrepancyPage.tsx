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
  Inventory as InventoryIcon,
  PhotoCamera as PhotoCameraIcon,
  Schedule as ScheduleIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { PhotoViewer } from '../../components/PhotoViewer';
import { transferService } from '../../api/transferService';
import { productService } from '../../api/productService';
import {
  TransferDetail,
  TransferItem,
  TransferDiscrepancyItem,
  getTransferStatusText,
  getTransferStatusColor,
  Product,
} from '../../types';

const VerifyDiscrepancyPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [transfer, setTransfer] = useState<TransferDetail | null>(null);
  const [productDetails, setProductDetails] = useState<{ [key: number]: Product }>({});
  const [notes, setNotes] = useState('');
  const [expandedItems, setExpandedItems] = useState(true);

  const [approveDialog, setApproveDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [successDialog, setSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [photoViewer, setPhotoViewer] = useState<{
    open: boolean;
    photos: string[];
    currentIndex: number;
  }>({
    open: false,
    photos: [],
    currentIndex: 0,
  });

  // Загрузка данных перемещения
  useEffect(() => {
    const loadTransfer = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!id) {
          throw new Error('ID перемещения не указан');
        }

        const transferData = await transferService.getTransferById(Number(id));

        // Проверяем что перемещение требует проверки расхождений
        if (transferData.status !== 'CHECKING') {
          throw new Error('Это перемещение не требует проверки расхождений');
        }

        // Проверяем что у перемещения есть расхождения
        if (!transferData.discrepancyItems || transferData.discrepancyItems.length === 0) {
          throw new Error('У перемещения нет расхождений');
        }

        setTransfer(transferData);
        
        // Загружаем информацию о товарах
        await loadProductDetails(transferData);
        
      } catch (err: any) {
        setError(err.message || 'Ошибка при загрузке перемещения');
        console.error('Error loading transfer:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTransfer();
  }, [id]);

  const loadProductDetails = async (transferData: TransferDetail) => {
    try {
      const productIds = Array.from(new Set(transferData.items.map(item => item.productId)));
      
      const productPromises = productIds.map(async (productId) => {
        try {
          const product = await productService.getProductById(productId);
          return { id: productId, product };
        } catch (error) {
          return { id: productId, product: null };
        }
      });
      
      const productsData = await Promise.all(productPromises);
      const productMap: { [key: number]: Product } = {};
      productsData.forEach(item => {
        if (item.product) {
          productMap[item.id] = item.product;
        }
      });
      
      setProductDetails(productMap);
    } catch (error) {
      console.error('Error loading product details:', error);
    }
  };

  const getProductName = (productId: number): string => {
    return productDetails[productId]?.name || `Товар ${productId}`;
  };

  const getProductSku = (productId: number): string => {
    return productDetails[productId]?.sku || '';
  };

  const handleViewPhoto = (photos: string[], index: number) => {
    const processedPhotos = photos.map(photo => transferService.getPhotoUrl(photo));
    setPhotoViewer({
      open: true,
      photos: processedPhotos,
      currentIndex: index,
    });
  };

  const handleApprove = async () => {
    if (!transfer || !id) return;

    try {
      setVerifying(true);
      await transferService.approveDiscrepancy(Number(id), {
        approved: true,
        notes: notes.trim() || undefined,
      });
      setSuccessMessage('Расхождения успешно подтверждены');
      setSuccessDialog(true);
    } catch (err: any) {
      setError(err.message || 'Ошибка при подтверждении расхождений');
    } finally {
      setVerifying(false);
      setApproveDialog(false);
      setNotes('');
    }
  };

  const handleReject = async () => {
    if (!transfer || !id || !notes.trim()) return;

    try {
      setVerifying(true);
      await transferService.approveDiscrepancy(Number(id), {
        approved: false,
        notes: notes.trim(),
      });
      setSuccessMessage('Расхождения отклонены');
      setSuccessDialog(true);
    } catch (err: any) {
      setError(err.message || 'Ошибка при отклонении расхождений');
    } finally {
      setVerifying(false);
      setRejectDialog(false);
      setNotes('');
    }
  };

  const handleCancel = () => {
    navigate(`/movements/${id}`);
  };

  const handleSuccessClose = () => {
    setSuccessDialog(false);
    navigate(`/movements/${id}`);
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

  const getTotalDiscrepancy = () => {
    if (!transfer?.discrepancyItems) return 0;
    return transfer.discrepancyItems.reduce((sum, item) => sum + item.discrepancy, 0);
  };

  const getItemDiscrepancy = (productId: number): TransferDiscrepancyItem | null => {
    if (!transfer?.discrepancyItems) return null;
    return transfer.discrepancyItems.find(item => item.productId === productId) || null;
  };

  const isImageFile = (filename: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  };

  const getFileName = (filePath: string) => {
    return filePath.split('/').pop() || 'Файл';
  };

  // Сортируем товары: сначала с расхождениями, потом без
  const getSortedItems = () => {
    if (!transfer) return [];
    
    const itemsWithDiscrepancy: TransferItem[] = [];
    const itemsWithoutDiscrepancy: TransferItem[] = [];
    
    transfer.items.forEach(item => {
      const hasDiscrepancy = transfer.discrepancyItems?.some(d => d.productId === item.productId);
      if (hasDiscrepancy) {
        itemsWithDiscrepancy.push(item);
      } else {
        itemsWithoutDiscrepancy.push(item);
      }
    });
    
    return [...itemsWithDiscrepancy, ...itemsWithoutDiscrepancy];
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

  if (!transfer) {
    return (
      <Box sx={{ minHeight: '100vh', background: '#f5f3f6', py: 4 }}>
        <Container maxWidth="lg">
          <Alert 
            severity="error" 
            sx={{ 
              borderRadius: 8,
              backgroundColor: 'rgba(202, 14, 192, 0.08)',
              border: '1px solid rgba(202, 14, 192, 0.2)',
              color: '#ca0ec0',
              '& .MuiAlert-icon': { color: '#ca0ec0' }
            }}
          >
            Перемещение не найдено или не требует проверки расхождений
          </Alert>
        </Container>
      </Box>
    );
  }

  const totalDiscrepancy = getTotalDiscrepancy();
  const isPositiveTotal = totalDiscrepancy > 0;
  const isNegativeTotal = totalDiscrepancy < 0;
  const sortedItems = getSortedItems();

  return (
    <Box sx={{ minHeight: '100vh', py: 3, backgroundColor: '#f5f3f6' }}>
      {/* Плавающая кнопка назад для мобильных */}
      {isMobile && (
        <Fab
          onClick={() => navigate(`/movements/${id}`)}
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
            onClick={() => navigate(`/movements/${id}`)}
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
            Назад к перемещению
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
              Проверка расхождений
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Chip
                label={getTransferStatusText(transfer.status)}
                size="small"
                sx={{
                  backgroundColor: `${getTransferStatusColor(transfer.status)}15`,
                  color: getTransferStatusColor(transfer.status),
                  fontWeight: 500,
                  borderRadius: 6,
                }}
              />
              <Typography variant="caption" color="#4c5454">
                ID: #{transfer.id}
              </Typography>
            </Box>
          </Box>

          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Avatar sx={{ width: 44, height: 44, bgcolor: '#674fb6' }}>
                {transfer.title?.charAt(0)?.toUpperCase() || 'П'}
              </Avatar>
              <Box>
                <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontSize: '0.7rem', letterSpacing: 0.5 }}>
                  НАЗВАНИЕ
                </Typography>
                <Typography variant="body1" color="#2a0f35" fontWeight={600}>
                  {transfer.title}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <ScheduleIcon sx={{ fontSize: 16, color: '#4c5454', opacity: 0.7 }} />
                  <Typography variant="caption" color="#4c5454">
                    {formatDateTime(transfer.createdAt)}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontSize: '0.7rem', letterSpacing: 0.5 }}>
                  ОТПРАВИТЕЛЬ
                </Typography>
                <Typography variant="body2" color="#2a0f35" fontWeight={500}>
                  {transfer.fromUserName}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontSize: '0.7rem', letterSpacing: 0.5 }}>
                  ПОЛУЧАТЕЛЬ
                </Typography>
                <Typography variant="body2" color="#2a0f35" fontWeight={500}>
                  {transfer.toUserName}
                </Typography>
              </Grid>
            </Grid>

            {transfer.description && (
              <Box sx={{ p: 2, backgroundColor: '#f5f3f6', borderRadius: 8 }}>
                <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontSize: '0.7rem', fontWeight: 500, letterSpacing: 0.5 }}>
                  ОПИСАНИЕ
                </Typography>
                <Typography variant="body2" color="#2a0f35" sx={{ whiteSpace: 'pre-wrap' }}>
                  {transfer.description}
                </Typography>
              </Box>
            )}
          </Stack>
        </Card>

        {/* Общий итог расхождений */}
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
                ? (isPositiveTotal ? 'Обнаружен излишек на' : 'Обнаружена недостача на')
                : 'Расхождений нет'
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
          </Box>
        </Card>

        {/* ВСЕ ТОВАРЫ В ПЕРЕМЕЩЕНИИ */}
        <Card sx={{
          mb: 3,
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
        }}>
          <Box sx={{ p: { xs: 2, sm: 2.5 }, pb: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InventoryIcon sx={{ color: '#674fb6' }} />
                <Typography variant="subtitle1" color="#2a0f35" fontWeight={600}>
                  Товары ({transfer.items.length})
                </Typography>
              </Box>
              {transfer.discrepancyItems.length > 0 && (
                <Chip
                  icon={<WarningIcon />}
                  label={`${transfer.discrepancyItems.length} с расхождениями`}
                  size="small"
                  sx={{
                    backgroundColor: '#ff980015',
                    color: '#ff9800',
                    fontWeight: 500,
                    borderRadius: 8,
                  }}
                />
              )}
            </Box>
          </Box>

          <Box sx={{ width: '100%' }}>
            <Accordion
              expanded={expandedItems}
              onChange={() => setExpandedItems(!expandedItems)}
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
                  minHeight: 56,
                  '&.Mui-expanded': { minHeight: 56 },
                  px: { xs: 2, sm: 2.5 },
                  py: 1,
                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                }}
              >
                <Typography variant="body2" color="#4c5454">
                  {expandedItems ? 'Скрыть товары' : 'Показать товары'}
                </Typography>
              </AccordionSummary>

              <AccordionDetails sx={{ px: { xs: 2, sm: 2.5 }, pb: 3, pt: 2, backgroundColor: '#f5f3f6' }}>
                <Grid container spacing={2}>
                  {sortedItems.map((item, index) => {
                    const discrepancy = getItemDiscrepancy(item.productId);
                    const hasDiscrepancy = discrepancy !== null;
                    const isPositive = hasDiscrepancy && discrepancy.discrepancy > 0;
                    const isNegative = hasDiscrepancy && discrepancy.discrepancy < 0;
                    
                    return (
                      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                        <Card
                          sx={{
                            p: 2,
                            borderRadius: 8,
                            backgroundColor: '#ffffff',
                            boxShadow: '0 2px 8px rgba(106, 61, 122, 0.08)',
                            height: '100%',
                            transition: 'transform 0.2s ease',
                            border: hasDiscrepancy ? `2px solid ${
                              isPositive ? '#2196f3' : '#f44336'
                            }` : '2px solid transparent',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: '0 6px 16px rgba(106, 61, 122, 0.15)',
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="body2" color="#2a0f35" fontWeight={600} sx={{ flex: 1 }}>
                              {getProductName(item.productId)}
                            </Typography>
                            {hasDiscrepancy && (
                              <Chip
                                label={`${isPositive ? '+' : ''}${discrepancy.discrepancy}`}
                                size="small"
                                sx={{
                                  ml: 1,
                                  backgroundColor: isPositive ? '#2196f315' : '#f4433615',
                                  color: isPositive ? '#2196f3' : '#f44336',
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
                                  height: 20,
                                }}
                              />
                            )}
                          </Box>
                          
                          {getProductSku(item.productId) && (
                            <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                              Арт: {getProductSku(item.productId)}
                            </Typography>
                          )}
                          
                          <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            mt: 2,
                            pt: 1,
                            borderTop: '1px dashed rgba(0,0,0,0.1)'
                          }}>
                            <Box>
                              <Typography variant="caption" color="#4c5454" display="block">
                                Ожидалось
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {item.expectedQuantity} шт.
                              </Typography>
                            </Box>
                            
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="caption" color="#4c5454" display="block">
                                Получено
                              </Typography>
                              <Typography 
                                variant="body2" 
                                fontWeight={600}
                                color={hasDiscrepancy ? (isPositive ? '#2196f3' : '#f44336') : '#4caf50'}
                              >
                                {hasDiscrepancy ? discrepancy.actualQuantity : item.receivedQuantity || 0} шт.
                              </Typography>
                            </Box>
                          </Box>

                          {hasDiscrepancy && discrepancy.notes && (
                            <Box sx={{ 
                              mt: 1.5, 
                              pt: 1.5, 
                              borderTop: '1px dashed rgba(0,0,0,0.1)',
                              fontSize: '0.75rem',
                              color: '#4c5454'
                            }}>
                              <Typography variant="caption" color="#4c5454" display="block" fontWeight={500}>
                                Примечание получателя:
                              </Typography>
                              <Typography variant="caption" color="#4c5454">
                                {discrepancy.notes}
                              </Typography>
                            </Box>
                          )}
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Box>
        </Card>

        {/* Фотографии прикрепленные при расхождениях */}
        {transfer.discrepancyFiles && transfer.discrepancyFiles.length > 0 && (
          <Card sx={{
            mb: 3,
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
          }}>
            <Box sx={{ p: { xs: 2, sm: 2.5 }, pb: 2, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhotoCameraIcon sx={{ color: '#674fb6' }} />
                <Typography variant="subtitle1" color="#2a0f35" fontWeight={600}>
                  Фотографии при расхождениях ({transfer.discrepancyFiles.length})
                </Typography>
              </Box>
            </Box>

            <Box sx={{ p: { xs: 2, sm: 2.5 }, backgroundColor: '#f5f3f6' }}>
              <Grid container spacing={1.5}>
                {transfer.discrepancyFiles.map((file, index) => {
                  const fileName = getFileName(file);
                  const isImage = isImageFile(fileName);
                  const photoUrl = transferService.getPhotoUrl(file);

                  return (
                    <Grid size={{ xs: 6, sm: 4, md: 3 }} key={index}>
                      <Box
                        onClick={() => isImage ? handleViewPhoto(transfer.discrepancyFiles, index) : window.open(photoUrl, '_blank')}
                        sx={{
                          position: 'relative',
                          height: 100,
                          borderRadius: 8,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          backgroundColor: '#ffffff',
                          ...(isImage && {
                            backgroundImage: `url(${photoUrl})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }),
                          transition: 'transform 0.2s ease',
                          '&:hover': {
                            transform: 'scale(1.02)',
                            boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
                          },
                        }}
                      >
                        {!isImage && (
                          <Box sx={{ 
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex', 
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: 1,
                            backgroundColor: '#f5f3f6',
                          }}>
                            <InventoryIcon sx={{ fontSize: 30, color: '#4c5454', mb: 0.5 }} />
                            <Typography variant="caption" align="center" sx={{ color: '#4c5454' }}>
                              {fileName}
                            </Typography>
                          </Box>
                        )}
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
                          {isImage ? (
                            <PhotoCameraIcon sx={{ color: 'white', fontSize: 14 }} />
                          ) : (
                            <InventoryIcon sx={{ color: 'white', fontSize: 14 }} />
                          )}
                        </Box>
                      </Box>
                      <Typography variant="caption" align="center" display="block" sx={{ mt: 0.5, color: '#4c5454' }}>
                        {isImage ? `Фото ${index + 1}` : fileName}
                      </Typography>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          </Card>
        )}

        {/* Кнопки действий в стиле страницы ревизии */}
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
            Отклонить
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

      {/* Диалог подтверждения */}
      <Dialog
        open={approveDialog}
        onClose={() => {
          setApproveDialog(false);
          setNotes('');
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
            Подтверждение расхождений
          </Typography>
          <Typography variant="body2" color="#4c5454" sx={{ fontSize: '0.85rem' }}>
            Вы уверены, что хотите подтвердить расхождения?
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
                ИТОГ РАСХОЖДЕНИЙ
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
                placeholder="Дополнительная информация по расхождениям"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
              setNotes('');
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
            {verifying ? 'Сохранение...' : 'Подтвердить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог отклонения */}
      <Dialog
        open={rejectDialog}
        onClose={() => {
          setRejectDialog(false);
          setNotes('');
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
            Отклонение расхождений
          </Typography>
          <Typography variant="body2" color="#4c5454" sx={{ fontSize: '0.85rem' }}>
            Вы уверены, что хотите отклонить расхождения?
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
                ИТОГ РАСХОЖДЕНИЙ
              </Typography>
              <Typography variant="h5" color={isPositiveTotal ? '#1976d2' : isNegativeTotal ? '#d32f2f' : '#2e7d32'} fontWeight={700}>
                {isPositiveTotal ? '+' : ''}{totalDiscrepancy}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="#4c5454" sx={{ mb: 0.5, display: 'block', fontWeight: 600, fontSize: '0.75rem' }}>
                ПРИЧИНА ОТКЛОНЕНИЯ (ОБЯЗАТЕЛЬНО)
              </Typography>
              <TextField
                fullWidth
                placeholder="Укажите причину отклонения расхождений"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                multiline
                rows={3}
                error={!notes.trim()}
                helperText={!notes.trim() ? "Укажите причину отклонения" : ""}
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
              setRejectDialog(false);
              setNotes('');
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
            disabled={verifying || !notes.trim()}
            sx={{
              borderRadius: 4,
              backgroundColor: '#3f1f4b',
              '&:hover': { backgroundColor: '#2a0f35' },
              '&.Mui-disabled': {
                backgroundColor: '#d1c4e9',
              },
              px: 3,
              py: 1,
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 500,
            }}
          >
            {verifying ? 'Сохранение...' : 'Отклонить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог успеха */}
      <Dialog
        open={successDialog}
        onClose={handleSuccessClose}
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
            Статус перемещения обновлен
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 4 }}>
          <Button
            variant="contained"
            onClick={handleSuccessClose}
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
            К перемещению
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
        getPhotoUrl={(photo) => photo}
        forceMobile={false}
        disableThumbnails={photoViewer.photos.length <= 1}
      />
    </Box>
  );
};

export default VerifyDiscrepancyPage;