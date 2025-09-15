# Plataforma WHY - El Buzón del Porqué

**Plataforma WHY** es una aplicación web desarrollada con Vue.js 3 que permite a los usuarios enviar mensajes y preguntas de manera anónima o identificada. La aplicación cuenta con validación robusta, manejo de errores avanzado y integración directa con webhooks de n8n.

## 🚀 Características

- ✅ **Validación de formularios en tiempo real**
- 🔒 **Manejo robusto de errores**
- 📱 **Diseño responsive y moderno**
- 🎯 **Dos modos de envío**: Anónimo e Identificado
- 🌐 **Integración con webhook de n8n**
- ⚡ **Estados de loading/success/error**
- 🎨 **Interfaz intuitiva y accesible**

## 🛠️ Stack Tecnológico

- **Frontend Framework:** Vue.js 3 con Composition API
- **Build Tool:** Vite 7.0.0
- **Estilos:** CSS3 con variables CSS y Scoped Styles
- **Validación:** JavaScript nativo con regex
- **HTTP Client:** Fetch API con timeout y manejo de errores
- **Backend Integration:** Webhook n8n

## 📋 Configuración del Proyecto

### Instalación

```bash
# Clonar el proyecto
git clone [URL_DEL_REPOSITORIO]
cd plataforma-why

# Instalar dependencias
npm install

# Copiar archivo de configuración
cp .env.example .env
```

### Variables de Entorno

Configura el archivo `.env` con tus propios valores:

```env
# URL del webhook de n8n
VITE_WEBHOOK_URL=https://inmobiliaria-ecomac.app.n8n.cloud/webhook/a15c54d3-e59d-4469-823f-99b4d0c8d87f

# Configuración de timeout (opcional)
VITE_API_TIMEOUT=10000

# Habilitar logs en consola (opcional)
VITE_ENABLE_CONSOLE_LOGS=true
```

### Ejecutar en Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en: http://localhost:5173/

### Compilar para Producción

```bash
npm run build
```

### Vista Previa de Producción

```bash
npm run preview
```

## 📊 Estructura de Datos Enviados

Cuando se envía un formulario, los datos se envían al webhook con la siguiente estructura:

### Mensaje Anónimo
```json
{
  "tipo": "anonimo",
  "mensaje": "Contenido del mensaje",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "fecha": "15/1/2024",
  "hora": "10:30:00",
  "source": "plataforma-why"
}
```

### Mensaje Identificado
```json
{
  "tipo": "identificado",
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "empresa": "Mi Empresa S.A.",
  "mensaje": "Contenido del mensaje",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "fecha": "15/1/2024",
  "hora": "10:30:00",
  "source": "plataforma-why"
}
```

## 🔧 Configuración del Webhook

### URL del Webhook
```
https://inmobiliaria-ecomac.app.n8n.cloud/webhook/a15c54d3-e59d-4469-823f-99b4d0c8d87f
```

### Método HTTP
- **POST** con `Content-Type: application/json`

### Validaciones Implementadas

#### Campos Obligatorios (Modo Identificado)
- **Nombre**: Mínimo 2 caracteres, máximo 50
- **Email**: Formato válido, máximo 100 caracteres
- **Mensaje**: Mínimo 10 caracteres, máximo 500

#### Campos Opcionales
- **Empresa**: Máximo 100 caracteres

#### Campos Obligatorios (Modo Anónimo)
- **Mensaje**: Mínimo 10 caracteres, máximo 500

## 🎨 Características de UX/UI

### Validación en Tiempo Real
- Validación al salir del campo (`@blur`)
- Mensajes de error específicos
- Indicadores visuales (bordes rojos)
- Contador de caracteres

### Estados del Formulario
- **Estado inicial**: Formulario limpio
- **Estado de validación**: Errores mostrados en tiempo real  
- **Estado de envío**: Botón deshabilitado con "Enviando..."
- **Estado de éxito**: Mensaje verde y formulario limpio
- **Estado de error**: Mensaje rojo con detalles del error

### Responsive Design
- Adaptado para móviles y tablets
- Breakpoints CSS optimizados
- Interfaz touch-friendly

## 🔍 Manejo de Errores

### Tipos de Errores
1. **ValidationError**: Errores de validación de campos
2. **NetworkError**: Problemas de conectividad
3. **APIError**: Errores del servidor (4xx, 5xx)

### Casos Manejados
- ❌ Falta de conexión a internet
- ❌ Timeout de petición (10 segundos)
- ❌ Errores del servidor
- ❌ Validación de datos
- ❌ Respuestas malformadas

## 🚦 Configuración IDE Recomendada

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (desactivar Vetur)

### Extensiones Recomendadas
- Vue Language Features (Volar)
- TypeScript Vue Plugin (Volar)
- ESLint
- Prettier

## 📝 Próximas Mejoras

- [ ] Testing unitario con Vitest
- [ ] Integración con TypeScript
- [ ] Modo offline con Queue
- [ ] Animaciones más avanzadas
- [ ] Dashboard de estadísticas
- [ ] Múltiples idiomas (i18n)
- [ ] Tema oscuro

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

---

**Desarrollado con ❤️ usando Vue.js 3 + Vite**
