import React from 'react';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

type ModalProps = React.HTMLAttributes<HTMLDivElement>;

/** Full-screen overlay that freezes scrolling on the page behind it. */
export const Modal: React.FC<ModalProps> = ({ children, ...props }) => {
  useLockBodyScroll(true);

  return (
    <div className="modal-overlay" {...props}>
      {children}
    </div>
  );
};
