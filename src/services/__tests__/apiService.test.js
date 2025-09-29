/**
 * Tests unitarios para apiService
 * Cubre casos de éxito, errores de red, validación y manejo de timeouts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import apiService, { APIError, NetworkError, ValidationError } from '../apiService.js'

// Mock de import.meta.env
vi.mock('import.meta', () => ({
  env: {
    VITE_WEBHOOK_URL: 'https://test-webhook.com/webhook/test',
    VITE_API_TIMEOUT: '5000'
  }
}))

describe('apiService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch.mockClear()
    global.navigator = {
      onLine: true
    }
  })

  describe('enviarMensaje', () => {
    const validMessageData = {
      tipo: 'identificado',
      nombre: 'Juan Pérez',
      email: 'juan@ecomac.cl',
      empresa: 'Test Company',
      mensaje: 'Este es un mensaje de prueba con suficiente contenido',
      categoria: 'pregunta',
      departamento: 'it',
      prioridad: 'media',
      ticketId: 'TEST-123456'
    }

    const validAnonymousData = {
      tipo: 'anonimo',
      mensaje: 'Este es un mensaje anónimo de prueba con suficiente contenido',
      categoria: 'sugerencia',
      departamento: 'rrhh',
      prioridad: 'alta'
    }

    describe('Casos de éxito', () => {
      it('debe enviar mensaje identificado exitosamente', async () => {
        const mockResponse = {
          success: true,
          id: 'webhook-123'
        }
        
        global.fetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve(mockResponse)
        })

        const result = await apiService.enviarMensaje(validMessageData)

        expect(fetch).toHaveBeenCalledWith(
          'http://localhost:3000/webhook/test',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: expect.stringContaining(validMessageData.nombre)
          })
        )

        expect(result).toEqual(expect.objectContaining({
          success: true,
          enhancedData: expect.objectContaining({
            sla: expect.any(Object),
            privacy: expect.any(Object)
          })
        }))
      })

      it('debe enviar mensaje anónimo exitosamente', async () => {
        const mockResponse = { success: true, id: 'webhook-456' }
        
        global.fetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve(mockResponse)
        })

        const result = await apiService.enviarMensaje(validAnonymousData)

        expect(fetch).toHaveBeenCalledWith(
          'http://localhost:3000/webhook/test',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('anonimo')
          })
        )

        expect(result.enhancedData.sla).toBeDefined()
        expect(result.enhancedData.privacy).toBeDefined()
      })

      it('debe incluir metadatos de SLA en la respuesta', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ success: true })
        })

        const result = await apiService.enviarMensaje(validMessageData)

        expect(result.enhancedData.sla).toEqual({
          slaHours: 24,
          dueDate: expect.any(Date),
          escalationThreshold: 18,
          priority: 'medium',
          businessReason: 'SLA estándar aplicado'
        })
      })
    })

    describe('Validaciones', () => {
      it('debe rechazar mensaje vacío', async () => {
        const invalidData = { ...validMessageData, mensaje: '' }

        await expect(apiService.enviarMensaje(invalidData))
          .rejects.toThrow(ValidationError)
        
        expect(fetch).not.toHaveBeenCalled()
      })

      it('debe rechazar mensaje muy corto', async () => {
        const invalidData = { ...validMessageData, mensaje: 'corto' }

        await expect(apiService.enviarMensaje(invalidData))
          .rejects.toThrow('El mensaje debe tener al menos 10 caracteres')
      })

      it('debe rechazar nombre muy corto en modo identificado', async () => {
        const invalidData = { ...validMessageData, nombre: 'A' }

        await expect(apiService.enviarMensaje(invalidData))
          .rejects.toThrow('El nombre es requerido y debe tener al menos 2 caracteres')
      })

      it('debe rechazar email inválido en modo identificado', async () => {
        const invalidData = { ...validMessageData, email: 'email-invalido' }

        await expect(apiService.enviarMensaje(invalidData))
          .rejects.toThrow('Se requiere un email válido')
      })

      it('debe rechazar nombre vacío en modo identificado', async () => {
        const invalidData = { ...validMessageData, nombre: '' }

        await expect(apiService.enviarMensaje(invalidData))
          .rejects.toThrow(ValidationError)
      })
    })

    describe('Manejo de errores de red', () => {
      it('debe manejar error de timeout', async () => {
        global.fetch.mockImplementation(() => {
          return new Promise((_, reject) => {
            const error = new Error('AbortError')
            error.name = 'AbortError'
            setTimeout(() => reject(error), 100)
          })
        })

        await expect(apiService.enviarMensaje(validMessageData))
          .rejects.toThrow(NetworkError)
        
        await expect(apiService.enviarMensaje(validMessageData))
          .rejects.toThrow('La solicitud ha excedido el tiempo límite')
      })

      it('debe manejar falta de conexión a internet', async () => {
        global.navigator.onLine = false
        global.fetch.mockRejectedValueOnce(new Error('Network error'))

        await expect(apiService.enviarMensaje(validMessageData))
          .rejects.toThrow('No hay conexión a internet')
      })

      it('debe manejar errores de red generales', async () => {
        global.fetch.mockRejectedValueOnce(new Error('Connection failed'))

        await expect(apiService.enviarMensaje(validMessageData))
          .rejects.toThrow(NetworkError)
      })
    })

    describe('Manejo de errores HTTP', () => {
      it('debe manejar error 400 (Bad Request)', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({
            message: 'Datos inválidos',
            errors: { email: 'Email inválido' }
          })
        })

        await expect(apiService.enviarMensaje(validMessageData))
          .rejects.toThrow(ValidationError)
      })

      it('debe manejar error 500 (Server Error)', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ message: 'Internal server error' })
        })

        await expect(apiService.enviarMensaje(validMessageData))
          .rejects.toThrow('Error interno del servidor')
      })

      it('debe manejar error 422 (Unprocessable Entity)', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: false,
          status: 422,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({
            message: 'Validation failed',
            errors: { mensaje: 'Message too long' }
          })
        })

        await expect(apiService.enviarMensaje(validMessageData))
          .rejects.toThrow(ValidationError)
      })

      it('debe manejar error 429 (Rate Limit)', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ message: 'Too many requests' })
        })

        await expect(apiService.enviarMensaje(validMessageData))
          .rejects.toThrow('Demasiadas solicitudes')
      })
    })

    describe('Estructura de datos enviados', () => {
      it('debe enviar estructura correcta para mensaje identificado', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ success: true })
        })

        await apiService.enviarMensaje(validMessageData)

        const sentData = JSON.parse(fetch.mock.calls[0][1].body)
        
        expect(sentData).toEqual(expect.objectContaining({
          tipo: 'identificado',
          nombre: validMessageData.nombre,
          email: validMessageData.email,
          empresa: validMessageData.empresa,
          mensaje: validMessageData.mensaje,
          categoria: validMessageData.categoria,
          departamento: validMessageData.departamento,
          prioridad: validMessageData.prioridad,
          timestamp: expect.any(String),
          fecha: expect.any(String),
          hora: expect.any(String),
          source: 'plataforma-why',
          sla: expect.objectContaining({
            hours: 24,
            dueDate: expect.any(String),
            escalationThreshold: 18,
            priority: 'medium'
          }),
          privacy: expect.objectContaining({
            riskLevel: 'LOW',
            anonymized: 'none',
            requiresReview: false
          })
        }))
      })

      it('debe enviar estructura correcta para mensaje anónimo', async () => {
        global.fetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ success: true })
        })

        await apiService.enviarMensaje(validAnonymousData)

        const sentData = JSON.parse(fetch.mock.calls[0][1].body)
        
        expect(sentData).toEqual(expect.objectContaining({
          tipo: 'anonimo',
          mensaje: validAnonymousData.mensaje,
          categoria: validAnonymousData.categoria,
          departamento: validAnonymousData.departamento,
          prioridad: validAnonymousData.prioridad,
          source: 'plataforma-why'
        }))

        // No debe incluir datos personales
        expect(sentData).not.toHaveProperty('nombre')
        expect(sentData).not.toHaveProperty('email')
        expect(sentData).not.toHaveProperty('empresa')
      })
    })
  })

  describe('verificarEstado', () => {
    it('debe verificar estado del servidor exitosamente', async () => {
      const mockResponse = { status: 'ok', timestamp: new Date().toISOString() }
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(mockResponse)
      })

      const result = await apiService.verificarEstado()

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.objectContaining({ method: 'GET' })
      )
      expect(result).toEqual(mockResponse)
    })

    it('debe manejar error al verificar estado', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Server down'))

      await expect(apiService.verificarEstado()).rejects.toThrow(NetworkError)
    })
  })

  describe('obtenerEstadisticas', () => {
    it('debe obtener estadísticas exitosamente', async () => {
      const mockStats = {
        totalMessages: 150,
        byCategory: { pregunta: 50, sugerencia: 30 },
        responseTime: 2.5
      }
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: () => Promise.resolve(mockStats)
      })

      const result = await apiService.obtenerEstadisticas()

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/stats'),
        expect.objectContaining({ method: 'GET' })
      )
      expect(result).toEqual(mockStats)
    })
  })
})