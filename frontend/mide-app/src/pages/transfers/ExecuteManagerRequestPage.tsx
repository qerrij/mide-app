// ExecuteManagerRequestPage.tsx - исправленная версия
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  InputAdornment,
  Divider,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Snackbar,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  PhotoCamera as PhotoIcon,
  Delete as DeleteIcon,
  Inventory as InventoryIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { transferService } from '../../api/transferService';
import { userService } from '../../api/userService';
import { productService } from '../../api/productService';
import { inventoryService } from '../../api/inventoryService';
import {
  TransferDetail,
  TransferItem,
  User,
  Product,
  TransferRequestType,
  TransferStatus,
  getTransferStatusText,
  getTransferStatusColor,
  getTransferItemStatusText,
  getRoleName,
} from '../../types';

const ExecuteManagerRequestPage: React.FC = () => {
  // ИСПРАВЛЕНО: используем id вместо transferId
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [transfer, setTransfer] = useState<TransferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [executorId, setExecutorId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userInventory, setUserInventory] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [productDetails, setProductDetails] = useState<{ [key: number]: Product }>({});

  console.log('ExecuteManagerRequestPage render, id:', id, 'user:', user?.id);

  useEffect(() => {
    // ИСПРАВЛЕНО: проверяем id вместо transferId
    if (id && user) {
      loadTransfer();
      loadUsers();
    } else {
      setLoading(false);
      if (!user) {
        setError('Пользователь не авторизован');
      }
    }
  }, [id, user]);

  const loadTransfer = async () => {
    // ИСПРАВЛЕНО: используем id
    
    if (!id) {
      setError('ID перемещения не указан');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const transferId = parseInt(id);
      
      const transferData = await transferService.getTransferById(transferId);
      
      // Проверяем права
      
      if (transferData.fromUserId !== user?.id) {
        setError('У вас нет прав для выполнения этого запроса. Только отправитель может подтвердить запрос.');
        setLoading(false);
        return;
      }
      
      // Проверяем тип и статус
      
      if (transferData.requestType !== TransferRequestType.MANAGER_REQUEST) {
        setError('Это не запрос от руководителя');
        setLoading(false);
        return;
      }
      
      if (transferData.status !== TransferStatus.REQUESTED) {
        setError('Этот запрос уже обработан');
        setLoading(false);
        return;
      }
      
      setTransfer(transferData);
      
      // Загружаем инвентарь текущего пользователя
      const inventoryData = await inventoryService.getMyInventory();
      setUserInventory(inventoryData.items || []);
      
      // Загружаем информацию о товарах
      const productIds = transferData.items.map(item => item.productId);
      
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
      
    } catch (error: any) {
      setError(error.message || 'Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const usersData = await userService.getAllUsersBasic();
      const availableUsers = usersData
        .map(u => ({
          id: u.id,
          fullName: u.fullName,
          role: u.role,
        } as User))
        .filter(u => u.id !== user?.id);
      
      setUsers(availableUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      // Проверяем тип файлов (только изображения)
      for (const file of newFiles) {
        if (!file.type.startsWith('image/')) {
          setError(`Файл "${file.name}" не является изображением. Разрешены только файлы изображений (JPEG, PNG, GIF, WebP).`);
          return;
        }
        
        if (file.size > 10 * 1024 * 1024) { // 10MB
          setError(`Файл "${file.name}" слишком большой. Максимальный размер файла: 10MB.`);
          return;
        }
      }
      
      if (files.length + newFiles.length > 10) {
        setError('Максимальное количество файлов: 10');
        return;
      }
      
      setFiles([...files, ...newFiles]);
      
      // Создаем превью
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));
      setFilePreviews([...filePreviews, ...newPreviews]);
      setError(''); // Очищаем ошибки
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    const newPreviews = [...filePreviews];
    
    // Освобождаем URL объекта
    URL.revokeObjectURL(newPreviews[index]);
    
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    
    setFiles(newFiles);
    setFilePreviews(newPreviews);
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      setError('Необходимо прикрепить фотографии товаров');
      return;
    }
    
    // ИСПРАВЛЕНО: используем id
    if (!id) {
      setError('ID перемещения не указан');
      return;
    }
    
    try {
      setSubmitting(true);
      setError('');
      
      const transferId = parseInt(id);
      
      await transferService.executeManagerRequest(
        transferId,
        {
          executorId: executorId ? parseInt(executorId) : undefined,
          notes: notes || undefined,
        },
        files
      );
      
      setSuccessMessage('Запрос успешно подтвержден!');
      setTimeout(() => {
        navigate('/movements');
      }, 2000);
      
    } catch (error: any) {
      console.error('Error executing manager request:', error);
      console.error('Error details:', error.response?.data);
      setError(error.message || 'Ошибка при выполнении запроса');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!id) {
      setError('ID перемещения не указан');
      return;
    }
    
    const reason = prompt('Укажите причину отклонения запроса:');
    if (reason === null) return; 
    
    try {
      setSubmitting(true);
      setError('');
      
      await transferService.rejectManagerRequest(parseInt(id), { reason });
      
      setSuccessMessage('Запрос отклонен!');
      setTimeout(() => {
        navigate('/movements');
      }, 2000);
      
    } catch (error: any) {
      console.error('Error rejecting manager request:', error);
      setError(error.message || 'Ошибка при отклонении запроса');
    } finally {
      setSubmitting(false);
    }
  };

  const getInventoryStatus = (item: TransferItem) => {
    const inventoryItem = userInventory.find((inv: any) => inv.productId === item.productId);
    const available = inventoryItem?.quantity || 0;
    const required = item.expectedQuantity;
    
    if (available >= required) {
      return { 
        color: '#4caf50', 
        text: 'Достаточно',
        icon: <CheckIcon fontSize="small" />
      };
    } else if (available > 0) {
      return { 
        color: '#ff9800', 
        text: `Недостаточно (${available} из ${required})`,
        icon: <CancelIcon fontSize="small" />
      };
    } else {
      return { 
        color: '#f44336', 
        text: 'Отсутствует',
        icon: <CancelIcon fontSize="small" />
      };
    }
  };

  const getProductName = (productId: number) => {
    return productDetails[productId]?.name || `Товар ${productId}`;
  };

  const getProductSku = (productId: number) => {
    return productDetails[productId]?.sku || '';
  };

  const viewPhoto = (previewUrl: string) => {
    window.open(previewUrl, '_blank');
  };

  const handleCloseSnackbar = () => {
    setSuccessMessage('');
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ mb: 2 }} />
        <Typography variant="body2" color="textSecondary">
          Загрузка данных...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/movements')}
          sx={{ mb: 2 }}
        >
          Назад к перемещениям
        </Button>
        <Typography variant="h4" component="h1" gutterBottom color="#2a0f35">
          Выполнение запроса от руководителя
        </Typography>
        
        {transfer && (
          <Typography variant="subtitle1" color="#4c5454">
            ID: #{transfer.id} - {transfer.title}
          </Typography>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      {!transfer ? (
        <Paper sx={{ p: 3 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {error || 'Перемещение не найдено'}
          </Alert>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {/* Левая колонка - информация о перемещении */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Информация о запросе
              </Typography>
              
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 8 }}>
                  <TextField
                    fullWidth
                    label="Название"
                    value={transfer.title}
                    InputProps={{ readOnly: true }}
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    label="Статус"
                    value={getTransferStatusText(transfer.status)}
                    InputProps={{
                      readOnly: true,
                      startAdornment: (
                        <InputAdornment position="start">
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              backgroundColor: getTransferStatusColor(transfer.status),
                            }}
                          />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 2 }}
                  />
                </Grid>
              </Grid>
              
              <TextField
                fullWidth
                label="Описание"
                value={transfer.description || ''}
                multiline
                rows={3}
                InputProps={{ readOnly: true }}
                sx={{ mb: 2 }}
              />
              
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Запрошено руководителем"
                    value={transfer.createdByName || ''}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Получатель"
                    value={transfer.toUserName || ''}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Форма подтверждения */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Подтверждение запроса
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Курьер (если не вы)</InputLabel>
                <Select
                  value={executorId}
                  label="Курьер (если не вы)"
                  onChange={(e) => setExecutorId(e.target.value)}
                >
                  <MenuItem value="">Я сам</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id.toString()}>
                      {user.fullName} ({getRoleName(user.role)})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                label="Комментарий"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                multiline
                rows={3}
                sx={{ mb: 2 }}
                placeholder="Дополнительная информация о перемещении..."
              />
              
              {/* Загрузка файлов */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Фотографии товаров *
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Для выполнения запроса необходимо прикрепить фотографии всех товаров.
                  Разрешены только изображения (JPEG, PNG, GIF, WebP).
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
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
                      Загружено фотографий: {filePreviews.length}
                    </Typography>
                    <Grid container spacing={2}>
                      {filePreviews.map((preview, index) => (
                        <Grid size={{ xs: 6, md: 4 }} key={index}>
                          <Card>
                            <CardContent sx={{ p: 1, textAlign: 'center' }}>
                              <Box
                                component="img"
                                src={preview}
                                alt={`Фото ${index + 1}`}
                                sx={{
                                  width: '100%',
                                  height: 120,
                                  objectFit: 'cover',
                                  borderRadius: 1,
                                  mb: 1,
                                  cursor: 'pointer',
                                  '&:hover': {
                                    opacity: 0.8,
                                  },
                                }}
                                onClick={() => viewPhoto(preview)}
                              />
                              <Button
                                size="small"
                                startIcon={<DeleteIcon />}
                                onClick={() => removeFile(index)}
                                color="error"
                              >
                                Удалить
                              </Button>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </>
                )}
              </Box>
              
              <Button
                variant="contained"
                startIcon={submitting ? <CircularProgress size={20} /> : <SaveIcon />}
                onClick={handleSubmit}
                disabled={submitting || files.length === 0}
                fullWidth
                sx={{ mb: 2, backgroundColor: '#4caf50' }}
              >
                {submitting ? 'Сохранение...' : 'Подтвердить и выполнить запрос'}
              </Button>
              
              <Button
                variant="outlined"
                color="error"
                onClick={handleReject}
                disabled={submitting}
                fullWidth
              >
                Отклонить запрос
              </Button>
            </Paper>
          </Grid>

          {/* Правая колонка - товары */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Товары для перемещения
              </Typography>
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Товар</TableCell>
                      <TableCell>Артикул</TableCell>
                      <TableCell align="center">Требуется</TableCell>
                      <TableCell align="center">Доступно</TableCell>
                      <TableCell align="center">Статус</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transfer.items.map((item) => {
                      const inventoryStatus = getInventoryStatus(item);
                      
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {getProductName(item.productId)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ color: '#4c5454' }}>
                              {getProductSku(item.productId)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">
                              {item.expectedQuantity} шт.
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">
                              {userInventory.find((inv: any) => inv.productId === item.productId)?.quantity || 0} шт.
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={inventoryStatus.text}
                              size="small"
                              icon={inventoryStatus.icon}
                              sx={{
                                backgroundColor: `${inventoryStatus.color}20`,
                                color: inventoryStatus.color,
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Divider sx={{ my: 3 }} />
              
              <Alert severity="warning">
                <Typography variant="subtitle2" gutterBottom>
                  Внимание!
                </Typography>
                <Typography variant="body2">
                  После подтверждения запроса товары будут зарезервированы в вашем инвентаре. 
                  Не подтверждайте запрос, если у вас недостаточно товаров.
                </Typography>
              </Alert>
            </Paper>
          </Grid>
        </Grid>
      )}

      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={successMessage}
      />
    </Container>
  );
};

export default ExecuteManagerRequestPage;