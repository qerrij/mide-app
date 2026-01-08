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
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { Product, ProductCategory, UserRole, Report, ReportStatus, getRoleName, getCategoryName, User } from '../types';
import { reportService } from '../api/reportService';
import { userService } from '../api/userService';
import { productService } from '../api/productService';

interface SelectedProduct {
  productId: number;
  quantity: number;
  soldAmount: number;
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

const ReportsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [expandedReport, setExpandedReport] = useState<number | null>(null);
  const [discount, setDiscount] = useState<number>(0);
  const [filters, setFilters] = useState<FilterState>({});
  const [viewMode, setViewMode] = useState<'history' | 'create'>('history');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info',
  });
  
  // Новые состояния для фильтрации товаров по категориям
  const [productCategoryFilter, setProductCategoryFilter] = useState<ProductCategory | 'all'>('all');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  // Для владельца показываем историю по умолчанию
  useEffect(() => {
    if (currentUser?.role === UserRole.OWNER) {
      setViewMode('history');
    }
  }, [currentUser]);

  // Загрузка пользователей, товаров и отчетов
  useEffect(() => {
    loadData();
  }, []);

  // Фильтрация товаров по категории при изменении выбранной категории или загрузке товаров
  useEffect(() => {
    if (productCategoryFilter === 'all') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product => product.category === productCategoryFilter);
      setFilteredProducts(filtered);
    }
  }, [productCategoryFilter, products]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadUsers(),
        loadProducts(),
        loadReports(),
      ]);
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
      console.log('Загруженные пользователи:', usersData);
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error: any) {
      console.error('Ошибка при загрузке пользователей:', error);
      
      if (error.response?.status === 403 && currentUser?.role !== UserRole.OWNER) {
        console.log('Используем только текущего пользователя');
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
      setFilteredProducts(productsData); // Инициализируем отфильтрованные товары
    } catch (error) {
      console.error('Ошибка при загрузке товаров:', error);
      showSnackbar('Ошибка при загрузке товаров', 'error');
    } finally {
      setLoadingProducts(false);
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
      console.log('Загруженные отчеты:', reportsData);
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

  const handleProductSelect = (productId: number) => {
    const existingIndex = selectedProducts.findIndex(p => p.productId === productId);
    
    if (existingIndex === -1) {
      const product = products.find(p => p.id === productId);
      if (product) {
        setSelectedProducts(prev => [...prev, {
          productId,
          quantity: 1,
          soldAmount: product.price
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
    setSelectedProducts(prev =>
      prev.map(p =>
        p.productId === productId ? { ...p, quantity } : p
      )
    );
  };

  const removeProduct = (productId: number) => {
    setSelectedProducts(prev => prev.filter(p => p.productId !== productId));
  };

  const calculateTotal = () => {
    const total = selectedProducts.reduce((sum, item) => {
      return sum + (item.soldAmount * item.quantity);
    }, 0);
    return total - discount;
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

    try {
      setLoading(true);
      
      const reportProducts = selectedProducts.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        soldAmount: item.soldAmount
      }));
      
      const newReport = await reportService.createReport(
        reportProducts,
        photos,
        discount > 0 ? `Применена скидка: ${discount}₽` : undefined
      );
      
      console.log('Создан новый отчет:', newReport);
      
      setReports(prev => [newReport, ...prev]);
      
      setSelectedProducts([]);
      setPhotos([]);
      setDiscount(0);
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
    console.log('Admin для кластеров:', admin);
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

  // Получение имени пользователя с безопасной обработкой
  const getUserName = (userId?: number): string => {
    if (!userId) {
      console.log('getUserName получил undefined или null userId');
      return 'Неизвестный пользователь';
    }
    
    console.log(`Ищем пользователя с ID: ${userId} в массиве из ${users.length} пользователей`);
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

  const getCategoryColor = (category: ProductCategory): string => {
    const colors = {
      [ProductCategory.DISPOSABLES]: '#674fb6',
      [ProductCategory.LIQUIDS]: '#56b8d1',
      [ProductCategory.CONSUMABLES]: '#2a436d',
      [ProductCategory.PODS]: '#3f1f4b',
      [ProductCategory.ENERGY_DRINKS]: '#6d3f57',
    };
    return colors[category];
  };

  const findProductById = (productId: number): Product | undefined => {
    return products.find(p => p.id === productId);
  };

  // Отображение деталей отчета
  const renderReportDetails = (report: Report) => {
    console.log('Детали отчета:', report);
    const seller = users.find(u => u.id === report.sellerId);
    
    // Проверяем наличие фото
    const hasPhotos = report.transferPhotos && Array.isArray(report.transferPhotos) && report.transferPhotos.length > 0;
    console.log('Фото в отчете:', report.transferPhotos, 'hasPhotos:', hasPhotos);
    
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
          {seller?.mentorId && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle2" color="#4c5454">
                Наставник:
              </Typography>
              <Typography variant="body1">
                {getUserName(seller.mentorId)}
              </Typography>
            </Grid>
          )}
          {seller?.clusterId && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="subtitle2" color="#4c5454">
                Куст:
              </Typography>
              <Typography variant="body1">
                Куст #{seller.clusterId}
              </Typography>
            </Grid>
          )}
          
          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle2" color="#4c5454" sx={{ mt: 1 }}>
              Товары:
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Товар</TableCell>
                    <TableCell align="right">Количество</TableCell>
                    {currentUser?.role === UserRole.OWNER && (
                      <>
                        <TableCell align="right">Цена за шт.</TableCell>
                        <TableCell align="right">Сумма</TableCell>
                      </>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.products.map((item: any, index: number) => {
                    const productId = item.product_id || item.productId;
                    const product = findProductById(productId);
                    const soldAmount = item.sold_amount || item.soldAmount || 0;
                    const quantity = item.quantity || 0;
                    const itemTotal = quantity * soldAmount;
                    
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ 
                              width: 8, 
                              height: 8, 
                              borderRadius: '50%', 
                              backgroundColor: product ? getCategoryColor(product.category) : '#ccc' 
                            }} />
                            {product?.name || `Товар #${productId}`}
                          </Box>
                        </TableCell>
                        <TableCell align="right">{quantity}</TableCell>
                        {currentUser?.role === UserRole.OWNER && (
                          <>
                            <TableCell align="right">{soldAmount.toFixed(2)}₽</TableCell>
                            <TableCell align="right">{itemTotal.toFixed(2)}₽</TableCell>
                          </>
                        )}
                      </TableRow>
                    );
                  })}
                  
                  {/* Строка с итогом для OWNER */}
                  {currentUser?.role === UserRole.OWNER && (
                    <TableRow>
                      <TableCell colSpan={3} align="right">
                        <Typography variant="subtitle1" fontWeight="bold">
                          Итого к переводу:
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle1" fontWeight="bold">
                          {report.transferAmount?.toFixed(2) || '0.00'}₽
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>

          {/* Блок с фотографиями - ВСЕГДА отображаем если есть доступ */}
          {(hasPhotos || currentUser?.role === UserRole.OWNER) && (
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" color="#4c5454" sx={{ mt: 2, mb: 1 }}>
                {hasPhotos ? `Фотографии перевода (${report.transferPhotos.length})` : 'Фотографии перевода'}
              </Typography>
              
              {hasPhotos ? (
                <Grid container spacing={1}>
                  {report.transferPhotos.map((photo: string, index: number) => {
                    const photoUrl = reportService.getPhotoUrl(photo);
                    console.log(`Фото ${index}:`, photo, 'URL:', photoUrl);
                    
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

          {report.reviewedBy && (
            <Grid size={{ xs: 12 }}>
              <Typography variant="caption" color="#8a8a8a">
                Проверено: {getUserName(report.reviewedBy)} • {report.reviewDate ? new Date(report.reviewDate).toLocaleDateString('ru-RU') : ''}
              </Typography>
            </Grid>
          )}
          {report.comment && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="warning" sx={{ mt: 1 }}>
                {report.comment}
              </Alert>
            </Grid>
          )}
        </Grid>
      </Box>
    );
  };

  const renderFilters = () => {
    const accessibleAdmins = getAccessibleAdmins();
    const adminClusters = filters.adminId ? getClustersByAdmin(filters.adminId) : [];
    const clusterMentors = filters.clusterId ? getMentorsByCluster(filters.clusterId) : [];
    const mentorSellers = filters.mentorId ? getSellersByMentor(filters.mentorId) : [];
    
    console.log('Рендер фильтров:', {
      accessibleAdmins,
      adminClusters,
      clusterMentors,
      mentorSellers
    });
    
    return (
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom color="#3f1f4b">
          <FilterList sx={{ verticalAlign: 'middle', mr: 1 }} />
          Фильтрация по иерархии
        </Typography>
        <Grid container spacing={2}>
          {/* Администраторы - только для OWNER */}
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
          
          {/* Кусты - для OWNER и ADMIN */}
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
                  {/* Для ADMIN показываем все кусты */}
                  {currentUser?.role === UserRole.ADMIN && !filters.adminId && (
                    <MenuItem value={1}>Куст 1</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>
          )}
          
          {/* Наставники */}
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
          
          {/* Продавцы */}
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

          {/* Фильтр по статусу */}
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
                    {status === ReportStatus.APPROVED ? 'Подтверждено' : 
                     status === ReportStatus.REJECTED ? 'Отклонено' : 
                     status === ReportStatus.SUBMITTED ? 'Отправлено' : 'Черновик'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Кнопки */}
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
          setDiscount(0);
          setPhotos([]);
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
                      <Box sx={{ 
                        width: 12, 
                        height: 12, 
                        borderRadius: '50%', 
                        backgroundColor: getCategoryColor(product.category) 
                      }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={product.name}
                      secondary={`Категория: ${getCategoryName(product.category)}`} // УБРАЛИ СУММУ ЗАКАЗА
                    />
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField
                        type="number"
                        size="small"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value) || 1)}
                        inputProps={{ 
                          min: 1,
                          style: { 
                            width: 80,
                            textAlign: 'center'
                          } 
                        }}
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

            {/* Скидка */}
            <Box sx={{ mb: 2 }}>
              <Button
                variant="outlined"
                startIcon={<Discount />}
                onClick={() => setDiscount(discount === 0 ? 100 : 0)}
                color={discount > 0 ? "primary" : "inherit"}
                fullWidth
              >
                {discount > 0 ? `Применена скидка: ${discount}₽` : 'Добавить скидку'}
              </Button>
              {discount > 0 && (
                <Typography variant="caption" color="#8a8a8a" display="block" sx={{ mt: 1, textAlign: 'center' }}>
                  Скидка будет учтена при создании отчета
                </Typography>
              )}
            </Box>

            {/* УБРАЛИ ПОКАЗ ИТОГОЙ СУММЫ */}
            {/* <Typography variant="subtitle2" gutterBottom color="#3f1f4b">
              Итого: {calculateTotal()}₽
            </Typography> */}

            {/* Загрузка фотографий */}
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

              {/* Список загруженных фото */}
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
              setDiscount(0);
              setPhotos([]);
            }
          }}
        >
          Отмена
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmitReport}
          disabled={selectedProducts.length === 0 || photos.length === 0 || loading}
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
        
        {/* Показываем кнопку создания отчета для всех, кроме OWNER */}
        {currentUser?.role !== UserRole.OWNER && (
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
                  // Безопасное получение sellerId
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
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" component="span">
                                {new Date(report.date).toLocaleDateString('ru-RU')} • 
                                {report.products.reduce((sum: number, item: any) => sum + (item.quantity || item.quantity || 0), 0)} шт. • 
                                {report.status === ReportStatus.APPROVED && currentUser?.role === UserRole.OWNER && (
                                  <> Сумма: {(report.transferAmount || 0).toFixed(2)}₽ •</>
                                )}
                                Статус: {report.status === ReportStatus.APPROVED ? 'Подтверждено' : 
                                        report.status === ReportStatus.REJECTED ? 'Отклонено' : 
                                        report.status === ReportStatus.SUBMITTED ? 'Отправлено' : 'Черновик'}
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
            Один товар можно добавить только один раз.
          </Alert>

          {/* Фильтр по категориям товаров */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom color="#3f1f4b">
              Фильтр по категориям:
            </Typography>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={productCategoryFilter} 
                onChange={(e, newValue) => setProductCategoryFilter(newValue)}
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab 
                  label="Все товары" 
                  value="all" 
                  icon={<Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ccc' }} />}
                  iconPosition="start"
                />
                {Object.values(ProductCategory).map(category => (
                  <Tab 
                    key={category}
                    label={getCategoryName(category)}
                    value={category}
                    icon={<Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: getCategoryColor(category) }} />}
                    iconPosition="start"
                  />
                ))}
              </Tabs>
            </Box>
          </Paper>

          {loadingProducts ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : filteredProducts.length === 0 ? (
            <Alert severity="warning">
              Нет товаров в выбранной категории. Выберите другую категорию.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {filteredProducts.map((product) => {
                const isSelected = selectedProducts.some(p => p.productId === product.id);
                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={product.id}>
                    <Card
                      sx={{
                        cursor: isSelected ? 'default' : 'pointer',
                        opacity: isSelected ? 0.7 : 1,
                        '&:hover': {
                          transform: isSelected ? 'none' : 'translateY(-2px)',
                          boxShadow: isSelected ? 1 : 3,
                        },
                        transition: 'all 0.2s',
                        position: 'relative',
                      }}
                      onClick={() => !isSelected && handleProductSelect(product.id)}
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
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Box sx={{ 
                            width: 10, 
                            height: 10, 
                            borderRadius: '50%', 
                            backgroundColor: getCategoryColor(product.category) 
                          }} />
                          <Typography variant="caption" color="#8a8a8a">
                            {getCategoryName(product.category)}
                          </Typography>
                        </Box>
                        <Typography variant="h6" sx={{ 
                          color: getCategoryColor(product.category), 
                          mb: 1,
                          textDecoration: isSelected ? 'line-through' : 'none'
                        }}>
                          {product.name}
                        </Typography>
                        <Typography variant="caption" color="#8a8a8a">
                          SKU: {product.sku}
                        </Typography>
                        {isSelected && (
                          <Typography variant="caption" color="#4caf50" display="block" sx={{ mt: 1 }}>
                            Уже в отчете
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
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

      {/* Snackbar для уведомлений */}
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