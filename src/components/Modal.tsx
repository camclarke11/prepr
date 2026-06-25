import { useEffect, useRef, type ReactNode } from 'react';
import { usePalette, useIsMobile } from '../hooks';

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  width?: number;
  labelledBy?: string;
}

export function Modal({ onClose, children, width = 560, labelledBy }: ModalProps) {
  const p = usePalette();
  const mobile = useIsMobile();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const restoreFocus = document.activeElement as HTMLElement | null;

    const focusable = () =>
      Array.from(
        cardRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => !el.hasAttribute('disabled'));

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // Trap Tab focus inside the dialog.
      if (e.key === 'Tab') {
        const items = focusable();
        if (items.length === 0) {
          e.preventDefault();
          cardRef.current?.focus();
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (active && cardRef.current && !cardRef.current.contains(active)) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
          return;
        }
        if (e.shiftKey && (active === first || active === cardRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cardRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      // Return focus to whatever opened the modal.
      if (restoreFocus && typeof restoreFocus.focus === 'function') {
        restoreFocus.focus();
      }
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
