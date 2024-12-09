<template>
  <div class="login-wrapper">
    <div class="background-container">
      <div 
        class="background-layer"
        :style="{ backgroundImage: `url(${currentBackground})`, opacity: opacity }"
      ></div>
      <div 
        class="background-layer"
        :style="{ backgroundImage: `url(${nextBackground})`, opacity: 1 - opacity }"
      ></div>
    </div>

    <div class="login-container">
      <form @submit.prevent="handleLogin" class="login-form">
        <h2 class="text-2xl font-bold mb-6 text-center">Login</h2>
        
        <div v-if="errors.general" class="mb-4 p-2 bg-red-100 text-red-600 rounded">
          {{ errors.general }}
        </div>
        
        <div class="form-group">
          <input 
            v-model="email"
            type="email"
            placeholder="Email"
            :class="{ 'error': errors.email }"
            :disabled="isLoading"
          >
          <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
        </div>

        <div class="form-group">
          <input 
            v-model="password"
            type="password"
            placeholder="Contraseña"
            :class="{ 'error': errors.password }"
            :disabled="isLoading"
          >
          <span v-if="errors.password" class="error-message">{{ errors.password }}</span>
        </div>

        <button type="submit" :disabled="isLoading">
          {{ isLoading ? 'Cargando...' : 'Ingresar' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import authService from '../services/authService';

// Importar fondos
const backgrounds = [
  new URL('../assets/background/bg1.jpg', import.meta.url).href,
  new URL('../assets/background/bg2.jpg', import.meta.url).href,
  new URL('../assets/background/bg3.jpg', import.meta.url).href,
  new URL('../assets/background/bg4.jpg', import.meta.url).href,
  new URL('../assets/background/bg5.jpg', import.meta.url).href,
  new URL('../assets/background/bg6.jpg', import.meta.url).href,
  new URL('../assets/background/bg7.jpg', import.meta.url).href,
  new URL('../assets/background/bg8.jpg', import.meta.url).href,
  
];

export default {
  name: 'LoginForm',
  setup() {
    const router = useRouter();
    const email = ref('');
    const password = ref('');
    const errors = ref({});
    const isLoading = ref(false);
    const currentBackground = ref(backgrounds[0]);
    const nextBackground = ref(backgrounds[1]);
    const opacity = ref(-5);
    const currentIndex = ref(0);
    let intervalId;
    let fadeIntervalId;

    const validateForm = () => {
      errors.value = {};
      
      if (!email.value) {
        errors.value.email = 'El email es requerido';
      } else if (!/^[\w-]+@([\w-]+\.)+[\w-]{2,4}$/.test(email.value)) {
        errors.value.email = 'Email inválido';
      }

      if (!password.value) {
        errors.value.password = 'La contraseña es requerida';
      } else if (password.value.length < 6) {
        errors.value.password = 'La contraseña debe tener al menos 6 caracteres';
      }

      return Object.keys(errors.value).length === 0;
    };

    const handleLogin = async () => {
      if (!validateForm() || isLoading.value) return;
      
      isLoading.value = true;
      errors.value = {};

      try {
        const response = await axios.post('http://localhost:3001/login', {
          email: email.value,
          password: password.value
        });

        const { user } = response.data;
        authService.login(user, 'dummy-token');
        router.push('/orders');
      } catch (error) {
        console.error('Error login:', error);
        errors.value.general = 'Credenciales inválidas';
      } finally {
        isLoading.value = false;
      }
    };

    const updateBackground = () => {
      fadeIntervalId = setInterval(() => {
        opacity.value -= 1.02;
        
        if (opacity.value <= 0) {
          clearInterval(fadeIntervalId);
          
          currentIndex.value = (currentIndex.value + 1) % backgrounds.length;
          const nextIndex = (currentIndex.value + 1) % backgrounds.length;
          
          currentBackground.value = backgrounds[currentIndex.value];
          nextBackground.value = backgrounds[nextIndex];
          
          opacity.value = 1;
        }
      }, 20);
    };

    onMounted(() => {
      if (authService.isAuthenticated()) {
        router.push('/orders');
        return;
      }
      intervalId = setInterval(updateBackground, 8000);
    });

    onBeforeUnmount(() => {
      clearInterval(intervalId);
      clearInterval(fadeIntervalId);
    });

    return {
      email,
      password,
      errors,
      isLoading,
      currentBackground,
      nextBackground,
      opacity,
      handleLogin
    };
  }
};
</script>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  width: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.background-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
}

.background-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  transition: opacity 2s ease-in-out;
}

.login-container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 400px;
  margin: 0 20px;
  opacity: 0.9;
}

.login-form {
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 1rem;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

input.error {
  border-color: #dc2626;
}

.error-message {
  color: #dc2626;
  font-size: 0.875rem;
  margin-top: 0.25rem;
  display: block;
}

button {
  width: 100%;
  padding: 0.75rem;
  background: #2d1e2f;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover:not(:disabled) {
  background: #3d2e3f;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>