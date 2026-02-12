import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Fade,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Close as CloseIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';

interface PhotoViewerProps {
  open: boolean;
  photos: string[];
  currentIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  getPhotoUrl: (photo: string) => string;
  /** Опционально: можно принудительно включить мобильный режим */
  forceMobile?: boolean;
  /** Опционально: отключить миниатюры */
  disableThumbnails?: boolean;
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({
  open,
  photos,
  currentIndex,
  onClose,
  onIndexChange,
  getPhotoUrl,
  forceMobile = false,
  disableThumbnails = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')) || forceMobile;
  
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [showOverlay, setShowOverlay] = useState(true);
  const [zoomMode, setZoomMode] = useState<'fit' | 'full'>('fit');
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipingToClose, setIsSwipingToClose] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<number>(0);
  const initialDistanceRef = useRef<number>(0);
  const startSwipePositionRef = useRef<{ y: number } | null>(null);
  const mouseStartRef = useRef<{ x: number; y: number } | null>(null);
  const scrollPositionRef = useRef<number>(0);

  // Блокировка скролла body при открытии
  useEffect(() => {
    if (open) {
      // Сохраняем текущую позицию скролла
      scrollPositionRef.current = window.scrollY;
      
      // Блокируем скролл на body
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollPositionRef.current}px`;
      document.body.style.width = '100%';
      
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setZoomMode('fit');
      setShowOverlay(true);
      setSwipeOffset(0);
      setIsSwipingToClose(false);
      resetOverlayTimeout();
    } else {
      // Восстанавливаем скролл
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      
      // Восстанавливаем позицию скролла
      window.scrollTo(0, scrollPositionRef.current);
    }

    return () => {
      // Очистка при размонтировании
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [open]);

  // Очистка таймера
  useEffect(() => {
    return () => {
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current);
      }
    };
  }, []);

  const resetOverlayTimeout = useCallback(() => {
    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current);
    }
    
    overlayTimeoutRef.current = setTimeout(() => {
      if (scale === 1 && !isSwipingToClose && !isMobile) {
        setShowOverlay(false);
      }
    }, isMobile ? 3000 : 5000);
  }, [scale, isSwipingToClose, isMobile]);

  const showOverlayTemporarily = useCallback(() => {
    setShowOverlay(true);
    resetOverlayTimeout();
  }, [resetOverlayTimeout]);

  // Анимация закрытия при свайпе
  useEffect(() => {
    if (swipeOffset > 100 && isSwipingToClose) {
      handleClose();
    } else if (swipeOffset < -100 && isSwipingToClose) {
      handleClose();
    }
  }, [swipeOffset, isSwipingToClose]);

  // Обработчики для мыши (десктоп)
  useEffect(() => {
    if (!open || isMobile) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (!imageRef.current) return;
      
      showOverlayTemporarily();
      
      if (scale > 1) {
        e.preventDefault();
        setIsDragging(true);
        mouseStartRef.current = {
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        };
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || scale <= 1 || !mouseStartRef.current || !imageRef.current) return;
      
      e.preventDefault();
      
      const newX = e.clientX - mouseStartRef.current.x;
      const newY = e.clientY - mouseStartRef.current.y;
      
      const imgWidth = imageRef.current.naturalWidth * scale;
      const imgHeight = imageRef.current.naturalHeight * scale;
      const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
      const containerHeight = containerRef.current?.clientHeight || window.innerHeight;
      
      const maxX = Math.max(0, (imgWidth - containerWidth) / 2);
      const maxY = Math.max(0, (imgHeight - containerHeight) / 2);
      
      setPosition({
        x: Math.max(-maxX, Math.min(maxX, newX)),
        y: Math.max(-maxY, Math.min(maxY, newY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      mouseStartRef.current = null;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.5, Math.min(3, scale * delta));
      
      setScale(newScale);
      setZoomMode('full');
      setShowOverlay(true);
      
      if (Math.abs(newScale - 1) < 0.1) {
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setZoomMode('fit');
      }
      
      resetOverlayTimeout();
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      container.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
        container.removeEventListener('mousedown', handleMouseDown);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [open, isMobile, scale, position, isDragging, showOverlayTemporarily, resetOverlayTimeout]);

  // Обработчики для тач-устройств (мобилки)
  useEffect(() => {
    if (!open || !isMobile) return;

    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      showOverlayTemporarily();
      
      if (e.touches.length === 1 && scale === 1) {
        const touch = e.touches[0];
        const now = Date.now();
        const timeSinceLastTap = now - lastTapRef.current;
        
        touchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          time: now,
        };
        
        setSwipeOffset(0);
        setIsSwipingToClose(false);
        startSwipePositionRef.current = { y: touch.clientY };
        
        if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
          lastTapRef.current = 0;
          handleDoubleTap();
        } else {
          lastTapRef.current = now;
        }
      } else if (e.touches.length === 1 && scale > 1) {
        const touch = e.touches[0];
        touchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now(),
        };
        
        setIsDragging(true);
        setTouchStart({
          x: touch.clientX - position.x,
          y: touch.clientY - position.y,
        });
      } else if (e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        initialDistanceRef.current = distance;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      showOverlayTemporarily();
      
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
          Math.pow(touch2.clientY - touch1.clientY, 2)
        );
        
        if (initialDistanceRef.current > 0) {
          const newScale = Math.max(0.5, Math.min(3, 
            (currentDistance / initialDistanceRef.current) * scale
          ));
          setScale(newScale);
          setZoomMode('full');
          
          if (Math.abs(newScale - 1) < 0.1) {
            setScale(1);
            setPosition({ x: 0, y: 0 });
            setZoomMode('fit');
          }
        }
      } else if (e.touches.length === 1 && scale > 1 && touchStartRef.current) {
        e.preventDefault();
        const touch = e.touches[0];
        const newX = touch.clientX - touchStart.x;
        const newY = touch.clientY - touchStart.y;
        
        if (imageRef.current) {
          const imgWidth = imageRef.current.naturalWidth * scale;
          const imgHeight = imageRef.current.naturalHeight * scale;
          const containerWidth = container.clientWidth || window.innerWidth;
          const containerHeight = container.clientHeight || window.innerHeight;
          
          const maxX = Math.max(0, (imgWidth - containerWidth) / 2);
          const maxY = Math.max(0, (imgHeight - containerHeight) / 2);
          
          setPosition({
            x: Math.max(-maxX, Math.min(maxX, newX)),
            y: Math.max(-maxY, Math.min(maxY, newY)),
          });
        }
      } else if (e.touches.length === 1 && scale === 1 && touchStartRef.current && startSwipePositionRef.current) {
        const touch = e.touches[0];
        const deltaX = touch.clientX - touchStartRef.current.x;
        const deltaY = touch.clientY - touchStartRef.current.y;
        
        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
          e.preventDefault();
          setIsSwipingToClose(true);
          setSwipeOffset(deltaY);
          
          const opacity = 0.92 - Math.min(Math.abs(deltaY) / 300, 0.5);
          container.style.backgroundColor = `rgba(0, 0, 0, ${opacity})`;
        } else if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        initialDistanceRef.current = 0;
        
        if (isSwipingToClose && container) {
          if (Math.abs(swipeOffset) > 50) {
            handleClose();
          } else {
            setSwipeOffset(0);
            setIsSwipingToClose(false);
            container.style.backgroundColor = 'rgba(0, 0, 0, 0.92)';
          }
        } else if (touchStartRef.current && scale === 1 && !isSwipingToClose) {
          const touch = e.changedTouches[0];
          const deltaX = touch.clientX - touchStartRef.current.x;
          const deltaY = touch.clientY - touchStartRef.current.y;
          const deltaTime = Date.now() - touchStartRef.current.time;
          
          const isHorizontalSwipe = Math.abs(deltaX) > 30 && Math.abs(deltaY) < 50 && deltaTime < 300;
          const isVerticalSwipe = Math.abs(deltaY) > 30 && Math.abs(deltaX) < 50 && deltaTime < 300;
          
          if (isHorizontalSwipe) {
            if (deltaX > 0) {
              const prevIndex = (currentIndex - 1 + photos.length) % photos.length;
              handleIndexChange(prevIndex);
            } else {
              const nextIndex = (currentIndex + 1) % photos.length;
              handleIndexChange(nextIndex);
            }
          } else if (isVerticalSwipe) {
            if (Math.abs(deltaY) > 80 && deltaTime < 200) {
              handleClose();
            }
          }
        }
        
        setIsDragging(false);
        touchStartRef.current = null;
        startSwipePositionRef.current = null;
        resetOverlayTimeout();
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isMobile, scale, position, currentIndex, photos.length, showOverlayTemporarily, swipeOffset, isSwipingToClose]);

  const handleDoubleTap = () => {
    if (scale === 1) {
      setScale(2);
      setZoomMode('full');
      setShowOverlay(true);
    } else {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setZoomMode('fit');
    }
    resetOverlayTimeout();
  };

  const handleClose = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setZoomMode('fit');
    setIsDragging(false);
    setIsSwipingToClose(false);
    setSwipeOffset(0);
    
    if (containerRef.current) {
      containerRef.current.style.backgroundColor = 'rgba(0, 0, 0, 0.92)';
    }
    
    onClose();
  };

  const handleZoomIn = () => {
    const newScale = Math.min(scale * 1.5, 3);
    setScale(newScale);
    setZoomMode('full');
    setShowOverlay(true);
    resetOverlayTimeout();
  };

  const handleZoomOut = () => {
    const newScale = Math.max(scale / 1.5, 0.5);
    setScale(newScale);
    setShowOverlay(true);
    if (newScale === 1) {
      setPosition({ x: 0, y: 0 });
      setZoomMode('fit');
    }
    resetOverlayTimeout();
  };

  const handleIndexChange = useCallback((newIndex: number) => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setZoomMode('fit');
    setShowOverlay(true);
    resetOverlayTimeout();
    onIndexChange(newIndex);
  }, [onIndexChange, resetOverlayTimeout]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    const prevIndex = (currentIndex - 1 + photos.length) % photos.length;
    handleIndexChange(prevIndex);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIndex = (currentIndex + 1) % photos.length;
    handleIndexChange(nextIndex);
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (isMobile) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const clickX = e.clientX;
    const clickY = e.clientY;
    
    const imageRect = imageRef.current?.getBoundingClientRect();
    const isClickingImage = imageRect && 
      clickX >= imageRect.left && clickX <= imageRect.right &&
      clickY >= imageRect.top && clickY <= imageRect.bottom;
    
    if (!isClickingImage && scale === 1) {
      handleClose();
    }
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    showOverlayTemporarily();
    
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      handleDoubleTap();
    }
    lastTapRef.current = now;
  };

  if (!open) return null;

  return (
    <Fade in={open}>
      <Box
        ref={containerRef}
        onClick={handleContainerClick}
        onMouseMove={!isMobile ? showOverlayTemporarily : undefined}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: theme.zIndex.modal + 1,
          backgroundColor: 'rgba(0, 0, 0, 0.92)',
          display: 'flex',
          flexDirection: 'column',
          touchAction: isMobile ? 'none' : 'auto',
          userSelect: 'none',
          overscrollBehavior: 'contain',
          cursor: isMobile ? 'default' : (scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'),
        }}
      >
        {/* Верхний оверлей */}
        <Fade in={showOverlay || isSwipingToClose || !isMobile}>
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: isMobile ? 88 : 72,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 60%, transparent 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              pt: isMobile ? 2 : 1,
              zIndex: 1,
              opacity: isMobile && isSwipingToClose ? 1 - Math.min(Math.abs(swipeOffset) / 200, 0.8) : 1,
              transform: isMobile ? `translateY(${isSwipingToClose ? swipeOffset * 0.5 : 0}px)` : 'none',
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                color: 'white',
                fontWeight: 500,
                fontSize: isMobile ? '1.1rem' : '1rem',
                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              }}
            >
              {currentIndex + 1} / {photos.length}
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              {scale < 3 && (
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleZoomIn();
                  }}
                  sx={{
                    color: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(10px)',
                    width: isMobile ? 40 : 36,
                    height: isMobile ? 40 : 36,
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    },
                  }}
                >
                  <ZoomInIcon fontSize={isMobile ? 'medium' : 'small'} />
                </IconButton>
              )}
              
              {scale > 0.5 && (
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleZoomOut();
                  }}
                  sx={{
                    color: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(10px)',
                    width: isMobile ? 40 : 36,
                    height: isMobile ? 40 : 36,
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    },
                  }}
                >
                  <ZoomOutIcon fontSize={isMobile ? 'medium' : 'small'} />
                </IconButton>
              )}
              
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                sx={{
                  color: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  width: isMobile ? 40 : 36,
                  height: isMobile ? 40 : 36,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  },
                }}
              >
                <CloseIcon fontSize={isMobile ? 'medium' : 'small'} />
              </IconButton>
            </Box>
          </Box>
        </Fade>

        {/* Контейнер для изображения */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {photos[currentIndex] && (
            <Box
              sx={{
                position: 'relative',
                transform: isMobile 
                  ? `translate(${position.x}px, ${position.y + swipeOffset}px) scale(${scale})`
                  : `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transition: isDragging || (isMobile && isSwipingToClose) ? 'none' : 'transform 0.2s ease',
                cursor: isMobile 
                  ? (scale > 1 ? 'grab' : 'default')
                  : (scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'),
                maxWidth: '100%',
                maxHeight: '100%',
                opacity: isMobile && isSwipingToClose ? 1 - Math.min(Math.abs(swipeOffset) / 200, 0.5) : 1,
              }}
            >
              <img
                ref={imageRef}
                src={getPhotoUrl(photos[currentIndex])}
                alt={`Фото ${currentIndex + 1}`}
                onClick={handleImageClick}
                style={{
                  display: 'block',
                  maxWidth: '100%',
                  maxHeight: 'calc(100vh - 150px)',
                  objectFit: zoomMode === 'fit' ? 'contain' : 'scale-down',
                  borderRadius: 4,
                  touchAction: isMobile ? 'none' : 'auto',
                  cursor: isMobile 
                    ? (scale > 1 ? 'grab' : 'default')
                    : (scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'),
                }}
              />
            </Box>
          )}
        </Box>

        {/* Кнопки навигации */}
        {scale === 1 && photos.length > 1 && !(isMobile && isSwipingToClose) && (
          <>
            <Fade in={showOverlay || !isMobile}>
              <IconButton
                onClick={handlePrev}
                sx={{
                  position: 'absolute',
                  left: isMobile ? 8 : 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  color: 'white',
                  width: isMobile ? 44 : 40,
                  height: isMobile ? 44 : 40,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  },
                  display: isMobile ? (showOverlay ? 'flex' : 'none') : 'flex',
                }}
              >
                <NavigateBeforeIcon fontSize={isMobile ? 'medium' : 'small'} />
              </IconButton>
            </Fade>
            
            <Fade in={showOverlay || !isMobile}>
              <IconButton
                onClick={handleNext}
                sx={{
                  position: 'absolute',
                  right: isMobile ? 8 : 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  color: 'white',
                  width: isMobile ? 44 : 40,
                  height: isMobile ? 44 : 40,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  },
                  display: isMobile ? (showOverlay ? 'flex' : 'none') : 'flex',
                }}
              >
                <NavigateNextIcon fontSize={isMobile ? 'medium' : 'small'} />
              </IconButton>
            </Fade>
          </>
        )}

        {/* Нижний оверлей с миниатюрами */}
        {!disableThumbnails && (
          <Fade in={showOverlay && !(isMobile && isSwipingToClose)}>
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: isMobile ? 100 : 90,
                background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 60%, transparent 100%)',
                px: 2,
                pb: isMobile ? 2 : 1.5,
                pt: isMobile ? 0 : 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: isMobile ? 'flex-start' : 'center',
                gap: 1,
                overflowX: isMobile ? 'auto' : 'hidden',
                flexWrap: isMobile ? 'nowrap' : 'wrap',
                zIndex: 1,
                opacity: isMobile && isSwipingToClose ? 1 - Math.min(Math.abs(swipeOffset) / 200, 0.8) : 1,
                transform: isMobile ? `translateY(${isSwipingToClose ? swipeOffset * 0.5 : 0}px)` : 'none',
                '&::-webkit-scrollbar': {
                  display: 'none',
                },
                scrollbarWidth: 'none',
              }}
            >
              {photos.map((photo, index) => (
                <Box
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleIndexChange(index);
                  }}
                  sx={{
                    width: isMobile ? 64 : 56,
                    height: isMobile ? 64 : 56,
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: currentIndex === index 
                      ? '3px solid #007AFF'
                      : '2px solid rgba(255, 255, 255, 0.3)',
                    opacity: currentIndex === index ? 1 : 0.7,
                    flexShrink: 0,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      opacity: 1,
                      transform: 'scale(1.05)',
                    },
                  }}
                >
                  <img
                    src={getPhotoUrl(photo)}
                    alt={`Миниатюра ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Fade>
        )}

        {/* Подсказка о свайпе для закрытия (только мобилки) */}
        {isMobile && scale === 1 && !isSwipingToClose && (
          <Fade in={showOverlay}>
            <Typography
              variant="caption"
              sx={{
                position: 'absolute',
                bottom: 120,
                left: 0,
                right: 0,
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '0.8rem',
                zIndex: 1,
              }}
            >
              Свайпните вверх или вниз, чтобы закрыть
            </Typography>
          </Fade>
        )}

        {/* Подсказка для десктопа */}
        {!isMobile && scale === 1 && (
          <Fade in={showOverlay}>
            <Typography
              variant="caption"
              sx={{
                position: 'absolute',
                bottom: 100,
                left: 0,
                right: 0,
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '0.75rem',
                zIndex: 1,
              }}
            >
              Используйте колесико мыши для зума
            </Typography>
          </Fade>
        )}
      </Box>
    </Fade>
  );
};