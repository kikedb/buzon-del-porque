/**
 * E2E Tests para Buzón del Porqué
 * Tests de flujos completos de usuario desde el navegador
 */

import { test, expect } from '@playwright/test'

// Mock del webhook para evitar llamadas reales en E2E
test.beforeEach(async ({ page }) => {
  // Interceptar llamadas al webhook y devolver respuesta exitosa
  await page.route('**/webhook/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        id: 'e2e-test-' + Date.now(),
        message: 'E2E test successful'
      })
    })
  })
})

test.describe('Buzón del Porqué - Flujos principales', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Verificar que la página carga correctamente
    await expect(page.locator('.titulo')).toHaveText('WHY El buzón del Porqué')
  })

  test.describe('Flujo mensaje identificado', () => {
    test('debe completar flujo identificado exitosamente', async ({ page }) => {
      // 1. Verificar estado inicial
      await expect(page.locator('button:has-text("Con nombre")')).toHaveClass(/boton-activo-izq/)
      await expect(page.locator('input[placeholder="Tu nombre"]')).toBeVisible()
      await expect(page.locator('input[placeholder="tucorreo@ejemplo.com"]')).toBeVisible()

      // 2. Llenar formulario identificado
      await page.fill('input[placeholder="Tu nombre"]', 'Juan Pérez E2E')
      await page.fill('input[placeholder="tucorreo@ejemplo.com"]', 'juan.e2e@ecomac.cl')
      await page.fill('textarea[placeholder*="Escribe aquí tu empresa"]', 'Empresa E2E Testing')
      await page.fill('textarea[placeholder*="¿Qué deseas compartir"]', 'Este es un mensaje de prueba E2E para verificar que el flujo completo funciona correctamente desde el navegador.')

      // 3. Seleccionar opciones
      await page.selectOption('select >> nth=0', 'pregunta')
      await page.selectOption('select >> nth=1', 'it')
      await page.selectOption('select >> nth=2', 'alta')

      // 4. Verificar contador de caracteres se actualiza
      const contador = page.locator('.contador-caracteres')
      await expect(contador).toContainText('/500 caracteres')
      
      // 5. Verificar que el botón se habilita
      const botonEnviar = page.locator('.boton-enviar')
      await expect(botonEnviar).not.toHaveAttribute('disabled')
      await expect(botonEnviar).not.toHaveClass(/boton-deshabilitado/)

      // 6. Enviar formulario
      await botonEnviar.click()

      // 7. Verificar estado de loading
      await expect(botonEnviar).toHaveText('Enviando...')
      await expect(botonEnviar).toHaveAttribute('disabled')

      // 8. Verificar modal de confirmación aparece
      await expect(page.locator('.modal-overlay')).toBeVisible()
      await expect(page.locator('.modal-titulo')).toHaveText('¡Mensaje Enviado Exitosamente!')

      // 9. Verificar información del ticket
      const ticketId = page.locator('.ticket-id')
      await expect(ticketId).toBeVisible()
      const ticketIdText = await ticketId.textContent()
      expect(ticketIdText).toMatch(/^WHY-\d{8}-[A-Z0-9]{6}$/)

      // 10. Verificar detalles del ticket
      await expect(page.locator('.detail-value >> nth=1')).toHaveText('pregunta')
      await expect(page.locator('.detail-value >> nth=2')).toHaveText('Identificado')

      // 11. Verificar que el formulario se limpió
      await page.click('.btn-primary') // Cerrar modal
      
      await expect(page.locator('input[placeholder="Tu nombre"]')).toHaveValue('')
      await expect(page.locator('input[placeholder="tucorreo@ejemplo.com"]')).toHaveValue('')
      await expect(page.locator('textarea[placeholder*="¿Qué deseas compartir"]')).toHaveValue('')
    })

    test('debe mostrar errores de validación en tiempo real', async ({ page }) => {
      // 1. Intentar enviar formulario vacío
      const botonEnviar = page.locator('.boton-enviar')
      await expect(botonEnviar).toHaveAttribute('disabled')

      // 2. Llenar nombre muy corto y salir del campo
      await page.fill('input[placeholder="Tu nombre"]', 'A')
      await page.click('input[placeholder="tucorreo@ejemplo.com"]') // Blur
      
      await expect(page.locator('.mensaje-error-campo').first()).toHaveText('El nombre debe tener al menos 2 caracteres')
      await expect(page.locator('input[placeholder="Tu nombre"]')).toHaveClass(/entrada-error/)

      // 3. Corregir nombre
      await page.fill('input[placeholder="Tu nombre"]', 'Juan Pérez')
      await page.click('input[placeholder="tucorreo@ejemplo.com"]') // Blur
      
      await expect(page.locator('input[placeholder="Tu nombre"]')).not.toHaveClass(/entrada-error/)

      // 4. Email inválido
      await page.fill('input[placeholder="tucorreo@ejemplo.com"]', 'email-invalido')
      await page.click('textarea[placeholder*="¿Qué deseas compartir"]') // Blur
      
      await expect(page.locator('.mensaje-error-campo').last()).toHaveText('Por favor ingresa un correo electrónico válido')

      // 5. Email con dominio no permitido
      await page.fill('input[placeholder="tucorreo@ejemplo.com"]', 'test@gmail.com')
      await page.click('textarea[placeholder*="¿Qué deseas compartir"]') // Blur
      
      await expect(page.locator('.mensaje-error-campo').last()).toContainText('Solo se permiten correos de los dominios')

      // 6. Mensaje muy corto
      await page.fill('textarea[placeholder*="¿Qué deseas compartir"]', 'Hola')
      await page.click('input[placeholder="Tu nombre"]') // Blur
      
      await expect(page.locator('.mensaje-error-campo').last()).toHaveText('El mensaje debe tener al menos 10 caracteres')
    })
  })

  test.describe('Flujo mensaje anónimo', () => {
    test('debe completar flujo anónimo exitosamente', async ({ page }) => {
      // 1. Cambiar a modo anónimo
      await page.click('button:has-text("Anónima")')
      
      await expect(page.locator('button:has-text("Anónima")')).toHaveClass(/boton-activo-der/)
      await expect(page.locator('input[placeholder="Tu nombre"]')).not.toBeVisible()
      await expect(page.locator('input[placeholder="tucorreo@ejemplo.com"]')).not.toBeVisible()

      // 2. Llenar formulario anónimo
      await page.fill('textarea[placeholder*="¿Qué deseas compartir"]', 'Esta es una sugerencia anónima desde E2E testing para mejorar la plataforma y verificar que funciona correctamente.')
      
      await page.selectOption('select >> nth=0', 'sugerencia')
      await page.selectOption('select >> nth=1', 'marketing')

      // 3. Verificar botón se habilita
      const botonEnviar = page.locator('.boton-enviar')
      await expect(botonEnviar).not.toHaveAttribute('disabled')

      // 4. Enviar formulario
      await botonEnviar.click()

      // 5. Verificar modal de confirmación
      await expect(page.locator('.modal-overlay')).toBeVisible()
      await expect(page.locator('.detail-value >> nth=1')).toHaveText('sugerencia')
      await expect(page.locator('.detail-value >> nth=2')).toHaveText('Anónimo')

      // 6. Verificar información específica para anónimos
      const modal = page.locator('.modal-content')
      await expect(modal).toContainText('Mensaje anónimo')
      await expect(modal).toContainText('menciona tu ticket ID')
    })

    test('debe permitir cambio entre modos sin perder validaciones', async ({ page }) => {
      // 1. Comenzar en modo identificado con errores
      await page.fill('input[placeholder="Tu nombre"]', 'A') // Muy corto
      await page.click('input[placeholder="tucorreo@ejemplo.com"]') // Blur
      
      await expect(page.locator('.mensaje-error-campo')).toBeVisible()

      // 2. Cambiar a anónimo
      await page.click('button:has-text("Anónima")')
      
      // 3. Verificar que errores se limpiaron
      await expect(page.locator('.mensaje-error-campo')).not.toBeVisible()

      // 4. Llenar formulario anónimo válido
      await page.fill('textarea[placeholder*="¿Qué deseas compartir"]', 'Mensaje anónimo válido para testing')
      await page.selectOption('select >> nth=0', 'otro')

      // 5. Cambiar de vuelta a identificado
      await page.click('button:has-text("Con nombre")')
      
      // 6. Verificar campos están vacíos
      await expect(page.locator('input[placeholder="Tu nombre"]')).toHaveValue('')
      await expect(page.locator('input[placeholder="tucorreo@ejemplo.com"]')).toHaveValue('')
    })
  })

  test.describe('Interfaz de usuario', () => {
    test('debe ser responsive en dispositivos móviles', async ({ page }) => {
      // 1. Simular dispositivo móvil
      await page.setViewportSize({ width: 375, height: 667 })
      
      // 2. Verificar elementos principales son visibles
      await expect(page.locator('.titulo')).toBeVisible()
      await expect(page.locator('.botonera')).toBeVisible()
      await expect(page.locator('.formulario')).toBeVisible()

      // 3. Verificar botones son tocables en móvil
      const botonAnonimo = page.locator('button:has-text("Anónima")')
      await expect(botonAnonimo).toBeVisible()
      await botonAnonimo.click()
      
      await expect(botonAnonimo).toHaveClass(/boton-activo-der/)

      // 4. Verificar formulario funciona en móvil
      await page.fill('textarea[placeholder*="¿Qué deseas compartir"]', 'Test mobile responsive')
      await page.selectOption('select >> nth=0', 'pregunta')
      
      const botonEnviar = page.locator('.boton-enviar')
      await expect(botonEnviar).not.toHaveAttribute('disabled')
    })

    test('debe mostrar elementos de categorización correctamente', async ({ page }) => {
      // 1. Verificar sección de categorización
      await expect(page.locator('.seccion-categorizacion')).toBeVisible()
      await expect(page.locator('.subtitulo-categorizacion')).toHaveText('🏷️ Ayúdanos a categorizar tu mensaje')

      // 2. Verificar dropdowns están presentes
      const selects = page.locator('select')
      await expect(selects.nth(0)).toBeVisible() // Categoría
      await expect(selects.nth(1)).toBeVisible() // Departamento
      await expect(selects.nth(2)).toBeVisible() // Prioridad

      // 3. Verificar opciones de categoría
      const categoriaSelect = selects.nth(0)
      await expect(categoriaSelect.locator('option[value="pregunta"]')).toHaveText('❓ Pregunta')
      await expect(categoriaSelect.locator('option[value="sugerencia"]')).toHaveText('💡 Sugerencia')
      await expect(categoriaSelect.locator('option[value="queja"]')).toHaveText('⚠️ Queja')

      // 4. Verificar opciones de departamento
      const deptSelect = selects.nth(1)
      await expect(deptSelect.locator('option[value="it"]')).toHaveText('💻 Tecnología (IT)')
      await expect(deptSelect.locator('option[value="rrhh"]')).toHaveText('👥 Recursos Humanos')
    })

    test('debe mostrar y ocultar modal correctamente', async ({ page }) => {
      // 1. Preparar formulario válido
      await page.fill('input[placeholder="Tu nombre"]', 'Test Modal')
      await page.fill('input[placeholder="tucorreo@ejemplo.com"]', 'modal@ecomac.cl')
      await page.fill('textarea[placeholder*="¿Qué deseas compartir"]', 'Testing modal functionality')
      await page.selectOption('select >> nth=0', 'pregunta')

      // 2. Enviar formulario
      await page.click('.boton-enviar')

      // 3. Verificar modal aparece
      const modal = page.locator('.modal-overlay')
      await expect(modal).toBeVisible()
      
      // 4. Verificar click fuera del modal lo cierra
      await modal.click({ position: { x: 10, y: 10 } }) // Click en overlay
      await expect(modal).not.toBeVisible()

      // 5. Enviar de nuevo para probar botón cerrar
      await page.click('.boton-enviar')
      await expect(modal).toBeVisible()

      // 6. Probar botón "Entendido"
      await page.click('.btn-primary')
      await expect(modal).not.toBeVisible()
    })
  })

  test.describe('Casos edge y manejo de errores', () => {
    test('debe manejar caracteres especiales correctamente', async ({ page }) => {
      // 1. Llenar formulario con caracteres especiales
      await page.fill('input[placeholder="Tu nombre"]', 'José María O\'Connor')
      await page.fill('input[placeholder="tucorreo@ejemplo.com"]', 'jose.maria@ecomac.cl')
      await page.fill('textarea[placeholder*="¿Qué deseas compartir"]', 'Mensaje con acentos: "áéíóú", símbolos especiales: @#$%^&*(), y emojis: 😊🎉')
      
      await page.selectOption('select >> nth=0', 'otro')

      // 2. Enviar y verificar que funciona
      const botonEnviar = page.locator('.boton-enviar')
      await expect(botonEnviar).not.toHaveAttribute('disabled')
      
      await botonEnviar.click()
      await expect(page.locator('.modal-overlay')).toBeVisible()
    })

    test('debe manejar límites de caracteres correctamente', async ({ page }) => {
      // 1. Mensaje en el límite exacto (500 caracteres)
      const mensaje500 = 'A'.repeat(500)
      await page.fill('textarea[placeholder*="¿Qué deseas compartir"]', mensaje500)
      
      const contador = page.locator('.contador-caracteres')
      await expect(contador).toContainText('500/500 caracteres')

      // 2. Intentar agregar un carácter más (debe truncarse por maxlength)
      await page.fill('textarea[placeholder*="¿Qué deseas compartir"]', mensaje500 + 'X')
      await expect(contador).toContainText('500/500 caracteres') // Debe seguir en 500

      // 3. Nombre en límite de 50 caracteres
      const nombre50 = 'B'.repeat(50)
      await page.fill('input[placeholder="Tu nombre"]', nombre50)
      
      // No debe permitir más caracteres
      await page.fill('input[placeholder="Tu nombre"]', nombre50 + 'X')
      const nombreActual = await page.locator('input[placeholder="Tu nombre"]').inputValue()
      expect(nombreActual).toHaveLength(50)
    })

    test('debe funcionar con JavaScript deshabilitado parcialmente', async ({ page }) => {
      // Simulamos escenarios de JavaScript limitado verificando que funcionalidades básicas funcionen
      
      // 1. Verificar que formulario HTML básico funciona
      await page.fill('input[placeholder="Tu nombre"]', 'Usuario JS Limited')
      await page.fill('input[placeholder="tucorreo@ejemplo.com"]', 'js@ecomac.cl')
      await page.fill('textarea[placeholder*="¿Qué deseas compartir"]', 'Test sin JavaScript avanzado')
      
      // 2. Usar selectores básicos
      await page.selectOption('select[v-model="form.categoria"]', 'pregunta')
      
      // 3. Verificar que elementos básicos siguen siendo accesibles
      const titulo = page.locator('.titulo')
      await expect(titulo).toBeVisible()
      await expect(titulo).toHaveText('WHY El buzón del Porqué')
    })
  })
})