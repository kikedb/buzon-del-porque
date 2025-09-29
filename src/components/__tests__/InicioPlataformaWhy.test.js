/**
 * Tests para InicioPlataformaWhy.vue
 * Cubre funcionalidad del formulario, validaciones, modos y interacciones de usuario
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import InicioPlataformaWhy from '../InicioPlataformaWhy.vue'

// Mock del apiService
vi.mock('@/services/apiService', () => ({
  default: {
    enviarMensaje: vi.fn()
  },
  APIError: class extends Error { constructor(message) { super(message); this.name = 'APIError' } },
  NetworkError: class extends Error { constructor(message) { super(message); this.name = 'NetworkError' } },
  ValidationError: class extends Error { constructor(message, errors = {}) { super(message); this.name = 'ValidationError'; this.errors = errors } }
}))

describe('InicioPlataformaWhy', () => {
  let wrapper
  let mockEnviarMensaje

  beforeEach(async () => {
    // Mock del apiService
    const { default: apiService } = await import('@/services/apiService')
    mockEnviarMensaje = apiService.enviarMensaje
    mockEnviarMensaje.mockClear()
    
    wrapper = mount(InicioPlataformaWhy)
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  describe('Renderizado inicial', () => {
    it('debe renderizar el título correctamente', () => {
      expect(wrapper.find('.titulo').text()).toBe('WHY El buzón del Porqué')
    })

    it('debe mostrar los botones de modo', () => {
      expect(wrapper.find('button[data-testid="btn-identificado"]').exists()).toBe(false) // No usamos data-testid
      const buttons = wrapper.findAll('.botonera button')
      expect(buttons).toHaveLength(2)
      expect(buttons[0].text()).toBe('Con nombre')
      expect(buttons[1].text()).toBe('Anónima')
    })

    it('debe iniciar en modo identificado por defecto', () => {
      expect(wrapper.vm.modo).toBe('nombre')
      expect(wrapper.find('input[placeholder="Tu nombre"]').exists()).toBe(true)
      expect(wrapper.find('input[placeholder="tucorreo@ejemplo.com"]').exists()).toBe(true)
    })

    it('debe mostrar campos obligatorios correctamente', () => {
      const labels = wrapper.findAll('.etiqueta')
      const obligatorios = labels.filter(label => label.text().includes('*'))
      
      // En modo identificado: nombre, email, mensaje, categoría
      expect(obligatorios.length).toBeGreaterThan(0)
    })
  })

  describe('Cambio de modo', () => {
    it('debe cambiar a modo anónimo correctamente', async () => {
      const botonAnonimo = wrapper.findAll('.botonera button')[1]
      await botonAnonimo.trigger('click')

      expect(wrapper.vm.modo).toBe('anonimo')
      expect(wrapper.find('input[placeholder="Tu nombre"]').exists()).toBe(false)
      expect(wrapper.find('input[placeholder="tucorreo@ejemplo.com"]').exists()).toBe(false)
    })

    it('debe limpiar errores al cambiar de modo', async () => {
      // Generar algunos errores
      wrapper.vm.errors.nombre = 'Error de prueba'
      wrapper.vm.errors.email = 'Error de prueba'

      const botonAnonimo = wrapper.findAll('.botonera button')[1]
      await botonAnonimo.trigger('click')

      expect(wrapper.vm.errors.nombre).toBe('')
      expect(wrapper.vm.errors.email).toBe('')
    })

    it('debe aplicar clases CSS correctas según el modo activo', async () => {
      const [botonIdentificado, botonAnonimo] = wrapper.findAll('.botonera button')
      
      // Inicialmente identificado debe estar activo
      expect(botonIdentificado.classes()).toContain('boton-activo-izq')
      expect(botonAnonimo.classes()).toContain('boton-inactivo-der')

      // Cambiar a anónimo
      await botonAnonimo.trigger('click')
      
      expect(botonIdentificado.classes()).toContain('boton-inactivo-izq')
      expect(botonAnonimo.classes()).toContain('boton-activo-der')
    })
  })

  describe('Validaciones de campos', () => {
    describe('Validación de nombre', () => {
      it('debe validar nombre vacío', async () => {
        const inputNombre = wrapper.find('input[placeholder="Tu nombre"]')
        await inputNombre.setValue('')
        await inputNombre.trigger('blur')

        expect(wrapper.vm.errors.nombre).toBe('El nombre es requerido')
        expect(wrapper.find('.mensaje-error-campo').exists()).toBe(true)
      })

      it('debe validar nombre muy corto', async () => {
        const inputNombre = wrapper.find('input[placeholder="Tu nombre"]')
        await inputNombre.setValue('A')
        await inputNombre.trigger('blur')

        expect(wrapper.vm.errors.nombre).toBe('El nombre debe tener al menos 2 caracteres')
      })

      it('debe validar nombre muy largo', async () => {
        const nombreLargo = 'A'.repeat(51)
        const inputNombre = wrapper.find('input[placeholder="Tu nombre"]')
        await inputNombre.setValue(nombreLargo)
        await inputNombre.trigger('blur')

        expect(wrapper.vm.errors.nombre).toBe('El nombre no puede exceder 50 caracteres')
      })

      it('debe aceptar nombre válido', async () => {
        const inputNombre = wrapper.find('input[placeholder="Tu nombre"]')
        await inputNombre.setValue('Juan Pérez')
        await inputNombre.trigger('blur')

        expect(wrapper.vm.errors.nombre).toBe('')
      })
    })

    describe('Validación de email', () => {
      it('debe validar email vacío', async () => {
        const inputEmail = wrapper.find('input[placeholder="tucorreo@ejemplo.com"]')
        await inputEmail.setValue('')
        await inputEmail.trigger('blur')

        expect(wrapper.vm.errors.email).toBe('El correo electrónico es requerido')
      })

      it('debe validar formato de email inválido', async () => {
        const inputEmail = wrapper.find('input[placeholder="tucorreo@ejemplo.com"]')
        await inputEmail.setValue('email-invalido')
        await inputEmail.trigger('blur')

        expect(wrapper.vm.errors.email).toBe('Por favor ingresa un correo electrónico válido')
      })

      it('debe validar dominios no permitidos', async () => {
        const inputEmail = wrapper.find('input[placeholder="tucorreo@ejemplo.com"]')
        await inputEmail.setValue('test@gmail.com')
        await inputEmail.trigger('blur')

        expect(wrapper.vm.errors.email).toContain('Solo se permiten correos de los dominios')
      })

      it('debe aceptar email válido con dominio permitido', async () => {
        const inputEmail = wrapper.find('input[placeholder="tucorreo@ejemplo.com"]')
        await inputEmail.setValue('test@ecomac.cl')
        await inputEmail.trigger('blur')

        expect(wrapper.vm.errors.email).toBe('')
      })

      it('debe validar email muy largo', async () => {
        // Crear email que exceda 100 caracteres (91 + 9 = 100, entonces 92 + 9 = 101)
        const emailLargo = 'a'.repeat(92) + '@ecomac.cl'
        const inputEmail = wrapper.find('input[placeholder="tucorreo@ejemplo.com"]')
        
        // Primero limpiar cualquier error anterior
        wrapper.vm.errors.email = ''
        
        await inputEmail.setValue(emailLargo)
        await inputEmail.trigger('blur')

        expect(wrapper.vm.errors.email).toBe('El correo electrónico no puede exceder 100 caracteres')
      })
    })

    describe('Validación de mensaje', () => {
      it('debe validar mensaje vacío', async () => {
        const textareaMensaje = wrapper.find('textarea[placeholder*="¿Qué deseas compartir"]')
        await textareaMensaje.setValue('')
        await textareaMensaje.trigger('blur')

        expect(wrapper.vm.errors.mensaje).toBe('El mensaje es requerido')
      })

      it('debe validar mensaje muy corto', async () => {
        const textareaMensaje = wrapper.find('textarea[placeholder*="¿Qué deseas compartir"]')
        await textareaMensaje.setValue('Hola')
        await textareaMensaje.trigger('blur')

        expect(wrapper.vm.errors.mensaje).toBe('El mensaje debe tener al menos 10 caracteres')
      })

      it('debe validar mensaje muy largo', async () => {
        const mensajeLargo = 'A'.repeat(501)
        const textareaMensaje = wrapper.find('textarea[placeholder*="¿Qué deseas compartir"]')
        await textareaMensaje.setValue(mensajeLargo)
        await textareaMensaje.trigger('blur')

        expect(wrapper.vm.errors.mensaje).toBe('El mensaje no puede exceder 500 caracteres')
      })

      it('debe mostrar contador de caracteres', async () => {
        const textareaMensaje = wrapper.find('textarea[placeholder*="¿Qué deseas compartir"]')
        await textareaMensaje.setValue('Mensaje de prueba')

        const contador = wrapper.find('.contador-caracteres')
        expect(contador.text()).toContain('17/500 caracteres')
      })
    })

    describe('Validación de categoría', () => {
      it('debe validar categoría no seleccionada', async () => {
        const selectCategoria = wrapper.find('select')
        await selectCategoria.setValue('')
        await selectCategoria.trigger('blur')

        expect(wrapper.vm.errors.categoria).toBe('Por favor selecciona una categoría para tu mensaje')
      })

      it('debe aceptar categoría válida', async () => {
        const selectCategoria = wrapper.find('select')
        await selectCategoria.setValue('pregunta')
        await selectCategoria.trigger('blur')

        expect(wrapper.vm.errors.categoria).toBe('')
      })
    })
  })

  describe('Estado del formulario', () => {
    it('debe deshabilitar botón de envío cuando el formulario es inválido', async () => {
      const botonEnviar = wrapper.find('.boton-enviar')
      expect(botonEnviar.attributes('disabled')).toBeDefined()
      expect(botonEnviar.classes()).toContain('boton-deshabilitado')
    })

    it('debe habilitar botón cuando el formulario es válido en modo identificado', async () => {
      // Llenar campos obligatorios
      await wrapper.find('input[placeholder="Tu nombre"]').setValue('Juan Pérez')
      await wrapper.find('input[placeholder="tucorreo@ejemplo.com"]').setValue('juan@ecomac.cl')
      await wrapper.find('textarea[placeholder*="¿Qué deseas compartir"]').setValue('Este es un mensaje válido con suficiente contenido')
      await wrapper.find('select').setValue('pregunta')
      
      await nextTick()

      const botonEnviar = wrapper.find('.boton-enviar')
      expect(botonEnviar.attributes('disabled')).toBeUndefined()
      expect(botonEnviar.classes()).not.toContain('boton-deshabilitado')
    })

    it('debe habilitar botón cuando el formulario es válido en modo anónimo', async () => {
      // Cambiar a modo anónimo
      await wrapper.findAll('.botonera button')[1].trigger('click')

      // Llenar campos obligatorios
      await wrapper.find('textarea[placeholder*="¿Qué deseas compartir"]').setValue('Este es un mensaje anónimo válido con suficiente contenido')
      await wrapper.find('select').setValue('sugerencia')

      await nextTick()

      const botonEnviar = wrapper.find('.boton-enviar')
      expect(botonEnviar.attributes('disabled')).toBeUndefined()
    })
  })

  describe('Envío de formulario', () => {
    beforeEach(() => {
      // Configurar formulario válido por defecto
      wrapper.vm.form = {
        nombre: 'Juan Pérez',
        email: 'juan@ecomac.cl',
        empresa: 'Test Company',
        mensaje: 'Este es un mensaje de prueba con suficiente contenido',
        categoria: 'pregunta',
        departamento: 'it',
        prioridad: 'media'
      }
    })

    it('debe enviar mensaje identificado exitosamente', async () => {
      const mockResponse = {
        success: true,
        enhancedData: {
          sla: { slaHours: 24, dueDate: new Date() },
          privacy: { riskLevel: 'LOW' }
        },
        clickUp: { taskId: 'CU-123', url: 'https://app.clickup.com' }
      }
      
      mockEnviarMensaje.mockResolvedValue(mockResponse)

      const botonEnviar = wrapper.find('.boton-enviar')
      await botonEnviar.trigger('click')

      expect(mockEnviarMensaje).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'identificado',
          nombre: 'Juan Pérez',
          email: 'juan@ecomac.cl',
          mensaje: 'Este es un mensaje de prueba con suficiente contenido',
          categoria: 'pregunta'
        })
      )
    })

    it('debe mostrar estado de loading durante el envío', async () => {
      mockEnviarMensaje.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      const botonEnviar = wrapper.find('.boton-enviar')
      await botonEnviar.trigger('click')

      expect(wrapper.vm.isSubmitting).toBe(true)
      expect(botonEnviar.text()).toBe('Enviando...')
    })

    it('debe mostrar modal de confirmación después del envío exitoso', async () => {
      const mockResponse = {
        success: true,
        enhancedData: { sla: {}, privacy: {} }
      }
      
      mockEnviarMensaje.mockResolvedValue(mockResponse)

      const botonEnviar = wrapper.find('.boton-enviar')
      await botonEnviar.trigger('click')

      await nextTick()

      expect(wrapper.vm.showConfirmationModal).toBe(true)
      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    })

    it('debe limpiar formulario después del envío exitoso', async () => {
      const mockResponse = {
        success: true,
        enhancedData: { sla: {}, privacy: {} }
      }
      
      mockEnviarMensaje.mockResolvedValue(mockResponse)

      const botonEnviar = wrapper.find('.boton-enviar')
      await botonEnviar.trigger('click')

      await nextTick()

      expect(wrapper.vm.form.nombre).toBe('')
      expect(wrapper.vm.form.email).toBe('')
      expect(wrapper.vm.form.mensaje).toBe('')
    })

    it('debe manejar errores de validación del servidor', async () => {
      const { ValidationError } = await import('@/services/apiService')
      const validationError = new ValidationError('Validation failed', {
        email: 'Email inválido'
      })
      
      mockEnviarMensaje.mockRejectedValue(validationError)

      const botonEnviar = wrapper.find('.boton-enviar')
      await botonEnviar.trigger('click')

      await nextTick()

      expect(wrapper.vm.submitMessage).toBe('Validation failed')
      expect(wrapper.vm.submitType).toBe('error')
      expect(wrapper.vm.errors.email).toBe('Email inválido')
    })

    it('debe manejar errores de red', async () => {
      const { NetworkError } = await import('@/services/apiService')
      const networkError = new NetworkError('No hay conexión a internet')
      
      mockEnviarMensaje.mockRejectedValue(networkError)

      const botonEnviar = wrapper.find('.boton-enviar')
      await botonEnviar.trigger('click')

      await nextTick()

      expect(wrapper.vm.submitMessage).toBe('No hay conexión a internet')
      expect(wrapper.vm.submitType).toBe('error')
    })

    it('debe enviar estructura correcta para mensaje anónimo', async () => {
      // Cambiar a modo anónimo
      await wrapper.findAll('.botonera button')[1].trigger('click')
      
      wrapper.vm.form.mensaje = 'Mensaje anónimo de prueba con suficiente contenido'
      wrapper.vm.form.categoria = 'sugerencia'
      
      mockEnviarMensaje.mockResolvedValue({ success: true, enhancedData: {} })

      const botonEnviar = wrapper.find('.boton-enviar')
      await botonEnviar.trigger('click')

      expect(mockEnviarMensaje).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'anonimo',
          mensaje: 'Mensaje anónimo de prueba con suficiente contenido',
          categoria: 'sugerencia'
        })
      )

      // No debe incluir datos personales
      const callArgs = mockEnviarMensaje.mock.calls[0][0]
      expect(callArgs).not.toHaveProperty('nombre')
      expect(callArgs).not.toHaveProperty('email')
    })
  })

  describe('Modal de confirmación', () => {
    beforeEach(() => {
      wrapper.vm.showConfirmationModal = true
      wrapper.vm.ticketInfo = {
        id: 'WHY-12345678-ABC123',
        timestamp: '15 de enero de 2024, 10:30',
        categoria: 'pregunta',
        tipo: 'identificado'
      }
    })

    it('debe mostrar información del ticket', async () => {
      await nextTick()
      
      const modal = wrapper.find('.modal-content')
      expect(modal.exists()).toBe(true)
      expect(modal.text()).toContain('WHY-12345678-ABC123')
      expect(modal.text()).toContain('15 de enero de 2024, 10:30')
    })

    it('debe cerrar modal al hacer clic en "Entendido"', async () => {
      await nextTick()
      
      const botonEntendido = wrapper.find('.btn-primary')
      await botonEntendido.trigger('click')

      expect(wrapper.vm.showConfirmationModal).toBe(false)
    })

    it('debe permitir enviar otro mensaje', async () => {
      await nextTick()
      
      const botonOtro = wrapper.find('.btn-secondary')
      await botonOtro.trigger('click')

      expect(wrapper.vm.showConfirmationModal).toBe(false)
      // Debería scroll hacia arriba (mocked en setup)
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    })

    it('debe mostrar botón de copiar ticket ID', async () => {
      await nextTick()
      
      const botonCopiar = wrapper.find('.btn-copiar')
      expect(botonCopiar.exists()).toBe(true)
      expect(botonCopiar.attributes('title')).toContain('Copiar al portapapeles')
    })
  })

  describe('Funcionalidades adicionales', () => {
    it('debe generar ticket ID único', () => {
      const ticketId1 = wrapper.vm.generarTicketId()
      const ticketId2 = wrapper.vm.generarTicketId()

      expect(ticketId1).toMatch(/^WHY-\d{8}-[A-Z0-9]{6}$/)
      expect(ticketId2).toMatch(/^WHY-\d{8}-[A-Z0-9]{6}$/)
      expect(ticketId1).not.toBe(ticketId2)
    })

    it('debe formatear fechas correctamente', () => {
      const fecha = new Date('2024-01-15T10:30:00')
      const formatted = wrapper.vm.formatearFechaTicket(fecha)

      expect(formatted).toContain('enero')
      expect(formatted).toContain('2024')
      expect(formatted).toContain('10:30')
    })
  })
})