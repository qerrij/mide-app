import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
  Divider,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Snackbar,
  Tabs,
  Tab,
  InputAdornment,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Add,
  AttachFile,
  Delete,
  ExpandMore,
  ExpandLess,
  History,
  Discount,
  Person,
  FilterList,
  CheckCircle,
  Cancel,
  Pending,
  Group,
  Store,
  SupervisorAccount,
  Close,
  Image,
  AttachMoney,
  Category,
  Inventory,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { 
  Product, 
  ProductCategory, 
  UserRole, 
  Report, 
  ReportStatus, 
  getRoleName, 
  User, 
  AccountantReportStatus,
  getReportStatusText,
  getAccountantStatusText,
  getStatusColor,
  InventoryItem
} from '../types';
import { reportService } from '../api/reportService';
import { userService } from '../api/userService';
import { productService } from '../api/productService';

interface SelectedProduct {
  productId: number;
  quantity: number;
  soldAmount: number;
  availableQuantity?: number;
}

interface FilterState {
  adminId?: number;
  clusterId?: number;
  mentorId?: number;
  sellerId?: number;
  dateFrom?: Date;
  dateTo?: Date;
  status?: ReportStatus;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info';
}

const formatNumber = (value: number | null | undefined, defaultValue = 0): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return defaultValue.toFixed(2);
  }
  return value.toFixed(2);
};

const AccountantReportView: React.FC<{ report: Report }> = ({ report }) => {
  const { user: currentUser } = useAuth();
  const [finalAmount, setFinalAmount] = useState<number>(report.accountantFinalAmount || report.accountantAmount || 0);
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' });

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleApprove = async () => {
    if (finalAmount <= 0) {
      showSnackbar('Укажите корректную сумму', 'error');
      return;
    }

    try {
      setLoading(true);
      await reportService.reviewByAccountant(
        report.id,
        'approve',
        finalAmount,
        comment || 'Отчет утвержден бухгалтером'
      );
      showSnackbar('Отчет утвержден', 'success');
      window.location.reload();
    } catch (error) {
      showSnackbar('Ошибка при утверждении отчета', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      showSnackbar('Укажите причину отказа', 'error');
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
      showSnackbar('Отчет отклонен', 'success');
      window.location.reload();
    } catch (error) {
      showSnackbar('Ошибка при отклонении отчета', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (currentUser?.role !== UserRole.ACCOUNTANT || report.status !== ReportStatus.SUBMITTED || report.accountantStatus) {
    return null;
  }

  return (
    <Box sx={{ mt: 2, p: 2, backgroundColor: '#fff8e1', borderRadius: 1 }}>
      <Typography variant="h6" gutterBottom color="#f57c00">
        Проверка бухгалтера
      </Typography>
      
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography variant="body2">
            <strong>Сумма указанная продавцом:</strong>
          </Typography>
          <Typography variant="h6" color="#f57c00">
            {formatNumber(report.accountantAmount)}₽
          </Typography>
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography variant="body2">
            <strong>Итого за товары:</strong>
          </Typography>
          <Typography variant="h6">
            {formatNumber(report.transferAmount)}₽
          </Typography>
        </Grid>
        
        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            size="small"
            label="Окончательная сумма *"
            type="number"
            value={finalAmount}
            onChange={(e) => setFinalAmount(parseFloat(e.target.value) || 0)}
            InputProps={{
              endAdornment: <InputAdornment position="end">₽</InputAdornment>,
            }}
            sx={{ mt: 1 }}
          />
        </Grid>
        
        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            size="small"
            label="Комментарий"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            multiline
            rows={2}
            sx={{ mt: 1 }}
          />
        </Grid>
        
        <Grid size={{ xs: 12 }} sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
          <Button
            variant="contained"
            color="success"
            onClick={handleApprove}
            disabled={loading || finalAmount <= 0}
          >
            {loading ? <CircularProgress size={24} /> : 'Утвердить'}
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={handleReject}
            disabled={loading || !comment.trim()}
          >
            Отклонить
          </Button>
        </Grid>
      </Grid>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

const FinalApprovalView: React.FC<{ report: Report, users: User[] }> = ({ report, users }) => {
  const { user: currentUser } = useAuth();
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' });

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleApprove = async () => {
    try {
      setLoading(true);
      await reportService.finalApproveReport(
        report.id,
        'approve',
        comment || 'Отчет утвержден руководителем'
      );
      showSnackbar('Отчет утвержден', 'success');
      window.location.reload();
    } catch (error) {
      showSnackbar('Ошибка при утверждении отчета', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      showSnackbar('Укажите причину отказа', 'error');
      return;
    }

    try {
      setLoading(true);
      await reportService.finalApproveReport(
        report.id,
        'reject',
        comment
      );
      showSnackbar('Отчет отклонен', 'success');
      window.location.reload();
    } catch (error) {
      showSnackbar('Ошибка при отклонении отчета', 'error');
    } finally {
      setLoading(false);
    }
  };

  const canApprove = () => {
    if (!currentUser) return false;
    
    if (currentUser.role === UserRole.OWNER) return true;
    
    const seller = users.find(u => u.id === report.sellerId);
    if (!seller) return false;
    
    if (currentUser.role === UserRole.ADMIN) {
      return currentUser.adminClusterIds?.includes(seller.clusterId || 0) || false;
    }
    
    if (currentUser.role === UserRole.SENIOR_SELLER) {
      return seller.clusterId === currentUser.clusterId;
    }
    
    if (currentUser.role === UserRole.MENTOR) {
      return seller.mentorId === currentUser.id;
    }
    
    return false;
  };

  if (!canApprove() || report.accountantStatus !== AccountantReportStatus.APPROVED || report.status !== ReportStatus.SUBMITTED) {
    return null;
  }

  return (
    <Box sx={{ mt: 2, p: 2, backgroundColor: '#e8f5e8', borderRadius: 1 }}>
      <Typography variant="h6" gutterBottom color="#2e7d32">
        Окончательное утверждение
      </Typography>
      
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography variant="body2">
            <strong>Сумма бухгалтера:</strong>
          </Typography>
          <Typography variant="h6" color="#2e7d32">
            {formatNumber(report.accountantFinalAmount)}₽
          </Typography>
        </Grid>
        
        <Grid size={{ xs: 12 }}>
          <TextField
            fullWidth
            size="small"
            label="Комментарий"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            multiline
            rows={2}
            sx={{ mt: 1 }}
          />
        </Grid>
        
        <Grid size={{ xs: 12 }} sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
          <Button
            variant="contained"
            color="success"
            onClick={handleApprove}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Утвердить окончательно'}
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={handleReject}
            disabled={loading || !comment.trim()}
          >
            Отклонить
          </Button>
        </Grid>
      </Grid>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

const ReportsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [userInventory, setUserInventory] = useState<InventoryItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [accountantAmount, setAccountantAmount] = useState<number>(0);
  const [photos, setPhotos] = useState<File[]>([]);
  const [comment, setComment] = useState<string>('');
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [expandedReport, setExpandedReport] = useState<number | null>(null);
  const [filters, setFilters] = useState<FilterState>({});
  const [viewMode, setViewMode] = useState<'history' | 'create'>('history');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info',
  });
  
  useEffect(() => {
    if (currentUser?.role === UserRole.OWNER) {
      setViewMode('history');
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadUsers(),
        loadProducts(),
        loadCategories(),
        loadReports(),
      ]);
      
      if (currentUser) {
        await loadUserInventory();
      }
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
      showSnackbar('Ошибка при загрузке данных', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const usersData = await userService.getAllUsers();
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error: any) {
      console.error('Ошибка при загрузке пользователей:', error);
      
      if (error.response?.status === 403 && currentUser?.role !== UserRole.OWNER) {
        setUsers(currentUser ? [currentUser] : []);
        return;
      }
      
      showSnackbar('Ошибка при загрузке пользователей', 'error');
    }
  };

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const productsData = await productService.getAllProducts();
      setProducts(productsData);
    } catch (error) {
      console.error('Ошибка при загрузке товаров:', error);
      showSnackbar('Ошибка при загрузке товаров', 'error');
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadCategories = async () => {
    try {
      const categoriesData = await productService.getAllCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Ошибка при загрузке категорий:', error);
    }
  };

  const loadUserInventory = async () => {
    if (!currentUser) return;
    
    try {
      setLoadingInventory(true);
      
      let inventoryData;
      if (currentUser.role === UserRole.OWNER) {
        // Для владельца - общий инвентарь компании
        inventoryData = await productService.getCompanyInventory();
      } else {
        // Для всех остальных - их собственный инвентарь
        inventoryData = await productService.getMyInventory();
      }
      
      console.log('Inventory data for user', currentUser.id, ':', inventoryData);
      setUserInventory(inventoryData.items || []);
    } catch (error) {
      console.error('Ошибка при загрузке инвентаря:', error);
      showSnackbar('Ошибка при загрузке инвентаря', 'error');
    } finally {
      setLoadingInventory(false);
    }
  };

  const loadReports = async () => {
    try {
      setLoadingReports(true);
      
      const filtersData: any = {};
      
      if (filters.sellerId) filtersData.seller_id = filters.sellerId;
      if (filters.mentorId) filtersData.mentor_id = filters.mentorId;
      if (filters.clusterId) filtersData.cluster_id = filters.clusterId;
      if (filters.adminId) filtersData.admin_id = filters.adminId;
      if (filters.dateFrom) {
        filtersData.date_from = filters.dateFrom.toISOString().split('.')[0] + 'Z';
      }
      if (filters.dateTo) {
        filtersData.date_to = filters.dateTo.toISOString().split('.')[0] + 'Z';
      }
      if (filters.status) filtersData.status = filters.status;

      const reportsData = await reportService.getReports(filtersData);
      setReports(reportsData);
      
    } catch (error) {
      console.error('Ошибка при загрузке отчетов:', error);
      showSnackbar('Ошибка при загрузке отчетов', 'error');
    } finally {
      setLoadingReports(false);
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Получить доступное количество товара у текущего пользователя
  const getAvailableQuantity = (productId: number): number => {
    const inventoryItem = userInventory.find(item => item.productId === productId && item.userId === currentUser?.id);
    return inventoryItem ? inventoryItem.quantity - inventoryItem.reservedQuantity : 0;
  };

  const handleProductSelect = (productId: number) => {
    const existingIndex = selectedProducts.findIndex(p => p.productId === productId);
    const availableQuantity = getAvailableQuantity(productId);
    
    if (existingIndex === -1) {
      const product = products.find(p => p.id === productId);
      if (product) {
        setSelectedProducts(prev => [...prev, {
          productId,
          quantity: 1,
          soldAmount: product.price,
          availableQuantity: availableQuantity
        }]);
        
        if (!openCreateDialog) {
          setOpenCreateDialog(true);
        }
      }
    }
    else if (!openCreateDialog) {
      setOpenCreateDialog(true);
    }
  };

  const handleQuantityChange = (productId: number, quantity: number) => {
    if (quantity < 1) {
      removeProduct(productId);
      return;
    }
    
    const availableQuantity = getAvailableQuantity(productId);
    const selectedProduct = selectedProducts.find(p => p.productId === productId);
    
    if (selectedProduct && quantity > availableQuantity) {
      showSnackbar(`Доступно только ${availableQuantity} шт. этого товара`, 'info');
      return;
    }
    
    setSelectedProducts(prev =>
      prev.map(p =>
        p.productId === productId ? { ...p, quantity } : p
      )
    );
  };

  const removeProduct = (productId: number) => {
    setSelectedProducts(prev => prev.filter(p => p.productId !== productId));
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newPhotos = Array.from(event.target.files);
      
      if (photos.length + newPhotos.length > 5) {
        showSnackbar('Максимум 5 фотографий', 'error');
        return;
      }
      
      setPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitReport = async () => {
    if (!currentUser) return;
    
    if (photos.length === 0) {
      showSnackbar('Добавьте хотя бы одно фото перевода', 'error');
      return;
    }

    if (accountantAmount <= 0) {
      showSnackbar('Укажите сумму для бухгалтера', 'error');
      return;
    }

    // Проверяем, что у всех товаров достаточно количества
    for (const selectedProduct of selectedProducts) {
      const availableQuantity = getAvailableQuantity(selectedProduct.productId);
      if (selectedProduct.quantity > availableQuantity) {
        const product = products.find(p => p.id === selectedProduct.productId);
        showSnackbar(
          `Недостаточно товара "${product?.name}". Доступно: ${availableQuantity}, запрошено: ${selectedProduct.quantity}`,
          'error'
        );
        return;
      }
    }

    try {
      setLoading(true);
      
      const reportProducts = selectedProducts.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        soldAmount: item.soldAmount
      }));
      
      const newReport = await reportService.createReport(
        reportProducts,
        accountantAmount,
        photos,
        comment
      );
      
      setReports(prev => [newReport, ...prev]);
      
      // Обновляем инвентарь после отправки отчета
      await loadUserInventory();
      
      setSelectedProducts([]);
      setAccountantAmount(0);
      setPhotos([]);
      setComment('');
      setOpenCreateDialog(false);
      setViewMode('history');
      
      showSnackbar('Отчет успешно создан', 'success');
    } catch (error: any) {
      console.error('Ошибка при создании отчета:', error);
      showSnackbar(error.response?.data?.detail || 'Ошибка при создании отчета', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Функции для фильтрации
  const getAccessibleAdmins = () => {
    if (currentUser?.role !== UserRole.OWNER) return [];
    return users.filter(u => u.role === UserRole.ADMIN);
  };

  const getClustersByAdmin = (adminId?: number) => {
    if (!adminId) return [];
    const admin = users.find(u => u.id === adminId);
    return admin?.adminClusterIds || [];
  };

  const getMentorsByCluster = (clusterId?: number) => {
    if (!clusterId) return users.filter(u => u.role === UserRole.MENTOR);
    return users.filter(u => u.role === UserRole.MENTOR && u.clusterId === clusterId);
  };

  const getSellersByMentor = (mentorId?: number) => {
    if (!mentorId) return users.filter(u => u.role === UserRole.SELLER);
    return users.filter(u => u.role === UserRole.SELLER && u.mentorId === mentorId);
  };

  const getUserName = (userId?: number): string => {
    if (!userId) return 'Неизвестный пользователь';
    const user = users.find(u => u.id === userId);
    return user ? user.fullName : `Пользователь #${userId}`;
  };

  const getStatusIcon = (status: ReportStatus) => {
    switch (status) {
      case ReportStatus.APPROVED:
        return <CheckCircle sx={{ color: '#4caf50' }} />;
      case ReportStatus.REJECTED:
        return <Cancel sx={{ color: '#f44336' }} />;
      case ReportStatus.SUBMITTED:
        return <Pending sx={{ color: '#ff9800' }} />;
      case ReportStatus.DRAFT:
        return <Pending sx={{ color: '#9e9e9e' }} />;
      default:
        return <Pending sx={{ color: '#9e9e9e' }} />;
    }
  };

  const findProductById = (productId: number): Product | undefined => {
    return products.find(p => p.id === productId);
  };

  const getCategoryName = (categoryId: number): string => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || `Категория #${categoryId}`;
  };

  // Фильтрация товаров по категории
  const filteredProducts = selectedCategoryId === 'all' 
    ? products 
    : products.filter(product => product.categoryId === selectedCategoryId);

  // Группировка товаров по категориям
  const productsByCategory = filteredProducts.reduce((acc, product) => {
    const categoryName = getCategoryName(product.categoryId);
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  // Отображение деталей отчета
  const renderReportDetails = (report: Report) => {
    const seller = users.find(u => u.id === report.sellerId);
    const hasPhotos = report.transferPhotos && Array.isArray(report.transferPhotos) && report.transferPhotos.length > 0;
    
    return (
      <Box sx={{ mt: 2, p: 2, backgroundColor: '#f9f9f9', borderRadius: 1 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="subtitle2" color="#4c5454">
              Продавец:
            </Typography>
            <Typography variant="body1">
              {getUserName(report.sellerId)}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="subtitle2" color="#4c5454">
              Дата отчета:
            </Typography>
            <Typography variant="body1">
              {new Date(report.date).toLocaleDateString('ru-RU')}
            </Typography>
          </Grid>
          
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 2, backgroundColor: '#fff8e1', mt: 1 }}>
              <Typography variant="subtitle2" color="#f57c00" gutterBottom>
                Сумма для бухгалтера:
              </Typography>
              <Grid container spacing={1}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2">
                    Указанная продавцом:
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }} sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" fontWeight="bold">
                    {formatNumber(report.accountantAmount)}₽
                  </Typography>
                </Grid>
                
                {report.accountantStatus && (
                  <>
                    {report.accountantFinalAmount && (
                      <>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="body2">
                            Утвержденная сумма:
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }} sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" fontWeight="bold" color="#2e7d32">
                            {formatNumber(report.accountantFinalAmount)}₽
                          </Typography>
                        </Grid>
                      </>
                    )}
                    
                    <Grid size={{ xs: 12 }}>
                      <Chip
                        label={getAccountantStatusText(report.accountantStatus)}
                        size="small"
                        sx={{
                          backgroundColor: getStatusColor(report.accountantStatus),
                          color: 'white'
                        }}
                      />
                    </Grid>
                    
                    {report.accountantComment && (
                      <Grid size={{ xs: 12 }}>
                        <Alert severity="info" sx={{ mt: 1 }}>
                          <strong>Комментарий бухгалтера:</strong> {report.accountantComment}
                        </Alert>
                      </Grid>
                    )}
                  </>
                )}
              </Grid>
            </Paper>
          </Grid>
          
          {(currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.ADMIN || 
            currentUser?.role === UserRole.SENIOR_SELLER || currentUser?.role === UserRole.MENTOR) && (
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" color="#4c5454" sx={{ mt: 1 }}>
                Товары:
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Товар</TableCell>
                      <TableCell>Категория</TableCell>
                      <TableCell align="right">Количество</TableCell>
                      <TableCell align="right">Цена за шт.</TableCell>
                      <TableCell align="right">Сумма</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {report.products.map((item, index) => {
                      const product = findProductById(item.productId);
                      const itemTotal = item.quantity * item.soldAmount;
                      
                      return (
                        <TableRow key={index}>
                          <TableCell>
                            {product?.name || `Товар #${item.productId}`}
                          </TableCell>
                          <TableCell>
                            {product ? getCategoryName(product.categoryId) : 'Неизвестно'}
                          </TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">{formatNumber(item.soldAmount)}₽</TableCell>
                          <TableCell align="right">{formatNumber(itemTotal)}₽</TableCell>
                        </TableRow>
                      );
                    })}
                    
                    <TableRow>
                      <TableCell colSpan={4} align="right">
                        <Typography variant="subtitle1" fontWeight="bold">
                          Итого за товары:
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle1" fontWeight="bold">
                          {formatNumber(report.transferAmount)}₽
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          )}

          {(hasPhotos || currentUser?.role === UserRole.OWNER) && (
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" color="#4c5454" sx={{ mt: 2, mb: 1 }}>
                {hasPhotos ? `Фотографии перевода (${report.transferPhotos.length})` : 'Фотографии перевода'}
              </Typography>
              
              {hasPhotos ? (
                <Grid container spacing={1}>
                  {report.transferPhotos.map((photo: string, index: number) => {
                    const photoUrl = reportService.getPhotoUrl(photo);
                    
                    return (
                      <Grid size={{ xs: 6, sm: 4, md: 3 }} key={index}>
                        <Paper 
                          sx={{ 
                            p: 1, 
                            cursor: 'pointer',
                            '&:hover': { backgroundColor: '#f5f5f5' }
                          }}
                          onClick={() => window.open(photoUrl, '_blank')}
                        >
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            height: 100,
                            borderRadius: 1,
                            backgroundColor: '#f0f0f0',
                            gap: 1,
                            p: 2
                          }}>
                            <Image sx={{ fontSize: 40, color: '#674fb6' }} />
                            <Typography variant="caption" align="center">
                              Фото {index + 1}
                            </Typography>
                          </Box>
                          <Typography variant="caption" align="center" display="block" sx={{ mt: 1 }}>
                            Нажмите для просмотра
                          </Typography>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              ) : (
                <Alert severity="info">
                  Фотографии не прикреплены к отчету
                </Alert>
              )}
            </Grid>
          )}

          {report.comment && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="info" sx={{ mt: 2 }}>
                <strong>Комментарий продавца:</strong> {report.comment}
              </Alert>
            </Grid>
          )}

          <AccountantReportView report={report} />

          <FinalApprovalView report={report} users={users} />
        </Grid>
      </Box>
    );
  };

  const renderFilters = () => {
    const accessibleAdmins = getAccessibleAdmins();
    const adminClusters = filters.adminId ? getClustersByAdmin(filters.adminId) : [];
    const clusterMentors = filters.clusterId ? getMentorsByCluster(filters.clusterId) : [];
    const mentorSellers = filters.mentorId ? getSellersByMentor(filters.mentorId) : [];
    
    return (
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom color="#3f1f4b">
          <FilterList sx={{ verticalAlign: 'middle', mr: 1 }} />
          Фильтрация по иерархии
        </Typography>
        <Grid container spacing={2}>
          {currentUser?.role === UserRole.OWNER && accessibleAdmins.length > 0 && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Администратор</InputLabel>
                <Select
                  value={filters.adminId || ''}
                  label="Администратор"
                  onChange={(e) => setFilters({ 
                    adminId: e.target.value as number || undefined,
                    clusterId: undefined,
                    mentorId: undefined,
                    sellerId: undefined 
                  })}
                >
                  <MenuItem value="">Все администраторы</MenuItem>
                  {accessibleAdmins.map(admin => (
                    <MenuItem key={admin.id} value={admin.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SupervisorAccount fontSize="small" />
                        {admin.fullName}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
          
          {(currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.ADMIN) && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Куст</InputLabel>
                <Select
                  value={filters.clusterId || ''}
                  label="Куст"
                  onChange={(e) => setFilters({ 
                    ...filters,
                    clusterId: e.target.value as number || undefined,
                    mentorId: undefined,
                    sellerId: undefined 
                  })}
                  disabled={filters.adminId ? adminClusters.length === 0 : false}
                >
                  <MenuItem value="">Все кусты</MenuItem>
                  {adminClusters.map(clusterId => (
                    <MenuItem key={clusterId} value={clusterId}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Store fontSize="small" />
                        Куст #{clusterId}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
          
          {(currentUser?.role === UserRole.OWNER || currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SENIOR_SELLER) && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Наставник</InputLabel>
                <Select
                  value={filters.mentorId || ''}
                  label="Наставник"
                  onChange={(e) => setFilters({ 
                    ...filters,
                    mentorId: e.target.value as number || undefined,
                    sellerId: undefined 
                  })}
                  disabled={!filters.clusterId && currentUser?.role !== UserRole.SENIOR_SELLER}
                >
                  <MenuItem value="">Все наставники</MenuItem>
                  {clusterMentors.map(mentor => (
                    <MenuItem key={mentor.id} value={mentor.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Group fontSize="small" />
                        {mentor.fullName}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
          
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Продавец</InputLabel>
              <Select
                value={filters.sellerId || ''}
                label="Продавец"
                onChange={(e) => setFilters({ 
                  ...filters, 
                  sellerId: e.target.value as number || undefined 
                })}
                disabled={!filters.mentorId}
              >
                <MenuItem value="">Все продавцы</MenuItem>
                {mentorSellers.map(seller => (
                  <MenuItem key={seller.id} value={seller.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person fontSize="small" />
                      {seller.fullName}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Статус</InputLabel>
              <Select
                value={filters.status || ''}
                label="Статус"
                onChange={(e) => setFilters({ 
                  ...filters,
                  status: e.target.value as ReportStatus || undefined
                })}
              >
                <MenuItem value="">Все статусы</MenuItem>
                {Object.values(ReportStatus).map(status => (
                  <MenuItem key={status} value={status}>
                    {getReportStatusText(status)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12 }} sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => {
                setFilters({});
                loadReports();
              }}
            >
              Сбросить
            </Button>
            <Button
              variant="contained"
              onClick={loadReports}
              sx={{
                backgroundColor: '#674fb6',
                '&:hover': { backgroundColor: '#483399' },
              }}
            >
              Применить
            </Button>
          </Grid>
        </Grid>
      </Paper>
    );
  };

  const renderCreateForm = () => (
    <Dialog
      open={openCreateDialog}
      onClose={() => {
        setOpenCreateDialog(false);
        if (selectedProducts.length === 0) {
          setSelectedProducts([]);
          setAccountantAmount(0);
          setPhotos([]);
          setComment('');
        }
      }}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ backgroundColor: '#f5f3f6', color: '#2a0f35' }}>
        Создание отчета о продаже
      </DialogTitle>
      <DialogContent>
        <Stepper activeStep={selectedProducts.length > 0 ? 1 : 0} sx={{ mt: 2, mb: 3 }}>
          <Step>
            <StepLabel>Выбор товаров</StepLabel>
          </Step>
          <Step>
            <StepLabel>Указание суммы</StepLabel>
          </Step>
          <Step>
            <StepLabel>Добавление фото</StepLabel>
          </Step>
        </Stepper>

        {selectedProducts.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="#4c5454" gutterBottom>
              Добавьте товары в отчет
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => setOpenCreateDialog(false)}
              sx={{ mt: 2 }}
            >
              Выбрать товары
            </Button>
          </Box>
        ) : (
          <>
            <Typography variant="subtitle1" gutterBottom color="#3f1f4b">
              Товары в отчете ({selectedProducts.length}):
            </Typography>
            <List>
              {selectedProducts.map((item) => {
                const product = findProductById(item.productId);
                if (!product) return null;
                
                return (
                  <ListItem
                    key={item.productId}
                    secondaryAction={
                      <IconButton edge="end" onClick={() => removeProduct(item.productId)}>
                        <Delete />
                      </IconButton>
                    }
                  >
                    <ListItemIcon>
                      <AttachMoney sx={{ color: '#674fb6' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box>
                          {product.name}
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            Доступно: {item.availableQuantity || 0} шт.
                          </Typography>
                        </Box>
                      }
                      secondary={`Цена: ${product.price}₽ • Сумма: ${(item.quantity * item.soldAmount).toFixed(2)}₽`}
                    />
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField
                        type="number"
                        size="small"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value) || 1)}
                        inputProps={{ 
                          min: 1,
                          max: item.availableQuantity,
                          style: { 
                            width: 80,
                            textAlign: 'center'
                          } 
                        }}
                        error={item.quantity > (item.availableQuantity || 0)}
                        helperText={item.quantity > (item.availableQuantity || 0) ? `Макс: ${item.availableQuantity}` : ''}
                      />
                    </Box>
                  </ListItem>
                );
              })}
            </List>

            <Box sx={{ mt: 2, mb: 1 }}>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={() => setOpenCreateDialog(false)}
                fullWidth
              >
                Добавить еще товары
              </Button>
            </Box>

            <Divider sx={{ my: 2 }} />

            <TextField
              fullWidth
              size="small"
              label="Комментарий к отчету"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              multiline
              rows={2}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              size="small"
              type="number"
              label="Сумма для бухгалтера *"
              value={accountantAmount}
              onChange={(e) => setAccountantAmount(parseFloat(e.target.value) || 0)}
              InputProps={{
                endAdornment: <InputAdornment position="end">₽</InputAdornment>,
              }}
              helperText="Укажите сумму, которую вы фактически перевели"
              required
              sx={{ mb: 2 }}
            />

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom color="#3f1f4b">
                Фотографии перевода ({photos.length}/5)
              </Typography>
              
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="photo-upload-report"
                type="file"
                multiple
                onChange={handlePhotoUpload}
              />
              
              <Box sx={{ 
                border: '2px dashed #d7d2d8', 
                p: 3, 
                borderRadius: 2, 
                textAlign: 'center',
                mb: 2 
              }}>
                <label htmlFor="photo-upload-report">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<AttachFile />}
                    disabled={photos.length >= 5}
                  >
                    {photos.length > 0 ? 'Добавить еще фото' : 'Прикрепить фото перевода'}
                  </Button>
                </label>
                <Typography variant="caption" display="block" sx={{ mt: 1, color: '#8a8a8a' }}>
                  Обязательное поле (максимум 5 фото)
                </Typography>
              </Box>

              {photos.length > 0 && (
                <Grid container spacing={1}>
                  {photos.map((photo, index) => (
                    <Grid size={{ xs: 6, sm: 4 }} key={index}>
                      <Paper sx={{ p: 1, position: 'relative' }}>
                        <IconButton
                          size="small"
                          sx={{ 
                            position: 'absolute', 
                            top: 0, 
                            right: 0,
                            backgroundColor: 'rgba(255,255,255,0.8)'
                          }}
                          onClick={() => removePhoto(index)}
                        >
                          <Close fontSize="small" />
                        </IconButton>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Image sx={{ color: '#674fb6' }} />
                          <Typography variant="caption" noWrap>
                            {photo.name.length > 15 ? `${photo.name.substring(0, 15)}...` : photo.name}
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            setOpenCreateDialog(false);
            if (selectedProducts.length === 0) {
              setSelectedProducts([]);
              setAccountantAmount(0);
              setPhotos([]);
              setComment('');
            }
          }}
        >
          Отмена
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmitReport}
          disabled={selectedProducts.length === 0 || photos.length === 0 || accountantAmount <= 0 || loading}
          sx={{
            backgroundColor: '#674fb6',
            '&:hover': {
              backgroundColor: '#483399',
            },
          }}
        >
          {loading ? <CircularProgress size={24} /> : 'Отправить отчет'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" color="#2a0f35">
          <History sx={{ verticalAlign: 'middle', mr: 2 }} />
          Отчеты о продажах
        </Typography>
        
        {currentUser?.role !== UserRole.OWNER && currentUser?.role !== UserRole.ACCOUNTANT && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setViewMode(viewMode === 'history' ? 'create' : 'history')}
            sx={{
              backgroundColor: viewMode === 'create' ? '#3f1f4b' : '#674fb6',
              '&:hover': {
                backgroundColor: viewMode === 'create' ? '#2a0f35' : '#483399',
              },
            }}
          >
            {viewMode === 'history' ? 'Создать отчет' : 'К истории'}
          </Button>
        )}
      </Box>

      {viewMode === 'history' ? (
        <>
          {currentUser?.role !== UserRole.SELLER && renderFilters()}
          
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" color="#3f1f4b">
                История отчетов ({reports.length})
              </Typography>
              
              {loadingReports && <CircularProgress size={20} />}
            </Box>
            
            {loadingReports ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : reports.length === 0 ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                {currentUser?.role === UserRole.SELLER 
                  ? 'У вас пока нет отчетов' 
                  : 'Нет отчетов по выбранным фильтрам'}
              </Alert>
            ) : (
              <List>
                {reports.map((report) => {
                  const sellerId = report.sellerId;
                  const sellerName = getUserName(sellerId);
                  const sellerRole = users.find(u => u.id === sellerId)?.role;
                  
                  return (
                    <React.Fragment key={report.id}>
                      <ListItem
                        secondaryAction={
                          <IconButton
                            onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
                          >
                            {expandedReport === report.id ? <ExpandLess /> : <ExpandMore />}
                          </IconButton>
                        }
                        sx={{
                          backgroundColor: expandedReport === report.id ? '#f5f3f6' : 'transparent',
                          borderRadius: 1,
                        }}
                      >
                        <ListItemIcon>
                          {getStatusIcon(report.status)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                              <Typography variant="subtitle1">
                                Отчет #{report.id}
                              </Typography>
                              {currentUser?.role !== UserRole.SELLER && (
                                <>
                                  <Chip
                                    label={sellerName}
                                    size="small"
                                    icon={<Person />}
                                  />
                                  <Chip
                                    label={getRoleName(sellerRole || UserRole.SELLER)}
                                    size="small"
                                    variant="outlined"
                                  />
                                </>
                              )}
                              {report.accountantStatus && (
                                <Chip
                                  label={getAccountantStatusText(report.accountantStatus)}
                                  size="small"
                                  sx={{
                                    backgroundColor: getStatusColor(report.accountantStatus),
                                    color: 'white'
                                  }}
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" component="span">
                                {new Date(report.date).toLocaleDateString('ru-RU')} • 
                                {report.products.reduce((sum, item) => sum + item.quantity, 0)} шт. • 
                                Статус: {getReportStatusText(report.status)}
                                {report.accountantAmount && ` • Сумма: ${formatNumber(report.accountantAmount)}₽`}
                              </Typography>
                              {report.status === ReportStatus.REJECTED && report.comment && (
                                <Typography variant="caption" color="error" display="block">
                                  Отклонен: {report.comment}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                      <Collapse in={expandedReport === report.id} timeout="auto" unmountOnExit>
                        {renderReportDetails(report)}
                      </Collapse>
                      <Divider component="li" />
                    </React.Fragment>
                  );
                })}
              </List>
            )}
          </Paper>
        </>
      ) : (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom color="#3f1f4b">
            Создание отчета
          </Typography>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            Выберите товары для отчета. Укажите количество для каждого товара. 
            Один товар можно добавить только один раз. <strong>Красным выделены товары, которых нет в наличии.</strong>
          </Alert>

          <Box sx={{ mb: 3 }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="category-filter-label">
                <Category sx={{ mr: 1, verticalAlign: 'middle' }} />
                Категория товаров
              </InputLabel>
              <Select
                labelId="category-filter-label"
                value={selectedCategoryId}
                label="Категория товаров"
                onChange={(e) => setSelectedCategoryId(e.target.value as number | 'all')}
              >
                <MenuItem value="all">Все категории</MenuItem>
                {categories.map(category => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {loadingProducts || loadingInventory ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : products.length === 0 ? (
            <Alert severity="warning">
              Нет товаров. Сначала создайте товары в системе.
            </Alert>
          ) : (
            <>
              {Object.entries(productsByCategory).map(([categoryName, categoryProducts]) => (
                <Box key={categoryName} sx={{ mb: 4 }}>
                  <Typography variant="h6" gutterBottom color="#674fb6" sx={{ display: 'flex', alignItems: 'center' }}>
                    <Category sx={{ mr: 1 }} />
                    {categoryName}
                    <Chip 
                      label={`${categoryProducts.length} товаров`} 
                      size="small" 
                      variant="outlined"
                      sx={{ ml: 2 }}
                    />
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {categoryProducts.map((product) => {
                      const isSelected = selectedProducts.some(p => p.productId === product.id);
                      const availableQuantity = getAvailableQuantity(product.id);
                      const isOutOfStock = availableQuantity <= 0;
                      const alreadyInReport = selectedProducts.some(p => p.productId === product.id);
                      
                      return (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={product.id}>
                          <Tooltip 
                            title={
                              isOutOfStock 
                                ? "Товара нет в наличии" 
                                : alreadyInReport 
                                  ? "Товар уже добавлен в отчет"
                                  : `В наличии: ${availableQuantity} шт.`
                            }
                          >
                            <Card
                              sx={{
                                cursor: isSelected || isOutOfStock ? 'default' : 'pointer',
                                opacity: isSelected ? 0.7 : isOutOfStock ? 0.5 : 1,
                                '&:hover': {
                                  transform: isSelected || isOutOfStock ? 'none' : 'translateY(-2px)',
                                  boxShadow: isSelected || isOutOfStock ? 1 : 3,
                                },
                                transition: 'all 0.2s',
                                position: 'relative',
                                border: isOutOfStock ? '2px solid #ffcdd2' : '1px solid #e0e0e0',
                                backgroundColor: isOutOfStock ? '#fff5f5' : 'inherit',
                              }}
                              onClick={() => !isSelected && !isOutOfStock && handleProductSelect(product.id)}
                            >
                              {isSelected && (
                                <Box sx={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  backgroundColor: '#4caf50',
                                  color: 'white',
                                  borderRadius: '50%',
                                  width: 24,
                                  height: 24,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.75rem',
                                }}>
                                  ✓
                                </Box>
                              )}
                              
                              {isOutOfStock && (
                                <Box sx={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  backgroundColor: '#ff4444',
                                  color: 'white',
                                  borderRadius: '4px',
                                  padding: '2px 6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 'bold',
                                }}>
                                  НЕТ
                                </Box>
                              )}
                              
                              <CardContent>
                                <Typography variant="h6" sx={{ 
                                  color: isOutOfStock ? '#f44336' : '#674fb6', 
                                  mb: 1,
                                  textDecoration: isSelected ? 'line-through' : 'none'
                                }}>
                                  {product.name}
                                </Typography>
                                
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  Цена: {product.price}₽
                                </Typography>
                                
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                                  <Typography variant="caption" color="#8a8a8a">
                                    SKU: {product.sku}
                                  </Typography>
                                  
                                  <Badge
                                    badgeContent={availableQuantity}
                                    color={
                                      availableQuantity === 0 
                                        ? 'error'
                                        : availableQuantity < 5
                                        ? 'warning'
                                        : 'primary'
                                    }
                                    sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem' } }}
                                  >
                                    <Inventory fontSize="small" />
                                  </Badge>
                                </Box>
                                
                                {isSelected && (
                                  <Typography variant="caption" color="#4caf50" display="block" sx={{ mt: 1 }}>
                                    Уже в отчете
                                  </Typography>
                                )}
                                
                                {isOutOfStock && (
                                  <Typography variant="caption" color="#f44336" display="block" sx={{ mt: 1 }}>
                                    Товара нет в наличии
                                  </Typography>
                                )}
                              </CardContent>
                            </Card>
                          </Tooltip>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              ))}
            </>
          )}

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="body1">
                Выбрано товаров: {selectedProducts.length}
              </Typography>
              <Typography variant="caption" color="#8a8a8a">
                Всего позиций: {selectedProducts.reduce((sum, item) => sum + item.quantity, 0)}
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={() => setOpenCreateDialog(true)}
              disabled={selectedProducts.length === 0}
              sx={{
                backgroundColor: '#674fb6',
                '&:hover': {
                  backgroundColor: '#483399',
                },
              }}
            >
              Продолжить ({selectedProducts.length})
            </Button>
          </Box>
        </Paper>
      )}

      {renderCreateForm()}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ReportsPage;