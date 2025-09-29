/**
 * Mocks centralizados para servicios externos
 */

// Mock de API Service
export const mockApiService = {
  enviarMensaje: vi.fn(),
  verificarEstado: vi.fn(),
  obtenerEstadisticas: vi.fn()
}

// Mock de ClickUp Service
export const mockClickupService = {
  createClickUpTicket: vi.fn(),
  updateTicketStatus: vi.fn(),
  getTicketStatus: vi.fn(),
  syncTickets: vi.fn()
}

// Mock de SLA Service  
export const mockSlaService = {
  calculateSLA: vi.fn(),
  checkEscalation: vi.fn(),
  getSLAConfig: vi.fn()
}

// Mock de Privacy Service
export const mockPrivacyService = {
  assessPrivacyRisk: vi.fn(),
  anonymizeData: vi.fn(),
  logPrivacyEvent: vi.fn()
}

// Mock de Escalation Service
export const mockEscalationService = {
  scheduleEscalation: vi.fn(),
  cancelEscalation: vi.fn(),
  processEscalation: vi.fn()
}

// Respuestas de éxito típicas
export const successResponses = {
  enviarMensaje: {
    success: true,
    message: 'Mensaje enviado correctamente',
    ticketId: 'TEST-12345',
    enhancedData: {
      sla: {
        slaHours: 24,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        priority: 'medium'
      },
      privacy: {
        riskLevel: 'LOW',
        anonymized: 'none'
      }
    },
    clickUp: {
      taskId: 'CU-123456',
      url: 'https://app.clickup.com/test'
    }
  },
  verificarEstado: {
    status: 'ok',
    timestamp: new Date().toISOString()
  }
}

// Errores típicos
export const errorResponses = {
  networkError: new Error('Network Error'),
  validationError: {
    status: 400,
    message: 'Validation failed',
    errors: {
      mensaje: 'El mensaje es requerido'
    }
  },
  serverError: {
    status: 500,
    message: 'Internal Server Error'
  }
}

// Helper para configurar mocks rápidamente
export function setupSuccessfulMocks() {
  mockApiService.enviarMensaje.mockResolvedValue(successResponses.enviarMensaje)
  mockApiService.verificarEstado.mockResolvedValue(successResponses.verificarEstado)
  
  mockSlaService.calculateSLA.mockReturnValue({
    slaHours: 24,
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    priority: 'medium',
    businessReason: 'SLA estándar aplicado'
  })
  
  mockPrivacyService.assessPrivacyRisk.mockReturnValue({
    riskLevel: 'LOW',
    risks: [],
    recommendedAnonymization: 'none'
  })
  
  mockClickupService.createClickUpTicket.mockResolvedValue({
    success: true,
    clickUpTaskId: 'CU-123456',
    clickUpUrl: 'https://app.clickup.com/test'
  })
}

export function setupErrorMocks() {
  mockApiService.enviarMensaje.mockRejectedValue(errorResponses.networkError)
  mockApiService.verificarEstado.mockRejectedValue(errorResponses.serverError)
}