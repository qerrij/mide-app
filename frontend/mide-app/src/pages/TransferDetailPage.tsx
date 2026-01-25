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
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Avatar,
  Divider,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  CardHeader,
  Tooltip,
  useMediaQuery,
  useTheme,
  Stack,
  Snackbar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  PlayArrow as StartIcon,
  LocalShipping as InTransitIcon,
  Check as CompleteIcon,
  Warning as DiscrepancyIcon,
  Download as DownloadIcon,
  Person as PersonIcon,
  Inventory as InventoryIcon,
  Schedule as ScheduleIcon,
  Description as DescriptionIcon,
  Warning,
  Assignment as ExecuteIcon,
  Close as CloseIcon,
  PhotoCamera as PhotoIcon,
  Visibility as ViewIcon,
  CheckCircleOutline as ApprovedIcon,
  PersonAddAlt as AcceptedIcon,
  EventNote as EventIcon,
  Create as CreateIcon,
  Store as FromIcon,
  Storefront as ToIcon,
  Work as ExecutorIcon,
  CheckCircle as CheckIcon,
  Pending as PendingIcon,
  ErrorOutline as ErrorIcon,
  PlayArrow,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { transferService } from '../api/transferService';
import { userService } from '../api/userService';
import { productService } from '../api/productService';
import {
  TransferDetail,
  TransferStatus,
  TransferItemStatus,
  getTransferStatusText,
  getTransferStatusColor,
  getTransferItemStatusText,
  getTransferItemStatusColor,
  getRequestTypeText,
  TransferRequestType,
  Product,
} from '../types';

const TransferDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [transfer, setTransfer] = useState<TransferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [users, setUsers] = useState<{ [key: number]: string }>({});
  const [productDetails, setProductDetails] = useState<{ [key: number]: Product }>({});
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [approveData, setApproveData] = useState({
    approved: true,
    notes: '',
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning',
  });
  const [viewImageOpen, setViewImageOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');

  useEffect(() => {
    if (id) {
      loadTransfer();
    }
  }, [id]);

  const loadTransfer = async () => {
    try {
      setLoading(true);
      const transferData = await transferService.getTransferById(Number(id));
      setTransfer(transferData);
      
      // Загружаем имена пользователей
      const userIds = new Set<number>();
      userIds.add(transferData.fromUserId);
      userIds.add(transferData.toUserId);
      userIds.add(transferData.createdById);
      if (transferData.executorId) userIds.add(transferData.executorId);
      transferData.approvals.forEach(approval => userIds.add(approval.userId));
      
      // Добавляем ID пользователей, связанных с расхождениями
      if (transferData.discrepancyAcceptedById) {
        userIds.add(transferData.discrepancyAcceptedById);
      }
      if (transferData.discrepancyApprovedById) {
        userIds.add(transferData.discrepancyApprovedById);
      }
      
      if (userIds.size > 0) {
        const names = await userService.getUsersNames(Array.from(userIds));
        setUsers(names);
      }
      
      // Загружаем информацию о товарах
      await loadProductDetails(transferData);
      
    } catch (error) {
      console.error('Error loading transfer:', error);
      showSnackbar('Ошибка при загрузке перемещения', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadProductDetails = async (transferData: TransferDetail) => {
    try {
      setLoadingProducts(true);
      const productIds = transferData.items.map(item => item.productId);
      const discrepancyProductIds = transferData.discrepancyItems.map(item => item.productId);
      const allProductIds = Array.from(new Set([...productIds, ...discrepancyProductIds]));
      
      const productPromises = allProductIds.map(async (productId) => {
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
      showSnackbar('Ошибка при загрузке информации о товарах', 'error');
    } finally {
      setLoadingProducts(false);
    }
  };

  const getProductInfo = (productId: number) => {
    const product = productDetails[productId];
    return {
      name: product?.name || `Товар #${productId}`,
      sku: product?.sku || '',
      price: product?.price || 0,
      categoryName: product?.categoryName || '',
    };
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleApprove = async () => {
    try {
      await transferService.approveTransfer(Number(id), approveData);
      setShowApproveDialog(false);
      showSnackbar(
        approveData.approved 
          ? 'Перемещение подтверждено' 
          : 'Перемещение отклонено', 
        'success'
      );
      loadTransfer();
    } catch (error: any) {
      console.error('Error approving transfer:', error);
      showSnackbar(error.message || 'Ошибка при подтверждении', 'error');
    }
  };

  const handleStart = async () => {
    try {
      await transferService.startTransfer(Number(id));
      showSnackbar('Перемещение начато', 'success');
      loadTransfer();
    } catch (error: any) {
      console.error('Error starting transfer:', error);
      showSnackbar(error.message || 'Ошибка при начале перемещения', 'error');
    }
  };

  const handleMarkArrived = () => {
    navigate(`/movements/${id}/arrived`);
  };

  const handleExecuteManagerRequest = () => {
    navigate(`/movements/${id}/execute-manager-request`);
  };

  const getActionButtons = () => {
    if (!transfer) return null;
    
    const buttons = [];
    
    // Для запросов от руководителя
    if (transfer.canExecute && transfer.status === TransferStatus.REQUESTED && 
        transfer.requestType === TransferRequestType.MANAGER_REQUEST) {
      buttons.push(
        <Button
          key="execute"
          variant="contained"
          startIcon={<ExecuteIcon />}
          onClick={handleExecuteManagerRequest}
          sx={{ mr: 1, backgroundColor: '#2196f3' }}
        >
          Выполнить запрос
        </Button>
      );
    }
    
    // Для обычных перемещений
    if (transfer.canApprove && transfer.status === TransferStatus.PENDING_APPROVAL) {
      buttons.push(
        <Button
          key="approve"
          variant="contained"
          startIcon={<ApproveIcon />}
          onClick={() => {
            setApproveData({ approved: true, notes: '' });
            setShowApproveDialog(true);
          }}
          sx={{ mr: 1, backgroundColor: '#4caf50' }}
        >
          Подтвердить
        </Button>
      );
      
      buttons.push(
        <Button
          key="reject"
          variant="contained"
          startIcon={<RejectIcon />}
          onClick={() => {
            setApproveData({ approved: false, notes: '' });
            setShowApproveDialog(true);
          }}
          sx={{ mr: 1, backgroundColor: '#f44336' }}
        >
          Отклонить
        </Button>
      );
    }
    
    if ((transfer.fromUserId === user?.id || transfer.executorId === user?.id) &&
        transfer.status === TransferStatus.APPROVED) {
      buttons.push(
        <Button
          key="start"
          variant="contained"
          startIcon={<StartIcon />}
          onClick={handleStart}
          sx={{ mr: 1, backgroundColor: '#2196f3' }}
        >
          Начать перемещение
        </Button>
      );
    }
    
    if (transfer.toUserId === user?.id &&
        transfer.status === TransferStatus.IN_TRANSIT) {
      buttons.push(
        <Button
          key="arrived"
          variant="contained"
          startIcon={<InTransitIcon />}
          onClick={handleMarkArrived}
          sx={{ mr: 1, backgroundColor: '#9c27b0' }}
        >
          Принять товар
        </Button>
      );
    }
    
    if (transfer.canApprove && transfer.status === TransferStatus.CHECKING) {
      buttons.push(
        <Button
          key="discrepancy"
          variant="contained"
          startIcon={<DiscrepancyIcon />}
          onClick={() => navigate(`/movements/${id}/verify-discrepancy`)}
          sx={{ mr: 1, backgroundColor: '#ff9800' }}
        >
          Проверить расхождения
        </Button>
      );
    }
    
    return buttons;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const viewFile = (filePath: string) => {
    const url = `http://localhost:8000/uploads/${filePath}`;
    window.open(url, '_blank');
  };

  const openImageDialog = (filePath: string) => {
    const imageUrl = `http://localhost:8000/uploads/${filePath}`;
    setSelectedImage(imageUrl);
    setViewImageOpen(true);
  };

  const closeImageDialog = () => {
    setViewImageOpen(false);
    setSelectedImage('');
  };

  const isImageFile = (filename: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  };

  const getFileName = (filePath: string) => {
    return filePath.split('/').pop() || 'Файл';
  };

  // Функция для определения типа завершения перемещения
  const getTransferCompletionType = () => {
    if (!transfer) return 'none';
    
    if (transfer.status === TransferStatus.COMPLETED || transfer.status === TransferStatus.CHECKING) {
      if (transfer.discrepancyFiles.length > 0) {
        return 'with_discrepancy';
      } else if (transfer.arrivalFiles.length > 0) {
        return 'without_discrepancy';
      }
    }
    
    return 'none';
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!transfer) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">Перемещение не найдено</Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/movements')} sx={{ mt: 2 }}>
          Назад к перемещениям
        </Button>
      </Container>
    );
  }

  const completionType = getTransferCompletionType();

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Шапка страницы */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/movements')}
          sx={{ mb: 2 }}
        >
          Назад к перемещениям
        </Button>
        
        <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="h4" component="h1" gutterBottom color="#2a0f35">
              {transfer.title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 1 }}>
              <Chip
                label={getTransferStatusText(transfer.status)}
                sx={{
                  backgroundColor: `${getTransferStatusColor(transfer.status)}20`,
                  color: getTransferStatusColor(transfer.status),
                  fontWeight: 600,
                }}
              />
              <Chip
                label={getRequestTypeText(transfer.requestType)}
                variant="outlined"
                size="small"
                sx={{
                  backgroundColor: transfer.requestType === TransferRequestType.MANAGER_REQUEST 
                    ? '#673ab720' 
                    : '#2196f320',
                  color: transfer.requestType === TransferRequestType.MANAGER_REQUEST 
                    ? '#673ab7' 
                    : '#2196f3',
                }}
              />
              <Typography variant="caption" color="textSecondary">
                ID: #{transfer.id}
              </Typography>
            </Box>
            
            {/* Информация о подтверждениях */}
            {transfer.approvals.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                <Typography variant="body2" color="textSecondary">
                  Подтвердили:
                </Typography>
                {transfer.approvals
                  .filter(a => a.approved)
                  .map((approval, index) => (
                    <Typography key={approval.id} variant="body2" sx={{ 
                      color: '#4caf50',
                      fontWeight: 500,
                      '&:not(:last-child):after': { content: '","', color: '#4c5454' }
                    }}>
                      {users[approval.userId] || `Пользователь ${approval.userId}`}
                    </Typography>
                  ))}
              </Box>
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 6 }} sx={{ textAlign: { md: 'right' } }}>
            <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }} flexWrap="wrap">
              {getActionButtons()}
            </Stack>
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={3}>
        {/* Объединенный блок: Основная информация + Участники */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Grid container spacing={3}>
                {/* Левая колонка: Основная информация */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3 }}>
                    <Box sx={{ 
                      backgroundColor: '#2196f320', 
                      borderRadius: '50%', 
                      p: 1.5,
                      mr: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <DescriptionIcon sx={{ color: '#2196f3', fontSize: 24 }} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        Описание перемещения
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#4c5454' }}>
                        {transfer.description || 'Нет описания'}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <CreateIcon sx={{ mr: 1.5, color: '#9c27b0' }} />
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Создано
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {formatDate(transfer.createdAt)}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {transfer.rejectionReason ? (
                      <ErrorIcon sx={{ mr: 1.5, color: '#f44336' }} />
                    ) : (
                      <CheckIcon sx={{ mr: 1.5, color: '#4caf50' }} />
                    )}
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Статус подтверждений
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 500,
                          color: transfer.rejectionReason ? '#f44336' : '#4caf50'
                        }}
                      >
                        {transfer.rejectionReason 
                          ? `Отклонено: ${transfer.rejectionReason}` 
                          : `${transfer.approvalsCount} из ${transfer.pendingApprovals.length + transfer.approvalsCount} подтверждений`}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Правая колонка: Участники */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                    Участники процесса
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {/* Создатель */}
                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ 
                        p: 1.5, 
                        borderRadius: 2, 
                        border: '1px solid #e0e0e0',
                        backgroundColor: '#f9f9f9',
                        height: '100%'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Box sx={{ 
                            backgroundColor: '#9c27b020', 
                            borderRadius: '50%', 
                            p: 0.8,
                            mr: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <CreateIcon sx={{ color: '#9c27b0', fontSize: 16 }} />
                          </Box>
                          <Typography variant="caption" color="textSecondary">
                            Создатель
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {users[transfer.createdById] || `ID: ${transfer.createdById}`}
                        </Typography>
                      </Box>
                    </Grid>

                    {/* Отправитель */}
                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ 
                        p: 1.5, 
                        borderRadius: 2, 
                        border: '1px solid #e0e0e0',
                        backgroundColor: '#f9f9f9',
                        height: '100%'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Box sx={{ 
                            backgroundColor: '#ff980020', 
                            borderRadius: '50%', 
                            p: 0.8,
                            mr: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <FromIcon sx={{ color: '#ff9800', fontSize: 16 }} />
                          </Box>
                          <Typography variant="caption" color="textSecondary">
                            Отправитель
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {users[transfer.fromUserId] || `ID: ${transfer.fromUserId}`}
                        </Typography>
                        {transfer.fromUserRole && (
                          <Typography variant="caption" color="#ff9800" sx={{ display: 'block', mt: 0.5 }}>
                            {transfer.fromUserRole}
                          </Typography>
                        )}
                      </Box>
                    </Grid>

                    {/* Получатель */}
                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ 
                        p: 1.5, 
                        borderRadius: 2, 
                        border: '1px solid #e0e0e0',
                        backgroundColor: '#f9f9f9',
                        height: '100%'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Box sx={{ 
                            backgroundColor: '#4caf5020', 
                            borderRadius: '50%', 
                            p: 0.8,
                            mr: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <ToIcon sx={{ color: '#4caf50', fontSize: 16 }} />
                          </Box>
                          <Typography variant="caption" color="textSecondary">
                            Получатель
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {users[transfer.toUserId] || `ID: ${transfer.toUserId}`}
                        </Typography>
                        {transfer.toUserRole && (
                          <Typography variant="caption" color="#4caf50" sx={{ display: 'block', mt: 0.5 }}>
                            {transfer.toUserRole}
                          </Typography>
                        )}
                      </Box>
                    </Grid>

                    {/* Исполнитель */}
                    <Grid size={{ xs: 6 }}>
                      <Box sx={{ 
                        p: 1.5, 
                        borderRadius: 2, 
                        border: '1px solid #e0e0e0',
                        backgroundColor: '#f9f9f9',
                        height: '100%'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Box sx={{ 
                            backgroundColor: '#2196f320', 
                            borderRadius: '50%', 
                            p: 0.8,
                            mr: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <ExecutorIcon sx={{ color: '#2196f3', fontSize: 16 }} />
                          </Box>
                          <Typography variant="caption" color="textSecondary">
                            Курьер
                          </Typography>
                        </Box>
                        {transfer.executorId ? (
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {users[transfer.executorId] || `ID: ${transfer.executorId}`}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="textSecondary" fontStyle="italic">
                            Не назначен
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Товары */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader
              title="Товары"
              subheader={`Всего: ${transfer.totalQuantity || 0} ед., ${transfer.items.length} позиций`}
              titleTypographyProps={{ variant: 'h6', color: '#2a0f35' }}
              action={
                transfer.discrepancies?.hasDiscrepancies && (
                  <Chip
                    label={`${transfer.discrepancies.missingItems} недостач, ${transfer.discrepancies.excessItems} излишков`}
                    color="warning"
                    icon={<Warning />}
                    sx={{ mr: 2 }}
                  />
                )
              }
            />
            <CardContent>
              {loadingProducts ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <TableContainer>
                  <Table size={isMobile ? "small" : "medium"}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Товар</TableCell>
                        <TableCell>Артикул</TableCell>
                        <TableCell>Категория</TableCell>
                        <TableCell align="right">Ожидается</TableCell>
                        <TableCell align="right">Получено</TableCell>
                        <TableCell>Статус</TableCell>
                        <TableCell>Примечание</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {transfer.items.map((item, index) => {
                        const productInfo = getProductInfo(item.productId);
                        
                        return (
                          <TableRow key={index} hover>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {productInfo.name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" color="textSecondary">
                                {productInfo.sku || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" color="textSecondary">
                                {productInfo.categoryName || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">
                                {item.expectedQuantity} шт.
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" sx={{ 
                                color: item.receivedQuantity === item.expectedQuantity ? '#4caf50' : 
                                       item.receivedQuantity === 0 ? '#ff9800' : '#f44336',
                                fontWeight: item.receivedQuantity !== item.expectedQuantity ? 600 : 400
                              }}>
                                {item.receivedQuantity || 0} шт.
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={getTransferItemStatusText(item.status)}
                                size="small"
                                sx={{
                                  backgroundColor: `${getTransferItemStatusColor(item.status)}20`,
                                  color: getTransferItemStatusColor(item.status),
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ color: '#4c5454', fontStyle: item.notes ? 'normal' : 'italic' }}>
                                {item.notes || '—'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Блок расхождений (если есть) */}
        {(transfer.discrepancyAcceptedById || (transfer.discrepancyItems && transfer.discrepancyItems.length > 0)) && (
          <Grid container spacing={3}>
            {/* Принятие с расхождениями */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: '100%' }}>
                <CardHeader
                  title="Принятие с расхождениями"
                  titleTypographyProps={{ variant: 'h6', color: '#2a0f35' }}
                />
                <CardContent>
                  {transfer.discrepancyAcceptedById ? (
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Box sx={{ 
                            backgroundColor: '#ff980020', 
                            borderRadius: '50%', 
                            p: 1.2,
                            mr: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <PersonIcon sx={{ color: '#ff9800', fontSize: 20 }} />
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" color="textSecondary">
                              Кто принял
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {transfer.discrepancyAcceptedByName || users[transfer.discrepancyAcceptedById] || `Пользователь ${transfer.discrepancyAcceptedById}`}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ 
                            backgroundColor: '#ff980020', 
                            borderRadius: '50%', 
                            p: 1.2,
                            mr: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <EventIcon sx={{ color: '#ff9800', fontSize: 20 }} />
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" color="textSecondary">
                              Когда принято
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {transfer.discrepancyAcceptedAt ? formatDate(transfer.discrepancyAcceptedAt) : 'Дата не указана'}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                  ) : (
                    <Typography variant="body2" color="textSecondary" fontStyle="italic">
                      Информация о принятии отсутствует
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Подтверждение расхождений */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ height: '100%' }}>
                <CardHeader
                  title="Подтверждение расхождений"
                  titleTypographyProps={{ variant: 'h6', color: '#2a0f35' }}
                />
                <CardContent>
                  {transfer.discrepancyApprovedById ? (
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Box sx={{ 
                            backgroundColor: '#4caf5020', 
                            borderRadius: '50%', 
                            p: 1.2,
                            mr: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <PersonIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" color="textSecondary">
                              Кто подтвердил
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {transfer.discrepancyApprovedByName || users[transfer.discrepancyApprovedById] || `Пользователь ${transfer.discrepancyApprovedById}`}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ 
                            backgroundColor: '#4caf5020', 
                            borderRadius: '50%', 
                            p: 1.2,
                            mr: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <EventIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" color="textSecondary">
                              Когда подтверждено
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {transfer.discrepancyApprovedAt ? formatDate(transfer.discrepancyApprovedAt) : 'Дата не указана'}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                  ) : (
                    <Typography variant="body2" color="textSecondary" fontStyle="italic">
                      Расхождения еще не подтверждены
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Детали расхождений */}
            {transfer.discrepancyItems && transfer.discrepancyItems.length > 0 && (
              <Grid size={{ xs: 12 }}>
                <Card>
                  <CardHeader
                    title="Детали расхождений"
                    titleTypographyProps={{ variant: 'h6', color: '#2a0f35' }}
                  />
                  <CardContent>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Товар</TableCell>
                            <TableCell align="right">Ожидалось</TableCell>
                            <TableCell align="right">Фактически</TableCell>
                            <TableCell align="right">Разница</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {transfer.discrepancyItems.map((item, index) => {
                            const productInfo = getProductInfo(item.productId);
                            
                            return (
                              <TableRow key={index} hover>
                                <TableCell>
                                  <Typography variant="body2">
                                    {productInfo.name}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">{item.expectedQuantity} шт.</TableCell>
                                <TableCell align="right">{item.actualQuantity} шт.</TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" sx={{ 
                                    color: item.discrepancy >= 0 ? '#4caf50' : '#f44336',
                                    fontWeight: 600
                                  }}>
                                    {item.discrepancy > 0 ? '+' : ''}{item.discrepancy} шт.
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        )}

        {/* Фотографии при завершении перемещения */}
        {completionType !== 'none' && (
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {completionType === 'with_discrepancy' ? (
                      <>
                        <Warning sx={{ color: '#ff9800' }} />
                        <span>Фотографии при завершении с расхождениями</span>
                      </>
                    ) : (
                      <>
                        <CheckIcon sx={{ color: '#4caf50' }} />
                        <span>Фотографии при завершении без расхождений</span>
                      </>
                    )}
                  </Box>
                }
                subheader={
                  completionType === 'with_discrepancy'
                    ? `Фотографии, прикрепленные получателем при обнаружении расхождений (${transfer.discrepancyFiles.length} файлов)`
                    : `Фотографии, прикрепленные получателем при приеме товара (${transfer.arrivalFiles.length} файлов)`
                }
                titleTypographyProps={{ variant: 'h6', color: '#2a0f35' }}
              />
              <CardContent>
                <ImageList 
                  cols={isMobile ? 3 : 4} 
                  gap={12}
                  sx={{ 
                    mb: 2,
                    maxHeight: 'none'
                  }}
                >
                  {(completionType === 'with_discrepancy' ? transfer.discrepancyFiles : transfer.arrivalFiles).map((file, index) => {
                    const fileName = getFileName(file);
                    const isImage = isImageFile(fileName);
                    
                    return (
                      <ImageListItem key={index}>
                        {isImage ? (
                          <Box
                            component="img"
                            src={`http://localhost:8000/uploads/${file}`}
                            alt={fileName}
                            loading="lazy"
                            sx={{
                              width: '100%',
                              height: 140,
                              objectFit: 'cover',
                              borderRadius: 1,
                              cursor: 'pointer',
                              '&:hover': {
                                opacity: 0.8,
                              },
                            }}
                            onClick={() => openImageDialog(file)}
                          />
                        ) : (
                          <Paper
                            sx={{
                              width: '100%',
                              height: 140,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: 1,
                              bgcolor: '#f5f5f5',
                              p: 2,
                            }}
                          >
                            <DescriptionIcon sx={{ fontSize: 40, color: '#666', mb: 1 }} />
                            <Typography variant="caption" align="center" sx={{ 
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              width: '100%'
                            }}>
                              {fileName}
                            </Typography>
                          </Paper>
                        )}
                        <ImageListItemBar
                          position="top"
                          actionIcon={
                            <Stack direction="row" spacing={0.5}>
                              {isImage && (
                                <Tooltip title="Просмотр">
                                  <IconButton
                                    size="small"
                                    onClick={() => openImageDialog(file)}
                                    sx={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)' }}
                                  >
                                    <ViewIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip title="Скачать">
                                <IconButton
                                  size="small"
                                  onClick={() => viewFile(file)}
                                  sx={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)' }}
                                >
                                  <DownloadIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          }
                          actionPosition="right"
                        />
                      </ImageListItem>
                    );
                  })}
                </ImageList>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Исходные файлы перемещения (если есть) */}
        {transfer.files.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardHeader
                title={`Исходные файлы перемещения (${transfer.files.length})`}
                subheader="Файлы, прикрепленные при создании перемещения"
                titleTypographyProps={{ variant: 'h6', color: '#2a0f35' }}
              />
              <CardContent>
                <ImageList 
                  cols={isMobile ? 3 : 4} 
                  gap={12}
                  sx={{ 
                    mb: 2,
                    maxHeight: 'none'
                  }}
                >
                  {transfer.files.map((file, index) => {
                    const fileName = getFileName(file);
                    const isImage = isImageFile(fileName);
                    
                    return (
                      <ImageListItem key={index}>
                        {isImage ? (
                          <Box
                            component="img"
                            src={`http://localhost:8000/uploads/${file}`}
                            alt={fileName}
                            loading="lazy"
                            sx={{
                              width: '100%',
                              height: 140,
                              objectFit: 'cover',
                              borderRadius: 1,
                              cursor: 'pointer',
                              '&:hover': {
                                opacity: 0.8,
                              },
                            }}
                            onClick={() => openImageDialog(file)}
                          />
                        ) : (
                          <Paper
                            sx={{
                              width: '100%',
                              height: 140,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: 1,
                              bgcolor: '#f5f5f5',
                              p: 2,
                            }}
                          >
                            <DescriptionIcon sx={{ fontSize: 40, color: '#666', mb: 1 }} />
                            <Typography variant="caption" align="center" sx={{ 
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              width: '100%'
                            }}>
                              {fileName}
                            </Typography>
                          </Paper>
                        )}
                        <ImageListItemBar
                          position="top"
                          actionIcon={
                            <Stack direction="row" spacing={0.5}>
                              {isImage && (
                                <Tooltip title="Просмотр">
                                  <IconButton
                                    size="small"
                                    onClick={() => openImageDialog(file)}
                                    sx={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)' }}
                                  >
                                    <ViewIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              <Tooltip title="Скачать">
                                <IconButton
                                  size="small"
                                  onClick={() => viewFile(file)}
                                  sx={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)' }}
                                >
                                  <DownloadIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          }
                          actionPosition="right"
                        />
                      </ImageListItem>
                    );
                  })}
                </ImageList>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Хронология */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardHeader
              title="Хронология"
              titleTypographyProps={{ variant: 'h6', color: '#2a0f35' }}
            />
            <CardContent>
              <Grid container spacing={2}>
                {[
                  { date: transfer.createdAt, label: 'Создано', color: '#2196f3', icon: <CreateIcon /> },
                  { date: transfer.approvedAt, label: 'Подтверждено', color: '#4caf50', icon: <CheckIcon /> },
                  { date: transfer.startedAt, label: 'Начато', color: '#2196f3', icon: <PlayArrow /> },
                  { date: transfer.arrivedAt, label: 'Прибыло', color: '#9c27b0', icon: <InTransitIcon /> },
                  { date: transfer.completedAt, label: 'Завершено', color: '#4caf50', icon: <CompleteIcon /> },
                ].map((item, index) => (
                  item.date && (
                    <Grid key={index} size={{ xs: 12, sm: 6, md: 2.4 }}>
                      <Box
                        sx={{
                          p: 2,
                          border: `1px solid ${item.color}20`,
                          borderRadius: 1,
                          backgroundColor: `${item.color}10`,
                          height: '100%',
                          display: 'flex',
                          alignItems: 'flex-start'
                        }}
                      >
                        <Box sx={{ 
                          backgroundColor: `${item.color}20`, 
                          borderRadius: '50%', 
                          p: 1,
                          mr: 1.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {React.cloneElement(item.icon, { sx: { color: item.color, fontSize: 18 } })}
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                            {item.label}
                          </Typography>
                          <Typography variant="body2" sx={{ color: item.color, fontWeight: 500 }}>
                            {formatDate(item.date)}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  )
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Диалог подтверждения/отклонения */}
      <Dialog open={showApproveDialog} onClose={() => setShowApproveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {approveData.approved ? 'Подтвердить перемещение' : 'Отклонить перемещение'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: '#4c5454' }}>
            {approveData.approved 
              ? 'Вы подтверждаете это перемещение. Товары будут зарезервированы у отправителя.'
              : 'Укажите причину отклонения перемещения.'}
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Комментарий"
            type="text"
            fullWidth
            multiline
            rows={3}
            value={approveData.notes}
            onChange={(e) => setApproveData({ ...approveData, notes: e.target.value })}
            placeholder={approveData.approved ? "Дополнительный комментарий (необязательно)" : "Обязательно укажите причину отклонения"}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setShowApproveDialog(false)} variant="outlined">
            Отмена
          </Button>
          <Button
            onClick={handleApprove}
            variant="contained"
            color={approveData.approved ? 'success' : 'error'}
            disabled={!approveData.approved && !approveData.notes.trim()}
          >
            {approveData.approved ? 'Подтвердить' : 'Отклонить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Модальное окно для просмотра изображений */}
      <Dialog
        open={viewImageOpen}
        onClose={closeImageDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Просмотр изображения</Typography>
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
              alt="Просмотр"
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

      {/* Snackbar для уведомлений */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default TransferDetailPage;