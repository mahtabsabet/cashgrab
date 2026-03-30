import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Rarity types with colors and multipliers
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic'

export const RARITY_CONFIG: Record<Rarity, { color: string; bgColor: string; multiplier: number; name: string }> = {
  common: { color: '#9CA3AF', bgColor: 'bg-gray-400', multiplier: 1, name: 'Common' },
  uncommon: { color: '#22C55E', bgColor: 'bg-green-500', multiplier: 2, name: 'Uncommon' },
  rare: { color: '#3B82F6', bgColor: 'bg-blue-500', multiplier: 5, name: 'Rare' },
  epic: { color: '#A855F7', bgColor: 'bg-purple-500', multiplier: 10, name: 'Epic' },
  legendary: { color: '#F59E0B', bgColor: 'bg-amber-500', multiplier: 25, name: 'Legendary' },
  mythic: { color: '#EF4444', bgColor: 'bg-red-500', multiplier: 50, name: 'Mythic' },
}

// Toy types
export interface Toy {
  id: string
  name: string
  emoji: string
  rarity: Rarity
  baseValue: number
  attack: number
  defense: number
}

// Claw types
export type ClawRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'secret' | 'transcendent'

export interface Claw {
  id: string
  name: string
  rarity: ClawRarity
  price: number
  dropChance: number // 0-1, higher is better
  range: number // How far the claw can reach
  speed: number // Movement speed
  strength: number // Grip strength
  description: string
}

// Boss types
export interface Boss {
  id: string
  name: string
  emoji: string
  health: number
  attack: number
  reward: number
  level: number
}

// Game state
export interface GameState {
  // Player stats
  money: number
  currentClaw: Claw
  ownedClaws: Claw[]
  collectedToys: Toy[]
  
  // Game phase
  phase: 'playing' | 'grabbing' | 'boss-fight' | 'shop' | 'collection'
  
  // Claw machine state
  clawPosition: { x: number; y: number }
  clawMoving: boolean
  clawDropping: boolean
  grabbedToy: Toy | null
  
  // Toys in machine
  toysInMachine: Toy[]
  
  // Boss fight state
  currentBoss: Boss | null
  bossHealth: number
  playerHealth: number
  
  // Stats
  totalToysCollected: number
  totalBossesDefeated: number
  highestMoney: number
  
  // Actions
  initializeGame: () => void
  moveClaw: (dx: number, dy: number) => void
  dropClaw: () => void
  grabToy: (toy: Toy) => void
  collectMoney: (amount: number) => void
  buyClaw: (claw: Claw) => void
  equipClaw: (claw: Claw) => void
  startBossFight: () => void
  attackBoss: (damage: number) => void
  receiveDamage: (damage: number) => void
  endBossFight: (won: boolean) => void
  setPhase: (phase: GameState['phase']) => void
  resetMachine: () => void
  sellToy: (toyId: string) => void
  resetGame: () => void
}

// Generate a random toy
const generateToy = (): Toy => {
  const toyTypes = [
    { name: 'Teddy Bear', emoji: '🧸' },
    { name: 'Duck', emoji: '🦆' },
    { name: 'Panda', emoji: '🐼' },
    { name: 'Robot', emoji: '🤖' },
    { name: 'Rocket', emoji: '🚀' },
    { name: 'Star', emoji: '⭐' },
    { name: 'Gem', emoji: '💎' },
    { name: 'Crown', emoji: '👑' },
    { name: 'Gift', emoji: '🎁' },
    { name: 'Alien', emoji: '👽' },
    { name: 'Unicorn', emoji: '🦄' },
    { name: 'Dragon', emoji: '🐉' },
    { name: 'Phoenix', emoji: '🔥' },
    { name: 'Crystal', emoji: '💠' },
    { name: 'Lightning', emoji: '⚡' },
  ]
  
  const rarities: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']
  const rarityWeights = [50, 25, 15, 7, 2.5, 0.5] // Percentage chances
  
  const random = Math.random() * 100
  let cumulative = 0
  let selectedRarity: Rarity = 'common'
  
  for (let i = 0; i < rarities.length; i++) {
    cumulative += rarityWeights[i]
    if (random <= cumulative) {
      selectedRarity = rarities[i]
      break
    }
  }
  
  const toyType = toyTypes[Math.floor(Math.random() * toyTypes.length)]
  const rarityConfig = RARITY_CONFIG[selectedRarity]
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    name: `${rarityConfig.name} ${toyType.name}`,
    emoji: toyType.emoji,
    rarity: selectedRarity,
    baseValue: Math.floor(10 * rarityConfig.multiplier),
    attack: Math.floor(Math.random() * 5 + 1) * (rarities.indexOf(selectedRarity) + 1),
    defense: Math.floor(Math.random() * 3 + 1) * (rarities.indexOf(selectedRarity) + 1),
  }
}

// Generate toys for the machine (only call on client side)
const generateMachineToys = (count: number): Toy[] => {
  const toys: Toy[] = []
  for (let i = 0; i < count; i++) {
    toys.push(generateToy())
  }
  // Add one red block (boss trigger)
  toys.push({
    id: 'red-block',
    name: 'Mystery Red Block',
    emoji: '📦',
    rarity: 'common',
    baseValue: 0,
    attack: 0,
    defense: 0,
  })
  return toys
}

// Generate deterministic initial toys for SSR
const getInitialToys = (): Toy[] => {
  // Return empty array for SSR - will be populated on client
  return []
}

// Available claws in the shop
export const AVAILABLE_CLAWS: Claw[] = [
  // Common (2)
  {
    id: 'basic-claw',
    name: 'Basic Claw',
    rarity: 'common',
    price: 0,
    dropChance: 0.6, // 60% grab chance - feels better for new players
    range: 1,
    speed: 1,
    strength: 1,
    description: 'A simple claw. Good for beginners!',
  },
  {
    id: 'improved-claw',
    name: 'Improved Claw',
    rarity: 'common',
    price: 100,
    dropChance: 0.7,
    range: 1.2,
    speed: 1.1,
    strength: 1.2,
    description: 'Slightly better grip and reach.',
  },
  // Rare (2)
  {
    id: 'precision-claw',
    name: 'Precision Claw',
    rarity: 'rare',
    price: 500,
    dropChance: 0.8,
    range: 1.5,
    speed: 1.3,
    strength: 1.5,
    description: 'Enhanced precision for better grabs.',
  },
  {
    id: 'strong-claw',
    name: 'Strong Claw',
    rarity: 'rare',
    price: 750,
    dropChance: 0.85,
    range: 1.3,
    speed: 1.2,
    strength: 2,
    description: 'Extra grip strength for heavier toys.',
  },
  // Epic (2)
  {
    id: 'turbo-claw',
    name: 'Turbo Claw',
    rarity: 'epic',
    price: 2000,
    dropChance: 0.9,
    range: 2,
    speed: 2,
    strength: 2,
    description: 'Fast and efficient grabbing.',
  },
  {
    id: 'golden-claw',
    name: 'Golden Claw',
    rarity: 'epic',
    price: 3500,
    dropChance: 0.92,
    range: 2,
    speed: 1.8,
    strength: 2.5,
    description: 'Shiny and powerful. Attracts rare toys.',
  },
  // Legendary (2)
  {
    id: 'diamond-claw',
    name: 'Diamond Claw',
    rarity: 'legendary',
    price: 10000,
    dropChance: 0.95,
    range: 2.5,
    speed: 2.5,
    strength: 3,
    description: 'Unbreakable diamond-tipped grip.',
  },
  {
    id: 'phantom-claw',
    name: 'Phantom Claw',
    rarity: 'legendary',
    price: 15000,
    dropChance: 0.97,
    range: 3,
    speed: 3,
    strength: 3,
    description: 'Phase through toys for perfect positioning.',
  },
  // Mythic (1)
  {
    id: 'celestial-claw',
    name: 'Celestial Claw',
    rarity: 'mythic',
    price: 50000,
    dropChance: 0.98,
    range: 4,
    speed: 4,
    strength: 4,
    description: 'Blessed by the gods of grabbing.',
  },
  // Secret (1)
  {
    id: 'void-claw',
    name: 'Void Claw',
    rarity: 'secret',
    price: 100000,
    dropChance: 0.99,
    range: 5,
    speed: 5,
    strength: 5,
    description: 'Pulls toys from the void itself. Almost never misses.',
  },
  // Transcendent (1)
  {
    id: 'omni-claw',
    name: 'Omni Claw',
    rarity: 'transcendent',
    price: 500000,
    dropChance: 1,
    range: 10,
    speed: 10,
    strength: 10,
    description: 'Transcends all limits. Perfect grabs, every time.',
  },
]

// Boss configurations
const BOSSES: Boss[] = [
  { id: 'boss-1', name: 'Toy Soldier', emoji: '🎖️', health: 50, attack: 5, reward: 100, level: 1 },
  { id: 'boss-2', name: 'Evil Clown', emoji: '🤡', health: 100, attack: 10, reward: 250, level: 2 },
  { id: 'boss-3', name: 'Nightmare Doll', emoji: '🎎', health: 200, attack: 15, reward: 500, level: 3 },
  { id: 'boss-4', name: 'Toy Titan', emoji: '🗿', health: 400, attack: 25, reward: 1000, level: 4 },
  { id: 'boss-5', name: 'Arcade Demon', emoji: '👹', health: 800, attack: 40, reward: 2500, level: 5 },
]

// Create the store with persistence
export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // Initial state - safe for SSR
      money: 50,
      currentClaw: AVAILABLE_CLAWS[0],
      ownedClaws: [AVAILABLE_CLAWS[0]],
      collectedToys: [],
      
      phase: 'playing',
      
      clawPosition: { x: 50, y: 10 },
      clawMoving: false,
      clawDropping: false,
      grabbedToy: null,
      
      toysInMachine: [], // Empty for SSR, populated on client
      
      currentBoss: null,
      bossHealth: 0,
      playerHealth: 100,
      
      totalToysCollected: 0,
      totalBossesDefeated: 0,
      highestMoney: 50,
      
      // Initialize game on client side
      initializeGame: () => {
        const state = get()
        if (state.toysInMachine.length === 0) {
          set({
            toysInMachine: generateMachineToys(12),
          })
        }
      },
      
      // Actions
      moveClaw: (dx: number, dy: number) => {
        const state = get()
        if (state.phase !== 'playing' || state.clawDropping) return
        
        const speed = state.currentClaw.speed * 2
        const newX = Math.max(10, Math.min(90, state.clawPosition.x + dx * speed))
        const newY = Math.max(10, Math.min(90, state.clawPosition.y + dy * speed))
        
        set({ clawPosition: { x: newX, y: newY }, clawMoving: true })
        setTimeout(() => set({ clawMoving: false }), 100)
      },
  
  dropClaw: () => {
    const state = get()
    if (state.phase !== 'playing' || state.clawDropping) return
    
    set({ clawDropping: true, phase: 'grabbing' })
    
    // Simulate claw dropping and grabbing
    setTimeout(() => {
      const { toysInMachine, currentClaw } = get()
      
      // Find toys near the claw position
      const nearByToys = toysInMachine.filter((toy, index) => {
        const toyX = 15 + (index % 4) * 25
        const toyY = 40 + Math.floor(index / 4) * 20
        const distance = Math.sqrt(
          Math.pow(toyX - state.clawPosition.x, 2) + 
          Math.pow(toyY - state.clawPosition.y, 2)
        )
        return distance < 20 * currentClaw.range
      })
      
      if (nearByToys.length > 0 && Math.random() < currentClaw.dropChance) {
        const grabbedToy = nearByToys[Math.floor(Math.random() * nearByToys.length)]
        set({ grabbedToy })
      }
      
      setTimeout(() => {
        const { grabbedToy } = get()
        if (grabbedToy) {
          // Check if it's the red block
          if (grabbedToy.id === 'red-block') {
            get().startBossFight()
          } else {
            // Add toy to collection
            set(state => ({
              collectedToys: [...state.collectedToys, grabbedToy],
              toysInMachine: state.toysInMachine.filter(t => t.id !== grabbedToy.id),
              totalToysCollected: state.totalToysCollected + 1,
              grabbedToy: null,
              clawDropping: false,
              phase: 'playing',
            }))
          }
        } else {
          set({ grabbedToy: null, clawDropping: false, phase: 'playing' })
        }
        
        // Refill machine if low on toys
        if (get().toysInMachine.length < 5) {
          set(state => ({
            toysInMachine: [...state.toysInMachine, ...generateMachineToys(8)]
          }))
        }
      }, 1500)
    }, 1000)
  },
  
  grabToy: (toy: Toy) => {
    set(state => ({
      collectedToys: [...state.collectedToys, toy],
      toysInMachine: state.toysInMachine.filter(t => t.id !== toy.id),
      totalToysCollected: state.totalToysCollected + 1,
    }))
  },
  
  collectMoney: (amount: number) => {
    set(state => ({
      money: state.money + amount,
      highestMoney: Math.max(state.highestMoney, state.money + amount)
    }))
  },
  
  buyClaw: (claw: Claw) => {
    const state = get()
    if (state.money >= claw.price && !state.ownedClaws.find(c => c.id === claw.id)) {
      set(state => ({
        money: state.money - claw.price,
        ownedClaws: [...state.ownedClaws, claw],
        currentClaw: claw,
      }))
    }
  },
  
  equipClaw: (claw: Claw) => {
    const state = get()
    if (state.ownedClaws.find(c => c.id === claw.id)) {
      set({ currentClaw: claw })
    }
  },
  
  startBossFight: () => {
    const state = get()
    const bossLevel = Math.min(state.totalBossesDefeated, BOSSES.length - 1)
    const boss = BOSSES[bossLevel]
    
    set({
      phase: 'boss-fight',
      currentBoss: boss,
      bossHealth: boss.health,
      playerHealth: 100,
      grabbedToy: null,
      clawDropping: false,
      toysInMachine: state.toysInMachine.filter(t => t.id !== 'red-block'),
    })
  },
  
  attackBoss: (damage: number) => {
    set(state => {
      const newHealth = Math.max(0, state.bossHealth - damage)
      return { bossHealth: newHealth }
    })
  },
  
  receiveDamage: (damage: number) => {
    set(state => {
      const newHealth = Math.max(0, state.playerHealth - damage)
      if (newHealth === 0) {
        get().endBossFight(false)
      }
      return { playerHealth: newHealth }
    })
  },
  
  endBossFight: (won: boolean) => {
    const state = get()
    if (won && state.currentBoss) {
      set(state => ({
        phase: 'playing',
        money: state.money + state.currentBoss!.reward,
        totalBossesDefeated: state.totalBossesDefeated + 1,
        currentBoss: null,
        bossHealth: 0,
        playerHealth: 100,
        highestMoney: Math.max(state.highestMoney, state.money + state.currentBoss!.reward),
      }))
    } else {
      set({
        phase: 'playing',
        currentBoss: null,
        bossHealth: 0,
        playerHealth: 100,
      })
    }
  },
  
  setPhase: (phase) => set({ phase }),
  
  resetMachine: () => {
    set({ toysInMachine: generateMachineToys(12) })
  },
  
  sellToy: (toyId: string) => {
    const state = get()
    const toy = state.collectedToys.find(t => t.id === toyId)
    if (toy) {
      set(state => ({
        collectedToys: state.collectedToys.filter(t => t.id !== toyId),
        money: state.money + toy.baseValue,
        highestMoney: Math.max(state.highestMoney, state.money + toy.baseValue),
      }))
    }
  },
  
  resetGame: () => {
    // Reset everything to initial state
    set({
      money: 50,
      currentClaw: AVAILABLE_CLAWS[0],
      ownedClaws: [AVAILABLE_CLAWS[0]],
      collectedToys: [],
      phase: 'playing',
      clawPosition: { x: 50, y: 10 },
      clawMoving: false,
      clawDropping: false,
      grabbedToy: null,
      toysInMachine: generateMachineToys(12),
      currentBoss: null,
      bossHealth: 0,
      playerHealth: 100,
      totalToysCollected: 0,
      totalBossesDefeated: 0,
      highestMoney: 50,
    })
  },
}),
{
  name: 'cash-grab-storage', // unique name for localStorage key
  storage: createJSONStorage(() => localStorage),
  // Only persist these fields - transient game state is not saved
  partialize: (state) => ({
    money: state.money,
    currentClaw: state.currentClaw,
    ownedClaws: state.ownedClaws,
    collectedToys: state.collectedToys,
    totalToysCollected: state.totalToysCollected,
    totalBossesDefeated: state.totalBossesDefeated,
    highestMoney: state.highestMoney,
  }),
}
  )
)
