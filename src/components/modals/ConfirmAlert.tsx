import React, { useState } from 'react'
import { Trash2, X, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ConfirmAlertProps {
  isOpen: boolean
  title: string
  message: string | string[]
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

const ConfirmAlert: React.FC<ConfirmAlertProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {

  // Backdrop with dramatic fade
  const backdropVariants = {
    hidden: { opacity: 0, backdropFilter: 'blur(0px)' },
    visible: {
      opacity: 1,
      backdropFilter: 'blur(20px)',
      transition: { duration: 0.4, ease: 'easeOut' },
    },
    exit: {
      opacity: 0,
      backdropFilter: 'blur(0px)',
      transition: { duration: 0.2, ease: 'easeIn' },
    },
  }

  // Dialog with dramatic spring entrance
  const dialogVariants = {
    hidden: { 
      scale: 0.3, 
      opacity: 0, 
      y: 60,
      rotateX: -30,
    },
    visible: {
      scale: 1,
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: {
        type: 'spring',
        damping: 18,
        stiffness: 300,
        mass: 0.7,
        duration: 0.6,
      },
    },
    exit: {
      scale: 0.3,
      opacity: 0,
      y: 60,
      transition: { duration: 0.2, ease: 'easeIn' },
    },
  }

  // Animated top line
  const topLineVariants = {
    hidden: { scaleX: 0, opacity: 0 },
    visible: {
      scaleX: 1,
      opacity: 1,
      transition: { delay: 0.2, duration: 0.5, ease: 'easeOut' },
    },
  }

  // Icon with dramatic spin and scale
  const iconVariants = {
    hidden: { scale: 0, rotate: -180, opacity: 0 },
    visible: {
      scale: 1,
      rotate: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        damping: 10,
        stiffness: 180,
        delay: 0.3,
        duration: 0.6,
      },
    },
  }

  // Icon pulse with glow effect
  const iconPulse = {
    animate: {
      scale: [1, 1.15, 1],
      boxShadow: [
        '0 0 0 0 rgba(239, 68, 68, 0.3)',
        '0 0 0 12px rgba(239, 68, 68, 0)',
        '0 0 0 0 rgba(239, 68, 68, 0)',
      ],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  }

  // Message with staggered reveal
  const messageVariants = {
    hidden: { opacity: 0, y: 15, x: -10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      x: 0,
      transition: {
        delay: 0.35 + i * 0.08,
        duration: 0.5,
        ease: 'easeOut',
      },
    }),
  }

  // Button animations
  const buttonVariants = {
    hover: { 
      scale: 1.08, 
      y: -2,
      boxShadow: '0 12px 24px rgba(0,0,0,0.3)',
      transition: { duration: 0.3, type: 'spring', stiffness: 300 },
    },
    tap: { scale: 0.94, y: 0 },
  }

  // Floating particles background
  const particleVariants = {
    float: (i: number) => ({
      y: [-20, -60, -20],
      opacity: [0, 0.6, 0],
      transition: {
        duration: 4 + i * 0.5,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: i * 0.3,
      },
    }),
  }

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 z-[9999]"
          onClick={onCancel}
        >
          {/* Animated background particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                custom={i}
                variants={particleVariants}
                animate="float"
                className="absolute w-1 h-1 bg-red-400/40 rounded-full"
                style={{
                  left: `${25 + i * 30}%`,
                  top: '50%',
                }}
              />
            ))}
          </div>

          <motion.div
            variants={dialogVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md relative rounded-2xl overflow-hidden shadow-2xl"
            style={{
              perspective: '1200px',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Gradient background layers */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-850 to-slate-900" />
            
            {/* Animated gradient overlay */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-tr from-red-500/5 via-transparent to-blue-500/5"
              animate={{
                backgroundPosition: ['0% 0%', '100% 100%'],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: 'linear',
              }}
            />

            {/* Border glow effect */}
            <motion.div
              className="absolute inset-0 rounded-2xl border border-red-500/20 pointer-events-none"
              animate={{
                borderColor: ['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.4)', 'rgba(239, 68, 68, 0.2)'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            <div className="relative z-10">
              {/* Top accent bar */}
              <motion.div
                variants={topLineVariants}
                initial="hidden"
                animate="visible"
                className="h-1.5 bg-gradient-to-r from-red-500 via-red-400 to-transparent"
                style={{ originX: 0 }}
              />

              {/* Header */}
              <div className="relative px-8 py-8 flex items-start gap-5 border-b border-slate-700/30">
                {/* Animated background glow */}
                <motion.div
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="absolute inset-0 opacity-30 pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(circle at 20% 50%, #ef4444 0%, transparent 50%)',
                  }}
                />

                {/* Icon with enhanced animation */}
                <motion.div
                  variants={iconVariants}
                  initial="hidden"
                  animate="visible"
                  className="relative z-10 flex-shrink-0"
                >
                  <motion.div
                    animate="animate"
                    variants={iconPulse}
                    className="w-12 h-12 rounded-full flex items-center justify-center bg-red-500/20 border border-red-500/40 backdrop-blur-sm"
                  >
                    <Trash2 className="w-6 h-6 text-red-400" />
                  </motion.div>
                </motion.div>

                {/* Title */}
                <div className="flex-1 pt-1 z-10">
                  <motion.h2
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35, duration: 0.5 }}
                    className="text-2xl font-bold text-white leading-tight"
                  >
                    {title}
                  </motion.h2>
                </div>

                {/* Close button */}
                <motion.button
                  onClick={onCancel}
                  disabled={isLoading}
                  whileHover={{ rotate: 90, scale: 1.15 }}
                  whileTap={{ scale: 0.85 }}
                  className="text-slate-400 hover:text-red-400 disabled:opacity-50 transition-colors flex-shrink-0 z-10 relative"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Message section */}
              <div className="px-8 py-8 space-y-4">
                {Array.isArray(message) ? (
                  <div className="space-y-4">
                    {message.map((line, idx) => (
                      <motion.p
                        key={idx}
                        custom={idx}
                        variants={messageVariants}
                        initial="hidden"
                        animate="visible"
                        className="text-slate-300 text-base leading-relaxed font-medium"
                      >
                        {line || '\u00A0'}
                      </motion.p>
                    ))}
                  </div>
                ) : (
                  <motion.p
                    custom={0}
                    variants={messageVariants}
                    initial="hidden"
                    animate="visible"
                    className="text-slate-300 text-base leading-relaxed font-medium"
                  >
                    {message}
                  </motion.p>
                )}
              </div>

              {/* Footer */}
              <motion.div 
                className="px-8 py-6 flex gap-3 justify-end border-t border-slate-700/30 bg-gradient-to-r from-slate-900/50 via-slate-850/50 to-slate-900/50 backdrop-blur-sm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.4 }}
              >
                {/* Cancel Button */}
                <motion.button
                  onClick={onCancel}
                  disabled={isLoading}
                  variants={buttonVariants}
                  whileHover={!isLoading ? 'hover' : undefined}
                  whileTap={!isLoading ? 'tap' : undefined}
                  className="px-6 py-2.5 bg-slate-700/40 hover:bg-slate-600/50 disabled:opacity-50 text-slate-100 rounded-lg font-semibold text-sm transition-all duration-200 border border-slate-600/40 hover:border-slate-500/60"
                >
                  {cancelText}
                </motion.button>

                {/* Confirm Button */}
                <motion.button
                  onClick={onConfirm}
                  disabled={isLoading}
                  variants={buttonVariants}
                  whileHover={!isLoading ? 'hover' : undefined}
                  whileTap={!isLoading ? 'tap' : undefined}
                  className="px-6 py-2.5 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-all duration-200 flex items-center gap-2 relative overflow-hidden group border border-red-500/50 hover:border-red-400/70"
                >
                  {/* Animated shine sweep */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{
                      x: ['-100%', '100%'],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />

                  {/* Loading spinner with glow */}
                  {isLoading && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                      className="relative w-4 h-4"
                    >
                      <div className="absolute inset-0 w-4 h-4 border-2 border-white/40 border-t-white rounded-full" />
                      <div className="absolute inset-0.5 w-3 h-3 border border-white/20 rounded-full" />
                    </motion.div>
                  )}

                  <span className="relative z-10">{confirmText}</span>
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ConfirmAlert
