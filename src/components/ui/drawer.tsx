'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="drawer-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className="drawer"
                initial={{ x: 32, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 32, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="drawer-heading">
                  <div>
                    <span className="eyebrow">BOUND PAY / REVIEW</span>
                    <Dialog.Title>{title}</Dialog.Title>
                  </div>
                  <Dialog.Close className="icon-button" aria-label="Close review">
                    <X size={20} />
                  </Dialog.Close>
                </div>
                <Dialog.Description className="muted">{description}</Dialog.Description>
                {children}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
