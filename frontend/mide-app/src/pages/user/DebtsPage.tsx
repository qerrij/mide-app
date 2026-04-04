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
  FormControl,
  MenuItem,
  Select,
  SelectChangeEvent,
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

// Компонент модалки для корректировки долга (стилизован под TransactionDialog)
interface DebtAdjustDialogProps {
  open: boolean;
  type: 'INCREASE' | 'DECREASE';
  userName: string;
  currentAmount: number;
  onClose: () => void;
  onConfirm: (amount: number, description: string) => Promise<void>;
}

// Компонент модалки для корректировки долга (стилизован под TransactionDialog)
interface DebtAdjustDialogProps {
  open: boolean;
  type: 'INCREASE' | 'DECREASE';
  userName: string;
  currentAmount: number;
  onClose: () => void;
  onConfirm: (amount: number, description: string) => Promise<void>;
}

const DebtAdjustDialog: React.FC<DebtAdjustDialogProps> = React.memo(({
  open,
  type,
  userName,
  currentAmount,
  onClose,
  onConfirm,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const isIncrease = type === 'INCREASE';
  
  // Проверка, что все поля заполнены корректно
  const isFormValid = () => {
    return amount && parseFloat(amount) > 0 && description.trim().length > 0;
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      if (!amount || parseFloat(amount) <= 0) {
        setError('Введите корректную сумму');
      } else if (!description.trim()) {
        setError('Введите описание причины корректировки');
      }
      return;
    }

    setError('');
    setLoading(true);

    try {
      await onConfirm(parseFloat(amount), description.trim());
      setAmount('');
      setDescription('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Ошибка при корректировке долга');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  // Сбрасываем форму при открытии/закрытии
  useEffect(() => {
    if (!open) {
      setError('');
      setAmount('');
      setDescription('');
    }
  }, [open]);

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('ru-RU').format(num);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: {
          borderRadius: 4,
          maxWidth: 520,
          width: '100%',
          m: 2,
          boxShadow: '0 8px 24px rgba(106, 61, 122, 0.15)',
        }
      }}
    >
      <DialogTitle sx={{ p: 2.5, pb: 1, pr: 6 }}>
        <Typography variant="h6" color="#2a0f35" fontWeight={600} sx={{ mb: 0.5 }}>
          {isIncrease ? 'Увеличение долга' : 'Уменьшение долга'}
        </Typography>
        <Typography variant="body2" color="#4c5454" sx={{ fontSize: '0.85rem' }}>
          {isIncrease 
            ? 'Ручное увеличение задолженности сотрудника' 
            : 'Ручное уменьшение задолженности сотрудника'}
        </Typography>
        <Chip
          size="small"
          label={userName}
          sx={{ mt: 1, backgroundColor: '#f0e6ff', color: '#674fb6' }}
        />
      </DialogTitle>
      
      <IconButton
        onClick={handleClose}
        sx={{
          position: 'absolute',
          right: 12,
          top: 12,
          color: '#8E8E93',
        }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent sx={{ p: 2.5, pt: 3 }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="caption" color="#4c5454" sx={{ mb: 0.5, display: 'block', fontWeight: 600, fontSize: '0.75rem' }}>
              ТЕКУЩИЙ ДОЛГ
            </Typography>
            <Typography variant="h5" fontWeight={600} color={currentAmount > 0 ? '#f44336' : '#4caf50'}>
              {formatNumber(currentAmount)} ₽
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="#4c5454" sx={{ mb: 0.5, display: 'block', fontWeight: 600, fontSize: '0.75rem' }}>
              СУММА
            </Typography>
            <TextField
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              fullWidth
              required
              disabled={loading}
              placeholder="0"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography sx={{ color: '#8E8E93', fontSize: 20, fontWeight: 500 }}>₽</Typography>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 4,
                  backgroundColor: '#f8f7fa',
                },
              }}
            />
          </Box>

          <Box>
            <Typography variant="caption" color="#4c5454" sx={{ mb: 0.5, display: 'block', fontWeight: 600, fontSize: '0.75rem' }}>
              ПРИЧИНА КОРРЕКТИРОВКИ
            </Typography>
            <TextField
              multiline
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              required
              disabled={loading}
              placeholder="Например: штраф, бонус, возврат товара, списание..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 4,
                  backgroundColor: '#f8f7fa',
                },
              }}
            />
          </Box>

          {error && (
            <Alert 
              severity="error"
              sx={{ 
                borderRadius: 4,
                backgroundColor: 'rgba(244, 67, 54, 0.08)',
              }}
            >
              {error}
            </Alert>
          )}

          {isIncrease && (
            <Alert 
              severity="info"
              sx={{ 
                borderRadius: 4,
                backgroundColor: 'rgba(103, 79, 182, 0.08)',
              }}
            >
              Увеличение долга создаст новую запись в истории операций
            </Alert>
          )}

          {!isIncrease && (
            <Alert 
              severity="warning"
              sx={{ 
                borderRadius: 4,
                backgroundColor: 'rgba(255, 152, 0, 0.08)',
              }}
            >
              Убедитесь, что сумма уменьшения не превышает текущий долг
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, pt: 1, gap: 1 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
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
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !isFormValid()}
          sx={{
            borderRadius: 4,
            backgroundColor: isIncrease ? '#f44336' : '#4caf50',
            '&:hover': {
              backgroundColor: isIncrease ? '#d32f2f' : '#388e3c',
            },
            '&.Mui-disabled': {
              backgroundColor: isIncrease ? '#ffcdd2' : '#c8e6c9',
              color: '#ffffff',
            },
            px: 3,
            py: 1,
            textTransform: 'none',
            fontSize: '0.95rem',
            fontWeight: 500,
            minWidth: 120,
          }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : (isIncrease ? 'Увеличить' : 'Уменьшить')}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

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
  const [adjustmentType, setAdjustmentType] = useState<'INCREASE' | 'DECREASE'>('INCREASE');
  const [productCache, setProductCache] = useState<Map<number, Product>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');

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

  const handleManualAdjust = async (amount: number, description: string) => {
    if (!selectedUser) return;
    
    await debtService.manualAdjustDebt(selectedUser.user_id, {
      adjustment_type: adjustmentType === 'INCREASE' ? DebtAdjustmentType.INCREASE : DebtAdjustmentType.DECREASE,
      amount: amount,
      description: description,
    });
    
    await loadUserDebt(selectedUser.user_id);
    await loadAllDebts();
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
{/* Блок с суммой долга и кнопками (только для выбранного пользователя и OWNER) */}
{selectedUser && isOwner && (
  <Paper
    elevation={0}
    sx={{
      p: 3,
      mb: 3,
      borderRadius: 8,
      backgroundColor: '#ffffff',
      border: '1px solid #f0f0f0',
    }}
  >
    <Grid container spacing={2} alignItems="center">
      <Grid size={{ xs: 12, md: 6 }}>
        <Typography variant="body2" color="#4c5454" gutterBottom>
          Текущий долг
        </Typography>
        <Typography variant="h3" fontWeight={700} color={currentDebt && currentDebt.total_amount > 0 ? '#f44336' : '#4caf50'}>
          {formatNumber(currentDebt?.total_amount || 0)} ₽
        </Typography>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          spacing={1.5}
          justifyContent={{ md: 'flex-end' }}
        >
          <Button
            onClick={() => {
              setAdjustmentType('INCREASE');
              setAdjustDialog(true);
            }}
            sx={{
              flex: 1,
              borderRadius: 8,
              backgroundColor: '#F0F0F0',
              color: '#f44336',
              textTransform: 'none',
              py: 1.5,
              justifyContent: 'flex-start',
              '&:hover': {
                backgroundColor: '#E8E8E8',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: '#f44336',
                  color: '#ffffff',
                }}
              >
                <AddIcon sx={{ fontSize: 18 }} />
              </Avatar>
              <Typography fontWeight={500}>Увеличить долг</Typography>
            </Box>
          </Button>
          <Button
            onClick={() => {
              setAdjustmentType('DECREASE');
              setAdjustDialog(true);
            }}
            sx={{
              flex: 1,
              borderRadius: 8,
              backgroundColor: '#F0F0F0',
              color: '#4caf50',
              textTransform: 'none',
              py: 1.5,
              justifyContent: 'flex-start',
              '&:hover': {
                backgroundColor: '#E8E8E8',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: '#4caf50',
                  color: '#ffffff',
                }}
              >
                <RemoveIcon sx={{ fontSize: 18 }} />
              </Avatar>
              <Typography fontWeight={500}>Уменьшить долг</Typography>
            </Box>
          </Button>
        </Stack>
      </Grid>
    </Grid>
  </Paper>
)}

        {/* Для не-OWNER показываем просто сумму долга */}
        {selectedUser && !isOwner && currentDebt && currentDebt.total_amount > 0 && (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 8,
              backgroundColor: '#ffffff',
              border: '1px solid #f0f0f0',
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
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 8,
              backgroundColor: '#ffffff',
              border: '1px solid #f0f0f0',
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
                  borderRadius: 8,
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
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    border: '1px solid #f0f0f0',
                    '&:hover': {
                      backgroundColor: '#f9f8fc',
                      transform: 'translateX(4px)',
                      borderColor: '#674fb6',
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
                          borderRadius: 6,
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
            elevation={0}
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 8,
              backgroundColor: '#ffffff',
              border: '1px solid #f0f0f0',
            }}
          >
            <HistoryIcon sx={{ fontSize: 48, color: '#d8d1e0', mb: 1 }} />
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
                      borderRadius: 8,
                      backgroundColor: '#ffffff',
                      border: '1px solid #f0f0f0',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.2s',
                      '&:hover': { 
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 24px rgba(106, 61, 122, 0.15)',
                        borderColor: '#674fb6',
                      }
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

      {/* Диалог ручной корректировки долга - новый стиль */}
      {selectedUser && (
        <DebtAdjustDialog
          open={adjustDialog}
          type={adjustmentType}
          userName={selectedUser.user_name}
          currentAmount={selectedUserDebt?.total_amount || 0}
          onClose={() => setAdjustDialog(false)}
          onConfirm={handleManualAdjust}
        />
      )}

      {/* Диалог со всеми транзакциями */}
      <Dialog
        open={transactionsDialog}
        onClose={() => setTransactionsDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ p: 2.5, pb: 1, pr: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={600} color="#2a0f35">
              История операций
            </Typography>
            <Typography variant="body2" color="#4c5454">
              {selectedUserName}
            </Typography>
          </Box>
          <IconButton onClick={() => setTransactionsDialog(false)} sx={{ color: '#8E8E93' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            {selectedTransactions.map((transaction) => (
              <Paper
                key={transaction.id}
                elevation={0}
                sx={{
                  p: 2.5,
                  backgroundColor: '#f5f3f6',
                  borderRadius: 4,
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
        
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button 
            onClick={() => setTransactionsDialog(false)} 
            sx={{ 
              borderRadius: 4,
              textTransform: 'none',
              px: 3,
              py: 1,
            }}
          >
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DebtsPage;