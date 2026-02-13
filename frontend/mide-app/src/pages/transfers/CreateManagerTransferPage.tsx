import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  TextField,
  Grid,
  Card,
  CardContent,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Divider,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  ArrowBack as BackIcon,
  SupervisorAccount as ManagerIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { transferService } from '../../api/transferService';
import { userService } from '../../api/userService';
import { productService } from '../../api/productService';
import { inventoryService } from '../../api/inventoryService';
import {
  TransferItemBase,
  User,
  UserRole,
  Product,
  InventoryItem,
  getRoleName,
} from '../../types';

const CreateManagerTransferPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [subordinateUsers, setSubordinateUsers] = useState<User[]>([]);
  const [senderInventory, setSenderInventory] = useState<InventoryItem[]>([]);
  const [inventoryProducts, setInventoryProducts] = useState<Product[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    fromUserId: 0,
    toUserId: 0,
  });
  
  const [items, setItems] = useState<TransferItemBase[]>([
    { productId: 0, expectedQuantity: 1, notes: '' }
  ]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  // Модалки
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const steps = [
    'Выбор пользователей',
    'Выбор товаров',
    'Подтверждение',
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (user) {
      loadSubordinateUsers();
    }
  }, [user]);

  useEffect(() => {
    if (formData.fromUserId) {
      loadSenderInventory();
    }
  }, [formData.fromUserId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, productsData] = await Promise.all([
        userService.getAllUsersBasic(),
        productService.getAllProducts()
      ]);
      
      const fullUsers = usersData.map(u => ({
        id: u.id,
        fullName: u.fullName,
        role: u.role,
      } as User));
      
      setUsers(fullUsers);
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const loadSubordinateUsers = async () => {
    try {
      // Получаем всех пользователей и фильтруем подчиненных
      const allUsers = await userService.getAllUsers();
      const subordinates = allUsers.filter(u => {
        // Руководитель может запрашивать у своих подчиненных
        if (user?.role === UserRole.OWNER) return true;
        if (user?.role === UserRole.ADMIN) {
          // Админ может запрашивать у пользователей в своих кустах
          return true;
        }
        if (user?.role === UserRole.SENIOR_SELLER) {
          // Старший продавец может запрашивать у продавцов в своем кусте
          return true;
        }
        if (user?.role === UserRole.MENTOR) {
          // Ментор может запрашивать у своих продавцов
          return true;
        }
        return false;
      });
      
      setSubordinateUsers(subordinates);
    } catch (error) {
      console.error('Error loading subordinates:', error);
    }
  };

  const loadSenderInventory = async () => {
    try {
      // Получаем инвентарь отправителя
      const inventory = await inventoryService.getUserInventory(formData.fromUserId);
      
      setSenderInventory(inventory.items || []);
      
      // Загружаем информацию о продуктах
      if (inventory.items && inventory.items.length > 0) {
        const productPromises = inventory.items.map(async (item: InventoryItem) => {
          try {
            const product = await productService.getProductById(item.productId);
            return product;
          } catch (error) {
            console.error(`Error loading product ${item.productId}:`, error);
            return null;
          }
        });
        
        const products = (await Promise.all(productPromises)).filter(Boolean) as Product[];
        setInventoryProducts(products);
      } else {
        setInventoryProducts([]);
      }
      
    } catch (error) {
      console.error('Error loading sender inventory:', error);
      setSenderInventory([]);
      setInventoryProducts([]);
    }
  };

  const getFilteredProducts = () => {
    if (!searchQuery.trim()) {
      return inventoryProducts;
    }
    
    const query = searchQuery.toLowerCase();
    return inventoryProducts.filter(product => 
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query) ||
      (product.description?.toLowerCase() || '').includes(query)
    );
  };

  const getProductAvailability = (productId: number) => {
    const item = senderInventory.find(i => i.productId === productId);
    return item ? item.quantity - (item.reservedQuantity || 0) : 0;
  };

  const validateStep = (step: number): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    if (step === 0) {
      if (!formData.title.trim()) newErrors.title = 'Введите название';
      if (!formData.fromUserId) newErrors.fromUserId = 'Выберите у кого запросить товары';
      if (!formData.toUserId) newErrors.toUserId = 'Выберите кому направить товары';
      if (formData.fromUserId === formData.toUserId) {
        newErrors.toUserId = 'Получатель не может быть отправителем';
      }
    }
    
    if (step === 1) {
      if (items.length === 0) {
        newErrors.items = 'Добавьте хотя бы один товар';
      }
      
      items.forEach((item, index) => {
        if (!item.productId) {
          newErrors[`item${index}_product`] = 'Выберите товар';
        }
        if (!item.expectedQuantity || item.expectedQuantity <= 0) {
          newErrors[`item${index}_quantity`] = 'Введите корректное количество';
        }
        
        const available = getProductAvailability(item.productId);
        if (available < item.expectedQuantity) {
          newErrors[`item${index}_quantity`] = `Недостаточно товара. Доступно: ${available} шт.`;
        }
      });
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(activeStep)) return;
    
    if (activeStep === steps.length - 1) {
      setConfirmDialogOpen(true);
    } else {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) return;
    
    try {
      setSubmitting(true);
      
      const transferData = {
        title: formData.title,
        description: formData.description,
        fromUserId: formData.fromUserId,
        toUserId: formData.toUserId,
        items: items.filter(item => item.productId > 0 && item.expectedQuantity > 0),
      };
      
      await transferService.createManagerRequest(transferData);
      
      setConfirmDialogOpen(false);
      setSuccessDialogOpen(true);
      
    } catch (error: any) {
      console.error('Error creating manager request:', error);
      setConfirmDialogOpen(false);
      showError(error.response?.data?.detail || error.message || 'Ошибка при создании запроса');
    } finally {
      setSubmitting(false);
    }
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setErrorDialogOpen(true);
  };

  const handleAddItem = () => {
    setItems([...items, { productId: 0, expectedQuantity: 1, notes: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof TransferItemBase, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
    
    if (errors[`item${index}_${field}`]) {
      const newErrors = { ...errors };
      delete newErrors[`item${index}_${field}`];
      setErrors(newErrors);
    }
  };

  const getProductName = (productId: number) => {
    const product = inventoryProducts.find(p => p.id === productId);
    return product ? product.name : `Товар #${productId}`;
  };

  const getProductSku = (productId: number) => {
    const product = inventoryProducts.find(p => p.id === productId);
    return product ? product.sku : '';
  };

  const getSelectedSender = () => {
    return subordinateUsers.find(u => u.id === formData.fromUserId);
  };

  const getSelectedReceiver = () => {
    return users.find(u => u.id === formData.toUserId);
  };

  if (loading && !products.length) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/movements')}
          sx={{ mb: 2 }}
        >
          Назад к перемещениям
        </Button>
        <Typography variant="h4" component="h1" gutterBottom color="#2a0f35">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ManagerIcon />
            Запрос перемещения от руководителя
          </Box>
        </Typography>
        <Typography variant="subtitle1" color="#4c5454">
          Запросите перемещение товаров у подчиненных пользователей
        </Typography>
      </Box>

      <Stepper activeStep={activeStep} orientation="vertical" sx={{ mb: 4 }}>
        {steps.map((label, index) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
            <StepContent>
              {index === 0 && (
                <Paper sx={{ p: 3, mt: 2 }}>
                  
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Название запроса *"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        error={!!errors.title}
                        helperText={errors.title}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Описание запроса"
                        multiline
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Укажите цель и особенности перемещения..."
                      />
                    </Grid>
                    
                    <Grid size={{ xs: 12, md: 6 }}>
                      <FormControl fullWidth error={!!errors.fromUserId}>
                        <InputLabel>У кого запросить товары *</InputLabel>
                        <Select
                          value={formData.fromUserId}
                          label="У кого запросить товары *"
                          onChange={(e) => setFormData({ ...formData, fromUserId: Number(e.target.value) })}
                        >
                          <MenuItem value={0}>Выберите пользователя</MenuItem>
                          {subordinateUsers.map((u) => (
                            <MenuItem key={u.id} value={u.id}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <PersonIcon fontSize="small" />
                                <span>{u.fullName} ({getRoleName(u.role)})</span>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.fromUserId && (
                          <Typography variant="caption" color="error">
                            {errors.fromUserId}
                          </Typography>
                        )}
                      </FormControl>
                    </Grid>
                    
                    <Grid size={{ xs: 12, md: 6 }}>
                      <FormControl fullWidth error={!!errors.toUserId}>
                        <InputLabel>Кому направить товары *</InputLabel>
                        <Select
                          value={formData.toUserId}
                          label="Кому направить товары *"
                          onChange={(e) => setFormData({ ...formData, toUserId: Number(e.target.value) })}
                        >
                          <MenuItem value={0}>Выберите пользователя</MenuItem>
                          {users
                            .filter(u => u.id !== formData.fromUserId)
                            .map((u) => (
                              <MenuItem key={u.id} value={u.id}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <PersonIcon fontSize="small" />
                                  <span>{u.fullName} ({getRoleName(u.role)})</span>
                                </Box>
                              </MenuItem>
                            ))}
                        </Select>
                        {errors.toUserId && (
                          <Typography variant="caption" color="error">
                            {errors.toUserId}
                          </Typography>
                        )}
                      </FormControl>
                    </Grid>
                  </Grid>
                </Paper>
              )}
              
              {index === 1 && (
                <Paper sx={{ p: 3, mt: 2 }}>
                  {errors.items && (
                    <Box sx={{ mb: 2, p: 1.5, bgcolor: 'error.light', borderRadius: 1 }}>
                      <Typography variant="body2" color="error">
                        {errors.items}
                      </Typography>
                    </Box>
                  )}
                  
                  <Typography variant="h6" gutterBottom color="#2a0f35">
                    Выбор товаров у отправителя
                  </Typography>
                  
                  {!formData.fromUserId ? (
                    <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 1 }}>
                      <PersonIcon sx={{ fontSize: 40, color: 'grey.400', mb: 1 }} />
                      <Typography variant="body1" color="textSecondary">
                        Сначала выберите отправителя на предыдущем шаге
                      </Typography>
                    </Box>
                  ) : senderInventory.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 1 }}>
                      <PersonIcon sx={{ fontSize: 40, color: 'grey.400', mb: 1 }} />
                      <Typography variant="body1" color="textSecondary">
                        У пользователя {getSelectedSender()?.fullName} нет товаров в инвентаре
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <TextField
                        fullWidth
                        placeholder="Поиск товаров по названию или артикулу..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        sx={{ mb: 3 }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon />
                            </InputAdornment>
                          ),
                        }}
                      />
                      
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Товар *</TableCell>
                              <TableCell>Артикул</TableCell>
                              <TableCell>Доступно у отправителя</TableCell>
                              <TableCell>Количество *</TableCell>
                              <TableCell>Примечание</TableCell>
                              <TableCell width={50}></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {items.map((item, index) => {
                              const available = getProductAvailability(item.productId);
                              const isInvalid = available < item.expectedQuantity;
                              const product = inventoryProducts.find(p => p.id === item.productId);
                              
                              return (
                                <TableRow key={index}>
                                  <TableCell>
                                    <FormControl fullWidth error={!!errors[`item${index}_product`]}>
                                      <Select
                                        value={item.productId}
                                        onChange={(e) => handleItemChange(index, 'productId', Number(e.target.value))}
                                        size="small"
                                        displayEmpty
                                      >
                                        <MenuItem value={0}>
                                          <em>Выберите товар</em>
                                        </MenuItem>
                                        {getFilteredProducts().map((product) => {
                                          const availableQty = getProductAvailability(product.id);
                                          return (
                                            <MenuItem 
                                              key={product.id} 
                                              value={product.id}
                                              disabled={availableQty === 0}
                                            >
                                              {product.name} {availableQty === 0 && '(нет в наличии)'}
                                            </MenuItem>
                                          );
                                        })}
                                      </Select>
                                      {errors[`item${index}_product`] && (
                                        <Typography color="error" variant="caption">
                                          {errors[`item${index}_product`]}
                                        </Typography>
                                      )}
                                    </FormControl>
                                  </TableCell>
                                  <TableCell>
                                    {product ? product.sku : '-'}
                                  </TableCell>
                                  <TableCell>
                                    {item.productId > 0 ? (
                                      <Chip
                                        label={`${available} шт.`}
                                        size="small"
                                        color={
                                          available === 0 ? 'error' : 
                                          available < item.expectedQuantity ? 'warning' : 'success'
                                        }
                                        variant={isInvalid ? 'outlined' : 'filled'}
                                      />
                                    ) : '-'}
                                  </TableCell>
                                  <TableCell>
                                    <TextField
                                      type="number"
                                      value={item.expectedQuantity}
                                      onChange={(e) => handleItemChange(index, 'expectedQuantity', Number(e.target.value))}
                                      size="small"
                                      error={!!errors[`item${index}_quantity`] || isInvalid}
                                      helperText={
                                        errors[`item${index}_quantity`] || 
                                        (isInvalid ? `Максимум: ${available} шт.` : '')
                                      }
                                      inputProps={{ 
                                        min: 1,
                                        max: available
                                      }}
                                      sx={{ width: '120px' }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <TextField
                                      value={item.notes || ''}
                                      onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                                      size="small"
                                      placeholder="Примечание"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleRemoveItem(index)}
                                      disabled={items.length === 1}
                                      color="error"
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      
                      <Button
                        startIcon={<AddIcon />}
                        onClick={handleAddItem}
                        sx={{ mt: 2 }}
                        disabled={getFilteredProducts().length === 0}
                      >
                        Добавить товар
                      </Button>
                      
                      <Divider sx={{ my: 3 }} />
                      
                    </>
                  )}
                </Paper>
              )}
              
              {index === 2 && (
                <Paper sx={{ p: 3, mt: 2 }}>
                  <Typography variant="h6" gutterBottom color="#2a0f35">
                    Подтверждение запроса
                  </Typography>
                  
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                            Запрос у пользователя
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <PersonIcon color="primary" />
                            <Typography variant="body1" fontWeight={500}>
                              {getSelectedSender()?.fullName || 'Не указан'}
                            </Typography>
                          </Box>
                          {getSelectedSender() && (
                            <Typography variant="caption" color="textSecondary">
                              {getRoleName(getSelectedSender()!.role)}
                            </Typography>
                          )}
                          <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                            Получит уведомление и должен будет подтвердить наличие товаров
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                            Направление пользователю
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <PersonIcon color="secondary" />
                            <Typography variant="body1" fontWeight={500}>
                              {getSelectedReceiver()?.fullName || 'Не указан'}
                            </Typography>
                          </Box>
                          {getSelectedReceiver() && (
                            <Typography variant="caption" color="textSecondary">
                              {getRoleName(getSelectedReceiver()!.role)}
                            </Typography>
                          )}
                          <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                            Получит товары после выполнения перемещения
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                  
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Товары для запроса:
                  </Typography>
                  <TableContainer sx={{ mb: 3 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Товар</TableCell>
                          <TableCell>Артикул</TableCell>
                          <TableCell align="right">Количество</TableCell>
                          <TableCell>Примечание</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {items.filter(item => item.productId > 0).map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{getProductName(item.productId)}</TableCell>
                            <TableCell>{getProductSku(item.productId)}</TableCell>
                            <TableCell align="right">
                              <Chip
                                label={`${item.expectedQuantity} шт.`}
                                size="small"
                                color={
                                  getProductAvailability(item.productId) < item.expectedQuantity 
                                    ? 'error' 
                                    : 'primary'
                                }
                              />
                            </TableCell>
                            <TableCell>{item.notes || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                </Paper>
              )}
              
              <Box sx={{ mb: 2, mt: 2 }}>
                <div>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    sx={{ mt: 1, mr: 1 }}
                    disabled={loading}
                    startIcon={activeStep === steps.length - 1 ? <SaveIcon /> : undefined}
                  >
                    {activeStep === steps.length - 1 ? 'Создать запрос' : 'Далее'}
                  </Button>
                  <Button
                    disabled={activeStep === 0 || loading}
                    onClick={handleBack}
                    sx={{ mt: 1, mr: 1 }}
                    variant="outlined"
                  >
                    Назад
                  </Button>
                </div>
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>

      {/* Модалка подтверждения создания */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => !submitting && setConfirmDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Подтверждение создания запроса</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Вы уверены, что хотите создать запрос на перемещение?
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Запрос у
              </Typography>
              <Typography variant="body2">
                {getSelectedSender()?.fullName}
              </Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Направление
              </Typography>
              <Typography variant="body2">
                {getSelectedReceiver()?.fullName}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" color="textSecondary">
                Количество товаров
              </Typography>
              <Typography variant="body2">
                {items.filter(item => item.productId > 0).length} позиций, 
                всего {items.reduce((sum, item) => sum + item.expectedQuantity, 0)} единиц
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => setConfirmDialogOpen(false)} 
            variant="outlined"
            disabled={submitting}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {submitting ? 'Создание...' : 'Создать запрос'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Модалка успешного создания */}
      <Dialog
        open={successDialogOpen}
        onClose={() => navigate('/movements')}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Запрос успешно создан!</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircleIcon sx={{ fontSize: 60, color: '#4caf50', mb: 2 }} />
            <Typography variant="body1" sx={{ mb: 2 }}>
              Запрос на перемещение "{formData.title}" успешно создан.
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Пользователь {getSelectedSender()?.fullName} получит уведомление о необходимости подтверждения.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => navigate('/movements')}
            variant="contained"
            color="primary"
            fullWidth
          >
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>

      {/* Модалка ошибки */}
      <Dialog
        open={errorDialogOpen}
        onClose={() => setErrorDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Ошибка</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ py: 2 }}>
            {errorMessage}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setErrorDialogOpen(false)}
            variant="contained"
            color="primary"
          >
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CreateManagerTransferPage;