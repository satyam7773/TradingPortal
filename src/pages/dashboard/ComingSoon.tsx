import React from 'react'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Clock } from 'lucide-react'

const ComingSoon: React.FC = () => {
  const location = useLocation()
  
  // Format the page name from route
  const pageName = location.pathname
    .split('/')
    .pop()
    ?.split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || 'Page'

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  }

  const floatingVariants = {
    float: {
      y: [0, -20, 0],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  }

  const pulseVariants = {
    pulse: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-72 h-72 bg-purple-500/20 rounded-full blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, 40, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          style={{ top: '10%', right: '10%' }}
        />
        <motion.div
          className="absolute w-96 h-96 bg-pink-500/20 rounded-full blur-3xl"
          animate={{ x: [0, -40, 0], y: [0, -30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          style={{ bottom: '10%', left: '-5%' }}
        />
      </div>

      {/* Main Content */}
      <motion.div
        className="relative z-10 max-w-2xl mx-auto text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Top Icon */}
        <motion.div variants={itemVariants} className="mb-8">
          <motion.div
            className="inline-block"
            variants={floatingVariants}
            animate="float"
          >
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-6 rounded-full shadow-2xl">
              <Zap className="w-12 h-12 text-white" />
            </div>
          </motion.div>
        </motion.div>

        {/* Main Title */}
        <motion.h1
          variants={itemVariants}
          className="text-5xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400"
        >
          Coming Soon
        </motion.h1>

        {/* Page Name */}
        <motion.div
          variants={itemVariants}
          className="inline-block bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/50 rounded-full px-6 py-2 mb-8"
        >
          <p className="text-lg font-semibold text-purple-300 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {pageName}
          </p>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="text-xl md:text-2xl text-gray-300 mb-2"
        >
          This page is under development
        </motion.p>

        {/* Description */}
        <motion.div variants={itemVariants} className="mb-12">
          <p className="text-gray-400 text-lg leading-relaxed max-w-md mx-auto">
            We're working hard to bring you this amazing feature. Check back soon!
          </p>
        </motion.div>

        {/* Loading Animation */}
        <motion.div
          variants={itemVariants}
          className="mt-12 flex items-center justify-center gap-2"
        >
          <motion.div
            className="w-2 h-2 bg-purple-400 rounded-full"
            variants={pulseVariants}
            animate="pulse"
          />
          <motion.div
            className="w-2 h-2 bg-pink-400 rounded-full"
            animate="pulse"
            transition={{ delay: 0.2, duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="w-2 h-2 bg-purple-400 rounded-full"
            animate="pulse"
            transition={{ delay: 0.4, duration: 2, repeat: Infinity }}
          />
        </motion.div>
      </motion.div>
    </div>
  )
}

export default ComingSoon
