# WARP.md

Este archivo proporciona orientación a WARP (warp.dev) cuando trabaja con código en este repositorio.

## Comandos de Desarrollo Comunes

### Desarrollo Local
```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Build para producción
npm run build

# Vista previa del build de producción
npm run preview
```

### Configuración del Entorno
```bash
# Copiar archivo de configuración (si existe .env.example)
cp .env.example .env
```

Variables de entorno requeridas:
- `VITE_WEBHOOK_URL`: URL del webhook de n8n para el envío de mensajes
- `VITE_API_TIMEOUT`: Timeout para las peticiones HTTP (opcional, default: 10000ms)
- `VITE_ENABLE_CONSOLE_LOGS`: Habilitar logs en consola (opcional)

## Arquitectura del Proyecto

### Stack Tecnológico
- **Framework**: Vue.js 3 con Composition API
- **Build Tool**: Vite 7.0.0
- **Estilos**: CSS3 con variables CSS y Scoped Styles
- **HTTP Client**: Fetch API con manejo personalizado de errores
- **Backend**: Integración con webhook n8n

### Estructura de Componentes

#### Componente Principal
- `src/components/InicioPlataformaWhy.vue`: Componente principal que maneja todo el formulario de envío de mensajes

#### Funcionalidades Clave
1. **Modo Dual**: Permite envío anónimo o identificado
2. **Sistema de Categorización**: 
   - Categorías de mensaje: Pregunta, Sugerencia, Queja, Felicitación, Bug, Otro
   - Tags de departamento: RRHH, IT, Ventas, Operaciones, Marketing, Finanzas, Administración, Gerencia
   - Niveles de prioridad: Baja, Media, Alta, Urgente
3. **Validación en Tiempo Real**: Validación de campos con mensajes específicos
4. **Manejo de Estados**: Loading, success, error states
5. **Validación de Dominios**: Solo acepta emails de dominios específicos (@ecomac.cl, @kawen.cl, @ecomacempresas.cl, @ceres.cl, @bilbola.cl)

### Servicios

#### API Service (`src/services/apiService.js`)
- **Clases de Error Personalizadas**: `APIError`, `NetworkError`, `ValidationError`
- **Timeout Management**: Manejo de timeouts con AbortController
- **Error Handling**: Procesamiento específico de códigos de respuesta HTTP
- **Data Processing**: Formateo de datos para n8n webhook

#### Estructura de Datos Enviados

**Mensaje Anónimo**:
```json
{
  "tipo": "anonimo",
  "mensaje": "contenido",
  "categoria": "pregunta|sugerencia|queja|felicitacion|bug|otro",
  "departamento": "rrhh|it|ventas|operaciones|marketing|finanzas|administracion|gerencia",
  "prioridad": "baja|media|alta|urgente",
  "timestamp": "ISO string",
  "fecha": "DD/MM/AAAA",
  "hora": "HH:mm:ss",
  "source": "plataforma-why"
}
```

**Mensaje Identificado**:
```json
{
  "tipo": "identificado",
  "nombre": "string",
  "email": "string",
  "empresa": "string",
  "mensaje": "string",
  "categoria": "pregunta|sugerencia|queja|felicitacion|bug|otro",
  "departamento": "rrhh|it|ventas|operaciones|marketing|finanzas|administracion|gerencia",
  "prioridad": "baja|media|alta|urgente",
  "timestamp": "ISO string",
  "fecha": "DD/MM/AAAA", 
  "hora": "HH:mm:ss",
  "source": "plataforma-why"
}
```

### Validaciones Implementadas

#### Campos Requeridos (Modo Identificado)
- **Nombre**: 2-50 caracteres
- **Email**: Formato válido + dominios permitidos
- **Mensaje**: 10-500 caracteres
- **Categoría**: Selección obligatoria de tipo de mensaje

#### Campos Opcionales (Modo Identificado)
- **Empresa**: Máximo 100 caracteres
- **Departamento**: Selección opcional de departamento
- **Prioridad**: Por defecto "media"

#### Campos Requeridos (Modo Anónimo)
- **Mensaje**: 10-500 caracteres
- **Categoría**: Selección obligatoria de tipo de mensaje

#### Campos Opcionales (Modo Anónimo)
- **Departamento**: Selección opcional de departamento
- **Prioridad**: Por defecto "media"

### Patrones de Desarrollo

#### Composables y Reactividad
- Uso extensivo de `ref()` y `computed()` para reactividad
- Validación reactiva con watchers en eventos `@blur`
- Estados centralizados para loading y mensajes

#### Manejo de Errores
- Sistema de tres capas: ValidationError, NetworkError, APIError
- Mensajes de error específicos y contextales
- Fallback a mensajes genéricos para errores desconocidos

#### UX/UI
- **Estados Visuales**: Bordes rojos para errores, estados de botones
- **Feedback Inmediato**: Validación en tiempo real
- **Responsive Design**: Optimizado para móviles y escritorio
- **Contadores**: Límites de caracteres visibles

### Integración con n8n

El proyecto está configurado para enviar datos directamente a un webhook de n8n:
- URL predeterminada: `https://inmobiliaria-ecomac.app.n8n.cloud/webhook/a15c54d3-e59d-4469-823f-99b4d0c8d87f`
- Método: POST con Content-Type: application/json
- Incluye metadatos de timestamp y source para tracking

### Consideraciones de Desarrollo

#### Seguridad
- Validación tanto en cliente como preparación para validación en servidor
- Restricción de dominios de email
- Sanitización de datos antes del envío

#### Performance
- Lazy loading de validaciones (solo en @blur)
- Debounce implícito en validaciones
- Timeout management para evitar requests colgados

#### Escalabilidad
- Estructura modular de servicios
- Separación clara entre lógica de UI y lógica de negocio
- Fácil extensión para nuevos tipos de mensaje o validaciones
