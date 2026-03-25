import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Collapse,
  Divider,
  Stack,
  Alert,
  CircularProgress,
  Paper,
  Avatar,
  TextField,
  InputAdornment,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  History as HistoryIcon,
  Inventory as InventoryIcon,
  AttachMoney as MoneyIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { debtService } from '../../api/debtService';
import { UserDebtsResponse, DebtItem, DebtHistoryItem, UserRole } from '../../types';

interface UserDebtSummary {
  user_id: number;
  user_name: string;
  user_role?: string;
  total_quantity: number;
  total_cost: number;
}

const DebtsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myDebts, setMyDebts] = useState<UserDebtsResponse | null>(null);
  const [allDebts, setAllDebts] = useState<UserDebtSummary[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDebtSummary | null>(null);
  const [selectedUserDebts, setSelectedUserDebts] = useState<UserDebtsResponse | null>(null);
  const [loadingUserDebts, setLoadingUserDebts] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
  const [transactionsDialog, setTransactionsDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<DebtItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const isManager = user?.role && [UserRole.OWNER, UserRole.ADMIN, UserRole.SENIOR_SELLER, UserRole.MENTOR].includes(user.role);

  // Загрузка моих долгов
  const loadMyDebts = async () => {
    try {
      const data = await debtService.getMyDebts();
      setMyDebts(data);
    } catch (err: any) {
      setError(err.message || 'Ошибка при загрузке долгов');
    }
  };

  // Загрузка всех долгов (для руководителей)
  const loadAllDebts = async () => {
    try {
      const data = await debtService.getAllDebts();
      setAllDebts(data);
    } catch (err: any) {
      console.error('Error loading all debts:', err);
    }
  };

  // Загрузка детальных долгов пользователя
  const loadUserDebts = async (userId: number) => {
    try {
      setLoadingUserDebts(true);
      const data = await debtService.getUserDebts(userId);
      setSelectedUserDebts(data);
    } catch (err: any) {
      setError(err.message || 'Ошибка при загрузке долгов пользователя');
    } finally {
      setLoadingUserDebts(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await loadMyDebts();
      if (isManager) {
        await loadAllDebts();
      }
      setLoading(false);
    };
    loadData();
  }, []);

  // При выборе пользователя загружаем его долги
  useEffect(() => {
    if (selectedUser) {
      loadUserDebts(selectedUser.user_id);
    } else {
      setSelectedUserDebts(null);
    }
  }, [selectedUser]);

  const handleViewTransactions = (product: DebtItem) => {
    setSelectedProduct(product);
    setTransactionsDialog(true);
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  // Фильтрация пользователей для руководителя (исключаем самого себя)
  const filteredUsers = allDebts.filter(u => 
    u.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) && 
    u.user_id !== user?.id
  );

  // Текущие отображаемые долги
  const currentDebts = selectedUserDebts || myDebts;
  const hasDebts = currentDebts && currentDebts.total_quantity > 0;
  const isLoadingDebts = selectedUser ? loadingUserDebts : false;

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

  return (
    <Box sx={{ minHeight: '100vh', py: 3, backgroundColor: '#f5f3f6' }}>
      <Container maxWidth="lg" sx={{ px: { xs: 1, sm: 3, md: 4 } }}>
        
        {/* Шапка */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            {selectedUser && (
              <IconButton 
                onClick={() => setSelectedUser(null)}
                sx={{ 
                  bgcolor: '#f5f3f6',
                  '&:hover': { bgcolor: '#e9e6f0' }
                }}
              >
                <ArrowBackIcon sx={{ color: '#674fb6' }} />
              </IconButton>
            )}
            <Typography variant="h5" component="h1" color="#2a0f35" fontWeight={600}>
              {selectedUser 
                ? `Долги: ${selectedUser.user_name}`
                : 'Мои долги'
              }
            </Typography>
          </Box>
          {currentDebts && (
            <Typography variant="body2" color="#4c5454">
              {hasDebts 
                ? `Всего в долге ${currentDebts.total_quantity} шт. на сумму ${formatNumber(currentDebts.total_cost)} ₽`
                : 'Нет активных долгов'}
            </Typography>
          )}
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3, borderRadius: 3 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Статистика */}
        {hasDebts && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6 }}>
              <Paper
                sx={{
                  p: 2,
                  borderRadius: 3,
                  backgroundColor: '#ffffff',
                  boxShadow: '0 2px 8px rgba(106, 61, 122, 0.08)',
                  textAlign: 'center',
                }}
              >
                <InventoryIcon sx={{ fontSize: 28, color: '#674fb6', mb: 0.5 }} />
                <Typography variant="h4" fontWeight={700} color="#2a0f35">
                  {formatNumber(currentDebts.total_quantity)}
                </Typography>
                <Typography variant="caption" color="#4c5454">
                  единиц в долге
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Paper
                sx={{
                  p: 2,
                  borderRadius: 3,
                  backgroundColor: '#ffffff',
                  boxShadow: '0 2px 8px rgba(106, 61, 122, 0.08)',
                  textAlign: 'center',
                }}
              >
                <MoneyIcon sx={{ fontSize: 28, color: '#674fb6', mb: 0.5 }} />
                <Typography variant="h4" fontWeight={700} color="#2a0f35">
                  {formatNumber(currentDebts.total_cost)} ₽
                </Typography>
                <Typography variant="caption" color="#4c5454">
                  общая сумма
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* Для руководителей - список подчиненных */}
        {isManager && !selectedUser && (
          <Paper
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 3,
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
            }}
          >
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} color="#2a0f35">
                Подчиненные с долгами
              </Typography>
              <Typography variant="caption" color="#4c5454">
                {filteredUsers.length} человек
              </Typography>
            </Box>

            <TextField
              fullWidth
              placeholder="Поиск по имени..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#8E8E93' }} />
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: 3,
                  backgroundColor: '#f5f3f6',
                  '& fieldset': { border: 'none' }
                }
              }}
              sx={{ mb: 2 }}
            />

            <Stack spacing={1}>
              {filteredUsers.map((debtor: UserDebtSummary) => (
                <Card
                  key={debtor.user_id}
                  onClick={() => setSelectedUser(debtor)}
                  sx={{
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: '#f9f8fc',
                      transform: 'translateX(4px)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 44, height: 44, bgcolor: '#674fb6' }}>
                          {debtor.user_name?.charAt(0)?.toUpperCase() || 'П'}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" fontWeight={500} color="#2a0f35">
                            {debtor.user_name}
                          </Typography>
                          <Typography variant="caption" color="#4c5454">
                            {debtor.total_quantity} шт. • {formatNumber(debtor.total_cost)} ₽
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={`${debtor.total_quantity} шт.`}
                        size="small"
                        sx={{
                          backgroundColor: '#f4433615',
                          color: '#f44336',
                          fontWeight: 500,
                          borderRadius: 2,
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              ))}
              {filteredUsers.length === 0 && (
                <Typography variant="body2" color="#4c5454" textAlign="center" py={3}>
                  {searchTerm ? 'Ничего не найдено' : 'Нет подчиненных с долгами'}
                </Typography>
              )}
            </Stack>
          </Paper>
        )}

        {/* Список долгов (карточки товаров) */}
        {isLoadingDebts ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress sx={{ color: '#674fb6' }} />
          </Box>
        ) : !hasDebts ? (
          <Paper
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 3,
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
            }}
          >
            <TrendingUpIcon sx={{ fontSize: 64, color: '#4caf50', mb: 2 }} />
            <Typography variant="h6" color="#2a0f35" fontWeight={500} gutterBottom>
              Нет долгов
            </Typography>
            <Typography variant="body2" color="#4c5454">
              Все остатки соответствуют инвентарю
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {currentDebts.items?.map((item: DebtItem) => {
              const isExpanded = expandedProduct === item.product_id;

              return (
                <Card
                  key={item.product_id}
                  sx={{
                    borderRadius: 3,
                    backgroundColor: '#ffffff',
                    boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: '0 8px 24px rgba(106, 61, 122, 0.15)',
                    },
                    border: '1px solid rgba(244, 67, 54, 0.2)',
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    {/* Заголовок товара */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight={600} color="#2a0f35">
                          {item.product_name}
                        </Typography>
                        <Typography variant="caption" color="#4c5454">
                          {item.product_sku}
                        </Typography>
                      </Box>
                      <Chip
                        label={`${item.quantity} шт.`}
                        size="small"
                        sx={{
                          backgroundColor: '#f4433615',
                          color: '#f44336',
                          fontWeight: 600,
                          borderRadius: 2,
                        }}
                      />
                    </Box>

                    <Divider sx={{ my: 1.5, opacity: 0.1 }} />

                    {/* Информация о долге */}
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 4 }}>
                        <Typography variant="caption" color="#4c5454" display="block">
                          Количество
                        </Typography>
                        <Typography variant="h6" fontWeight={700} color="#f44336">
                          {item.quantity} шт.
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 4 }}>
                        <Typography variant="caption" color="#4c5454" display="block">
                          Сумма
                        </Typography>
                        <Typography variant="h6" fontWeight={700} color="#f44336">
                          {formatNumber(item.total_cost)} ₽
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 4 }}>
                        <Typography variant="caption" color="#4c5454" display="block">
                          Цена за шт.
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {formatNumber(item.product_price)} ₽
                        </Typography>
                      </Grid>
                    </Grid>

                    {/* Кнопки действий */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                      {item.history && item.history.length > 0 && (
                        <Button
                          variant="text"
                          size="small"
                          startIcon={<HistoryIcon />}
                          onClick={() => handleViewTransactions(item)}
                          sx={{
                            borderRadius: 2,
                            color: '#674fb6',
                            textTransform: 'none',
                            '&:hover': {
                              backgroundColor: 'rgba(103, 79, 182, 0.04)',
                            },
                          }}
                        >
                          История ({item.history.length})
                        </Button>
                      )}
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => setExpandedProduct(isExpanded ? null : item.product_id)}
                        sx={{
                          borderRadius: 2,
                          color: '#4c5454',
                          textTransform: 'none',
                        }}
                      >
                        {isExpanded ? 'Скрыть' : 'Подробнее'}
                        {isExpanded ? <ExpandLessIcon sx={{ ml: 0.5 }} /> : <ExpandMoreIcon sx={{ ml: 0.5 }} />}
                      </Button>
                    </Box>

                    {/* Детальная история */}
                    <Collapse in={isExpanded}>
                      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                        <Typography variant="subtitle2" color="#2a0f35" fontWeight={600} gutterBottom>
                          История изменений
                        </Typography>
                        <Stack spacing={1.5}>
                          {item.history?.slice().reverse().map((historyItem: DebtHistoryItem, idx: number) => (
                            <Paper
                              key={idx}
                              sx={{
                                p: 1.5,
                                backgroundColor: '#f5f3f6',
                                borderRadius: 2,
                              }}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {historyItem.change > 0 ? (
                                    <TrendingDownIcon sx={{ fontSize: 16, color: '#f44336' }} />
                                  ) : (
                                    <TrendingUpIcon sx={{ fontSize: 16, color: '#4caf50' }} />
                                  )}
                                  <Typography variant="caption" fontWeight={600} color={historyItem.change > 0 ? '#f44336' : '#4caf50'}>
                                    {historyItem.change > 0 ? `+${historyItem.change}` : `${historyItem.change}`} шт.
                                  </Typography>
                                  <Typography variant="caption" color="#4c5454">
                                    → {historyItem.new_quantity} шт.
                                  </Typography>
                                </Box>
                                <Typography variant="caption" color="#4c5454">
                                  {formatDate(historyItem.timestamp)}
                                </Typography>
                              </Box>
                              <Typography variant="caption" color="#4c5454" display="block">
                                {historyItem.description}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                                <Typography variant="caption" color="#4c5454">
                                  Сумма: {historyItem.cost_change > 0 ? '+' : ''}{formatNumber(historyItem.cost_change)} ₽
                                </Typography>
                                <Typography variant="caption" color="#4c5454">
                                  Итого: {formatNumber(historyItem.new_total_cost)} ₽
                                </Typography>
                              </Box>
                            </Paper>
                          ))}
                        </Stack>
                      </Box>
                    </Collapse>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </Container>

      {/* Диалог с историей транзакций по товару */}
      <Dialog
        open={transactionsDialog}
        onClose={() => setTransactionsDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              История долга
            </Typography>
            {selectedProduct && (
              <Typography variant="body2" color="#4c5454">
                {selectedProduct.product_name}
              </Typography>
            )}
          </Box>
          <IconButton onClick={() => setTransactionsDialog(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedProduct && (
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', gap: 2, p: 2, backgroundColor: '#f5f3f6', borderRadius: 2 }}>
                <Box>
                  <Typography variant="caption" color="#4c5454">Текущий долг</Typography>
                  <Typography variant="h5" fontWeight={700} color="#f44336">
                    {selectedProduct.quantity} шт.
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="#4c5454">Сумма</Typography>
                  <Typography variant="h5" fontWeight={700} color="#f44336">
                    {formatNumber(selectedProduct.total_cost)} ₽
                  </Typography>
                </Box>
              </Box>

              <Typography variant="subtitle2" fontWeight={600}>
                Все изменения
              </Typography>
              
              <Stack spacing={1.5}>
                {selectedProduct.history?.slice().reverse().map((historyItem: DebtHistoryItem, idx: number) => (
                  <Paper
                    key={idx}
                    sx={{
                      p: 2,
                      backgroundColor: '#f5f3f6',
                      borderRadius: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {historyItem.change > 0 ? (
                          <TrendingDownIcon sx={{ fontSize: 18, color: '#f44336' }} />
                        ) : (
                          <TrendingUpIcon sx={{ fontSize: 18, color: '#4caf50' }} />
                        )}
                        <Typography variant="body2" fontWeight={600} color={historyItem.change > 0 ? '#f44336' : '#4caf50'}>
                          {historyItem.change > 0 ? `+${historyItem.change}` : `${historyItem.change}`} шт.
                        </Typography>
                        <Typography variant="body2" color="#4c5454">
                          → {historyItem.new_quantity} шт.
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="#4c5454">
                        {formatDate(historyItem.timestamp)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="#2a0f35" gutterBottom>
                      {historyItem.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
                      <Typography variant="caption" color="#4c5454">
                        Изменение: {historyItem.cost_change > 0 ? '+' : ''}{formatNumber(historyItem.cost_change)} ₽
                      </Typography>
                      <Typography variant="caption" color="#4c5454">
                        Итого: {formatNumber(historyItem.new_total_cost)} ₽
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransactionsDialog(false)} sx={{ borderRadius: 2, textTransform: 'none' }}>
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DebtsPage;