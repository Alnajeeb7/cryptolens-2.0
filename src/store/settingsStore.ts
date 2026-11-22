import { create } from 'zustand';

export interface SettingsState {
  theme: 'light' | 'dark';
  defaultCapital: number;
  makerFeeBps: number;
  takerFeeBps: number;
  slippageBps: number;
  maxLeverage: number;
  maxPortfolioRisk: number;
  liveApiEnabled: boolean;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  updateSettings: (partial: Partial<SettingsState>) => void;
}

const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('cryptolens_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  }
  return 'dark'; // Professional dark terminal by default
};

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: getInitialTheme(),
  defaultCapital: 100000,
  makerFeeBps: 10,
  takerFeeBps: 15,
  slippageBps: 5,
  maxLeverage: 1.0,
  maxPortfolioRisk: 0.02,
  liveApiEnabled: false,

  toggleTheme: () =>
    set((state) => {
      const nextTheme = state.theme === 'light' ? 'dark' : 'light';
      if (typeof window !== 'undefined') {
        localStorage.setItem('cryptolens_theme', nextTheme);
        if (nextTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      return { theme: nextTheme };
    }),

  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cryptolens_theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    set({ theme });
  },

  updateSettings: (partial) => set((state) => ({ ...state, ...partial })),
}));
