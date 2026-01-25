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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  IconButton,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Add as AddIcon,
  Delete as DeleteIcon,
  PhotoCamera,
  Person,
  Group,
  LocationCity,
  Home,
  Language,
  CheckCircle,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { revisionService } from '../api/revisionService';
import { productService } from '../api/productService';
import {
  Revision,
  RevisionStatus,
  Product,
  ProductCategory,
  UserRole,
  getRevisionStatusText,
  getRevisionTypeText,
  getRevisionStatusColor,
  canFillRevision,
  getTargetName,
} from '../types';

const FillRevisionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [revision, setRevision] = useState<Revision | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  
  // Состояние для товаров ревизии
  const [revisionItems, setRevisionItems] = useState<Array<{
    productId: number;
    categoryId: number;
    quantity: number;
    productName: string;
    categoryName: string;
    productSku: string;
  }>>([]);
  
  // Состояние для добавления нового товара
  const [newProduct, setNewProduct] = useState<{
    productId: number;
    categoryId: number;
    quantity: number;
  }>({
    productId: 0,
    categoryId: 0,
    quantity: 1,
  });
  
  // Состояние для фото
  const [photos, setPhotos] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);

  // Проверяем, есть ли уже заполнение у пользователя
  const [existingFilling, setExistingFilling] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Загрузка данных
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!id) {
          throw new Error('ID ревизии не указан');
        }
        
        if (!user?.id) {
          throw new Error('Пользователь не авторизован');
        }
        
        const revisionId = parseInt(id);
        
        // Загружаем данные параллельно
        const [revisionData, productsData, categoriesData] = await Promise.all([
          revisionService.getRevisionById(revisionId),
          productService.getAllProducts(),
          productService.getAllCategories()
        ]);
        
        // Проверяем, может ли пользователь заполнять эту ревизию
        if (!canFillRevision(revisionData, user.id)) {
          throw new Error('У вас нет прав для заполнения этой ревизии');
        }
        
        // Проверяем статус ревизии
        if (revisionData.status !== RevisionStatus.REQUESTED && 
            revisionData.status !== RevisionStatus.IN_PROGRESS) {
          throw new Error('Эта ревизия уже заполнена или отменена');
        }
        
        setRevision(revisionData);
        setProducts(productsData);
        setCategories(categoriesData);
        
        // Проверяем, есть ли уже заполнение у пользователя
        try {
          const myFilling = await revisionService.getMyFilling(revisionId);
          if (myFilling && myFilling.isCompleted) {
            setExistingFilling(myFilling);
            setIsEditing(true);
            
            // Загружаем данные из существующего заполнения
            setRevisionItems(myFilling.items.map((item: any) => ({
              productId: item.productId,
              categoryId: item.categoryId,
              quantity: item.quantity,
              productName: item.productName || '',
              categoryName: item.categoryName || '',
              productSku: item.productSku || '',
            })));
            
            // Для фото нужно загрузить их отдельно (они хранятся как пути на сервере)
            // В реальном приложении здесь нужно будет загрузить превью фото
          }
        } catch (fillingError) {
          // Нет существующего заполнения - это нормально
          console.log('No existing filling found');
        }
        
      } catch (err: any) {
        setError(err.message || 'Ошибка при загрузке данных');
        console.error('Error loading revision:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [id, user]);

  // Добавление товара в ревизию
  const handleAddProduct = () => {
    if (!newProduct.productId || !newProduct.categoryId || newProduct.quantity <= 0) {
      setError('Заполните все поля товара');
      return;
    }
    
    const product = products.find(p => p.id === newProduct.productId);
    const category = categories.find(c => c.id === newProduct.categoryId);
    
    if (!product || !category) {
      setError('Товар или категория не найдены');
      return;
    }
    
    // Проверяем, не добавлен ли уже этот товар
    if (revisionItems.some(item => item.productId === newProduct.productId)) {
      setError('Этот товар уже добавлен в ревизию');
      return;
    }
    
    setRevisionItems(prev => [...prev, {
      ...newProduct,
      productName: product.name,
      categoryName: category.name,
      productSku: product.sku,
    }]);
    
    // Сбрасываем форму
    setNewProduct({
      productId: 0,
      categoryId: 0,
      quantity: 1,
    });
  };

  // Удаление товара из ревизии
  const handleRemoveProduct = (index: number) => {
    setRevisionItems(prev => prev.filter((_, i) => i !== index));
  };

  // Обновление количества товара
  const handleUpdateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    setRevisionItems(prev => prev.map((item, i) => 
      i === index ? { ...item, quantity: newQuantity } : item
    ));
  };

  // Обработка загрузки фото
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newPhotos: File[] = [];
    const newPreviewUrls: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError(`Файл ${file.name} слишком большой (максимум 10MB)`);
        continue;
      }
      
      if (!file.type.startsWith('image/')) {
        setError(`Файл ${file.name} не является изображением`);
        continue;
      }
      
      newPhotos.push(file);
      newPreviewUrls.push(URL.createObjectURL(file));
    }
    
    if (photos.length + newPhotos.length > 10) {
      setError('Максимальное количество фото - 10');
      return;
    }
    
    setPhotos(prev => [...prev, ...newPhotos]);
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  // Удаление фото
  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Просмотр фото
  const handleViewPhoto = (index: number) => {
    setSelectedPhotoIndex(index);
    setPhotoDialogOpen(true);
  };

  // Функция для получения иконки типа ревизии
  const getRevisionTypeIcon = (type: string) => {
    switch (type) {
      case 'USER': return <Person />;
      case 'GROUP': return <Group />;
      case 'CLUSTER': return <Home />;
      case 'CITY': return <LocationCity />;
      case 'GENERAL': return <Language />;
      default: return <Language />;
    }
  };

  // Сохранение ревизии
  const handleSubmit = async () => {
    try {
      if (!user?.id) {
        throw new Error('Пользователь не авторизован');
      }

      if (revisionItems.length === 0) {
        throw new Error('Добавьте хотя бы один товар в ревизию');
      }
      
      if (photos.length === 0) {
        throw new Error('Добавьте хотя бы одно фото');
      }
      
      setSaving(true);
      setError(null);
      
      const itemsToSend = revisionItems.map(item => ({
        productId: item.productId,
        categoryId: item.categoryId,
        quantity: item.quantity,
      }));
      
      // Используем новый метод fillRevision с передачей userId
      await revisionService.fillRevision(
        parseInt(id!),
        itemsToSend,
        photos,
        user.id
      );
      
      setSuccess('Ревизия успешно сохранена!');
      
      setTimeout(() => {
        navigate(`/revisions/${id}`);
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || 'Ошибка при сохранении ревизии');
      console.error('Error saving revision:', err);
    } finally {
      setSaving(false);
    }
  };

  // Фильтрация продуктов по выбранной категории
  const filteredProducts = newProduct.categoryId
    ? products.filter(p => p.categoryId === newProduct.categoryId)
    : products;

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!revision || !user?.id) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          Ревизия не найдена или пользователь не авторизован
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/revisions')}
          sx={{ mb: 2 }}
        >
          Назад к ревизиям
        </Button>
        
        <Typography variant="h4" component="h1" gutterBottom color="#2a0f35">
          {isEditing ? 'Редактирование заполнения' : 'Заполнение ревизии'} #{revision.id}
        </Typography>
        
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Chip
            icon={getRevisionTypeIcon(revision.type)}
            label={getRevisionTypeText(revision.type)}
            sx={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}
          />
          <Chip
            label={getRevisionStatusText(revision.status)}
            sx={{
              backgroundColor: `${getRevisionStatusColor(revision.status)}15`,
              color: getRevisionStatusColor(revision.status),
              fontWeight: 500,
            }}
          />
          
          <Chip
            label={getTargetName(revision)}
            sx={{ backgroundColor: '#f3e5f5', color: '#7b1fa2' }}
          />
          
          {existingFilling && (
            <Chip
              icon={<CheckCircle />}
              label="У вас уже есть заполнение"
              sx={{ backgroundColor: '#e8f5e9', color: '#388e3c' }}
            />
          )}
        </Stack>
        
        {existingFilling && (
          <Alert severity="info" sx={{ mb: 2 }}>
            У вас уже есть сохраненное заполнение этой ревизии. Редактирование заменит текущие данные.
          </Alert>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Левая колонка: добавление товаров */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom color="#2a0f35">
              Добавление товаров
            </Typography>
            
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>Категория</InputLabel>
                  <Select
                    value={newProduct.categoryId}
                    label="Категория"
                    onChange={(e) => setNewProduct(prev => ({
                      ...prev,
                      categoryId: Number(e.target.value),
                      productId: 0 // Сбрасываем выбор товара при смене категории
                    }))}
                  >
                    <MenuItem value={0}>Выберите категорию</MenuItem>
                    {categories.map(category => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth disabled={!newProduct.categoryId}>
                  <InputLabel>Товар</InputLabel>
                  <Select
                    value={newProduct.productId}
                    label="Товар"
                    onChange={(e) => setNewProduct(prev => ({
                      ...prev,
                      productId: Number(e.target.value)
                    }))}
                  >
                    <MenuItem value={0}>Выберите товар</MenuItem>
                    {filteredProducts.map(product => (
                      <MenuItem key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Количество"
                  value={newProduct.quantity}
                  onChange={(e) => setNewProduct(prev => ({
                    ...prev,
                    quantity: Math.max(0, parseInt(e.target.value) || 0)
                  }))}
                  inputProps={{ min: 1 }}
                />
              </Grid>
              
              <Grid size={{ xs: 12 }}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddProduct}
                  disabled={!newProduct.productId || !newProduct.categoryId || newProduct.quantity <= 0}
                  sx={{
                    backgroundColor: '#2196f3',
                    '&:hover': { backgroundColor: '#1976d2' },
                  }}
                >
                  Добавить товар
                </Button>
              </Grid>
            </Grid>
          </Paper>
          
          {/* Список добавленных товаров */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" color="#2a0f35">
                Товары в ревизии ({revisionItems.length})
              </Typography>
              {revisionItems.length > 0 && (
                <Chip
                  label={`Итого: ${revisionItems.reduce((sum, item) => sum + item.quantity, 0)} шт.`}
                  sx={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}
                />
              )}
            </Box>
            
            {revisionItems.length === 0 ? (
              <Alert severity="info">
                Добавьте товары в ревизию
              </Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f3f6' }}>
                      <TableCell sx={{ fontWeight: 'bold', color: '#2a0f35' }}>Товар</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#2a0f35' }}>Категория</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#2a0f35' }}>Количество</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: '#2a0f35' }}>Действия</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {revisionItems.map((item, index) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {item.productName}
                            </Typography>
                            <Typography variant="caption" color="#4c5454">
                              {item.productSku}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{item.categoryName}</TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleUpdateQuantity(index, Math.max(0, parseInt(e.target.value) || 0))}
                            inputProps={{ min: 0, style: { width: '80px' } }}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveProduct(index)}
                            sx={{ color: '#f44336' }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
        
        {/* Правая колонка: фото и кнопка сохранения */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" color="#2a0f35">
                Фотографии ({photos.length}/10)
              </Typography>
              {photos.length > 0 && (
                <Chip
                  label={`${photos.length} фото`}
                  sx={{ backgroundColor: '#e3f2fd', color: '#1976d2' }}
                />
              )}
            </Box>
            
            <Typography variant="body2" color="#4c5454" sx={{ mb: 2 }}>
              Загрузите фотографии товаров. Минимум 1 фото, максимум 10.
            </Typography>
            
            <Button
              variant="outlined"
              component="label"
              startIcon={<PhotoCamera />}
              sx={{ mb: 2 }}
              disabled={photos.length >= 10}
            >
              {photos.length >= 10 ? 'Достигнут лимит фото' : 'Загрузить фото'}
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
                hidden
                disabled={photos.length >= 10}
              />
            </Button>
            
            {photos.length > 0 && (
              <Grid container spacing={2}>
                {previewUrls.map((url, index) => (
                  <Grid size={{ xs: 6, sm: 4 }} key={index}>
                    <Card>
                      <CardContent sx={{ p: 1 }}>
                        <Box
                          sx={{
                            height: 120,
                            backgroundImage: `url(${url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            borderRadius: 1,
                            mb: 1,
                            cursor: 'pointer',
                          }}
                          onClick={() => handleViewPhoto(index)}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" noWrap sx={{ maxWidth: '80px' }}>
                            {photos[index].name}
                          </Typography>
                          <Typography variant="caption" color="#4c5454">
                            {Math.round(photos[index].size / 1024)} KB
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => handleRemovePhoto(index)}
                            sx={{ color: '#f44336' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
          
          {/* Кнопка сохранения */}
          <Paper sx={{ p: 3, backgroundColor: '#f5f5f5' }}>
            <Typography variant="h6" gutterBottom color="#2a0f35">
              {isEditing ? 'Обновление заполнения' : 'Завершение ревизии'}
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: 2,
                mb: 2 
              }}>
                <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#2196f310' }}>
                  <Typography variant="h5" color="#2196f3">
                    {revisionItems.length}
                  </Typography>
                  <Typography variant="caption" color="#4c5454">
                    Товаров
                  </Typography>
                </Paper>
                
                <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#9c27b010' }}>
                  <Typography variant="h5" color="#9c27b0">
                    {revisionItems.reduce((sum, item) => sum + item.quantity, 0)}
                  </Typography>
                  <Typography variant="caption" color="#4c5454">
                    Всего единиц
                  </Typography>
                </Paper>
              </Box>
              
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                onClick={handleSubmit}
                disabled={saving || revisionItems.length === 0 || photos.length === 0}
                sx={{
                  backgroundColor: '#4caf50',
                  '&:hover': { backgroundColor: '#388e3c' },
                }}
              >
                {saving 
                  ? 'Сохранение...' 
                  : isEditing 
                    ? 'Обновить заполнение' 
                    : 'Сохранить ревизию'}
              </Button>
              
              <Typography variant="caption" color="#4c5454" align="center">
                После сохранения ревизию сможет проверить тот, кто её запросил
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Диалог просмотра фото */}
      <Dialog
        open={photoDialogOpen}
        onClose={() => setPhotoDialogOpen(false)}
        maxWidth="lg"
      >
        <DialogTitle>
          Фотография {selectedPhotoIndex + 1} из {photos.length}
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              width: '100%',
              maxHeight: '70vh',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <img
              src={previewUrls[selectedPhotoIndex]}
              alt={`Фото ${selectedPhotoIndex + 1}`}
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPhotoDialogOpen(false)}>
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FillRevisionPage;