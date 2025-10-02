/**
 * Servicio de Integración con ClickUp
 * Maneja creación automática de tickets y seguimiento de estados
 */

import { calculateSLA } from './slaService.js';

/**
 * Configuración de ClickUp
 */
const CLICKUP_CONFIG = {
  apiUrl: 'https://api.clickup.com/api/v2',
  apiKey: import.meta.env.VITE_CLICKUP_API_KEY,
  teamId: import.meta.env.VITE_CLICKUP_TEAM_ID,
  spaceId: import.meta.env.VITE_CLICKUP_SPACE_ID,
  
  // IDs de listas por departamento (configurar según tu ClickUp)
  listsByDepartment: {
    'it': import.meta.env.VITE_CLICKUP_LIST_IT || '901200123456', // IT Support
    'rrhh': import.meta.env.VITE_CLICKUP_LIST_HR || '901200123457', // RRHH
    'ventas': import.meta.env.VITE_CLICKUP_LIST_SALES || '901200123458', // Ventas
    'operaciones': import.meta.env.VITE_CLICKUP_LIST_OPS || '901200123459', // Operaciones
    'marketing': import.meta.env.VITE_CLICKUP_LIST_MKT || '901200123460', // Marketing
    'finanzas': import.meta.env.VITE_CLICKUP_LIST_FIN || '901200123461', // Finanzas
    'administracion': import.meta.env.VITE_CLICKUP_LIST_ADMIN || '901200123462', // Admin
    'gerencia': import.meta.env.VITE_CLICKUP_LIST_MGMT || '901200123463' // Gerencia
  },

  // Lista por defecto si no se especifica departamento
  defaultListId: import.meta.env.VITE_CLICKUP_DEFAULT_LIST || '901200123464',

  // Usuarios por departamento para asignación automática
  usersByDepartment: {
    'it': [
      { id: '12345678', name: 'Juan Pérez', email: 'juan.perez@ecomac.cl' },
      { id: '12345679', name: 'María García', email: 'maria.garcia@ecomac.cl' }
    ],
    'rrhh': [
      { id: '12345680', name: 'Ana López', email: 'ana.lopez@ecomac.cl' }
    ],
    'ventas': [
      { id: '12345681', name: 'Carlos Ruiz', email: 'carlos.ruiz@ecomac.cl' },
      { id: '12345682', name: 'Laura Martín', email: 'laura.martin@ecomac.cl' }
    ]
    // Agregar más departamentos según necesidad
  }
};

/**
 * Mapeo de prioridades Buzón del Porqué a ClickUp
 */
const PRIORITY_MAPPING = {
  'urgente': 1,    // Urgent
  'alta': 2,       // High
  'media': 3,      // Normal  
  'baja': 4        // Low
};

/**
 * Mapeo de categorías a tags de ClickUp
 */
const CATEGORY_TAGS = {
  'pregunta': ['question', 'inquiry'],
  'sugerencia': ['suggestion', 'improvement'],
  'queja': ['complaint', 'issue'],
  'felicitacion': ['compliment', 'feedback'],
  'bug': ['bug', 'technical'],
  'otro': ['other', 'general']
};

/**
 * Estados personalizados por tipo de ticket
 */
const CUSTOM_STATUSES = {
  'bug': ['Open', 'In Progress', 'Testing', 'Closed'],
  'queja': ['Open', 'Investigating', 'Resolved', 'Closed'],
  'pregunta': ['Open', 'Answered', 'Closed'],
  'sugerencia': ['Open', 'Under Review', 'Approved', 'Implemented', 'Closed'],
  'felicitacion': ['Open', 'Acknowledged', 'Closed'],
  'otro': ['Open', 'In Progress', 'Closed']
};

/**
 * Cliente HTTP para ClickUp API
 */
class ClickUpClient {
  constructor() {
    this.baseURL = CLICKUP_CONFIG.apiUrl;
    this.headers = {
      'Authorization': CLICKUP_CONFIG.apiKey,
      'Content-Type': 'application/json'
    };
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.headers,
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`ClickUp API Error: ${response.status} - ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error en ClickUp API:', error);
      throw error;
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
}

const clickUpClient = new ClickUpClient();

/**
 * Crear ticket en ClickUp desde mensaje del buzón con retry logic
 */
export async function createClickUpTicket(messageData, retries = 3) {
  let lastError = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Intento ${attempt}/${retries} - Creando ticket ClickUp...`);
    // Calcular SLA para el mensaje
    const slaData = calculateSLA(messageData);
    
    // Determinar lista de destino
    const listId = CLICKUP_CONFIG.listsByDepartment[messageData.departamento] || 
                   CLICKUP_CONFIG.defaultListId;
    
    // Preparar datos del ticket
    const ticketData = prepareTicketData(messageData, slaData);
    
    // Crear tarea en ClickUp
    const task = await clickUpClient.post(`/list/${listId}/task`, ticketData);
    
    // Agregar comentario con detalles adicionales
    if (messageData.tipo === 'identificado' || messageData.empresa) {
      await addTicketComment(task.id, messageData);
    }
    
    // Configurar campos personalizados
    await setCustomFields(task.id, messageData, slaData);
    
    // Asignar automáticamente si hay usuarios disponibles
    await autoAssignTicket(task.id, messageData.departamento, messageData.prioridad);
    
    console.log('✅ Ticket creado en ClickUp:', task);
    
    return {
      success: true,
      clickUpTaskId: task.id,
      clickUpUrl: task.url,
      listId: listId,
      slaData: slaData,
      assignedUsers: await getTaskAssignees(task.id),
      metadata: {
        createdAt: new Date().toISOString(),
        source: 'buzon-del-porque',
        originalTicketId: messageData.ticketId
      }
    };
    
    } catch (error) {
      lastError = error;
      console.error(`❗ Error en intento ${attempt}/${retries}:`, error);
      
      // Si es el último intento o es un error no recuperable, lanzar error
      if (attempt === retries || error.status === 401 || error.status === 403) {
        console.error('❌ Error definitivo creando ticket en ClickUp:', error);
        throw new Error(`Failed to create ClickUp ticket after ${retries} attempts: ${error.message}`);
      }
      
      // Esperar antes del siguiente intento (exponential backoff)
      const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`⏳ Esperando ${waitTime}ms antes del siguiente intento...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

/**
 * Preparar datos del ticket para ClickUp
 */
function prepareTicketData(messageData, slaData) {
  const { categoria, prioridad, mensaje, ticketId, nombre, email } = messageData;
  
  // Título del ticket
  const title = generateTicketTitle(messageData);
  
  // Descripción completa
  const description = generateTicketDescription(messageData, slaData);
  
  // Tags siguiendo el patrón de tu ClickUp actual
  const tags = [
    // Tag principal del buzón
    'buzon-del-porque',
    // Departamento directo (como en tu ClickUp)
    messageData.departamento || 'general',
    // Categoría técnica
    ...CATEGORY_TAGS[categoria] || [],
    // Prioridad solo si es crítica
    ...(prioridad === 'urgente' || prioridad === 'alta' ? [prioridad] : []),
    // Tipo de solicitud
    messageData.tipo === 'identificado' ? 'interno' : 'anonimo'
  ];
  
  return {
    name: title,
    description: description,
    priority: PRIORITY_MAPPING[prioridad] || 3,
    tags: tags,
    due_date: slaData.dueDate.getTime(),
    // Estado inicial como en tu ClickUp (ajustar según tus estados exactos)
    status: 'pendiente servidor dev',
    custom_fields: [
      {
        id: 'original_ticket_id',
        value: ticketId
      },
      {
        id: 'sla_hours',
        value: slaData.slaHours
      },
      {
        id: 'message_type', 
        value: messageData.tipo
      },
      {
        id: 'department',
        value: messageData.departamento || 'general'
      }
    ]
  };
}

/**
 * Generar título descriptivo con clasificación mejorada para lista única
 */
function generateTicketTitle(messageData) {
  const { categoria, departamento, prioridad, ticketId } = messageData;
  
  // Emojis por categoría
  const categoryEmoji = {
    'pregunta': '❓',
    'sugerencia': '💡', 
    'queja': '⚠️',
    'felicitacion': '👏',
    'bug': '🐛',
    'otro': '📝'
  };
  
  // Emojis por departamento para mejor visualización
  const deptEmoji = {
    'rrhh': '👥',
    'it': '💻', 
    'ventas': '💼',
    'operaciones': '⚙️',
    'marketing': '📢',
    'finanzas': '💰',
    'administracion': '📋',
    'gerencia': '🎯'
  };
  
  // Indicadores de prioridad para título
  const priorityIndicator = {
    'urgente': '🚨',
    'alta': '🔴',
    'media': '🟡',
    'baja': '🟢'
  };
  
  const categoryIcon = categoryEmoji[categoria] || '📋';
  const deptIcon = deptEmoji[departamento] || '🏢';
  const priorityIcon = priorityIndicator[prioridad] || '🟡';
  const deptTag = departamento ? `[${departamento.toUpperCase()}]` : '[GENERAL]';
  
  // Extraer primeras palabras del mensaje como preview
  const preview = messageData.mensaje.substring(0, 40).trim();
  const previewText = preview.length < messageData.mensaje.length ? `${preview}...` : preview;
  
  // Formato simple como en tu ClickUp actual - sin emojis complejos
  const preview = messageData.mensaje.substring(0, 60).trim();
  const previewText = preview.length < messageData.mensaje.length ? `${preview}...` : preview;
  
  return `${previewText} - ${ticketId}`;
}

/**
 * Generar descripción completa del ticket
 */
function generateTicketDescription(messageData, slaData) {
  const { tipo, nombre, email, empresa, mensaje, categoria, prioridad, departamento, timestamp } = messageData;
  
  let description = `
## 📋 Detalles del Ticket

**🎯 Categoría:** ${categoria.charAt(0).toUpperCase() + categoria.slice(1)}
**⏱️ Prioridad:** ${prioridad.toUpperCase()}
**🏢 Departamento:** ${departamento || 'No especificado'}
**📅 Fecha de creación:** ${new Date(timestamp).toLocaleString('es-ES')}
**⏰ SLA:** ${slaData.slaHours} horas (vence: ${slaData.dueDate.toLocaleString('es-ES')})

## 💬 Mensaje Original

"${mensaje}"

## 👤 Información del Remitente

**Tipo de solicitud:** ${getTipoSolicitud(messageData)}
`;

  if (tipo === 'identificado') {
    description += `
**Nombre:** ${nombre}
**Email:** ${email}
${empresa ? `**Empresa:** ${empresa}` : ''}
`;
  }

  description += `

## 🎯 Contexto Adicional

- **Ticket ID Original:** \`${messageData.ticketId}\`
- **Fuente:** Buzón del Porqué - Plataforma WHY
- **SLA Calculado:** ${slaData.businessReason}
- **Umbral de Escalamiento:** ${slaData.escalationThreshold} horas

## ✅ Acciones Recomendadas

${getRecommendedActions(messageData)}
`;

  return description;
}

/**
 * Mapear tipo de solicitud según tu estructura de ClickUp
 */
function getTipoSolicitud(messageData) {
  const { departamento, categoria, tipo } = messageData;
  
  // Mapeo basado en tu ClickUp actual
  if (tipo === 'identificado') {
    switch (departamento) {
      case 'it':
        return 'Website / Infraestructura';
      case 'administracion':
      case 'gerencia':
        return 'Administración';
      case 'finanzas':
        return 'Dynamics / Gestión de datos';
      default:
        return 'Interno';
    }
  } else {
    return 'Solicitud externa';
  }
}

/**
 * Obtener acciones recomendadas según el tipo de mensaje
 */
function getRecommendedActions(messageData) {
  const actions = {
    'pregunta': `
- [ ] Revisar pregunta y contexto
- [ ] Buscar información relevante
- [ ] Preparar respuesta completa
- [ ] Enviar respuesta al usuario
- [ ] Marcar como resuelto`,
    
    'sugerencia': `
- [ ] Evaluar viabilidad de la sugerencia
- [ ] Consultar con stakeholders relevantes
- [ ] Determinar prioridad y recursos necesarios
- [ ] Comunicar decisión al usuario
- [ ] Si se aprueba, crear plan de implementación`,
    
    'queja': `
- [ ] **URGENTE**: Investigar el problema inmediatamente
- [ ] Contactar al usuario para más detalles
- [ ] Identificar causa raíz
- [ ] Implementar solución o plan de acción
- [ ] Seguimiento con el usuario
- [ ] Documentar lecciones aprendidas`,
    
    'felicitacion': `
- [ ] Reconocer y agradecer el feedback positivo
- [ ] Compartir con el equipo relevante
- [ ] Considerar para casos de éxito/testimonios
- [ ] Responder al usuario agradeciendo`,
    
    'bug': `
- [ ] **CRÍTICO**: Reproducir el error
- [ ] Evaluar impacto y severidad
- [ ] Asignar a desarrollador/técnico
- [ ] Crear fix y testing
- [ ] Desplegar solución
- [ ] Confirmar resolución con usuario`,
    
    'otro': `
- [ ] Revisar y categorizar correctamente
- [ ] Determinar departamento responsable
- [ ] Definir plan de acción específico
- [ ] Ejecutar y dar seguimiento`
  };
  
  return actions[messageData.categoria] || actions['otro'];
}

/**
 * Agregar comentario con detalles adicionales
 */
async function addTicketComment(taskId, messageData) {
  const comment = {
    comment_text: `
📧 **Información de Contacto Adicional**

${messageData.tipo === 'identificado' ? `
- **Email de contacto:** ${messageData.email}
- **Responder preferiblemente por:** Email
${messageData.empresa ? `- **Contexto empresarial:** ${messageData.empresa}` : ''}
` : `
- **Mensaje anónimo** - Sin información de contacto
- **Para seguimiento:** Usar ticket ID \`${messageData.ticketId}\`
`}

---
*Comentario generado automáticamente por Buzón del Porqué*
    `,
    notify_all: false
  };
  
  try {
    await clickUpClient.post(`/task/${taskId}/comment`, comment);
  } catch (error) {
    console.warn('⚠️ No se pudo agregar comentario:', error);
  }
}

/**
 * Configurar campos personalizados
 */
async function setCustomFields(taskId, messageData, slaData) {
  // Esta función requiere configuración previa de campos personalizados en ClickUp
  const customFields = [
    {
      id: 'source_platform',
      value: 'buzon-del-porque'
    },
    {
      id: 'original_priority',
      value: messageData.prioridad
    },
    {
      id: 'sla_due_date',
      value: slaData.dueDate.toISOString()
    },
    {
      id: 'message_type',
      value: messageData.tipo
    }
  ];
  
  try {
    for (const field of customFields) {
      await clickUpClient.post(`/task/${taskId}/field/${field.id}`, {
        value: field.value
      });
    }
  } catch (error) {
    console.warn('⚠️ No se pudieron configurar campos personalizados:', error);
  }
}

/**
 * Asignación automática de tickets
 */
async function autoAssignTicket(taskId, departamento, prioridad) {
  const departmentUsers = CLICKUP_CONFIG.usersByDepartment[departamento];
  
  if (!departmentUsers || departmentUsers.length === 0) {
    console.log(`ℹ️ No hay usuarios configurados para ${departamento}`);
    return;
  }
  
  // Para prioridad urgente/alta, asignar a todos los usuarios del departamento
  let usersToAssign = [];
  
  if (prioridad === 'urgente') {
    usersToAssign = departmentUsers; // Todos
  } else if (prioridad === 'alta') {
    usersToAssign = departmentUsers.slice(0, Math.ceil(departmentUsers.length / 2)); // Mitad superior
  } else {
    // Para media/baja, usar round-robin o asignar al primer disponible
    usersToAssign = [departmentUsers[0]]; // Simplificado
  }
  
  try {
    for (const user of usersToAssign) {
      await clickUpClient.put(`/task/${taskId}/assignee/${user.id}`, {
        add: true
      });
    }
    
    console.log(`✅ Ticket asignado a ${usersToAssign.length} usuarios`);
  } catch (error) {
    console.warn('⚠️ Error en asignación automática:', error);
  }
}

/**
 * Obtener asignados de una tarea
 */
async function getTaskAssignees(taskId) {
  try {
    const task = await clickUpClient.get(`/task/${taskId}`);
    return task.assignees || [];
  } catch (error) {
    console.warn('⚠️ No se pudieron obtener asignados:', error);
    return [];
  }
}

/**
 * Actualizar estado de ticket
 */
export async function updateTicketStatus(clickUpTaskId, newStatus, comment = '') {
  try {
    // Actualizar estado
    await clickUpClient.put(`/task/${clickUpTaskId}`, {
      status: newStatus
    });
    
    // Agregar comentario si se proporciona
    if (comment) {
      await clickUpClient.post(`/task/${clickUpTaskId}/comment`, {
        comment_text: comment,
        notify_all: true
      });
    }
    
    return { success: true, newStatus };
  } catch (error) {
    console.error('❌ Error actualizando estado:', error);
    throw error;
  }
}

/**
 * Obtener estado actual del ticket
 */
export async function getTicketStatus(clickUpTaskId) {
  try {
    const task = await clickUpClient.get(`/task/${clickUpTaskId}`);
    return {
      status: task.status.status,
      assignees: task.assignees,
      priority: task.priority,
      dueDate: task.due_date,
      url: task.url,
      completed: task.status.type === 'closed'
    };
  } catch (error) {
    console.error('❌ Error obteniendo estado:', error);
    throw error;
  }
}

/**
 * Sincronizar tickets entre sistemas
 */
export async function syncTickets(ticketIds) {
  const results = [];
  
  for (const ticketId of ticketIds) {
    try {
      const status = await getTicketStatus(ticketId);
      results.push({
        ticketId,
        status: status.status,
        synced: true,
        lastSync: new Date().toISOString()
      });
    } catch (error) {
      results.push({
        ticketId,
        synced: false,
        error: error.message,
        lastSync: new Date().toISOString()
      });
    }
  }
  
  return results;
}

/**
 * Generar reporte de integración ClickUp
 */
export function generateClickUpReport(tickets) {
  const clickUpTickets = tickets.filter(t => t.clickUpTaskId);
  
  return {
    totalTickets: tickets.length,
    integratedTickets: clickUpTickets.length,
    integrationRate: Math.round((clickUpTickets.length / tickets.length) * 100) || 0,
    byDepartment: clickUpTickets.reduce((acc, ticket) => {
      const dept = ticket.departamento || 'sin_departamento';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {}),
    byStatus: {} // Se llenaría con datos de ClickUp
  };
}

export default {
  createClickUpTicket,
  updateTicketStatus,
  getTicketStatus,
  syncTickets,
  generateClickUpReport
};