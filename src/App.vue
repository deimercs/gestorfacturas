<template>
  <NavigationBar v-if="isLoggedIn && !isLoginPage" />
  <div id="app">
    <router-view></router-view>
  </div>
</template>

<script>
import NavigationBar from './components/Navbar.vue'
import { useRoute } from 'vue-router'

export default {
  name: 'App',
  components: {
    NavigationBar
  },
  setup() {
    const route = useRoute();
    return { route };
  },
  computed: {
    isLoggedIn() {
      return !!localStorage.getItem('user')
    },
    isLoginPage() {
      return this.route.path === '/login'
    }
  }
}
</script>