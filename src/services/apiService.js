/**
 * Servicio para manejar llamadas a la API
 * Centraliza la lógica de comunicación con el backend
 */

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

      // Preparar datos para envío al webhook de n8n
      const dataToSend = {
        tipo: messageData.tipo,
        mensaje: messageData.mensaje.trim(),
        timestamp: new Date().toISOString(),
        fecha: new Date().toLocaleDateString('es-ES'),
        hora: new Date().toLocaleTimeString('es-ES'),
        source: 'plataforma-why',
        ...(messageData.tipo === 'identificado' && {
          nombre: messageData.nombre.trim(),
          email: messageData.email.trim(),
          empresa: messageData.empresa?.trim() || '',
        }),
      };

      console.log('📤 Enviando mensaje al webhook n8n:', dataToSend);

      const response = await fetchWithTimeout(WEBHOOK_URL, {
        method: 'POST',
        body: JSON.stringify(dataToSend),
      });

      const result = await processResponse(response);
      
      console.log('✅ Mensaje enviado exitosamente:', result);
      return result;

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
