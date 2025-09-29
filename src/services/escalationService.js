/**
 * Servicio de Escalamiento Automático
 * Maneja escalamiento progresivo de mensajes según urgencia y tiempo transcurrido
 */

import { checkSLAStatus } from './slaService.js';

/**
 * Configuración de escalamiento por departamento
 */
const ESCALATION_CHAINS = {
  'it': [
    { level: 1, role: 'it_support', email: 'soporte@ecomac.cl', notifyAfter: 2 },
    { level: 2, role: 'it_manager', email: 'it-manager@ecomac.cl', notifyAfter: 4 },
    { level: 3, role: 'cto', email: 'cto@ecomac.cl', notifyAfter: 8 }
  ],
  'rrhh': [
    { level: 1, role: 'hr_specialist', email: 'rrhh@ecomac.cl', notifyAfter: 4 },
    { level: 2, role: 'hr_manager', email: 'hr-manager@ecomac.cl', notifyAfter: 12 },
    { level: 3, role: 'hr_director', email: 'director-rrhh@ecomac.cl', notifyAfter: 24 }
  ],
  'ventas': [
    { level: 1, role: 'sales_rep', email: 'ventas@ecomac.cl', notifyAfter: 1 },
    { level: 2, role: 'sales_manager', email: 'ventas-manager@ecomac.cl', notifyAfter: 3 },
    { level: 3, role: 'sales_director', email: 'director-ventas@ecomac.cl', notifyAfter: 6 }
  ],
  'operaciones': [
    { level: 1, role: 'ops_analyst', email: 'operaciones@ecomac.cl', notifyAfter: 3 },
    { level: 2, role: 'ops_manager', email: 'ops-manager@ecomac.cl', notifyAfter: 8 },
    { level: 3, role: 'ops_director', email: 'director-ops@ecomac.cl', notifyAfter: 16 }
  ],
  'marketing': [
    { level: 1, role: 'marketing_specialist', email: 'marketing@ecomac.cl', notifyAfter: 6 },
    { level: 2, role: 'marketing_manager', email: 'marketing-manager@ecomac.cl', notifyAfter: 24 },
    { level: 3, role: 'marketing_director', email: 'director-marketing@ecomac.cl', notifyAfter: 48 }
  ],
  'finanzas': [
    { level: 1, role: 'finance_analyst', email: 'finanzas@ecomac.cl', notifyAfter: 8 },
    { level: 2, role: 'finance_manager', email: 'finanzas-manager@ecomac.cl', notifyAfter: 24 },
    { level: 3, role: 'cfo', email: 'cfo@ecomac.cl', notifyAfter: 48 }
  ],
  'administracion': [
    { level: 1, role: 'admin_assistant', email: 'administracion@ecomac.cl', notifyAfter: 4 },
    { level: 2, role: 'admin_manager', email: 'admin-manager@ecomac.cl', notifyAfter: 12 },
    { level: 3, role: 'general_manager', email: 'gerente-general@ecomac.cl', notifyAfter: 24 }
  ],
  'gerencia': [
    { level: 1, role: 'manager', email: 'gerencia@ecomac.cl', notifyAfter: 1 },
    { level: 2, role: 'general_manager', email: 'gerente-general@ecomac.cl', notifyAfter: 2 },
    { level: 3, role: 'ceo', email: 'ceo@ecomac.cl', notifyAfter: 4 }
  ]
};

/**
 * Configuración de escalamiento por prioridad
 */
const URGENCY_MULTIPLIERS = {
  'urgente': 0.25,  // Escalar 4x más rápido
  'alta': 0.5,      // Escalar 2x más rápido  
  'media': 1.0,     // Escalamiento estándar
  'baja': 2.0       // Escalar más lentamente
};

/**
 * Tipos de notificación por canal
 */
const NOTIFICATION_CHANNELS = {
  email: {
    enabled: true,
    priority: 1,
    template: 'escalation_email'
  },
  slack: {
    enabled: true,
    priority: 2,
    webhook: process.env.VITE_SLACK_WEBHOOK,
    channel: '#alerts'
  },
  sms: {
    enabled: false, // Solo para urgentes
    priority: 3,
    apiKey: process.env.VITE_SMS_API_KEY
  },
  whatsapp: {
    enabled: true,
    priority: 4,
    apiKey: process.env.VITE_WHATSAPP_API_KEY
  }
};

/**
 * Determinar si un ticket necesita escalamiento
 */
export function shouldEscalate(ticketData) {
  const slaStatus = checkSLAStatus(ticketData);
  const { categoria, departamento, prioridad, createdAt, currentLevel = 0 } = ticketData;
  
  // Obtener cadena de escalamiento
  const escalationChain = ESCALATION_CHAINS[departamento] || ESCALATION_CHAINS['administracion'];
  const nextLevel = escalationChain[currentLevel];
  
  if (!nextLevel) {
    return {
      shouldEscalate: false,
      reason: 'max_escalation_reached',
      currentLevel,
      maxLevel: escalationChain.length
    };
  }
  
  // Aplicar multiplicador de urgencia
  const urgencyMultiplier = URGENCY_MULTIPLIERS[prioridad] || 1.0;
  const adjustedThreshold = nextLevel.notifyAfter * urgencyMultiplier;
  
  const now = new Date();
  const created = new Date(createdAt);
  const elapsedHours = (now - created) / (1000 * 60 * 60);
  
  const shouldEscalate = elapsedHours >= adjustedThreshold || slaStatus.shouldEscalate;
  
  return {
    shouldEscalate,
    reason: shouldEscalate ? 'time_threshold_reached' : 'within_threshold',
    currentLevel,
    nextLevel,
    elapsedHours: Math.round(elapsedHours * 100) / 100,
    thresholdHours: adjustedThreshold,
    slaStatus,
    escalationChain: escalationChain.map((level, index) => ({
      ...level,
      isActive: index === currentLevel,
      isPending: index > currentLevel,
      isCompleted: index < currentLevel
    }))
  };
}

/**
 * Ejecutar escalamiento de un ticket
 */
export async function executeEscalation(ticketData, escalationAnalysis) {
  const { nextLevel, currentLevel, escalationChain } = escalationAnalysis;
  
  if (!nextLevel) {
    throw new Error('No hay nivel de escalamiento disponible');
  }
  
  const escalationData = {
    ticketId: ticketData.ticketId,
    previousLevel: currentLevel,
    newLevel: nextLevel.level,
    escalatedAt: new Date().toISOString(),
    escalatedTo: nextLevel,
    reason: escalationAnalysis.reason,
    ticketData: {
      ...ticketData,
      currentLevel: nextLevel.level,
      escalationHistory: [
        ...(ticketData.escalationHistory || []),
        {
          level: nextLevel.level,
          escalatedAt: new Date().toISOString(),
          escalatedTo: nextLevel.role,
          reason: escalationAnalysis.reason
        }
      ]
    }
  };
  
  // Enviar notificaciones por todos los canales habilitados
  const notifications = await sendEscalationNotifications(escalationData);
  
  return {
    ...escalationData,
    notifications,
    success: true
  };
}

/**
 * Enviar notificaciones de escalamiento
 */
async function sendEscalationNotifications(escalationData) {
  const { ticketData, newLevel, escalatedTo } = escalationData;
  const notifications = [];
  
  // Email (siempre habilitado)
  if (NOTIFICATION_CHANNELS.email.enabled) {
    try {
      const emailNotification = await sendEmailEscalation(ticketData, escalatedTo);
      notifications.push({
        channel: 'email',
        status: 'sent',
        recipient: escalatedTo.email,
        timestamp: new Date().toISOString(),
        messageId: emailNotification.messageId
      });
    } catch (error) {
      notifications.push({
        channel: 'email',
        status: 'failed',
        error: error.message,
        recipient: escalatedTo.email,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // Slack
  if (NOTIFICATION_CHANNELS.slack.enabled && ticketData.prioridad !== 'baja') {
    try {
      await sendSlackEscalation(ticketData, escalatedTo);
      notifications.push({
        channel: 'slack',
        status: 'sent',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      notifications.push({
        channel: 'slack',
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // SMS (solo para urgentes)
  if (NOTIFICATION_CHANNELS.sms.enabled && ticketData.prioridad === 'urgente') {
    try {
      await sendSMSEscalation(ticketData, escalatedTo);
      notifications.push({
        channel: 'sms',
        status: 'sent',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      notifications.push({
        channel: 'sms',
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  return notifications;
}

/**
 * Plantillas de mensajes de escalamiento
 */
const ESCALATION_TEMPLATES = {
  email: {
    subject: (ticket) => `🚨 ESCALAMIENTO: ${ticket.categoria.toUpperCase()} - Ticket ${ticket.ticketId}`,
    body: (ticket, escalatedTo) => `
      <h2>🚨 Escalamiento Automático de Ticket</h2>
      
      <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <strong>📋 Información del Ticket:</strong><br>
        <strong>ID:</strong> ${ticket.ticketId}<br>
        <strong>Categoría:</strong> ${ticket.categoria}<br>
        <strong>Prioridad:</strong> ${ticket.prioridad}<br>
        <strong>Departamento:</strong> ${ticket.departamento}<br>
        <strong>Creado:</strong> ${new Date(ticket.createdAt).toLocaleString('es-ES')}
      </div>
      
      <div style="background: #f8d7da; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <strong>⚠️ Motivo del Escalamiento:</strong><br>
        El ticket ha superado los umbrales de tiempo establecidos y requiere atención inmediata.
      </div>
      
      <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <strong>📧 Mensaje Original:</strong><br>
        "${ticket.mensaje}"
        ${ticket.nombre ? `<br><br><strong>De:</strong> ${ticket.nombre} (${ticket.email})` : '<br><br><strong>Mensaje anónimo</strong>'}
      </div>
      
      <div style="margin: 20px 0; text-align: center;">
        <a href="${process.env.VITE_DASHBOARD_URL}/tickets/${ticket.ticketId}" 
           style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
          Ver Ticket Completo
        </a>
      </div>
      
      <hr>
      <small style="color: #666;">
        Este mensaje fue generado automáticamente por el sistema de escalamiento de WHY - Buzón del Porqué
      </small>
    `
  },
  slack: {
    message: (ticket, escalatedTo) => ({
      channel: NOTIFICATION_CHANNELS.slack.channel,
      text: `🚨 ESCALAMIENTO AUTOMÁTICO`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🚨 Escalamiento Automático de Ticket"
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Ticket ID:*\n${ticket.ticketId}`
            },
            {
              type: "mrkdwn", 
              text: `*Prioridad:*\n${ticket.prioridad.toUpperCase()}`
            },
            {
              type: "mrkdwn",
              text: `*Categoría:*\n${ticket.categoria}`
            },
            {
              type: "mrkdwn",
              text: `*Escalado a:*\n${escalatedTo.role}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Mensaje:*\n"${ticket.mensaje}"`
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Ver Ticket"
              },
              url: `${process.env.VITE_DASHBOARD_URL}/tickets/${ticket.ticketId}`,
              style: "primary"
            },
            {
              type: "button",
              text: {
                type: "plain_text", 
                text: "Tomar Acción"
              },
              url: `${process.env.VITE_DASHBOARD_URL}/tickets/${ticket.ticketId}/action`,
              style: "danger"
            }
          ]
        }
      ]
    })
  }
};

/**
 * Enviar escalamiento por email
 */
async function sendEmailEscalation(ticketData, escalatedTo) {
  // Esta función se integraría con tu servicio de email (SendGrid, AWS SES, etc.)
  const emailData = {
    to: escalatedTo.email,
    subject: ESCALATION_TEMPLATES.email.subject(ticketData),
    html: ESCALATION_TEMPLATES.email.body(ticketData, escalatedTo),
    priority: 'high',
    category: 'escalation'
  };
  
  // Simular envío (reemplazar con tu servicio real)
  console.log('📧 Enviando escalamiento por email:', emailData);
  return { messageId: `msg_${Date.now()}` };
}

/**
 * Enviar escalamiento por Slack
 */
async function sendSlackEscalation(ticketData, escalatedTo) {
  if (!NOTIFICATION_CHANNELS.slack.webhook) {
    throw new Error('Webhook de Slack no configurado');
  }
  
  const slackMessage = ESCALATION_TEMPLATES.slack.message(ticketData, escalatedTo);
  
  // Simular envío a Slack (reemplazar con llamada real)
  console.log('💬 Enviando escalamiento a Slack:', slackMessage);
  return { success: true };
}

/**
 * Enviar escalamiento por SMS
 */
async function sendSMSEscalation(ticketData, escalatedTo) {
  const smsMessage = `🚨 ESCALAMIENTO URGENTE: Ticket ${ticketData.ticketId} (${ticketData.categoria}) requiere atención inmediata. Ver: ${process.env.VITE_DASHBOARD_URL}/tickets/${ticketData.ticketId}`;
  
  // Simular envío SMS (reemplazar con tu servicio real)
  console.log('📱 Enviando escalamiento por SMS:', smsMessage);
  return { success: true };
}

/**
 * Obtener configuración de escalamiento para dashboard
 */
export function getEscalationConfiguration() {
  return {
    chains: ESCALATION_CHAINS,
    urgencyMultipliers: URGENCY_MULTIPLIERS,
    notificationChannels: NOTIFICATION_CHANNELS,
    templates: Object.keys(ESCALATION_TEMPLATES)
  };
}

/**
 * Generar reporte de escalamientos
 */
export function generateEscalationReport(tickets) {
  const escalatedTickets = tickets.filter(ticket => ticket.escalationHistory?.length > 0);
  
  const report = {
    totalEscalations: escalatedTickets.reduce((sum, ticket) => sum + (ticket.escalationHistory?.length || 0), 0),
    ticketsEscalated: escalatedTickets.length,
    escalationRate: Math.round((escalatedTickets.length / tickets.length) * 100) || 0,
    byDepartment: {},
    byPriority: {},
    averageEscalationTime: 0,
    topEscalationReasons: {}
  };
  
  escalatedTickets.forEach(ticket => {
    // Por departamento
    if (!report.byDepartment[ticket.departamento]) {
      report.byDepartment[ticket.departamento] = 0;
    }
    report.byDepartment[ticket.departamento]++;
    
    // Por prioridad  
    if (!report.byPriority[ticket.prioridad]) {
      report.byPriority[ticket.prioridad] = 0;
    }
    report.byPriority[ticket.prioridad]++;
    
    // Razones de escalamiento
    ticket.escalationHistory?.forEach(escalation => {
      if (!report.topEscalationReasons[escalation.reason]) {
        report.topEscalationReasons[escalation.reason] = 0;
      }
      report.topEscalationReasons[escalation.reason]++;
    });
  });
  
  return report;
}

export default {
  shouldEscalate,
  executeEscalation,
  getEscalationConfiguration,
  generateEscalationReport
};