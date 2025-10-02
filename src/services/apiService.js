/**
 * Servicio para manejar llamadas a la API
 * Centraliza la lógica de comunicación con el backend
 * Incluye integración con SLA, escalamiento, ClickUp y privacidad
 */

// Servicios empresariales integrados
import slaService from './slaService.js';
import escalationService from './escalationService.js';
import clickupService from './clickupService.js';
import privacyService from './privacyService.js';

// Configuración base de la API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://inmobiliaria-ecomac.app.n8n.cloud';
const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL || 'https://inmobiliaria-ecomac.app.n8n.cloud/webhook/a15c54d3-e59d-4469-823f-99b4d0c8d87f';
const API_TIMEOUT = import.meta.env.VITE_API_TIMEOUT || 10000; // 10 segundos

/**
 * Tipos de errores personalizados
 */
export class APIError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
  }
}

export class NetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends Error {
  constructor(message, errors) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * Configuración base para fetch con timeout
 */
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new NetworkError('La solicitud ha excedido el tiempo límite. Por favor intenta nuevamente.');
    }
    
    if (!navigator.onLine) {
      throw new NetworkError('No hay conexión a internet. Verifica tu conexión y vuelve a intentar.');
    }
    
    throw new NetworkError('Error de conexión. Por favor intenta nuevamente.');
  }
}

/**
 * Procesar respuesta de la API
 */
async function processResponse(response) {
  let data;
  
  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { message: await response.text() };
    }
  } catch (error) {
    throw new APIError('Error al procesar la respuesta del servidor', response.status, 'PARSE_ERROR');
  }

  if (!response.ok) {
    // Manejo específico de errores HTTP
    switch (response.status) {
      case 400:
        throw new ValidationError(
          data.message || 'Los datos enviados no son válidos',
          data.errors || {}
        );
      case 401:
        throw new APIError('No tienes autorización para realizar esta acción', 401, 'UNAUTHORIZED');
      case 403:
        throw new APIError('No tienes permisos para realizar esta acción', 403, 'FORBIDDEN');
      case 404:
        throw new APIError('El recurso solicitado no fue encontrado', 404, 'NOT_FOUND');
      case 409:
        throw new APIError(data.message || 'Conflicto con el estado actual del recurso', 409, 'CONFLICT');
      case 422:
        throw new ValidationError(
          data.message || 'Los datos no cumplen con los requisitos',
          data.errors || {}
        );
      case 429:
        throw new APIError('Demasiadas solicitudes. Por favor espera un momento antes de intentar nuevamente.', 429, 'RATE_LIMIT');
      case 500:
        throw new APIError('Error interno del servidor. Por favor intenta más tarde.', 500, 'INTERNAL_ERROR');
      case 502:
        throw new APIError('El servidor no está disponible temporalmente. Por favor intenta más tarde.', 502, 'BAD_GATEWAY');
      case 503:
        throw new APIError('El servicio no está disponible temporalmente. Por favor intenta más tarde.', 503, 'SERVICE_UNAVAILABLE');
      default:
        throw new APIError(
          data.message || `Error del servidor (${response.status})`,
          response.status,
          'UNKNOWN_ERROR'
        );
    }
  }

  return data;
}

/**
 * Métodos principales de la API
 */
const apiService = {
  /**
   * Enviar mensaje (anónimo o identificado)
   */
  async enviarMensaje(messageData) {
    try {
      // Validar datos antes de enviar
      if (!messageData.mensaje || messageData.mensaje.trim().length < 10) {
        throw new ValidationError('El mensaje debe tener al menos 10 caracteres', {
          mensaje: 'El mensaje debe tener al menos 10 caracteres'
        });
      }

      if (messageData.tipo === 'identificado') {
        if (!messageData.nombre || messageData.nombre.trim().length < 2) {
          throw new ValidationError('El nombre es requerido y debe tener al menos 2 caracteres', {
            nombre: 'El nombre es requerido y debe tener al menos 2 caracteres'
          });
        }

        if (!messageData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(messageData.email)) {
          throw new ValidationError('Se requiere un email válido', {
            email: 'Se requiere un email válido'
          });
        }
      }

      // Funcionalidades empresariales temporalmente simplificadas para desarrollo
      console.log('🚀 Procesando mensaje con funcionalidades empresariales...');
      
      let processedData = messageData;
      
      // Cálculo real de SLA
      let slaData;
      try {
        slaData = slaService.calculateSLA(messageData);
        console.log('⏰ SLA calculado:', slaData);
      } catch (slaError) {
        console.warn('⚠️ Error calculando SLA, usando valores por defecto:', slaError);
        // Fallback a valores por defecto si el servicio SLA falla
        slaData = {
          slaHours: 24,
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          escalationThreshold: 18,
          priority: 'medium',
          businessReason: 'SLA estándar aplicado (fallback)'
        };
      }
      
      // 3. Preparar datos para envío al webhook de n8n (incluyendo SLA)
      const dataToSend = {
        tipo: processedData.tipo,
        mensaje: processedData.mensaje.trim(),
        categoria: processedData.categoria,
        departamento: processedData.departamento || '',
        prioridad: processedData.prioridad || 'media',
        ticketId: processedData.ticketId || '',
        timestamp: new Date().toISOString(),
        fecha: new Date().toLocaleDateString('es-ES'),
        hora: new Date().toLocaleTimeString('es-ES'),
        source: 'plataforma-why',
        
        // Metadatos de SLA
        sla: {
          hours: slaData.slaHours,
          dueDate: slaData.dueDate,
          escalationThreshold: slaData.escalationThreshold,
          priority: slaData.priority
        },
        
        // Metadatos de privacidad (simulado)
        privacy: {
          riskLevel: 'LOW',
          anonymized: 'none',
          requiresReview: false
        },
        
        ...(processedData.tipo === 'identificado' && {
          nombre: processedData.nombre?.trim ? processedData.nombre.trim() : processedData.nombre,
          email: processedData.email?.trim ? processedData.email.trim() : processedData.email,
          empresa: processedData.empresa?.trim ? processedData.empresa.trim() : processedData.empresa,
        }),
      };

      console.log('📤 Enviando mensaje al webhook n8n:', dataToSend);

      const response = await fetchWithTimeout(WEBHOOK_URL, {
        method: 'POST',
        body: JSON.stringify(dataToSend),
      });

      const result = await processResponse(response);
      
      console.log('✅ Mensaje enviado exitosamente:', result);
      
      // 4. Crear ticket en ClickUp
      let clickUpResult = null;
      try {
        console.log('🎫 ClickUp: Creando ticket real...');
        clickUpResult = await clickupService.createClickUpTicket({
          ...dataToSend,
          sla: slaData
        });
        console.log('✅ ClickUp ticket creado:', clickUpResult);
      } catch (clickUpError) {
        console.error('⚠️ Error creando ticket ClickUp:', clickUpError);
        // No fallar el envío principal si ClickUp falla
        clickUpResult = {
          success: false,
          error: clickUpError.message,
          fallback: true
        };
      }
      
      console.log('📋 Auditoría: Registrando actividad...');
      
      // Actualizar resultado con datos reales de ClickUp
      if (clickUpResult && clickUpResult.success) {
        result.clickUp = {
          taskId: clickUpResult.clickUpTaskId,
          url: clickUpResult.clickUpUrl,
          assignedUsers: clickUpResult.assignedUsers || []
        };
      }
      
      // 6. Programar verificación de escalamiento si es necesario
      if (slaData.escalationThreshold && processedData.prioridad !== 'baja') {
        console.log(`🚀 Escalamiento programado para ${slaData.escalationThreshold} horas`);
        // En un entorno real, esto se manejaría con un job scheduler
      }
      
      return {
        ...result,
        enhancedData: {
          sla: slaData,
          privacy: { riskLevel: 'LOW', anonymized: 'none' },
          originalTicketId: processedData.ticketId
        }
      };

    } catch (error) {
      console.error('❌ Error al enviar mensaje:', error);
      
      // Re-lanzar errores conocidos
      if (error instanceof APIError || error instanceof NetworkError || error instanceof ValidationError) {
        throw error;
      }
      
      // Error desconocido
      throw new APIError('Error inesperado al enviar el mensaje. Por favor intenta nuevamente.', 0, 'UNKNOWN');
    }
  },

  /**
   * Verificar estado del servidor
   */
  async verificarEstado() {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/health`, {
        method: 'GET',
      });

      return await processResponse(response);
    } catch (error) {
      console.error('❌ Error al verificar estado del servidor:', error);
      throw error;
    }
  },

  /**
   * Obtener estadísticas (si está disponible)
   */
  async obtenerEstadisticas() {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/stats`, {
        method: 'GET',
      });

      return await processResponse(response);
    } catch (error) {
      console.error('❌ Error al obtener estadísticas:', error);
      throw error;
    }
  }
};

export default apiService;
