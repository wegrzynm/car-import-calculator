import { createWebHistory, createRouter } from 'vue-router'

import HomeView from '../components/HelloWorld.vue'
import AmericanImport from '../components/AmericanImport.vue';

const routes = [
  { path: '/', component: HomeView },
  { path: '/import-ameryka', component: AmericanImport },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router;