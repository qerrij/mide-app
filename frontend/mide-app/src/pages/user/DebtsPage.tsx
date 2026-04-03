import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  IconButton,
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
  Chip,
} from '@mui/material';
import {
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  History as HistoryIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { debtService } from '../../api/debtService';
import { productService } from '../../api/productService';
import { 
  UserDebtResponse, 
  DebtTransactionResponse, 
  DebtTransactionType,
  DebtAdjustmentType,
  DebtSummary,
  UserRole,
  Product,
  RevisionDebtDetails
} from '../../types';

const DebtsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myDebt, setMyDebt] = useState<UserDebtResponse | null>(null);
  const [allDebts, setAllDebts] = useState<DebtSummary[]>([]);
  const [selectedUser, setSelectedUser] = useState<DebtSummary | null>(null);
  const [selectedUserDebt, setSelectedUserDebt] = useState<UserDebtResponse | null>(null);
  const [loadingUserDebt, setLoadingUserDebt] = useState(false);
  const [transactionsDialog, setTransactionsDialog] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<DebtTransactionResponse[]>([]);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [adjustDialog, setAdjustDialog] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<DebtAdjustmentType>(DebtAdjustmentType.INCREASE);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustDescription, setAdjustDescription] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [productCache, setProductCache] = useState<Map<number, Product>>(new Map());

  const isOwner = user?.role === UserRole.OWNER;
  const isManager = user?.role && [UserRole.OWNER, UserRole.ADMIN, UserRole.SENIOR_SELLER, UserRole.MENTOR].includes(user.role);
  
  const showMyDebt = !isOwner;

  // Загрузка товара по ID и получение названия
  const getProductName = async (productId: number): Promise<string> => {
    if (productCache.has(productId)) {
      return productCache.get(productId)!.name;
    }
    try {
      const product = await productService.getProductById(productId);
      setProductCache(prev => new Map(prev).set(productId, product));
      return product.name;
    } catch (error) {
      console.error(`Error loading product ${productId}:`, error);
      return `Товар #${productId}`;
    }
  };

  // Обогащение транзакций названиями товаров
  const enrichTransactionsWithProductNames = async (transactions: DebtTransactionResponse[]): Promise<DebtTransactionResponse[]> => {
    const enriched = [...transactions];
    for (const transaction of enriched) {
      if (transaction.revision_details && transaction.revision_details.product_id) {
        const productName = await getProductName(transaction.revision_details.product_id);
        transaction.revision_details.product_name = productName;
      }
    }
    return enriched;
  };

  const loadMyDebt = async () => {
    if (!showMyDebt) return;
    try {
      const data = await debtService.getMyDebt();
      const enrichedTransactions = await enrichTransactionsWithProductNames(data.transactions);
      setMyDebt({ ...data, transactions: enrichedTransactions });
    } catch (err: any) {
      setError(err.message || 'Ошибка при загрузке долга');
    }
  };

  const loadAllDebts = async () => {
    try {
      const data = await debtService.getAllDebts();
      setAllDebts(data);
    } catch (err: any) {
      console.error('Error loading all debts:', err);
    }
  };

  const loadUserDebt = async (userId: number) => {
    try {
      setLoadingUserDebt(true);
      const data = await debtService.getUserDebt(userId);
      const enrichedTransactions = await enrichTransactionsWithProductNames(data.transactions);
      setSelectedUserDebt({ ...data, transactions: enrichedTransactions });
    } catch (err: any) {
      setError(err.message || 'Ошибка при загрузке долга пользователя');
    } finally {
      setLoadingUserDebt(false);
    }
  };

  const handleManualAdjust = async () => {
    if (!selectedUser) return;
    if (!adjustAmount || parseFloat(adjustAmount) <= 0) {
      setError('Введите корректную сумму');
      return;
    }
    if (!adjustDescription.trim()) {
      setError('Введите описание причины корректировки');
      return;
    }

    setAdjusting(true);
    try {
      await debtService.manualAdjustDebt(selectedUser.user_id, {
        adjustment_type: adjustmentType,
        amount: parseFloat(adjustAmount),
        description: adjustDescription,
      });
      
      await loadUserDebt(selectedUser.user_id);
      await loadAllDebts();
      
      setAdjustDialog(false);
      setAdjustAmount('');
      setAdjustDescription('');
      setAdjustmentType(DebtAdjustmentType.INCREASE);
      
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Ошибка при корректировке долга');
    } finally {
      setAdjusting(false);
    }
  };

  const handleViewTransactions = (transactions: DebtTransactionResponse[], userName: string) => {
    setSelectedTransactions(transactions);
    setSelectedUserName(userName);
    setTransactionsDialog(true);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await loadMyDebt();
      if (isManager) {
        await loadAllDebts();
      }
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadUserDebt(selectedUser.user_id);
    } else {
      setSelectedUserDebt(null);
    }
  }, [selectedUser]);

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

  const getTransactionIcon = (type: DebtTransactionType) => {
    if (type === DebtTransactionType.REVISION || type === DebtTransactionType.MANUAL_INCREASE) {
      return <TrendingDownIcon sx={{ fontSize: 18, color: '#f44336' }} />;
    }
    return <TrendingUpIcon sx={{ fontSize: 18, color: '#4caf50' }} />;
  };

  const getTransactionTypeText = (type: DebtTransactionType): string => {
    if (type === DebtTransactionType.REVISION) return 'Ревизия';
    if (type === DebtTransactionType.MANUAL_INCREASE) return 'Ручное увеличение';
    return 'Ручное уменьшение';
  };

  const getTransactionDescription = (transaction: DebtTransactionResponse): string => {
    if (transaction.transaction_type === DebtTransactionType.REVISION) {
      if (transaction.revision_details) {
        const details = transaction.revision_details;
        const productName = details.product_name || `Товар #${details.product_id}`;
        return `${details.quantity} шт. товара "${productName}" на сумму ${formatNumber(details.total)} ₽`;
      }
      return `Увеличение долга на ${formatNumber(transaction.amount_change)} ₽`;
    }
    if (transaction.transaction_type === DebtTransactionType.MANUAL_INCREASE) {
      return transaction.manual_description || 'Без описания';
    }
    return transaction.manual_description || 'Без описания';
  };

  const filteredUsers = allDebts.filter(u => 
    u.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) && 
    u.user_id !== user?.id
  );

  const currentDebt = selectedUserDebt || (showMyDebt ? myDebt : null);
  const hasDebt = currentDebt && currentDebt.total_amount > 0;
  const isLoadingDebt = selectedUser ? loadingUserDebt : false;

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
        
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                  ? `Долг: ${selectedUser.user_name}`
                  : showMyDebt ? 'Мой долг' : 'Долги сотрудников'}
              </Typography>
            </Box>
          </Box>
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

        {/* Блок с суммой долга и кнопками (только для выбранного пользователя и OWNER) */}
        {selectedUser && isOwner && (
          <Paper
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 3,
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="body2" color="#4c5454" gutterBottom>
                  Текущий долг
                </Typography>
                <Typography variant="h3" fontWeight={700} color={currentDebt && currentDebt.total_amount > 0 ? '#f44336' : '#4caf50'}>
                  {formatNumber(currentDebt?.total_amount || 0)} ₽
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setAdjustmentType(DebtAdjustmentType.INCREASE);
                    setAdjustDialog(true);
                  }}
                  sx={{
                    bgcolor: '#f44336',
                    borderRadius: 2,
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#d32f2f' }
                  }}
                >
                  Увеличить долг
                </Button>
                <Button
                  variant="contained"
                  startIcon={<RemoveIcon />}
                  onClick={() => {
                    setAdjustmentType(DebtAdjustmentType.DECREASE);
                    setAdjustDialog(true);
                  }}
                  sx={{
                    bgcolor: '#4caf50',
                    borderRadius: 2,
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#388e3c' }
                  }}
                >
                  Уменьшить долг
                </Button>
              </Box>
            </Box>
          </Paper>
        )}

        {/* Для не-OWNER показываем просто сумму долга */}
        {selectedUser && !isOwner && currentDebt && currentDebt.total_amount > 0 && (
          <Paper
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 3,
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" color="#4c5454" gutterBottom>
              Текущий долг
            </Typography>
            <Typography variant="h3" fontWeight={700} color="#f44336">
              {formatNumber(currentDebt.total_amount)} ₽
            </Typography>
          </Paper>
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
                Сотрудники с долгами
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
              {filteredUsers.map((debtor) => (
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
                            Долг: {formatNumber(debtor.total_amount)} ₽
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={`${formatNumber(debtor.total_amount)} ₽`}
                        size="small"
                        sx={{
                          backgroundColor: debtor.total_amount > 0 ? '#f4433615' : '#4caf5015',
                          color: debtor.total_amount > 0 ? '#f44336' : '#4caf50',
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
                  {searchTerm ? 'Ничего не найдено' : 'Нет сотрудников с долгами'}
                </Typography>
              )}
            </Stack>
          </Paper>
        )}

        {/* История транзакций - сетка карточек */}
        {isLoadingDebt ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress sx={{ color: '#674fb6' }} />
          </Box>
        ) : !currentDebt || currentDebt.transactions.length === 0 ? (
          <Paper
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 3,
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 12px rgba(106, 61, 122, 0.1)',
            }}
          >
            <Typography variant="h6" color="#2a0f35" fontWeight={500} gutterBottom>
              Нет истории операций
            </Typography>
            <Typography variant="body2" color="#4c5454">
              {hasDebt 
                ? 'Долг был создан, но история операций отсутствует'
                : 'Нет долгов и истории операций'}
            </Typography>
          </Paper>
        ) : (
          <>
            <Typography variant="subtitle1" fontWeight={600} color="#2a0f35" sx={{ mb: 2 }}>
              История операций
            </Typography>
            
            <Grid container spacing={2}>
              {currentDebt.transactions.map((transaction) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={transaction.id}>
                  <Card
                    sx={{
                      borderRadius: 3,
                      backgroundColor: '#ffffff',
                      boxShadow: '0 2px 8px rgba(106, 61, 122, 0.08)',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.2s',
                      '&:hover': { boxShadow: '0 4px 16px rgba(106, 61, 122, 0.12)' }
                    }}
                  >
                    <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getTransactionIcon(transaction.transaction_type)}
                          <Typography variant="subtitle2" fontWeight={600} color="#2a0f35">
                            {getTransactionTypeText(transaction.transaction_type)}
                          </Typography>
                        </Box>
                        <Typography 
                          variant="body2" 
                          fontWeight={700}
                          sx={{ color: transaction.amount_change > 0 ? '#f44336' : '#4caf50' }}
                        >
                          {transaction.amount_change > 0 ? '+' : ''}{formatNumber(transaction.amount_change)} ₽
                        </Typography>
                      </Box>
                      
                      {/* Описание - может быть разной длины */}
                      <Typography variant="body2" color="#4c5454" sx={{ mb: 1.5, flex: '1 0 auto' }}>
                        {getTransactionDescription(transaction)}
                      </Typography>
                      
                      {/* Блок с итогом и датой - всегда внизу */}
                      <Box sx={{ mt: 'auto' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                          <Typography variant="caption" color="#4c5454">
                            Итого: {formatNumber(transaction.new_total_amount)} ₽
                          </Typography>
                          <Typography variant="caption" color="#8E8E93">
                            {formatDate(transaction.created_at)}
                          </Typography>
                        </Box>
                        
                        {transaction.performed_by_name && (
                          <Typography variant="caption" color="#8E8E93" display="block" sx={{ mt: 1 }}>
                            Выполнил: {transaction.performed_by_name}
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </Container>

      {/* Диалог ручной корректировки долга */}
      <Dialog
        open={adjustDialog}
        onClose={() => setAdjustDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={600}>
            {adjustmentType === DebtAdjustmentType.INCREASE ? 'Увеличение долга' : 'Уменьшение долга'}
          </Typography>
          <IconButton onClick={() => setAdjustDialog(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="#4c5454">
              Пользователь: <strong>{selectedUser?.user_name}</strong>
              <br />
              Текущий долг: <strong>{formatNumber(selectedUserDebt?.total_amount || 0)} ₽</strong>
            </Typography>
            
            <TextField
              label="Сумма (₽)"
              type="number"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              fullWidth
              InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            
            <TextField
              label="Причина корректировки"
              value={adjustDescription}
              onChange={(e) => setAdjustDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
              placeholder="Например: штраф, бонус, возврат товара, списание и т.д."
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Stack>
        </DialogContent>
        
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setAdjustDialog(false)} sx={{ borderRadius: 2, textTransform: 'none' }}>
            Отмена
          </Button>
          <Button
            variant="contained"
            onClick={handleManualAdjust}
            disabled={adjusting || !adjustAmount || parseFloat(adjustAmount) <= 0 || !adjustDescription.trim()}
            sx={{
              bgcolor: adjustmentType === DebtAdjustmentType.INCREASE ? '#f44336' : '#4caf50',
              borderRadius: 2,
              textTransform: 'none',
              '&:hover': {
                bgcolor: adjustmentType === DebtAdjustmentType.INCREASE ? '#d32f2f' : '#388e3c'
              }
            }}
          >
            {adjusting ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Подтвердить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог со всеми транзакциями */}
      <Dialog
        open={transactionsDialog}
        onClose={() => setTransactionsDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              История операций
            </Typography>
            <Typography variant="body2" color="#4c5454">
              {selectedUserName}
            </Typography>
          </Box>
          <IconButton onClick={() => setTransactionsDialog(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          <Stack spacing={2}>
            {selectedTransactions.map((transaction) => (
              <Paper
                key={transaction.id}
                sx={{
                  p: 2.5,
                  backgroundColor: '#f5f3f6',
                  borderRadius: 2,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getTransactionIcon(transaction.transaction_type)}
                    <Typography variant="subtitle2" fontWeight={600} color="#2a0f35">
                      {getTransactionTypeText(transaction.transaction_type)}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      fontWeight={700}
                      sx={{ color: transaction.amount_change > 0 ? '#f44336' : '#4caf50' }}
                    >
                      {transaction.amount_change > 0 ? '+' : ''}{formatNumber(transaction.amount_change)} ₽
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="#4c5454">
                    {formatDate(transaction.created_at)}
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="#2a0f35" sx={{ mb: 1 }}>
                  {getTransactionDescription(transaction)}
                </Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                  <Typography variant="caption" color="#4c5454">
                    Итого: {formatNumber(transaction.new_total_amount)} ₽
                  </Typography>
                  {transaction.performed_by_name && (
                    <Typography variant="caption" color="#8E8E93">
                      Выполнил: {transaction.performed_by_name}
                    </Typography>
                  )}
                </Box>
              </Paper>
            ))}
          </Stack>
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