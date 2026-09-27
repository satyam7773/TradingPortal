import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Shield, Clock, CheckCircle2 } from 'lucide-react'

const DashboardPage: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [username, setUsername] = useState('Trader')

  useEffect(() => {
    // Get username from localStorage
    const userDataStr = localStorage.getItem('userData')
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr)
        setUsername(userData.username || 'Trader')
      } catch (e) {
        setUsername('Trader')
      }
    }

    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  }

  return (
    <div className="h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative overflow-hidden flex flex-col">
      {/* Enhanced animated background with brand colors */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Purple glow (brand primary) */}
        <motion.div
          animate={{
            x: [0, 100, -100, 0],
            y: [0, 50, -50, 0],
          }}
          transition={{ duration: 20, repeat: Infinity }}
          className="absolute top-20 right-1/4 w-96 h-96 bg-gradient-to-br from-purple-600/20 to-purple-400/10 rounded-full blur-3xl"
        />
        {/* Red/Pink glow (brand accent) */}
        <motion.div
          animate={{
            x: [0, -100, 100, 0],
            y: [0, -50, 50, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, delay: 2 }}
          className="absolute bottom-0 left-1/3 w-96 h-96 bg-gradient-to-br from-red-600/20 to-pink-500/15 rounded-full blur-3xl"
        />
        {/* Accent glow */}
        <motion.div
          animate={{
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, delay: 1 }}
          className="absolute top-1/2 right-0 w-80 h-80 bg-gradient-to-br from-pink-600/20 to-purple-500/15 rounded-full blur-3xl"
        />
      </div>

      {/* Content - Flexbox layout to fit entire screen */}
      <div className="relative z-10 flex flex-col flex-1 overflow-hidden">
        {/* Header Section - Compact */}
        <motion.div
          className="px-6 sm:px-8 lg:px-12 pt-6 pb-4 flex-shrink-0"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <motion.div
                  className="mb-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <span className="text-xs uppercase tracking-widest font-bold text-purple-400 dark:text-purple-300">Welcome Back</span>
                </motion.div>
                <motion.h1
                  className="text-4xl md:text-5xl font-black leading-tight"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
                    {username}
                  </span>
                </motion.h1>
              </div>

              {/* Status Badge */}
              {/* <motion.div
                className="flex items-center gap-3 bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-500/30 dark:border-purple-600/50 rounded-full px-5 py-2 backdrop-blur-sm h-fit"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.05 }}
              >
                <span className="inline-block w-2.5 h-2.5 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse" />
                <span className="text-xs font-semibold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                  Active
                </span>
              </motion.div> */}
            </div>

            {/* Time */}
            <motion.div
              className="flex items-center gap-3 text-slate-300 dark:text-slate-400 mt-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium">
                {currentTime.toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
              <span className="text-slate-500 dark:text-slate-600 text-sm">
                {currentTime.toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            </motion.div>
          </div>
        </motion.div>

        {/* Main Disclaimer Card - Fills remaining space */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="px-6 sm:px-8 lg:px-12 pb-6 flex-1 flex flex-col overflow-hidden"
        >
          <div className="max-w-7xl mx-auto flex-1 flex flex-col">
            {/* Glow background */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/30 via-pink-600/30 to-red-600/30 rounded-3xl opacity-20 blur-2xl"></div>

            {/* Main Card */}
            <div className="relative bg-gradient-to-br from-slate-800/60 to-slate-900/40 dark:from-slate-800/80 dark:to-slate-900/60 border border-purple-500/30 dark:border-purple-600/40 rounded-3xl p-6 lg:p-8 backdrop-blur-xl shadow-2xl flex flex-col overflow-visible">
              {/* Decorative top border */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500/0 via-purple-500/50 to-purple-500/0 rounded-t-3xl"></div>

              {/* Header */}
              <motion.div
                className="mb-6 text-center flex-shrink-0"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
              >
                <div className="flex justify-center mb-3">
                  <motion.div
                    className="p-3 bg-gradient-to-br from-purple-500/50 to-pink-500/40 rounded-2xl border border-purple-400/40 dark:border-purple-500/50 shadow-lg"
                    whileHover={{ scale: 1.15, rotate: 5 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Shield className="w-7 h-7 text-pink-200 dark:text-purple-200" />
                  </motion.div>
                </div>
                <h2 className="text-2xl lg:text-3xl font-black mb-2">
                  <span className="bg-gradient-to-r from-purple-300 via-pink-300 to-red-300 bg-clip-text text-transparent">
                    Important Disclaimer
                  </span>
                </h2>
                <p className="text-slate-300 dark:text-slate-400 text-sm">Please review the following before continuing</p>
              </motion.div>

              {/* Disclaimer Items - Grid layout */}
              <div className="flex-1 overflow-y-auto overflow-x-visible min-h-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 px-0.5">
                  {[
                    {
                      number: '1',
                      title: 'Educational Only',
                      desc: 'This application is designed for educational purposes exclusively.'
                    },
                    {
                      number: '2',
                      title: 'No Financial Advice',
                      desc: 'This platform does not provide tips, news, or information intended to influence trading decisions.'
                    },
                    {
                      number: '3',
                      title: 'No Real Transactions',
                      desc: 'There are no real monetary transactions involved in this application.'
                    }
                  ].map((item, idx) => (
                    <motion.div
                      key={idx}
                      className="group relative bg-gradient-to-br from-purple-500/15 via-pink-500/10 to-purple-500/15 dark:from-purple-900/25 dark:via-pink-900/15 dark:to-purple-900/25 border border-purple-500/40 dark:border-purple-600/50 rounded-2xl p-5 hover:border-pink-500/70 dark:hover:border-pink-600/70 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 flex flex-col overflow-hidden"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + idx * 0.1 }}
                      whileHover={{ y: -4, scale: 1.02 }}
                    >
                      {/* Animated left border */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500/0 via-pink-500/50 to-purple-500/0 rounded-l-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                      <div className="flex gap-4 flex-col flex-1">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-gradient-to-br from-purple-500/60 to-pink-500/50 group-hover:from-purple-500/80 group-hover:to-pink-500/70 transition-all flex-shrink-0 shadow-lg">
                            <span className="text-xs font-bold text-white">{item.number}</span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-100 dark:text-slate-50 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-300 group-hover:to-pink-300 group-hover:bg-clip-text transition-all duration-300">
                            {item.title}
                          </h3>
                        </div>
                        <p className="text-slate-300 dark:text-slate-400 group-hover:text-slate-200 dark:group-hover:text-slate-300 transition-colors text-xs leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Footer CTA */}
              {/* <motion.div
                className="pt-4 border-t border-purple-500/20 dark:border-purple-600/30 flex-shrink-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.95 }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    I acknowledge and accept these terms
                  </p>
                  <motion.div
                    className="flex items-center gap-2 text-xs font-bold text-purple-300 dark:text-purple-400 cursor-pointer px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg hover:from-purple-500/30 hover:to-pink-500/30 transition-all group"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Continue</span>
                  </motion.div>
                </div>
              </motion.div> */}


            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default DashboardPage
