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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Badge,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
} from '@mui/material';
import {
  Add,
  PhotoCamera,
  CheckCircle,
  Cancel,
  ArrowForward,
  ExpandMore,
  ExpandLess,
  Image,
  Error,
  Inventory,
  Person,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, MovementStatus, RejectionReason } from '../types';

interface Movement {
  id: number;
  fromSeller: string;
  fromSellerId: number;
  toSeller: string;
  toSellerId: number;
  products: Array<{
    id: string;
    name: string;
    quantity: number;
    category: string;
  }>;
  date: string;
  status: MovementStatus;
  photos: string[];
  rejectionReason?: RejectionReason;
  comment?: string;
  expanded?: boolean;
}

const MovementsPage: React.FC = () => {
  const { user } = useAuth();
  const [openNewMovementDialog, setOpenNewMovementDialog] = useState(false);
  const [openMovementDetails, setOpenMovementDetails] = useState<Movement | null>(null);
  const [openRejectionDialog, setOpenRejectionDialog] = useState<Movement | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [movementItems, setMovementItems] = useState([
    { id: '1', name: 'HQD Crystal Bar', currentStock: 50, quantity: 0, category: 'Одноразки' },
    { id: '2', name: 'Elf Bar 600', currentStock: 30, quantity: 0, category: 'Одноразки' },
    { id: '3', name: 'Juicy Bar 30ml', currentStock: 100, quantity: 0, category: 'Жидкости' },
  ]);
  const [movementPhotos, setMovementPhotos] = useState<File[]>([]);
  const [rejectionReason, setRejectionReason] = useState<RejectionReason | ''>('');
  const [rejectionComment, setRejectionComment] = useState('');
  const [movements, setMovements] = useState<Movement[]>([
    {
      id: 1,
      fromSeller: 'Иван Иванов',
      fromSellerId: 1,
      toSeller: 'Петр Петров',
      toSellerId: 2,
      products: [
        { id: '1', name: 'HQD Crystal Bar', quantity: 5, category: 'Одноразки' },
        { id: '2', name: 'Elf Bar 600', quantity: 3, category: 'Одноразки' },
      ],
      date: '2024-01-15 14:30',
      status: MovementStatus.PENDING,
      photos: ['photo1.jpg', 'photo2.jpg'],
    },
    {
      id: 2,
      fromSeller: 'Алексей Сидоров',
      fromSellerId: 3,
      toSeller: 'Мария Козлова',
      toSellerId: 4,
      products: [
        { id: '3', name: 'Juicy Bar 30ml', quantity: 10, category: 'Жидкости' },
      ],
      date: '2024-01-14 11:20',
      status: MovementStatus.APPROVED,
      photos: ['photo3.jpg'],
    },
    {
      id: 3,
      fromSeller: 'Дмитрий Новиков',
      fromSellerId: 5,
      toSeller: 'Ольга Смирнова',
      toSellerId: 6,
      products: [
        { id: '4', name: 'Pod System X', quantity: 2, category: 'Подики' },
      ],
      date: '2024-01-13 16:45',
      status: MovementStatus.REJECTED,
      photos: ['photo4.jpg', 'photo5.jpg', 'photo6.jpg'],
      rejectionReason: RejectionReason.DEFECTIVE,
      comment: 'Товар имеет внешние повреждения',
    },
  ]);

  const handleQuantityChange = (id: string, quantity: number) => {
    setMovementItems(items =>
      items.map(item =>
        item.id === id
          ? { ...item, quantity: Math.min(Math.max(0, quantity), item.currentStock) }
          : item
      )
    );
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newPhotos = Array.from(event.target.files);
      setMovementPhotos([...movementPhotos, ...newPhotos]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setMovementPhotos(movementPhotos.filter((_, i) => i !== index));
  };

  const handleSubmitMovement = () => {
    const selectedItems = movementItems.filter(item => item.quantity > 0);
    if (selectedItems.length === 0 || !selectedRecipient || movementPhotos.length === 0) {
      alert('Заполните все обязательные поля');
      return;
    }

    const newMovement: Movement = {
      id: movements.length + 1,
      fromSeller: user?.username || 'Вы',
      fromSellerId: user?.id || 0,
      toSeller: selectedRecipient,
      toSellerId: 999,
      products: selectedItems.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        category: item.category,
      })),
      date: new Date().toLocaleString('ru-RU'),
      status: MovementStatus.PENDING,
      photos: movementPhotos.map(p => p.name),
    };

    setMovements([newMovement, ...movements]);
    setOpenNewMovementDialog(false);
    resetForm();
  };

  const resetForm = () => {
    setMovementItems(items => items.map(item => ({ ...item, quantity: 0 })));
    setMovementPhotos([]);
    setSelectedRecipient('');
  };

  const handleApproveMovement = (movementId: number) => {
    setMovements(movements.map(m =>
      m.id === movementId ? { ...m, status: MovementStatus.APPROVED } : m
    ));
  };

  const handleOpenRejectionDialog = (movement: Movement) => {
    setOpenRejectionDialog(movement);
  };

  const handleRejectMovement = () => {
    if (!openRejectionDialog || !rejectionReason) return;

    setMovements(movements.map(m =>
      m.id === openRejectionDialog.id
        ? {
            ...m,
            status: MovementStatus.REJECTED,
            rejectionReason: rejectionReason as RejectionReason,
            comment: rejectionComment || undefined,
          }
        : m
    ));

    setOpenRejectionDialog(null);
    setRejectionReason('');
    setRejectionComment('');
  };

  const toggleMovementExpand = (movementId: number) => {
    setMovements(movements.map(m =>
      m.id === movementId ? { ...m, expanded: !m.expanded } : m
    ));
  };

  const getStatusChip = (status: MovementStatus, reason?: RejectionReason) => {
    const statusConfig = {
      [MovementStatus.PENDING]: { color: '#56b8d1', label: 'Ожидает', icon: <Inventory /> },
      [MovementStatus.APPROVED]: { color: '#3f1f4b', label: 'Подтверждено', icon: <CheckCircle /> },
      [MovementStatus.REJECTED]: { 
        color: '#ca0ec0', 
        label: getRejectionLabel(reason), 
        icon: <Cancel /> 
      },
      [MovementStatus.CANCELLED]: { color: '#4c5454', label: 'Отменено', icon: <Cancel /> },
    };

    const config = statusConfig[status];
    return (
      <Chip
        icon={config.icon}
        label={config.label}
        size="small"
        sx={{
          backgroundColor: `${config.color}15`,
          color: config.color,
          border: `1px solid ${config.color}30`,
          fontWeight: 500,
        }}
      />
    );
  };

  const getRejectionLabel = (reason?: RejectionReason) => {
    const labels = {
      [RejectionReason.DEFECTIVE]: 'Бракованный товар',
      [RejectionReason.INSUFFICIENT]: 'Недостаточно товара',
      [RejectionReason.ERROR]: 'Ошибка',
      [RejectionReason.OTHER]: 'Другое',
    };
    return reason ? `Отклонено: ${labels[reason]}` : 'Отклонено';
  };

  const mockRecipients = ['Петр Петров', 'Мария Козлова', 'Алексей Сидоров', 'Ольга Смирнова'];

  const pendingMovements = movements.filter(m => m.status === MovementStatus.PENDING);
  const otherMovements = movements.filter(m => m.status !== MovementStatus.PENDING);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, px: { xs: 1, sm: 2 } }}>
      <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Typography variant="h4" component="h1" color="#2a0f35">
            Перемещения товаров
          </Typography>
          <Typography variant="body1" color="#4c5454">
            Управление перемещением товаров между продавцами
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: { md: 'right' } }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenNewMovementDialog(true)}
            sx={{
              backgroundColor: '#2a436d',
              '&:hover': {
                backgroundColor: '#1a2d4a',
              },
            }}
          >
            Новое перемещение
          </Button>
        </Grid>
      </Grid>

      {/* Статистика */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#56b8d110', border: '1px solid #56b8d130' }}>
            <Typography variant="h5" color="#56b8d1">
              {pendingMovements.length}
            </Typography>
            <Typography variant="body2" color="#4c5454">
              Ожидают
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#3f1f4b10', border: '1px solid #3f1f4b30' }}>
            <Typography variant="h5" color="#3f1f4b">
              {movements.filter(m => m.status === MovementStatus.APPROVED).length}
            </Typography>
            <Typography variant="body2" color="#4c5454">
              Подтверждены
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#ca0ec010', border: '1px solid #ca0ec030' }}>
            <Typography variant="h5" color="#ca0ec0">
              {movements.filter(m => m.status === MovementStatus.REJECTED).length}
            </Typography>
            <Typography variant="body2" color="#4c5454">
              Отклонены
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#674fb610', border: '1px solid #674fb630' }}>
            <Typography variant="h5" color="#674fb6">
              {movements.length}
            </Typography>
            <Typography variant="body2" color="#4c5454">
              Всего
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Ожидающие перемещения */}
      {pendingMovements.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom color="#3f1f4b" sx={{ mb: 2 }}>
            Ожидают подтверждения
          </Typography>
          <Grid container spacing={2}>
            {pendingMovements.map((movement) => (
              <Grid size={{ xs: 12 }} key={movement.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Person sx={{ color: '#56b8d1', fontSize: 20 }} />
                          <Typography variant="subtitle1" sx={{ color: '#2a0f35', fontWeight: 600 }}>
                            От: {movement.fromSeller}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ArrowForward sx={{ color: '#2a436d', fontSize: 20 }} />
                          <Typography variant="subtitle1" sx={{ color: '#2a0f35', fontWeight: 600 }}>
                            Кому: {movement.toSeller}
                          </Typography>
                        </Box>
                      </Box>
                      {getStatusChip(movement.status)}
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="#4c5454" sx={{ mb: 1 }}>
                        Товары для перемещения:
                      </Typography>
                      <Grid container spacing={1}>
                        {movement.products.map((product, index) => (
                          <Grid size={{ xs: 12, sm: 6 }} key={index}>
                            <Paper sx={{ p: 1.5, backgroundColor: '#f5f3f6' }}>
                              <Typography variant="body2" sx={{ color: '#2a0f35', fontWeight: 500 }}>
                                {product.name}
                              </Typography>
                              <Typography variant="body2" color="#4c5454">
                                Количество: {product.quantity} шт.
                              </Typography>
                              <Typography variant="caption" color="#8a8a8a">
                                Категория: {product.category}
                              </Typography>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PhotoCamera sx={{ color: '#674fb6', fontSize: 20 }} />
                        <Typography variant="body2" color="#4c5454">
                          Фото: {movement.photos.length} шт.
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => setOpenMovementDetails(movement)}
                          sx={{ color: '#2a436d' }}
                        >
                          <Image />
                        </IconButton>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<CheckCircle />}
                          onClick={() => handleApproveMovement(movement.id)}
                          sx={{
                            backgroundColor: '#3f1f4b',
                            '&:hover': { backgroundColor: '#2a0f35' },
                          }}
                        >
                          Принять
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Cancel />}
                          onClick={() => handleOpenRejectionDialog(movement)}
                          sx={{
                            borderColor: '#ca0ec0',
                            color: '#ca0ec0',
                            '&:hover': {
                              borderColor: '#950090',
                              backgroundColor: 'rgba(202, 14, 192, 0.04)',
                            },
                          }}
                        >
                          Отклонить
                        </Button>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* История перемещений */}
      <Typography variant="h6" gutterBottom color="#3f1f4b" sx={{ mb: 2 }}>
        История перемещений
      </Typography>
      <Grid container spacing={2}>
        {otherMovements.map((movement) => (
          <Grid size={{ xs: 12 }} key={movement.id}>
            <Card>
              <CardContent>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => toggleMovementExpand(movement.id)}
                >
                  <Box>
                    <Typography variant="subtitle1" sx={{ color: '#2a0f35', fontWeight: 600 }}>
                      {movement.fromSeller} → {movement.toSeller}
                    </Typography>
                    <Typography variant="body2" color="#4c5454">
                      {movement.date}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {getStatusChip(movement.status, movement.rejectionReason)}
                    {movement.expanded ? <ExpandLess /> : <ExpandMore />}
                  </Box>
                </Box>

                <Collapse in={movement.expanded}>
                  <Box sx={{ mt: 2 }}>
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="body2" color="#4c5454" sx={{ mb: 1 }}>
                      Товары:
                    </Typography>
                    <List dense>
                      {movement.products.map((product, index) => (
                        <ListItem key={index} sx={{ px: 0 }}>
                          <ListItemIcon>
                            <Inventory sx={{ color: '#674fb6', fontSize: 20 }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={product.name}
                            secondary={`${product.quantity} шт. • ${product.category}`}
                          />
                        </ListItem>
                      ))}
                    </List>

                    {movement.rejectionReason && (
                      <Paper sx={{ p: 2, mt: 2, backgroundColor: '#ca0ec010', border: '1px solid #ca0ec030' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Error sx={{ color: '#ca0ec0' }} />
                          <Typography variant="subtitle2" sx={{ color: '#ca0ec0' }}>
                            Причина отказа: {getRejectionLabel(movement.rejectionReason)}
                          </Typography>
                        </Box>
                        {movement.comment && (
                          <Typography variant="body2" color="#4c5454">
                            {movement.comment}
                          </Typography>
                        )}
                      </Paper>
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                      <PhotoCamera sx={{ color: '#674fb6', fontSize: 20 }} />
                      <Typography variant="body2" color="#4c5454">
                        Фотографии: {movement.photos.length} шт.
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => setOpenMovementDetails(movement)}
                        sx={{ color: '#2a436d' }}
                      >
                        <Image />
                      </IconButton>
                    </Box>
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Диалог нового перемещения */}
      <Dialog
        open={openNewMovementDialog}
        onClose={() => setOpenNewMovementDialog(false)}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-paper': {
            m: { xs: 1, sm: 2 },
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle sx={{ backgroundColor: '#f5f3f6', color: '#2a0f35' }}>
          📦 Новое перемещение товара
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Выберите получателя</InputLabel>
                <Select
                  value={selectedRecipient}
                  label="Выберите получателя"
                  onChange={(e) => setSelectedRecipient(e.target.value)}
                >
                  {mockRecipients.map((recipient) => (
                    <MenuItem key={recipient} value={recipient}>
                      {recipient}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" gutterBottom color="#3f1f4b">
                Выберите товары для перемещения
              </Typography>
              {movementItems.map((item) => (
                <Paper key={item.id} sx={{ p: 1.5, mb: 1.5 }}>
                  <Grid container alignItems="center" spacing={1}>
                    <Grid size={{ xs: 12, sm: 8 }}>
                      <Typography variant="body2" sx={{ color: '#2a0f35', fontWeight: 500 }}>
                        {item.name}
                      </Typography>
                      <Typography variant="caption" color="#4c5454">
                        Доступно: {item.currentStock} шт. • {item.category}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Количество"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                        InputProps={{
                          inputProps: { min: 0, max: item.currentStock },
                        }}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" gutterBottom color="#3f1f4b">
                Фотографии товара
              </Typography>
              <Box sx={{ border: '2px dashed #d7d2d8', p: 2, borderRadius: 1 }}>
                <input
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  id="movement-photo-upload"
                  type="file"
                  onChange={handlePhotoUpload}
                />
                <label htmlFor="movement-photo-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<PhotoCamera />}
                    size="small"
                    sx={{
                      borderColor: '#2a436d',
                      color: '#2a436d',
                      mb: 1,
                    }}
                  >
                    Добавить фото товара
                  </Button>
                </label>
                <Typography variant="caption" display="block" sx={{ color: '#8a8a8a', mb: 2 }}>
                  Сделайте фото всего товара для перемещения.
                </Typography>
                
                {movementPhotos.length > 0 && (
                  <Grid container spacing={1}>
                    {movementPhotos.map((photo, index) => (
                      <Grid size={{ xs: 6, sm: 4 }} key={index}>
                        <Card variant="outlined">
                          <CardContent sx={{ p: 1, textAlign: 'center' }}>
                            <Typography variant="caption" noWrap fontSize={10}>
                              {photo.name.length > 15 ? photo.name.substring(0, 12) + '...' : photo.name}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => handleRemovePhoto(index)}
                              sx={{ color: '#ca0ec0', p: 0.5 }}
                            >
                              <Cancel fontSize="small" />
                            </IconButton>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setOpenNewMovementDialog(false)}
            sx={{ color: '#4c5454' }}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSubmitMovement}
            variant="contained"
            sx={{
              backgroundColor: '#2a436d',
              color: 'white',
              '&:hover': {
                backgroundColor: '#1a2d4a',
              },
            }}
          >
            Отправить накладную
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог просмотра фотографий */}
      <Dialog
        open={!!openMovementDetails}
        onClose={() => setOpenMovementDetails(null)}
        maxWidth="md"
        fullWidth
      >
        {openMovementDetails && (
          <>
            <DialogTitle sx={{ backgroundColor: '#f5f3f6', color: '#2a0f35' }}>
              📷 Фотографии перемещения
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" sx={{ color: '#4c5454', mb: 2 }}>
                Перемещение от {openMovementDetails.fromSeller} к {openMovementDetails.toSeller}
              </Typography>
              <Grid container spacing={2}>
                {openMovementDetails.photos.map((photo, index) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={index}>
                    <Card>
                      <CardContent sx={{ p: 2, textAlign: 'center' }}>
                        <Box sx={{ 
                          width: '100%', 
                          height: 200, 
                          backgroundColor: '#f5f3f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 1,
                        }}>
                          <Image sx={{ fontSize: 60, color: '#674fb6', opacity: 0.5 }} />
                        </Box>
                        <Typography variant="body2" color="#4c5454">
                          Фото {index + 1}: {photo}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenMovementDetails(null)} sx={{ color: '#4c5454' }}>
                Закрыть
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Диалог отказа от перемещения */}
      <Dialog
        open={!!openRejectionDialog}
        onClose={() => setOpenRejectionDialog(null)}
        maxWidth="sm"
        fullWidth
      >
        {openRejectionDialog && (
          <>
            <DialogTitle sx={{ backgroundColor: '#f5f3f6', color: '#2a0f35' }}>
              ❌ Отказ от перемещения
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" sx={{ color: '#4c5454', mb: 2 }}>
                Укажите причину отказа от перемещения товара от {openRejectionDialog.fromSeller}:
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Причина отказа</InputLabel>
                <Select
                  value={rejectionReason}
                  label="Причина отказа"
                  onChange={(e) => setRejectionReason(e.target.value as RejectionReason)}
                >
                  <MenuItem value={RejectionReason.DEFECTIVE}>Бракованный товар</MenuItem>
                  <MenuItem value={RejectionReason.INSUFFICIENT}>Недостаточно товара</MenuItem>
                  <MenuItem value={RejectionReason.ERROR}>Ошибочно или передумали делать перемещение</MenuItem>
                  <MenuItem value={RejectionReason.OTHER}>Другое</MenuItem>
                </Select>
              </FormControl>

              {rejectionReason === RejectionReason.DEFECTIVE && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="#4c5454" gutterBottom>
                    Опишите брак товара:
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Опишите подробно брак товара..."
                    value={rejectionComment}
                    onChange={(e) => setRejectionComment(e.target.value)}
                  />
                </Box>
              )}

              {rejectionReason === RejectionReason.INSUFFICIENT && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="#4c5454" gutterBottom>
                    Укажите, каких товаров не хватает:
                  </Typography>
                  <List>
                    {openRejectionDialog.products.map((product, index) => (
                      <ListItem key={index} sx={{ px: 0 }}>
                        <ListItemText
                          primary={product.name}
                          secondary={`Заявлено: ${product.quantity} шт.`}
                        />
                        <TextField
                          size="small"
                          type="number"
                          placeholder="Факт"
                          InputProps={{ inputProps: { min: 0 } }}
                          sx={{ width: 100 }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {rejectionReason === RejectionReason.ERROR && (
                <Typography variant="body2" color="#4c5454" sx={{ fontStyle: 'italic' }}>
                  Перемещение будет отменено без указания дополнительных причин.
                </Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setOpenRejectionDialog(null)}
                sx={{ color: '#4c5454' }}
              >
                Отмена
              </Button>
              <Button
                onClick={handleRejectMovement}
                disabled={!rejectionReason}
                sx={{
                  backgroundColor: '#ca0ec0',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: '#950090',
                  },
                  '&:disabled': {
                    backgroundColor: '#d7d2d8',
                  },
                }}
              >
                Отклонить перемещение
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default MovementsPage;