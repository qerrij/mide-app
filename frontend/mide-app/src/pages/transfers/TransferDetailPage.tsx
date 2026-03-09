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
  Card,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Fab,
  useTheme,
  useMediaQuery,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Snackbar,
  Divider,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  PhotoCamera as PhotoCameraIcon,
  Person as PersonIcon,
  Inventory as InventoryIcon,
  Photo as PhotoIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  Verified as VerifiedIcon,
  Warning as WarningIcon,
  LocalShipping as InTransitIcon,
  PlayArrow as StartIcon,
  Check as CompleteIcon,
  Create as CreateIcon,
  Store as FromIcon,
  Storefront as ToIcon,
  Work as ExecutorIcon,
  ExpandMore as ExpandMoreIcon,
  Description as DescriptionIcon,
  Comment as CommentIcon,
  ThumbDown as RejectIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { transferService } from '../../api/transferService';
import { userService } from '../../api/userService';
import { productService } from '../../api/productService';
import { PhotoViewer } from '../../components/PhotoViewer';
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
} from '../../types';

const TransferDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
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
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning',
  });
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{ photos: string[], index: number } | null>(null);
  const [expandedItems, setExpandedItems] = useState(true);
  const [expandedApprovals, setExpandedApprovals] = useState(false);
  const [expandedRejection, setExpandedRejection] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
      
      const userIds = new Set<number>();
      userIds.add(transferData.fromUserId);
      userIds.add(transferData.toUserId);
      userIds.add(transferData.createdById);
      if (transferData.executorId) userIds.add(transferData.executorId);
      transferData.approvals.forEach(approval => userIds.add(approval.userId));
      
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
    } finally {
      setLoadingProducts(false);
    }
  };

  const getProductInfo = (productId: number) => {
    const product = productDetails[productId];
    return {
      name: product?.name || `Товар #${productId}`,
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
      setShowStartDialog(false);
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

  const handleViewPhoto = (photos: string[], index: number) => {
    const processedPhotos = photos.map(photo => transferService.getPhotoUrl(photo));
    setSelectedPhoto({ photos: processedPhotos, index });
    setShowPhotoDialog(true);
  };

  const viewFile = (filePath: string) => {
    const url = transferService.getPhotoUrl(filePath);
    window.open(url, '_blank');
  };

  const isImageFile = (filename: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  };

  const getFileName = (filePath: string) => {
    return filePath.split('/').pop() || 'Файл';
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

  const getActionButtons = () => {
    if (!transfer) return null;
    
    const buttons = [];
    
    if (transfer.canExecute && transfer.status === TransferStatus.REQUESTED && 
        transfer.requestType === TransferRequestType.MANAGER_REQUEST) {
      buttons.push(
        <Button
          key="execute"
          variant="contained"
          startIcon={<EditIcon />}
          onClick={handleExecuteManagerRequest}
          sx={{
            borderRadius: 8,
            backgroundColor: '#674fb6',
            '&:hover': { backgroundColor: '#483399' },
            py: 1,
            textTransform: 'none',
            fontSize: '0.9rem',
          }}
        >
          Выполнить запрос
        </Button>
      );
    }
    
    if (transfer.canApprove && transfer.status === TransferStatus.PENDING_APPROVAL) {
      buttons.push(
        <Button
          key="approve"
          variant="contained"
          startIcon={<CheckCircleIcon />}
          onClick={() => {
            setApproveData({ approved: true, notes: '' });
            setShowApproveDialog(true);
          }}
          sx={{
            borderRadius: 8,
            backgroundColor: '#4caf50',
            '&:hover': { backgroundColor: '#3d8c40' },
            py: 1,
            textTransform: 'none',
            fontSize: '0.9rem',
          }}
        >
          Подтвердить
        </Button>
      );
      
      buttons.push(
        <Button
          key="reject"
          variant="contained"
          startIcon={<CloseIcon />}
          onClick={() => {
            setApproveData({ approved: false, notes: '' });
            setShowApproveDialog(true);
          }}
          sx={{
            borderRadius: 8,
            backgroundColor: '#f44336',
            '&:hover': { backgroundColor: '#d32f2f' },
            py: 1,
            textTransform: 'none',
            fontSize: '0.9rem',
          }}
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
          onClick={() => setShowStartDialog(true)}
          sx={{
            borderRadius: 8,
            backgroundColor: '#2196f3',
            '&:hover': { backgroundColor: '#1976d2' },
            py: 1,
            textTransform: 'none',
            fontSize: '0.9rem',
          }}
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
          sx={{
            borderRadius: 8,
            backgroundColor: '#ca0ec0',
            '&:hover': { backgroundColor: '#9e0b96' },
            py: 1,
            textTransform: 'none',
            fontSize: '0.9rem',
          }}
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
          startIcon={<WarningIcon />}
          onClick={() => navigate(`/movements/${id}/verify-discrepancy`)}
          sx={{
            borderRadius: 8,
            backgroundColor: '#ff9800',
            '&:hover': { backgroundColor: '#e68900' },
            py: 1,
            textTransform: 'none',
            fontSize: '0.9rem',
          }}
        >
          Проверить расхождения
        </Button>
      );
    }
    
    return buttons;
  };

  const calculateTotalDiscrepancy = () => {
    if (!transfer?.discrepancyItems || transfer.discrepancyItems.length === 0) return 0;
    return transfer.discrepancyItems.reduce((sum, item) => sum + item.discrepancy, 0);
  };

  const hasDiscrepancies = transfer?.discrepancyItems && transfer.discrepancyItems.length > 0;
  const totalDiscrepancy = calculateTotalDiscrepancy();
  
  const getItemDiscrepancy = (productId: number) => {
    if (!transfer?.discrepancyItems) return null;
    return transfer.discrepancyItems.find(item => item.productId === productId);
  };

  const getSortedItems = () => {
    if (!transfer) return [];
    
    const itemsWithDiscrepancy: typeof transfer.items = [];
    const itemsWithoutDiscrepancy: typeof transfer.items = [];
    
    transfer.items.forEach(item => {
      if (hasDiscrepancies && transfer.discrepancyItems.some(d => d.productId === item.productId)) {
        itemsWithDiscrepancy.push(item);
      } else {
        itemsWithoutDiscrepancy.push(item);
      }
    });
    
    return [...itemsWithDiscrepancy, ...itemsWithoutDiscrepancy];
  };

  const sortedItems = getSortedItems();

  const getStatusText = () => {
    if (!transfer) return '';
    
    if (transfer.status === TransferStatus.CHECKING) {
      return 'Перемещение имеет расхождения';
    }
    return getTransferStatusText(transfer.status);
  };

  const getStatusColor = () => {
    if (!transfer) return '#4c5454';
    
    if (transfer.status === TransferStatus.CHECKING) {
      return '#ff9800';
    }
    return getTransferStatusColor(transfer.status);
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
              '& .MuiAlert-icon': {
                color: '#ca0ec0',
              }
            }}
          >
            Перемещение не найдено
          </Alert>
        </Container>
      </Box>
    );
  }

  const hasRejection = transfer.rejectionReason && 
    (transfer.status === TransferStatus.REJECTED || 
     transfer.status === TransferStatus.CANCELLED);

  return (
    <Box sx={{ minHeight: '100vh', py: 3, position: 'relative', background: '#f5f3f6' }}>
      {/* Плавающая кнопка назад для мобильных устройств */}
      {isMobile && (
        <Fab
          onClick={() => navigate('/movements')}
          sx={{
            position: 'fixed',
            top: 64,
            left: 16,
            zIndex: 1000,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
            '&:hover': { 
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
            },
            width: 44,
            height: 44,
            mt: 1,
          }}
        >
          <ArrowBackIcon sx={{ 
            color: 'rgba(103, 79, 182, 0.8)',
            fontSize: 22 
          }} />
        </Fab>
      )}

      <Container maxWidth="lg" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
        {/* Верхняя панель с кнопками на одной линии */}
        <Box sx={{ 
          mb: 3, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
          position: 'relative',
          zIndex: 1,
          mt: isMobile ? 6 : 0
        }}>
          {/* Кнопка назад для десктопа */}
          {!isMobile && (
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/movements')}
              sx={{
                borderRadius: 8,
                color: '#674fb6',
                textTransform: 'none',
                fontSize: '0.9rem',
                px: 2,
                py: 1,
                border: '1px solid rgba(103, 79, 182, 0.2)',
                '&:hover': { 
                  backgroundColor: 'rgba(103, 79, 182, 0.04)',
                  border: '1px solid rgba(103, 79, 182, 0.3)',
                },
              }}
            >
              Назад к перемещениям
            </Button>
          )}

          {/* Кнопки действий */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', ml: 'auto' }}>
            {getActionButtons()}
          </Box>
        </Box>

        {/* Шапка с основной информацией */}
        <Card 
          sx={{ 
            p: { xs: 2, sm: 2.5 },
            mb: 3,
            borderRadius: 8,
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
          }}
        >
          <Box sx={{ mb: 2 }}>
            <Typography variant="h5" component="h1" color="#2a0f35" fontWeight={600} gutterBottom>
              {transfer.title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Chip
                label={getStatusText()}
                size="small"
                sx={{
                  backgroundColor: `${getStatusColor()}15`,
                  color: getStatusColor(),
                  fontWeight: 500,
                  borderRadius: 6,
                  fontSize: '0.7rem',
                }}
              />
              <Chip
                label={getRequestTypeText(transfer.requestType)}
                size="small"
                sx={{
                  backgroundColor: transfer.requestType === TransferRequestType.MANAGER_REQUEST 
                    ? 'rgba(103, 79, 182, 0.15)' 
                    : 'rgba(33, 150, 243, 0.15)',
                  color: transfer.requestType === TransferRequestType.MANAGER_REQUEST 
                    ? '#674fb6' 
                    : '#2196f3',
                  borderRadius: 6,
                  fontSize: '0.7rem',
                }}
              />
              <Typography variant="caption" color="#4c5454">
                ID: #{transfer.id}
              </Typography>
            </Box>
          </Box>

          <Stack spacing={2}>
            <Grid container spacing={2}>
              {/* Создатель */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Avatar
                    sx={{ 
                      width: 36, 
                      height: 36, 
                      bgcolor: '#674fb6',
                      flexShrink: 0,
                      fontSize: '0.9rem',
                    }}
                  >
                    {users[transfer.createdById]?.charAt(0) || 'С'}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                      Создатель
                    </Typography>
                    <Typography variant="body2" color="#2a0f35" fontWeight={500}>
                      {users[transfer.createdById] || `Пользователь ${transfer.createdById}`}
                    </Typography>
                    <Typography variant="caption" color="#4c5454">
                      {formatDateTime(transfer.createdAt)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              
              {/* Отправитель */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Avatar
                    sx={{ 
                      width: 36, 
                      height: 36, 
                      bgcolor: '#ff9800',
                      flexShrink: 0,
                      fontSize: '0.9rem',
                    }}
                  >
                    {users[transfer.fromUserId]?.charAt(0) || 'О'}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                      Отправитель
                    </Typography>
                    <Typography variant="body2" color="#2a0f35" fontWeight={500}>
                      {users[transfer.fromUserId] || `Пользователь ${transfer.fromUserId}`}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              {/* Получатель */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Avatar
                    sx={{ 
                      width: 36, 
                      height: 36, 
                      bgcolor: '#4caf50',
                      flexShrink: 0,
                      fontSize: '0.9rem',
                    }}
                  >
                    {users[transfer.toUserId]?.charAt(0) || 'П'}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                      Получатель
                    </Typography>
                    <Typography variant="body2" color="#2a0f35" fontWeight={500}>
                      {users[transfer.toUserId] || `Пользователь ${transfer.toUserId}`}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              {/* Исполнитель */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Avatar
                    sx={{ 
                      width: 36, 
                      height: 36, 
                      bgcolor: '#2196f3',
                      flexShrink: 0,
                      fontSize: '0.9rem',
                    }}
                  >
                    {transfer.executorId ? (users[transfer.executorId]?.charAt(0) || 'И') : '—'}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                      Курьер
                    </Typography>
                    {transfer.executorId ? (
                      <Typography variant="body2" color="#2a0f35" fontWeight={500}>
                        {users[transfer.executorId] || `Пользователь ${transfer.executorId}`}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="#4c5454" fontStyle="italic">
                        Не назначен
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Grid>
            </Grid>

            {/* Описание */}
            {transfer.description && (
              <Box>
                <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                  Описание
                </Typography>
                <Typography variant="body2" color="#2a0f35" sx={{ whiteSpace: 'pre-wrap' }}>
                  {transfer.description}
                </Typography>
              </Box>
            )}
          </Stack>
        </Card>

        {/* 🔴 ИСПРАВЛЕНО: Блок с причиной отклонения */}
        {hasRejection && (
          <Card 
            sx={{ 
              p: { xs: 2, sm: 2.5 },
              mb: 3,
              borderRadius: 8,
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
              border: '2px solid #f44336',
            }}
          >
            <Accordion
              expanded={expandedRejection}
              onChange={() => setExpandedRejection(!expandedRejection)}
              sx={{
                boxShadow: 'none',
                '&:before': { display: 'none' },
                backgroundColor: 'transparent',
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  minHeight: 48,
                  '&.Mui-expanded': { minHeight: 48 },
                  px: 0,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar
                    sx={{ 
                      width: 40, 
                      height: 40, 
                      bgcolor: '#f44336',
                      fontSize: '1rem',
                    }}
                  >
                    <RejectIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" color="#2a0f35" fontWeight={600}>
                      Перемещение отклонено
                    </Typography>
                    <Typography variant="caption" color="#4c5454">
                      Причина указана ниже
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              
              <AccordionDetails sx={{ px: 0, pt: 1 }}>
                <Box sx={{ 
                  p: 2, 
                  backgroundColor: '#f5f3f6', 
                  borderRadius: 8,
                  border: '1px solid rgba(244, 67, 54, 0.2)',
                }}>
                  <Typography variant="body2" color="#2a0f35" sx={{ whiteSpace: 'pre-wrap' }}>
                    {transfer.rejectionReason}
                  </Typography>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Card>
        )}

        {/* Блок статуса перемещения */}
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
            {transfer.status === TransferStatus.CHECKING ? (
              <Box>
                <Typography variant="body2" color="#ff9800" gutterBottom sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                  Требуется проверка расхождений
                </Typography>
                <Typography 
                  variant="h1" 
                  color="#ff9800"
                  sx={{ 
                    fontWeight: 'bold', 
                    my: 1,
                    fontSize: { xs: '2.5rem', sm: '3.5rem' }
                  }}
                >
                  {totalDiscrepancy > 0 ? '+' : ''}{totalDiscrepancy}
                </Typography>
                <Typography variant="body2" color="#4c5454">
                  {totalDiscrepancy > 0 ? 'Обнаружен излишек' : 'Обнаружена недостача'}
                </Typography>
              </Box>
            ) : transfer.status === TransferStatus.COMPLETED && hasDiscrepancies ? (
              <Box>
                <Typography variant="body2" color="#4c5454" gutterBottom>
                  Перемещение завершено с расхождениями
                </Typography>
                <Typography 
                  variant="h1" 
                  color={totalDiscrepancy > 0 ? '#2196f3' : '#ca0ec0'}
                  sx={{ 
                    fontWeight: 'bold', 
                    my: 1,
                    fontSize: { xs: '3rem', sm: '4rem' }
                  }}
                >
                  {totalDiscrepancy > 0 ? '+' : ''}{totalDiscrepancy}
                </Typography>
                <Typography variant="caption" color="#4c5454">
                  {totalDiscrepancy > 0 ? 'Итоговый излишек' : 'Итоговая недостача'}
                </Typography>
              </Box>
            ) : transfer.status === TransferStatus.COMPLETED && !hasDiscrepancies ? (
              <Box>
                <Typography 
                  variant="h2" 
                  color="#4caf50"
                  sx={{ 
                    fontWeight: 'bold',
                    fontSize: { xs: '2rem', sm: '2.5rem' }
                  }}
                >
                  Расхождений нет
                </Typography>
              </Box>
            ) : transfer.status === TransferStatus.REJECTED ? (
              <Box>
                <Typography 
                  variant="h2" 
                  color="#f44336"
                  sx={{ 
                    fontWeight: 'bold',
                    fontSize: { xs: '2rem', sm: '2.5rem' }
                  }}
                >
                  Отклонено
                </Typography>
              </Box>
            ) : (
              <Box>
                <Typography variant="body2" color="#4c5454" gutterBottom>
                  Текущий статус перемещения
                </Typography>
                <Typography 
                  variant="h2" 
                  color="#2a0f35" 
                  sx={{ 
                    fontWeight: 'bold', 
                    my: 1,
                    fontSize: { xs: '2rem', sm: '2.5rem' }
                  }}
                >
                  {getTransferStatusText(transfer.status)}
                </Typography>
                {transfer.status === TransferStatus.IN_TRANSIT && (
                  <Typography variant="caption" color="#4c5454">
                    Товар в пути к получателю
                  </Typography>
                )}
                {transfer.status === TransferStatus.PENDING_APPROVAL && (
                  <Typography variant="caption" color="#4c5454">
                    Ожидает подтверждения {transfer.pendingApprovals?.length || 0} пользователей
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Card>

        {/* Блок с товарами - ЕДИНЫЙ СПИСОК */}
        <Card 
          sx={{ 
            p: 0,
            mb: 3,
            borderRadius: 8,
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
            width: '100%',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ 
            p: { xs: 2, sm: 2.5 },
            pb: 2,
            borderBottom: '1px solid rgba(0,0,0,0.05)',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" color="#2a0f35" fontWeight={600}>
                Товары в перемещении ({transfer.items.length})
              </Typography>
              {hasDiscrepancies && (
                <Chip
                  label={`${totalDiscrepancy > 0 ? '+' : ''}${totalDiscrepancy}`}
                  size="small"
                  sx={{
                    backgroundColor: totalDiscrepancy > 0 ? 'rgba(33, 150, 243, 0.15)' : 'rgba(202, 14, 192, 0.15)',
                    color: totalDiscrepancy > 0 ? '#2196f3' : '#ca0ec0',
                    fontWeight: 600,
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
                width: '100%',
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
                  width: '100%',
                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                }}
              >
                <Typography variant="body2" color="#4c5454">
                  {expandedItems ? 'Скрыть товары' : 'Показать товары'}
                </Typography>
              </AccordionSummary>
              
              <AccordionDetails sx={{ 
                px: { xs: 2, sm: 2.5 }, 
                pb: 3, 
                pt: 2,
                width: '100%',
                backgroundColor: '#f5f3f6',
              }}>
                <Grid container spacing={2}>
                  {sortedItems.map((item, index) => {
                    const productInfo = getProductInfo(item.productId);
                    const discrepancy = getItemDiscrepancy(item.productId);
                    
                    return (
                      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                        <Card
                          sx={{
                            p: 2,
                            borderRadius: 8,
                            backgroundColor: '#ffffff',
                            boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
                            height: '100%',
                            transition: 'transform 0.2s ease',
                            border: discrepancy ? `2px solid ${discrepancy.discrepancy > 0 ? '#2196f3' : '#ca0ec0'}` : 'none',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: '0 6px 16px rgba(106, 61, 122, 0.15)',
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="body2" color="#2a0f35" fontWeight={600} sx={{ flex: 1 }}>
                              {productInfo.name}
                            </Typography>
                            {discrepancy && (
                              <Chip
                                label={`${discrepancy.discrepancy > 0 ? '+' : ''}${discrepancy.discrepancy}`}
                                size="small"
                                sx={{
                                  ml: 1,
                                  backgroundColor: discrepancy.discrepancy > 0 
                                    ? 'rgba(33, 150, 243, 0.15)' 
                                    : 'rgba(202, 14, 192, 0.15)',
                                  color: discrepancy.discrepancy > 0 ? '#2196f3' : '#ca0ec0',
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
                                  height: 20,
                                }}
                              />
                            )}
                          </Box>
                          
                          {productInfo.categoryName && (
                            <Typography variant="caption" color="#4c5454" display="block" gutterBottom>
                              {productInfo.categoryName}
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
                                color={discrepancy ? (discrepancy.discrepancy > 0 ? '#2196f3' : '#ca0ec0') : '#4caf50'}
                              >
                                {item.receivedQuantity || 0} шт.
                              </Typography>
                            </Box>
                          </Box>

                          {discrepancy?.notes && (
                            <Box sx={{ 
                              mt: 1.5, 
                              pt: 1, 
                              borderTop: '1px dashed rgba(0,0,0,0.1)',
                              fontSize: '0.75rem',
                              color: '#4c5454'
                            }}>
                              <Typography variant="caption" color="#4c5454" display="block" fontWeight={500}>
                                Примечание:
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

        {/* 🔴 ИСПРАВЛЕНО: Принятие и подтверждение расхождений - показываем только если есть расхождения и перемещение не отклонено */}
        {hasDiscrepancies && transfer.status !== TransferStatus.REJECTED as TransferStatus && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {/* Принятие с расхождениями */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card 
                sx={{ 
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: 8,
                  backgroundColor: '#ffffff',
                  boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
                  height: '100%',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Avatar
                    sx={{ 
                      width: 44, 
                      height: 44, 
                      bgcolor: '#ff9800',
                      fontSize: '1rem',
                    }}
                  >
                    <WarningIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" color="#2a0f35" fontWeight={600}>
                      Принятие с расхождениями
                    </Typography>
                    {transfer.discrepancyAcceptedById ? (
                      <Typography variant="caption" color="#4caf50">
                        Принято с расхождениями
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="#ff9800">
                        Ожидает принятия
                      </Typography>
                    )}
                  </Box>
                </Box>

                {transfer.discrepancyAcceptedById ? (
                  <Box sx={{ pl: { xs: 0, sm: 7 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                      <PersonIcon sx={{ fontSize: 18, color: '#ff9800' }} />
                      <Typography variant="body2" color="#2a0f35">
                        {transfer.discrepancyAcceptedByName || users[transfer.discrepancyAcceptedById] || `Пользователь ${transfer.discrepancyAcceptedById}`}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <CalendarIcon sx={{ fontSize: 18, color: '#ff9800' }} />
                      <Typography variant="body2" color="#4c5454">
                        {formatDateTime(transfer.discrepancyAcceptedAt)}
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ pl: { xs: 0, sm: 7 } }}>
                    <Typography variant="body2" color="#4c5454" fontStyle="italic">
                      Информация о принятии отсутствует
                    </Typography>
                  </Box>
                )}
              </Card>
            </Grid>

            {/* Подтверждение расхождений */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card 
                sx={{ 
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: 8,
                  backgroundColor: '#ffffff',
                  boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
                  height: '100%',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Avatar
                    sx={{ 
                      width: 44, 
                      height: 44, 
                      bgcolor: '#4caf50',
                      fontSize: '1rem',
                    }}
                  >
                    <VerifiedIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" color="#2a0f35" fontWeight={600}>
                      Подтверждение расхождений
                    </Typography>
                    {transfer.discrepancyApprovedById ? (
                      <Typography variant="caption" color="#4caf50">
                        Расхождения подтверждены
                      </Typography>
                    ) : transfer.status === TransferStatus.REJECTED ? (
                      <Typography variant="caption" color="#f44336">
                        Расхождения отклонены
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="#ff9800">
                        Ожидает подтверждения
                      </Typography>
                    )}
                  </Box>
                </Box>

                {transfer.discrepancyApprovedById ? (
                  <Box sx={{ pl: { xs: 0, sm: 7 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                      <PersonIcon sx={{ fontSize: 18, color: '#4caf50' }} />
                      <Typography variant="body2" color="#2a0f35">
                        {transfer.discrepancyApprovedByName || users[transfer.discrepancyApprovedById] || `Пользователь ${transfer.discrepancyApprovedById}`}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <CalendarIcon sx={{ fontSize: 18, color: '#4caf50' }} />
                      <Typography variant="body2" color="#4c5454">
                        {formatDateTime(transfer.discrepancyApprovedAt)}
                      </Typography>
                    </Box>
                  </Box>
                ) : transfer.status === TransferStatus.REJECTED ? (
                  <Box sx={{ pl: { xs: 0, sm: 7 } }}>
                    <Typography variant="body2" color="#f44336" fontWeight={500}>
                      Расхождения были отклонены
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ pl: { xs: 0, sm: 7 } }}>
                    <Typography variant="body2" color="#4c5454" fontStyle="italic">
                      Расхождения еще не подтверждены
                    </Typography>
                  </Box>
                )}
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Фотографии при завершении */}
        {(transfer.arrivalFiles.length > 0 || transfer.discrepancyFiles.length > 0) && (
          <Card 
            sx={{ 
              p: { xs: 2, sm: 2.5 },
              mb: 3,
              borderRadius: 8,
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Avatar
                sx={{ 
                  width: 44, 
                  height: 44, 
                  bgcolor: '#674fb6',
                  fontSize: '1rem',
                }}
              >
                <PhotoCameraIcon />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" color="#2a0f35" fontWeight={600}>
                  Фотографии при завершении
                </Typography>
                <Typography variant="caption" color="#4c5454">
                  {transfer.arrivalFiles.length + transfer.discrepancyFiles.length} файлов
                </Typography>
              </Box>
            </Box>

            <Box sx={{ pl: { xs: 0, sm: 7 } }}>
              {transfer.arrivalFiles.length > 0 && (
                <Box sx={{ mb: transfer.discrepancyFiles.length > 0 ? 3 : 0 }}>
                  <Typography variant="body2" color="#4caf50" fontWeight={500} gutterBottom>
                    При приеме товара
                  </Typography>
                  <Grid container spacing={1.5}>
                    {transfer.arrivalFiles.map((file, index) => {
                      const fileName = getFileName(file);
                      const isImage = isImageFile(fileName);
                      const photoUrl = transferService.getPhotoUrl(file);
                      
                      return (
                        <Grid size={{ xs: 6, sm: 4, md: 3 }} key={`arrival-${index}`}>
                          <Box
                            onClick={() => isImage ? handleViewPhoto([file], 0) : viewFile(file)}
                            sx={{
                              position: 'relative',
                              width: '100%',
                              paddingBottom: '100%',
                              borderRadius: 8,
                              overflow: 'hidden',
                              cursor: 'pointer',
                              backgroundColor: '#f5f3f6',
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
                              }}>
                                <DescriptionIcon sx={{ fontSize: 30, color: '#4c5454', mb: 0.5 }} />
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
                                <DescriptionIcon sx={{ color: 'white', fontSize: 14 }} />
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
              )}

              {transfer.discrepancyFiles.length > 0 && (
                <Box>
                  <Typography variant="body2" color="#ff9800" fontWeight={500} gutterBottom>
                    При обнаружении расхождений
                  </Typography>
                  <Grid container spacing={1.5}>
                    {transfer.discrepancyFiles.map((file, index) => {
                      const fileName = getFileName(file);
                      const isImage = isImageFile(fileName);
                      const photoUrl = transferService.getPhotoUrl(file);
                      
                      return (
                        <Grid size={{ xs: 6, sm: 4, md: 3 }} key={`discrepancy-${index}`}>
                          <Box
                            onClick={() => isImage ? handleViewPhoto(transfer.discrepancyFiles, index) : viewFile(file)}
                            sx={{
                              position: 'relative',
                              width: '100%',
                              paddingBottom: '100%',
                              borderRadius: 8,
                              overflow: 'hidden',
                              cursor: 'pointer',
                              backgroundColor: '#f5f3f6',
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
                              }}>
                                <DescriptionIcon sx={{ fontSize: 30, color: '#4c5454', mb: 0.5 }} />
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
                                <DescriptionIcon sx={{ color: 'white', fontSize: 14 }} />
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
              )}
            </Box>
          </Card>
        )}

        {/* Исходные файлы */}
        {transfer.files.length > 0 && (
          <Card 
            sx={{ 
              p: { xs: 2, sm: 2.5 },
              mb: 3,
              borderRadius: 8,
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Avatar
                sx={{ 
                  width: 44, 
                  height: 44, 
                  bgcolor: '#3f1f4b',
                  fontSize: '1rem',
                }}
              >
                <DescriptionIcon />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" color="#2a0f35" fontWeight={600}>
                  Исходные файлы перемещения
                </Typography>
                <Typography variant="caption" color="#4c5454">
                  {transfer.files.length} файлов
                </Typography>
              </Box>
            </Box>

            <Box sx={{ pl: { xs: 0, sm: 7 } }}>
              <Grid container spacing={1.5}>
                {transfer.files.map((file, index) => {
                  const fileName = getFileName(file);
                  const isImage = isImageFile(fileName);
                  const photoUrl = transferService.getPhotoUrl(file);
                  
                  return (
                    <Grid size={{ xs: 6, sm: 4, md: 3 }} key={index}>
                      <Box
                        onClick={() => isImage ? handleViewPhoto(transfer.files, index) : viewFile(file)}
                        sx={{
                          position: 'relative',
                          width: '100%',
                          paddingBottom: '100%',
                          borderRadius: 8,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          backgroundColor: '#f5f3f6',
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
                          }}>
                            <DescriptionIcon sx={{ fontSize: 30, color: '#4c5454', mb: 0.5 }} />
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
                            <DescriptionIcon sx={{ color: 'white', fontSize: 14 }} />
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

        {/* 🔴 ИСПРАВЛЕНО: Блок с подтверждениями и комментариями */}
        {transfer.approvals.length > 0 && (
          <Card 
            sx={{ 
              p: { xs: 2, sm: 2.5 },
              mb: 3,
              borderRadius: 8,
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
            }}
          >
            <Accordion
              expanded={expandedApprovals}
              onChange={() => setExpandedApprovals(!expandedApprovals)}
              sx={{
                boxShadow: 'none',
                '&:before': { display: 'none' },
                backgroundColor: 'transparent',
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  minHeight: 48,
                  '&.Mui-expanded': { minHeight: 48 },
                  px: 0,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar
                    sx={{ 
                      width: 40, 
                      height: 40, 
                      bgcolor: '#674fb6',
                      fontSize: '1rem',
                    }}
                  >
                    <CommentIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" color="#2a0f35" fontWeight={600}>
                      Подтверждения и комментарии ({transfer.approvals.length})
                    </Typography>
                    <Typography variant="caption" color="#4c5454">
                      {transfer.approvals.filter(a => a.approved).length} подтвердили
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              
              <AccordionDetails sx={{ px: 0, pt: 2 }}>
                <Stack spacing={2}>
                  {transfer.approvals.map((approval, index) => (
                    <Card
                      key={approval.id}
                      sx={{
                        p: 2,
                        borderRadius: 8,
                        backgroundColor: approval.approved ? 'rgba(76, 175, 80, 0.04)' : 'rgba(244, 67, 54, 0.04)',
                        border: `1px solid ${approval.approved ? '#4caf50' : '#f44336'}20`,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <Avatar
                          sx={{ 
                            width: 32, 
                            height: 32, 
                            bgcolor: approval.approved ? '#4caf50' : '#f44336',
                            fontSize: '0.8rem',
                          }}
                        >
                          {users[approval.userId]?.charAt(0) || 'П'}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Typography variant="body2" fontWeight={600} color="#2a0f35">
                              {users[approval.userId] || `Пользователь ${approval.userId}`}
                            </Typography>
                            <Typography variant="caption" color="#4c5454">
                              {formatDateTime(approval.approvedAt)}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="#4c5454" sx={{ mb: 1 }}>
                            {approval.approved ? 'Подтвердил' : 'Отклонил'}
                          </Typography>
                          {approval.notes && (
                            <Box sx={{ 
                              mt: 1, 
                              p: 1.5, 
                              backgroundColor: '#f5f3f6', 
                              borderRadius: 4,
                              border: '1px solid rgba(0,0,0,0.05)',
                            }}>
                              <Typography variant="caption" color="#2a0f35" sx={{ whiteSpace: 'pre-wrap' }}>
                                {approval.notes}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Card>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Card>
        )}

        {/* Блок с хронологией */}
        <Card 
          sx={{ 
            p: { xs: 2, sm: 2.5 },
            borderRadius: 8,
            backgroundColor: '#ffffff',
            boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
          }}
        >
          <Typography variant="subtitle1" color="#2a0f35" fontWeight={600} gutterBottom>
            Хронология
          </Typography>
          
          <Stack spacing={2}>
            {/* Создано */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Box sx={{ 
                width: 32, 
                height: 32, 
                borderRadius: '50%', 
                backgroundColor: 'rgba(103, 79, 182, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <CalendarIcon sx={{ fontSize: 18, color: '#674fb6' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="#2a0f35" fontWeight={500}>
                  Создано
                </Typography>
                <Typography variant="caption" color="#4c5454">
                  {formatDateTime(transfer.createdAt)}
                </Typography>
              </Box>
            </Box>

            {/* Подтверждено */}
            {transfer.approvedAt && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: '50%', 
                  backgroundColor: 'rgba(76, 175, 80, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <CheckCircleOutlineIcon sx={{ fontSize: 18, color: '#4caf50' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="#2a0f35" fontWeight={500}>
                    Подтверждено
                  </Typography>
                  <Typography variant="caption" color="#4c5454">
                    {formatDateTime(transfer.approvedAt)}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Начато */}
            {transfer.startedAt && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: '50%', 
                  backgroundColor: 'rgba(33, 150, 243, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <StartIcon sx={{ fontSize: 18, color: '#2196f3' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="#2a0f35" fontWeight={500}>
                    Начато
                  </Typography>
                  <Typography variant="caption" color="#4c5454">
                    {formatDateTime(transfer.startedAt)}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Прибыло */}
            {transfer.arrivedAt && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: '50%', 
                  backgroundColor: 'rgba(202, 14, 192, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <InTransitIcon sx={{ fontSize: 18, color: '#ca0ec0' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="#2a0f35" fontWeight={500}>
                    Прибыло
                  </Typography>
                  <Typography variant="caption" color="#4c5454">
                    {formatDateTime(transfer.arrivedAt)}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Завершено */}
            {transfer.completedAt && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: '50%', 
                  backgroundColor: 'rgba(76, 175, 80, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <CompleteIcon sx={{ fontSize: 18, color: '#4caf50' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="#2a0f35" fontWeight={500}>
                    Завершено
                  </Typography>
                  <Typography variant="caption" color="#4c5454">
                    {formatDateTime(transfer.completedAt)}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Отклонено */}
            {transfer.cancelledAt && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: '50%', 
                  backgroundColor: 'rgba(244, 67, 54, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <CloseIcon sx={{ fontSize: 18, color: '#f44336' }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="#2a0f35" fontWeight={500}>
                    Отменено
                  </Typography>
                  <Typography variant="caption" color="#4c5454">
                    {formatDateTime(transfer.cancelledAt)}
                  </Typography>
                </Box>
              </Box>
            )}
          </Stack>
        </Card>
      </Container>

      {/* Диалог подтверждения/отклонения */}
      <Dialog 
        open={showApproveDialog} 
        onClose={() => setShowApproveDialog(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 8 }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" color="#2a0f35" fontWeight={600}>
            {approveData.approved ? 'Подтвердить перемещение' : 'Отклонить перемещение'}
          </Typography>
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
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 8,
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => setShowApproveDialog(false)} 
            variant="outlined"
            sx={{ 
              borderRadius: 8,
              textTransform: 'none',
              borderColor: '#4c5454',
              color: '#4c5454',
            }}
          >
            Отмена
          </Button>
          <Button
            onClick={handleApprove}
            variant="contained"
            sx={{
              borderRadius: 8,
              backgroundColor: approveData.approved ? '#4caf50' : '#f44336',
              '&:hover': {
                backgroundColor: approveData.approved ? '#3d8c40' : '#d32f2f',
              },
              textTransform: 'none',
            }}
            disabled={!approveData.approved && !approveData.notes.trim()}
          >
            {approveData.approved ? 'Подтвердить' : 'Отклонить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🔴 ИСПРАВЛЕНО: Диалог начала перемещения - убран комментарий */}
      <Dialog 
        open={showStartDialog} 
        onClose={() => setShowStartDialog(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 8 }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" color="#2a0f35" fontWeight={600}>
            Начать перемещение
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#4c5454' }}>
            Вы уверены, что хотите начать это перемещение? Статус изменится на "В пути", и товары будут отмечены как переданные курьеру.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => setShowStartDialog(false)} 
            variant="outlined"
            sx={{ 
              borderRadius: 8,
              textTransform: 'none',
              borderColor: '#4c5454',
              color: '#4c5454',
            }}
          >
            Отмена
          </Button>
          <Button
            onClick={handleStart}
            variant="contained"
            sx={{
              borderRadius: 8,
              backgroundColor: '#2196f3',
              '&:hover': {
                backgroundColor: '#1976d2',
              },
              textTransform: 'none',
            }}
          >
            Начать
          </Button>
        </DialogActions>
      </Dialog>

      {/* Фотовьюер */}
      {selectedPhoto && (
        <PhotoViewer
          open={showPhotoDialog}
          photos={selectedPhoto.photos}
          currentIndex={selectedPhoto.index}
          onClose={() => setShowPhotoDialog(false)}
          onIndexChange={(index) => setSelectedPhoto({ ...selectedPhoto, index })}
          getPhotoUrl={(photo) => photo}
        />
      )}

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
          sx={{ 
            width: '100%',
            borderRadius: 8,
          }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TransferDetailPage;