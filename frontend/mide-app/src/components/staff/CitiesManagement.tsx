import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Refresh,
  LocationOn,
  Close as CloseIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { cityService, City, CityCreate, CityUpdate } from '../../api/cityService';

interface CitiesManagementProps {
  onSuccess?: () => void;
}

const CitiesManagement: React.FC<CitiesManagementProps> = ({ onSuccess }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState<City | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState<City | null>(null);
  
  const [newCity, setNewCity] = useState<CityCreate>({
    name: '',
    region: '',
  });
  
  const [editCity, setEditCity] = useState<CityUpdate>({});
  
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });
  
  const loadCities = async () => {
    setLoading(true);
    try {
      const data = await cityService.getAllCities();
      setCities(data);
    } catch (error: any) {
      console.error('Ошибка при загрузке городов:', error);
      showSnackbar(
        error.response?.data?.detail || 'Ошибка при загрузке городов',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadCities();
  }, []);
  
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  const handleCreateCity = async () => {
    if (!newCity.name.trim()) {
      showSnackbar('Название города обязательно', 'error');
      return;
    }
    
    setLoading(true);
    try {
      await cityService.createCity(newCity);
      showSnackbar('Город успешно создан', 'success');
      setOpenCreateDialog(false);
      setNewCity({ name: '', region: '' });
      await loadCities();
      onSuccess?.();
    } catch (error: any) {
      console.error('Ошибка при создании города:', error);
      showSnackbar(
        error.response?.data?.detail || 'Ошибка при создании города',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateCity = async () => {
    if (!openEditDialog) return;
    
    if (editCity.name !== undefined && !editCity.name.trim()) {
      showSnackbar('Название города не может быть пустым', 'error');
      return;
    }
    
    setLoading(true);
    try {
      await cityService.updateCity(openEditDialog.id, editCity);
      showSnackbar('Город успешно обновлен', 'success');
      setOpenEditDialog(null);
      setEditCity({});
      await loadCities();
      onSuccess?.();
    } catch (error: any) {
      console.error('Ошибка при обновлении города:', error);
      showSnackbar(
        error.response?.data?.detail || 'Ошибка при обновлении города',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteCity = async () => {
    if (!openDeleteDialog) return;
    
    setLoading(true);
    try {
      await cityService.deleteCity(openDeleteDialog.id);
      showSnackbar('Город успешно удален', 'success');
      setOpenDeleteDialog(null);
      await loadCities();
      onSuccess?.();
    } catch (error: any) {
      console.error('Ошибка при удалении города:', error);
      showSnackbar(
        error.response?.data?.detail || 'Ошибка при удалении города',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" fontWeight={600} color="#2a0f35">
            Управление городами
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenCreateDialog(true)}
            sx={{
              borderRadius: 6,
              textTransform: 'none',
              fontWeight: 600,
              backgroundColor: '#4caf50',
              '&:hover': { backgroundColor: '#45a049' },
            }}
            disabled={loading}
          >
            Добавить город
          </Button>
        </Box>
        
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Название</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Регион/Область</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Статус</TableCell>
                <TableCell sx={{ fontWeight: 600, width: 100 }}>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && cities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : cities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      Нет добавленных городов
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                cities.map((city) => (
                  <TableRow key={city.id}>
                    <TableCell>{city.id}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOn sx={{ fontSize: 18, color: '#4caf50' }} />
                        <Typography fontWeight={500}>{city.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{city.region || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={city.isActive ? 'Активен' : 'Неактивен'}
                        size="small"
                        sx={{
                          backgroundColor: city.isActive
                            ? alpha('#4caf50', 0.1)
                            : alpha('#f44336', 0.1),
                          color: city.isActive ? '#4caf50' : '#f44336',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Редактировать" arrow>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setOpenEditDialog(city);
                              setEditCity({
                                name: city.name,
                                region: city.region,
                                isActive: city.isActive,
                              });
                            }}
                            disabled={loading}
                          >
                            <Edit sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Удалить" arrow>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setOpenDeleteDialog(city)}
                            disabled={loading}
                          >
                            <Delete sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      
      {/* Диалог создания города */}
      <Dialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Добавить город</Typography>
            <IconButton onClick={() => setOpenCreateDialog(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Название города"
              fullWidth
              required
              value={newCity.name}
              onChange={(e) => setNewCity({ ...newCity, name: e.target.value })}
              placeholder="Например: Москва"
              helperText="Обязательное поле"
            />
            <TextField
              label="Регион/Область"
              fullWidth
              value={newCity.region || ''}
              onChange={(e) => setNewCity({ ...newCity, region: e.target.value })}
              placeholder="Например: Московская область"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setOpenCreateDialog(false)} disabled={loading}>
            Отмена
          </Button>
          <Button
            onClick={handleCreateCity}
            variant="contained"
            disabled={!newCity.name.trim() || loading}
            sx={{ backgroundColor: '#4caf50', '&:hover': { backgroundColor: '#45a049' } }}
          >
            {loading ? <CircularProgress size={24} /> : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Диалог редактирования города */}
      <Dialog
        open={!!openEditDialog}
        onClose={() => setOpenEditDialog(null)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Редактировать город</Typography>
            <IconButton onClick={() => setOpenEditDialog(null)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Название города"
              fullWidth
              value={editCity.name || ''}
              onChange={(e) => setEditCity({ ...editCity, name: e.target.value })}
            />
            <TextField
              label="Регион/Область"
              fullWidth
              value={editCity.region || ''}
              onChange={(e) => setEditCity({ ...editCity, region: e.target.value })}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2">Активен:</Typography>
              <Button
                variant={editCity.isActive ? 'contained' : 'outlined'}
                onClick={() => setEditCity({ ...editCity, isActive: !editCity.isActive })}
                sx={{
                  minWidth: 80,
                  backgroundColor: editCity.isActive ? '#4caf50' : 'transparent',
                  borderColor: '#4caf50',
                  color: editCity.isActive ? 'white' : '#4caf50',
                  '&:hover': {
                    backgroundColor: editCity.isActive ? '#45a049' : alpha('#4caf50', 0.1),
                  },
                }}
              >
                {editCity.isActive ? 'Активен' : 'Неактивен'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setOpenEditDialog(null)} disabled={loading}>
            Отмена
          </Button>
          <Button
            onClick={handleUpdateCity}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Диалог удаления города */}
      <Dialog
        open={!!openDeleteDialog}
        onClose={() => setOpenDeleteDialog(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ color: '#f44336' }}>
          Подтверждение удаления
        </DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите удалить город "{openDeleteDialog?.name}"?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            Внимание! Если к этому городу привязаны пользователи или товары,
            удаление будет невозможно.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(null)} disabled={loading}>
            Отмена
          </Button>
          <Button
            onClick={handleDeleteCity}
            color="error"
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Удалить'}
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default CitiesManagement;