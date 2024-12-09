<template>
  <nav v-if="isAuthenticated" class="bg-[#2d1e2f] shadow-lg">
    <div class="max-w-7xl mx-auto px-4">
      <div class="flex justify-between h-16">
        <div class="flex">
          <div class="flex items-center">
            <span class="text-white font-bold text-xl">Sistema de Órdenes</span>
          </div>
        </div>

        <div class="flex space-x-4">
          <div class="relative group">
            <button class="text-white hover:bg-white/10 px-3 py-2 rounded-md text-sm font-medium">
              Órdenes
            </button>
            <div class="absolute left-0 hidden group-hover:block w-48 bg-white rounded-md shadow-lg py-1 z-50">
              <router-link to="/orders/create" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                Generar Orden
              </router-link>
              <router-link to="/orders" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                Consultar Órdenes
              </router-link>
            </div>
          </div>

          <div class="relative group">
            <button class="text-white hover:bg-white/10 px-3 py-2 rounded-md text-sm font-medium">
              Usuarios
            </button>
            <div class="absolute left-0 hidden group-hover:block w-48 bg-white rounded-md shadow-lg py-1 z-50">
              <router-link to="/clients" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                Crear Cliente/Tercero
              </router-link>
              <router-link to="/users" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                Crear Usuarios
              </router-link>
              <router-link to="/collaborators" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                Crear Colaboradores
              </router-link>
            </div>
          </div>

          <button @click="handleLogout" class="text-white hover:bg-white/10 px-3 py-2 rounded-md text-sm font-medium">
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import authService from '@/services/authService';

export default {
  name: 'NavigationBar',
  setup() {
    const router = useRouter();
    const isAuthenticated = ref(false);
    let activityTimer;

    const checkAuthentication = () => {
      isAuthenticated.value = authService.isAuthenticated();
    };

    const handleActivity = () => {
      if (authService.isAuthenticated()) {
        authService.resetSessionTimer();
      }
    };

    const handleLogout = () => {
      authService.logout();
      router.push('/login');
    };

    onMounted(() => {
      checkAuthentication();
      window.addEventListener('mousemove', handleActivity);
      window.addEventListener('keypress', handleActivity);
      
      // Verificar autenticación periódicamente
      activityTimer = setInterval(checkAuthentication, 1000);
    });

    onBeforeUnmount(() => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      clearInterval(activityTimer);
    });

    return {
      isAuthenticated,
      handleLogout
    };
  }
}
</script>