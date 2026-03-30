'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Gamepad2, Store, Package, Coins, Skull, Heart, Sword, 
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  X, Zap, Trophy, Star, Sparkles, Volume2, VolumeX, RotateCcw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useGameStore, RARITY_CONFIG, AVAILABLE_CLAWS, type Toy, type Claw } from '@/lib/game-store'

// Pre-generated particle positions (deterministic for SSR)
const PARTICLE_POSITIONS = [
  { left: 10, top: 20, duration: 3.2, delay: 0.5 },
  { left: 25, top: 45, duration: 4.1, delay: 1.2 },
  { left: 40, top: 15, duration: 3.5, delay: 0.8 },
  { left: 55, top: 70, duration: 4.3, delay: 1.5 },
  { left: 70, top: 35, duration: 3.8, delay: 0.3 },
  { left: 85, top: 55, duration: 4.0, delay: 1.8 },
  { left: 15, top: 80, duration: 3.6, delay: 0.9 },
  { left: 30, top: 10, duration: 4.2, delay: 1.1 },
  { left: 45, top: 60, duration: 3.4, delay: 0.4 },
  { left: 60, top: 25, duration: 4.5, delay: 1.6 },
  { left: 75, top: 85, duration: 3.9, delay: 0.7 },
  { left: 90, top: 40, duration: 4.4, delay: 1.3 },
  { left: 5, top: 50, duration: 3.7, delay: 0.2 },
  { left: 20, top: 75, duration: 4.6, delay: 1.9 },
  { left: 35, top: 30, duration: 3.3, delay: 0.6 },
  { left: 50, top: 90, duration: 4.8, delay: 1.4 },
  { left: 65, top: 5, duration: 3.1, delay: 0.1 },
  { left: 80, top: 65, duration: 4.7, delay: 1.7 },
  { left: 95, top: 20, duration: 3.2, delay: 1.0 },
  { left: 12, top: 45, duration: 4.0, delay: 0.8 },
]

// Sound effects (using Web Audio API)
const useSound = () => {
  const audioContext = useRef<AudioContext | null>(null)
  const [muted, setMuted] = useState(false)

  const playSound = useCallback((type: 'grab' | 'success' | 'fail' | 'boss' | 'hit' | 'coin') => {
    if (muted || typeof window === 'undefined') return
    
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    
    const ctx = audioContext.current
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    const now = ctx.currentTime
    
    switch(type) {
      case 'grab':
        oscillator.frequency.setValueAtTime(300, now)
        oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.1)
        gainNode.gain.setValueAtTime(0.1, now)
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
        oscillator.start(now)
        oscillator.stop(now + 0.2)
        break
      case 'success':
        oscillator.frequency.setValueAtTime(523, now)
        oscillator.frequency.setValueAtTime(659, now + 0.1)
        oscillator.frequency.setValueAtTime(784, now + 0.2)
        gainNode.gain.setValueAtTime(0.1, now)
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
        oscillator.start(now)
        oscillator.stop(now + 0.3)
        break
      case 'fail':
        oscillator.frequency.setValueAtTime(200, now)
        oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.2)
        gainNode.gain.setValueAtTime(0.1, now)
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
        oscillator.start(now)
        oscillator.stop(now + 0.2)
        break
      case 'boss':
        oscillator.type = 'sawtooth'
        oscillator.frequency.setValueAtTime(100, now)
        oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.5)
        gainNode.gain.setValueAtTime(0.15, now)
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5)
        oscillator.start(now)
        oscillator.stop(now + 0.5)
        break
      case 'hit':
        oscillator.type = 'square'
        oscillator.frequency.setValueAtTime(150, now)
        oscillator.frequency.exponentialRampToValueAtTime(80, now + 0.1)
        gainNode.gain.setValueAtTime(0.08, now)
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1)
        oscillator.start(now)
        oscillator.stop(now + 0.1)
        break
      case 'coin':
        oscillator.frequency.setValueAtTime(1200, now)
        oscillator.frequency.exponentialRampToValueAtTime(1400, now + 0.05)
        oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.1)
        gainNode.gain.setValueAtTime(0.08, now)
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
        oscillator.start(now)
        oscillator.stop(now + 0.15)
        break
    }
  }, [muted])

  return { playSound, muted, setMuted }
}

// Claw Machine Component
function ClawMachine() {
  const { 
    toysInMachine, 
    clawPosition, 
    clawDropping, 
    grabbedToy,
    currentClaw,
    moveClaw,
    dropClaw,
    phase
  } = useGameStore()
  
  const { playSound } = useSound()
  const [dropPhase, setDropPhase] = useState<'idle' | 'dropping' | 'grabbing' | 'rising'>('idle')

  const handleDrop = () => {
    if (phase !== 'playing' || clawDropping) return
    playSound('grab')
    setDropPhase('dropping')
    dropClaw()
    
    setTimeout(() => {
      setDropPhase('grabbing')
    }, 800)
    
    setTimeout(() => {
      setDropPhase('rising')
    }, 1200)
    
    setTimeout(() => {
      if (grabbedToy) {
        playSound('success')
      } else {
        playSound('fail')
      }
      setDropPhase('idle')
    }, 2000)
  }

  return (
    <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl">
      {/* Claw machine background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/claw-machine.png)` }}
      />
      
      {/* Dark overlay to make toys more visible */}
      <div className="absolute inset-0 bg-black/30" />
      
      {/* Glass effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none z-10" />
      
      {/* Animated lights */}
      <div className="absolute top-2 left-2 right-2 flex justify-around z-5">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="w-3 h-3 rounded-full"
            style={{ 
              backgroundColor: ['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899', '#F97316', '#06B6D4'][i]
            }}
            animate={{
              opacity: [0.5, 1, 0.5],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.1,
            }}
          />
        ))}
      </div>
      
      {/* Prize area - transparent to show background image */}
      <div className="absolute top-24 left-3 right-3 bottom-28 rounded-2xl overflow-hidden">
        {/* Loading state when no toys */}
        {toysInMachine.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center text-white">
              <motion.div
                className="text-4xl mb-2"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                🎰
              </motion.div>
              <p className="text-sm">Loading toys...</p>
            </div>
          </div>
        )}
        
        {/* Grid of toys */}
        <div className="relative w-full h-full p-2">
          {toysInMachine.map((toy, index) => {
            const row = Math.floor(index / 4)
            const col = index % 4
            const x = 12 + col * 26
            const y = 30 + row * 22
            
            return (
              <motion.div
                key={toy.id}
                className={`absolute text-2xl md:text-4xl cursor-pointer transition-transform ${
                  grabbedToy?.id === toy.id ? 'z-20' : 'z-0'
                }`}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                initial={{ scale: 0, opacity: 0, y: 20 }}
                animate={{ 
                  scale: grabbedToy?.id === toy.id ? 1.3 : 1, 
                  opacity: 1,
                  y: grabbedToy?.id === toy.id ? -80 : 0,
                  rotate: grabbedToy?.id === toy.id ? [0, -10, 10, 0] : [0, 2, -2, 0],
                }}
                transition={{ 
                  delay: index * 0.03,
                  rotate: { duration: 4, repeat: Infinity }
                }}
                whileHover={{ scale: 1.2 }}
              >
                <motion.span 
                  className={`drop-shadow-lg inline-block ${toy.id === 'red-block' ? 'animate-pulse' : ''}`}
                  animate={toy.id === 'red-block' ? {
                    filter: [
                      'drop-shadow(0 0 8px #EF4444)',
                      'drop-shadow(0 0 16px #EF4444)',
                      'drop-shadow(0 0 8px #EF4444)',
                    ]
                  } : {}}
                  transition={{ duration: 1, repeat: Infinity }}
                  style={{ 
                    filter: toy.id !== 'red-block' ? `drop-shadow(0 0 6px ${RARITY_CONFIG[toy.rarity].color})` : undefined
                  }}
                >
                  {toy.emoji}
                </motion.span>
                {toy.id === 'red-block' && (
                  <motion.span 
                    className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-[8px] text-red-400 font-bold"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    ⚠️ BOSS
                  </motion.span>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
      
      {/* Claw mechanism */}
      <motion.div
        className="absolute z-30"
        style={{
          left: `${clawPosition.x}%`,
          top: 0,
        }}
        animate={{
          y: dropPhase === 'dropping' || dropPhase === 'grabbing' ? 180 : 0
        }}
        transition={{ 
          duration: dropPhase === 'dropping' ? 0.8 : 0.6, 
          ease: dropPhase === 'dropping' ? 'easeIn' : 'easeOut' 
        }}
      >
        {/* Claw arm */}
        <div className="relative">
          <div 
            className="w-1.5 bg-gradient-to-b from-gray-300 to-gray-500 mx-auto rounded-full"
            style={{ height: dropPhase === 'idle' ? clawPosition.y + 30 : 220 }}
          />
          {/* Claw head */}
          <div className="relative -top-2 left-1/2 transform -translate-x-1/2">
            <motion.div 
              className="text-3xl origin-top"
              animate={{ 
                rotateZ: dropPhase === 'grabbing' ? 45 : 0,
                scale: dropPhase === 'grabbing' ? 0.9 : 1,
              }}
              transition={{ duration: 0.2 }}
              style={{ color: getClawColor(currentClaw.rarity) }}
            >
              🪝
            </motion.div>
            {/* Claw glow effect */}
            <motion.div
              className="absolute inset-0 rounded-full blur-md opacity-50"
              style={{ backgroundColor: getClawColor(currentClaw.rarity) }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            {/* Grabbed toy follows claw */}
            {grabbedToy && (dropPhase === 'grabbing' || dropPhase === 'rising') && (
              <motion.div
                className="absolute top-10 left-1/2 transform -translate-x-1/2 text-3xl"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                {grabbedToy.emoji}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
      
      {/* Drop button */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            size="lg"
            className="bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white font-bold text-lg px-8 py-6 rounded-xl shadow-lg shadow-red-500/50 disabled:opacity-50 border-2 border-red-400 uppercase tracking-wider"
            onClick={handleDrop}
            disabled={clawDropping}
          >
            {clawDropping ? (
              <motion.span
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                🎮 GRABBING...
              </motion.span>
            ) : (
              <>🎰 DROP!</>
            )}
          </Button>
        </motion.div>
      </div>
      
      {/* Claw info tooltip */}
      <div className="absolute bottom-20 left-2 bg-black/70 px-3 py-1.5 rounded-lg text-xs text-white z-30 border border-amber-500/30">
        <span style={{ color: getClawColor(currentClaw.rarity) }} className="font-bold">{currentClaw.name}</span>
        <span className="text-slate-300 ml-1">({(currentClaw.dropChance * 100).toFixed(0)}% grab)</span>
      </div>
    </div>
  )
}

function getClawColor(rarity: string): string {
  const colors: Record<string, string> = {
    common: '#9CA3AF',
    rare: '#3B82F6',
    epic: '#A855F7',
    legendary: '#F59E0B',
    mythic: '#EF4444',
    secret: '#10B981',
    transcendent: '#F97316',
  }
  return colors[rarity] || '#9CA3AF'
}

// Directional Controls
function Controls() {
  const { moveClaw, clawDropping, phase } = useGameStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopMoving = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
  }, [])

  const startMoving = useCallback((dx: number, dy: number) => {
    if (clawDropping || phase !== 'playing') return
    moveClaw(dx, dy)
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => moveClaw(dx, dy), 80)
    }, 300)
  }, [moveClaw, clawDropping, phase])

  useEffect(() => () => stopMoving(), [stopMoving])

  // Keyboard: single step per keydown, ignore OS key-repeat
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.repeat || phase !== 'playing') return
    switch(e.key) {
      case 'ArrowUp': case 'w': case 'W': moveClaw(0, -2); break
      case 'ArrowDown': case 's': case 'S': moveClaw(0, 2); break
      case 'ArrowLeft': case 'a': case 'A': moveClaw(-2, 0); break
      case 'ArrowRight': case 'd': case 'D': moveClaw(2, 0); break
    }
  }, [moveClaw, phase])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const dirButton = (dx: number, dy: number, icon: React.ReactNode) => (
    <motion.div whileTap={{ scale: 0.9 }}>
      <Button
        variant="outline"
        size="icon"
        className="h-14 w-14 rounded-xl active:scale-95 transition-transform bg-slate-700 hover:bg-slate-600 border-slate-500"
        onMouseDown={() => startMoving(dx, dy)}
        onMouseUp={stopMoving}
        onMouseLeave={stopMoving}
        onTouchStart={() => startMoving(dx, dy)}
        onTouchEnd={stopMoving}
        disabled={clawDropping}
      >
        {icon}
      </Button>
    </motion.div>
  )

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs text-muted-foreground mb-1">Arrow keys / WASD / Tap to move</p>
      <div className="grid grid-cols-3 gap-1.5">
        <div />
        {dirButton(0, -2, <ChevronUp className="h-6 w-6" />)}
        <div />
        {dirButton(-2, 0, <ChevronLeft className="h-6 w-6" />)}
        <div className="h-14 w-14 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-600">
          <Gamepad2 className="h-6 w-6 text-amber-400" />
        </div>
        {dirButton(2, 0, <ChevronRight className="h-6 w-6" />)}
        <div />
        {dirButton(0, 2, <ChevronDown className="h-6 w-6" />)}
        <div />
      </div>
    </div>
  )
}

// Shop Component
function Shop() {
  const { money, ownedClaws, buyClaw, equipClaw, currentClaw, setPhase } = useGameStore()
  const { playSound } = useSound()

  const groupedClaws = useMemo(() => {
    return AVAILABLE_CLAWS.reduce((acc, claw) => {
      if (!acc[claw.rarity]) acc[claw.rarity] = []
      acc[claw.rarity].push(claw)
      return acc
    }, {} as Record<string, Claw[]>)
  }, [])

  const rarityOrder = ['common', 'rare', 'epic', 'legendary', 'mythic', 'secret', 'transcendent']
  const rarityNames: Record<string, string> = {
    common: 'Common',
    rare: 'Rare',
    epic: 'Epic',
    legendary: 'Legendary',
    mythic: 'Mythic',
    secret: 'Secret',
    transcendent: 'Transcendent',
  }

  const handleBuy = (claw: Claw) => {
    if (money >= claw.price) {
      playSound('coin')
      buyClaw(claw)
    }
  }

  return (
    <motion.div 
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-2 md:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => setPhase('playing')} // Close on backdrop click
    >
      <Card 
        className="w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 border-slate-700"
        onClick={(e) => e.stopPropagation()} // Prevent close when clicking inside card
      >
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-700 p-4">
          <div>
            <CardTitle className="text-xl md:text-2xl text-white flex items-center gap-2">
              <Store className="h-5 w-5 md:h-6 md:w-6" /> Claw Shop
            </CardTitle>
            <CardDescription className="text-slate-400 text-sm">
              Upgrade your claw for better grabs!
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-lg md:text-xl font-bold text-amber-400">
              <Coins className="h-4 w-4 md:h-5 md:w-5" /> {money.toLocaleString()}
            </div>
            <Button 
              variant="destructive" 
              size="icon" 
              className="h-10 w-10 rounded-full bg-red-500 hover:bg-red-600"
              onClick={() => setPhase('playing')}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-y-auto max-h-[75vh] p-3 md:p-4 space-y-5">
          {rarityOrder.map(rarity => {
            const claws = groupedClaws[rarity]
            if (!claws) return null
            
            return (
              <div key={rarity}>
                <h3 
                  className="text-base md:text-lg font-bold mb-3 flex items-center gap-2"
                  style={{ color: getClawColor(rarity) }}
                >
                  <Sparkles className="h-4 w-4" />
                  {rarityNames[rarity]} Claws
                  <Badge variant="outline" className="ml-2 text-xs">
                    {claws.length} available
                  </Badge>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {claws.map(claw => {
                    const owned = ownedClaws.find(c => c.id === claw.id)
                    const equipped = currentClaw.id === claw.id
                    const canAfford = money >= claw.price
                    
                    return (
                      <motion.div
                        key={claw.id}
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card 
                          className={`p-3 md:p-4 transition-all ${
                            equipped 
                              ? 'border-2 border-green-500 bg-green-500/10' 
                              : owned 
                                ? 'border-2 border-amber-500/50 bg-amber-500/5'
                                : canAfford
                                  ? 'border border-slate-600 hover:border-slate-500 bg-slate-800/50'
                                  : 'border border-slate-700 opacity-60 bg-slate-800/30'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-white text-sm md:text-base">{claw.name}</h4>
                            <div className="flex items-center gap-1 text-amber-400 font-bold text-sm">
                              <Coins className="h-3 w-3" />
                              {claw.price === 0 ? 'FREE' : claw.price.toLocaleString()}
                            </div>
                          </div>
                          <p className="text-xs md:text-sm text-slate-400 mb-3">{claw.description}</p>
                          <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                            <div className="text-center p-1.5 md:p-2 bg-slate-800 rounded">
                              <div className="text-slate-400">Drop %</div>
                              <div className="font-bold text-white">{(claw.dropChance * 100).toFixed(0)}%</div>
                            </div>
                            <div className="text-center p-1.5 md:p-2 bg-slate-800 rounded">
                              <div className="text-slate-400">Range</div>
                              <div className="font-bold text-white">{claw.range}x</div>
                            </div>
                            <div className="text-center p-1.5 md:p-2 bg-slate-800 rounded">
                              <div className="text-slate-400">Speed</div>
                              <div className="font-bold text-white">{claw.speed}x</div>
                            </div>
                          </div>
                          {equipped ? (
                            <Button className="w-full text-sm" disabled variant="secondary">
                              <Zap className="h-4 w-4 mr-2" /> Equipped
                            </Button>
                          ) : owned ? (
                            <Button 
                              className="w-full bg-amber-500 hover:bg-amber-600 text-sm"
                              onClick={() => { playSound('coin'); equipClaw(claw); }}
                            >
                              Equip
                            </Button>
                          ) : (
                            <Button 
                              className="w-full text-sm"
                              disabled={!canAfford}
                              onClick={() => handleBuy(claw)}
                            >
                              {canAfford ? 'Buy' : 'Need more coins'}
                            </Button>
                          )}
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Collection Component
function Collection() {
  const { collectedToys, sellToy, setPhase, money } = useGameStore()
  const { playSound } = useSound()
  const [filter, setFilter] = useState<string>('all')

  const filteredToys = filter === 'all' 
    ? collectedToys 
    : collectedToys.filter(t => t.rarity === filter)

  const totalValue = collectedToys.reduce((sum, toy) => sum + toy.baseValue, 0)

  const handleSell = (toyId: string) => {
    playSound('coin')
    sellToy(toyId)
  }

  return (
    <motion.div 
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-2 md:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => setPhase('playing')} // Close on backdrop click
    >
      <Card 
        className="w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 border-slate-700"
        onClick={(e) => e.stopPropagation()} // Prevent close when clicking inside card
      >
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-700 p-4">
          <div>
            <CardTitle className="text-xl md:text-2xl text-white flex items-center gap-2">
              <Package className="h-5 w-5 md:h-6 md:w-6" /> My Collection
            </CardTitle>
            <CardDescription className="text-slate-400 text-sm">
              {collectedToys.length} toys • Value: ${totalValue.toLocaleString()}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-lg md:text-xl font-bold text-amber-400">
              <Coins className="h-4 w-4 md:h-5 md:w-5" /> {money.toLocaleString()}
            </div>
            <Button 
              variant="destructive" 
              size="icon" 
              className="h-10 w-10 rounded-full bg-red-500 hover:bg-red-600"
              onClick={() => setPhase('playing')}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 md:p-4">
          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button 
              variant={filter === 'all' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('all')}
            >
              All ({collectedToys.length})
            </Button>
            {Object.entries(RARITY_CONFIG).map(([rarity, config]) => {
              const count = collectedToys.filter(t => t.rarity === rarity).length
              if (count === 0) return null
              return (
                <Button
                  key={rarity}
                  variant={filter === rarity ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(rarity)}
                  style={{ borderColor: config.color }}
                >
                  {config.name} ({count})
                </Button>
              )
            })}
          </div>
          
          {/* Toys grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[55vh] overflow-y-auto pr-1">
            {filteredToys.map((toy, index) => (
              <motion.div
                key={toy.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.02 }}
              >
                <Card className="p-3 bg-slate-800/50 hover:bg-slate-800/70 transition-colors">
                  <div className="text-center mb-2">
                    <motion.span 
                      className="text-3xl md:text-4xl inline-block"
                      whileHover={{ scale: 1.2, rotate: [0, -10, 10, 0] }}
                      style={{ filter: `drop-shadow(0 0 8px ${RARITY_CONFIG[toy.rarity].color})` }}
                    >
                      {toy.emoji}
                    </motion.span>
                  </div>
                  <h4 className="font-bold text-xs md:text-sm text-white truncate">{toy.name}</h4>
                  <div className="flex justify-between items-center mt-1 text-xs">
                    <span style={{ color: RARITY_CONFIG[toy.rarity].color }}>
                      {RARITY_CONFIG[toy.rarity].name}
                    </span>
                    <span className="text-amber-400 font-bold">${toy.baseValue}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1 text-xs text-slate-400">
                    <span>⚔️ {toy.attack}</span>
                    <span>🛡️ {toy.defense}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 text-xs h-8"
                    onClick={() => handleSell(toy.id)}
                  >
                    Sell ${toy.baseValue}
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
          
          {filteredToys.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No toys collected yet. Start grabbing!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Boss Fight Component
function BossFight() {
  const { 
    currentBoss, 
    bossHealth, 
    playerHealth, 
    collectedToys,
    attackBoss,
    receiveDamage,
    endBossFight,
  } = useGameStore()
  
  const { playSound } = useSound()
  const [selectedToy, setSelectedToy] = useState<Toy | null>(null)
  const [isAttacking, setIsAttacking] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [shakeScreen, setShakeScreen] = useState(false)

  const addLog = (message: string) => {
    setLog(prev => [...prev.slice(-4), message])
  }

  const handleAttack = () => {
    if (!selectedToy || !currentBoss || isAttacking) return
    
    setIsAttacking(true)
    
    // Player attacks
    const playerDamage = selectedToy.attack + Math.floor(Math.random() * 5)
    attackBoss(playerDamage)
    playSound('hit')
    addLog(`You dealt ${playerDamage} damage!`)
    
    setTimeout(() => {
      // Boss attacks back
      const bossDamage = Math.max(0, currentBoss.attack - selectedToy.defense + Math.floor(Math.random() * 3))
      receiveDamage(bossDamage)
      playSound('hit')
      addLog(`${currentBoss.name} dealt ${bossDamage} damage!`)
      setShakeScreen(true)
      setTimeout(() => setShakeScreen(false), 200)
      setIsAttacking(false)
      
      // Check if boss is defeated
      if (bossHealth - playerDamage <= 0) {
        playSound('success')
        setTimeout(() => endBossFight(true), 500)
      }
    }, 500)
  }

  if (!currentBoss) return null

  return (
    <motion.div 
      className="fixed inset-0 bg-gradient-to-b from-red-950 via-red-900 to-black z-50 flex items-center justify-center p-2 md:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, x: shakeScreen ? [0, -5, 5, -5, 5, 0] : 0 }}
      exit={{ opacity: 0 }}
    >
      <Card className="w-full max-w-2xl bg-black/60 border-red-800 backdrop-blur-sm">
        <CardHeader className="text-center border-b border-red-800 p-4">
          <motion.div 
            className="text-5xl md:text-6xl mb-2"
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, -5, 5, 0]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {currentBoss.emoji}
          </motion.div>
          <CardTitle className="text-2xl md:text-3xl text-red-400 flex items-center justify-center gap-2">
            <Skull className="h-6 w-6 md:h-8 md:w-8" /> {currentBoss.name}
          </CardTitle>
          <CardDescription className="text-red-300">
            Boss Level {currentBoss.level} • Reward: ${currentBoss.reward.toLocaleString()}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Health bars */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs md:text-sm font-bold text-green-400 flex items-center gap-1">
                  <Heart className="h-3 w-3" /> You
                </span>
                <span className="text-xs md:text-sm text-green-400">{playerHealth}/100</span>
              </div>
              <Progress value={playerHealth} className="h-3 md:h-4 bg-gray-800 [&>div]:bg-gradient-to-r [&>div]:from-green-600 [&>div]:to-green-400" />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-xs md:text-sm font-bold text-red-400 flex items-center gap-1">
                  <Skull className="h-3 w-3" /> Boss
                </span>
                <span className="text-xs md:text-sm text-red-400">{bossHealth}/{currentBoss.health}</span>
              </div>
              <Progress value={(bossHealth / currentBoss.health) * 100} className="h-3 md:h-4 bg-gray-800 [&>div]:bg-gradient-to-r [&>div]:from-red-600 [&>div]:to-red-400" />
            </div>
          </div>
          
          {/* Battle log */}
          <div className="bg-black/60 rounded-lg p-2 md:p-3 min-h-[50px] md:min-h-[60px] border border-red-900/50">
            {log.map((msg, i) => (
              <motion.p 
                key={i} 
                className="text-xs md:text-sm text-gray-300"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                {msg}
              </motion.p>
            ))}
            {log.length === 0 && (
              <p className="text-xs md:text-sm text-gray-500">Select a toy and attack!</p>
            )}
          </div>
          
          {/* Toy selection */}
          <div>
            <h4 className="font-bold text-white mb-2 flex items-center gap-2 text-sm md:text-base">
              <Sword className="h-4 w-4" /> Select Weapon ({collectedToys.length} toys)
            </h4>
            <div className="flex flex-wrap gap-2 max-h-28 md:max-h-32 overflow-y-auto p-2 bg-black/40 rounded-lg border border-red-900/30">
              {collectedToys.length === 0 ? (
                <p className="text-gray-500 text-sm">No toys to fight with!</p>
              ) : (
                collectedToys.map(toy => (
                  <motion.div
                    key={toy.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant={selectedToy?.id === toy.id ? 'default' : 'outline'}
                      size="sm"
                      className={`h-auto py-2 px-2 md:px-3 ${
                        selectedToy?.id === toy.id 
                          ? 'border-2 border-amber-400 bg-amber-500/20' 
                          : ''
                      }`}
                      onClick={() => setSelectedToy(toy)}
                      disabled={isAttacking}
                    >
                      <span className="text-lg md:text-xl mr-1 md:mr-2">{toy.emoji}</span>
                      <span className="text-xs hidden sm:inline">
                        ⚔️{toy.attack} 🛡️{toy.defense}
                      </span>
                    </Button>
                  </motion.div>
                ))
              )}
            </div>
          </div>
          
          {/* Attack button */}
          <div className="flex gap-3">
            <motion.div className="flex-1" whileTap={{ scale: 0.95 }}>
              <Button
                className="w-full h-12 md:h-14 text-base md:text-lg font-bold bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 disabled:opacity-50 shadow-lg shadow-red-500/30"
                onClick={handleAttack}
                disabled={!selectedToy || isAttacking || collectedToys.length === 0}
              >
                <Sword className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                {isAttacking ? 'ATTACKING...' : 'ATTACK!'}
              </Button>
            </motion.div>
            <Button
              variant="outline"
              className="h-12 md:h-14 px-4 md:px-6 border-red-800 text-red-400 hover:bg-red-900/50"
              onClick={() => endBossFight(false)}
            >
              Flee
            </Button>
          </div>
          
          {collectedToys.length === 0 && (
            <p className="text-center text-red-400 text-sm animate-pulse">
              ⚠️ You have no toys to fight with! The boss wins...
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Stats Display
function StatsDisplay() {
  const { money, currentClaw, totalToysCollected, totalBossesDefeated } = useGameStore()
  
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 text-sm">
      <motion.div 
        className="flex items-center gap-1.5 md:gap-2 bg-slate-800/80 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-amber-500/30"
        whileHover={{ scale: 1.05 }}
      >
        <Coins className="h-4 w-4 md:h-5 md:w-5 text-amber-400" />
        <span className="font-bold text-amber-400 text-sm md:text-base">${money.toLocaleString()}</span>
      </motion.div>
      <motion.div 
        className="flex items-center gap-1.5 md:gap-2 bg-slate-800/80 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-slate-600"
        whileHover={{ scale: 1.05 }}
      >
        <span className="text-base md:text-lg">🪝</span>
        <span className="font-medium text-white text-xs md:text-sm">{currentClaw.name}</span>
      </motion.div>
      <motion.div 
        className="flex items-center gap-1.5 md:gap-2 bg-slate-800/80 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-slate-600"
        whileHover={{ scale: 1.05 }}
      >
        <Package className="h-3 w-3 md:h-4 md:w-4 text-blue-400" />
        <span className="text-slate-300 text-xs md:text-sm">{totalToysCollected} toys</span>
      </motion.div>
      <motion.div 
        className="flex items-center gap-1.5 md:gap-2 bg-slate-800/80 px-3 md:px-4 py-1.5 md:py-2 rounded-full border border-slate-600"
        whileHover={{ scale: 1.05 }}
      >
        <Trophy className="h-3 w-3 md:h-4 md:w-4 text-amber-400" />
        <span className="text-slate-300 text-xs md:text-sm">{totalBossesDefeated} bosses</span>
      </motion.div>
    </div>
  )
}

// Main Game Component
export default function Home() {
  const { phase, setPhase, initializeGame } = useGameStore()
  const { muted, setMuted } = useSound()
  const [mounted, setMounted] = useState(false)

  // Initialize game on client side only
  useEffect(() => {
    initializeGame()
    // Defer setState to avoid cascading renders
    const timer = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(timer)
  }, [initializeGame])

  // Show loading state during hydration
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            className="text-6xl mb-4"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            🪝
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-2">
            <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
              CASH GRAB
            </span>
          </h1>
          <motion.div
            className="flex justify-center gap-1"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-amber-400" />
            ))}
          </motion.div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Animated background particles - using pre-generated positions */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {PARTICLE_POSITIONS.map((pos, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-amber-400/30 rounded-full"
            style={{
              left: `${pos.left}%`,
              top: `${pos.top}%`,
            }}
            animate={{
              y: [-20, 20],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: pos.duration,
              repeat: Infinity,
              delay: pos.delay,
            }}
          />
        ))}
      </div>
      
      {/* Header */}
      <header className="p-3 md:p-4 border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm relative z-10 flex-shrink-0">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-center gap-2 mb-3">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Star className="h-5 w-5 md:h-6 md:w-6 text-amber-400" />
            </motion.div>
            <h1 className="text-2xl md:text-3xl font-bold text-center text-white">
              <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
                CASH GRAB
              </span>
            </h1>
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Star className="h-5 w-5 md:h-6 md:w-6 text-amber-400" />
            </motion.div>
          </div>
          <StatsDisplay />
        </div>
      </header>
      
      {/* Main Game Area */}
      <main className="flex-1 p-3 md:p-4 relative z-10 flex flex-col min-h-0">
        <div className="max-w-md mx-auto w-full flex-1 flex flex-col gap-3 min-h-0">
          {/* Claw Machine - fixed height to ensure visibility */}
          <div className="w-full aspect-[3/4] md:aspect-[4/5] relative flex-shrink-0" style={{ minHeight: '300px', maxHeight: '500px' }}>
            <ClawMachine />
          </div>
          
          {/* Controls */}
          <motion.div 
            className="bg-slate-800/80 rounded-2xl p-3 md:p-4 border border-slate-700/50 backdrop-blur-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Controls />
          </motion.div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <motion.div className="flex-1" whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                className="w-full h-12 md:h-14 bg-gradient-to-b from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 border-slate-500"
                onClick={() => setPhase('shop')}
              >
                <Store className="h-4 w-4 md:h-5 md:w-5 mr-2" /> Shop
              </Button>
            </motion.div>
            <motion.div className="flex-1" whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                className="w-full h-12 md:h-14 bg-gradient-to-b from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 border-slate-500"
                onClick={() => setPhase('collection')}
              >
                <Package className="h-4 w-4 md:h-5 md:w-5 mr-2" /> Collection
              </Button>
            </motion.div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="p-3 md:p-4 text-center text-slate-500 text-xs md:text-sm border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-sm relative z-10 flex-shrink-0">
        <p>🎮 Arrow keys / WASD to move • DROP to grab!</p>
        <p className="mt-1">📦 Grab the <span className="text-red-400 font-bold">red block</span> to fight a boss! • Progress auto-saved 💾</p>
      </footer>
      
      {/* Sound toggle */}
      <motion.button
        className="fixed bottom-20 right-4 z-20 w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-slate-600"
        onClick={() => setMuted(!muted)}
        whileTap={{ scale: 0.9 }}
      >
        {muted ? <VolumeX className="h-5 w-5 text-slate-400" /> : <Volume2 className="h-5 w-5 text-amber-400" />}
      </motion.button>
      
      {/* Reset Game Button */}
      <div className="fixed bottom-20 right-16 z-20">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <motion.button
              className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-slate-600"
              whileTap={{ scale: 0.9 }}
            >
              <RotateCcw className="h-5 w-5 text-slate-400 hover:text-red-400" />
            </motion.button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-slate-900 border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Reset Game?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                This will erase all your progress including money, collected toys, owned claws, and stats. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                className="bg-red-500 hover:bg-red-600"
                onClick={() => {
                  const store = useGameStore.getState()
                  store.resetGame()
                  store.initializeGame()
                }}
              >
                Reset Game
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      
      {/* Modals */}
      <AnimatePresence>
        {phase === 'shop' && <Shop />}
        {phase === 'collection' && <Collection />}
        {phase === 'boss-fight' && <BossFight />}
      </AnimatePresence>
    </div>
  )
}
