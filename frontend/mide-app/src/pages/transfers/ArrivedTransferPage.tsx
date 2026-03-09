import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  Divider,
  Card,
  CardContent,
  IconButton,
  TextField,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as AcceptIcon,
  Cancel as RejectIcon,
  Warning as DiscrepancyIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  PhotoCamera as PhotoCameraIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { transferService } from '../../api/transferService';
import { productService } from '../../api/productService';
import {
  TransferDetail,
  TransferItem,
  TransferItemStatus,
  getTransferItemStatusText,
  getTransferItemStatusColor,
  Product,
} from '../../types';
import { PhotoViewer } from '../../components/PhotoViewer';

const ArrivedTransferPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [transfer, setTransfer] = useState<TransferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [productDetails, setProductDetails] = useState<{ [key: number]: Product }>({});
  
  const [action, setAction] = useState<'accept' | 'reject' | 'discrepancy'>('accept');
  const [notes, setNotes] = useState('');
  const [itemQuantities, setItemQuantities] = useState<{ [key: number]: number }>({});
  
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [fileError, setFileError] = useState('');
  
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [successDialog, setSuccessDialog] = useState(false);
  const [exitDialog, setExitDialog] = useState(false);
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
    if (id) {
      loadTransfer();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const loadTransfer = async () => {
    try {
      setLoading(true);
      const transferData = await transferService.getTransferById(Number(id));
      
      if (transferData.status !== 'IN_TRANSIT') {
        setError('Это перемещение нельзя принять в текущем статусе');
        setTimeout(() => navigate(`/movements/${id}`), 2000);
        return;
      }
      
      setTransfer(transferData);
      
      const quantities: { [key: number]: number } = {};
      transferData.items.forEach(item => {
        quantities[item.productId] = item.expectedQuantity;
      });
      setItemQuantities(quantities);
      
      await loadProductDetails(transferData.items);
    } catch (error) {
      console.error('Error loading transfer:', error);
      setError('Ошибка загрузки перемещения');
    } finally {
      setLoading(false);
    }
  };

  const loadProductDetails = async (items: TransferItem[]) => {
    try {
      const productIds = Array.from(new Set(items.map(item => item.productId)));
      
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const newFiles = Array.from(e.target.files);
    
    for (const file of newFiles) {
      if (!file.type.startsWith('image/')) {
        setFileError(`Файл "${file.name}" не является изображением`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setFileError(`Файл "${file.name}" слишком большой (макс. 10MB)`);
        return;
      }
    }
    
    if (files.length + newFiles.length > 10) {
      setFileError('Можно загрузить не более 10 файлов');
      return;
    }
    
    setFiles(prev => [...prev, ...newFiles]);
    
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setFilePreviews(prev => [...prev, ...newPreviews]);
    
    setFileError('');
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(filePreviews[index]);
    
    const newFiles = [...files];
    const newPreviews = [...filePreviews];
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    
    setFiles(newFiles);
    setFilePreviews(newPreviews);
  };

  const handleQuantityChange = (productId: number, quantity: number) => {
    setItemQuantities({
      ...itemQuantities,
      [productId]: Math.max(0, quantity)
    });
  };

  const getItemStatus = (item: TransferItem): TransferItemStatus => {
    const actual = itemQuantities[item.productId] || 0;
    
    if (action === 'reject') return TransferItemStatus.REJECTED;
    if (actual === item.expectedQuantity) return TransferItemStatus.RECEIVED;
    if (actual < item.expectedQuantity) return TransferItemStatus.MISSING;
    return TransferItemStatus.EXCESS;
  };

  const getDiscrepancy = (item: TransferItem) => {
    const actual = itemQuantities[item.productId] || 0;
    return actual - item.expectedQuantity;
  };

  const getProductName = (productId: number): string => {
    return productDetails[productId]?.name || `Товар ${productId}`;
  };

  const getProductSku = (productId: number): string => {
    return productDetails[productId]?.sku || '';
  };

  const getPhotoPreviewUrl = (photo: File): string => {
    return URL.createObjectURL(photo);
  };

  const handleViewPhoto = (photos: string[], index: number) => {
    setPhotoViewer({
      open: true,
      photos,
      currentIndex: index,
    });
  };

  const validateStep = (stepNumber: number): boolean => {
    setError(null);

    switch (stepNumber) {
      case 0:
        return true;

      case 1:
        if (action === 'reject') {
          if (!notes.trim()) {
            setError('Укажите причину отклонения');
            return false;
          }
          return true;
        } else {
          if (!transfer?.items) {
            setError('Данные о товарах отсутствуют');
            return false;
          }
          for (const item of transfer.items) {
            const quantity = itemQuantities[item.productId];
            if (quantity === undefined || quantity < 0) {
              setError('Укажите корректное количество для всех товаров');
              return false;
            }
          }
          return true;
        }

      case 2:
        if (action !== 'reject' && files.length === 0) {
          setError('Необходимо прикрепить хотя бы одну фотографию');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleExitClick = () => {
    const hasData = files.length > 0 || notes || action !== 'accept';
    if (hasData) {
      setExitDialog(true);
    } else {
      navigate(`/movements/${id}`);
    }
  };

  const handleSubmit = async () => {
    if (!transfer) return;
    
    try {
      setSubmitting(true);
      
      const arrivalData = {
        action,
        items: action === 'reject' ? [] : transfer.items.map(item => ({
          productId: item.productId,
          actualQuantity: itemQuantities[item.productId] || 0,
          notes: item.notes,
        })),
        notes: notes.trim() || undefined,
      };
      
      const filesToSend = action === 'reject' ? [] : files;
      
      await transferService.markArrived(
        Number(id), 
        arrivalData, 
        filesToSend
      );
      
      setSuccessDialog(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка при обработке перемещения');
    } finally {
      setSubmitting(false);
      setConfirmDialog(false);
    }
  };

  const getActionText = () => {
    switch (action) {
      case 'accept': return 'принять';
      case 'reject': return 'отклонить';
      case 'discrepancy': return 'принять с расхождениями';
      default: return '';
    }
  };

  const getActionButtonText = () => {
    switch (action) {
      case 'accept': return 'Принять';
      case 'reject': return 'Отклонить';
      case 'discrepancy': return 'Принять с расхождениями';
      default: return '';
    }
  };

  const getActionColor = () => {
    switch (action) {
      case 'accept': return '#4caf50';
      case 'reject': return '#f44336';
      case 'discrepancy': return '#ff9800';
      default: return '#674fb6';
    }
  };

  const totalExpected = transfer?.totalQuantity || 0;
  const totalActual = Object.values(itemQuantities).reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        backgroundColor: '#f5f3f6', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <CircularProgress sx={{ color: '#674fb6' }} />
      </Box>
    );
  }

  if (!transfer) {
    return null;
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f3f6', 
      pt: { xs: 2, md: 4 }
    }}>
      <Container 
        maxWidth="md" 
        sx={{ 
          px: { xs: 1, sm: 2, md: 3 },
        }}
      >

        <Paper
          sx={{
            p: { xs: 1.5, sm: 2, md: 3 },
            borderRadius: { xs: 6, sm: 8 },
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
            width: '100%',
            mb: 3,
          }}
        >
          <Box sx={{ mb: { xs: 2, sm: 3 } }}>
            <Typography variant="h5" color="#2a0f35" fontWeight={600} gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
              Прием товара
            </Typography>
            <Typography variant="body2" color="#4c5454" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
              Перемещение #{transfer?.id}: {transfer?.title || 'Без названия'}
            </Typography>
          </Box>

          <Card sx={{ 
            borderRadius: { xs: 4, sm: 4 }, 
            backgroundColor: '#f8f7fa',
            border: '1px solid rgba(63, 31, 75, 0.1)',
            mb: { xs: 2, sm: 3 },
          }}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
              <Grid container spacing={{ xs: 1, sm: 2 }}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                    Отправитель
                  </Typography>
                  <Typography variant="body2" color="#2a0f35" fontWeight={500} sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                    {transfer?.fromUserName || 'Не указан'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                    Получатель
                  </Typography>
                  <Typography variant="body2" color="#2a0f35" fontWeight={500} sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                    {transfer?.toUserName || 'Не указан'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                    Товаров
                  </Typography>
                  <Typography variant="body2" color="#2a0f35" fontWeight={500} sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                    {transfer?.items?.length || 0} позиций
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                    Ожидается
                  </Typography>
                  <Typography variant="body2" color="#2a0f35" fontWeight={500} sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                    {totalExpected} ед.
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Typography variant="h6" color="#2a0f35" fontWeight={600} sx={{ 
            mb: { xs: 2, sm: 3 },
            fontSize: { xs: '1rem', sm: '1.25rem' }
          }}>
            {step === 0 && 'Выберите действие'}
            {step === 1 && (action === 'reject' ? 'Причина отклонения' : 'Укажите фактическое количество')}
            {step === 2 && (action === 'reject' ? 'Подтверждение' : 'Фотографии и подтверждение')}
          </Typography>

          {error && (
            <Alert
              severity="error"
              sx={{
                mb: { xs: 2, sm: 3 },
                borderRadius: 4,
                backgroundColor: 'rgba(202, 14, 192, 0.08)',
                border: '1px solid rgba(202, 14, 192, 0.2)',
                color: '#ca0ec0',
                '& .MuiAlert-icon': { color: '#ca0ec0' },
                fontSize: { xs: '0.8rem', sm: '0.875rem' },
              }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}

          {/* Шаг 0: Выбор действия */}
          {step === 0 && (
            <Stack spacing={2}>
              <FormControl component="fieldset">
                <RadioGroup
                  value={action}
                  onChange={(e) => setAction(e.target.value as any)}
                >
                  <Paper
                    sx={{
                      p: { xs: 1.5, sm: 2 },
                      mb: 1.5,
                      borderRadius: 4,
                      border: '2px solid',
                      borderColor: action === 'accept' ? '#4caf50' : 'rgba(103, 79, 182, 0.1)',
                      backgroundColor: action === 'accept' ? 'rgba(76, 175, 80, 0.04)' : '#f8f7fa',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: '#4caf50',
                        backgroundColor: 'rgba(76, 175, 80, 0.04)',
                      },
                    }}
                    onClick={() => setAction('accept')}
                  >
                    <FormControlLabel
                      value="accept"
                      control={<Radio sx={{ color: '#4caf50', '&.Mui-checked': { color: '#4caf50' } }} />}
                      label={
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <AcceptIcon sx={{ color: '#4caf50', fontSize: { xs: 18, sm: 24 } }} />
                            <Typography variant="subtitle1" color="#2a0f35" fontWeight={600} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                              Принять товар
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="#4c5454" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                            Укажите фактическое количество. Товары сразу списываются и зачисляются.
                          </Typography>
                        </Box>
                      }
                      sx={{ m: 0, width: '100%', alignItems: 'flex-start' }}
                    />
                  </Paper>

                  <Paper
                    sx={{
                      p: { xs: 1.5, sm: 2 },
                      mb: 1.5,
                      borderRadius: 4,
                      border: '2px solid',
                      borderColor: action === 'discrepancy' ? '#ff9800' : 'rgba(103, 79, 182, 0.1)',
                      backgroundColor: action === 'discrepancy' ? 'rgba(255, 152, 0, 0.04)' : '#f8f7fa',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: '#ff9800',
                        backgroundColor: 'rgba(255, 152, 0, 0.04)',
                      },
                    }}
                    onClick={() => setAction('discrepancy')}
                  >
                    <FormControlLabel
                      value="discrepancy"
                      control={<Radio sx={{ color: '#ff9800', '&.Mui-checked': { color: '#ff9800' } }} />}
                      label={
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <DiscrepancyIcon sx={{ color: '#ff9800', fontSize: { xs: 18, sm: 24 } }} />
                            <Typography variant="subtitle1" color="#2a0f35" fontWeight={600} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                              Принять с расхождениями
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="#4c5454" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                            Требуется проверка руководителя перед списанием товаров.
                          </Typography>
                        </Box>
                      }
                      sx={{ m: 0, width: '100%', alignItems: 'flex-start' }}
                    />
                  </Paper>

                  <Paper
                    sx={{
                      p: { xs: 1.5, sm: 2 },
                      borderRadius: 4,
                      border: '2px solid',
                      borderColor: action === 'reject' ? '#f44336' : 'rgba(103, 79, 182, 0.1)',
                      backgroundColor: action === 'reject' ? 'rgba(244, 67, 54, 0.04)' : '#f8f7fa',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: '#f44336',
                        backgroundColor: 'rgba(244, 67, 54, 0.04)',
                      },
                    }}
                    onClick={() => setAction('reject')}
                  >
                    <FormControlLabel
                      value="reject"
                      control={<Radio sx={{ color: '#f44336', '&.Mui-checked': { color: '#f44336' } }} />}
                      label={
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <RejectIcon sx={{ color: '#f44336', fontSize: { xs: 18, sm: 24 } }} />
                            <Typography variant="subtitle1" color="#2a0f35" fontWeight={600} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                              Отклонить полностью
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="#4c5454" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                            Все товары возвращаются отправителю без проверки количеств.
                          </Typography>
                        </Box>
                      }
                      sx={{ m: 0, width: '100%', alignItems: 'flex-start' }}
                    />
                  </Paper>
                </RadioGroup>
              </FormControl>
            </Stack>
          )}

          {/* Шаг 1: Указание количеств или причина отклонения */}
          {step === 1 && (
            <>
              {action === 'reject' ? (
                <Stack spacing={3}>
                  <Alert severity="warning" sx={{ borderRadius: 4, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                    <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                      <strong>Вы выбрали отклонение перемещения.</strong>
                      <br />
                      При подтверждении все товары будут возвращены отправителю.
                    </Typography>
                  </Alert>

                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Причина отклонения *"
                    placeholder="Укажите причину, по которой вы отклоняете перемещение..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 4,
                        backgroundColor: '#f8f7fa',
                        fontSize: { xs: '0.85rem', sm: '0.95rem' },
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: { xs: '0.85rem', sm: '0.95rem' },
                      },
                    }}
                  />
                </Stack>
              ) : (
                <Stack spacing={2}>
                  {/* Карточки товаров вместо таблицы */}
                  {transfer.items.map((item) => {
                    const actual = itemQuantities[item.productId] || 0;
                    const discrepancy = getDiscrepancy(item);
                    const status = getItemStatus(item);
                    
                    return (
                      <Card
                        key={item.productId}
                        sx={{
                          p: { xs: 1.5, sm: 2 },
                          borderRadius: 4,
                          backgroundColor: '#f8f7fa',
                          border: '1px solid rgba(103, 79, 182, 0.1)',
                        }}
                      >
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'flex-start',
                          mb: 1.5
                        }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight={600} color="#2a0f35" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                              {getProductName(item.productId)}
                            </Typography>
                            <Typography variant="caption" color="#4c5454" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                              Арт: {getProductSku(item.productId) || '---'}
                            </Typography>
                          </Box>
                          <Chip
                            label={getTransferItemStatusText(status)}
                            size="small"
                            sx={{
                              backgroundColor: `${getTransferItemStatusColor(status)}20`,
                              color: getTransferItemStatusColor(status),
                              fontWeight: 500,
                              fontSize: { xs: '0.65rem', sm: '0.7rem' },
                              height: { xs: 20, sm: 24 },
                            }}
                          />
                        </Box>

                        <Grid container spacing={1.5} alignItems="center">
                          <Grid size={{ xs: 5, sm: 4 }}>
                            <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' } }}>
                              Ожидалось
                            </Typography>
                            <Typography variant="body2" fontWeight={500} color="#2a0f35" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                              {item.expectedQuantity} шт.
                            </Typography>
                          </Grid>
                          
                          <Grid size={{ xs: 7, sm: 8 }}>
                            <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontSize: { xs: '0.65rem', sm: '0.7rem' } }}>
                              Фактически получено
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <IconButton
                                size="small"
                                onClick={() => handleQuantityChange(item.productId, actual - 1)}
                                disabled={actual <= 0}
                                sx={{ 
                                  color: '#674fb6',
                                  p: { xs: 0.5, sm: 1 },
                                }}
                              >
                                <RemoveIcon fontSize={isMobile ? 'small' : 'medium'} />
                              </IconButton>
                              <TextField
                                type="number"
                                value={actual}
                                onChange={(e) => handleQuantityChange(item.productId, Number(e.target.value))}
                                size="small"
                                sx={{ 
                                  width: { xs: 70, sm: 100 },
                                  mx: 0.5,
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: 4,
                                    backgroundColor: '#ffffff',
                                    fontSize: { xs: '0.85rem', sm: '0.95rem' },
                                  },
                                  '& input': {
                                    textAlign: 'center',
                                    py: { xs: 0.5, sm: 1 },
                                  },
                                }}
                                inputProps={{ min: 0 }}
                              />
                              <IconButton
                                size="small"
                                onClick={() => handleQuantityChange(item.productId, actual + 1)}
                                sx={{ 
                                  color: '#674fb6',
                                  p: { xs: 0.5, sm: 1 },
                                }}
                              >
                                <AddIcon fontSize={isMobile ? 'small' : 'medium'} />
                              </IconButton>
                            </Box>
                          </Grid>

                          <Grid size={{ xs: 12 }}>
                            <Box sx={{ 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              mt: 1,
                              pt: 1,
                              borderTop: '1px dashed rgba(103, 79, 182, 0.2)',
                            }}>
                              <Typography variant="caption" color="#4c5454" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                                Разница
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                color: discrepancy === 0 ? '#4c5454' : 
                                       discrepancy > 0 ? '#4caf50' : '#f44336',
                                fontWeight: 600,
                                fontSize: { xs: '0.9rem', sm: '1rem' },
                              }}>
                                {discrepancy > 0 ? '+' : ''}{discrepancy} шт.
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </Card>
                    );
                  })}

                  {/* Сводка по количествам */}
                  <Card sx={{ 
                    borderRadius: 4, 
                    backgroundColor: 'rgba(63, 31, 75, 0.04)',
                    border: '1px solid rgba(63, 31, 75, 0.1)',
                    mt: 2,
                  }}>
                    <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                            Всего ожидается
                          </Typography>
                          <Typography variant="h6" color="#2a0f35" fontWeight={600} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                            {totalExpected} ед.
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                            Всего фактически
                          </Typography>
                          <Typography variant="h6" color={totalActual === totalExpected ? '#2a0f35' : '#ff9800'} fontWeight={600} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                            {totalActual} ед.
                          </Typography>
                        </Grid>
                      </Grid>
                      {action === 'discrepancy' && (
                        <Typography variant="caption" color="#ff9800" display="block" sx={{ mt: 1, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                          При расхождениях требуется подтверждение руководителя
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Stack>
              )}
            </>
          )}

          {/* Шаг 2: Фотографии и подтверждение */}
          {step === 2 && (
            <Stack spacing={3}>
              {action !== 'reject' && (
                <>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="photo-upload"
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                  />
                  
                  <Box
                    sx={{
                      border: '2px dashed rgba(103, 79, 182, 0.3)',
                      p: { xs: 2, sm: 4 },
                      borderRadius: 4,
                      textAlign: 'center',
                      backgroundColor: '#f8f7fa',
                      cursor: files.length >= 10 ? 'not-allowed' : 'pointer',
                      opacity: files.length >= 10 ? 0.6 : 1,
                      transition: 'all 0.2s',
                      '&:hover': files.length < 10 ? {
                        borderColor: '#674fb6',
                        backgroundColor: 'rgba(103, 79, 182, 0.02)',
                      } : {},
                    }}
                    onClick={() => {
                      if (files.length < 10) {
                        document.getElementById('photo-upload')?.click();
                      }
                    }}
                  >
                    <PhotoCameraIcon sx={{ fontSize: { xs: 36, sm: 48 }, color: '#674fb6', mb: 1 }} />
                    <Typography variant="body1" color="#2a0f35" fontWeight={500} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                      {files.length > 0 ? 'Добавить еще фотографии' : 'Прикрепить фотографии товаров'}
                    </Typography>
                    <Typography variant="caption" color="#4c5454" display="block" sx={{ mt: 1, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                      {files.length}/10 фотографий • Максимум 10MB на файл
                    </Typography>
                  </Box>

                  {fileError && (
                    <Alert severity="error" sx={{ borderRadius: 4, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                      {fileError}
                    </Alert>
                  )}

                  {files.length > 0 && (
                    <Grid container spacing={1}>
                      {files.map((file, index) => {
                        const photoUrl = getPhotoPreviewUrl(file);
                        
                        return (
                          <Grid size={{ xs: 6, sm: 4, md: 3 }} key={index}>
                            <Box
                              sx={{
                                position: 'relative',
                                width: '100%',
                                paddingBottom: '100%',
                                borderRadius: 4,
                                overflow: 'hidden',
                                cursor: 'pointer',
                                backgroundImage: `url(${photoUrl})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                transition: 'transform 0.2s ease',
                                '&:hover': {
                                  transform: { xs: 'none', md: 'scale(1.02)' },
                                },
                              }}
                              onClick={() => handleViewPhoto([photoUrl], 0)}
                            >
                              <IconButton
                                size="small"
                                sx={{
                                  position: 'absolute',
                                  top: 4,
                                  right: 4,
                                  backgroundColor: 'rgba(42, 15, 53, 0.6)',
                                  backdropFilter: 'blur(4px)',
                                  zIndex: 1,
                                  padding: { xs: 0.5, sm: 0.75 },
                                  '&:hover': { backgroundColor: 'rgba(42, 15, 53, 0.8)' },
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFile(index);
                                }}
                              >
                                <CloseIcon sx={{ color: 'white', fontSize: { xs: 14, sm: 18 } }} />
                              </IconButton>
                            </Box>
                          </Grid>
                        );
                      })}
                    </Grid>
                  )}
                </>
              )}

              <Divider />

              <Card sx={{ 
                borderRadius: 4, 
                backgroundColor: 'rgba(63, 31, 75, 0.04)',
                border: '1px solid rgba(63, 31, 75, 0.1)',
              }}>
                <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
                  <Typography variant="subtitle2" color="#2a0f35" fontWeight={600} gutterBottom sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    fontSize: { xs: '0.85rem', sm: '0.95rem' }
                  }}>
                    <CheckCircleIcon sx={{ color: '#3f1f4b', fontSize: { xs: 18, sm: 20 } }} />
                    Сводка по перемещению
                  </Typography>
                  
                  <Divider sx={{ my: { xs: 1.5, sm: 2 }, borderColor: 'rgba(63, 31, 75, 0.1)' }} />
                  
                  <Grid container spacing={1.5}>
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                        Действие
                      </Typography>
                      <Typography variant="h6" color={getActionColor()} fontWeight={600} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                        {getActionText().toUpperCase()}
                      </Typography>
                    </Grid>
                    
                    <Grid size={{ xs: 6, sm: 3 }}>
                      <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                        {action === 'reject' ? 'Причина' : 'Количество'}
                      </Typography>
                      <Typography variant="h6" color="#2a0f35" fontWeight={600} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                        {action === 'reject' 
                          ? notes ? 'Указана' : 'Не указана'
                          : `${totalActual} / ${totalExpected}`
                        }
                      </Typography>
                    </Grid>
                    
                    {action !== 'reject' && (
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                          Фотографии
                        </Typography>
                        <Typography variant="h6" color="#2a0f35" fontWeight={600} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                          {files.length} шт.
                        </Typography>
                      </Grid>
                    )}
                    
                    <Grid size={{ xs: 6, sm: action === 'reject' ? 6 : 3 }}>
                      <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                        Получатель
                      </Typography>
                      <Typography variant="h6" color="#674fb6" fontWeight={600} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                        {transfer?.toUserName?.split(' ')[0] || 'Не указан'}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  {action === 'reject' && notes && (
                    <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px dashed rgba(63, 31, 75, 0.2)' }}>
                      <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>
                        ПРИЧИНА ОТКЛОНЕНИЯ
                      </Typography>
                      <Typography variant="body2" color="#2a0f35" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                        {notes}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Stack>
          )}

          {/* Кнопки навигации */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            mt: { xs: 3, sm: 4 },
            gap: { xs: 1, sm: 2 },
          }}>
            {step > 0 ? (
              <Button
                variant="outlined"
                onClick={handleBack}
                disabled={submitting}
                sx={{
                  borderRadius: 4,
                  borderColor: '#d8d1e0',
                  color: '#674fb6',
                  '&:hover': {
                    borderColor: '#674fb6',
                    backgroundColor: 'rgba(103, 79, 182, 0.04)',
                  },
                  fontSize: { xs: '0.8rem', sm: '0.95rem' },
                  py: { xs: 1, sm: 1.5 },
                  minWidth: { xs: '80px', sm: '100px' },
                }}
              >
                Назад
              </Button>
            ) : (
              <Button
                variant="outlined"
                onClick={handleExitClick}
                disabled={submitting}
                sx={{
                  borderRadius: 4,
                  borderColor: '#d8d1e0',
                  color: '#ca0ec0',
                  '&:hover': {
                    borderColor: '#ca0ec0',
                    backgroundColor: 'rgba(202, 14, 192, 0.04)',
                  },
                  fontSize: { xs: '0.8rem', sm: '0.95rem' },
                  py: { xs: 1, sm: 1.5 },
                  minWidth: { xs: '80px', sm: '100px' },
                }}
              >
                Выйти
              </Button>
            )}
            
            <Box sx={{ flex: 1 }} />
            
            {step < 2 ? (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={submitting}
                sx={{
                  borderRadius: 4,
                  backgroundColor: '#674fb6',
                  '&:hover': { backgroundColor: '#483399' },
                  fontSize: { xs: '0.8rem', sm: '0.95rem' },
                  py: { xs: 1, sm: 1.5 },
                  px: { xs: 3, sm: 4 },
                  minWidth: { xs: '80px', sm: '100px' },
                }}
              >
                Далее
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={() => setConfirmDialog(true)}
                disabled={submitting || (action !== 'reject' && files.length === 0)}
                sx={{
                  borderRadius: 4,
                  backgroundColor: getActionColor(),
                  '&:hover': { 
                    backgroundColor: 
                      action === 'accept' ? '#388e3c' : 
                      action === 'discrepancy' ? '#f57c00' : '#d32f2f',
                  },
                  fontSize: { xs: '0.8rem', sm: '0.95rem' },
                  py: { xs: 1, sm: 1.5 },
                  px: { xs: 2, sm: 3 },
                  whiteSpace: 'nowrap',
                }}
              >
                {submitting ? <CircularProgress size={20} sx={{ color: 'white' }} /> : getActionButtonText()}
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
        <DialogTitle sx={{ p: { xs: 2, sm: 2.5 }, pb: 1 }}>
          <Typography variant="h6" color="#2a0f35" fontWeight={600} sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Прервать приемку?
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, sm: 2.5 }, pt: { xs: 1, sm: 2 } }}>
          <Typography variant="body1" color="#4c5454" sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>
            Введенные данные не сохранятся. Вы уверены, что хотите выйти?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: { xs: 2, sm: 2.5 }, pt: 1, gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
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
              navigate(`/movements/${id}`);
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

      {/* Диалог подтверждения отправки */}
      <Dialog
        open={confirmDialog}
        onClose={() => setConfirmDialog(false)}
        PaperProps={{
          sx: {
            borderRadius: 4,
            maxWidth: 520,
            width: '100%',
            m: 2,
            boxShadow: '0 8px 24px rgba(106, 61, 122, 0.15)',
          },
        }}
      >
        <DialogTitle sx={{ p: { xs: 2, sm: 2.5 }, pb: 1 }}>
          <Typography variant="h6" color="#2a0f35" fontWeight={600} sx={{ mb: 0.5, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            Подтверждение действия
          </Typography>
          <Typography variant="body2" color="#4c5454" sx={{ fontSize: { xs: '0.8rem', sm: '0.85rem' } }}>
            Проверьте данные перед подтверждением
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, sm: 2.5 }, pt: { xs: 1, sm: 2 } }}>
          <Stack spacing={2.5}>
            <Box sx={{ 
              p: { xs: 1.5, sm: 2 }, 
              backgroundColor: 'rgba(63, 31, 75, 0.04)',
              borderRadius: 4,
              border: '1px solid rgba(63, 31, 75, 0.1)',
            }}>
              <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                ДЕЙСТВИЕ
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {action === 'accept' && <AcceptIcon sx={{ color: '#4caf50', fontSize: { xs: 20, sm: 24 } }} />}
                {action === 'discrepancy' && <DiscrepancyIcon sx={{ color: '#ff9800', fontSize: { xs: 20, sm: 24 } }} />}
                {action === 'reject' && <RejectIcon sx={{ color: '#f44336', fontSize: { xs: 20, sm: 24 } }} />}
                <Typography variant="body1" color="#2a0f35" fontWeight={600} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                  {getActionText().toUpperCase()}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ 
              p: { xs: 1.5, sm: 2 }, 
              backgroundColor: '#f8f7fa',
              borderRadius: 4,
            }}>
              <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                ДЕТАЛИ
              </Typography>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid size={{ xs: 4 }}>
                  <Typography variant="body2" color="#4c5454" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Товаров
                  </Typography>
                  <Typography variant="body1" color="#2a0f35" fontWeight={600} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                    {transfer?.items?.length || 0} поз.
                  </Typography>
                </Grid>
                {action !== 'reject' && (
                  <>
                    <Grid size={{ xs: 4 }}>
                      <Typography variant="body2" color="#4c5454" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        Количество
                      </Typography>
                      <Typography variant="body1" color="#2a0f35" fontWeight={600} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                        {totalActual} / {totalExpected}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Typography variant="body2" color="#4c5454" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        Фотографии
                      </Typography>
                      <Typography variant="body1" color="#2a0f35" fontWeight={600} sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                        {files.length} шт.
                      </Typography>
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>

            {action === 'reject' && notes && (
              <Box sx={{ 
                p: { xs: 1.5, sm: 2 }, 
                backgroundColor: '#f8f7fa',
                borderRadius: 4,
              }}>
                <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                  ПРИЧИНА ОТКЛОНЕНИЯ
                </Typography>
                <Typography variant="body2" color="#2a0f35" sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>
                  {notes}
                </Typography>
              </Box>
            )}

            {action === 'accept' && (
              <Alert severity="info" sx={{ borderRadius: 4, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                Товары будут списаны у отправителя и зачислены вам в указанном количестве
              </Alert>
            )}
            {action === 'discrepancy' && (
              <Alert severity="warning" sx={{ borderRadius: 4, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                Требуется подтверждение руководителя перед списанием товаров
              </Alert>
            )}
            {action === 'reject' && (
              <Alert severity="error" sx={{ borderRadius: 4, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                Все товары будут возвращены отправителю, перемещение будет отменено
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: { xs: 2, sm: 2.5 }, pt: 1, gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Button
            onClick={() => setConfirmDialog(false)}
            disabled={submitting}
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
            Отмена
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting}
            sx={{
              borderRadius: 4,
              backgroundColor: getActionColor(),
              '&:hover': { 
                backgroundColor: 
                  action === 'accept' ? '#388e3c' : 
                  action === 'discrepancy' ? '#f57c00' : '#d32f2f',
              },
              px: 3,
              py: 1,
              textTransform: 'none',
              fontSize: { xs: '0.85rem', sm: '0.95rem' },
              fontWeight: 500,
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            {submitting ? <CircularProgress size={20} sx={{ color: 'white' }} /> : getActionButtonText()}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог успеха */}
      <Dialog
        open={successDialog}
        onClose={() => {
          setSuccessDialog(false);
          navigate(`/movements/${id}`);
        }}
        PaperProps={{
          sx: {
            borderRadius: 4,
            maxWidth: 400,
            width: '100%',
            m: 2,
            boxShadow: '0 8px 24px rgba(106, 61, 122, 0.15)',
          },
        }}
      >
        <DialogContent sx={{ textAlign: 'center', py: { xs: 3, sm: 4 }, px: { xs: 2, sm: 3 } }}>
          <CheckCircleIcon sx={{ fontSize: { xs: 60, sm: 80 }, color: '#3f1f4b', mb: 2 }} />
          <Typography variant="h5" color="#2a0f35" fontWeight={600} gutterBottom sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            Перемещение {getActionText()}!
          </Typography>
          <Typography variant="body2" color="#4c5454" sx={{ fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>
            {action === 'accept' && 'Товары успешно приняты'}
            {action === 'discrepancy' && 'Заявка отправлена на проверку руководителю'}
            {action === 'reject' && 'Перемещение отклонено'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: { xs: 3, sm: 4 } }}>
          <Button
            variant="contained"
            onClick={() => {
              setSuccessDialog(false);
              navigate(`/movements/${id}`);
            }}
            sx={{
              borderRadius: 4,
              backgroundColor: '#674fb6',
              '&:hover': { backgroundColor: '#483399' },
              px: { xs: 3, sm: 4 },
              py: 1,
              textTransform: 'none',
              fontSize: { xs: '0.85rem', sm: '0.95rem' },
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

export default ArrivedTransferPage;