/**
 * Servicio de SLA (Service Level Agreements) 
 * Maneja tiempos de respuesta dinámicos según contexto del mensaje
 */

/**
 * Configuración de SLAs por categoría (en horas)
 */
const SLA_BY_CATEGORY = {
  'bug': { 
    critical: 2, 
    high: 4, 
    medium: 12, 
    low: 24,
    description: 'Errores técnicos requieren resolución inmediata'
  },
  'queja': { 
    critical: 4, 
    high: 8, 
    medium: 24, 
    low: 48,
    description: 'Quejas deben ser atendidas con prioridad'
  },
  'pregunta': { 
    critical: 8, 
    high: 12, 
    medium: 24, 
    low: 72,
    description: 'Preguntas generales con tiempo estándar'
  },
  'sugerencia': { 
    critical: 12, 
    high: 24, 
    medium: 72, 
    low: 120,
    description: 'Sugerencias para evaluación y feedback'
  },
  'felicitacion': { 
    critical: 24, 
    high: 48, 
    medium: 72, 
    low: 120,
    description: 'Felicitaciones para agradecimiento formal'
  },
  'otro': { 
    critical: 12, 
    high: 24, 
    medium: 48, 
    low: 96,
    description: 'Otros casos evaluados individualmente'
  }
};

/**
 * Modificadores de SLA por departamento
 */
const DEPARTMENT_MODIFIERS = {
  'it': 0.8,        // IT más rápido en respuestas técnicas
  'rrhh': 1.2,      // RRHH necesita más tiempo para procesos
  'ventas': 0.9,    // Ventas responde rápido por revenue
  'operaciones': 1.0, // Estándar
  'marketing': 1.3,   // Marketing evalúa más profundamente
  'finanzas': 1.5,    // Finanzas requiere más análisis
  'administracion': 1.1, // Administración proceso estándar
  'gerencia': 0.7     // Gerencia prioridad máxima
};

/**
 * Mapeo de prioridad a nivel de criticidad
 */
const PRIORITY_MAPPING = {
  'urgente': 'critical',
  'alta': 'high', 
  'media': 'medium',
  'baja': 'low'
};

/**
 * Horarios laborales para cálculo de SLA
 */
const BUSINESS_HOURS = {
  start: 9,   // 9 AM
  end: 18,    // 6 PM
  timezone: 'America/Santiago',
  workDays: [1, 2, 3, 4, 5] // Lunes a Viernes
};

/**
 * Calcular SLA para un mensaje específico
 */
export function calculateSLA(messageData) {
  const { categoria, departamento, prioridad } = messageData;
  
  // Obtener SLA base según categoría y prioridad
  const categoryConfig = SLA_BY_CATEGORY[categoria] || SLA_BY_CATEGORY['otro'];
  const priorityLevel = PRIORITY_MAPPING[prioridad] || 'medium';
  const baseSLA = categoryConfig[priorityLevel];
  
  // Aplicar modificador de departamento
  const departmentModifier = DEPARTMENT_MODIFIERS[departamento] || 1.0;
  const adjustedSLA = Math.ceil(baseSLA * departmentModifier);
  
  // Calcular tiempo de vencimiento considerando horarios laborales
  const dueDate = calculateBusinessHours(adjustedSLA);
  
  return {
    slaHours: adjustedSLA,
    dueDate: dueDate,
    priority: priorityLevel,
    category: categoria,
    department: departamento,
    businessReason: categoryConfig.description,
    escalationThreshold: Math.floor(adjustedSLA * 0.8), // Escalar al 80% del SLA
    metadata: {
      baseSLA,
      departmentModifier,
      calculatedAt: new Date().toISOString()
    }
  };
}

/**
 * Calcular fecha de vencimiento considerando horarios laborales
 */
function calculateBusinessHours(hours) {
  const now = new Date();
  let workingHours = 0;
  let currentDate = new Date(now);
  
  while (workingHours < hours) {
    const dayOfWeek = currentDate.getDay();
    const currentHour = currentDate.getHours();
    
    // Solo contar horas laborales
    if (BUSINESS_HOURS.workDays.includes(dayOfWeek)) {
      if (currentHour >= BUSINESS_HOURS.start && currentHour < BUSINESS_HOURS.end) {
        workingHours++;
      }
    }
    
    currentDate.setHours(currentDate.getHours() + 1);
  }
  
  return currentDate;
}

/**
 * Verificar si un mensaje está cerca del vencimiento del SLA
 */
export function checkSLAStatus(ticketData) {
  const { createdAt, slaHours } = ticketData;
  const now = new Date();
  const created = new Date(createdAt);
  const elapsedHours = (now - created) / (1000 * 60 * 60);
  
  const percentageUsed = (elapsedHours / slaHours) * 100;
  
  let status = 'on_track';
  let urgencyLevel = 'normal';
  
  if (percentageUsed >= 100) {
    status = 'overdue';
    urgencyLevel = 'critical';
  } else if (percentageUsed >= 80) {
    status = 'at_risk';
    urgencyLevel = 'high';
  } else if (percentageUsed >= 60) {
    status = 'warning';
    urgencyLevel = 'medium';
  }
  
  return {
    status,
    urgencyLevel,
    percentageUsed: Math.round(percentageUsed),
    remainingHours: Math.max(0, slaHours - elapsedHours),
    shouldEscalate: percentageUsed >= 80,
    nextEscalation: calculateNextEscalation(elapsedHours, slaHours)
  };
}

/**
 * Calcular cuándo debe ocurrir la próxima escalación
 */
function calculateNextEscalation(elapsedHours, slaHours) {
  const escalationPoints = [0.5, 0.75, 0.9, 1.0]; // 50%, 75%, 90%, 100%
  
  for (const point of escalationPoints) {
    const escalationTime = slaHours * point;
    if (elapsedHours < escalationTime) {
      return {
        timeToEscalation: escalationTime - elapsedHours,
        escalationPercentage: point * 100
      };
    }
  }
  
  return null; // Ya se pasó todos los puntos de escalación
}

/**
 * Obtener configuración de SLA para mostrar en frontend
 */
export function getSLAConfiguration() {
  return {
    categories: Object.keys(SLA_BY_CATEGORY).map(key => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      description: SLA_BY_CATEGORY[key].description,
      slaRanges: SLA_BY_CATEGORY[key]
    })),
    departments: Object.keys(DEPARTMENT_MODIFIERS).map(key => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      modifier: DEPARTMENT_MODIFIERS[key],
      impact: DEPARTMENT_MODIFIERS[key] < 1 ? 'faster' : 'slower'
    })),
    businessHours: BUSINESS_HOURS
  };
}

/**
 * Generar reporte de SLA para dashboard
 */
export function generateSLAReport(tickets) {
  const report = {
    totalTickets: tickets.length,
    onTrack: 0,
    atRisk: 0, 
    overdue: 0,
    averageResponseTime: 0,
    slaCompliance: 0,
    byCategory: {},
    byDepartment: {},
    trends: []
  };
  
  tickets.forEach(ticket => {
    const status = checkSLAStatus(ticket);
    
    // Contar por status
    if (status.status === 'on_track') report.onTrack++;
    else if (status.status === 'at_risk' || status.status === 'warning') report.atRisk++;
    else if (status.status === 'overdue') report.overdue++;
    
    // Agrupar por categoría
    if (!report.byCategory[ticket.categoria]) {
      report.byCategory[ticket.categoria] = { total: 0, onTime: 0 };
    }
    report.byCategory[ticket.categoria].total++;
    if (status.status !== 'overdue') {
      report.byCategory[ticket.categoria].onTime++;
    }
    
    // Agrupar por departamento
    if (ticket.departamento && !report.byDepartment[ticket.departamento]) {
      report.byDepartment[ticket.departamento] = { total: 0, onTime: 0 };
    }
    if (ticket.departamento) {
      report.byDepartment[ticket.departamento].total++;
      if (status.status !== 'overdue') {
        report.byDepartment[ticket.departamento].onTime++;
      }
    }
  });
  
  // Calcular compliance general
  report.slaCompliance = Math.round(((report.onTrack + report.atRisk) / report.totalTickets) * 100) || 0;
  
  return report;
}

export default {
  calculateSLA,
  checkSLAStatus,
  getSLAConfiguration,
  generateSLAReport
};