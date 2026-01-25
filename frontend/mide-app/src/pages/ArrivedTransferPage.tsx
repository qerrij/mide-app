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
  
  // Модальные окна и уведомления
  const [viewImageOpen, setViewImageOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (id) {
      loadTransfer();
    }
  }, [id]);

  const loadTransfer = async () => {
    try {
      setLoading(true);
      const transferData = await transferService.getTransferById(Number(id));
      
      // Проверяем что пользователь является получателем
      if (transferData.status !== 'IN_TRANSIT') {
        setErrorMessage('Это перемещение нельзя принять в текущем статусе');
        setErrorDialogOpen(true);
        return;
      }
      
      setTransfer(transferData);
      
      // Инициализируем количества для расхождений
      const quantities: { [key: number]: number } = {};
      transferData.items.forEach(item => {
        quantities[item.productId] = item.expectedQuantity;
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
      
      // Исправление для работы с Set без spread operator
      const uniqueProductIds: number[] = [];
      const seen = new Set<number>();
      productIds.forEach(id => {
        if (!seen.has(id)) {
          seen.add(id);
          uniqueProductIds.push(id);
        }
      });
      
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
    
    setFileError(''); // Очищаем ошибки
  };

  const removeFile = (index: number) => {
    // Освобождаем URL объекта для превью
    URL.revokeObjectURL(filePreviews[index]);
    
    // Удаляем файл и превью
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

  const validateForm = (): boolean => {
    if (!transfer) return false;
    
    // Валидация для отклонения
    if (action === 'reject' && !notes.trim()) {
      setValidationError('Укажите причину отклонения');
      return false;
    }
    
    // Валидация для расхождений - файлы обязательны
    if (action === 'discrepancy') {
      if (files.length === 0) {
        setFileError('Для расхождений необходимо прикрепить фотографии');
        return false;
      }
      
      // Проверяем что все количества заполнены
      for (const item of transfer.items) {
        if (itemQuantities[item.productId] === undefined) {
          const productName = getProductName(item.productId);
          setValidationError(`Укажите количество для товара "${productName}"`);
          return false;
        }
      }
    }
    
    return true;
  };

  const openConfirmationDialog = () => {
    if (!validateForm()) {
      return;
    }
    setConfirmDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!transfer) return;
    
    setConfirmDialogOpen(false);
    
    try {
      setSubmitting(true);
      
      const arrivalData = {
        action,
        notes: notes.trim() || undefined,
        items: action === 'discrepancy' 
          ? transfer.items.map(item => ({
              productId: item.productId,
              actualQuantity: itemQuantities[item.productId],
              notes: item.notes,
            }))
          : undefined,
      };
      
      // Отправляем файлы только для расхождений
      await transferService.markArrived(
        Number(id), 
        arrivalData, 
        action === 'discrepancy' ? files : undefined
      );
      
      setSuccessMessage(`Перемещение успешно ${getSuccessMessage()}`);
      setSuccessDialogOpen(true);
    } catch (error: any) {
      console.error('Error submitting arrival:', error);
      setErrorMessage(`Ошибка: ${error.response?.data?.detail || error.message}`);
      setErrorDialogOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  const getActionText = () => {
    switch (action) {
      case 'accept': return 'принять без расхождений';
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
    if (action === 'accept') return TransferItemStatus.RECEIVED;
    
    if (action === 'discrepancy') {
      const actual = itemQuantities[item.productId] || 0;
      if (actual === item.expectedQuantity) return TransferItemStatus.RECEIVED;
      if (actual < item.expectedQuantity) return TransferItemStatus.MISSING;
      return TransferItemStatus.EXCESS;
    }
    
    return TransferItemStatus.REJECTED;
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
          Прием товара
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

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#2a0f35' }}>
              Выберите действие
            </Typography>
            
            <FormControl component="fieldset" sx={{ mb: 3 }}>
              <RadioGroup
                value={action}
                onChange={(e) => setAction(e.target.value as any)}
              >
                <FormControlLabel
                  value="accept"
                  control={<Radio color="success" />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AcceptIcon sx={{ color: '#4caf50' }} />
                      <span>Принять без расхождений (полностью)</span>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="discrepancy"
                  control={<Radio color="warning" />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DiscrepancyIcon sx={{ color: '#ff9800' }} />
                      <span>Принять с расхождениями (частично)</span>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="reject"
                  control={<Radio color="error" />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <RejectIcon sx={{ color: '#f44336' }} />
                      <span>Отклонить полностью</span>
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>

            {/* Секция загрузки фотографий для расхождений */}
            {action === 'discrepancy' && (
              <>
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" gutterBottom sx={{ color: '#2a0f35' }}>
                  Фотографии для расхождений
                </Typography>
                
                <Alert severity="info" sx={{ mb: 2 }}>
                  Для принятия товара с расхождениями необходимо прикрепить фотографии.
                  Разрешены только изображения (JPEG, PNG, GIF, WebP), максимальный размер файла: 10MB.
                </Alert>
                
                {fileError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {fileError}
                  </Alert>
                )}
                
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
                        </ImageListItem>
                      ))}
                    </ImageList>
                  </>
                )}
              </>
            )}

            {action === 'discrepancy' && (
              <>
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" gutterBottom sx={{ color: '#2a0f35' }}>
                  Укажите фактически полученные количества
                </Typography>
                
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Товар</TableCell>
                        <TableCell align="right">Ожидается</TableCell>
                        <TableCell align="center">Фактически</TableCell>
                        <TableCell align="right">Разница</TableCell>
                        <TableCell>Статус</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {transfer.items.map((item, index) => {
                        const actual = itemQuantities[item.productId] || 0;
                        const discrepancy = getDiscrepancy(item);
                        const status = getItemStatus(item);
                        
                        return (
                          <TableRow key={index}>
                            <TableCell>
                              <Typography variant="body2">
                                {getProductName(item.productId)}
                              </Typography>
                              {getProductSku(item.productId) && (
                                <Typography variant="caption" color="textSecondary">
                                  {getProductSku(item.productId)}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">
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
                                  sx={{ width: 80, mx: 1 }}
                                  inputProps={{ min: 0 }}
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
                                color: discrepancy >= 0 ? '#4caf50' : '#f44336',
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
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

            <Divider sx={{ my: 3 }} />
            
            <Typography variant="h6" gutterBottom sx={{ color: '#2a0f35' }}>
              Комментарий
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Дополнительная информация..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              sx={{ mb: 3 }}
            />

            {action === 'reject' && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                При отклонении товары будут возвращены отправителю, 
                а перемещение будет отменено.
              </Alert>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                onClick={() => navigate(`/movements/${id}`)}
                disabled={submitting}
              >
                Отмена
              </Button>
              
              <Button
                variant="contained"
                onClick={openConfirmationDialog}
                disabled={submitting || (action === 'discrepancy' && files.length === 0)}
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
                  getActionText()
                )}
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#2a0f35' }}>
              Сводка
            </Typography>
            
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Общая информация
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Товаров:</strong> {transfer.items.length} позиций
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Всего ожидается:</strong> {transfer.totalQuantity || 0} ед.
                </Typography>
                {action === 'discrepancy' && (
                  <>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Всего фактически:</strong> {Object.values(itemQuantities).reduce((a, b) => a + b, 0)} ед.
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Общая разница:</strong> {Object.values(itemQuantities).reduce((a, b) => a + b, 0) - (transfer.totalQuantity || 0)} ед.
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Фотографий:</strong> {files.length} шт.
                    </Typography>
                  </>
                )}
              </CardContent>
            </Card>
            
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Что произойдет
                </Typography>
                {action === 'accept' && (
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    <li><Typography variant="body2">Все товары будут отмечены как полученные</Typography></li>
                    <li><Typography variant="body2">Перемещение будет завершено</Typography></li>
                    <li><Typography variant="body2">Товары будут списаны у отправителя и добавлены получателю</Typography></li>
                  </ul>
                )}
                {action === 'discrepancy' && (
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    <li><Typography variant="body2">Товары будут приняты с указанными количествами</Typography></li>
                    <li><Typography variant="body2">Будут созданы записи о расхождениях</Typography></li>
                    <li><Typography variant="body2">Перемещение перейдет в статус проверки расхождений</Typography></li>
                    <li><Typography variant="body2">Руководители получателя должны подтвердить расхождения</Typography></li>
                  </ul>
                )}
                {action === 'reject' && (
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    <li><Typography variant="body2">Перемещение будет отклонено</Typography></li>
                    <li><Typography variant="body2">Товары будут возвращены отправителю</Typography></li>
                    <li><Typography variant="body2">Перемещение будет отменено</Typography></li>
                  </ul>
                )}
              </CardContent>
            </Card>
          </Paper>
        </Grid>
      </Grid>

      {/* Модальное окно для подтверждения действия */}
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
              При отклонении товары будут возвращены отправителю, а перемещение будет отменено.
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

      {/* Модальное окно успеха */}
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

      {/* Модальное окно ошибки */}
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

      {/* Модальное окно для просмотра фото */}
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