import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Radio,
  RadioGroup,
  FormControlLabel,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  IconButton,
  Stack,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Warning as WarningIcon,
  Close as CloseIcon,
  Visibility as ViewIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { transferService } from '../api/transferService';
import {
  TransferDetail,
  TransferDiscrepancyItem,
  getTransferStatusText,
  getTransferStatusColor,
} from '../types';

const VerifyDiscrepancyPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [transfer, setTransfer] = useState<TransferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [notes, setNotes] = useState('');
  
  const [viewImageOpen, setViewImageOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);

  useEffect(() => {
    loadTransfer();
  }, [id]);

  const loadTransfer = async () => {
    try {
      setLoading(true);
      const transferData = await transferService.getTransferById(Number(id));
      
      // Проверяем что перемещение требует проверки расхождений
      if (transferData.status !== 'CHECKING') {
        setConfirmDialogOpen(true);
        return;
      }
      
      // Проверяем что у перемещения есть расхождения
      if (!transferData.discrepancyItems || transferData.discrepancyItems.length === 0) {
        setConfirmDialogOpen(true);
        return;
      }
      
      setTransfer(transferData);
    } catch (error) {
      console.error('Error loading transfer:', error);
      setConfirmDialogOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!transfer) return;
    
    if (action === 'reject' && !notes.trim()) {
      // Показываем ошибку в модалке
      setConfirmDialogOpen(true);
      return;
    }
    
    setConfirmDialogOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (!transfer) return;
    
    if (action === 'reject' && !notes.trim()) {
      // Не отправляем, если нет причины для отклонения
      return;
    }
    
    try {
      setSubmitting(true);
      setConfirmDialogOpen(false);
      
      await transferService.approveDiscrepancy(Number(id), {
        approved: action === 'approve',
        notes: notes.trim() || undefined,
      });
      
      setSuccessDialogOpen(true);
      
    } catch (error: any) {
      console.error('Error verifying discrepancy:', error);
      setConfirmDialogOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setSuccessDialogOpen(false);
    navigate(`/movements/${id}`);
  };

  const handleErrorClose = () => {
    setConfirmDialogOpen(false);
    navigate('/movements');
  };

  const openImageDialog = (filePath: string) => {
    const imageUrl = `http://localhost:8000/uploads/${filePath}`;
    setSelectedImage(imageUrl);
    setViewImageOpen(true);
  };

  const closeImageDialog = () => {
    setViewImageOpen(false);
    setSelectedImage('');
  };

  const getTotalDiscrepancy = (items: TransferDiscrepancyItem[]) => {
    return items.reduce((sum, item) => sum + item.discrepancy, 0);
  };

  const getPositiveDiscrepancy = (items: TransferDiscrepancyItem[]) => {
    return items.filter(item => item.discrepancy > 0).reduce((sum, item) => sum + item.discrepancy, 0);
  };

  const getNegativeDiscrepancy = (items: TransferDiscrepancyItem[]) => {
    return items.filter(item => item.discrepancy < 0).reduce((sum, item) => sum + Math.abs(item.discrepancy), 0);
  };

  const getDiscrepancyFiles = () => {
    if (!transfer) return [];
    
    // Используем новое поле discrepancyFiles
    return transfer.discrepancyFiles || []; 
  };

  const isImageFile = (filename: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  };

  const getFileName = (filePath: string) => {
    return filePath.split('/').pop() || 'Файл';
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!transfer) {
    return null;
  }

  const discrepancyItems = transfer.discrepancyItems || [];
  const totalDiscrepancy = getTotalDiscrepancy(discrepancyItems);
  const positiveDiscrepancy = getPositiveDiscrepancy(discrepancyItems);
  const negativeDiscrepancy = getNegativeDiscrepancy(discrepancyItems);
  const discrepancyFiles = getDiscrepancyFiles();

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate(`/movements/${id}`)}
          sx={{ mb: 2 }}
        >
          Назад к перемещению
        </Button>
        
        <Typography variant="h4" component="h1" gutterBottom color="#2a0f35">
          Проверка расхождений
        </Typography>
        <Typography variant="subtitle1" color="#4c5454">
          Перемещение #{transfer.id}: {transfer.title}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
          <Chip
            label={getTransferStatusText(transfer.status)}
            sx={{
              backgroundColor: `${getTransferStatusColor(transfer.status)}20`,
              color: getTransferStatusColor(transfer.status),
            }}
          />
          <Typography variant="body2" color="textSecondary">
            Получатель: {transfer.toUserName}
          </Typography>
        </Box>
      </Box>

      {/* Блок 1: Сводка по расхождениям */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#2a0f35', mb: 3 }}>
          Сводка по расхождениям
        </Typography>
        
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color={totalDiscrepancy >= 0 ? '#4caf50' : '#f44336'}>
                  {totalDiscrepancy > 0 ? '+' : ''}{totalDiscrepancy}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Общая разница
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="#4caf50">
                  +{positiveDiscrepancy}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Излишек
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="#f44336">
                  -{negativeDiscrepancy}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Недостача
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="#ff9800">
                  {discrepancyItems.length}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Товаров с расхождениями
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Alert severity="warning" sx={{ mb: 3 }}>
          <strong>Внимание!</strong> Получатель отметил расхождения в полученном товаре. 
          Проверьте информацию ниже и примите решение.
        </Alert>
      </Paper>

      {/* Блок 2: Детальная информация по расхождениям */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#2a0f35', mb: 3 }}>
          Детальная информация по расхождениям
        </Typography>
        
        <TableContainer sx={{ mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Товар</TableCell>
                <TableCell align="right">Ожидалось</TableCell>
                <TableCell align="right">Получено</TableCell>
                <TableCell align="right">Разница</TableCell>
                <TableCell>Примечание</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {discrepancyItems.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Typography variant="body2">
                      {item.productName || `Товар #${item.productId}`}
                    </Typography>
                    {item.productSku && (
                      <Typography variant="caption" color="textSecondary">
                        {item.productSku}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">{item.expectedQuantity} шт.</TableCell>
                  <TableCell align="right">{item.actualQuantity} шт.</TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ 
                      color: item.discrepancy >= 0 ? '#4caf50' : '#f44336',
                      fontWeight: 600
                    }}>
                      {item.discrepancy > 0 ? '+' : ''}{item.discrepancy} шт.
                    </Typography>
                  </TableCell>
                  <TableCell>{item.notes || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Блок 3: Фотографии прикрепленные при расхождениях */}
      {discrepancyFiles.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#2a0f35', mb: 3 }}>
            Фотографии прикрепленные при расхождениях
          </Typography>
          
          <ImageList cols={4} gap={8} sx={{ mb: 2 }}>
            {discrepancyFiles.map((file, index) => {
              const fileName = getFileName(file);
              const isImage = isImageFile(fileName);
              
              return (
                <ImageListItem key={index}>
                  {isImage ? (
                    <Box
                      component="img"
                      src={`http://localhost:8000/uploads/${file}`}
                      alt={fileName}
                      loading="lazy"
                      sx={{
                        width: '100%',
                        height: 120,
                        objectFit: 'cover',
                        borderRadius: 1,
                        cursor: 'pointer',
                        '&:hover': {
                          opacity: 0.8,
                        },
                      }}
                      onClick={() => openImageDialog(file)}
                    />
                  ) : (
                    <Paper
                      sx={{
                        width: '100%',
                        height: 120,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 1,
                        bgcolor: '#f5f5f5',
                        p: 2,
                      }}
                    >
                      <WarningIcon sx={{ fontSize: 40, color: '#666', mb: 1 }} />
                      <Typography variant="caption" align="center" sx={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        width: '100%'
                      }}>
                        {fileName}
                      </Typography>
                    </Paper>
                  )}
                  <ImageListItemBar
                    position="top"
                    actionIcon={
                      <Stack direction="row" spacing={0.5}>
                        {isImage && (
                          <IconButton
                            size="small"
                            onClick={() => openImageDialog(file)}
                            sx={{ color: 'white', backgroundColor: 'rgba(0,0,0,0.5)' }}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                    }
                    actionPosition="right"
                  />
                  <Typography variant="caption" sx={{ 
                    display: 'block',
                    textAlign: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    px: 1
                  }}>
                    {fileName}
                  </Typography>
                </ImageListItem>
              );
            })}
          </ImageList>
          
          <Typography variant="caption" color="textSecondary">
            Нажмите на изображение для просмотра
          </Typography>
        </Paper>
      )}

      {/* Блок 4: Принятие решения */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#2a0f35', mb: 3 }}>
          Принятие решения
        </Typography>
        
        <RadioGroup
          value={action}
          onChange={(e) => setAction(e.target.value as 'approve' | 'reject')}
          sx={{ mb: 3 }}
        >
          <FormControlLabel
            value="approve"
            control={<Radio color="success" />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ApproveIcon sx={{ color: '#4caf50' }} />
                <span>Подтвердить расхождения и завершить перемещение</span>
              </Box>
            }
          />
          <FormControlLabel
            value="reject"
            control={<Radio color="error" />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <RejectIcon sx={{ color: '#f44336' }} />
                <span>Отклонить расхождения и вернуть товары</span>
              </Box>
            }
          />
        </RadioGroup>

        <Typography variant="subtitle1" gutterBottom sx={{ color: '#2a0f35' }}>
          Комментарий {action === 'reject' && '(обязательно для отклонения)'}
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder={action === 'approve' ? "Объясните ваше решение (необязательно)..." : "Обязательно укажите причину отклонения..."}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          sx={{ mb: 3 }}
          error={action === 'reject' && !notes.trim()}
          helperText={action === 'reject' && !notes.trim() ? "Для отклонения необходимо указать причину" : ""}
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            onClick={() => navigate(`/movements/${id}`)}
            disabled={submitting}
          >
            Отмена
          </Button>
          
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting || (action === 'reject' && !notes.trim())}
            sx={{
              backgroundColor: action === 'approve' ? '#4caf50' : '#f44336',
              '&:hover': {
                backgroundColor: action === 'approve' ? '#388e3c' : '#d32f2f',
              },
            }}
            startIcon={action === 'approve' ? <ApproveIcon /> : <RejectIcon />}
          >
            {submitting ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              action === 'approve' ? 'Подтвердить расхождения' : 'Отклонить расхождения'
            )}
          </Button>
        </Box>
      </Paper>

      {/* Модалка просмотра изображения */}
      <Dialog
        open={viewImageOpen}
        onClose={closeImageDialog}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Просмотр изображения</Typography>
            <IconButton onClick={closeImageDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedImage && (
            <Box
              component="img"
              src={selectedImage}
              alt="Просмотр"
              sx={{
                width: '100%',
                height: 'auto',
                maxHeight: '70vh',
                objectFit: 'contain',
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeImageDialog} color="primary">
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>

      {/* Модалка подтверждения */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {transfer ? 'Подтверждение решения' : 'Ошибка'}
        </DialogTitle>
        <DialogContent>
          {transfer ? (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Вы уверены, что хотите <strong>{action === 'approve' ? 'подтвердить' : 'отклонить'}</strong> расхождения?
              </Typography>
              
              {action === 'reject' && !notes.trim() ? (
                <Alert severity="error" sx={{ mt: 2 }}>
                  Для отклонения расхождений необходимо указать причину в комментарии.
                </Alert>
              ) : (
                <>
                  {action === 'approve' ? (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Товары будут списаны по фактическим количествам, перемещение будет завершено.
                    </Alert>
                  ) : (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      Все товары будут возвращены отправителю, перемещение будет отменено.
                    </Alert>
                  )}
                </>
              )}
            </Box>
          ) : (
            <Typography variant="body1">
              Это перемещение не требует проверки расхождений или не найдено.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          {transfer ? (
            <>
              <Button onClick={() => setConfirmDialogOpen(false)} variant="outlined">
                Отмена
              </Button>
              <Button
                onClick={handleConfirmSubmit}
                variant="contained"
                color={action === 'approve' ? 'success' : 'error'}
                disabled={submitting || (action === 'reject' && !notes.trim())}
              >
                {submitting ? 'Обработка...' : 'Подтвердить'}
              </Button>
            </>
          ) : (
            <Button onClick={handleErrorClose} variant="contained">
              Закрыть
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Модалка успешного завершения */}
      <Dialog
        open={successDialogOpen}
        onClose={handleSuccessClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {action === 'approve' ? 'Расхождения подтверждены' : 'Расхождения отклонены'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircleIcon sx={{ fontSize: 60, color: action === 'approve' ? '#4caf50' : '#f44336', mb: 2 }} />
            <Typography variant="body1" sx={{ mb: 2 }}>
              {action === 'approve' 
                ? 'Расхождения успешно подтверждены. Перемещение завершено.' 
                : 'Расхождения отклонены. Товары возвращены отправителю.'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleSuccessClose} variant="contained" color="primary" fullWidth>
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default VerifyDiscrepancyPage;