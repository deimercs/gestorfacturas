// Constantes
const TOKEN_KEY = 'user_token';
const USER_KEY = 'user';
const SESSION_DURATION = 15 * 60 * 1000; // 5 minutos en milisegundos

let sessionTimer;

const authService = {
  // Iniciar sesión
  login(user, token) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_KEY, token);
    this.startSessionTimer();
  },

  // Cerrar sesión
  logout() {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    this.clearSessionTimer();
  },

  // Verificar si el usuario está autenticado
  isAuthenticated() {
    const user = localStorage.getItem(USER_KEY);
    const token = localStorage.getItem(TOKEN_KEY);
    return !!user && !!token;
  },

  // Obtener usuario actual
  getCurrentUser() {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  // Iniciar temporizador de sesión
  startSessionTimer() {
    this.clearSessionTimer();
    sessionTimer = setTimeout(() => {
      this.logout();
      window.location.href = '/login';
    }, SESSION_DURATION);
  },

  // Limpiar temporizador
  clearSessionTimer() {
    if (sessionTimer) {
      clearTimeout(sessionTimer);
    }
  },

  // Reiniciar temporizador
  resetSessionTimer() {
    this.startSessionTimer();
  }
};

export default authService;