import React, { useState } from 'react';
import {
  Box,
  Button,
  Tooltip,
  Stack,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Check as ApproveIcon,
  Close as RejectIcon,
} from '@mui/icons-material';

interface RejectionActionButtonsProps {
  onApprove: () => void;
  onReject: () => void;
  disabled?: boolean;
  approveLabel?: string;
  rejectLabel?: string;
}

const RejectionActionButtons: React.FC<RejectionActionButtonsProps> = ({
  onApprove,
  onReject,
  disabled = false,
  approveLabel = 'Подтвердить',
  rejectLabel = 'Отклонить',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [hoveredButton, setHoveredButton] = useState<'approve' | 'reject' | null>(null);

  const baseButtonStyle = {
    transition: 'all 0.3s ease',
    borderRadius: hoveredButton ? '8px' : '50%',
    width: hoveredButton ? (isMobile ? '140px' : '160px') : '56px',
    height: '56px',
    minWidth: '56px',
    padding: 0,
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    '&:hover': {
      boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)',
      transform: 'translateY(-2px)',
    },
  };

  const approveButtonStyle = {
    ...baseButtonStyle,
    backgroundColor: hoveredButton === 'approve' ? '#e8f5e9' : '#4caf50',
    color: hoveredButton === 'approve' ? '#2e7d32' : '#ffffff',
    '&:hover': {
      ...baseButtonStyle['&:hover'],
      backgroundColor: '#e8f5e9',
      color: '#2e7d32',
    },
  };

  const rejectButtonStyle = {
    ...baseButtonStyle,
    backgroundColor: hoveredButton === 'reject' ? '#ffebee' : '#f44336',
    color: hoveredButton === 'reject' ? '#c62828' : '#ffffff',
    '&:hover': {
      ...baseButtonStyle['&:hover'],
      backgroundColor: '#ffebee',
      color: '#c62828',
    },
  };

  const buttonContent = (type: 'approve' | 'reject') => {
    if (hoveredButton === type) {
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            width: '100%',
            height: '100%',
            px: 2,
          }}
        >
          {type === 'approve' ? <ApproveIcon /> : <RejectIcon />}
          <Box
            sx={{
              fontSize: '0.875rem',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {type === 'approve' ? approveLabel : rejectLabel}
          </Box>
        </Box>
      );
    }

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {type === 'approve' ? (
          <ApproveIcon sx={{ fontSize: 24 }} />
        ) : (
          <RejectIcon sx={{ fontSize: 24 }} />
        )}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1000,
      }}
    >
      <Stack
        direction="column"
        spacing={2}
        sx={{
          transition: 'all 0.3s ease',
          opacity: disabled ? 0.7 : 1,
          pointerEvents: disabled ? 'none' : 'auto',
        }}
      >
        <Tooltip title={hoveredButton === 'reject' ? '' : rejectLabel}>
          <Box>
            <Button
              variant="contained"
              onClick={onReject}
              onMouseEnter={() => setHoveredButton('reject')}
              onMouseLeave={() => setHoveredButton(null)}
              disabled={disabled}
              sx={rejectButtonStyle}
            >
              {buttonContent('reject')}
            </Button>
          </Box>
        </Tooltip>

        <Tooltip title={hoveredButton === 'approve' ? '' : approveLabel}>
          <Box>
            <Button
              variant="contained"
              onClick={onApprove}
              onMouseEnter={() => setHoveredButton('approve')}
              onMouseLeave={() => setHoveredButton(null)}
              disabled={disabled}
              sx={approveButtonStyle}
            >
              {buttonContent('approve')}
            </Button>
          </Box>
        </Tooltip>
      </Stack>
    </Box>
  );
};

export default RejectionActionButtons;