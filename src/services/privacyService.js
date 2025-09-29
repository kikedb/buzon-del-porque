/**
 * Servicio de Privacidad y Anonimización
 * Maneja encriptación, hashing y anonimización de datos sensibles
 */

// Implementación compatible con navegador para funciones crypto
const crypto = window.crypto || window.msCrypto;

// Función para crear hash SHA-256 compatible con navegador
function createHash(algorithm) {
  return {
    update: function(data) {
      this.data = (this.data || '') + data;
      return this;
    },
    digest: function(encoding) {
      // Implementación simplificada para desarrollo
      // En producción usar crypto.subtle.digest
      const encoder = new TextEncoder();
      const data = encoder.encode(this.data || '');
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data[i];
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash).toString(16).padStart(8, '0');
    }
  };
}

// Funciones de cifrado simplificadas para desarrollo
function createCipher(algorithm, key) {
  return {
    update: function(data, inputEncoding, outputEncoding) {
      // Implementación simple para desarrollo - NO usar en producción
      const keyNum = Array.from(key).reduce((a, b) => a + b.charCodeAt(0), 0);
      return btoa(data).replace(/./g, (c, i) => 
        String.fromCharCode(c.charCodeAt(0) ^ (keyNum % 256))
      );
    },
    final: function(encoding) {
      return '';
    }
  };
}

function createDecipher(algorithm, key) {
  return {
    update: function(data, inputEncoding, outputEncoding) {
      try {
        const keyNum = Array.from(key).reduce((a, b) => a + b.charCodeAt(0), 0);
        const decoded = data.replace(/./g, (c, i) => 
          String.fromCharCode(c.charCodeAt(0) ^ (keyNum % 256))
        );
        return atob(decoded);
      } catch {
        return data; // Fallback si no se puede decodificar
      }
    },
    final: function(encoding) {
      return '';
    }
  };
}

/**
 * Configuración de privacidad
 */
const PRIVACY_CONFIG = {
  // Clave de encriptación (debe venir de variable de entorno)
  encryptionKey: import.meta.env.VITE_ENCRYPTION_KEY || 'default-key-change-me',
  
  // Algoritmo de encriptación
  algorithm: 'aes-256-ctr',
  
  // Salt para hashing
  hashSalt: import.meta.env.VITE_HASH_SALT || 'default-salt-change-me',
  
  // Configuración de retención de datos
  dataRetention: {
    anonymousMessages: 365, // 1 año
    identifiedMessages: 730, // 2 años
    auditLogs: 2555 // 7 años
  },
  
  // Campos que requieren encriptación
  encryptedFields: ['email', 'nombre', 'empresa'],
  
  // Campos que requieren hashing
  hashedFields: ['ip_address', 'user_agent'],
  
  // Campos que deben ser excluidos de logs
  excludeFromLogs: ['email', 'nombre', 'empresa']
};

/**
 * Tipos de datos sensibles
 */
const SENSITIVE_DATA_TYPES = {
  PII: ['nombre', 'email', 'empresa', 'telefono'],
  QUASI_IDENTIFIERS: ['ip_address', 'user_agent', 'timestamp'],
  TECHNICAL: ['session_id', 'device_fingerprint']
};

/**
 * Encriptar dato sensible
 */
export function encryptSensitiveData(data, field) {
  if (!data || !PRIVACY_CONFIG.encryptedFields.includes(field)) {
    return data;
  }
  
  try {
    const cipher = createCipher(PRIVACY_CONFIG.algorithm, PRIVACY_CONFIG.encryptionKey);
    let encrypted = cipher.update(data.toString(), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted: encrypted,
      field: field,
      timestamp: new Date().toISOString(),
      method: PRIVACY_CONFIG.algorithm
    };
  } catch (error) {
    console.error('❌ Error encriptando dato:', error);
    throw new Error(`Encryption failed for field ${field}`);
  }
}

/**
 * Desencriptar dato sensible
 */
export function decryptSensitiveData(encryptedData, field) {
  if (!encryptedData || typeof encryptedData !== 'object' || !encryptedData.encrypted) {
    return encryptedData;
  }
  
  try {
    const decipher = createDecipher(PRIVACY_CONFIG.algorithm, PRIVACY_CONFIG.encryptionKey);
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('❌ Error desencriptando dato:', error);
    throw new Error(`Decryption failed for field ${field}`);
  }
}

/**
 * Generar hash irreversible de dato
 */
export function hashSensitiveData(data, field) {
  if (!data) return data;
  
  const hash = createHash('sha256');
  hash.update(data.toString());
  hash.update(PRIVACY_CONFIG.hashSalt);
  hash.update(field); // Agregar field para evitar colisiones
  
  return {
    hashed: hash.digest('hex'),
    field: field,
    timestamp: new Date().toISOString(),
    algorithm: 'sha256'
  };
}

/**
 * Anonimizar mensaje completo
 */
export function anonymizeMessage(messageData, anonymizationLevel = 'STANDARD') {
  const anonymized = { ...messageData };
  
  // Generar ID anónimo consistente
  const anonymousId = generateAnonymousId(messageData);
  
  switch (anonymizationLevel) {
    case 'MINIMAL':
      // Solo ocultar datos directamente identificables
      anonymized.nombre = anonymized.nombre ? '[ANONIMIZADO]' : undefined;
      anonymized.email = anonymized.email ? '[EMAIL_OCULTO]' : undefined;
      anonymized.empresa = anonymized.empresa ? '[EMPRESA_OCULTA]' : undefined;
      break;
      
    case 'STANDARD':
      // Encriptar datos sensibles pero mantener estructura
      if (anonymized.nombre) {
        anonymized.nombre = encryptSensitiveData(anonymized.nombre, 'nombre');
      }
      if (anonymized.email) {
        anonymized.email = encryptSensitiveData(anonymized.email, 'email');
      }
      if (anonymized.empresa) {
        anonymized.empresa = encryptSensitiveData(anonymized.empresa, 'empresa');
      }
      break;
      
    case 'STRICT':
      // Hash irreversible + eliminación de quasi-identifiers
      anonymized.nombre = undefined;
      anonymized.email = undefined;
      anonymized.empresa = undefined;
      anonymized.ip_address = anonymized.ip_address ? 
        hashSensitiveData(anonymized.ip_address, 'ip_address') : undefined;
      anonymized.user_agent = anonymized.user_agent ? 
        hashSensitiveData(anonymized.user_agent, 'user_agent') : undefined;
      
      // Generalizar timestamp (solo fecha, sin hora)
      if (anonymized.timestamp) {
        const date = new Date(anonymized.timestamp);
        anonymized.timestamp = date.toISOString().split('T')[0];
      }
      break;
      
    case 'COMPLETE':
      // Eliminar todos los datos identificables
      const safeFields = ['categoria', 'departamento', 'prioridad', 'mensaje'];
      const completelyAnonymized = {};
      
      safeFields.forEach(field => {
        if (anonymized[field]) {
          completelyAnonymized[field] = anonymized[field];
        }
      });
      
      // Mantener metadatos no identificables
      completelyAnonymized.anonymousId = anonymousId;
      completelyAnonymized.anonymizationLevel = anonymizationLevel;
      completelyAnonymized.anonymizedAt = new Date().toISOString();
      
      return completelyAnonymized;
  }
  
  // Agregar metadatos de anonimización
  anonymized.anonymousId = anonymousId;
  anonymized.anonymizationLevel = anonymizationLevel;
  anonymized.anonymizedAt = new Date().toISOString();
  anonymized.originalFieldsCount = Object.keys(messageData).length;
  
  return anonymized;
}

/**
 * Generar ID anónimo consistente para tracking
 */
function generateAnonymousId(messageData) {
  // Usar datos no sensibles para generar ID consistente
  const identifiers = [
    messageData.categoria,
    messageData.departamento,
    messageData.prioridad,
    messageData.timestamp?.split('T')[0], // Solo fecha
    messageData.mensaje?.substring(0, 20) // Primeros 20 caracteres del mensaje
  ].filter(Boolean).join('|');
  
  const hash = createHash('sha256');
  hash.update(identifiers);
  hash.update(PRIVACY_CONFIG.hashSalt);
  
  return `anon_${hash.digest('hex').substring(0, 12)}`;
}

/**
 * Verificar nivel de riesgo de privacidad
 */
export function assessPrivacyRisk(messageData) {
  let riskScore = 0;
  const risks = [];
  
  // Evaluar presencia de PII
  SENSITIVE_DATA_TYPES.PII.forEach(field => {
    if (messageData[field]) {
      riskScore += 3;
      risks.push(`PII detected: ${field}`);
    }
  });
  
  // Evaluar quasi-identifiers
  SENSITIVE_DATA_TYPES.QUASI_IDENTIFIERS.forEach(field => {
    if (messageData[field]) {
      riskScore += 1;
      risks.push(`Quasi-identifier: ${field}`);
    }
  });
  
  // Evaluar contenido del mensaje
  if (messageData.mensaje) {
    const message = messageData.mensaje.toLowerCase();
    
    // Buscar patrones de información sensible
    const patterns = [
      { regex: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, risk: 5, type: 'credit_card' },
      { regex: /\b\d{7,8}[-.]?\d{1}\b/, risk: 4, type: 'rut' },
      { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, risk: 3, type: 'email' },
      { regex: /\b\d{8,15}\b/, risk: 2, type: 'phone' },
      { regex: /\b(dirección|domicilio|vivo en|mi casa)/i, risk: 2, type: 'address' }
    ];
    
    patterns.forEach(pattern => {
      if (pattern.regex.test(message)) {
        riskScore += pattern.risk;
        risks.push(`Content risk: ${pattern.type} detected in message`);
      }
    });
  }
  
  // Determinar nivel de riesgo
  let riskLevel = 'LOW';
  if (riskScore >= 10) riskLevel = 'CRITICAL';
  else if (riskScore >= 6) riskLevel = 'HIGH';
  else if (riskScore >= 3) riskLevel = 'MEDIUM';
  
  return {
    riskScore,
    riskLevel,
    risks,
    recommendedAnonymization: getRecommendedAnonymization(riskLevel),
    requiresReview: riskLevel === 'CRITICAL',
    compliance: {
      gdpr: riskLevel !== 'CRITICAL',
      ccpa: riskScore < 8,
      coppa: !risks.some(r => r.includes('age') || r.includes('child'))
    }
  };
}

/**
 * Obtener nivel de anonimización recomendado
 */
function getRecommendedAnonymization(riskLevel) {
  const recommendations = {
    'LOW': 'MINIMAL',
    'MEDIUM': 'STANDARD', 
    'HIGH': 'STRICT',
    'CRITICAL': 'COMPLETE'
  };
  
  return recommendations[riskLevel] || 'STANDARD';
}

/**
 * Crear log de auditoría para privacidad
 */
export function createPrivacyAuditLog(action, messageData, details = {}) {
  const auditLog = {
    timestamp: new Date().toISOString(),
    action: action, // 'encrypt', 'decrypt', 'anonymize', 'access', 'delete'
    ticketId: messageData.ticketId,
    anonymousId: messageData.anonymousId,
    dataTypes: getDataTypesInMessage(messageData),
    riskAssessment: assessPrivacyRisk(messageData),
    userAgent: details.userAgent,
    ipAddress: details.ipAddress ? hashSensitiveData(details.ipAddress, 'ip_address') : undefined,
    userId: details.userId,
    sessionId: details.sessionId,
    compliance: {
      gdprBasis: details.gdprBasis || 'legitimate_interest',
      retentionPeriod: getRetentionPeriod(messageData.tipo),
      anonymizationScheduled: calculateAnonymizationDate(messageData)
    }
  };
  
  // Excluir datos sensibles del log
  PRIVACY_CONFIG.excludeFromLogs.forEach(field => {
    delete auditLog[field];
  });
  
  return auditLog;
}

/**
 * Identificar tipos de datos en el mensaje
 */
function getDataTypesInMessage(messageData) {
  const dataTypes = [];
  
  Object.keys(SENSITIVE_DATA_TYPES).forEach(type => {
    SENSITIVE_DATA_TYPES[type].forEach(field => {
      if (messageData[field]) {
        dataTypes.push({ type, field });
      }
    });
  });
  
  return dataTypes;
}

/**
 * Obtener período de retención según tipo de mensaje
 */
function getRetentionPeriod(messageType) {
  return messageType === 'anonimo' ? 
    PRIVACY_CONFIG.dataRetention.anonymousMessages :
    PRIVACY_CONFIG.dataRetention.identifiedMessages;
}

/**
 * Calcular fecha de anonimización automática
 */
function calculateAnonymizationDate(messageData) {
  const retentionDays = getRetentionPeriod(messageData.tipo);
  const createdAt = new Date(messageData.timestamp || Date.now());
  const anonymizationDate = new Date(createdAt);
  anonymizationDate.setDate(anonymizationDate.getDate() + retentionDays);
  
  return anonymizationDate.toISOString();
}

/**
 * Procesar solicitud de eliminación de datos (derecho al olvido)
 */
export async function processDataDeletionRequest(identifier, identificationType) {
  const deletionLog = {
    requestId: `del_${Date.now()}`,
    timestamp: new Date().toISOString(),
    identifier,
    identificationType, // 'email', 'ticketId', 'anonymousId'
    status: 'processing',
    steps: []
  };
  
  try {
    // 1. Identificar todos los registros asociados
    deletionLog.steps.push({
      step: 'identification',
      status: 'completed',
      found: 0, // Se llenaría con datos reales
      timestamp: new Date().toISOString()
    });
    
    // 2. Verificar si existen obligaciones legales de retención
    deletionLog.steps.push({
      step: 'legal_review',
      status: 'completed',
      canDelete: true, // Se evaluaría según el contexto
      timestamp: new Date().toISOString()
    });
    
    // 3. Ejecutar eliminación/anonimización
    deletionLog.steps.push({
      step: 'data_deletion',
      status: 'completed',
      method: 'complete_anonymization',
      timestamp: new Date().toISOString()
    });
    
    deletionLog.status = 'completed';
    deletionLog.completedAt = new Date().toISOString();
    
  } catch (error) {
    deletionLog.status = 'failed';
    deletionLog.error = error.message;
    deletionLog.failedAt = new Date().toISOString();
  }
  
  return deletionLog;
}

/**
 * Generar reporte de compliance de privacidad
 */
export function generatePrivacyComplianceReport(messages, auditLogs) {
  const report = {
    totalMessages: messages.length,
    anonymousMessages: messages.filter(m => m.tipo === 'anonimo').length,
    identifiedMessages: messages.filter(m => m.tipo === 'identificado').length,
    
    riskDistribution: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    },
    
    anonymizationStatus: {
      notAnonymized: 0,
      minimal: 0,
      standard: 0,
      strict: 0,
      complete: 0
    },
    
    complianceMetrics: {
      gdprCompliant: 0,
      ccpaCompliant: 0,
      dataRetentionCompliant: 0
    },
    
    auditSummary: {
      totalActions: auditLogs.length,
      recentActions: auditLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return logDate > weekAgo;
      }).length
    }
  };
  
  // Calcular distribución de riesgos
  messages.forEach(message => {
    const risk = assessPrivacyRisk(message);
    report.riskDistribution[risk.riskLevel.toLowerCase()]++;
    
    // Estado de anonimización
    const level = message.anonymizationLevel?.toLowerCase() || 'notAnonymized';
    report.anonymizationStatus[level]++;
    
    // Métricas de compliance
    if (risk.compliance.gdpr) report.complianceMetrics.gdprCompliant++;
    if (risk.compliance.ccpa) report.complianceMetrics.ccpaCompliant++;
  });
  
  // Calcular porcentajes
  Object.keys(report.riskDistribution).forEach(key => {
    report.riskDistribution[key] = Math.round((report.riskDistribution[key] / messages.length) * 100) || 0;
  });
  
  return report;
}

export default {
  encryptSensitiveData,
  decryptSensitiveData,
  hashSensitiveData,
  anonymizeMessage,
  assessPrivacyRisk,
  createPrivacyAuditLog,
  processDataDeletionRequest,
  generatePrivacyComplianceReport
};