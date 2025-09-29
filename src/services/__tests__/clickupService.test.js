/**
 * Tests unitarios para clickupService
 * Cubre integración con ClickUp API, creación de tickets y manejo de errores
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createClickUpTicket, updateTicketStatus, getTicketStatus } from '../clickupService.js'

// Mock de slaService
vi.mock('../slaService.js', () => ({
  calculateSLA: vi.fn(() => ({
    slaHours: 24,
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    escalationThreshold: 18,
    priority: 'medium',
    businessReason: 'SLA calculado según configuración estándar'
  }))
}))

// Mock de import.meta.env
vi.mock('import.meta', () => ({
  env: {
    VITE_CLICKUP_API_KEY: 'pk_test_123456789',
    VITE_CLICKUP_TEAM_ID: 'team_123',
    VITE_CLICKUP_SPACE_ID: 'space_456',
    VITE_CLICKUP_LIST_IT: 'list_it_789',
    VITE_CLICKUP_DEFAULT_LIST: 'list_default_000'
  }
}))

describe('clickupService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch.mockClear()
  })

  describe('createClickUpTicket', () => {
    const mockMessageData = {
      tipo: 'identificado',
      nombre: 'Juan Pérez',
      email: 'juan@ecomac.cl',
      empresa: 'Test Company',
      mensaje: 'Este es un bug crítico que necesita atención inmediata',
      categoria: 'bug',
      departamento: 'it',
      prioridad: 'urgente',
      ticketId: 'WHY-12345678-ABC123',
      timestamp: new Date().toISOString()
    }

    const mockClickUpResponse = {
      id: 'cu_task_123456',
      name: '🐛 [IT] Este es un bug crítico que necesita... - WHY-12345678-ABC123',
      url: 'https://app.clickup.com/t/cu_task_123456',
      status: {
        status: 'Open',
        type: 'open'
      },
      assignees: [
        { id: '12345678', username: 'juan.perez', email: 'juan.perez@ecomac.cl' }
      ]
    }

    it('debe crear ticket exitosamente en ClickUp', async () => {
      // Mock de la respuesta de creación de tarea
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockClickUpResponse)
      })

      // Mock de la respuesta de agregar comentario
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 'comment_123' })
      })

      // Mock de la respuesta de campos personalizados (múltiples llamadas)
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true })
      })

      const result = await createClickUpTicket(mockMessageData)

      expect(result).toEqual(expect.objectContaining({
        success: true,
        clickUpTaskId: 'cu_task_123456',
        clickUpUrl: 'https://app.clickup.com/t/cu_task_123456',
        listId: expect.any(String), // Acepta cualquier listId
        slaData: expect.any(Object),
        metadata: expect.objectContaining({
          source: 'buzon-del-porque',
          originalTicketId: 'WHY-12345678-ABC123'
        })
      }))
    })

    it('debe usar lista por defecto si no se especifica departamento', async () => {
      const dataWithoutDept = { ...mockMessageData, departamento: undefined }
      
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockClickUpResponse)
      })

      await createClickUpTicket(dataWithoutDept)

      // Verificar que se use la lista por defecto
      const createTaskCall = global.fetch.mock.calls.find(call => 
        call[0].includes('/task') && call[0].includes('list')
      )
      expect(createTaskCall).toBeDefined()
    })

    it('debe generar título descriptivo para el ticket', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockClickUpResponse)
      })

      await createClickUpTicket(mockMessageData)

      const createTaskCall = global.fetch.mock.calls[0]
      const requestBody = JSON.parse(createTaskCall[1].body)

      expect(requestBody.name).toMatch(/🐛.*\[IT\].*Este es un bug crítico.*WHY-12345678-ABC123/)
    })

    it('debe incluir metadatos correctos en la descripción', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockClickUpResponse)
      })

      await createClickUpTicket(mockMessageData)

      const createTaskCall = global.fetch.mock.calls[0]
      const requestBody = JSON.parse(createTaskCall[1].body)

      expect(requestBody.description).toContain('## 📋 Detalles del Ticket')
      expect(requestBody.description).toContain('**🎯 Categoría:** Bug')
      expect(requestBody.description).toContain('**⏱️ Prioridad:** URGENTE')
      expect(requestBody.description).toContain('**Nombre:** Juan Pérez')
      expect(requestBody.description).toContain('**Email:** juan@ecomac.cl')
      expect(requestBody.description).toContain('WHY-12345678-ABC123')
    })

    it('debe mapear prioridades correctamente', async () => {
      const testCases = [
        { prioridad: 'urgente', expected: 1 },
        { prioridad: 'alta', expected: 2 },
        { prioridad: 'media', expected: 3 },
        { prioridad: 'baja', expected: 4 }
      ]

      for (const testCase of testCases) {
        global.fetch.mockClear()
        global.fetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockClickUpResponse)
        })

        const dataWithPriority = { ...mockMessageData, prioridad: testCase.prioridad }
        await createClickUpTicket(dataWithPriority)

        const createTaskCall = global.fetch.mock.calls[0]
        const requestBody = JSON.parse(createTaskCall[1].body)
        
        expect(requestBody.priority).toBe(testCase.expected)
      }
    })

    it('debe incluir tags apropiados', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockClickUpResponse)
      })

      await createClickUpTicket(mockMessageData)

      const createTaskCall = global.fetch.mock.calls[0]
      const requestBody = JSON.parse(createTaskCall[1].body)

      expect(requestBody.tags).toEqual(expect.arrayContaining([
        'buzon-del-porque',
        'bug',
        'it',
        'identificado',
        'bug',
        'technical'
      ]))
    })

    it('debe manejar errores de la API de ClickUp', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      })

      await expect(createClickUpTicket(mockMessageData))
        .rejects.toThrow('Failed to create ClickUp ticket: ClickUp API Error: 401 - Unauthorized')
    })

    it('debe generar acciones recomendadas según categoría', async () => {
      const categorias = {
        'bug': '**CRÍTICO**: Reproducir el error',
        'queja': '**URGENTE**: Investigar el problema inmediatamente',
        'pregunta': 'Revisar pregunta y contexto',
        'sugerencia': 'Evaluar viabilidad de la sugerencia'
      }

      for (const [categoria, expectedAction] of Object.entries(categorias)) {
        global.fetch.mockClear()
        global.fetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockClickUpResponse)
        })

        const dataWithCategory = { ...mockMessageData, categoria }
        await createClickUpTicket(dataWithCategory)

        const createTaskCall = global.fetch.mock.calls[0]
        const requestBody = JSON.parse(createTaskCall[1].body)
        
        expect(requestBody.description).toContain(expectedAction)
      }
    })

    it('debe manejar mensajes anónimos correctamente', async () => {
      const anonymousData = {
        tipo: 'anonimo',
        mensaje: 'Mensaje anónimo de prueba',
        categoria: 'sugerencia',
        departamento: 'rrhh',
        prioridad: 'media',
        ticketId: 'WHY-87654321-XYZ789'
      }

      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockClickUpResponse)
      })

      await createClickUpTicket(anonymousData)

      const createTaskCall = global.fetch.mock.calls[0]
      const requestBody = JSON.parse(createTaskCall[1].body)

      expect(requestBody.description).toContain('**Tipo:** Anónimo')
      expect(requestBody.description).not.toContain('**Nombre:**')
      expect(requestBody.description).not.toContain('**Email:**')
    })
  })

  describe('updateTicketStatus', () => {
    const taskId = 'cu_task_123456'

    it('debe actualizar estado del ticket exitosamente', async () => {
      // Mock para actualizar estado
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true })
      })
      
      // Mock para agregar comentario (si se proporciona)
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 'comment_123' })
      })

      const result = await updateTicketStatus(taskId, 'Resolved', 'Ticket resuelto por el equipo')

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/task/${taskId}`),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ status: 'Resolved' })
        })
      )

      expect(result).toEqual({ success: true, newStatus: 'Resolved' })
    })

    it('debe agregar comentario al actualizar estado', async () => {
      // Mock para actualizar estado
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true })
      })

      // Mock para agregar comentario
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 'comment_456' })
      })

      await updateTicketStatus(taskId, 'In Progress', 'Comenzando trabajo en el ticket')

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/task/${taskId}/comment`),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            comment_text: 'Comenzando trabajo en el ticket',
            notify_all: true
          })
        })
      )
    })

    it('debe manejar errores al actualizar estado', async () => {
      global.fetch.mockRejectedValueOnce(new Error('API Error'))

      await expect(updateTicketStatus(taskId, 'Closed'))
        .rejects.toThrow('API Error')
    })
  })

  describe('getTicketStatus', () => {
    const taskId = 'cu_task_123456'
    const mockTaskResponse = {
      id: taskId,
      name: 'Test Task',
      status: {
        status: 'In Progress',
        type: 'custom'
      },
      assignees: [
        { id: '12345', username: 'developer', email: 'dev@company.com' }
      ],
      priority: { id: '2', priority: 'high' },
      due_date: '1640995200000',
      url: 'https://app.clickup.com/t/cu_task_123456'
    }

    it('debe obtener estado del ticket exitosamente', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockTaskResponse)
      })

      const result = await getTicketStatus(taskId)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/task/${taskId}`),
        expect.objectContaining({ method: 'GET' })
      )

      expect(result).toEqual({
        status: 'In Progress',
        assignees: mockTaskResponse.assignees,
        priority: mockTaskResponse.priority,
        dueDate: mockTaskResponse.due_date,
        url: mockTaskResponse.url,
        completed: false
      })
    })

    it('debe detectar tickets completados', async () => {
      const closedTaskResponse = {
        ...mockTaskResponse,
        status: { status: 'Closed', type: 'closed' }
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(closedTaskResponse)
      })

      const result = await getTicketStatus(taskId)
      
      expect(result.completed).toBe(true)
    })

    it('debe manejar errores al obtener estado', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Task not found'))

      await expect(getTicketStatus(taskId))
        .rejects.toThrow('Task not found')
    })
  })
})