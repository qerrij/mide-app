import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Paper,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  Description as ReportIcon,
  SwapHoriz as TransferIcon,
  Error as RejectionIcon,
  Assignment as RevisionIcon,
  CalendarToday as CalendarIcon,
  Numbers as QuantityIcon,
} from '@mui/icons-material';
import { ProductReservationsResponse } from '../../types';

interface ReservationDetailsModalProps {
  open: boolean;
  onClose: () => void;
  reservations: ProductReservationsResponse[];
  productName: string;
  productSku: string;
  totalReserved: number;
  loading?: boolean;
}

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

const ReservationDetailsModal: React.FC<ReservationDetailsModalProps> = ({
  open,
  onClose,
  reservations,
  productName,
  productSku,
  totalReserved,
  loading = false,
}) => {
  const theme = useTheme();

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
        pb: 1.5, 
        backgroundColor: alpha(theme.palette.primary.main, 0.02),
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Box>
          <Typography variant="h6" fontWeight={600} color="#2a0f35">
            Детали резервов
          </Typography>
          <Typography variant="body2" color="#4c5454" sx={{ mt: 0.5 }}>
            {productName} • {productSku}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5 }}>
        {/* Сводка */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2.5,
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
              }}
            />
          </Box>
          
          <Divider sx={{ my: 1.5 }} />
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {Object.entries(summary).map(([type, data]) => (
              <Box key={type} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getReservationIcon(type)}
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
        <Typography variant="subtitle2" fontWeight={600} color="#2a0f35" sx={{ mb: 1.5 }}>
          Детальный список
        </Typography>

        <List sx={{ p: 0 }}>
          {reservations.map((reservation, index) => (
            <React.Fragment key={reservation.id}>
              {index > 0 && <Divider sx={{ my: 1 }} />}
              <ListItem
                sx={{
                  px: 0,
                  py: 0.5,
                  alignItems: 'flex-start',
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                  {getReservationIcon(reservation.reservationType)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" fontWeight={500}>
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
                        }}
                      />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                        {reservation.entityDetails?.createdAt && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            <CalendarIcon sx={{ fontSize: 14, color: theme.palette.text.secondary }} />
                            <Typography variant="caption" color="text.secondary">
                            {new Date(reservation.entityDetails.createdAt).toLocaleString('ru-RU')}
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
                          }}
                        />
                      )}
                    </Box>
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                />
              </ListItem>
            </React.Fragment>
          ))}
        </List>

        {reservations.length === 0 && !loading && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              Нет активных резервов для этого товара
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, pt: 1, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            borderRadius: 2,
            backgroundColor: '#3f1f4b',
            '&:hover': { backgroundColor: '#2a0f35' },
            textTransform: 'none',
            px: 3,
          }}
        >
          Закрыть
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReservationDetailsModal;