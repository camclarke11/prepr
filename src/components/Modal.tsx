import { useEffect, useRef, type ReactNode } from 'react';
import { usePalette, useIsMobile } from '../hooks';

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  width?: number;
  /** Render children with no padding/background (caller styles the card body). */
  bare?: boolean;
  labelledBy?: string;
}

export function Modal({ onClose, children, width = 560, labelledBy }: ModalProps) {
  const p = usePalette();
  const mobile = useIsMobile();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cardRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: p.overlay,
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        zIndex: 60,
        display: 'flex',
        alignItems: mobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        animation: 'prIn .18s ease',
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: p.card,
          width: mobile ? '100%' : width,
          maxWidth: '100%',
          maxHeight: mobile ? '92vh' : '90vh',
          borderRadius: mobile ? '22px 22px 0 0' : 22,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'prUp .26s cubic-bezier(.2,.8,.2,1)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
          outline: 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
