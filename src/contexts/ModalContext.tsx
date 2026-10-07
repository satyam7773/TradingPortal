import React, { createContext, useContext, ReactNode, useState, useCallback } from 'react';

interface ModalContextType {
  modalDepth: number;
  getNextZIndex: () => number;
  pushModal: () => void;
  popModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modalDepth, setModalDepth] = useState(0);

  const getNextZIndex = useCallback(() => {
    return 10000 + (modalDepth * 5000);
  }, [modalDepth]);

  const pushModal = useCallback(() => {
    setModalDepth((prev) => prev + 1);
  }, []);

  const popModal = useCallback(() => {
    setModalDepth((prev) => Math.max(0, prev - 1));
  }, []);

  return (
    <ModalContext.Provider value={{ modalDepth, getNextZIndex, pushModal, popModal }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModalDepth = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModalDepth must be used within ModalProvider');
  }
  return context;
};
