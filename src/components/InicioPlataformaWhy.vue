<template>
  <div class="contenedor-principal">
  <div class="contenedor-formulario">
  <h1 class="titulo">WHY El buzón del Porqué</h1>
   
        <div class="botonera">
  <button
            @click="cambiarModo('nombre')"
            :class="modo === 'nombre' ? 'boton boton-activo-izq' : 'boton boton-inactivo-izq'"
  >
            Con nombre
  </button>
  <button
            @click="cambiarModo('anonimo')"
            :class="modo === 'anonimo' ? 'boton boton-activo-der' : 'boton boton-inactivo-der'"
  >
            Anónima
  </button>
  </div>
   
        <p class="descripcion">
          ¡Bienvenido! Este es un espacio abierto donde puedes hacer cualquier pregunta o expresar tus inquietudes. Estamos aquí para escucharte y responderte.
        </p>

        <!-- Sección de Categorización -->
        <div class="seccion-categorizacion">
          <h3 class="subtitulo-categorizacion">🏷️ Ayúdanos a categorizar tu mensaje</h3>
          
          <div class="fila-dropdowns">
            <div class="campo-dropdown categoria-principal">
              <label class="etiqueta etiqueta-principal">
                <span class="icono-requerido">🎯</span> 
                Pregunta
                <span class="asterisco-requerido">*</span>
              </label>
              <select 
                :class="['dropdown dropdown-principal', errors.categoria ? 'entrada-error' : '']"
                v-model="form.categoria"
                @blur="validateField('categoria')"
              >
                <option value="" disabled>Selecciona una categoría</option>
                <option value="pregunta">❓ Pregunta</option>
                <option value="sugerencia">💡 Sugerencia</option>
                <option value="queja">⚠️ Queja</option>
                <option value="felicitacion">👏 Felicitación</option>
                <option value="bug">🐛 Reporte de Error</option>
                <option value="otro">📝 Otro</option>
              </select>
              <span v-if="errors.categoria" class="mensaje-error-campo">{{ errors.categoria }}</span>
            </div>

            <div class="campo-dropdown">
              <label class="etiqueta">
                <span class="icono-opcional">🏢</span> 
                Departamento
              </label>
              <select class="dropdown" v-model="form.departamento">
                <option value="">Sin especificar</option>
                <option value="rrhh">👥 Recursos Humanos</option>
                <option value="it">💻 Tecnología (IT)</option>
                <option value="ventas">💼 Ventas</option>
                <option value="operaciones">⚙️ Operaciones</option>
                <option value="marketing">📢 Marketing</option>
                <option value="finanzas">💰 Finanzas</option>
                <option value="administracion">📋 Administración</option>
                <option value="gerencia">🎯 Gerencia</option>
              </select>
            </div>

            <div class="campo-dropdown">
              <label class="etiqueta">
                <span class="icono-prioridad">⏱️</span> 
                Prioridad
              </label>
              <select class="dropdown" v-model="form.prioridad">
                <option value="baja">🟢 Baja</option>
                <option value="media" selected>🟡 Media</option>
                <option value="alta">🔴 Alta</option>
                <option value="urgente">🚨 Urgente</option>
              </select>
            </div>
          </div>
        </div>
   
        <!-- Mensaje de estado -->
        <div v-if="submitMessage" :class="submitType === 'success' ? 'mensaje-exito' : 'mensaje-error'">
          {{ submitMessage }}
        </div>

        <form class="formulario">
          <template v-if="modo === 'nombre'">
            <div class="campo-grupo">
              <label class="etiqueta">Nombre *</label>
              <input
                type="text"
                :class="['entrada', errors.nombre ? 'entrada-error' : '']"
                placeholder="Tu nombre"
                v-model="form.nombre"
                @blur="validateField('nombre')"
                maxlength="50"
              />
              <span v-if="errors.nombre" class="mensaje-error-campo">{{ errors.nombre }}</span>
            </div>
            
            <div class="campo-grupo">
              <label class="etiqueta">Correo electrónico *</label>
              <input
                type="email"
                :class="['entrada', errors.email ? 'entrada-error' : '']"
                placeholder="tucorreo@ejemplo.com"
                v-model="form.email"
                @blur="validateField('email')"
                maxlength="100"
              />
              <span v-if="errors.email" class="mensaje-error-campo">{{ errors.email }}</span>
            </div>
            
            <div class="campo-grupo">
              <label class="etiqueta">Empresa o departamento</label>
              <textarea
                :class="['entrada', errors.empresa ? 'entrada-error' : '']"
                placeholder="Escribe aquí tu empresa o área..."
                rows="2"
                v-model="form.empresa"
                @blur="validateField('empresa')"
                maxlength="100"
              ></textarea>
              <span v-if="errors.empresa" class="mensaje-error-campo">{{ errors.empresa }}</span>
            </div>
          </template>
   
          <div class="campo-grupo">
            <label class="etiqueta">Tu mensaje *</label>
            <textarea
              :class="['entrada', errors.mensaje ? 'entrada-error' : '']"
              placeholder="¿Qué deseas compartir con nosotros? (mínimo 10 caracteres)"
              rows="4"
              v-model="form.mensaje"
              @blur="validateField('mensaje')"
              maxlength="500"
            ></textarea>
            <div class="contador-caracteres">
              {{ form.mensaje.length }}/500 caracteres
            </div>
            <span v-if="errors.mensaje" class="mensaje-error-campo">{{ errors.mensaje }}</span>
          </div>
   
          <button
            type="submit"
            :class="['boton-enviar', (!isFormValid || isSubmitting) ? 'boton-deshabilitado' : '']"
            :disabled="!isFormValid || isSubmitting"
            @click.prevent="enviarFormulario"
          >
            <span v-if="isSubmitting">Enviando...</span>
            <span v-else>Enviar</span>
          </button>
        </form>
  </div>
  </div>

  <!-- Modal de Confirmación -->
  <div v-if="showConfirmationModal" class="modal-overlay" @click="showConfirmationModal = false">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <div class="icono-exito">🎉</div>
        <h2 class="modal-titulo">¡Mensaje Enviado Exitosamente!</h2>
        <p class="modal-subtitulo">Tu mensaje ha sido recibido y será procesado pronto</p>
      </div>
      
      <div class="modal-body">
        <div class="ticket-info">
          <div class="ticket-header">
            <span class="ticket-icono">🎫</span>
            <h3>Número de Ticket</h3>
          </div>
          
          <div class="ticket-id-container">
            <code class="ticket-id">{{ ticketInfo.id }}</code>
            <button class="btn-copiar" @click="copiarTicketId()" title="Copiar al portapapeles">
              📋
            </button>
          </div>
          
          <div class="ticket-details">
            <div class="detail-item">
              <span class="detail-label">🗓️ Fecha:</span>
              <span class="detail-value">{{ ticketInfo.timestamp }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">🏷️ Categoría:</span>
              <span class="detail-value">{{ ticketInfo.categoria }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">📄 Tipo:</span>
              <span class="detail-value">{{ ticketInfo.tipo === 'anonimo' ? 'Anónimo' : 'Identificado' }}</span>
            </div>
          </div>
        </div>

        <div class="info-adicional">
          <h4>📍 ¿Qué sigue ahora?</h4>
          <ul class="pasos-siguientes">
            <li v-if="ticketInfo.tipo === 'identificado'">📧 Recibirás confirmación por email con tu ticket ID</li>
            <li v-if="ticketInfo.tipo === 'identificado'">🔔 Te notificaremos cuando haya actualizaciones</li>
            <li>⏱️ Tiempo de respuesta: 24-48 horas hábiles</li>
            <li>🔍 Usa tu ticket ID para consultar el estado</li>
            <li v-if="ticketInfo.tipo === 'anonimo'">📞 Para seguimiento: menciona tu ticket ID</li>
            <li v-else>📞 Para urgencias: responde al email de confirmación</li>
          </ul>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn-primary" @click="showConfirmationModal = false">
          ✓ Entendido, gracias
        </button>
        <button class="btn-secondary" @click="enviarOtroMensaje()">
          ➕ Enviar otro mensaje
        </button>
      </div>
    </div>
  </div>
  </template>
   
<script setup>
import { ref, computed } from 'vue';
import apiService, { APIError, NetworkError, ValidationError } from '@/services/apiService';

const modo = ref('nombre');

const form = ref({
  nombre: '',
  email: '',
  empresa: '',
  mensaje: '',
  categoria: '',
  departamento: '',
  prioridad: 'media',
});

const errors = ref({
  nombre: '',
  email: '',
  empresa: '',
  mensaje: '',
  categoria: '',
});

const isSubmitting = ref(false);
const submitMessage = ref('');
const submitType = ref(''); // 'success' | 'error'

// Sistema de confirmación y tracking
const showConfirmationModal = ref(false);
const ticketInfo = ref({
  id: '',
  timestamp: '',
  categoria: '',
  tipo: ''
});

// Funciones de sistema de tickets
function generarTicketId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const prefix = 'WHY';
  return `${prefix}-${timestamp.toString().slice(-8)}-${random}`;
}

function formatearFechaTicket(date) {
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function copiarTicketId() {
  navigator.clipboard.writeText(ticketInfo.value.id).then(() => {
    // Mostrar feedback visual temporal
    const originalText = 'Copiar ID';
    setTimeout(() => {
      // Se podría agregar un estado para el feedback del botón
    }, 2000);
  }).catch(() => {
    // Fallback para navegadores que no soporten clipboard API
    console.warn('No se pudo copiar al portapapeles');
  });
}

function enviarOtroMensaje() {
  showConfirmationModal.value = false;
  // El formulario ya está limpio, solo necesitamos cerrar el modal
  // Opcional: scroll hacia arriba para mejor UX
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Validaciones individuales
function validateNombre(nombre) {
  if (!nombre.trim()) {
    return 'El nombre es requerido';
  }
  if (nombre.trim().length < 2) {
    return 'El nombre debe tener al menos 2 caracteres';
  }
  if (nombre.trim().length > 50) {
    return 'El nombre no puede exceder 50 caracteres';
  }
  return '';
}

function validateEmail(email) {
  if (!email.trim()) {
    return 'El correo electrónico es requerido';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Por favor ingresa un correo electrónico válido';
  }
  if (email.length > 100) {
    return 'El correo electrónico no puede exceder 100 caracteres';
  }
  
  // Validar dominios permitidos
  const dominiosPermitidos = ['@ecomac.cl', '@kawen.cl', '@ecomacempresas.cl', '@ceres.cl', '@bilbola.cl'];
  const emailLowerCase = email.toLowerCase();
  const dominioValido = dominiosPermitidos.some(dominio => emailLowerCase.includes(dominio));
  
  if (!dominioValido) {
    return 'Solo se permiten correos de los dominios: @ecomac.cl, @kawen.cl, @ecomacempresas.cl, @ceres.cl, @bilbola.cl';
  }
  
  return '';
}

function validateEmpresa(empresa) {
  if (empresa.trim().length > 100) {
    return 'La empresa/departamento no puede exceder 100 caracteres';
  }
  return '';
}

function validateMensaje(mensaje) {
  if (!mensaje.trim()) {
    return 'El mensaje es requerido';
  }
  if (mensaje.trim().length < 10) {
    return 'El mensaje debe tener al menos 10 caracteres';
  }
  if (mensaje.trim().length > 500) {
    return 'El mensaje no puede exceder 500 caracteres';
  }
  return '';
}

function validateCategoria(categoria) {
  if (!categoria || categoria.trim() === '') {
    return 'Por favor selecciona una categoría para tu mensaje';
  }
  const categoriasValidas = ['pregunta', 'sugerencia', 'queja', 'felicitacion', 'bug', 'otro'];
  if (!categoriasValidas.includes(categoria)) {
    return 'Por favor selecciona una categoría válida';
  }
  return '';
}

// Validar un campo específico
function validateField(field) {
  switch (field) {
    case 'nombre':
      errors.value.nombre = validateNombre(form.value.nombre);
      break;
    case 'email':
      errors.value.email = validateEmail(form.value.email);
      break;
    case 'empresa':
      errors.value.empresa = validateEmpresa(form.value.empresa);
      break;
    case 'mensaje':
      errors.value.mensaje = validateMensaje(form.value.mensaje);
      break;
    case 'categoria':
      errors.value.categoria = validateCategoria(form.value.categoria);
      break;
  }
}

// Validar todo el formulario
function validateForm() {
  // Limpiar errores previos
  errors.value = {
    nombre: '',
    email: '',
    empresa: '',
    mensaje: '',
    categoria: '',
  };

  // Validar campos requeridos en ambos modos
  errors.value.mensaje = validateMensaje(form.value.mensaje);
  errors.value.categoria = validateCategoria(form.value.categoria);

  // Validar campos adicionales solo en modo 'nombre'
  if (modo.value === 'nombre') {
    errors.value.nombre = validateNombre(form.value.nombre);
    errors.value.email = validateEmail(form.value.email);
    errors.value.empresa = validateEmpresa(form.value.empresa);
  }

  // Retornar si hay errores
  return !Object.values(errors.value).some(error => error !== '');
}

// Computed para verificar si el formulario es válido
const isFormValid = computed(() => {
  // Validar categoría (requerida en ambos modos)
  const categoriaValida = form.value.categoria && form.value.categoria.trim() !== '';
  
  if (modo.value === 'anonimo') {
    return (
      form.value.mensaje.trim().length >= 10 &&
      categoriaValida
    );
  } else {
    // Validar formato básico de email
    const emailBasicoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email);
    
    // Validar dominios permitidos
    const dominiosPermitidos = ['@ecomac.cl', '@kawen.cl', '@ecomacempresas.cl', '@ceres.cl', '@bilbola.cl'];
    const emailLowerCase = form.value.email.toLowerCase();
    const dominioValido = dominiosPermitidos.some(dominio => emailLowerCase.includes(dominio));
    
    return (
      form.value.nombre.trim().length >= 2 &&
      emailBasicoValido &&
      dominioValido &&
      form.value.mensaje.trim().length >= 10 &&
      categoriaValida
    );
  }
});

// Limpiar errores cuando se cambia de modo
function cambiarModo(nuevoModo) {
  modo.value = nuevoModo;
  errors.value = {
    nombre: '',
    email: '',
    empresa: '',
    mensaje: '',
    categoria: '',
  };
  submitMessage.value = '';
  submitType.value = '';
}

// Limpiar mensaje de estado después de un tiempo
function clearMessage() {
  setTimeout(() => {
    submitMessage.value = '';
    submitType.value = '';
  }, 5000);
}

async function enviarFormulario() {
  // Prevenir múltiples envíos
  if (isSubmitting.value) return;

  // Validar formulario
  if (!validateForm()) {
    submitMessage.value = 'Por favor corrige los errores antes de enviar';
    submitType.value = 'error';
    clearMessage();
    return;
  }

  isSubmitting.value = true;
  submitMessage.value = '';
  submitType.value = '';

  try {
    // Preparar datos para envío
    const dataToSend = modo.value === 'anonimo' 
      ? { 
          tipo: 'anonimo',
          mensaje: form.value.mensaje.trim(),
          categoria: form.value.categoria,
          departamento: form.value.departamento,
          prioridad: form.value.prioridad
        }
      : {
          tipo: 'identificado',
          nombre: form.value.nombre.trim(),
          email: form.value.email.trim(),
          empresa: form.value.empresa.trim(),
          mensaje: form.value.mensaje.trim(),
          categoria: form.value.categoria,
          departamento: form.value.departamento,
          prioridad: form.value.prioridad
        };

    // Generar ticket antes del envío
    const ticketId = generarTicketId();
    const ticketTimestamp = new Date();
    
    // Agregar ticket ID a los datos
    const dataWithTicket = {
      ...dataToSend,
      ticketId: ticketId
    };

    // Llamar al servicio de API
    const response = await apiService.enviarMensaje(dataWithTicket);

    // Preparar información del ticket para el modal
    ticketInfo.value = {
      id: ticketId,
      timestamp: formatearFechaTicket(ticketTimestamp),
      categoria: form.value.categoria,
      tipo: modo.value
    };

    // Éxito - limpiar formulario
    form.value = {
      nombre: '',
      email: '',
      empresa: '',
      mensaje: '',
      categoria: '',
      departamento: '',
      prioridad: 'media',
    };
    
    errors.value = {
      nombre: '',
      email: '',
      empresa: '',
      mensaje: '',
      categoria: '',
    };
    
    // Mostrar modal de confirmación en lugar del mensaje simple
    showConfirmationModal.value = true;
    
  } catch (error) {
    console.error('❌ Error al enviar formulario:', error);
    
    // Manejo específico de errores
    if (error instanceof ValidationError) {
      submitMessage.value = error.message;
      submitType.value = 'error';
      // Aplicar errores de validación del servidor a los campos
      if (error.errors) {
        Object.assign(errors.value, error.errors);
      }
    } else if (error instanceof NetworkError) {
      submitMessage.value = error.message;
      submitType.value = 'error';
    } else if (error instanceof APIError) {
      submitMessage.value = error.message;
      submitType.value = 'error';
    } else {
      // Error desconocido
      submitMessage.value = 'Error inesperado. Por favor intenta nuevamente.';
      submitType.value = 'error';
    }
  } finally {
    isSubmitting.value = false;
    clearMessage();
  }
}
</script>
  <style scoped>
  .contenedor-principal {
    min-height: 100vh;
    background: linear-gradient(to top right, white, #dbeafe);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }
   
  .contenedor-formulario {
    width: 100%;
    max-width: 28rem;
    background-color: white;
    border: 1px solid #e5e7eb;
    box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
    border-radius: 1rem;
    padding: 1.5rem;
  }
   
  .titulo {
    font-size: 1.875rem;
    font-weight: 800;
    color: #1f2937;
    text-align: center;
    margin-bottom: 1rem;
  }
   
  .botonera {
    display: flex;
    justify-content: center;
    margin-bottom: 1.5rem;
  }
   
  .boton {
    width: 50%;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    font-weight: bold;
  }
   
  .boton-activo-izq {
    background-color: #2563eb;
    color: white;
    border-top-left-radius: 0.5rem;
    border-bottom-left-radius: 0.5rem;
  }
   
  .boton-activo-der {
    background-color: #2563eb;
    color: white;
    border-top-right-radius: 0.5rem;
    border-bottom-right-radius: 0.5rem;
  }
   
  .boton-inactivo-izq {
    background-color: #f3f4f6;
    color: #4b5563;
    border-top-left-radius: 0.5rem;
    border-bottom-left-radius: 0.5rem;
  }
   
  .boton-inactivo-der {
    background-color: #f3f4f6;
    color: #4b5563;
    border-top-right-radius: 0.5rem;
    border-bottom-right-radius: 0.5rem;
  }
   
  .descripcion {
    color: #374151;
    text-align: center;
    margin-bottom: 1rem;
  }

  /* Sección de Categorización */
  .seccion-categorizacion {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
    width: 100%;
    box-sizing: border-box;
  }

  .subtitulo-categorizacion {
    font-size: 1.125rem;
    font-weight: 700;
    color: #2d3748;
    text-align: center;
    margin-bottom: 1.25rem;
    position: relative;
  }

  .subtitulo-categorizacion::after {
    content: '';
    display: block;
    width: 3rem;
    height: 2px;
    background: linear-gradient(90deg, #3b82f6, #8b5cf6);
    margin: 0.5rem auto;
    border-radius: 1px;
  }

  .fila-dropdowns {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
    align-items: end;
    width: 100%;
    max-width: 100%;
  }

  /* Responsive design mejorado */
  @media (min-width: 640px) {
    .fila-dropdowns {
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
  }

  @media (min-width: 768px) {
    .fila-dropdowns {
      grid-template-columns: 2fr 1.5fr 1fr;
      gap: 1rem;
    }
  }

  .campo-dropdown {
    display: flex;
    flex-direction: column;
    position: relative;
    min-width: 0; /* Permite que el flex item se encoja */
    width: 100%;
    max-width: 100%;
  }

  .dropdown {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    padding: 0.75rem 0.85rem;
    padding-right: 2.25rem;
    border: 2px solid #e5e7eb;
    border-radius: 0.5rem;
    background-color: white;
    background-image: url('data:image/svg+xml;charset=US-ASCII,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 5"><path fill="%23666" d="M2 0L0 2h4zm0 5L0 3h4z"/></svg>');
    background-repeat: no-repeat;
    background-position: right 0.65rem center;
    background-size: 0.75rem;
    color: #374151;
    font-size: 0.875rem;
    font-weight: 500;
    outline: none;
    transition: all 0.2s ease;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    box-sizing: border-box;
  }

  .dropdown:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    transform: translateY(-1px);
  }

  .dropdown:hover {
    border-color: #9ca3af;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  /* Mejorar altura consistente */
  .dropdown {
    min-height: 2.75rem;
  }

  /* Opciones con emoji para mejor visualización */
  .dropdown option {
    padding: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    background-color: white;
  }

  .dropdown option:hover {
    background-color: #f3f4f6;
  }

  /* Estilos especiales para categoría principal */
  .categoria-principal {
    position: relative;
  }

  .dropdown-principal {
    border-color: #3b82f6;
    background-color: #fefefe;
  }

  .dropdown-principal:focus {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    border-color: #2563eb;
  }
   
  .formulario {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
   
  .etiqueta {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.4rem;
    line-height: 1.2;
  }

  .etiqueta-principal {
    color: #1f2937;
    font-weight: 700;
    font-size: 0.85rem;
  }

  .icono-requerido, .icono-opcional, .icono-prioridad {
    font-size: 1rem;
    margin-right: 0.125rem;
  }

  .asterisco-requerido {
    color: #ef4444;
    font-weight: bold;
    margin-left: 0.125rem;
  }

  .texto-opcional {
    color: #6b7280;
    font-weight: 400;
    font-size: 0.75rem;
    margin-left: 0.25rem;
  }
   
  .entrada {
    width: 100%;
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    outline: none;
    transition: box-shadow 0.2s, border-color 0.2s;
  }
   
  .entrada:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px #bfdbfe;
  }
   
  .boton-enviar {
    width: 100%;
    background-color: #2563eb;
    color: white;
    padding: 0.5rem;
    border-radius: 0.5rem;
    font-weight: 600;
    transition: background-color 0.3s;
  }
   
  .boton-enviar:hover:not(:disabled) {
    background-color: #1e40af;
  }

  .boton-deshabilitado {
    background-color: #9ca3af !important;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .boton-deshabilitado:hover {
    background-color: #9ca3af !important;
  }

  /* Estilos para validación */
  .campo-grupo {
    display: flex;
    flex-direction: column;
  }

  .entrada-error {
    border-color: #ef4444 !important;
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2) !important;
  }

  .mensaje-error-campo {
    color: #ef4444;
    font-size: 0.75rem;
    margin-top: 0.25rem;
    font-weight: 500;
  }

  .contador-caracteres {
    font-size: 0.75rem;
    color: #6b7280;
    text-align: right;
    margin-top: 0.25rem;
  }

  /* Mensajes de estado */
  .mensaje-exito {
    background-color: #dcfce7;
    border: 1px solid #bbf7d0;
    color: #166534;
    padding: 0.75rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    font-weight: 500;
    text-align: center;
  }

  .mensaje-error {
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
    padding: 0.75rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    font-weight: 500;
    text-align: center;
  }

  /* Animaciones */
  .mensaje-exito,
  .mensaje-error {
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Responsive mejorado */
  @media (max-width: 640px) {
    .contenedor-formulario {
      margin: 0.5rem;
      padding: 1rem;
    }
    
    .titulo {
      font-size: 1.5rem;
    }

    .seccion-categorizacion {
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .subtitulo-categorizacion {
      font-size: 1rem;
      margin-bottom: 1rem;
    }

    .fila-dropdowns {
      gap: 0.75rem;
    }

    .dropdown {
      padding: 0.65rem 0.85rem;
      padding-right: 2.25rem;
      font-size: 0.8rem;
    }

    .etiqueta {
      font-size: 0.8rem;
      margin-bottom: 0.375rem;
    }

    .icono-requerido, .icono-opcional, .icono-prioridad {
      font-size: 0.9rem;
    }
  }

  /* Estilos del Modal de Confirmación */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeInOverlay 0.3s ease-out;
  }

  .modal-content {
    background: white;
    border-radius: 1rem;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    animation: slideInModal 0.3s ease-out;
    position: relative;
  }

  .modal-header {
    text-align: center;
    padding: 2rem 2rem 1rem;
    border-bottom: 1px solid #f1f5f9;
  }

  .icono-exito {
    font-size: 3rem;
    margin-bottom: 1rem;
    animation: bounceIn 0.6s ease-out 0.2s both;
  }

  .modal-titulo {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .modal-subtitulo {
    color: #6b7280;
    font-size: 0.95rem;
    margin: 0;
  }

  .modal-body {
    padding: 1.5rem 2rem;
  }

  .ticket-info {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .ticket-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .ticket-icono {
    font-size: 1.25rem;
  }

  .ticket-header h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #374151;
    margin: 0;
  }

  .ticket-id-container {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: white;
    padding: 1rem;
    border-radius: 0.5rem;
    border: 2px dashed #3b82f6;
    margin-bottom: 1rem;
  }

  .ticket-id {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 1rem;
    font-weight: 600;
    color: #3b82f6;
    background: transparent;
    border: none;
    flex: 1;
    letter-spacing: 0.5px;
  }

  .btn-copiar {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.5rem;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 2.5rem;
  }

  .btn-copiar:hover {
    background: #2563eb;
    transform: scale(1.05);
  }

  .ticket-details {
    display: grid;
    gap: 0.5rem;
  }

  .detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
  }

  .detail-label {
    color: #6b7280;
    font-weight: 500;
  }

  .detail-value {
    color: #374151;
    font-weight: 600;
    text-transform: capitalize;
  }

  .info-adicional h4 {
    color: #374151;
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .pasos-siguientes {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.5rem;
  }

  .pasos-siguientes li {
    background: #f8fafc;
    padding: 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    color: #374151;
    border-left: 3px solid #3b82f6;
  }

  .modal-footer {
    padding: 1rem 2rem 2rem;
    display: flex;
    gap: 0.75rem;
    justify-content: center;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    flex: 1;
    max-width: 200px;
  }

  .btn-primary:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }

  .btn-secondary {
    background: #f8fafc;
    color: #374151;
    border: 1px solid #e2e8f0;
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    flex: 1;
    max-width: 200px;
  }

  .btn-secondary:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
  }

  /* Animaciones */
  @keyframes fadeInOverlay {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideInModal {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes bounceIn {
    0% {
      opacity: 0;
      transform: scale(0.3);
    }
    50% {
      transform: scale(1.1);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* Responsive para el modal */
  @media (max-width: 640px) {
    .modal-content {
      margin: 1rem;
      width: calc(100% - 2rem);
    }

    .modal-header {
      padding: 1.5rem 1rem 1rem;
    }

    .modal-body {
      padding: 1rem;
    }

    .modal-footer {
      padding: 1rem;
      flex-direction: column;
    }

    .btn-primary, .btn-secondary {
      max-width: none;
      width: 100%;
    }

    .ticket-id {
      font-size: 0.875rem;
    }
  }
  </style>
