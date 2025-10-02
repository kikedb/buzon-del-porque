/**
 * Script para explorar la estructura actual de ClickUp
 * Te ayudará a mapear cómo opera actualmente tu workspace
 */

// Primero, necesitamos tu API key configurada
const CLICKUP_API_KEY = process.env.VITE_CLICKUP_API_KEY || 'pk_TU_API_KEY_AQUI';
const TEAM_ID = '9014656188';
const SPACE_ID = '90144241684';
const LIST_ID = '901412236687';

console.log('🔍 EXPLORADOR DE CLICKUP - Mapear estructura actual');
console.log('==================================================');

async function exploreClickUp() {
  const headers = {
    'Authorization': CLICKUP_API_KEY,
    'Content-Type': 'application/json'
  };

  try {
    console.log('📋 1. Explorando tu lista actual...');
    
    // Explorar la lista específica
    const listResponse = await fetch(`https://api.clickup.com/api/v2/list/${LIST_ID}`, {
      headers
    });
    
    if (!listResponse.ok) {
      console.error('❌ Error accediendo a tu lista:', listResponse.status);
      console.log('⚠️  Verifica que hayas configurado VITE_CLICKUP_API_KEY en .env');
      return;
    }
    
    const listData = await listResponse.json();
    console.log('✅ Lista encontrada:', listData.name);
    
    // Explorar tareas existentes para ver patrones
    console.log('\n🎫 2. Analizando tareas existentes...');
    const tasksResponse = await fetch(`https://api.clickup.com/api/v2/list/${LIST_ID}/task`, {
      headers
    });
    
    const tasksData = await tasksResponse.json();
    const tasks = tasksData.tasks || [];
    
    console.log(`📊 Total de tareas encontradas: ${tasks.length}`);
    
    if (tasks.length > 0) {
      console.log('\n🏷️  3. Patrones de TAGS usados actualmente:');
      const allTags = new Set();
      tasks.forEach(task => {
        task.tags?.forEach(tag => allTags.add(tag.name));
      });
      console.log('Tags existentes:', Array.from(allTags).slice(0, 20));
      
      console.log('\n⭐ 4. Patrones de PRIORIDAD:');
      const priorities = {};
      tasks.forEach(task => {
        const priority = task.priority?.priority || 'sin-prioridad';
        priorities[priority] = (priorities[priority] || 0) + 1;
      });
      console.log('Distribución de prioridades:', priorities);
      
      console.log('\n👥 5. Patrones de ASIGNACIÓN:');
      const assignees = {};
      tasks.forEach(task => {
        if (task.assignees?.length > 0) {
          task.assignees.forEach(assignee => {
            assignees[assignee.username] = (assignees[assignee.username] || 0) + 1;
          });
        } else {
          assignees['sin-asignar'] = (assignees['sin-asignar'] || 0) + 1;
        }
      });
      console.log('Patrones de asignación:', assignees);
      
      console.log('\n📝 6. Ejemplo de tarea actual:');
      const sampleTask = tasks[0];
      console.log({
        name: sampleTask.name,
        status: sampleTask.status?.status,
        priority: sampleTask.priority?.priority,
        tags: sampleTask.tags?.map(t => t.name),
        assignees: sampleTask.assignees?.map(a => a.username),
        custom_fields: sampleTask.custom_fields?.map(cf => ({
          name: cf.name,
          value: cf.value
        }))
      });
    }
    
    console.log('\n🎯 7. CAMPOS PERSONALIZADOS disponibles:');
    if (listData.custom_fields?.length > 0) {
      listData.custom_fields.forEach(field => {
        console.log(`- ${field.name} (ID: ${field.id}, Tipo: ${field.type})`);
      });
    } else {
      console.log('No hay campos personalizados configurados');
    }
    
    console.log('\n📊 8. ESTADOS disponibles en la lista:');
    if (listData.statuses?.length > 0) {
      listData.statuses.forEach(status => {
        console.log(`- ${status.status} (Color: ${status.color})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error explorando ClickUp:', error);
    console.log('\n💡 PASOS PARA CONFIGURAR:');
    console.log('1. Ve a: https://app.clickup.com/settings/apps');
    console.log('2. Crea un "Personal API Token"');
    console.log('3. Edita .env y reemplaza: VITE_CLICKUP_API_KEY=pk_tu_token_aqui');
    console.log('4. Ejecuta: node explore-clickup.js');
  }
}

console.log('🚀 Para usar este explorador:');
console.log('1. Configura tu API key en .env');
console.log('2. Ejecuta: node explore-clickup.js');
console.log('3. Comparte conmigo la salida para replicar tu lógica actual\n');

// Si se ejecuta directamente
if (typeof window === 'undefined') {
  exploreClickUp();
}