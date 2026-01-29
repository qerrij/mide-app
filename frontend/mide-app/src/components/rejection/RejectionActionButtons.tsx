import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Stack,
  useMediaQuery,
  useTheme,
  ClickAwayListener,
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
  mobile?: boolean;
}

const RejectionActionButtons: React.FC<RejectionActionButtonsProps> = ({
  onApprove,
  onReject,
  disabled = false,
  approveLabel = 'Подтвердить',
  rejectLabel = 'Отклонить',
  mobile: isMobileProp = false,
}) => {
  const theme = useTheme();
  const isMobileDevice = useMediaQuery(theme.breakpoints.down('sm'));
  const isMobile = isMobileProp || isMobileDevice;
  
  const [hoveredButton, setHoveredButton] = useState<'approve' | 'reject' | null>(null);
  const [expandedButton, setExpandedButton] = useState<'approve' | 'reject' | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Сбрасываем ховер с задержкой для плавности
  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setHoveredButton(null);
    }, 300);
  };

  const handleMouseEnter = (button: 'approve' | 'reject') => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setHoveredButton(button);
  };

  // Обработчик клика
  const handleClick = (button: 'approve' | 'reject') => {
    if (isMobile) {
      // На мобильных: если кнопка раскрыта, выполняем действие
      if (expandedButton === button) {
        if (button === 'approve') {
          onApprove();
        } else {
          onReject();
        }
        setExpandedButton(null);
      } else {
        // Если другая кнопка или нет раскрытой, раскрываем эту
        setExpandedButton(button);
      }
    } else {
      // На десктопе: выполняем действие сразу
      if (button === 'approve') {
        onApprove();
      } else {
        onReject();
      }
    }
  };

  const handleClickAway = () => {
    // На мобильных: сворачиваем раскрытую кнопку
    if (isMobile && expandedButton) {
      setExpandedButton(null);
    }
  };

  // Определяем, какая кнопка должна быть визуально раскрыта
  const getVisibleButtonState = () => {
    if (isMobile) {
      return expandedButton;
    }
    return hoveredButton;
  };

  const visibleButton = getVisibleButtonState();

  const baseButtonStyle = {
    transition: 'all 0.3s ease',
    borderRadius: visibleButton ? '8px' : '50%',
    width: visibleButton ? (isMobile ? '140px' : '160px') : '56px',
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
    '&:active': {
      transform: 'translateY(0)',
    },
  };

  const approveButtonStyle = {
    ...baseButtonStyle,
    backgroundColor: visibleButton === 'approve' ? '#e8f5e9' : '#4caf50',
    color: visibleButton === 'approve' ? '#2e7d32' : '#ffffff',
    '&:hover': {
      ...baseButtonStyle['&:hover'],
      backgroundColor: '#e8f5e9',
      color: '#2e7d32',
    },
  };

  const rejectButtonStyle = {
    ...baseButtonStyle,
    backgroundColor: visibleButton === 'reject' ? '#ffebee' : '#f44336',
    color: visibleButton === 'reject' ? '#c62828' : '#ffffff',
    '&:hover': {
      ...baseButtonStyle['&:hover'],
      backgroundColor: '#ffebee',
      color: '#c62828',
    },
  };

  const buttonContent = (type: 'approve' | 'reject') => {
    const isVisible = visibleButton === type;
    
    if (isVisible) {
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

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
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
          <Box>
            <Button
              variant="contained"
              onClick={() => handleClick('reject')}
              onMouseEnter={() => !isMobile && handleMouseEnter('reject')}
              onMouseLeave={() => !isMobile && handleMouseLeave()}
              disabled={disabled}
              sx={rejectButtonStyle}
            >
              {buttonContent('reject')}
            </Button>
          </Box>

          <Box>
            <Button
              variant="contained"
              onClick={() => handleClick('approve')}
              onMouseEnter={() => !isMobile && handleMouseEnter('approve')}
              onMouseLeave={() => !isMobile && handleMouseLeave()}
              disabled={disabled}
              sx={approveButtonStyle}
            >
              {buttonContent('approve')}
            </Button>
          </Box>
        </Stack>
      </Box>
    </ClickAwayListener>
  );
};

export default RejectionActionButtons;