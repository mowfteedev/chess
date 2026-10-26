import type { BoardTheme, BoardThemeColors } from '../types/chess'

export const BOARD_THEMES: Record<BoardTheme, BoardThemeColors> = {
  wood: {
    name: 'Gỗ mộc',
    light: '#f0e3cd',
    dark: '#b59a74',
    highlightLight: '#d7dda6',
    highlightDark: '#a6b879',
  },
  emerald: {
    name: 'Vườn xanh',
    light: '#e8edda',
    dark: '#819c78',
    highlightLight: '#d5e7a8',
    highlightDark: '#a5c678',
  },
  slate: {
    name: 'Sương sớm',
    light: '#e2e7e8',
    dark: '#8299a2',
    highlightLight: '#c7dfb5',
    highlightDark: '#a7bd8a',
  },
  classic: {
    name: 'Cổ điển',
    light: '#efede8',
    dark: '#97968d',
    highlightLight: '#d9dfa8',
    highlightDark: '#b4be80',
  },
  dark: {
    name: 'Rừng đêm',
    light: '#b7c7b5',
    dark: '#5b7964',
    highlightLight: '#d5dda8',
    highlightDark: '#9bb57c',
  },
}
