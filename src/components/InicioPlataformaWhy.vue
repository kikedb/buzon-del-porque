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
});

const errors = ref({
  nombre: '',
  email: '',
  empresa: '',
  mensaje: '',
});

const isSubmitting = ref(false);
const submitMessage = ref('');
const submitType = ref(''); // 'success' | 'error'

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
  };

  // Validar mensaje siempre (requerido en ambos modos)
  errors.value.mensaje = validateMensaje(form.value.mensaje);

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
  if (modo.value === 'anonimo') {
    return form.value.mensaje.trim().length >= 10;
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
      form.value.mensaje.trim().length >= 10
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
          mensaje: form.value.mensaje.trim() 
        }
      : {
          tipo: 'identificado',
          nombre: form.value.nombre.trim(),
          email: form.value.email.trim(),
          empresa: form.value.empresa.trim(),
          mensaje: form.value.mensaje.trim()
        };

    // Llamar al servicio de API
    const response = await apiService.enviarMensaje(dataToSend);

    // Éxito - limpiar formulario
    form.value = {
      nombre: '',
      email: '',
      empresa: '',
      mensaje: '',
    };
    
    errors.value = {
      nombre: '',
      email: '',
      empresa: '',
      mensaje: '',
    };
    
    submitMessage.value = '¡Mensaje enviado exitosamente! Gracias por contactarnos.';
    submitType.value = 'success';
    
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
   
  .formulario {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
   
  .etiqueta {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.25rem;
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

  /* Responsive */
  @media (max-width: 640px) {
    .contenedor-formulario {
      margin: 0.5rem;
      padding: 1rem;
    }
    
    .titulo {
      font-size: 1.5rem;
    }
  }
  </style>
