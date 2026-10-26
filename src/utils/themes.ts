import type { BoardTheme, BoardThemeColors } from '../types/chess'

export const BOARD_THEMES: Record<BoardTheme, BoardThemeColors> = {
  emerald: {
    name: 'Xanh Emerald (Chess.com)',
    light: '#eeeed2',
    dark: '#769656',
    highlightLight: '#f7f783',
    highlightDark: '#baca44',
  },
  wood: {
    name: 'Gỗ Cổ Điển',
    light: '#f0d9b5',
    dark: '#b58863',
    highlightLight: '#ced26b',
    highlightDark: '#aaa23b',
  },
  slate: {
    name: 'Xám Hiện Đại',
    light: '#e2e8f0',
    dark: '#64748b',
    highlightLight: '#93c5fd',
    highlightDark: '#3b82f6',
  },
  classic: {
    name: 'Đen Trắng Tối Giản',
    light: '#f4f4f5',
    dark: '#71717a',
    highlightLight: '#fde047',
    highlightDark: '#eab308',
  },
  dark: {
    name: 'Bóng Đêm (Obsidian)',
    light: '#3f3f46',
    dark: '#18181b',
    highlightLight: '#6366f1',
    highlightDark: '#4338ca',
  },
}
