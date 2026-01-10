import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tab,
  Tabs,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Inventory as InventoryIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { productService } from '../api/productService';
import { userService } from '../api/userService';
import { Product, ProductCategory, UserRole, InventoryItem, User } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`products-tabpanel-${index}`}
      aria-labelledby={`products-tab-${index}`}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const ProductsPage: React.FC = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Диалоги
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [replenishDialogOpen, setReplenishDialogOpen] = useState(false);
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState(false);
  
  // Форма новой категории
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    isActive: true,
  });
  
  // Форма пополнения
  const [replenishForm, setReplenishForm] = useState({
    isNewProduct: false,
    productId: '',
    quantity: 1,
    newProduct: {
      name: '',
      sku: '',
      categoryId: '',
      price: 0,
      description: '',
    },
  });

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategory | null>(null);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [replenishCategoryFilter, setReplenishCategoryFilter] = useState<number | 'all'>('all');

  useEffect(() => {
    if (user?.role === UserRole.OWNER) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [productsData, categoriesData, inventoryData, usersData] = await Promise.all([
        productService.getAllProducts(),
        productService.getAllCategories(),
        productService.getCompanyInventory(),
        userService.getAllUsers(0, 1000), // Получаем всех пользователей
      ]);
      
      setProducts(productsData);
      setCategories(categoriesData);
      setInventory(inventoryData.items || []);
      setTotalQuantity(inventoryData.quantity || 0);
      setUsers(usersData);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка загрузки данных');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Получить ФИО пользователя по ID
  const getUserFullName = (userId: number): string => {
    const user = users.find(u => u.id === userId);
    return user?.fullName || `Пользователь #${userId}`;
  };

  // Получить имя категории по ID
  const getCategoryName = (categoryId: number): string => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || `Категория #${categoryId}`;
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCreateCategory = async () => {
    try {
      const category = await productService.createCategory(newCategory);
      setCategories([...categories, category]);
      setNewCategory({ name: '', description: '', isActive: true });
      setCategoryDialogOpen(false);
      setSuccessMessage('Категория успешно создана');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка создания категории');
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategoryId) return;
    
    try {
      const updated = await productService.updateCategory(editingCategoryId, newCategory);
      setCategories(categories.map(c => c.id === editingCategoryId ? updated : c));
      setNewCategory({ name: '', description: '', isActive: true });
      setIsEditingCategory(false);
      setEditingCategoryId(null);
      setCategoryDialogOpen(false);
      setSuccessMessage('Категория успешно обновлена');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка обновления категории');
    }
  };

  const handleEditCategory = (category: ProductCategory) => {
    setNewCategory({
      name: category.name,
      description: category.description || '',
      isActive: category.isActive,
    });
    setIsEditingCategory(true);
    setEditingCategoryId(category.id);
    setCategoryDialogOpen(true);
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    
    try {
      await productService.deleteCategory(categoryToDelete.id);
      setCategories(categories.filter(c => c.id !== categoryToDelete.id));
      setDeleteCategoryDialogOpen(false);
      setCategoryToDelete(null);
      setSuccessMessage('Категория успешно удалена');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка удаления категории');
    }
  };

  const handleReplenish = async () => {
    try {
      if (replenishForm.isNewProduct) {
        // Создать новый товар
        const newProduct = await productService.createProduct({
          name: replenishForm.newProduct.name,
          sku: replenishForm.newProduct.sku,
          categoryId: parseInt(replenishForm.newProduct.categoryId),
          price: replenishForm.newProduct.price,
          description: replenishForm.newProduct.description,
        });
        
        // Пополнить инвентарь новым товаром
        await productService.replenishInventory({
          productId: newProduct.id,
          quantity: replenishForm.quantity,
        });
      } else {
        // Пополнить существующий товар
        await productService.replenishInventory({
          productId: parseInt(replenishForm.productId),
          quantity: replenishForm.quantity,
        });
      }
      
      // Обновить данные
      await loadData();
      setReplenishDialogOpen(false);
      resetReplenishForm();
      setSuccessMessage('Товар успешно пополнен');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка пополнения товара');
    }
  };

  const resetReplenishForm = () => {
    setReplenishForm({
      isNewProduct: false,
      productId: '',
      quantity: 1,
      newProduct: {
        name: '',
        sku: '',
        categoryId: '',
        price: 0,
        description: '',
      },
    });
    setReplenishCategoryFilter('all');
  };

  const resetCategoryForm = () => {
    setNewCategory({ name: '', description: '', isActive: true });
    setIsEditingCategory(false);
    setEditingCategoryId(null);
  };

  // Фильтрация инвентаря для таблицы
  const filteredInventory = selectedCategoryId === 'all' 
    ? inventory 
    : inventory.filter(item => {
        const product = products.find(p => p.id === item.productId);
        return product?.categoryId === selectedCategoryId;
      });

  // Фильтрация товаров для пополнения (существующие товары)
  const filteredProductsForReplenish = replenishCategoryFilter === 'all'
    ? products
    : products.filter(product => product.categoryId === replenishCategoryFilter);

  // Агрегируем данные по товарам для лучшего отображения
  const aggregatedInventory = filteredInventory.reduce((acc, item) => {
    const existing = acc.find(i => i.productId === item.productId && i.userId === item.userId);
    if (existing) {
      existing.quantity += item.quantity;
      existing.reservedQuantity += item.reservedQuantity;
    } else {
      acc.push({ ...item });
    }
    return acc;
  }, [] as InventoryItem[]);

  if (user?.role !== UserRole.OWNER) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="error">
            Доступ запрещен. Эта страница доступна только владельцу.
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="products tabs">
            <Tab 
              icon={<InventoryIcon />} 
              iconPosition="start" 
              label="Товары" 
              id="products-tab-0" 
            />
            <Tab 
              icon={<CategoryIcon />} 
              iconPosition="start" 
              label="Категории" 
              id="products-tab-1" 
            />
          </Tabs>
        </Box>

        {error && (
          <Alert severity="error" sx={{ m: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Box>
              <Typography variant="h5" gutterBottom>
                Общий остаток товаров
              </Typography>
              <Typography variant="h3" color="primary">
                {totalQuantity} шт.
              </Typography>
            </Box>
            <Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setReplenishDialogOpen(true)}
                sx={{ mr: 1 }}
              >
                Пополнить товар
              </Button>
              <IconButton onClick={loadData} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Box>
          </Box>

          <Box sx={{ mb: 3 }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="category-filter-label">Фильтр по категории</InputLabel>
              <Select
                labelId="category-filter-label"
                value={selectedCategoryId}
                label="Фильтр по категории"
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

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell><strong>Товар</strong></TableCell>
                    <TableCell><strong>SKU</strong></TableCell>
                    <TableCell><strong>Категория</strong></TableCell>
                    <TableCell><strong>Количество</strong></TableCell>
                    <TableCell><strong>У кого находится</strong></TableCell>
                    <TableCell><strong>Цена</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {aggregatedInventory.length > 0 ? (
                    aggregatedInventory.map((item) => {
                      const product = products.find(p => p.id === item.productId);
                      
                      return (
                        <TableRow key={`${item.productId}-${item.userId}`} hover>
                          <TableCell>{product?.name || 'Неизвестно'}</TableCell>
                          <TableCell>{product?.sku || 'N/A'}</TableCell>
                          <TableCell>
                            {product ? (
                              <Chip 
                                label={getCategoryName(product.categoryId)} 
                                size="small" 
                                variant="outlined"
                              />
                            ) : 'Без категории'}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body1" fontWeight="bold">
                              {item.quantity} шт.
                            </Typography>
                            {item.reservedQuantity > 0 && (
                              <Typography variant="caption" color="text.secondary">
                                (зарезервировано: {item.reservedQuantity} шт.)
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {getUserFullName(item.userId)}
                          </TableCell>
                          <TableCell>
                            {product?.price ? `${product.price} ₽` : 'N/A'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                        <Box sx={{ textAlign: 'center', py: 2 }}>
                          <Typography variant="h6" color="text.secondary" gutterBottom>
                            Нет товаров в инвентаре для отображения
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {selectedCategoryId !== 'all' ? (
                              `Для выбранной категории "${categories.find(c => c.id === selectedCategoryId)?.name}" нет товаров в инвентаре`
                            ) : (
                              'Используйте кнопку "Пополнить товар" чтобы добавить товары в инвентарь'
                            )}
                          </Typography>
                          {products.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="body2" color="text.secondary">
                                Всего товаров в системе: {products.length}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                В инвентаре: {inventory.length > 0 ? `${aggregatedInventory.length} позиций` : 'нет товаров'}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h5">Управление категориями</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                resetCategoryForm();
                setCategoryDialogOpen(true);
              }}
            >
              Добавить категорию
            </Button>
          </Box>

          <Grid container spacing={2}>
            {categories.map((category) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={category.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          {category.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {category.description || 'Нет описания'}
                        </Typography>
                        <Chip
                          label={category.isActive ? 'Активна' : 'Неактивна'}
                          size="small"
                          color={category.isActive ? 'success' : 'default'}
                          variant="outlined"
                        />
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            ID: {category.id}
                          </Typography>
                          <Typography variant="caption" display="block" color="text.secondary">
                            Товаров в категории: {products.filter(p => p.categoryId === category.id).length}
                          </Typography>
                        </Box>
                      </Box>
                      <Box>
                        <IconButton
                          size="small"
                          onClick={() => handleEditCategory(category)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setCategoryToDelete(category);
                            setDeleteCategoryDialogOpen(true);
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {categories.length === 0 && (
              <Grid size={{ xs: 12 }}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    Категории еще не созданы. Создайте первую категорию.
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </TabPanel>
      </Paper>

      {/* Диалог создания/редактирования категории */}
      <Dialog 
        open={categoryDialogOpen} 
        onClose={() => {
          setCategoryDialogOpen(false);
          resetCategoryForm();
        }}
      >
        <DialogTitle>
          {isEditingCategory ? 'Редактировать категорию' : 'Создать новую категорию'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Название категории"
            fullWidth
            value={newCategory.name}
            onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Описание"
            fullWidth
            multiline
            rows={3}
            value={newCategory.description}
            onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCategoryDialogOpen(false);
            resetCategoryForm();
          }}>
            Отмена
          </Button>
          <Button 
            onClick={isEditingCategory ? handleUpdateCategory : handleCreateCategory}
            variant="contained"
            disabled={!newCategory.name.trim()}
          >
            {isEditingCategory ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог удаления категории */}
      <Dialog 
        open={deleteCategoryDialogOpen} 
        onClose={() => setDeleteCategoryDialogOpen(false)}
      >
        <DialogTitle>Удалить категорию</DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите удалить категорию "{categoryToDelete?.name}"?
            Это действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteCategoryDialogOpen(false)}>Отмена</Button>
          <Button 
            onClick={handleDeleteCategory}
            variant="contained"
            color="error"
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог пополнения товара */}
      <Dialog 
        open={replenishDialogOpen} 
        onClose={() => {
          setReplenishDialogOpen(false);
          resetReplenishForm();
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Пополнить товар</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Тип товара:
              </Typography>
              <Select
                value={replenishForm.isNewProduct ? 'new' : 'existing'}
                onChange={(e) => setReplenishForm({
                  ...replenishForm,
                  isNewProduct: e.target.value === 'new',
                  productId: '',
                })}
              >
                <MenuItem value="existing">Существующий товар</MenuItem>
                <MenuItem value="new">Новый товар</MenuItem>
              </Select>
            </FormControl>

            {replenishForm.isNewProduct ? (
              <Box>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Название товара"
                      fullWidth
                      required
                      value={replenishForm.newProduct.name}
                      onChange={(e) => setReplenishForm({
                        ...replenishForm,
                        newProduct: {...replenishForm.newProduct, name: e.target.value}
                      })}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="SKU (артикул)"
                      fullWidth
                      required
                      value={replenishForm.newProduct.sku}
                      onChange={(e) => setReplenishForm({
                        ...replenishForm,
                        newProduct: {...replenishForm.newProduct, sku: e.target.value}
                      })}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth required>
                      <InputLabel>Категория</InputLabel>
                      <Select
                        value={replenishForm.newProduct.categoryId}
                        label="Категория"
                        onChange={(e) => setReplenishForm({
                          ...replenishForm,
                          newProduct: {...replenishForm.newProduct, categoryId: e.target.value}
                        })}
                      >
                        <MenuItem value="">Выберите категорию</MenuItem>
                        {categories.map(category => (
                          <MenuItem key={category.id} value={category.id}>
                            {category.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Цена"
                      type="number"
                      fullWidth
                      required
                      value={replenishForm.newProduct.price || ''}
                      onChange={(e) => setReplenishForm({
                        ...replenishForm,
                        newProduct: {
                          ...replenishForm.newProduct, 
                          price: parseFloat(e.target.value) || 0
                        }
                      })}
                      InputProps={{
                        inputProps: { min: 0, step: 0.01 }
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Описание"
                      fullWidth
                      multiline
                      rows={2}
                      value={replenishForm.newProduct.description}
                      onChange={(e) => setReplenishForm({
                        ...replenishForm,
                        newProduct: {...replenishForm.newProduct, description: e.target.value}
                      })}
                    />
                  </Grid>
                </Grid>
              </Box>
            ) : (
              <Box>
                {/* Фильтр по категории для существующих товаров */}
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Фильтр по категории</InputLabel>
                  <Select
                    value={replenishCategoryFilter}
                    label="Фильтр по категории"
                    onChange={(e) => setReplenishCategoryFilter(e.target.value as number | 'all')}
                  >
                    <MenuItem value="all">Все категории</MenuItem>
                    {categories.map(category => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Выберите товар</InputLabel>
                  <Select
                    value={replenishForm.productId}
                    label="Выберите товар"
                    onChange={(e) => setReplenishForm({
                      ...replenishForm,
                      productId: e.target.value
                    })}
                    disabled={filteredProductsForReplenish.length === 0}
                  >
                    <MenuItem value="">Выберите товар</MenuItem>
                    {filteredProductsForReplenish.map(product => (
                      <MenuItem key={product.id} value={product.id}>
                        {product.name} ({product.sku}) - {product.price} ₽
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          [{categories.find(c => c.id === product.categoryId)?.name}]
                        </Typography>
                      </MenuItem>
                    ))}
                  </Select>
                  {filteredProductsForReplenish.length === 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                      {replenishCategoryFilter === 'all' 
                        ? 'В системе нет товаров' 
                        : `В категории "${categories.find(c => c.id === replenishCategoryFilter)?.name}" нет товаров`}
                    </Typography>
                  )}
                </FormControl>
              </Box>
            )}

            <TextField
              label="Количество"
              type="number"
              fullWidth
              required
              sx={{ mt: 3 }}
              value={replenishForm.quantity}
              onChange={(e) => setReplenishForm({
                ...replenishForm,
                quantity: parseInt(e.target.value) || 0
              })}
              InputProps={{
                inputProps: { min: 1 }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setReplenishDialogOpen(false);
            resetReplenishForm();
          }}>
            Отмена
          </Button>
          <Button 
            onClick={handleReplenish}
            variant="contained"
            disabled={
              replenishForm.quantity < 1 ||
              (!replenishForm.isNewProduct && !replenishForm.productId) ||
              (replenishForm.isNewProduct && (
                !replenishForm.newProduct.name.trim() ||
                !replenishForm.newProduct.sku.trim() ||
                !replenishForm.newProduct.categoryId ||
                replenishForm.newProduct.price <= 0
              ))
            }
          >
            Пополнить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Уведомление об успехе */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage(null)}
        message={successMessage}
      />
    </Container>
  );
};

export default ProductsPage;