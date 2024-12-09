import { createRouter, createWebHistory } from 'vue-router';
import Login from '../components/Login.vue';
import OrderList from '../components/OrderList.vue';
import OrderForm from '../components/OrderForm.vue';
import authService from '../services/authService';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false }
  },
  {
    path: '/orders',
    name: 'OrderList', // Cambiado de 'Orders' a 'OrderList'
    component: OrderList, // Cambiado de Orders a OrderList
    meta: { requiresAuth: true }
  },
  {
    path: '/orders/create',
    name: 'OrderForm',
    component: OrderForm,
    meta: { requiresAuth: true } // Agregada la meta de autenticación
  },
  {
    path: '/',
    redirect: '/orders'
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/orders'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  const isAuthenticated = authService.isAuthenticated();
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login');
  } else if (to.path === '/login' && isAuthenticated) {
    next('/orders');
  } else {
    next();
  }
});

export default router;