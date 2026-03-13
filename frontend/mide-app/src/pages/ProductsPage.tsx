import React, { useState, useEffect, useMemo } from 'react';
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
  ListItemButton, // если нужна кликабельность
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
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { productService } from '../api/productService';
import { userService } from '../api/userService';
import { inventoryService } from '../api/inventoryService';
import { Product, ProductCategory, UserRole, InventoryItem, User, ProductReservationsResponse } from '../types';

// iOS стили с уменьшенными закруглениями
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

  // Группировка по типу для сводки
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

      <DialogContent sx={{ p: 2.5, pt: 2 }}> {/* Уменьшил верхний отступ с 3 до 2 */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Сводка - теперь ближе к заголовку */}
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

            {/* Список резервов */}
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

// Компонент фильтров
interface FilterSectionProps {
  users: User[];
  categories: ProductCategory[];
  products: Product[];
  filters: {
    userId: number | 'all';
    categoryId: number | 'all';
    productId: number | 'all';
  };
  onFilterChange: (filters: any) => void;
  onClearFilters: () => void;
}

const FilterSection: React.FC<FilterSectionProps> = ({
  users,
  categories,
  products,
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
    user.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.username?.toLowerCase().includes(userSearch.toLowerCase())
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
          <Grid size={{ xs: 12, sm: 4 }}>
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
                        {user.fullName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.username}
                      </Typography>
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

          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth size="small" sx={iOSStyles.input}>
              <InputLabel id="category-filter-label">Категория</InputLabel>
              <Select
                labelId="category-filter-label"
                value={filters.categoryId}
                label="Категория"
                onChange={(e) => handleCategoryChange(e.target.value as number | 'all')}
                MenuProps={{
                  PaperProps: { sx: { borderRadius: 2 } },
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
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
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
                {isProductSearching && (
                  <MenuItem disabled>
                    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                      <CircularProgress size={20} />
                    </Box>
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
  users: User[];
  loading: boolean;
  getUserFullName: (userId: number) => string;
  getCategoryName: (categoryId: number) => string;
  onReservedClick: (item: InventoryItem) => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  products,
  categories,
  users,
  loading,
  getUserFullName,
  getCategoryName,
  onReservedClick,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (loading) {
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
            Используйте кнопку "Пополнить" чтобы добавить товары
          </Typography>
        </Paper>
      </Zoom>
    );
  }

  if (isMobile) {
    return (
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
                
                <Divider sx={{ my: 1 }} />
                
                <Grid container spacing={1}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Количество
                    </Typography>
                    <Typography variant="body1" fontWeight={700} color={item.quantity > 0 ? 'primary' : 'text.secondary'}>
                      {item.quantity} шт.
                    </Typography>
                    {item.reservedQuantity > 0 && (
                      <Box sx={{ display: 'inline-block' }}>
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
                              backgroundColor: alpha(theme.palette.warning.main, 0.2), // Меняем фон при наведении
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
                    <Typography variant="body2" fontWeight={500}>
                      {getUserFullName(item.userId)}
                    </Typography>
                  </Grid>
                </Grid>
              </Card>
            </Fade>
          );
        })}
      </Box>
    );
  }

  return (
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
                  <Typography variant="body2" fontWeight="bold" color="primary">
                    {item.quantity} шт.
                  </Typography>
                  {item.reservedQuantity > 0 && (
                    <Box sx={{ display: 'inline-block' }}>
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
                            backgroundColor: alpha(theme.palette.warning.main, 0.2), // Меняем фон при наведении
                          },
                        }}
                      />
                    </Box>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {getUserFullName(item.userId)}
                  </Typography>
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
  );
};

// Основной компонент страницы
const ProductsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
  
  // Состояния для модалки резервов
  const [reservationsModalOpen, setReservationsModalOpen] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);
  const [productReservations, setProductReservations] = useState<ProductReservationsResponse[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  
  // Фильтры и сортировка
  const [filters, setFilters] = useState({
    userId: 'all' as number | 'all',
    categoryId: 'all' as number | 'all',
    productId: 'all' as number | 'all',
  });
  
  const [sortConfig, setSortConfig] = useState({
    by: 'quantity' as 'price' | 'quantity',
    order: 'desc' as 'asc' | 'desc',
  });

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
    quantity: '',
    newProduct: {
      name: '',
      sku: '',
      categoryId: '',
      price: '',
      description: '',
    },
  });

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
        userService.getAllUsers(0, 1000),
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

  const getUserFullName = (userId: number): string => {
    const user = users.find(u => u.id === userId);
    return user?.fullName || `Пользователь #${userId}`;
  };

  const getCategoryName = (categoryId: number): string => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || `Категория #${categoryId}`;
  };

  const handleTabChange = (newValue: number) => {
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
        const newProduct = await productService.createProduct({
          name: replenishForm.newProduct.name,
          sku: replenishForm.newProduct.sku,
          categoryId: parseInt(replenishForm.newProduct.categoryId),
          price: parseFloat(replenishForm.newProduct.price) || 0,
          description: replenishForm.newProduct.description,
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
      },
    });
    setReplenishCategoryFilter('all');
  };

  const resetCategoryForm = () => {
    setNewCategory({ name: '', description: '', isActive: true });
    setIsEditingCategory(false);
    setEditingCategoryId(null);
  };

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleClearFilters = () => {
    setFilters({ userId: 'all', categoryId: 'all', productId: 'all' });
  };

  const handleSortChange = (sortBy: 'price' | 'quantity') => {
    setSortConfig(prev => ({
      by: sortBy,
      order: prev.by === sortBy && prev.order === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Обработчик клика по резерву
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

  // Фильтрация и сортировка инвентаря
  const getFilteredAndSortedInventory = () => {
    const aggregated = inventory.reduce((acc, item) => {
      const existing = acc.find(i => i.productId === item.productId && i.userId === item.userId);
      if (existing) {
        existing.quantity += item.quantity;
        existing.reservedQuantity += item.reservedQuantity;
      } else {
        acc.push({ ...item });
      }
      return acc;
    }, [] as InventoryItem[]);

    let filtered = aggregated.filter(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return false;
      
      const matchesUser = filters.userId === 'all' || item.userId === filters.userId;
      const matchesCategory = filters.categoryId === 'all' || product.categoryId === filters.categoryId;
      const matchesProduct = filters.productId === 'all' || item.productId === filters.productId;
      
      return matchesUser && matchesCategory && matchesProduct;
    });

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
  };
  const totalValue = useMemo(() => {
    return inventory.reduce((sum, item) => {
      const product = products.find(p => p.id === item.productId);
      if (product && item.quantity > 0) {
        return sum + (product.price * item.quantity);
      }
      return sum;
    }, 0);
  }, [inventory, products]);

  const filteredInventory = getFilteredAndSortedInventory();
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

  if (user?.role !== UserRole.OWNER) {
    return (
      <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
        <Paper sx={{ ...iOSStyles.paper, p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="error">
            Доступ запрещен. Эта страница доступна только владельцу.
          </Typography>
        </Paper>
      </Container>
    );
  }

  const tabs = [
    { label: 'Товары', icon: <InventoryIcon fontSize="small" />, value: 0 },
    { label: 'Категории', icon: <CategoryIcon fontSize="small" />, value: 1 },
  ];

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
        <TabBadges value={tabValue} onChange={handleTabChange} tabs={tabs} />

        {error && (
          <Alert 
            severity="error" 
            sx={{ m: 2, borderRadius: 1 }}
            onClose={() => setError(null)}
            action={
              <IconButton color="inherit" size="small" onClick={() => setError(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            }
          >
            {error}
          </Alert>
        )}

        {tabValue === 0 && (
          <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', mb: 3, gap: 2 }}>
              <Box sx={{ display: 'flex', flex: 1, gap: { xs: 2, md: 4 }, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="h5" gutterBottom fontWeight={600} sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
                    Общий остаток товаров
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
                
                <Box sx={{ 
                  pl: { xs: 0, md: 4 }, 
                }}>
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

            <FilterSection
              users={users}
              categories={categories}
              products={products}
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
            />

            <SortSection
              sortBy={sortConfig.by}
              sortOrder={sortConfig.order}
              onSortChange={handleSortChange}
            />

            <InventoryTable
              items={filteredInventory}
              products={products}
              categories={categories}
              users={users}
              loading={loading}
              getUserFullName={getUserFullName}
              getCategoryName={getCategoryName}
              onReservedClick={handleReservedClick}
            />
          </Box>
        )}

        {tabValue === 1 && (
          <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              mb: 3, 
              alignItems: 'center',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 2, sm: 0 }
            }}>
              <Typography variant="h5" fontWeight={600} sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                Управление категориями
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  resetCategoryForm();
                  setCategoryDialogOpen(true);
                }}
                sx={{
                  ...iOSStyles.button,
                  width: { xs: '100%', sm: 'auto' },
                  whiteSpace: 'nowrap',
                  fontSize: { xs: '0.875rem', sm: '0.95rem' },
                  py: { xs: 1, sm: 0.75 },
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
                          <Box sx={{ mt: 1.5 }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              ID: {category.id}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Товаров: {products.filter(p => p.categoryId === category.id).length}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleEditCategory(category)}
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
                              setDeleteCategoryDialogOpen(true);
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
              {categories.length === 0 && (
                <Grid size={{ xs: 12 }}>
                  <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 1 }}>
                    <CategoryIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.2, mb: 2 }} />
                    <Typography color="text.secondary">
                      Категории еще не созданы. Создайте первую категорию.
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Диалог создания/редактирования категории */}
      <Dialog 
        open={categoryDialogOpen} 
        onClose={() => {
          setCategoryDialogOpen(false);
          resetCategoryForm();
        }}
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
        <DialogTitle sx={{ p: { xs: 2, sm: 2.5 }, pb: 1 }}>
          <Typography variant="h6" color="#2a0f35" fontWeight={600} sx={{ mb: 0.5, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            {isEditingCategory ? 'Редактировать категорию' : 'Создать новую категорию'}
          </Typography>
          <Typography variant="body2" color="#4c5454" sx={{ fontSize: { xs: '0.8rem', sm: '0.85rem' } }}>
            {isEditingCategory ? 'Измените информацию о категории' : 'Заполните информацию о новой категории'}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 2, sm: 2.5 }, pt: { xs: 1, sm: 2 } }}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="caption" color="#2a0f35" display="block" gutterBottom sx={{ fontWeight: 600, fontSize: { xs: '0.7rem', sm: '0.75rem' }, mb: 0.5 }}>
                НАЗВАНИЕ КАТЕГОРИИ
              </Typography>
              <TextField
                autoFocus
                fullWidth
                value={newCategory.name}
                onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                size="small"
                placeholder="Введите название категории"
                variant="outlined"
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
                ОПИСАНИЕ
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={newCategory.description}
                onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                size="small"
                placeholder="Введите описание категории (необязательно)"
                variant="outlined"
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
        <DialogActions sx={{ p: { xs: 2, sm: 2.5 }, pt: 1, gap: 1.5 }}>
          <Button
            onClick={() => {
              setCategoryDialogOpen(false);
              resetCategoryForm();
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
            onClick={isEditingCategory ? handleUpdateCategory : handleCreateCategory}
            disabled={!newCategory.name.trim()}
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
            {isEditingCategory ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог удаления категории */}
      <Dialog 
        open={deleteCategoryDialogOpen} 
        onClose={() => setDeleteCategoryDialogOpen(false)}
        PaperProps={{
          sx: iOSStyles.dialog,
        }}
      >
        <DialogTitle sx={{ p: 2.5, pb: 1 }}>
          <Typography variant="h6" color="#2a0f35" fontWeight={600} sx={{ mb: 0.5 }}>
            Удалить категорию
          </Typography>
          <Typography variant="body2" color="#4c5454" sx={{ fontSize: '0.85rem' }}>
            Вы уверены, что хотите удалить категорию "{categoryToDelete?.name}"?
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 2.5, pt: 2 }}>
          <Box sx={{
            p: 2,
            backgroundColor: 'rgba(211, 47, 47, 0.04)',
            borderRadius: 4,
            border: '1px solid rgba(211, 47, 47, 0.1)',
          }}>
            <Typography variant="caption" color="#4c5454" display="block" gutterBottom sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
              ВНИМАНИЕ
            </Typography>
            <Typography variant="body2" color="#d32f2f">
              Это действие нельзя отменить. Все связанные товары останутся в системе, но категория будет удалена.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}>
          <Button
            onClick={() => setDeleteCategoryDialogOpen(false)}
            sx={{
              borderRadius: 4,
              color: '#4c5454',
              px: 3,
              py: 1,
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 500,
            }}
          >
            Отмена
          </Button>
          <Button
            variant="contained"
            onClick={handleDeleteCategory}
            sx={{
              borderRadius: 4,
              backgroundColor: '#d32f2f',
              '&:hover': { backgroundColor: '#b71c1c' },
              px: 3,
              py: 1,
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 500,
            }}
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

      {/* Модалка с деталями резервов */}
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

      {/* Уведомление об успехе */}
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