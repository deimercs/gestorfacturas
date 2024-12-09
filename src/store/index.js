// src/store/index.js
import { createStore } from 'vuex';

export default createStore({
  state: {
    user: null
  },
  mutations: {
    setUser(state, user) {
      state.user = user;
    },
    clearUser(state) {
      state.user = null;
    }
  },
  actions: {
    logout({ commit }) {
      commit('clearUser');
      // Aquí puedes agregar la lógica para cerrar sesión en tu API
    }
  },
  getters: {
    isAuthenticated: state => !!state.user
  }
});