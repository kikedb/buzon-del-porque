# 🚀 Plataforma WHY - El Buzón del Porqué (Versión Enterprise)

**Plataforma WHY** es una aplicación web empresarial desarrollada con Vue.js 3 que permite a los usuarios enviar mensajes y preguntas de manera anónima o identificada. La aplicación cuenta con un ecosistema completo de funcionalidades empresariales incluyendo SLAs dinámicos, escalamiento automático, integración con ClickUp y sistemas avanzados de privacidad.

## 🏆 **Nuevas Funcionalidades Empresariales**

### 🎯 **Sistema de SLAs Dinámicos**
- **SLAs adaptativos** según categoría, departamento y prioridad
- **Cálculo de tiempo de respuesta** considerando horarios laborales
- **Escalamiento automático** cuando se superan umbrales
- **Indicadores visuales** en tiempo real

### 🚨 **Escalamiento Automático Inteligente**
- **Cadenas de escalamiento** personalizadas por departamento
- **Notificaciones multi-canal** (Email, Slack, SMS, WhatsApp)
- **Multiplicadores de urgencia** para diferentes prioridades
- **Templates personalizables** para cada tipo de notificación

### 🎫 **Integración Completa con ClickUp**
- **Creación automática de tickets** con metadatos completos
- **Asignación inteligente** por departamento y prioridad
- **Sincronización bidireccional** de estados
- **Campos personalizados** para tracking avanzado

### 🔐 **Sistema Avanzado de Privacidad**
- **Evaluación automática de riesgo** de datos sensibles
- **Anonimización multinivel** (Minimal, Standard, Strict, Complete)
- **Encriptación de PII** con algoritmos seguros
- **Logs de auditoría** para compliance (GDPR, CCPA)
- **Derecho al olvido** automatizado

## 🛠️ **Stack Tecnológico Completo**

### Frontend
- **Framework:** Vue.js 3 con Composition API
- **Build Tool:** Vite 7.0.0
- **Estilos:** CSS3 con variables CSS y Scoped Styles
- **Validación:** JavaScript nativo con regex avanzado

### Backend & Integraciones
- **Workflow Engine:** n8n (webhook integration)
- **Ticket Management:** ClickUp API v2
- **Privacy Engine:** Crypto nativo de Node.js
- **SLA Engine:** Lógica de negocio personalizada
- **Escalation Engine:** Multi-channel notifications

### Seguridad & Compliance
- **Encriptación:** AES-256-CTR
- **Hashing:** SHA-256 with salt
- **Privacy Standards:** GDPR, CCPA, COPPA ready
- **Audit Trails:** Comprehensive logging

## 🎯 **Configuración Empresarial**

### 1. **Configuración de SLAs**

Los SLAs se calculan dinámicamente basándose en:

```javascript
// Ejemplo de configuración de SLA
const SLA_CONFIG = {
  'bug': { 
    critical: 2,    // 2 horas para bugs críticos
    high: 4,        // 4 horas para bugs altos
    medium: 12,     // 12 horas para bugs medios
    low: 24         // 24 horas para bugs bajos
  },
  'queja': { 
    critical: 4, 
    high: 8, 
    medium: 24, 
    low: 48 
  }
  // ... más configuraciones
};
```

### 2. **Configuración de Escalamiento**

```javascript
// Cadenas de escalamiento por departamento
const ESCALATION_CHAINS = {
  'it': [
    { level: 1, role: 'it_support', email: 'soporte@ecomac.cl', notifyAfter: 2 },
    { level: 2, role: 'it_manager', email: 'it-manager@ecomac.cl', notifyAfter: 4 },
    { level: 3, role: 'cto', email: 'cto@ecomac.cl', notifyAfter: 8 }
  ]
  // ... más cadenas
};
```

### 3. **Configuración de ClickUp**

```bash
# Variables de entorno para ClickUp
VITE_CLICKUP_API_KEY=pk_your_api_key_here
VITE_CLICKUP_TEAM_ID=your_team_id
VITE_CLICKUP_LIST_IT=901200123456    # Lista de IT
VITE_CLICKUP_LIST_HR=901200123457    # Lista de RRHH
# ... más listas por departamento
```

### 4. **Configuración de Privacidad**

```bash
# Claves de encriptación (usar claves seguras en producción)
VITE_ENCRYPTION_KEY=your-256-bit-encryption-key-here
VITE_HASH_SALT=your-unique-hash-salt-here
```

## 📋 **Instalación y Configuración**

### Instalación Básica
```bash
# Clonar el proyecto
git clone [URL_DEL_REPOSITORIO]
cd buzon-del-porque

# Instalar dependencias
npm install

# Copiar y configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones específicas
```

### Configuración de ClickUp
1. Obtén tu API key desde: https://app.clickup.com/settings/apps
2. Encuentra tus IDs de equipo, espacio y listas
3. Configura las variables en tu archivo `.env`
4. Crea campos personalizados en ClickUp si es necesario

### Configuración de n8n
1. Asegúrate de que tu webhook de n8n esté funcionando
2. Configura el workflow para recibir los nuevos metadatos de SLA y privacidad
3. Opcional: Configura integraciones adicionales en n8n (email, Slack, etc.)

## 🚦 **Ejecución**

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm run build
npm run preview
```

## 📊 **Estructura de Datos Mejorada**

### Mensaje con Metadatos Completos
```json
{
  "tipo": "identificado",
  "nombre": "Juan Pérez",
  "email": "juan@ecomac.cl",
  "empresa": "Mi Empresa S.A.",
  "mensaje": "Contenido del mensaje",
  "categoria": "bug",
  "departamento": "it",
  "prioridad": "alta",
  "ticketId": "WHY-20240115-ABC123",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "source": "plataforma-why",
  
  // Nuevos metadatos de SLA
  "sla": {
    "hours": 4,
    "dueDate": "2024-01-15T14:30:00.000Z",
    "escalationThreshold": 3,
    "priority": "high"
  },
  
  // Metadatos de privacidad
  "privacy": {
    "riskLevel": "MEDIUM",
    "anonymized": "STANDARD",
    "requiresReview": false
  }
}
```

## 🔧 **APIs y Servicios**

### SLA Service
```javascript
import slaService from '@/services/slaService';

// Calcular SLA para un mensaje
const slaData = slaService.calculateSLA(messageData);

// Verificar estado de SLA
const status = slaService.checkSLAStatus(ticketData);

// Generar reporte de SLAs
const report = slaService.generateSLAReport(tickets);
```

### Escalation Service
```javascript
import escalationService from '@/services/escalationService';

// Verificar si debe escalar
const shouldEscalate = escalationService.shouldEscalate(ticketData);

// Ejecutar escalamiento
const result = await escalationService.executeEscalation(ticketData, analysis);
```

### ClickUp Service
```javascript
import clickupService from '@/services/clickupService';

// Crear ticket en ClickUp
const clickUpResult = await clickupService.createClickUpTicket(messageData);

// Actualizar estado
await clickupService.updateTicketStatus(taskId, 'in-progress', 'Working on it');

// Sincronizar tickets
const syncResults = await clickupService.syncTickets(ticketIds);
```

### Privacy Service
```javascript
import privacyService from '@/services/privacyService';

// Evaluar riesgo de privacidad
const risk = privacyService.assessPrivacyRisk(messageData);

// Anonimizar mensaje
const anonymized = privacyService.anonymizeMessage(messageData, 'STANDARD');

// Crear log de auditoría
const auditLog = privacyService.createPrivacyAuditLog('access', messageData);
```

## 📈 **Métricas y KPIs**

La aplicación ahora proporciona métricas completas:

### SLA Metrics
- **SLA Compliance Rate**: Porcentaje de tickets resueltos dentro del SLA
- **Average Response Time**: Tiempo promedio de primera respuesta
- **Escalation Rate**: Porcentaje de tickets que requieren escalamiento

### Privacy Metrics
- **Risk Distribution**: Distribución de niveles de riesgo de privacidad
- **Anonymization Rate**: Porcentaje de mensajes anonimizados automáticamente
- **GDPR Compliance**: Estado de cumplimiento con regulaciones

### ClickUp Integration Metrics
- **Integration Success Rate**: Porcentaje de tickets creados exitosamente
- **Assignment Efficiency**: Tiempo promedio de asignación
- **Sync Status**: Estado de sincronización entre sistemas

## 🔐 **Seguridad y Compliance**

### Características de Seguridad
- **Encriptación de datos sensibles** en tránsito y reposo
- **Hashing irreversible** para quasi-identifiers
- **Logs de auditoría** inmutables
- **Retención de datos** configurable por tipo
- **Derecho al olvido** automatizado

### Compliance
- **GDPR Ready**: Cumplimiento con regulación europea
- **CCPA Compliant**: Cumplimiento con ley de California
- **Audit Trails**: Trazabilidad completa de acceso a datos
- **Data Minimization**: Recolección mínima de datos necesarios

## 📞 **Soporte y Escalamiento**

### Canales de Notificación
- **Email**: Notificaciones estándar a responsible
- **Slack**: Alertas en tiempo real para el equipo
- **SMS**: Notificaciones críticas (solo urgentes)
- **WhatsApp Business**: Canal alternativo de comunicación

### Escalamiento Automático
1. **Nivel 1**: Asignación automática al especialista
2. **Nivel 2**: Escalamiento a manager del departamento
3. **Nivel 3**: Escalamiento a director/C-level

## 🚀 **Roadmap de Mejoras**

### Próximas Funcionalidades
- [ ] **Dashboard Analytics**: Panel de control con métricas en tiempo real
- [ ] **AI-Powered Categorization**: Categorización automática con IA
- [ ] **Multi-language Support**: Soporte para múltiples idiomas
- [ ] **Mobile App**: Aplicación móvil nativa
- [ ] **Advanced Reporting**: Reportes personalizables y programables
- [ ] **Integration Marketplace**: Integraciones con más herramientas empresariales

### Integraciones Planificadas
- [ ] **Salesforce CRM**: Sincronización bidireccional
- [ ] **Microsoft Teams**: Notificaciones y bot integrado
- [ ] **Jira Service Management**: Integración con tickets técnicos
- [ ] **Zapier**: Automatización con 3000+ apps
- [ ] **Power BI**: Dashboards avanzados de business intelligence

## 📄 **Licencia y Contribución**

Este proyecto está bajo la Licencia MIT. Las contribuciones son bienvenidas siguiendo nuestras guías de contribución.

---

**🏢 Versión Enterprise desarrollada para Ecomac**  
**💼 Con integración completa de ClickUp, SLAs dinámicos y sistemas de privacidad**  
**🔒 Cumplimiento empresarial con GDPR, CCPA y auditoría completa**

---

*Desarrollado con ❤️ usando Vue.js 3 + Vite + Enterprise Integrations*