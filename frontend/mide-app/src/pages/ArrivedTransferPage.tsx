import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Snackbar,
  Alert as MuiAlert,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  CheckCircle as AcceptIcon,
  Cancel as RejectIcon,
  Warning as DiscrepancyIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  PhotoCamera as PhotoIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Numbers as NumbersIcon,
  PhotoLibrary as PhotoLibraryIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { transferService } from '../api/transferService';
import { productService } from '../api/productService';
import {
  TransferDetail,
  TransferItem,
  TransferItemStatus,
  getTransferItemStatusText,
  getTransferItemStatusColor,
  Product,
} from '../types';

const ArrivedTransferPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [transfer, setTransfer] = useState<TransferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [productDetails, setProductDetails] = useState<{ [key: number]: Product }>({});
  
  const [action, setAction] = useState<'accept' | 'reject' | 'discrepancy'>('accept');
  const [notes, setNotes] = useState('');
  const [itemQuantities, setItemQuantities] = useState<{ [key: number]: number }>({});
  
  // Состояние для файлов
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [fileError, setFileError] = useState('');
  
  // 🔴 Шаги процесса: для reject - 2 шага, для остальных - 4 шага
  const [activeStep, setActiveStep] = useState(0);
  const [steps, setSteps] = useState<string[]>(['Выбор действия', 'Указание количеств', 'Загрузка фотографий', 'Подтверждение']);
  
  // Модальные окна и уведомления
  const [viewImageOpen, setViewImageOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [validationError, setValidationError] = useState('');
  const [stepErrors, setStepErrors] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    if (id) {
      loadTransfer();
    }
  }, [id]);

  // 🔴 Обновляем шаги в зависимости от выбранного действия
  useEffect(() => {
    if (action === 'reject') {
      setSteps(['Выбор действия', 'Причина отклонения']);
    } else {
      setSteps(['Выбор действия', 'Указание количеств', 'Загрузка фотографий', 'Подтверждение']);
    }
    // Сбрасываем на первый шаг при изменении действия
    setActiveStep(0);
  }, [action]);

  const loadTransfer = async () => {
    try {
      setLoading(true);
      const transferData = await transferService.getTransferById(Number(id));
      
      // Проверяем что пользователь является получателем и статус IN_TRANSIT
      if (transferData.status !== 'IN_TRANSIT') {
        setErrorMessage('Это перемещение нельзя принять в текущем статусе');
        setErrorDialogOpen(true);
        navigate(`/movements/${id}`);
        return;
      }
      
      setTransfer(transferData);
      
      // Инициализируем количества ВСЕГДА с ожидаемым количеством
      const quantities: { [key: number]: number } = {};
      transferData.items.forEach(item => {
        quantities[item.productId] = item.expectedQuantity; // По умолчанию ставим ожидаемое количество
      });
      setItemQuantities(quantities);
      
      // Загружаем информацию о товарах
      await loadProductDetails(transferData.items);
    } catch (error) {
      console.error('Error loading transfer:', error);
      setErrorMessage('Ошибка загрузки перемещения');
      setErrorDialogOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const loadProductDetails = async (items: TransferItem[]) => {
    try {
      const productIds = items.map(item => item.productId);
      const uniqueProductIds = Array.from(new Set(productIds));
      
      const productPromises = uniqueProductIds.map(async (productId) => {
        try {
          const product = await productService.getProductById(productId);
          return { id: productId, product };
        } catch (error) {
          console.error(`Error loading product ${productId}:`, error);
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
    const errors: string[] = [];
    
    // Проверяем каждый файл
    newFiles.forEach(file => {
      // Проверяем тип файла (только изображения)
      if (!file.type.startsWith('image/')) {
        errors.push(`Файл "${file.name}" не является изображением`);
      }
      
      // Проверяем размер файла (максимум 10MB)
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`Файл "${file.name}" слишком большой (макс. 10MB)`);
      }
    });
    
    if (errors.length > 0) {
      setFileError(errors.join(', '));
      return;
    }
    
    if (files.length + newFiles.length > 10) {
      setFileError('Можно загрузить не более 10 файлов');
      return;
    }
    
    // Добавляем файлы
    setFiles(prev => [...prev, ...newFiles]);
    
    // Создаем превью для новых файлов
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setFilePreviews(prev => [...prev, ...newPreviews]);
    
    setFileError('');
    // Очищаем ошибку шага если файлы загружены
    setStepErrors(prev => ({ ...prev, [2]: '' }));
  };

  const removeFile = (index: number) => {
    // Освобождаем URL объекта для превью
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
      [productId]: Math.max(0, quantity) // Нельзя указать отрицательное количество
    });
  };

  const validateStep = (step: number): boolean => {
    if (!transfer) return false;
    
    const newErrors: { [key: number]: string } = { ...stepErrors };
    
    switch (step) {
      case 0: // Выбор действия
        delete newErrors[0];
        break;
        
      case 1: 
        if (action === 'reject') {
          // Для reject проверяем только комментарий
          if (!notes.trim()) {
            newErrors[1] = 'Укажите причину отклонения';
          }
        } else {
          // Для accept и discrepancy проверяем количества
          for (const item of transfer.items) {
            const quantity = itemQuantities[item.productId];
            if (quantity === undefined || quantity < 0) {
              const productName = getProductName(item.productId);
              newErrors[1] = `Укажите корректное количество для товара "${productName}"`;
              break;
            }
          }
        }
        break;
        
      case 2: // Загрузка фотографий (только для accept/discrepancy)
        if (action !== 'reject') {
          // Файлы обязательны для accept и discrepancy
          if (files.length === 0) {
            newErrors[2] = 'Необходимо прикрепить хотя бы одну фотографию';
          } else if (files.length > 10) {
            newErrors[2] = 'Можно загрузить не более 10 файлов';
          } else {
            delete newErrors[2];
          }
        } else {
          // Для reject файлы не обязательны
          delete newErrors[2];
        }
        break;
        
      case 3: // Подтверждение (только для accept/discrepancy)
        if (action !== 'reject') {
          // Дополнительная проверка для accept/discrepancy
          delete newErrors[3];
        }
        break;
    }
    
    setStepErrors(newErrors);
    return !newErrors[step];
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const openConfirmationDialog = () => {
    if (validateStep(activeStep)) {
      setConfirmDialogOpen(true);
    }
  };

const handleSubmit = async () => {
  if (!transfer) return;
  
  setConfirmDialogOpen(false);
  
  try {
    setSubmitting(true);
    
    // 🔴 ИЗМЕНЕНИЕ: Формируем данные в зависимости от действия
    const arrivalData = {
      action,
      // Для reject отправляем пустой массив товаров
      items: action === 'reject' ? [] : transfer.items.map(item => ({
        productId: item.productId,
        actualQuantity: itemQuantities[item.productId] || 0,
        notes: item.notes,
      })),
      notes: notes.trim() || undefined,
    };
    
    // 🔴 ИЗМЕНЕНИЕ: Для reject не отправляем файлы
    const filesToSend = action === 'reject' ? [] : files;
    
    await transferService.markArrived(
      Number(id), 
      arrivalData, 
      filesToSend
    );
    
    setSuccessMessage(`Перемещение успешно ${getSuccessMessage()}`);
    setSuccessDialogOpen(true);
  } catch (error: any) {
    console.error('Error submitting arrival:', error);
    const errorDetail = error.response?.data?.detail || error.message;
    setErrorMessage(`Ошибка: ${errorDetail}`);
    setErrorDialogOpen(true);
  } finally {
    setSubmitting(false);
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

  const getSuccessMessage = () => {
    switch (action) {
      case 'accept': return 'принято';
      case 'reject': return 'отклонено';
      case 'discrepancy': return 'отмечено с расхождениями';
      default: return 'обработано';
    }
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

  const openImageDialog = (previewUrl: string) => {
    setSelectedImage(previewUrl);
    setViewImageOpen(true);
  };

  const closeImageDialog = () => {
    setViewImageOpen(false);
    setSelectedImage('');
  };

  const handleSuccessDialogClose = () => {
    setSuccessDialogOpen(false);
    navigate(`/movements/${id}`);
  };

  const handleErrorDialogClose = () => {
    setErrorDialogOpen(false);
  };

  const handleValidationErrorClose = () => {
    setValidationError('');
  };

  // Очистка URL объектов при размонтировании
  useEffect(() => {
    return () => {
      filePreviews.forEach(preview => URL.revokeObjectURL(preview));
    };
  }, [filePreviews]);

  // Функция для получения подсказки для ввода
  const getInputHelperText = (item: TransferItem): string => {
    if (action === 'reject') return 'Товары будут возвращены отправителю';
    
    const actual = itemQuantities[item.productId] || 0;
    const discrepancy = getDiscrepancy(item);
    
    if (discrepancy === 0) return 'Получено ожидаемое количество';
    if (discrepancy > 0) return `Избыток: +${discrepancy} шт.`;
    return `Недосдача: ${discrepancy} шт.`;
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!transfer) {
    return null;
  }

  // Функция для рендеринга шага
  const renderStepContent = (step: number) => {
    // 🔴 ИЗМЕНЕНИЕ: Для reject отдельная логика
    if (action === 'reject') {
      switch (step) {
        case 0: // Выбор действия
          return (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#2a0f35' }}>
                Выберите действие
              </Typography>
              
              <FormControl component="fieldset" sx={{ mb: 3 }}>
                <RadioGroup
                  value={action}
                  onChange={(e) => {
                    const newAction = e.target.value as any;
                    setAction(newAction);
                    setStepErrors({});
                  }}
                >
                  <FormControlLabel
                    value="accept"
                    control={<Radio color="success" />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AcceptIcon sx={{ color: '#4caf50' }} />
                        <span>Принять товар (указать фактическое количество)</span>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="discrepancy"
                    control={<Radio color="warning" />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DiscrepancyIcon sx={{ color: '#ff9800' }} />
                        <span>Принять с расхождениями (требуется проверка руководителя)</span>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="reject"
                    control={<Radio color="error" />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <RejectIcon sx={{ color: '#f44336' }} />
                        <span>Отклонить полностью (вернуть товары отправителю)</span>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>
              
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Важно:</strong>
                  <ul style={{ marginTop: 8, marginBottom: 0 }}>
                    <li><strong>"Принять"</strong> - укажите сколько фактически получили, товары сразу списываются и зачисляются</li>
                    <li><strong>"Принять с расхождениями"</strong> - расхождения проверяются руководителем, после чего товары списываются</li>
                    <li><strong>"Отклонить"</strong> - все товары возвращаются отправителю без проверки количеств</li>
                  </ul>
                </Typography>
              </Alert>
            </Paper>
          );
          
        case 1: // Причина отклонения (последний шаг для reject)
          return (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#2a0f35' }}>
                Причина отклонения
              </Typography>
              
              {stepErrors[1] && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {stepErrors[1]}
                </Alert>
              )}
              
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Вы выбрали отклонение перемещения.</strong>
                  <br />
                  При подтверждении:
                  <ul style={{ marginTop: 8, marginBottom: 0 }}>
                    <li>Все товары будут возвращены отправителю</li>
                    <li>Перемещение будет отменено</li>
                    <li>Товары не будут списываться у отправителя</li>
                    <li>Требуется указать причину отклонения</li>
                  </ul>
                </Typography>
              </Alert>
              
              <Typography variant="subtitle1" gutterBottom>
                Укажите причину отклонения:
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                placeholder="Укажите причину, по которой вы отклоняете это перемещение..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                sx={{ mb: 3 }}
                error={!!stepErrors[1]}
                helperText={stepErrors[1] || "Объясните причину отклонения перемещения"}
              />
              
              <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" color="textSecondary">
                  Информация о перемещении:
                </Typography>
                <Box sx={{ pl: 2, mt: 1 }}>
                  <Typography variant="body2">
                    <strong>Товаров:</strong> {transfer.items.length} позиций
                  </Typography>
                  <Typography variant="body2">
                    <strong>Всего ожидалось:</strong> {transfer.totalQuantity || 0} ед.
                  </Typography>
                  <Typography variant="body2">
                    <strong>Отправитель:</strong> {transfer.fromUserName}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          );
      }
    } else {
      // Логика для accept и discrepancy
      switch (step) {
        case 0: // Выбор действия
          return (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#2a0f35' }}>
                Выберите действие
              </Typography>
              
              <FormControl component="fieldset" sx={{ mb: 3 }}>
                <RadioGroup
                  value={action}
                  onChange={(e) => {
                    const newAction = e.target.value as any;
                    setAction(newAction);
                    setStepErrors({});
                  }}
                >
                  <FormControlLabel
                    value="accept"
                    control={<Radio color="success" />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AcceptIcon sx={{ color: '#4caf50' }} />
                        <span>Принять товар (указать фактическое количество)</span>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="discrepancy"
                    control={<Radio color="warning" />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <DiscrepancyIcon sx={{ color: '#ff9800' }} />
                        <span>Принять с расхождениями (требуется проверка руководителя)</span>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="reject"
                    control={<Radio color="error" />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <RejectIcon sx={{ color: '#f44336' }} />
                        <span>Отклонить полностью (вернуть товары отправителю)</span>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>
              
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Важно:</strong>
                  <ul style={{ marginTop: 8, marginBottom: 0 }}>
                    <li><strong>"Принять"</strong> - укажите сколько фактически получили, товары сразу списываются и зачисляются</li>
                    <li><strong>"Принять с расхождениями"</strong> - расхождения проверяются руководителем, после чего товары списываются</li>
                    <li><strong>"Отклонить"</strong> - все товары возвращаются отправителю без проверки количеств</li>
                  </ul>
                </Typography>
              </Alert>
            </Paper>
          );
          
        case 1: // Указание количеств
          return (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#2a0f35', display: 'flex', alignItems: 'center', gap: 1 }}>
                <NumbersIcon /> Укажите фактически полученные количества
              </Typography>
              
              {stepErrors[1] && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {stepErrors[1]}
                </Alert>
              )}
              
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Указывайте фактическое количество полученного товара!</strong>
                  <br />
                  Товар будет списан у отправителя и добавлен вам именно в том количестве, которое вы укажете.
                  <br />
                  <strong>Можете указать любое количество:</strong>
                  <ul style={{ marginTop: 8, marginBottom: 0 }}>
                    <li>Столько же как ожидалось</li>
                    <li>Меньше чем ожидалось (недосдача)</li>
                    <li>Больше чем ожидалось (избыток)</li>
                  </ul>
                </Typography>
              </Alert>
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Товар</TableCell>
                      <TableCell align="right">Ожидается</TableCell>
                      <TableCell align="center">Фактически получено</TableCell>
                      <TableCell align="right">Разница</TableCell>
                      <TableCell>Статус</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transfer.items.map((item, index) => {
                      const actual = itemQuantities[item.productId] || 0;
                      const discrepancy = getDiscrepancy(item);
                      const status = getItemStatus(item);
                      const helperText = getInputHelperText(item);
                      
                      return (
                        <TableRow key={index} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {getProductName(item.productId)}
                            </Typography>
                            {getProductSku(item.productId) && (
                              <Typography variant="caption" color="textSecondary" display="block">
                                Арт: {getProductSku(item.productId)}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="medium">
                              {item.expectedQuantity} шт.
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <IconButton
                                size="small"
                                onClick={() => handleQuantityChange(item.productId, actual - 1)}
                                disabled={actual <= 0}
                              >
                                <RemoveIcon />
                              </IconButton>
                              <TextField
                                type="number"
                                value={actual}
                                onChange={(e) => handleQuantityChange(item.productId, Number(e.target.value))}
                                size="small"
                                sx={{ width: 120, mx: 1 }}
                                inputProps={{ 
                                  min: 0,
                                  style: { textAlign: 'center' }
                                }}
                                helperText={helperText}
                              />
                              <IconButton
                                size="small"
                                onClick={() => handleQuantityChange(item.productId, actual + 1)}
                              >
                                <AddIcon />
                              </IconButton>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ 
                              color: discrepancy === 0 ? 'inherit' : 
                                     discrepancy > 0 ? '#4caf50' : '#f44336',
                              fontWeight: 600
                            }}>
                              {discrepancy > 0 ? '+' : ''}{discrepancy} шт.
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={getTransferItemStatusText(status)}
                              size="small"
                              sx={{
                                backgroundColor: `${getTransferItemStatusColor(status)}20`,
                                color: getTransferItemStatusColor(status),
                                fontWeight: 500,
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Grid container spacing={2}>
                  <Grid size={{xs: 6}}>
                    <Typography variant="body2" color="textSecondary">
                      Всего ожидается:
                    </Typography>
                    <Typography variant="h6">
                      {transfer.totalQuantity || 0} ед.
                    </Typography>
                  </Grid>
                  <Grid size={{xs: 6}}>
                    <Typography variant="body2" color="textSecondary">
                      Всего фактически:
                    </Typography>
                    <Typography variant="h6" color={
                      Object.values(itemQuantities).reduce((a, b) => a + b, 0) === transfer.totalQuantity ? 
                      'inherit' : '#ff9800'
                    }>
                      {Object.values(itemQuantities).reduce((a, b) => a + b, 0)} ед.
                    </Typography>
                  </Grid>
                </Grid>
                {action === 'discrepancy' && (
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    <strong>При расхождениях:</strong> Требуется подтверждение руководителя перед списанием товаров
                  </Typography>
                )}
              </Box>
            </Paper>
          );
          
        case 2: // Загрузка фотографий
          return (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#2a0f35', display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhotoLibraryIcon /> Загрузите фотографии товара
              </Typography>
              
              {stepErrors[2] && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {stepErrors[2]}
                </Alert>
              )}
              
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Обязательно:</strong> Прикрепите фотографии полученного товара.
                  Фотографии служат подтверждением фактического количества и состояния товара.
                  <br />
                  <br />
                  <strong>Требования:</strong>
                  <ul style={{ marginTop: 8, marginBottom: 0 }}>
                    <li>Только изображения (JPEG, PNG, GIF, WebP)</li>
                    <li>Максимальный размер файла: 10MB</li>
                    <li>Максимальное количество: 10 файлов</li>
                  </ul>
                </Typography>
              </Alert>
              
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="file-upload"
                type="file"
                multiple
                onChange={handleFileUpload}
              />
              <label htmlFor="file-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<PhotoIcon />}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Добавить фотографии
                </Button>
              </label>
              
              {filePreviews.length > 0 && (
                <>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Загружено фотографий: {filePreviews.length}
                  </Typography>
                  
                  <ImageList cols={3} gap={8} sx={{ mb: 2 }}>
                    {filePreviews.map((preview, index) => (
                      <ImageListItem key={index}>
                        <img
                          src={preview}
                          alt={`Фото ${index + 1}`}
                          loading="lazy"
                          style={{ height: 120, objectFit: 'cover', cursor: 'pointer' }}
                          onClick={() => openImageDialog(preview)}
                        />
                        <ImageListItemBar
                          position="top"
                          actionIcon={
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFile(index);
                              }}
                              sx={{ color: 'white' }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          }
                          actionPosition="right"
                        />
                        <ImageListItemBar
                          position="bottom"
                          subtitle={`Фото ${index + 1}`}
                        />
                      </ImageListItem>
                    ))}
                  </ImageList>
                </>
              )}
              
              {fileError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {fileError}
                </Alert>
              )}
            </Paper>
          );
          
        case 3: // Подтверждение
          return (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#2a0f35' }}>
                Подтверждение действия
              </Typography>
              
              {stepErrors[3] && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {stepErrors[3]}
                </Alert>
              )}
              
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  Проверьте все данные перед подтверждением:
                </Typography>
              </Alert>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{xs: 12, md: 6}}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                        Действие
                      </Typography>
                      <Typography variant="body1" fontWeight="medium" sx={{ 
                        color: action === 'accept' ? '#4caf50' : 
                               action === 'discrepancy' ? '#ff9800' : '#f44336'
                      }}>
                        {getActionText().toUpperCase()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{xs: 12, md: 6}}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                        Фотографии
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {files.length} шт.
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              
              <Typography variant="subtitle1" gutterBottom>
                Количества товаров:
              </Typography>
              <TableContainer sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Товар</TableCell>
                      <TableCell align="right">Ожидалось</TableCell>
                      <TableCell align="right">Указано</TableCell>
                      <TableCell align="right">Разница</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transfer.items.map((item, index) => {
                      const actual = itemQuantities[item.productId] || 0;
                      const discrepancy = getDiscrepancy(item);
                      
                      return (
                        <TableRow key={index}>
                          <TableCell>{getProductName(item.productId)}</TableCell>
                          <TableCell align="right">{item.expectedQuantity} шт.</TableCell>
                          <TableCell align="right">{actual} шт.</TableCell>
                          <TableCell align="right" sx={{ 
                            color: discrepancy === 0 ? 'inherit' : 
                                   discrepancy > 0 ? '#4caf50' : '#f44336',
                            fontWeight: 600
                          }}>
                            {discrepancy > 0 ? '+' : ''}{discrepancy} шт.
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Typography variant="subtitle1" gutterBottom>
                Комментарий:
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="Дополнительная информация..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                sx={{ mb: 3 }}
                error={!!stepErrors[3]}
                helperText={stepErrors[3]}
              />
            </Paper>
          );
      }
    }
    
    return null;
  };

  // 🔴 Функция для определения, нужно ли показывать кнопку "Подтвердить"
  const isLastStep = () => {
    if (action === 'reject') {
      return activeStep === steps.length - 1; // Для reject последний шаг - причина отклонения
    } else {
      return activeStep === steps.length - 1; // Для accept/discrepancy последний шаг - подтверждение
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate(`/movements/${id}`)}
          sx={{ mb: 2 }}
        >
          Назад к перемещению
        </Button>
        
        <Typography variant="h4" component="h1" gutterBottom color="#2a0f35">
          {action === 'reject' ? 'Отклонение товара' : 'Прием товара'}
        </Typography>
        <Typography variant="subtitle1" color="#4c5454">
          Перемещение #{transfer.id}: {transfer.title}
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          От: {transfer.fromUserName} → Кому: {transfer.toUserName}
        </Typography>
      </Box>

      {/* Валидационные ошибки */}
      <Snackbar
        open={!!validationError}
        autoHideDuration={6000}
        onClose={handleValidationErrorClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <MuiAlert onClose={handleValidationErrorClose} severity="error" sx={{ width: '100%' }}>
          {validationError}
        </MuiAlert>
      </Snackbar>

      {/* Степпер */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel error={!!stepErrors[index]}>
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Содержимое текущего шага */}
      {renderStepContent(activeStep)}

      {/* Кнопки навигации */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          onClick={activeStep === 0 ? () => navigate(`/movements/${id}`) : handleBack}
          disabled={submitting}
        >
          {activeStep === 0 ? 'Отмена' : 'Назад'}
        </Button>
        
        <Box>
          {!isLastStep() ? (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={submitting}
              sx={{ backgroundColor: '#2a0f35', '&:hover': { backgroundColor: '#3a1f45' } }}
            >
              Далее
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={openConfirmationDialog}
              disabled={submitting}
              sx={{
                backgroundColor: 
                  action === 'accept' ? '#4caf50' : 
                  action === 'discrepancy' ? '#ff9800' : '#f44336',
                '&:hover': {
                  backgroundColor: 
                    action === 'accept' ? '#388e3c' : 
                    action === 'discrepancy' ? '#f57c00' : '#d32f2f',
                },
              }}
            >
              {submitting ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                `Подтвердить ${getActionText()}`
              )}
            </Button>
          )}
        </Box>
      </Box>

      {/* Панель сводки (всегда видна) */}
      <Paper sx={{ p: 3, mt: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#2a0f35' }}>
          Сводка по перемещению
        </Typography>
        
        <Grid container spacing={2}>
          <Grid size={{xs: 12, md: 6}}>
            <Typography variant="body2" color="textSecondary">
              Общая информация
            </Typography>
            <Box sx={{ pl: 2, mt: 1 }}>
              <Typography variant="body2">
                <strong>Товаров:</strong> {transfer.items.length} позиций
              </Typography>
              <Typography variant="body2">
                <strong>Ожидалось всего:</strong> {transfer.totalQuantity || 0} ед.
              </Typography>
              {action !== 'reject' && (
                <Typography variant="body2">
                  <strong>Указано всего:</strong> {Object.values(itemQuantities).reduce((a, b) => a + b, 0)} ед.
                </Typography>
              )}
              {action !== 'reject' && (
                <Typography variant="body2">
                  <strong>Фотографий:</strong> {files.length} шт.
                </Typography>
              )}
            </Box>
          </Grid>
          
          <Grid size={{xs: 12, md: 6}}>
            <Typography variant="body2" color="textSecondary">
              Что произойдет после подтверждения
            </Typography>
            <Box sx={{ pl: 2, mt: 1 }}>
              {action === 'accept' && (
                <>
                  <Typography variant="body2">✓ Товары будут списаны у отправителя в указанном количестве</Typography>
                  <Typography variant="body2">✓ Товары будут добавлены вам в указанном количестве</Typography>
                  <Typography variant="body2">✓ Перемещение будет завершено автоматически</Typography>
                  <Typography variant="body2">✓ Фотографии будут сохранены в разделе "Приемка"</Typography>
                </>
              )}
              {action === 'discrepancy' && (
                <>
                  <Typography variant="body2">✓ Будут созданы записи о расхождениях</Typography>
                  <Typography variant="body2">✓ Перемещение перейдет в статус проверки расхождений</Typography>
                  <Typography variant="body2">⚠ Требуется подтверждение руководителей получателя</Typography>
                  <Typography variant="body2">⚠ После подтверждения товары будут списаны/зачислены</Typography>
                </>
              )}
              {action === 'reject' && (
                <>
                  <Typography variant="body2">✗ Все товары будут возвращены отправителю</Typography>
                  <Typography variant="body2">✗ Перемещение будет отменено</Typography>
                  <Typography variant="body2">⚠ Укажите причину отклонения</Typography>
                </>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Модальные окна */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>Подтверждение действия</DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите {getActionText()}?
          </Typography>
          {action === 'reject' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <strong>Внимание!</strong> При отклонении:
              <ul style={{ marginTop: 8, marginBottom: 0 }}>
                <li>Все товары будут возвращены отправителю</li>
                <li>Перемещение будет отменено</li>
              </ul>
            </Alert>
          )}
          {action === 'accept' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <strong>Будет списано:</strong> {Object.values(itemQuantities).reduce((a, b) => a + b, 0)} ед.
              <br />
              <strong>Будет зачислено вам:</strong> {Object.values(itemQuantities).reduce((a, b) => a + b, 0)} ед.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} disabled={submitting}>
            Отмена
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={submitting}
            color={
              action === 'accept' ? 'success' : 
              action === 'discrepancy' ? 'warning' : 'error'
            }
          >
            {submitting ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Подтвердить'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={successDialogOpen}
        onClose={handleSuccessDialogClose}
      >
        <DialogTitle>Успешно</DialogTitle>
        <DialogContent>
          <Typography>{successMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSuccessDialogClose} variant="contained" color="primary">
            ОК
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={errorDialogOpen}
        onClose={handleErrorDialogClose}
      >
        <DialogTitle>Ошибка</DialogTitle>
        <DialogContent>
          <Typography>{errorMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleErrorDialogClose} color="primary">
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={viewImageOpen}
        onClose={closeImageDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Просмотр фотографии</Typography>
            <IconButton onClick={closeImageDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedImage && (
            <Box
              component="img"
              src={selectedImage}
              alt="Предпросмотр"
              sx={{
                width: '100%',
                height: 'auto',
                maxHeight: '70vh',
                objectFit: 'contain',
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeImageDialog} color="primary">
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ArrivedTransferPage;