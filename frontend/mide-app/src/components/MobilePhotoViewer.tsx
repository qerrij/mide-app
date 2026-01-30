import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Fade,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';

interface MobilePhotoViewerProps {
  open: boolean;
  photos: string[];
  currentIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  getPhotoUrl: (photo: string) => string;
}

export const MobilePhotoViewer: React.FC<MobilePhotoViewerProps> = ({
  open,
  photos,
  currentIndex,
  onClose,
  onIndexChange,
  getPhotoUrl,
}) => {
  const theme = useTheme();
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [showOverlay, setShowOverlay] = useState(true);
  const [zoomMode, setZoomMode] = useState<'fit' | 'full'>('fit');
  const [swipeOffset, setSwipeOffset] = useState(0); // Для анимации закрытия свайпом
  const [isSwipingToClose, setIsSwipingToClose] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<number>(0);
  const initialDistanceRef = useRef<number>(0);
  const startSwipePositionRef = useRef<{ y: number } | null>(null);

  // Сброс состояния при закрытии/открытии
  useEffect(() => {
    if (open) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setZoomMode('fit');
      setShowOverlay(true);
      setSwipeOffset(0);
      setIsSwipingToClose(false);
      resetOverlayTimeout();
    }
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
      if (scale === 1 && !isSwipingToClose) {
        setShowOverlay(false);
      }
    }, 3000);
  }, [scale, isSwipingToClose]);

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

  // Добавляем обработчики для touch
  useEffect(() => {
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
        
        // Сбрасываем свайп для закрытия
        setSwipeOffset(0);
        setIsSwipingToClose(false);
        startSwipePositionRef.current = { y: touch.clientY };
        
        // Обработка двойного тапа
        if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
          // Двойной тап
          lastTapRef.current = 0;
          handleDoubleTap();
        } else {
          lastTapRef.current = now;
        }
      } else if (e.touches.length === 1 && scale > 1) {
        // Начало перетаскивания при зуме
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
        // Начало жеста pinch-to-zoom
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
        // Жест pinch-to-zoom
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
          
          // Если масштабируем обратно к 1, переключаем в fit режим
          if (Math.abs(newScale - 1) < 0.1) {
            setScale(1);
            setPosition({ x: 0, y: 0 });
            setZoomMode('fit');
          }
        }
      } else if (e.touches.length === 1 && scale > 1 && touchStartRef.current) {
        // Перетаскивание увеличенного изображения
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
        // Определяем свайп
        const touch = e.touches[0];
        const deltaX = touch.clientX - touchStartRef.current.x;
        const deltaY = touch.clientY - touchStartRef.current.y;
        
        // Если явно тянем вверх или вниз - закрываем вьюер
        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
          e.preventDefault();
          setIsSwipingToClose(true);
          setSwipeOffset(deltaY);
          
          // Немного затемняем фон при свайпе
          const opacity = 0.92 - Math.min(Math.abs(deltaY) / 300, 0.5);
          container.style.backgroundColor = `rgba(0, 0, 0, ${opacity})`;
        } else if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
          // Горизонтальный свайп - предотвращаем вертикальную прокрутку
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        // Сброс для жеста pinch-to-zoom
        initialDistanceRef.current = 0;
        
        // Анимация возврата или закрытия при свайпе
        if (isSwipingToClose && container) {
          if (Math.abs(swipeOffset) > 50) {
            // Закрываем если свайпнули достаточно далеко
            handleClose();
          } else {
            // Возвращаем на место
            setSwipeOffset(0);
            setIsSwipingToClose(false);
            container.style.backgroundColor = 'rgba(0, 0, 0, 0.92)';
          }
        } else if (touchStartRef.current && scale === 1 && !isSwipingToClose) {
          const touch = e.changedTouches[0];
          const deltaX = touch.clientX - touchStartRef.current.x;
          const deltaY = touch.clientY - touchStartRef.current.y;
          const deltaTime = Date.now() - touchStartRef.current.time;
          
          // Определяем тип жеста
          const isHorizontalSwipe = Math.abs(deltaX) > 30 && Math.abs(deltaY) < 50 && deltaTime < 300;
          const isVerticalSwipe = Math.abs(deltaY) > 30 && Math.abs(deltaX) < 50 && deltaTime < 300;
          
          if (isHorizontalSwipe) {
            // Перелистывание фотографий
            if (deltaX > 0) {
              // Свайп вправо - предыдущая фотография
              const prevIndex = (currentIndex - 1 + photos.length) % photos.length;
              handleIndexChange(prevIndex);
            } else {
              // Свайп влево - следующая фотография
              const nextIndex = (currentIndex + 1) % photos.length;
              handleIndexChange(nextIndex);
            }
          } else if (isVerticalSwipe) {
            // Вертикальный свайп - закрываем если быстро свайпнули
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

    // Добавляем обработчики
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
  }, [scale, position, currentIndex, photos.length, showOverlayTemporarily, swipeOffset, isSwipingToClose]);

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
    
    // Восстанавливаем фон
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
    e.stopPropagation(); // Предотвращаем срабатывание onClick контейнера
    const prevIndex = (currentIndex - 1 + photos.length) % photos.length;
    handleIndexChange(prevIndex);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation(); // Предотвращаем срабатывание onClick контейнера
    const nextIndex = (currentIndex + 1) % photos.length;
    handleIndexChange(nextIndex);
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const clickX = e.clientX;
    const clickY = e.clientY;
    
    // Проверяем, что клик не по изображению и не по элементам управления
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
    
    // Обработка двойного клика мышью (для дебага на десктопе)
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
        onMouseMove={showOverlayTemporarily}
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
          touchAction: 'none',
          userSelect: 'none',
          overscrollBehavior: 'contain',
        }}
      >
        {/* Верхний оверлей */}
        <Fade in={showOverlay || isSwipingToClose}>
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 88,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 60%, transparent 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              pt: 2,
              zIndex: 1,
              opacity: isSwipingToClose ? 1 - Math.min(Math.abs(swipeOffset) / 200, 0.8) : 1,
              transform: `translateY(${isSwipingToClose ? swipeOffset * 0.5 : 0}px)`,
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                color: 'white',
                fontWeight: 500,
                fontSize: '1.1rem',
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
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    },
                  }}
                >
                  <ZoomInIcon />
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
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    },
                  }}
                >
                  <ZoomOutIcon />
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
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  },
                }}
              >
                <CloseIcon />
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
                transform: `translate(${position.x}px, ${position.y + swipeOffset}px) scale(${scale})`,
                transition: isDragging || isSwipingToClose ? 'none' : 'transform 0.2s ease',
                cursor: scale > 1 ? 'grab' : 'default',
                maxWidth: '100%',
                maxHeight: '100%',
                opacity: isSwipingToClose ? 1 - Math.min(Math.abs(swipeOffset) / 200, 0.5) : 1,
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
                  touchAction: 'none',
                }}
              />
            </Box>
          )}
        </Box>

        {/* Кнопки навигации */}
        {scale === 1 && photos.length > 1 && !isSwipingToClose && (
          <>
            <Fade in={showOverlay}>
              <IconButton
                onClick={handlePrev}
                sx={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  color: 'white',
                  width: 44,
                  height: 44,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  },
                }}
              >
                <NavigateBeforeIcon />
              </IconButton>
            </Fade>
            
            <Fade in={showOverlay}>
              <IconButton
                onClick={handleNext}
                sx={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  color: 'white',
                  width: 44,
                  height: 44,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  },
                }}
              >
                <NavigateNextIcon />
              </IconButton>
            </Fade>
          </>
        )}

        {/* Нижний оверлей с миниатюрами */}
        <Fade in={showOverlay && !isSwipingToClose}>
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 100,
              background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 60%, transparent 100%)',
              px: 2,
              pb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              overflowX: 'auto',
              zIndex: 1,
              opacity: isSwipingToClose ? 1 - Math.min(Math.abs(swipeOffset) / 200, 0.8) : 1,
              transform: `translateY(${isSwipingToClose ? swipeOffset * 0.5 : 0}px)`,
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
                  width: 64,
                  height: 64,
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

        {/* Подсказка о свайпе для закрытия (только когда не свайпаем) */}
        {scale === 1 && !isSwipingToClose && (
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
      </Box>
    </Fade>
  );
};