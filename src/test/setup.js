/**
 * Setup global para testing
 * Configuración inicial de Vitest con Vue Test Utils
 */

import { config } from '@vue/test-utils'
import '@testing-library/jest-dom'

// Configurar Vue Test Utils
config.global.mocks = {
  $route: {
    path: '/',
    query: {},
    params: {}
  },
  $router: {
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn()
  }
}

// Variables de entorno para testing
Object.assign(process.env, {
  VITE_WEBHOOK_URL: 'http://localhost:3000/webhook/test',
  VITE_API_TIMEOUT: '5000',
  VITE_ENABLE_CONSOLE_LOGS: 'false'
})

// Mock global de fetch
global.fetch = vi.fn()

// Mock de navigator.clipboard con mejor compatibilidad
const mockWriteText = vi.fn().mockImplementation(() => Promise.resolve())

// Crear el objeto clipboard completo
const clipboardMock = {
  writeText: mockWriteText,
  readText: vi.fn().mockResolvedValue(''),
  write: vi.fn().mockResolvedValue(undefined),
  read: vi.fn().mockResolvedValue([])
}

Object.defineProperty(navigator, 'clipboard', {
  value: clipboardMock,
  writable: true,
  configurable: true
})

// Hacer el mock accesible globalmente
global.mockClipboardWriteText = mockWriteText
global.clipboardMock = clipboardMock

// Mock de window.scrollTo
Object.assign(window, {
  scrollTo: vi.fn()
})

// Mock de console methods para testing
const originalConsole = { ...console }
global.console = {
  ...originalConsole,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}

// Helper para restaurar mocks después de cada test
beforeEach(() => {
  vi.clearAllMocks()
  fetch.mockClear()
})

// Cleanup después de cada test
afterEach(() => {
  vi.restoreAllMocks()
})