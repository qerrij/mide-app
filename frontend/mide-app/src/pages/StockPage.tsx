import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tabs,
  Tab,
  TextField,
  Checkbox,
  FormControlLabel,
  Autocomplete,
} from '@mui/material';
import {
  Inventory,
  Warning,
  LocationOn,
  Person,
  Group,
  Store,
  FilterList,
  Search,
  ExpandMore,
  ExpandLess,
  PhotoCamera,
  Visibility,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

export enum ProductCategory {
  DISPOSABLES = 'DISPOSABLES',
  LIQUIDS = 'LIQUIDS',
  CONSUMABLES = 'CONSUMABLES',
  PODS = 'PODS',
  ENERGY_DRINKS = 'ENERGY_DRINKS'
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
};

interface ProductStock {
  id: string;
  name: string;
  category: ProductCategory;
  totalQuantity: number;
  defectiveQuantity: number;
  availableQuantity: number;
  sellers: Array<{
    id: number;
    name: string;
    quantity: number;
    defectiveQuantity: number;
  }>;
}

interface StockView {
  type: 'all' | 'defective' | 'by-city' | 'by-seller' | 'by-group' | 'by-cluster';
  filters: {
    categories: ProductCategory[];
    search: string;
    city?: string;
    seller?: string;
    group?: string;
    cluster?: string;
  };
}

const StockPage: React.FC = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [openFilterDialog, setOpenFilterDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductStock | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedSellers, setSelectedSellers] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const mockCities = ['Москва', 'Санкт-Петербург', 'Казань', 'Екатеринбург', 'Новосибирск'];
  const mockSellers = ['Иван Иванов', 'Петр Петров', 'Мария Козлова', 'Алексей Сидоров', 'Ольга Смирнова'];
  const mockGroups = ['Группа А', 'Группа Б', 'Группа В', 'Группа Г'];
  const mockClusters = ['Куст Север', 'Куст Юг', 'Куст Запад', 'Куст Восток'];

  const mockProducts: ProductStock[] = [
    {
      id: '1',
      name: 'HQD Crystal Bar',
      category: ProductCategory.DISPOSABLES,
      totalQuantity: 156,
      defectiveQuantity: 5,
      availableQuantity: 151,
      sellers: [
        { id: 1, name: 'Иван Иванов', quantity: 50, defectiveQuantity: 2 },
        { id: 2, name: 'Петр Петров', quantity: 45, defectiveQuantity: 1 },
        { id: 3, name: 'Мария Козлова', quantity: 61, defectiveQuantity: 2 },
      ],
    },
    {
      id: '2',
      name: 'Elf Bar 600',
      category: ProductCategory.DISPOSABLES,
      totalQuantity: 89,
      defectiveQuantity: 3,
      availableQuantity: 86,
      sellers: [
        { id: 1, name: 'Иван Иванов', quantity: 30, defectiveQuantity: 1 },
        { id: 4, name: 'Алексей Сидоров', quantity: 59, defectiveQuantity: 2 },
      ],
    },
    {
      id: '3',
      name: 'Juicy Bar 30ml',
      category: ProductCategory.LIQUIDS,
      totalQuantity: 234,
      defectiveQuantity: 12,
      availableQuantity: 222,
      sellers: [
        { id: 2, name: 'Петр Петров', quantity: 100, defectiveQuantity: 5 },
        { id: 3, name: 'Мария Козлова', quantity: 80, defectiveQuantity: 4 },
        { id: 5, name: 'Ольга Смирнова', quantity: 54, defectiveQuantity: 3 },
      ],
    },
    {
      id: '4',
      name: 'Pod System X',
      category: ProductCategory.PODS,
      totalQuantity: 45,
      defectiveQuantity: 2,
      availableQuantity: 43,
      sellers: [
        { id: 4, name: 'Алексей Сидоров', quantity: 25, defectiveQuantity: 1 },
        { id: 5, name: 'Ольга Смирнова', quantity: 20, defectiveQuantity: 1 },
      ],
    },
    {
      id: '5',
      name: 'Energy Drink 250ml',
      category: ProductCategory.ENERGY_DRINKS,
      totalQuantity: 178,
      defectiveQuantity: 8,
      availableQuantity: 170,
      sellers: [
        { id: 1, name: 'Иван Иванов', quantity: 60, defectiveQuantity: 3 },
        { id: 2, name: 'Петр Петров', quantity: 48, defectiveQuantity: 2 },
        { id: 3, name: 'Мария Козлова', quantity: 40, defectiveQuantity: 2 },
        { id: 4, name: 'Алексей Сидоров', quantity: 30, defectiveQuantity: 1 },
      ],
    },
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const toggleProductExpand = (productId: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
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

  const getCategoryLabel = (category: ProductCategory): string => {
    const labels = {
      [ProductCategory.DISPOSABLES]: 'Одноразки',
      [ProductCategory.LIQUIDS]: 'Жидкости',
      [ProductCategory.CONSUMABLES]: 'Расходники',
      [ProductCategory.PODS]: 'Подики',
      [ProductCategory.ENERGY_DRINKS]: 'Энергетики',
    };
    return labels[category];
  };

  const filteredProducts = mockProducts.filter(product => {
    if (selectedCategory !== 'all' && product.category !== selectedCategory) return false;
    if (searchQuery && !product.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getTotalStats = () => {
    return filteredProducts.reduce((acc, product) => ({
      total: acc.total + product.totalQuantity,
      defective: acc.defective + product.defectiveQuantity,
      available: acc.available + product.availableQuantity,
    }), { total: 0, defective: 0, available: 0 });
  };

  const stats = getTotalStats();

  const renderProductCard = (product: ProductStock) => (
    <Card key={product.id} sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Chip
                label={getCategoryLabel(product.category)}
                size="small"
                sx={{
                  backgroundColor: `${getCategoryColor(product.category)}15`,
                  color: getCategoryColor(product.category),
                  border: `1px solid ${getCategoryColor(product.category)}30`,
                }}
              />
              <Typography variant="h6" sx={{ color: '#2a0f35' }}>
                {product.name}
              </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, sm: 4 }}>
                <Paper sx={{ p: 1.5, backgroundColor: '#674fb610', border: '1px solid #674fb630' }}>
                  <Typography variant="body2" color="#4c5454">Всего</Typography>
                  <Typography variant="h6" color="#674fb6">{product.totalQuantity}</Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <Paper sx={{ p: 1.5, backgroundColor: '#ca0ec010', border: '1px solid #ca0ec030' }}>
                  <Typography variant="body2" color="#4c5454">Брак</Typography>
                  <Typography variant="h6" color="#ca0ec0">{product.defectiveQuantity}</Typography>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Paper sx={{ p: 1.5, backgroundColor: '#3f1f4b10', border: '1px solid #3f1f4b30' }}>
                  <Typography variant="body2" color="#4c5454">Доступно</Typography>
                  <Typography variant="h6" color="#3f1f4b">{product.availableQuantity}</Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>
          <IconButton onClick={() => toggleProductExpand(product.id)}>
            {expandedProducts.has(product.id) ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>

        {expandedProducts.has(product.id) && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ color: '#2a0f35', mb: 1 }}>
              Распределение по продавцам:
            </Typography>
            <List dense>
              {product.sellers.map((seller) => (
                <ListItem key={seller.id} sx={{ px: 0 }}>
                  <ListItemIcon>
                    <Person sx={{ color: '#56b8d1', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={seller.name}
                    secondary={`Всего: ${seller.quantity} • Брак: ${seller.defectiveQuantity} • Доступно: ${seller.quantity - seller.defectiveQuantity}`}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderDefectiveProducts = () => {
    const defectiveProducts = mockProducts.filter(p => p.defectiveQuantity > 0);
    return defectiveProducts.map(product => (
      <Card key={product.id} sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ color: '#2a0f35', fontWeight: 600 }}>
                {product.name}
              </Typography>
              <Chip
                label={getCategoryLabel(product.category)}
                size="small"
                sx={{
                  backgroundColor: `${getCategoryColor(product.category)}15`,
                  color: getCategoryColor(product.category),
                  mt: 0.5,
                }}
              />
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h5" color="#ca0ec0">
                {product.defectiveQuantity} шт.
              </Typography>
              <Typography variant="body2" color="#4c5454">
                бракованных
              </Typography>
            </Box>
          </Box>
          
          <Typography variant="body2" color="#4c5454" sx={{ mb: 1 }}>
            У продавцов:
          </Typography>
          <Grid container spacing={1}>
            {product.sellers
              .filter(s => s.defectiveQuantity > 0)
              .map(seller => (
                <Grid size={{ xs: 12, sm: 6 }} key={seller.id}>
                  <Paper sx={{ p: 1, backgroundColor: '#ca0ec010', border: '1px solid #ca0ec030' }}>
                    <Typography variant="body2" sx={{ color: '#2a0f35' }}>
                      {seller.name}
                    </Typography>
                    <Typography variant="body2" color="#ca0ec0">
                      Брак: {seller.defectiveQuantity} шт.
                    </Typography>
                  </Paper>
                </Grid>
              ))}
          </Grid>
        </CardContent>
      </Card>
    ));
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, px: { xs: 1, sm: 2 } }}>
      <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Typography variant="h4" component="h1" color="#2a0f35">
            📦 Остатки товаров
          </Typography>
          <Typography variant="body1" color="#4c5454">
            Управление и контроль товарных остатков
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: { md: 'right' } }}>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setOpenFilterDialog(true)}
            sx={{
              borderColor: '#56b8d1',
              color: '#56b8d1',
              mr: 2,
            }}
          >
            Фильтры
          </Button>
        </Grid>
      </Grid>

      {/* Общая статистика */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#674fb610', border: '1px solid #674fb630' }}>
            <Typography variant="h4" color="#674fb6">{stats.total}</Typography>
            <Typography variant="body2" color="#4c5454">Всего товаров</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#ca0ec010', border: '1px solid #ca0ec030' }}>
            <Typography variant="h4" color="#ca0ec0">{stats.defective}</Typography>
            <Typography variant="body2" color="#4c5454">Бракованных</Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#3f1f4b10', border: '1px solid #3f1f4b30' }}>
            <Typography variant="h4" color="#3f1f4b">{stats.available}</Typography>
            <Typography variant="body2" color="#4c5454">Доступно для продажи</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Табы */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
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
          <Tab icon={<Inventory />} iconPosition="start" label="Остатки товаров" />
          <Tab icon={<Warning />} iconPosition="start" label="Бракованный товар" />
          <Tab icon={<LocationOn />} iconPosition="start" label="По городам" />
          <Tab icon={<Person />} iconPosition="start" label="По отчеткам" />
          <Tab icon={<Group />} iconPosition="start" label="По группам" />
          <Tab icon={<Store />} iconPosition="start" label="По кустам" />
        </Tabs>

        {/* Панель поиска и фильтров */}
        <Box sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Поиск товаров..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ color: '#4c5454', mr: 1 }} />,
            }}
            sx={{ flex: 1, minWidth: 200 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Категория</InputLabel>
            <Select
              value={selectedCategory}
              label="Категория"
              onChange={(e) => setSelectedCategory(e.target.value as ProductCategory | 'all')}
            >
              <MenuItem value="all">Все категории</MenuItem>
              {Object.values(ProductCategory).map((category) => (
                <MenuItem key={category} value={category}>
                  {getCategoryLabel(category)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Контент табов */}
        <TabPanel value={tabValue} index={0}>
          {filteredProducts.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Inventory sx={{ fontSize: 60, color: '#d7d2d8', mb: 2 }} />
              <Typography variant="h6" color="#4c5454">
                Товары не найдены
              </Typography>
              <Typography variant="body2" color="#8a8a8a">
                Попробуйте изменить параметры поиска
              </Typography>
            </Box>
          ) : (
            filteredProducts.map(renderProductCard)
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {renderDefectiveProducts()}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <LocationOn sx={{ fontSize: 60, color: '#56b8d1', mb: 2 }} />
            <Typography variant="h6" color="#2a0f35">
              Остатки по городам
            </Typography>
            <Typography variant="body2" color="#4c5454" sx={{ mt: 1 }}>
              Выберите город для просмотра остатков
            </Typography>
            <FormControl fullWidth sx={{ mt: 3, maxWidth: 300, mx: 'auto' }}>
              <InputLabel>Город</InputLabel>
              <Select label="Город">
                {mockCities.map((city) => (
                  <MenuItem key={city} value={city}>
                    {city}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Person sx={{ fontSize: 60, color: '#3f1f4b', mb: 2 }} />
            <Typography variant="h6" color="#2a0f35">
              Остатки по отчеткам
            </Typography>
            <Typography variant="body2" color="#4c5454" sx={{ mt: 1 }}>
              Выберите продавца для просмотра остатков
            </Typography>
            <FormControl fullWidth sx={{ mt: 3, maxWidth: 300, mx: 'auto' }}>
              <InputLabel>Продавец</InputLabel>
              <Select label="Продавец">
                {mockSellers.map((seller) => (
                  <MenuItem key={seller} value={seller}>
                    {seller}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Group sx={{ fontSize: 60, color: '#2a436d', mb: 2 }} />
            <Typography variant="h6" color="#2a0f35">
              Остатки по группам
            </Typography>
            <Typography variant="body2" color="#4c5454" sx={{ mt: 1 }}>
              Выберите группу для просмотра остатков
            </Typography>
            <FormControl fullWidth sx={{ mt: 3, maxWidth: 300, mx: 'auto' }}>
              <InputLabel>Группа</InputLabel>
              <Select label="Группа">
                {mockGroups.map((group) => (
                  <MenuItem key={group} value={group}>
                    {group}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={5}>
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Store sx={{ fontSize: 60, color: '#6d3f57', mb: 2 }} />
            <Typography variant="h6" color="#2a0f35">
              Остатки по кустам
            </Typography>
            <Typography variant="body2" color="#4c5454" sx={{ mt: 1 }}>
              Выберите куст для просмотра остатков
            </Typography>
            <FormControl fullWidth sx={{ mt: 3, maxWidth: 300, mx: 'auto' }}>
              <InputLabel>Куст</InputLabel>
              <Select label="Куст">
                {mockClusters.map((cluster) => (
                  <MenuItem key={cluster} value={cluster}>
                    {cluster}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </TabPanel>
      </Paper>

      {/* Диалог фильтров */}
      <Dialog
        open={openFilterDialog}
        onClose={() => setOpenFilterDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: '#f5f3f6', color: '#2a0f35' }}>
          ⚙️ Фильтры остатков
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" sx={{ color: '#2a0f35', mb: 1 }}>
                Категории товаров
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Object.values(ProductCategory).map((category) => (
                  <Chip
                    key={category}
                    label={getCategoryLabel(category)}
                    onClick={() => setSelectedCategory(
                      selectedCategory === category ? 'all' : category
                    )}
                    color={selectedCategory === category ? 'primary' : 'default'}
                    sx={{
                      backgroundColor: selectedCategory === category 
                        ? `${getCategoryColor(category)}15`
                        : '#f5f5f5',
                      color: selectedCategory === category 
                        ? getCategoryColor(category)
                        : '#4c5454',
                      border: `1px solid ${selectedCategory === category 
                        ? getCategoryColor(category)
                        : '#e0e0e0'
                      }`,
                    }}
                  />
                ))}
              </Box>
            </Grid>

            {(user?.role === UserRole.OWNER || user?.role === UserRole.ADMIN) && (
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" sx={{ color: '#2a0f35', mb: 1 }}>
                  Города
                </Typography>
                <Autocomplete
                  multiple
                  size="small"
                  options={mockCities}
                  value={selectedCities}
                  onChange={(event, newValue) => setSelectedCities(newValue)}
                  renderInput={(params) => (
                    <TextField {...params} placeholder="Выберите города" />
                  )}
                />
              </Grid>
            )}

            {(user?.role === UserRole.OWNER || user?.role === UserRole.ADMIN || 
              user?.role === UserRole.SENIOR_SELLER) && (
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle2" sx={{ color: '#2a0f35', mb: 1 }}>
                  Продавцы
                </Typography>
                <Autocomplete
                  multiple
                  size="small"
                  options={mockSellers}
                  value={selectedSellers}
                  onChange={(event, newValue) => setSelectedSellers(newValue)}
                  renderInput={(params) => (
                    <TextField {...params} placeholder="Выберите продавцов" />
                  )}
                />
              </Grid>
            )}

            {(user?.role === UserRole.OWNER || user?.role === UserRole.ADMIN || 
              user?.role === UserRole.SENIOR_SELLER || user?.role === UserRole.MENTOR) && (
              <>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" sx={{ color: '#2a0f35', mb: 1 }}>
                    Группы
                  </Typography>
                  <Autocomplete
                    multiple
                    size="small"
                    options={mockGroups}
                    value={selectedGroups}
                    onChange={(event, newValue) => setSelectedGroups(newValue)}
                    renderInput={(params) => (
                      <TextField {...params} placeholder="Выберите группы" />
                    )}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" sx={{ color: '#2a0f35', mb: 1 }}>
                    Кусты
                  </Typography>
                  <Autocomplete
                    multiple
                    size="small"
                    options={mockClusters}
                    value={selectedClusters}
                    onChange={(event, newValue) => setSelectedClusters(newValue)}
                    renderInput={(params) => (
                      <TextField {...params} placeholder="Выберите кусты" />
                    )}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => {
              setSelectedCategory('all');
              setSelectedCities([]);
              setSelectedSellers([]);
              setSelectedGroups([]);
              setSelectedClusters([]);
              setSearchQuery('');
            }}
            sx={{ color: '#ca0ec0' }}
          >
            Сбросить все
          </Button>
          <Button
            onClick={() => setOpenFilterDialog(false)}
            variant="contained"
            sx={{
              backgroundColor: '#674fb6',
              color: 'white',
              '&:hover': {
                backgroundColor: '#483399',
              },
            }}
          >
            Применить фильтры
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StockPage;