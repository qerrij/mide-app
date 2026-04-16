import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  CircularProgress,
  Alert,
  Snackbar,
  InputAdornment,
  Badge,
  alpha,
  useTheme,
  useMediaQuery,
  Skeleton,
  Divider,
  Tooltip,
  Collapse,
  Zoom,
  Fade,
  Stack,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  FormHelperText,
  Pagination,
  FormControlLabel,
  Switch,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Inventory as InventoryIcon,
  Category as CategoryIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Close as CloseIcon,
  PriceChange as PriceIcon,
  Numbers as QuantityIcon,
  Description as ReportIcon,
  SwapHoriz as TransferIcon,
  Error as RejectionIcon,
  Assignment as RevisionIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { productService } from '../api/productService';
import { inventoryService } from '../api/inventoryService';
import { cityService, City } from '../api/cityService';
import { Product, ProductCategory, UserRole, InventoryItem, ProductReservationsResponse, User } from '../types';

// iOS стили
const iOSStyles = {
  paper: {
    borderRadius: 8,
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  card: {
    borderRadius: 8,
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
    transition: 'transform 0.15s, box-shadow 0.15s',
    '&:hover': {
      transform: 'translateY(-1px)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    },
  },
  chip: {
    borderRadius: 4,
    height: 24,
    fontWeight: 500,
    fontSize: '0.75rem',
  },
  button: {
    borderRadius: 6,
    textTransform: 'none',
    fontWeight: 600,
    padding: '6px 12px',
  },
  dialog: {
    borderRadius: 4,
    '& .MuiDialog-paper': {
      borderRadius: 4,
      padding: 0,
    },
  },
  input: {
    borderRadius: 4,
    '& .MuiOutlinedInput-root': {
      borderRadius: 4,
    },
  },
  tableHeader: {
    fontWeight: 600,
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #e9ecef',
  },
};

// Компонент модалки с деталями резервов
interface ReservationDetailsModalProps {
  open: boolean;
  onClose: () => void;
  reservations: ProductReservationsResponse[];
  productName: string;
  productSku: string;
  totalReserved: number;
  loading?: boolean;
}

const ReservationDetailsModal: React.FC<ReservationDetailsModalProps> = ({
  open,
  onClose,
  reservations,
  productName,
  totalReserved,
  loading = false,
}) => {
  const theme = useTheme();

  const getReservationIcon = (type: string) => {
    switch (type) {
      case 'report':
        return <ReportIcon sx={{ color: '#4caf50' }} />;
      case 'transfer':
        return <TransferIcon sx={{ color: '#2196f3' }} />;
      case 'rejection':
        return <RejectionIcon sx={{ color: '#f44336' }} />;
      case 'revision':
        return <RevisionIcon sx={{ color: '#ff9800' }} />;
      default:
        return <QuantityIcon />;
    }
  };

  const getReservationColor = (type: string) => {
    switch (type) {
      case 'report':
        return '#4caf50';
      case 'transfer':
        return '#2196f3';
      case 'rejection':
        return '#f44336';
      case 'revision':
        return '#ff9800';
      default:
        return '#9e9e9e';
    }
  };

  const summary = reservations.reduce((acc, res) => {
    const type = res.reservationType;
    if (!acc[type]) {
      acc[type] = {
        count: 0,
        quantity: 0,
        displayName: res.reservationTypeDisplay,
      };
    }
    acc[type].count += 1;
    acc[type].quantity += res.quantity;
    return acc;
  }, {} as Record<string, { count: number; quantity: number; displayName: string }>);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle sx={{ 
        p: 2.5, 
        pb: 2,
        backgroundColor: alpha(theme.palette.primary.main, 0.02),
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h6" fontWeight={600} color="#2a0f35" sx={{ mb: 1 }}>
              Детали резервов
            </Typography>
            <Chip
              label={productName}
              sx={{
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                fontWeight: 600,
                fontSize: '0.95rem',
                height: 32,
                '& .MuiChip-label': {
                  px: 2,
                },
              }}
            />
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ mt: -0.5, mr: -0.5 }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5, pt: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mt: 3,
                mb: 3,
                backgroundColor: alpha(theme.palette.primary.main, 0.03),
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={600} color="#2a0f35">
                  Всего зарезервировано
                </Typography>
                <Chip
                  label={`${totalReserved} шт.`}
                  size="small"
                  sx={{
                    borderRadius: 4,
                    backgroundColor: theme.palette.warning.main,
                    color: 'white',
                    fontWeight: 600,
                    height: 24,
                    '& .MuiChip-label': {
                      px: 1.5,
                    },
                  }}
                />
              </Box>
              
              <Divider sx={{ my: 1.5 }} />
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {Object.entries(summary).map(([type, data]) => (
                  <Box key={type} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {getReservationIcon(type)}
                      </Box>
                      <Typography variant="body2" color="#4c5454">
                        {data.displayName}
                      </Typography>
                      <Chip
                        label={data.count}
                        size="small"
                        sx={{
                          borderRadius: 4,
                          height: 20,
                          fontSize: '0.7rem',
                          backgroundColor: alpha(getReservationColor(type), 0.1),
                          color: getReservationColor(type),
                          '& .MuiChip-label': {
                            px: 1,
                          },
                        }}
                      />
                    </Box>
                    <Typography variant="body2" fontWeight={600}>
                      {data.quantity} шт.
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Paper>

            <Typography variant="subtitle2" fontWeight={600} color="#2a0f35" sx={{ mb: 2 }}>
              Детальный список
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {reservations.map((reservation) => (
                <Paper
                  key={reservation.id}
                  elevation={0}
                  sx={{
                    p: 2,
                    backgroundColor: alpha(getReservationColor(reservation.reservationType), 0.02),
                    borderRadius: 2,
                    border: `1px solid ${alpha(getReservationColor(reservation.reservationType), 0.2)}`,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                        backgroundColor: alpha(getReservationColor(reservation.reservationType), 0.1),
                        color: getReservationColor(reservation.reservationType),
                      }}
                    >
                      {getReservationIcon(reservation.reservationType)}
                    </Box>
                    
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {reservation.entityInfo || `${reservation.reservationTypeDisplay} #${reservation.reservationId}`}
                        </Typography>
                        <Chip
                          label={`${reservation.quantity} шт.`}
                          size="small"
                          sx={{
                            borderRadius: 4,
                            height: 20,
                            fontSize: '0.7rem',
                            backgroundColor: alpha(getReservationColor(reservation.reservationType), 0.1),
                            color: getReservationColor(reservation.reservationType),
                            fontWeight: 600,
                            ml: 1,
                            '& .MuiChip-label': {
                              px: 1,
                            },
                          }}
                        />
                      </Box>
                      
                      {reservation.entityDetails?.createdAt && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <CalendarIcon sx={{ fontSize: 14, color: theme.palette.text.secondary }} />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(reservation.entityDetails.createdAt).toLocaleString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Typography>
                        </Box>
                      )}
                      
                      {reservation.entityDetails?.status && (
                        <Chip
                          label={reservation.entityDetails.status}
                          size="small"
                          variant="outlined"
                          sx={{
                            borderRadius: 4,
                            height: 18,
                            fontSize: '0.65rem',
                            mt: 0.5,
                            '& .MuiChip-label': {
                              px: 1,
                            },
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>

            {reservations.length === 0 && !loading && (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  Нет активных резервов для этого товара
                </Typography>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ 
        p: 2.5, 
        pt: 2, 
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        backgroundColor: alpha(theme.palette.background.default, 0.5),
      }}>
        <Button
          onClick={onClose}
          variant="contained"
          fullWidth
          sx={{
            borderRadius: 2,
            backgroundColor: '#3f1f4b',
            '&:hover': { backgroundColor: '#2a0f35' },
            textTransform: 'none',
            py: 1,
          }}
        >
          Закрыть
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Компонент бейджей-табов
interface TabBadgeProps {
  value: number;
  onChange: (newValue: number) => void;
  tabs: Array<{
    label: string;
    icon: React.ReactNode;
    value: number;
  }>;
}

const TabBadges: React.FC<TabBadgeProps> = ({ value, onChange, tabs }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        gap: 1, 
        p: 1.5,
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        flexWrap: 'wrap',
      }}
    >
      {tabs.map((tab) => (
        <Button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          variant={value === tab.value ? 'contained' : 'outlined'}
          startIcon={tab.icon}
          sx={{
            ...iOSStyles.button,
            borderRadius: 4,
            flex: isMobile ? 1 : '0 1 auto',
            backgroundColor: value === tab.value ? theme.palette.primary.main : 'transparent',
            borderColor: value === tab.value ? 'transparent' : alpha(theme.palette.primary.main, 0.3),
            color: value === tab.value ? 'white' : theme.palette.text.primary,
            '&:hover': {
              backgroundColor: value === tab.value 
                ? theme.palette.primary.dark 
                : alpha(theme.palette.primary.main, 0.08),
            },
          }}
        >
          {tab.label}
        </Button>
      ))}
    </Box>
  );
};

// Компонент фильтров (только для владельца)
interface FilterSectionProps {
  users: { id: number; name: string; cityId?: number; cityName?: string }[];
  categories: ProductCategory[];
  products: Product[];
  cities: City[];
  filters: {
    userId: number | 'all';
    categoryId: number | 'all';
    productId: number | 'all';
    cityId: number | 'all';
  };
  onFilterChange: (filters: any) => void;
  onClearFilters: () => void;
}

const FilterSection: React.FC<FilterSectionProps> = ({
  users,
  categories,
  products,
  cities,
  filters,
  onFilterChange,
  onClearFilters,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [showFilters, setShowFilters] = useState(!isMobile);
  const [userSearch, setUserSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [isProductSearching, setIsProductSearching] = useState(false);

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    if (filters.categoryId !== 'all') {
      filtered = filtered.filter(product => product.categoryId === filters.categoryId);
    }
    
    if (productSearch) {
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        product.sku?.toLowerCase().includes(productSearch.toLowerCase())
      );
    }
    
    return filtered;
  }, [products, filters.categoryId, productSearch]);

  const handleProductChange = (productId: number | 'all') => {
    if (productId === 'all') {
      onFilterChange({ productId: 'all' });
    } else {
      const product = products.find(p => p.id === productId);
      if (product) {
        onFilterChange({ 
          productId: productId,
          categoryId: product.categoryId
        });
      }
    }
  };

  const handleCategoryChange = (categoryId: number | 'all') => {
    onFilterChange({ 
      categoryId: categoryId,
      productId: 'all'
    });
    setProductSearch('');
  };

  const activeFiltersCount = [
    filters.userId !== 'all',
    filters.categoryId !== 'all',
    filters.productId !== 'all',
    filters.cityId !== 'all',
  ].filter(Boolean).length;

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: { xs: 1.5, sm: 2 }, 
        mb: 2, 
        borderRadius: 1,
        backgroundColor: alpha(theme.palette.primary.light, 0.02),
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: showFilters ? 2 : 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterIcon sx={{ color: theme.palette.text.secondary, fontSize: 20 }} />
          <Typography variant="subtitle2" fontWeight={600}>
            Фильтры {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {activeFiltersCount > 0 && (
            <Button 
              size="small" 
              onClick={onClearFilters}
              sx={{ ...iOSStyles.button, fontSize: '0.75rem', py: 0.5 }}
            >
              Сбросить
            </Button>
          )}
          {isMobile && (
            <IconButton size="small" onClick={() => setShowFilters(!showFilters)}>
              <FilterIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      <Collapse in={showFilters}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl fullWidth size="small" sx={iOSStyles.input}>
              <InputLabel id="user-filter-label">Пользователь</InputLabel>
    <Select
      labelId="user-filter-label"
      value={filters.userId}
      label="Пользователь"
      onChange={(e) => onFilterChange({ userId: e.target.value })}
      MenuProps={{
        PaperProps: {
          sx: { borderRadius: 2, maxHeight: 400 },
        },
      }}
      sx={{
        '& .MuiSelect-select': {
          whiteSpace: 'normal',      // Разрешаем перенос текста
          wordBreak: 'break-word',   // Переносим длинные слова
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          minHeight: '40px',         // Минимальная высота для многострочного текста
          display: 'flex',
          alignItems: 'center',
        },
      }}
    >
                <MenuItem value="all">Все пользователи</MenuItem>
                <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
                  <TextField
                    size="small"
                    placeholder="Поиск пользователя..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    fullWidth
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    sx={iOSStyles.input}
                  />
                </Box>
                {filteredUsers.map(user => (
                  <MenuItem key={user.id} value={user.id}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2" fontWeight={500}>
                        {user.name}
                      </Typography>
                      {user.cityName && (
                        <Typography variant="caption" color="text.secondary">
                          {user.cityName}
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                ))}
                {filteredUsers.length === 0 && (
                  <MenuItem disabled>
                    <Typography variant="body2" color="text.secondary">
                      Пользователи не найдены
                    </Typography>
                  </MenuItem>
                )}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl fullWidth size="small" sx={iOSStyles.input}>
              <InputLabel id="city-filter-label">Город</InputLabel>
              <Select
                labelId="city-filter-label"
                value={filters.cityId}
                label="Город"
                onChange={(e) => onFilterChange({ cityId: e.target.value })}
              >
                <MenuItem value="all">Все города</MenuItem>
                {cities.map(city => (
                  <MenuItem key={city.id} value={city.id}>{city.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl fullWidth size="small" sx={iOSStyles.input}>
              <InputLabel id="category-filter-label">Категория</InputLabel>
              <Select
                labelId="category-filter-label"
                value={filters.categoryId}
                label="Категория"
                onChange={(e) => handleCategoryChange(e.target.value as number | 'all')}
              >
                <MenuItem value="all">Все категории</MenuItem>
                {categories.map(category => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 3 }}>
            <FormControl fullWidth size="small" sx={iOSStyles.input}>
              <InputLabel id="product-filter-label">Товар</InputLabel>
              <Select
                labelId="product-filter-label"
                value={filters.productId}
                label="Товар"
                onChange={(e) => handleProductChange(e.target.value as number | 'all')}
                MenuProps={{
                  PaperProps: { sx: { borderRadius: 2, maxHeight: 400 } },
                }}
              >
                <MenuItem value="all">Все товары</MenuItem>
                <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
                  <TextField
                    size="small"
                    placeholder="Поиск товара..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setIsProductSearching(true);
                    }}
                    onBlur={() => setTimeout(() => setIsProductSearching(false), 200)}
                    fullWidth
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    sx={iOSStyles.input}
                  />
                </Box>
                {filteredProducts.map(product => (
                  <MenuItem key={product.id} value={product.id}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2" fontWeight={500}>
                        {product.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {product.sku} • {product.price} ₽ • {categories.find(c => c.id === product.categoryId)?.name}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
                {filteredProducts.length === 0 && !isProductSearching && (
                  <MenuItem disabled>
                    <Typography variant="body2" color="text.secondary">
                      {filters.categoryId !== 'all' ? 'Нет товаров в этой категории' : 'Товары не найдены'}
                    </Typography>
                  </MenuItem>
                )}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Collapse>
    </Paper>
  );
};

// Компонент модалки для создания/редактирования товара (с новыми полями)
interface ProductModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (productData: {
    name: string;
    sku: string;
    categoryId: number;
    price: number;
    description?: string;
    cityId?: number | null;
    defaultRate?: number;
  }) => Promise<void>;
  categories: ProductCategory[];
  cities: City[];
  product?: Product | null;
  loading?: boolean;
}

const ProductModal: React.FC<ProductModalProps> = ({
  open,
  onClose,
  onSave,
  categories,
  cities,
  product = null,
  loading = false,
}) => {
  const theme = useTheme();
  const isEditMode = !!product;
  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    categoryId: '',
    price: '',
    description: '',
    cityId: '',
    hasCustomRate: false,
    defaultRate: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        categoryId: product.categoryId?.toString() || '',
        price: product.price?.toString() || '',
        description: product.description || '',
        cityId: product.cityId?.toString() || '',
        hasCustomRate: product.defaultRate !== undefined && product.defaultRate !== null && product.defaultRate !== 0,
        defaultRate: product.defaultRate?.toString() || '',
      });
    } else {
      setFormData({
        name: '',
        sku: '',
        categoryId: '',
        price: '',
        description: '',
        cityId: '',
        hasCustomRate: false,
        defaultRate: '',
      });
    }
    setErrors({});
  }, [product, open]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePriceChange = (value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFormData(prev => ({ ...prev, price: value }));
    }
  };

  const handleRateChange = (value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFormData(prev => ({ ...prev, defaultRate: value }));
    }
  };

  const handleHasCustomRateChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, hasCustomRate: checked }));
    if (!checked) {
      setFormData(prev => ({ ...prev, defaultRate: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Название обязательно';
    }
    if (!formData.sku.trim()) {
      newErrors.sku = 'Артикул обязателен';
    }
    if (!formData.categoryId) {
      newErrors.categoryId = 'Выберите категорию';
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Введите корректную цену';
    }
    if (formData.hasCustomRate && (!formData.defaultRate || parseFloat(formData.defaultRate) <= 0)) {
      newErrors.defaultRate = 'Введите корректную ставку';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
      if (!validate()) return;
      
      try {
          const productData: any = {
              name: formData.name.trim(),
              sku: formData.sku.trim(),
              categoryId: parseInt(formData.categoryId),
              price: parseFloat(formData.price),
          };
          
          if (formData.description.trim()) {
              productData.description = formData.description.trim();
          }
          
          productData.cityId = formData.cityId ? parseInt(formData.cityId) : null;
          
          productData.defaultRate = formData.hasCustomRate && formData.defaultRate 
              ? parseFloat(formData.defaultRate) 
              : null;
          
          await onSave(productData);
          handleClose();
      } catch (err) {
          // Обработка ошибки
      }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      sku: '',
      categoryId: '',
      price: '',
      description: '',
      cityId: '',
      hasCustomRate: false,
      defaultRate: '',
    });
    setErrors({});
    onClose();
  };

  const selectedCity = cities.find(c => c.id.toString() === formData.cityId);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(106, 61, 122, 0.15)',
        },
      }}
    >
      <DialogTitle sx={{ 
        p: { xs: 2, sm: 2.5 }, 
        pb: 1,
        backgroundColor: alpha(theme.palette.primary.main, 0.02),
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h6" fontWeight={600} color="#2a0f35" sx={{ mb: 0.5, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              {isEditMode ? 'Редактировать товар' : 'Создать новый товар'}
            </Typography>
            <Typography variant="body2" color="#4c5454" sx={{ fontSize: { xs: '0.8rem', sm: '0.85rem' } }}>
              {isEditMode ? 'Измените информацию о товаре' : 'Добавьте товар в систему'}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small" sx={{ mt: -0.5, mr: -0.5 }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 2, sm: 2.5 }, pt: { xs: 1, sm: 2 } }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="caption" color="#2a0f35" display="block" gutterBottom sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.75rem' }, mb: 0.5 }}>
              НАЗВАНИЕ ТОВАРА
            </Typography>
            <TextField
              fullWidth
              required
              size="small"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
              placeholder="Введите название товара"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  backgroundColor: '#ffffff',
                  '& fieldset': {
                    borderColor: '#e0e0e0',
                    borderWidth: 1.5,
                  },
                  '&:hover fieldset': {
                    borderColor: '#9c7cae',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#3f1f4b',
                  },
                },
              }}
            />
          </Box>

          <Box>
            <Typography variant="caption" color="#2a0f35" display="block" gutterBottom sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.75rem' }, mb: 0.5 }}>
              АРТИКУЛ (SKU)
            </Typography>
            <TextField
              fullWidth
              required
              size="small"
              value={formData.sku}
              onChange={(e) => handleChange('sku', e.target.value)}
              error={!!errors.sku}
              helperText={errors.sku}
              placeholder="Например: ART-12345"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  backgroundColor: '#ffffff',
                  '& fieldset': {
                    borderColor: '#e0e0e0',
                    borderWidth: 1.5,
                  },
                  '&:hover fieldset': {
                    borderColor: '#9c7cae',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#3f1f4b',
                  },
                },
              }}
            />
          </Box>

          <Box>
            <Typography variant="caption" color="#2a0f35" display="block" gutterBottom sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.75rem' }, mb: 0.5 }}>
              КАТЕГОРИЯ
            </Typography>
            <FormControl fullWidth required size="small" error={!!errors.categoryId}>
              <Select
                value={formData.categoryId}
                onChange={(e) => handleChange('categoryId', e.target.value)}
                displayEmpty
                sx={{
                  borderRadius: 2,
                  backgroundColor: '#ffffff',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#e0e0e0',
                    borderWidth: 1.5,
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#9c7cae',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#3f1f4b',
                  },
                }}
              >
                <MenuItem value="" disabled>Выберите категорию</MenuItem>
                {categories.map(category => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
              {errors.categoryId && (
                <FormHelperText>{errors.categoryId}</FormHelperText>
              )}
            </FormControl>
          </Box>

          <Box>
            <Typography variant="caption" color="#2a0f35" display="block" gutterBottom sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.75rem' }, mb: 0.5 }}>
              ГОРОД
            </Typography>
            <Autocomplete
              options={cities}
              getOptionLabel={(option) => option.name}
              value={selectedCity || null}
              onChange={(_, newValue) => {
                handleChange('cityId', newValue ? newValue.id.toString() : '');
              }}
              isOptionEqualToValue={(option, value) => option.id === value?.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  placeholder="Выберите город"
                  helperText="Если не выбрать город, товар будет доступен во всех городах"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: '#ffffff',
                      '& fieldset': {
                        borderColor: '#e0e0e0',
                        borderWidth: 1.5,
                      },
                      '&:hover fieldset': {
                        borderColor: '#9c7cae',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#3f1f4b',
                      },
                    },
                  }}
                />
              )}
            />
          </Box>

          <Box>
            <Typography variant="caption" color="#2a0f35" display="block" gutterBottom sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.75rem' }, mb: 0.5 }}>
              ЦЕНА
            </Typography>
            <TextField
              type="text"
              fullWidth
              required
              size="small"
              value={formData.price}
              onChange={(e) => handlePriceChange(e.target.value)}
              error={!!errors.price}
              helperText={errors.price}
              placeholder="0.00"
              InputProps={{
                startAdornment: <InputAdornment position="start">₽</InputAdornment>,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  backgroundColor: '#ffffff',
                  '& fieldset': {
                    borderColor: '#e0e0e0',
                    borderWidth: 1.5,
                  },
                  '&:hover fieldset': {
                    borderColor: '#9c7cae',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#3f1f4b',
                  },
                },
              }}
            />
          </Box>

          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.hasCustomRate}
                  onChange={(e) => handleHasCustomRateChange(e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#3f1f4b',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#3f1f4b',
                    },
                  }}
                />
              }
              label={
                <Typography variant="body2" fontWeight={500}>
                  Задать свою ставку для этого товара
                </Typography>
              }
            />
            {formData.hasCustomRate && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="#2a0f35" display="block" gutterBottom sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.75rem' }, mb: 0.5 }}>
                  СТАВКА
                </Typography>
                <TextField
                  type="text"
                  fullWidth
                  required
                  size="small"
                  value={formData.defaultRate}
                  onChange={(e) => handleRateChange(e.target.value)}
                  error={!!errors.defaultRate}
                  helperText={errors.defaultRate}
                  placeholder="0.00"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: '#ffffff',
                      '& fieldset': {
                        borderColor: '#e0e0e0',
                        borderWidth: 1.5,
                      },
                      '&:hover fieldset': {
                        borderColor: '#9c7cae',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#3f1f4b',
                      },
                    },
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Эта ставка будет использоваться для расчета зарплаты продавцов
                </Typography>
              </Box>
            )}
          </Box>

          <Box>
            <Typography variant="caption" color="#2a0f35" display="block" gutterBottom sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.75rem' }, mb: 0.5 }}>
              ОПИСАНИЕ
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              size="small"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Введите описание товара (необязательно)"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  backgroundColor: '#ffffff',
                  '& fieldset': {
                    borderColor: '#e0e0e0',
                    borderWidth: 1.5,
                  },
                  '&:hover fieldset': {
                    borderColor: '#9c7cae',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#3f1f4b',
                  },
                },
              }}
            />
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ 
        p: { xs: 2, sm: 2.5 }, 
        pt: 1, 
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        backgroundColor: alpha(theme.palette.background.default, 0.5),
        gap: 1.5,
      }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          fullWidth
          sx={{
            borderRadius: 2,
            borderColor: '#e0e0e0',
            borderWidth: 1.5,
            backgroundColor: '#f8f7fa',
            color: '#4c5454',
            py: 1,
            textTransform: 'none',
            fontSize: { xs: '0.85rem', sm: '0.95rem' },
            fontWeight: 500,
            '&:hover': {
              backgroundColor: '#f0eef2',
              borderColor: '#9c7cae',
            },
          }}
        >
          Отмена
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          fullWidth
          disabled={loading}
          sx={{
            borderRadius: 2,
            backgroundColor: '#3f1f4b',
            color: 'white',
            py: 1,
            textTransform: 'none',
            fontSize: { xs: '0.85rem', sm: '0.95rem' },
            fontWeight: 500,
            '&:hover': { backgroundColor: '#2a0f35' },
            '&.Mui-disabled': {
              backgroundColor: '#e0e0e0',
              color: '#9e9e9e',
            },
          }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : (isEditMode ? 'Сохранить' : 'Создать товар')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Компонент сортировки
interface SortSectionProps {
  sortBy: 'price' | 'quantity';
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: 'price' | 'quantity') => void;
}

const SortSection: React.FC<SortSectionProps> = ({ sortBy, sortOrder, onSortChange }) => {
  const theme = useTheme();

  const sortOptions = [
    { value: 'price', label: 'Цене', icon: <PriceIcon fontSize="small" /> },
    { value: 'quantity', label: 'Количеству', icon: <QuantityIcon fontSize="small" /> },
  ] as const;

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1, 
        mb: 2,
        flexWrap: 'wrap',
      }}
    >
      <SortIcon sx={{ color: theme.palette.text.secondary, fontSize: 20 }} />
      <Typography variant="subtitle2" color="text.secondary">
        Сортировать по:
      </Typography>
      {sortOptions.map((option) => (
        <Button
          key={option.value}
          size="small"
          variant={sortBy === option.value ? 'contained' : 'outlined'}
          onClick={() => onSortChange(option.value)}
          endIcon={
            sortBy === option.value && (
              sortOrder === 'asc' ? <ArrowUpIcon fontSize="small" /> : <ArrowDownIcon fontSize="small" />
            )
          }
          sx={{
            ...iOSStyles.button,
            borderRadius: 4,
            py: 0.5,
            px: 1.5,
            fontSize: '0.75rem',
            backgroundColor: sortBy === option.value ? theme.palette.primary.main : 'transparent',
            borderColor: sortBy === option.value ? 'transparent' : alpha(theme.palette.primary.main, 0.3),
          }}
        >
          {option.label}
        </Button>
      ))}
    </Box>
  );
};

// Компонент таблицы инвентаря
interface InventoryTableProps {
  items: InventoryItem[];
  products: Product[];
  categories: ProductCategory[];
  cities: City[];
  loading: boolean;
  getCategoryName: (categoryId: number) => string;
  getCityName: (cityId?: number) => string;
  onReservedClick: (item: InventoryItem) => void;
  onEditClick: (item: InventoryItem) => void;
  page: number;
  rowsPerPage: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  isOwner: boolean;
}

const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  products,
  categories,
  cities,
  loading,
  getCategoryName,
  getCityName,
  onReservedClick,
  onEditClick,
  page,
  rowsPerPage,
  totalCount,
  onPageChange,
  isOwner,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (loading && items.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton 
            key={i} 
            variant="rectangular" 
            height={48} 
            sx={{ borderRadius: 1, mb: 1 }} 
          />
        ))}
      </Box>
    );
  }

  if (items.length === 0) {
    return (
      <Zoom in={true}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 4, 
            textAlign: 'center',
            borderRadius: 1,
            backgroundColor: alpha(theme.palette.primary.light, 0.02),
            border: `1px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          <InventoryIcon sx={{ fontSize: 48, color: alpha(theme.palette.primary.main, 0.2), mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Нет товаров в инвентаре
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isOwner ? 'Используйте кнопку "Пополнить" чтобы добавить товары' : 'Нет доступных товаров'}
          </Typography>
        </Paper>
      </Zoom>
    );
  }

  if (isMobile) {
    return (
      <>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {items.map((item) => {
            const product = products.find(p => p.id === item.productId);
            return (
              <Fade in={true} key={`${item.productId}-${item.userId}`}>
                <Card sx={{ 
                  ...iOSStyles.card, 
                  p: 1.5,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  border: '1px solid rgba(0, 0, 0, 0.05)',
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600} fontSize="0.95rem">
                        {product?.name || 'Неизвестно'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        SKU: {product?.sku || 'N/A'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Chip
                        label={product ? getCategoryName(product.categoryId) : 'Без категории'}
                        size="small"
                        sx={{ 
                          ...iOSStyles.chip, 
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.primary.main,
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          height: 20,
                        }}
                      />
                    </Box>
                  </Box>
                  
                  <Divider sx={{ my: 1 }} />
                  
                  <Grid container spacing={1}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Количество
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body1" fontWeight={700} color={item.quantity > 0 ? 'primary' : 'text.secondary'}>
                          {item.quantity} шт.
                        </Typography>
                        {/* Кнопка редактирования только для OWNER */}
                        {isOwner && (
                          <IconButton
                            size="small"
                            onClick={() => onEditClick(item)}
                            sx={{
                              backgroundColor: alpha(theme.palette.primary.main, 0.1),
                              '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.2) },
                              width: 28,
                              height: 28,
                            }}
                          >
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        )}
                      </Box>
                      {item.reservedQuantity > 0 && (
                        <Box sx={{ mt: 0.5 }}>
                          <Chip
                            label={`${item.reservedQuantity} в резерве`}
                            size="small"
                            onClick={() => onReservedClick(item)}
                            sx={{
                              height: 22,
                              borderRadius: 4,
                              backgroundColor: alpha(theme.palette.warning.main, 0.1),
                              color: theme.palette.warning.main,
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s',
                              '& .MuiChip-label': {
                                px: 1,
                              },
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.warning.main, 0.2),
                              },
                            }}
                          />
                        </Box>
                      )}
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Цена
                      </Typography>
                      <Typography variant="body1" fontWeight={700} color="success.main">
                        {product?.price ? `${product.price.toLocaleString()} ₽` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Ответственный
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PersonIcon sx={{ fontSize: 14, color: theme.palette.text.secondary }} />
                          <Typography variant="body2" fontWeight={500}>
                            {item.userName || `Пользователь #${item.userId}`}
                          </Typography>
                        </Box>
                        {item.userCityId && (
                          <Chip
                            icon={<LocationIcon sx={{ fontSize: 12 }} />}
                            label={getCityName(item.userCityId)}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              backgroundColor: alpha(theme.palette.info.main, 0.1),
                            }}
                          />
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </Card>
              </Fade>
            );
          })}
        </Box>
        
        {/* Пагинация */}
        {totalCount > rowsPerPage && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              count={Math.ceil(totalCount / rowsPerPage)}
              page={page + 1}
              onChange={(_, newPage) => onPageChange(newPage - 1)}
              color="primary"
              size={isMobile ? "small" : "medium"}
              sx={{
                '& .MuiPaginationItem-root': {
                  borderRadius: 2,
                },
              }}
            />
          </Box>
        )}
      </>
    );
  }

  return (
    <>
      <TableContainer 
        component={Paper} 
        elevation={0}
        sx={{ 
          borderRadius: 1,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          overflow: 'auto',
          maxHeight: 'calc(100vh - 400px)',
        }}
      >
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={iOSStyles.tableHeader}>Товар</TableCell>
              <TableCell sx={iOSStyles.tableHeader}>SKU</TableCell>
              <TableCell sx={iOSStyles.tableHeader}>Категория</TableCell>
              <TableCell sx={iOSStyles.tableHeader}>Количество</TableCell>
              <TableCell sx={iOSStyles.tableHeader}>Ответственный</TableCell>
              <TableCell sx={iOSStyles.tableHeader}>Город</TableCell>
              <TableCell sx={iOSStyles.tableHeader}>Цена</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => {
              const product = products.find(p => p.id === item.productId);
              return (
                <TableRow 
                  key={`${item.productId}-${item.userId}`} 
                  hover
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {product?.name || 'Неизвестно'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={product?.sku || 'N/A'} 
                      size="small" 
                      variant="outlined"
                      sx={{ ...iOSStyles.chip, borderRadius: 4 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={product ? getCategoryName(product.categoryId) : 'Без категории'} 
                      size="small" 
                      sx={{ 
                        ...iOSStyles.chip, 
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main,
                        fontWeight: 500,
                        borderRadius: 4,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight="bold" color="primary">
                        {item.quantity} шт.
                      </Typography>
                      {/* Кнопка редактирования только для OWNER */}
                      {isOwner && (
                        <Tooltip title="Редактировать остатки">
                          <IconButton
                            size="small"
                            onClick={() => onEditClick(item)}
                            sx={{
                              backgroundColor: alpha(theme.palette.primary.main, 0.1),
                              '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.2) },
                              width: 28,
                              height: 28,
                            }}
                          >
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                    {item.reservedQuantity > 0 && (
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          label={`${item.reservedQuantity} в резерве`}
                          size="small"
                          onClick={() => onReservedClick(item)}
                          sx={{
                            height: 22,
                            borderRadius: 4,
                            backgroundColor: alpha(theme.palette.warning.main, 0.1),
                            color: theme.palette.warning.main,
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            '& .MuiChip-label': {
                              px: 1,
                            },
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.warning.main, 0.2),
                            },
                          }}
                        />
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PersonIcon sx={{ fontSize: 14, color: theme.palette.text.secondary }} />
                      <Typography variant="body2">
                        {item.userName || `Пользователь #${item.userId}`}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {item.userCityId ? (
                      <Chip
                        icon={<LocationIcon sx={{ fontSize: 14 }} />}
                        label={getCityName(item.userCityId)}
                        size="small"
                        sx={{
                          height: 24,
                          backgroundColor: alpha(theme.palette.info.main, 0.1),
                          color: theme.palette.info.main,
                        }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Не указан
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold" color="success.main">
                      {product?.price ? `${product.price.toLocaleString()} ₽` : 'N/A'}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Пагинация */}
      {totalCount > rowsPerPage && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination
            count={Math.ceil(totalCount / rowsPerPage)}
            page={page + 1}
            onChange={(_, newPage) => onPageChange(newPage - 1)}
            color="primary"
            size={isMobile ? "small" : "medium"}
            sx={{
              '& .MuiPaginationItem-root': {
                borderRadius: 2,
              },
            }}
          />
        </Box>
      )}
    </>
  );
};

// Компонент модалки редактирования остатков
interface EditInventoryModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (quantity: number) => Promise<void>;
  item: InventoryItem | null;
  product: Product | null;
  loading?: boolean;
}

const EditInventoryModal: React.FC<EditInventoryModalProps> = ({
  open,
  onClose,
  onSave,
  item,
  product,
  loading = false,
}) => {
  const theme = useTheme();
  const [quantity, setQuantity] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setQuantity(item.quantity.toString());
      setError(null);
    }
  }, [item]);

  const handleSave = async () => {
    const numQuantity = parseInt(quantity);
    if (isNaN(numQuantity) || numQuantity < 0) {
      setError('Введите корректное количество');
      return;
    }

    if (numQuantity < (item?.reservedQuantity || 0)) {
      setError(`Нельзя уменьшить до ${numQuantity}, зарезервировано ${item?.reservedQuantity}`);
      return;
    }

    try {
      await onSave(numQuantity);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка при сохранении');
    }
  };

  const handleQuantityChange = (value: string) => {
    if (value === '' || /^\d+$/.test(value)) {
      setQuantity(value);
      setError(null);
    }
  };

  if (!item || !product) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: 'hidden',
        },
      }}
    >
      <DialogTitle sx={{ 
        p: 2.5, 
        pb: 2,
        backgroundColor: alpha(theme.palette.primary.main, 0.02),
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h6" fontWeight={600} color="#2a0f35" sx={{ mb: 1 }}>
              Редактировать остатки
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                icon={<PersonIcon sx={{ fontSize: 14 }} />}
                label={item.userName || `Пользователь #${item.userId}`}
                size="small"
                sx={{
                  backgroundColor: alpha(theme.palette.info.main, 0.1),
                  color: theme.palette.info.main,
                  fontWeight: 500,
                }}
              />
              <Chip
                label={product.name}
                size="small"
                sx={{
                  backgroundColor: alpha(theme.palette.success.main, 0.1),
                  color: theme.palette.success.main,
                  fontWeight: 500,
                }}
              />
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ mt: -0.5, mr: -0.5 }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5, pt: 3, mt: 2 }}>
        <Stack spacing={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              backgroundColor: alpha(theme.palette.background.default, 0.5),
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
          >
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              ТЕКУЩЕЕ СОСТОЯНИЕ
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Всего:
                </Typography>
                <Typography variant="h6" color="primary" fontWeight={600}>
                  {item.quantity} шт.
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  В резерве:
                </Typography>
                <Typography variant="h6" color="warning.main" fontWeight={600}>
                  {item.reservedQuantity} шт.
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" color="text.secondary">
                  Доступно:
                </Typography>
                <Typography variant="h5" color="success.main" fontWeight={700}>
                  {item.quantity - item.reservedQuantity} шт.
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          <Box>
            <Typography variant="caption" color="#2a0f35" display="block" gutterBottom sx={{ fontWeight: 600, mb: 0.5 }}>
              НОВОЕ КОЛИЧЕСТВО
            </Typography>
            <TextField
              autoFocus
              fullWidth
              size="small"
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              error={!!error}
              helperText={error}
              placeholder="Введите количество"
              InputProps={{
                endAdornment: <InputAdornment position="end">шт.</InputAdornment>,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  backgroundColor: '#ffffff',
                  '& fieldset': {
                    borderColor: '#e0e0e0',
                    borderWidth: 1.5,
                  },
                  '&:hover fieldset': {
                    borderColor: '#9c7cae',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#3f1f4b',
                  },
                },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              * 0 - удалить товар у пользователя
            </Typography>
          </Box>

          {parseInt(quantity) < item.quantity && parseInt(quantity) >= item.reservedQuantity && (
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              Вы уменьшаете количество. Убедитесь, что это не повлияет на текущие процессы.
            </Alert>
          )}

          {parseInt(quantity) < item.reservedQuantity && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              Нельзя установить количество меньше зарезервированного ({item.reservedQuantity} шт.)
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ 
        p: 2.5, 
        pt: 2, 
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        backgroundColor: alpha(theme.palette.background.default, 0.5),
        gap: 1.5,
      }}>
        <Button
          onClick={onClose}
          variant="outlined"
          fullWidth
          sx={{
            borderRadius: 2,
            borderColor: '#e0e0e0',
            borderWidth: 1.5,
            backgroundColor: '#f8f7fa',
            color: '#4c5454',
            py: 1,
            textTransform: 'none',
            '&:hover': {
              backgroundColor: '#f0eef2',
              borderColor: '#9c7cae',
            },
          }}
        >
          Отмена
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          fullWidth
          disabled={
            loading || 
            !quantity || 
            parseInt(quantity) < 0 || 
            parseInt(quantity) < (item?.reservedQuantity || 0)
          }
          sx={{
            borderRadius: 2,
            backgroundColor: '#3f1f4b',
            color: 'white',
            py: 1,
            textTransform: 'none',
            '&:hover': { backgroundColor: '#2a0f35' },
            '&.Mui-disabled': {
              backgroundColor: '#e0e0e0',
              color: '#9e9e9e',
            },
          }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Сохранить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Компонент управления категориями (только для владельца)
interface CategoriesManagerProps {
  categories: ProductCategory[];
  loading: boolean;
  onCreateCategory: (data: { name: string; description?: string }) => Promise<void>;
  onUpdateCategory: (id: number, data: { name?: string; description?: string }) => Promise<void>;
  onDeleteCategory: (id: number) => Promise<void>;
}

const CategoriesManager: React.FC<CategoriesManagerProps> = ({
  categories,
  loading,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}) => {
  const theme = useTheme();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategory | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '' });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleOpenEdit = (category: ProductCategory) => {
    setEditingCategory(category);
    setFormData({ name: category.name, description: category.description || '' });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = 'Название обязательно';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setSaving(true);
    try {
      if (editingCategory) {
        await onUpdateCategory(editingCategory.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
        });
      } else {
        await onCreateCategory({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
        });
      }
      setDialogOpen(false);
      setFormData({ name: '', description: '' });
    } catch (err) {
      console.error('Error saving category:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading && categories.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rectangular" height={100} sx={{ borderRadius: 1, mb: 1 }} />
        ))}
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          Категории товаров
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          sx={{
            borderRadius: 2,
            backgroundColor: '#3f1f4b',
            '&:hover': { backgroundColor: '#2a0f35' },
            textTransform: 'none',
          }}
        >
          Добавить категорию
        </Button>
      </Box>

      <Grid container spacing={1.5}>
        {categories.map((category) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={category.id}>
            <Card variant="outlined" sx={iOSStyles.card}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" gutterBottom fontWeight={600} fontSize="1rem">
                      {category.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph sx={{ minHeight: 32, fontSize: '0.875rem' }}>
                      {category.description || 'Нет описания'}
                    </Typography>
                    <Chip
                      label={category.isActive ? 'Активна' : 'Неактивна'}
                      size="small"
                      color={category.isActive ? 'success' : 'default'}
                      variant="outlined"
                      sx={{ ...iOSStyles.chip, height: 20 }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenEdit(category)}
                      sx={{ 
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.2) },
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setCategoryToDelete(category);
                        setDeleteDialogOpen(true);
                      }}
                      sx={{ 
                        backgroundColor: alpha(theme.palette.error.main, 0.1),
                        '&:hover': { backgroundColor: alpha(theme.palette.error.main, 0.2) },
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
      </Grid>

      {/* Диалог создания/редактирования категории */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 4,
            maxWidth: 520,
            width: '100%',
            m: 2,
            boxShadow: '0 8px 24px rgba(106, 61, 122, 0.15)',
          },
        }}
      >
        <DialogTitle sx={{ p: 2.5, pb: 1 }}>
          <Typography variant="h6" color="#2a0f35" fontWeight={600}>
            {editingCategory ? 'Редактировать категорию' : 'Создать категорию'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 2.5, pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="Название"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={!!formErrors.name}
              helperText={formErrors.name}
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
            <TextField
              label="Описание"
              fullWidth
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}>
          <Button
            onClick={() => setDialogOpen(false)}
            variant="outlined"
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving || !formData.name.trim()}
            sx={{
              borderRadius: 2,
              backgroundColor: '#3f1f4b',
              '&:hover': { backgroundColor: '#2a0f35' },
              textTransform: 'none',
            }}
          >
            {saving ? <CircularProgress size={24} /> : (editingCategory ? 'Сохранить' : 'Создать')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог удаления категории */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: { borderRadius: 4 },
        }}
      >
        <DialogTitle sx={{ p: 2.5, pb: 1 }}>
          <Typography variant="h6" color="#2a0f35" fontWeight={600}>
            Удалить категорию
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 2.5, pt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Вы уверены, что хотите удалить категорию "{categoryToDelete?.name}"?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
            Внимание! Все товары в этой категории останутся в системе, но категория будет удалена.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Отмена
          </Button>
          <Button
            onClick={async () => {
              if (categoryToDelete) {
                await onDeleteCategory(categoryToDelete.id);
                setDeleteDialogOpen(false);
                setCategoryToDelete(null);
              }
            }}
            variant="contained"
            sx={{
              borderRadius: 2,
              backgroundColor: '#d32f2f',
              '&:hover': { backgroundColor: '#b71c1c' },
              textTransform: 'none',
            }}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// Компонент списка товаров для не-владельцев
interface ProductsListProps {
  products: Product[];
  categories: ProductCategory[];
  cities: City[];
  loading: boolean;
  userRate?: number;
  onEditProduct?: (product: Product) => void;
  onDeleteProduct?: (product: Product) => void;
  canEdit?: boolean;
}

const ProductsList: React.FC<ProductsListProps> = ({
  products,
  categories,
  cities,
  loading,
  userRate,
  onEditProduct,
  onDeleteProduct,
  canEdit = false,
}) => {
  const theme = useTheme();
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');

  const getCategoryName = (categoryId: number): string => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || `Категория #${categoryId}`;
  };

  const getCityName = (cityId?: number): string => {
    if (!cityId) return 'Все города';
    const city = cities.find(c => c.id === cityId);
    return city?.name || 'Не указан';
  };

  const getEffectiveRate = (product: Product): number | undefined => {
    if (product.defaultRate && product.defaultRate > 0) {
      return product.defaultRate;
    }
    if (userRate && userRate > 0) {
      return userRate;
    }
    return undefined;
  };

  const filteredProducts = products.filter(product => 
    categoryFilter === 'all' || product.categoryId === categoryFilter
  );

  if (loading && products.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rectangular" height={120} sx={{ borderRadius: 1, mb: 1 }} />
        ))}
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth size="small" sx={iOSStyles.input}>
          <InputLabel id="product-category-filter-label">Фильтр по категории</InputLabel>
          <Select
            labelId="product-category-filter-label"
            value={categoryFilter}
            label="Фильтр по категории"
            onChange={(e) => setCategoryFilter(e.target.value as number | 'all')}
            sx={{ borderRadius: 2 }}
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

      <Grid container spacing={1.5}>
        {filteredProducts.map((product) => {
          const effectiveRate = getEffectiveRate(product);
          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={product.id}>
              <Card variant="outlined" sx={iOSStyles.card}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" gutterBottom fontWeight={600} fontSize="1rem">
                        {product.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={`SKU: ${product.sku}`}
                          size="small"
                          variant="outlined"
                          sx={{ ...iOSStyles.chip, height: 20 }}
                        />
                        <Chip
                          label={getCategoryName(product.categoryId)}
                          size="small"
                          sx={{ 
                            ...iOSStyles.chip, 
                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                            height: 20,
                          }}
                        />
                        <Chip
                          icon={<LocationIcon sx={{ fontSize: 12 }} />}
                          label={getCityName(product.cityId)}
                          size="small"
                          sx={{ height: 20, fontSize: '0.65rem' }}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" paragraph sx={{ fontSize: '0.875rem' }}>
                        {product.description || 'Нет описания'}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <Typography variant="h6" color="success.main" fontWeight={700} sx={{ fontSize: '1.1rem' }}>
                          {product.price.toLocaleString()} ₽
                        </Typography>
                        {effectiveRate && (
                          <Typography variant="body2" color="info.main">
                            Ставка: {effectiveRate.toLocaleString()} ₽
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    {canEdit && (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => onEditProduct?.(product)}
                          sx={{ 
                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                            '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.2) },
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => onDeleteProduct?.(product)}
                          sx={{ 
                            backgroundColor: alpha(theme.palette.error.main, 0.1),
                            '&:hover': { backgroundColor: alpha(theme.palette.error.main, 0.2) },
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
        {filteredProducts.length === 0 && (
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 1 }}>
              <InventoryIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.2, mb: 2 }} />
              <Typography color="text.secondary">
                {categoryFilter === 'all' 
                  ? 'В системе еще нет товаров.'
                  : 'В выбранной категории нет товаров.'}
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    </>
  );
};

// Основной компонент страницы
// Основной компонент страницы
const ProductsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Пагинация для инвентаря
  const [inventoryPage, setInventoryPage] = useState(0);
  const [inventoryRowsPerPage] = useState(50);
  const [inventoryTotalCount, setInventoryTotalCount] = useState(0);
  
  // Состояния для модалки резервов
  const [reservationsModalOpen, setReservationsModalOpen] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [productReservations, setProductReservations] = useState<ProductReservationsResponse[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEditItem, setSelectedEditItem] = useState<InventoryItem | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  
  // Фильтры и сортировка (только для владельца)
  const [filters, setFilters] = useState({
    userId: 'all' as number | 'all',
    categoryId: 'all' as number | 'all',
    productId: 'all' as number | 'all',
    cityId: 'all' as number | 'all',
  });
  
  const [sortConfig, setSortConfig] = useState({
    by: 'quantity' as 'price' | 'quantity',
    order: 'desc' as 'asc' | 'desc',
  });

  // Диалоги
  const [replenishDialogOpen, setReplenishDialogOpen] = useState(false);
  
  // Форма пополнения
  const [replenishForm, setReplenishForm] = useState({
    isNewProduct: false,
    productId: '',
    quantity: '',
    newProduct: {
      name: '',
      sku: '',
      categoryId: '',
      price: '',
      description: '',
      cityId: '',
      hasCustomRate: false,
      defaultRate: '',
    },
  });
  
  const [secondLevelTab, setSecondLevelTab] = useState<'products' | 'categories'>('products');
  const [productCategoryFilter, setProductCategoryFilter] = useState<number | 'all'>('all');  
  
  // Состояния для модалки товара
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  
  // Состояния для удаления товара
  const [deleteProductDialogOpen, setDeleteProductDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [replenishCategoryFilter, setReplenishCategoryFilter] = useState<number | 'all'>('all');

  const isOwner = user?.role === UserRole.OWNER;
  const isAdmin = user?.role === UserRole.ADMIN;
  const isSeniorSeller = user?.role === UserRole.SENIOR_SELLER;
  const isMentor = user?.role === UserRole.MENTOR;
  const isSeller = user?.role === UserRole.SELLER;
  
  // Показываем вкладку с остатками для всех, кроме SELLER
  const showInventoryTab = !isSeller;

  // Получаем список уникальных пользователей из остатков
  const usersList = useMemo(() => {
    const userMap = new Map<number, { id: number; name: string; cityId?: number; cityName?: string }>();
    inventory.forEach(item => {
      if (item.userId && !userMap.has(item.userId) && item.userName) {
        const city = cities.find(c => c.id === item.userCityId);
        userMap.set(item.userId, {
          id: item.userId,
          name: item.userName,
          cityId: item.userCityId,
          cityName: city?.name,
        });
      }
    });
    return Array.from(userMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [inventory, cities]);

  // Функция для получения названия города по ID
  const getCityName = useCallback((cityId?: number): string => {
    if (!cityId) return 'Все города';
    const city = cities.find(c => c.id === cityId);
    return city?.name || 'Не указан';
  }, [cities]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, inventoryPage, filters, sortConfig]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Загружаем товары, категории и города
      const [productsData, categoriesData, citiesData] = await Promise.all([
        productService.getAllProducts(),
        productService.getAllCategories(),
        cityService.getAllCities(),
      ]);
      
      setProducts(productsData);
      setCategories(categoriesData);
      setCities(citiesData);
      
      // Загружаем инвентарь в зависимости от роли
      if (isOwner) {
        // OWNER видит всю компанию с фильтрами
        const inventoryData = await productService.getCompanyInventory({
          page: inventoryPage,
          limit: inventoryRowsPerPage,
          user_id: filters.userId !== 'all' ? Number(filters.userId) : undefined,
          category_id: filters.categoryId !== 'all' ? Number(filters.categoryId) : undefined,
          product_id: filters.productId !== 'all' ? Number(filters.productId) : undefined,
          city_id: filters.cityId !== 'all' ? Number(filters.cityId) : undefined,
        });
        
        setInventory(inventoryData.items || []);
        setTotalQuantity(inventoryData.quantity || 0);
        setTotalValue(inventoryData.total_value || 0);
        setInventoryTotalCount(inventoryData.total_count || 0);
      } else if (showInventoryTab) {
        // Для ADMIN, SENIOR_SELLER, MENTOR используем ручку my-team
        // которая вернет инвентарь с учетом подчиненных
        const inventoryData = await productService.getMyTeamInventory({
          page: inventoryPage,
          limit: inventoryRowsPerPage,
        });
        
        setInventory(inventoryData.items || []);
        setTotalQuantity(inventoryData.quantity || 0);
        setTotalValue(inventoryData.total_value || 0);
        setInventoryTotalCount(inventoryData.total_count || 0);
      }
      
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка загрузки данных');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (categoryId: number): string => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || `Категория #${categoryId}`;
  };

  const handleTabChange = (newValue: number) => {
    setTabValue(newValue);
  };

  const handleCreateCategory = async (data: { name: string; description?: string }) => {
    try {
      const category = await productService.createCategory(data);
      setCategories([...categories, category]);
      setSuccessMessage('Категория успешно создана');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка создания категории');
      throw err;
    }
  };

  const handleUpdateCategory = async (id: number, data: { name?: string; description?: string }) => {
    try {
      const updated = await productService.updateCategory(id, data);
      setCategories(categories.map(c => c.id === id ? updated : c));
      setSuccessMessage('Категория успешно обновлена');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка обновления категории');
      throw err;
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await productService.deleteCategory(id);
      setCategories(categories.filter(c => c.id !== id));
      setSuccessMessage('Категория успешно удалена');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка удаления категории');
      throw err;
    }
  };

  const handleReplenish = async () => {
    try {
      if (replenishForm.isNewProduct) {
        const newProduct = await productService.createProduct({
          name: replenishForm.newProduct.name,
          sku: replenishForm.newProduct.sku,
          categoryId: parseInt(replenishForm.newProduct.categoryId),
          price: parseFloat(replenishForm.newProduct.price) || 0,
          description: replenishForm.newProduct.description,
          cityId: replenishForm.newProduct.cityId ? parseInt(replenishForm.newProduct.cityId) : undefined,
          defaultRate: replenishForm.newProduct.hasCustomRate ? parseFloat(replenishForm.newProduct.defaultRate) : undefined,
        });
        
        await productService.replenishInventory({
          productId: newProduct.id,
          quantity: parseInt(replenishForm.quantity) || 1,
        });
      } else {
        await productService.replenishInventory({
          productId: parseInt(replenishForm.productId),
          quantity: parseInt(replenishForm.quantity) || 1,
        });
      }
      
      await loadData();
      setReplenishDialogOpen(false);
      resetReplenishForm();
      setSuccessMessage('Товар успешно пополнен');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка пополнения товара');
    }
  };

  const handleSaveProduct = async (productData: {
    name: string;
    sku: string;
    categoryId: number;
    price: number;
    description?: string;
    cityId?: number | null;
    defaultRate?: number;
  }) => {
    setSavingProduct(true);
    try {
      const dataToSend = {
        ...productData,
        cityId: productData.cityId === null ? undefined : productData.cityId,
      };
      
      if (productToEdit) {
        const updated = await productService.updateProduct(productToEdit.id, dataToSend);
        setProducts(prevProducts => prevProducts.map(p => 
          p.id === productToEdit.id ? { ...updated, cityId: updated.cityId, defaultRate: updated.defaultRate } : p
        ));
        setSuccessMessage('Товар успешно обновлен');
      } else {
        const newProduct = await productService.createProduct(dataToSend);
        setProducts(prevProducts => [...prevProducts, newProduct]);
        setSuccessMessage('Товар успешно создан');
      }
      setProductModalOpen(false);
      setProductToEdit(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка сохранения товара');
      throw err;
    } finally {
      setSavingProduct(false);
    }
  };

  const resetReplenishForm = () => {
    setReplenishForm({
      isNewProduct: false,
      productId: '',
      quantity: '',
      newProduct: {
        name: '',
        sku: '',
        categoryId: '',
        price: '',
        description: '',
        cityId: '',
        hasCustomRate: false,
        defaultRate: '',
      },
    });
    setReplenishCategoryFilter('all');
  };

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setInventoryPage(0);
  };

  const handleClearFilters = () => {
    setFilters({ userId: 'all', categoryId: 'all', productId: 'all', cityId: 'all' });
    setInventoryPage(0);
  };

  const handleSortChange = (sortBy: 'price' | 'quantity') => {
    setSortConfig(prev => ({
      by: sortBy,
      order: prev.by === sortBy && prev.order === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    
    try {
      await productService.deleteProduct(productToDelete.id);
      setProducts(products.filter(p => p.id !== productToDelete.id));
      setDeleteProductDialogOpen(false);
      setProductToDelete(null);
      setSuccessMessage('Товар успешно удален');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка удаления товара');
    }
  };

  const handleReservedClick = async (item: InventoryItem) => {
    setSelectedInventoryItem(item);
    setReservationsModalOpen(true);
    setLoadingReservations(true);
    
    try {
      const reservations = await inventoryService.getProductReservations(item.userId, item.productId);
      setProductReservations(reservations);
    } catch (err) {
      console.error('Error loading reservations:', err);
      setError('Ошибка загрузки деталей резервов');
    } finally {
      setLoadingReservations(false);
    }
  };

  const handleEditClick = (item: InventoryItem) => {
    const product = products.find(p => p.id === item.productId);
    
    if (!product) {
      setError('Не удалось загрузить данные товара');
      return;
    }
    
    setSelectedEditItem(item);
    setEditingProduct(product);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (quantity: number) => {
    if (!selectedEditItem) return;
    
    setSavingEdit(true);
    try {
      await inventoryService.editInventory({
        user_id: selectedEditItem.userId,
        product_id: selectedEditItem.productId,
        quantity: quantity,
      });
      
      await loadData();
      
      setSuccessMessage(`Остатки обновлены: ${selectedEditItem.productName} → ${quantity} шт.`);
      setEditModalOpen(false);
      setSelectedEditItem(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка при обновлении остатков');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleOpenCreateProduct = () => {
    setProductToEdit(null);
    setProductModalOpen(true);
  };

  const handleOpenEditProduct = (product: Product) => {
    setProductToEdit(product);
    setProductModalOpen(true);
  };

const filteredInventory = useMemo(() => {
  if (!showInventoryTab) return [];
  
  let filtered = [...inventory];

  // Применяем фильтры (для всех ролей)
  if (filters.userId !== 'all') {
    filtered = filtered.filter(item => item.userId === filters.userId);
  }
  
  if (filters.categoryId !== 'all') {
    filtered = filtered.filter(item => {
      const product = products.find(p => p.id === item.productId);
      return product?.categoryId === filters.categoryId;
    });
  }
  
  if (filters.productId !== 'all') {
    filtered = filtered.filter(item => item.productId === filters.productId);
  }
  
  if (filters.cityId !== 'all') {
    filtered = filtered.filter(item => item.userCityId === filters.cityId);
  }

  // Применяем сортировку
  filtered.sort((a, b) => {
    const productA = products.find(p => p.id === a.productId);
    const productB = products.find(p => p.id === b.productId);
    
    if (sortConfig.by === 'price') {
      const priceA = productA?.price || 0;
      const priceB = productB?.price || 0;
      return sortConfig.order === 'asc' ? priceA - priceB : priceB - priceA;
    }
    
    if (sortConfig.by === 'quantity') {
      return sortConfig.order === 'asc' 
        ? a.quantity - b.quantity
        : b.quantity - a.quantity;
    }
    
    return 0;
  });

  return filtered;
}, [inventory, products, filters, sortConfig, showInventoryTab]);

  const handleInventoryPageChange = (newPage: number) => {
    setInventoryPage(newPage);
  };

  // Формируем вкладки в зависимости от роли
  const getTabs = () => {
    const tabs = [];
    
    // Вкладка с остатками для всех, кроме SELLER
    if (showInventoryTab) {
      tabs.push({ label: 'Остатки', icon: <InventoryIcon fontSize="small" />, value: 0 });
    }
    
    // Вкладка с товарами для всех
    tabs.push({ label: 'Товары', icon: <CategoryIcon fontSize="small" />, value: showInventoryTab ? 1 : 0 });
    
    return tabs;
  };

  const availableTabs = getTabs();
  
  // Текущее значение вкладки с учетом сдвига
  const currentTabValue = showInventoryTab ? tabValue : (tabValue === 0 ? 0 : 0);

  const handleTabChangeWrapper = (newValue: number) => {
    setTabValue(newValue);
  };

  const filteredProductsForReplenish = replenishCategoryFilter === 'all'
    ? products
    : products.filter(product => product.categoryId === replenishCategoryFilter);

  const handleQuantityChange = (value: string) => {
    if (value === '' || /^\d+$/.test(value)) {
      setReplenishForm({
        ...replenishForm,
        quantity: value
      });
    }
  };

  const handlePriceChange = (value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setReplenishForm({
        ...replenishForm,
        newProduct: {
          ...replenishForm.newProduct,
          price: value
        }
      });
    }
  };

  const handleRateChange = (value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setReplenishForm({
        ...replenishForm,
        newProduct: {
          ...replenishForm.newProduct,
          defaultRate: value
        }
      });
    }
  };

  const currentUserRate = !isOwner ? (user as any)?.rate : undefined;

  // Получаем текст для информационного баннера в зависимости от роли

  // Получаем заголовок для остатков
  const getInventoryTitle = () => {
    if (isOwner) return "Общий остаток товаров компании";
    if (isAdmin) return "Остаток товаров в ваших кустах";
    if (isSeniorSeller) return "Остаток товаров в вашем кусте";
    if (isMentor) return "Остаток товаров (вы + подопечные)";
    return "Остаток товаров";
  };

  return (
    <Container 
      maxWidth="lg" 
      sx={{ 
        mt: { xs: 1, sm: 2 }, 
        mb: { xs: 1, sm: 2 },
        px: { xs: 1, sm: 2, md: 3 },
      }}
    >
      <Paper elevation={0} sx={iOSStyles.paper}>
        <TabBadges 
          value={currentTabValue} 
          onChange={handleTabChangeWrapper} 
          tabs={availableTabs} 
        />

        {error && (
          <Alert 
            severity="error" 
            sx={{ m: 2, borderRadius: 1 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Вкладка Остатки - для всех, кроме SELLER */}
        {showInventoryTab && tabValue === 0 && (
          <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', mb: 3, gap: 2 }}>
              <Box sx={{ display: 'flex', flex: 1, gap: { xs: 2, md: 4 }, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="h5" gutterBottom fontWeight={600} sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
                    {getInventoryTitle()}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography variant="h3" color="primary" fontWeight={700} sx={{ fontSize: { xs: '2rem', sm: '3rem' } }}>
                      {totalQuantity.toLocaleString()}
                    </Typography>
                    <Typography variant="h6" color="text.secondary" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                      шт.
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ pl: { xs: 0, md: 4 } }}>
                  <Typography variant="h5" gutterBottom fontWeight={600} sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
                    Общая стоимость
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <Typography variant="h3" color="success.main" fontWeight={700} sx={{ fontSize: { xs: '2rem', sm: '3rem' } }}>
                      {totalValue.toLocaleString('ru-RU')}
                    </Typography>
                    <Typography variant="h6" color="text.secondary" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                      ₽
                    </Typography>
                  </Box>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                {/* Кнопка пополнения только для OWNER */}
                {isOwner && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setReplenishDialogOpen(true)}
                    sx={{ 
                      ...iOSStyles.button,
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Пополнить
                  </Button>
                )}
                <Tooltip title="Обновить">
                  <IconButton 
                    onClick={loadData} 
                    disabled={loading}
                    sx={{ 
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.2) },
                    }}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Фильтры для всех, у кого есть вкладка Остатки (OWNER, ADMIN, SENIOR_SELLER, MENTOR) */}
            <FilterSection
              users={usersList}
              categories={categories}
              products={products}
              cities={cities}
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
            />

            {/* Сортировка для всех */}
            <SortSection
              sortBy={sortConfig.by}
              sortOrder={sortConfig.order}
              onSortChange={handleSortChange}
            />

            <InventoryTable
              items={filteredInventory}
              products={products}
              categories={categories}
              cities={cities}
              loading={loading}
              getCategoryName={getCategoryName}
              getCityName={getCityName}
              onReservedClick={handleReservedClick}
              onEditClick={handleEditClick}
              page={inventoryPage}
              rowsPerPage={inventoryRowsPerPage}
              totalCount={inventoryTotalCount}
              onPageChange={handleInventoryPageChange}
              isOwner={isOwner}
            />
          </Box>
        )}

        {/* Вкладка Товары */}
        {((showInventoryTab && tabValue === 1) || (!showInventoryTab && tabValue === 0)) && (
          <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
            {/* Категории и товары - только для OWNER */}
            {isOwner && (
              <Box sx={{ 
                display: 'flex', 
                gap: 1, 
                mb: 3,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                pb: 1
              }}>
                <Button
                  onClick={() => setSecondLevelTab('products')}
                  variant={secondLevelTab === 'products' ? 'contained' : 'text'}
                  startIcon={<InventoryIcon />}
                  sx={{
                    ...iOSStyles.button,
                    borderRadius: 4,
                    backgroundColor: secondLevelTab === 'products' ? theme.palette.primary.main : 'transparent',
                    borderColor: secondLevelTab === 'products' ? 'transparent' : alpha(theme.palette.primary.main, 0.3),
                    color: secondLevelTab === 'products' ? 'white' : theme.palette.text.primary,
                  }}
                >
                  Товары в системе
                </Button>
                <Button
                  onClick={() => setSecondLevelTab('categories')}
                  variant={secondLevelTab === 'categories' ? 'contained' : 'text'}
                  startIcon={<CategoryIcon />}
                  sx={{
                    ...iOSStyles.button,
                    borderRadius: 4,
                    backgroundColor: secondLevelTab === 'categories' ? theme.palette.primary.main : 'transparent',
                    borderColor: secondLevelTab === 'categories' ? 'transparent' : alpha(theme.palette.primary.main, 0.3),
                    color: secondLevelTab === 'categories' ? 'white' : theme.palette.text.primary,
                  }}
                >
                  Категории
                </Button>
              </Box>
            )}

            {/* Управление категориями (только для OWNER) */}
            {isOwner && secondLevelTab === 'categories' && (
              <CategoriesManager
                categories={categories}
                loading={loading}
                onCreateCategory={handleCreateCategory}
                onUpdateCategory={handleUpdateCategory}
                onDeleteCategory={handleDeleteCategory}
              />
            )}

            {/* Список товаров */}
            {((isOwner && secondLevelTab === 'products') || !isOwner) && (
              <>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  mb: 3, 
                  alignItems: 'center',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 2, sm: 0 }
                }}>
                  <Typography variant="h5" fontWeight={600} sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                    Товары в системе
                  </Typography>
                  {isOwner && (
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleOpenCreateProduct}
                      sx={{
                        ...iOSStyles.button,
                        width: { xs: '100%', sm: 'auto' },
                        whiteSpace: 'nowrap',
                        fontSize: { xs: '0.875rem', sm: '0.95rem' },
                        py: { xs: 1, sm: 0.75 },
                        backgroundColor: '#3f1f4b',
                        '&:hover': { backgroundColor: '#2a0f35' },
                      }}
                    >
                      Добавить товар
                    </Button>
                  )}
                </Box>

                <ProductsList
                  products={products}
                  categories={categories}
                  cities={cities}
                  loading={loading}
                  userRate={currentUserRate}
                  onEditProduct={isOwner ? handleOpenEditProduct : undefined}
                  onDeleteProduct={isOwner ? (product) => {
                    setProductToDelete(product);
                    setDeleteProductDialogOpen(true);
                  } : undefined}
                  canEdit={isOwner}
                />
              </>
            )}
          </Box>
        )}
      </Paper>

      {/* Диалог пополнения (только для OWNER) */}
      {isOwner && (
        <Dialog 
          open={replenishDialogOpen} 
          onClose={() => {
            setReplenishDialogOpen(false);
            resetReplenishForm();
          }}
          PaperProps={{
            sx: {
              borderRadius: 4,
              maxWidth: 680,
              width: '100%',
              m: 2,
              boxShadow: '0 8px 24px rgba(106, 61, 122, 0.15)',
            },
          }}
        >
          <DialogTitle sx={{ p: { xs: 2, sm: 2.5 }, pb: 1 }}>
            <Typography variant="h6" color="#2a0f35" fontWeight={600} sx={{ mb: 0.5, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
              Пополнить товар
            </Typography>
            <Typography variant="body2" color="#4c5454" sx={{ fontSize: { xs: '0.8rem', sm: '0.85rem' } }}>
              Добавьте новый товар в инвентарь компании
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ p: { xs: 2, sm: 2.5 }, pt: { xs: 1, sm: 2 } }}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="caption" color="#2a0f35" display="block" gutterBottom sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.75rem' }, mb: 0.5 }}>
                  ТИП ТОВАРА
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={replenishForm.isNewProduct ? 'new' : 'existing'}
                    onChange={(e) => setReplenishForm({
                      ...replenishForm,
                      isNewProduct: e.target.value === 'new',
                      productId: '',
                    })}
                    sx={{
                      borderRadius: 2,
                      backgroundColor: '#ffffff',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#e0e0e0',
                        borderWidth: 1.5,
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#9c7cae',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#3f1f4b',
                      },
                    }}
                  >
                    <MenuItem value="existing">Существующий товар</MenuItem>
                    <MenuItem value="new">Новый товар</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {replenishForm.isNewProduct ? (
                <>
                  <Box>
                    <Typography variant="caption" color="#2a0f35" display="block" gutterBottom sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.75rem' }, mb: 0.5 }}>
                      НОВЫЙ ТОВАР
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Название"
                          fullWidth
                          required
                          size="small"
                          value={replenishForm.newProduct.name}
                          onChange={(e) => setReplenishForm({
                            ...replenishForm,
                            newProduct: {...replenishForm.newProduct, name: e.target.value}
                          })}
                          placeholder="Введите название товара"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              backgroundColor: '#ffffff',
                              '& fieldset': {
                                borderColor: '#e0e0e0',
                                borderWidth: 1.5,
                              },
                              '&:hover fieldset': {
                                borderColor: '#9c7cae',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#3f1f4b',
                              },
                            },
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="SKU (артикул)"
                          fullWidth
                          required
                          size="small"
                          value={replenishForm.newProduct.sku}
                          onChange={(e) => setReplenishForm({
                            ...replenishForm,
                            newProduct: {...replenishForm.newProduct, sku: e.target.value}
                          })}
                          placeholder="Введите артикул"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              backgroundColor: '#ffffff',
                              '& fieldset': {
                                borderColor: '#e0e0e0',
                                borderWidth: 1.5,
                              },
                              '&:hover fieldset': {
                                borderColor: '#9c7cae',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#3f1f4b',
                              },
                            },
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth required size="small">
                          <Select
                            value={replenishForm.newProduct.categoryId}
                            onChange={(e) => setReplenishForm({
                              ...replenishForm,
                              newProduct: {...replenishForm.newProduct, categoryId: e.target.value}
                            })}
                            displayEmpty
                            sx={{
                              borderRadius: 2,
                              backgroundColor: '#ffffff',
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#e0e0e0',
                                borderWidth: 1.5,
                              },
                              '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#9c7cae',
                              },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#3f1f4b',
                              },
                            }}
                          >
                            <MenuItem value="" disabled>Выберите категорию</MenuItem>
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
                          type="text"
                          fullWidth
                          required
                          size="small"
                          value={replenishForm.newProduct.price}
                          onChange={(e) => handlePriceChange(e.target.value)}
                          placeholder="0.00"
                          InputProps={{
                            startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              backgroundColor: '#ffffff',
                              '& fieldset': {
                                borderColor: '#e0e0e0',
                                borderWidth: 1.5,
                              },
                              '&:hover fieldset': {
                                borderColor: '#9c7cae',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#3f1f4b',
                              },
                            },
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Autocomplete
                          options={cities}
                          getOptionLabel={(option) => option.name}
                          value={cities.find(c => c.id.toString() === replenishForm.newProduct.cityId) || null}
                          onChange={(_, newValue) => {
                            setReplenishForm({
                              ...replenishForm,
                              newProduct: {...replenishForm.newProduct, cityId: newValue ? newValue.id.toString() : ''}
                            });
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Город"
                              size="small"
                              placeholder="Выберите город"
                              helperText="Если не выбрать город, товар будет доступен во всех городах"
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                  backgroundColor: '#ffffff',
                                  '& fieldset': {
                                    borderColor: '#e0e0e0',
                                    borderWidth: 1.5,
                                  },
                                  '&:hover fieldset': {
                                    borderColor: '#9c7cae',
                                  },
                                  '&.Mui-focused fieldset': {
                                    borderColor: '#3f1f4b',
                                  },
                                },
                              }}
                            />
                          )}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={replenishForm.newProduct.hasCustomRate}
                              onChange={(e) => setReplenishForm({
                                ...replenishForm,
                                newProduct: {...replenishForm.newProduct, hasCustomRate: e.target.checked}
                              })}
                            />
                          }
                          label="Задать свою ставку для этого товара"
                        />
                        {replenishForm.newProduct.hasCustomRate && (
                          <TextField
                            label="Ставка"
                            type="text"
                            fullWidth
                            size="small"
                            value={replenishForm.newProduct.defaultRate}
                            onChange={(e) => handleRateChange(e.target.value)}
                            placeholder="0.00"
                            InputProps={{
                              startAdornment: <InputAdornment position="start">₽</InputAdornment>,
                            }}
                            sx={{ mt: 1 }}
                          />
                        )}
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          label="Описание"
                          fullWidth
                          multiline
                          rows={2}
                          size="small"
                          value={replenishForm.newProduct.description}
                          onChange={(e) => setReplenishForm({
                            ...replenishForm,
                            newProduct: {...replenishForm.newProduct, description: e.target.value}
                          })}
                          placeholder="Введите описание товара (необязательно)"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                              backgroundColor: '#ffffff',
                              '& fieldset': {
                                borderColor: '#e0e0e0',
                                borderWidth: 1.5,
                              },
                              '&:hover fieldset': {
                                borderColor: '#9c7cae',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#3f1f4b',
                              },
                            },
                          }}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                </>
              ) : (
                <>
                  <Box>
                    <Typography variant="caption" color="#2a0f35" display="block" gutterBottom sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.75rem' }, mb: 0.5 }}>
                      ФИЛЬТР ПО КАТЕГОРИИ
                    </Typography>
                    <FormControl fullWidth size="small">
                      <Select
                        value={replenishCategoryFilter}
                        onChange={(e) => setReplenishCategoryFilter(e.target.value as number | 'all')}
                        sx={{
                          borderRadius: 2,
                          backgroundColor: '#ffffff',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#e0e0e0',
                            borderWidth: 1.5,
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#9c7cae',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#3f1f4b',
                          },
                        }}
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

                  <Box>
                    <Typography variant="caption" color="#2a0f35" display="block" gutterBottom sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.75rem' }, mb: 0.5 }}>
                      ВЫБЕРИТЕ ТОВАР
                    </Typography>
                    <FormControl fullWidth size="small">
                      <Select
                        value={replenishForm.productId}
                        onChange={(e) => setReplenishForm({
                          ...replenishForm,
                          productId: e.target.value
                        })}
                        disabled={filteredProductsForReplenish.length === 0}
                        displayEmpty
                        sx={{
                          borderRadius: 2,
                          backgroundColor: '#ffffff',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#e0e0e0',
                            borderWidth: 1.5,
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#9c7cae',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#3f1f4b',
                          },
                        }}
                      >
                        <MenuItem value="" disabled>Выберите товар</MenuItem>
                        {filteredProductsForReplenish.map(product => (
                          <MenuItem key={product.id} value={product.id}>
                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                              <Typography variant="body2" fontWeight={500}>
                                {product.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {product.sku} • {product.price} ₽
                                {product.cityId && ` • ${getCityName(product.cityId)}`}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                      {filteredProductsForReplenish.length === 0 && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                          {replenishCategoryFilter === 'all' 
                            ? 'В системе нет товаров' 
                            : `В категории "${categories.find(c => c.id === replenishCategoryFilter)?.name}" нет товаров`}
                        </Typography>
                      )}
                    </FormControl>
                  </Box>
                </>
              )}

              <Box>
                <Typography variant="caption" color="#2a0f35" display="block" gutterBottom sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.75rem' }, mb: 0.5 }}>
                  КОЛИЧЕСТВО
                </Typography>
                <TextField
                  type="text"
                  fullWidth
                  required
                  size="small"
                  value={replenishForm.quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  placeholder="0"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">шт.</InputAdornment>,
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: '#ffffff',
                      '& fieldset': {
                        borderColor: '#e0e0e0',
                        borderWidth: 1.5,
                      },
                      '&:hover fieldset': {
                        borderColor: '#9c7cae',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#3f1f4b',
                      },
                    },
                  }}
                />
              </Box>

              {replenishForm.isNewProduct && (
                <Alert severity="info" sx={{ borderRadius: 2, border: '1.5px solid #4fc3f7', backgroundColor: '#e1f5fe' }}>
                  После создания товар сразу появится в инвентаре компании
                </Alert>
              )}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: { xs: 2, sm: 2.5 }, pt: 1, gap: 1.5 }}>
            <Button
              onClick={() => {
                setReplenishDialogOpen(false);
                resetReplenishForm();
              }}
              variant="outlined"
              sx={{
                borderRadius: 2,
                borderColor: '#e0e0e0',
                borderWidth: 1.5,
                backgroundColor: '#f8f7fa',
                color: '#4c5454',
                px: 3,
                py: 1,
                textTransform: 'none',
                fontSize: { xs: '0.85rem', sm: '0.95rem' },
                fontWeight: 500,
                flex: 1,
                '&:hover': {
                  backgroundColor: '#f0eef2',
                  borderColor: '#9c7cae',
                },
              }}
            >
              Отмена
            </Button>
            <Button
              variant="contained"
              onClick={handleReplenish}
              disabled={
                !replenishForm.quantity || 
                parseInt(replenishForm.quantity) < 1 ||
                (!replenishForm.isNewProduct && !replenishForm.productId) ||
                (replenishForm.isNewProduct && (
                  !replenishForm.newProduct.name.trim() ||
                  !replenishForm.newProduct.sku.trim() ||
                  !replenishForm.newProduct.categoryId ||
                  !replenishForm.newProduct.price ||
                  parseFloat(replenishForm.newProduct.price) <= 0
                ))
              }
              sx={{
                borderRadius: 2,
                backgroundColor: '#3f1f4b',
                color: 'white',
                px: 3,
                py: 1,
                textTransform: 'none',
                fontSize: { xs: '0.85rem', sm: '0.95rem' },
                fontWeight: 500,
                flex: 1,
                '&:hover': { 
                  backgroundColor: '#2a0f35',
                },
                '&.Mui-disabled': {
                  backgroundColor: '#e0e0e0',
                  color: '#9e9e9e',
                },
              }}
            >
              Пополнить
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Модалка создания/редактирования товара (только для OWNER) */}
      {isOwner && (
        <ProductModal
          open={productModalOpen}
          onClose={() => {
            setProductModalOpen(false);
            setProductToEdit(null);
          }}
          onSave={handleSaveProduct}
          categories={categories}
          cities={cities}
          product={productToEdit}
          loading={savingProduct}
        />
      )}

      {/* Диалог удаления товара (только для OWNER) */}
      {isOwner && (
        <Dialog 
          open={deleteProductDialogOpen} 
          onClose={() => setDeleteProductDialogOpen(false)}
          PaperProps={{
            sx: { borderRadius: 4 },
          }}
        >
          <DialogTitle sx={{ p: 2.5, pb: 1 }}>
            <Typography variant="h6" color="#2a0f35" fontWeight={600} sx={{ mb: 0.5 }}>
              Удалить товар
            </Typography>
            <Typography variant="body2" color="#4c5454">
              Вы уверены, что хотите удалить товар "{productToDelete?.name}"?
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ p: 2.5, pt: 2 }}>
            <Alert severity="warning" sx={{ borderRadius: 2 }}>
              Внимание! Товар будет удален из системы. 
              Это может повлиять на историю отчетов, перемещений и брака.
            </Alert>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}>
            <Button
              onClick={() => setDeleteProductDialogOpen(false)}
              variant="outlined"
              fullWidth
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Отмена
            </Button>
            <Button
              variant="contained"
              onClick={handleDeleteProduct}
              fullWidth
              sx={{
                borderRadius: 2,
                backgroundColor: '#d32f2f',
                textTransform: 'none',
                '&:hover': { backgroundColor: '#b71c1c' },
              }}
            >
              Удалить
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Модалка деталей резервов (только для OWNER) */}
      {selectedInventoryItem && (
        <ReservationDetailsModal
          open={reservationsModalOpen}
          onClose={() => {
            setReservationsModalOpen(false);
            setSelectedInventoryItem(null);
            setProductReservations([]);
          }}
          reservations={productReservations}
          productName={selectedInventoryItem.productName || 'Товар'}
          productSku={selectedInventoryItem.productSku || 'N/A'}
          totalReserved={selectedInventoryItem.reservedQuantity}
          loading={loadingReservations}
        />
      )}
      
      {/* Модалка редактирования остатков (только для OWNER) */}
      {isOwner && (
        <EditInventoryModal
          open={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedEditItem(null);
            setEditingProduct(null);
          }}
          onSave={handleSaveEdit}
          item={selectedEditItem}
          product={editingProduct}
          loading={savingEdit}
        />
      )}

      {/* Информационный баннер для руководителей (не OWNER) */}


      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage(null)}
        TransitionComponent={Zoom}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Paper 
          elevation={4} 
          sx={{ 
            ...iOSStyles.paper, 
            py: 1, 
            px: 2.5, 
            backgroundColor: theme.palette.success.main,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Typography variant="body2">{successMessage}</Typography>
        </Paper>
      </Snackbar>
    </Container>
  );
};

export default ProductsPage;

