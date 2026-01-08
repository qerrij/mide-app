import React, { useState } from 'react';
import {
  Container,
  Tabs,
  Tab,
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  Warning,
  LocationOn,
  Group,
  Store,
  PhotoCamera,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, ProductCategory } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

// Локальный интерфейс для продуктов в ревизии
interface InventoryProduct {
  id: string;
  name: string;
  currentStock: number;
}

const InventoryPage: React.FC = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [openInventoryDialog, setOpenInventoryDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>(ProductCategory.DISPOSABLES);
  const [inventoryData, setInventoryData] = useState<Record<string, number>>({});
  const [inventoryPhoto, setInventoryPhoto] = useState<File | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCategoryChange = (event: SelectChangeEvent) => {
    setSelectedCategory(event.target.value as ProductCategory);
  };

  const handleQuantityChange = (productId: string, quantity: string) => {
    setInventoryData({
      ...inventoryData,
      [productId]: parseInt(quantity) || 0,
    });
  };

  const handleSubmitInventory = () => {
    // Логика отправки ревизии
    console.log({
      category: selectedCategory,
      data: inventoryData,
      photo: inventoryPhoto,
      recipient: selectedRecipient,
    });
    setOpenInventoryDialog(false);
    setInventoryData({});
    setInventoryPhoto(null);
  };

  const getCategoryProducts = (category: ProductCategory): InventoryProduct[] => {
    // Моковые данные товаров по категориям
    const products: Record<ProductCategory, InventoryProduct[]> = {
      [ProductCategory.DISPOSABLES]: [
        { id: 'disp-1', name: 'HQD Crystal Bar', currentStock: 50 },
        { id: 'disp-2', name: 'Elf Bar 600', currentStock: 30 },
        { id: 'disp-3', name: 'Masking 2000', currentStock: 25 },
      ],
      [ProductCategory.LIQUIDS]: [
        { id: 'liq-1', name: 'Juicy Bar 30ml', currentStock: 100 },
        { id: 'liq-2', name: 'HQD Liquid', currentStock: 75 },
      ],
      [ProductCategory.CONSUMABLES]: [
        { id: 'cons-1', name: 'Зарядное устройство', currentStock: 20 },
        { id: 'cons-2', name: 'Насадки', currentStock: 150 },
      ],
      [ProductCategory.PODS]: [
        { id: 'pod-1', name: 'Pod System X', currentStock: 20 },
        { id: 'pod-2', name: 'Elf Bar Pod', currentStock: 15 },
      ],
      [ProductCategory.ENERGY_DRINKS]: [
        { id: 'energy-1', name: 'Energy Drink 250ml', currentStock: 100 },
        { id: 'energy-2', name: 'Super Energy 500ml', currentStock: 80 },
      ],
    };
    
    return products[category] || [];
  };

  const getRecipientOptions = () => {
    const options: string[] = [];
    if (user?.role === UserRole.OWNER || user?.role === UserRole.ADMIN) {
      options.push('Владелец', 'Админ');
    }
    if (user?.role === UserRole.SENIOR_SELLER || user?.role === UserRole.ADMIN) {
      options.push('Старший продавец');
    }
    if (user?.role === UserRole.MENTOR || user?.role === UserRole.SENIOR_SELLER) {
      options.push('Наставник');
    }
    
    // Используем Set для удаления дубликатов и преобразуем обратно в массив
    const uniqueOptions = Array.from(new Set(options));
    return uniqueOptions;
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom color="#2a0f35">
        Учет товаров
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="inventory tabs"
          sx={{
            '& .MuiTab-root': {
              color: '#4c5454',
              '&.Mui-selected': {
                color: '#674fb6',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#674fb6',
            },
          }}
        >
          <Tab icon={<InventoryIcon />} iconPosition="start" label="Остатки товаров" />
          <Tab icon={<Warning />} iconPosition="start" label="Бракованный товар" />
          <Tab icon={<LocationOn />} iconPosition="start" label="По городам" />
          <Tab icon={<Group />} iconPosition="start" label="По группам" />
          <Tab icon={<Store />} iconPosition="start" label="По кустам" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {Object.values(ProductCategory).map((category) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={category}>
              <Card
                sx={{
                  height: '100%',
                  border: `2px solid ${getCategoryColor(category)}20`,
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <CardActionArea
                  sx={{ height: '100%', p: 2 }}
                  onClick={() => {
                    setSelectedCategory(category);
                    // Здесь будет переход к деталям категории
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          backgroundColor: `${getCategoryColor(category)}15`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2,
                        }}
                      >
                        <InventoryIcon sx={{ color: getCategoryColor(category) }} />
                      </Box>
                      <Typography
                        variant="h6"
                        sx={{ color: getCategoryColor(category), fontWeight: 600 }}
                      >
                        {getCategoryLabel(category)}
                      </Typography>
                    </Box>
                    <Typography variant="h4" sx={{ color: '#2a0f35', textAlign: 'center' }}>
                      156
                    </Typography>
                    <Typography variant="body2" color="#4c5454" textAlign="center">
                      единиц в наличии
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button
            variant="contained"
            startIcon={<PhotoCamera />}
            onClick={() => setOpenInventoryDialog(true)}
            sx={{
              backgroundColor: '#56b8d1',
              '&:hover': {
                backgroundColor: '#2a9ab3',
              },
            }}
          >
            Начать ревизию
          </Button>
        </Box>
      </TabPanel>

      {/* Диалог ревизии */}
      <Dialog
        open={openInventoryDialog}
        onClose={() => setOpenInventoryDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: '#f5f3f6', color: '#2a0f35' }}>
          📋 Проведение ревизии
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Категория товаров</InputLabel>
                <Select
                  value={selectedCategory}
                  label="Категория товаров"
                  onChange={handleCategoryChange}
                >
                  {Object.values(ProductCategory).map((category) => (
                    <MenuItem key={category} value={category}>
                      {getCategoryLabel(category)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {getCategoryProducts(selectedCategory).map((product: InventoryProduct) => (
              <Grid size={{ xs: 12, sm: 6 }} key={product.id}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" gutterBottom sx={{ color: '#3f1f4b' }}>
                    {product.name}
                  </Typography>
                  <Typography variant="body2" color="#4c5454" gutterBottom>
                    Текущий остаток: {product.currentStock}
                  </Typography>
                  <TextField
                    fullWidth
                    type="number"
                    label="Фактическое количество"
                    value={inventoryData[product.id] || ''}
                    onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                    InputProps={{ inputProps: { min: 0 } }}
                  />
                </Paper>
              </Grid>
            ))}

            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Для кого делается ревизия</InputLabel>
                <Select
                  value={selectedRecipient}
                  label="Для кого делается ревизия"
                  onChange={(e) => setSelectedRecipient(e.target.value)}
                >
                  {getRecipientOptions().map((option: string) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Box sx={{ border: '2px dashed #d7d2d8', p: 3, borderRadius: 2, textAlign: 'center' }}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="inventory-photo-upload"
                  type="file"
                  onChange={(e) => setInventoryPhoto(e.target.files?.[0] || null)}
                />
                <label htmlFor="inventory-photo-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<PhotoCamera />}
                    sx={{
                      borderColor: '#2a436d',
                      color: '#2a436d',
                    }}
                  >
                    {inventoryPhoto ? 'Фото загружено' : 'Прикрепить фото товара'}
                  </Button>
                </label>
                <Typography variant="caption" display="block" sx={{ mt: 1, color: '#8a8a8a' }}>
                  Обязательное поле
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenInventoryDialog(false)}
            sx={{ color: '#4c5454' }}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSubmitInventory}
            disabled={!selectedRecipient || !inventoryPhoto}
            sx={{
              backgroundColor: '#674fb6',
              color: 'white',
              '&:hover': {
                backgroundColor: '#483399',
              },
              '&:disabled': {
                backgroundColor: '#d7d2d8',
              },
            }}
          >
            Отправить ревизию
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

// Вспомогательные функции
const getCategoryColor = (category: ProductCategory): string => {
  const colors: Record<ProductCategory, string> = {
    [ProductCategory.DISPOSABLES]: '#674fb6',
    [ProductCategory.LIQUIDS]: '#56b8d1',
    [ProductCategory.CONSUMABLES]: '#2a436d',
    [ProductCategory.PODS]: '#3f1f4b',
    [ProductCategory.ENERGY_DRINKS]: '#6d3f57',
  };
  return colors[category];
};

const getCategoryLabel = (category: ProductCategory): string => {
  const labels: Record<ProductCategory, string> = {
    [ProductCategory.DISPOSABLES]: 'Одноразки',
    [ProductCategory.LIQUIDS]: 'Жидкости',
    [ProductCategory.CONSUMABLES]: 'Расходники',
    [ProductCategory.PODS]: 'Подики',
    [ProductCategory.ENERGY_DRINKS]: 'Энергетики',
  };
  return labels[category];
};

export default InventoryPage;