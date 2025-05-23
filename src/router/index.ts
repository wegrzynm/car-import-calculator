import { createWebHistory, createRouter } from 'vue-router'

import HomeView from '../components/HomeView.vue';
import AmericanImport from '../components/AmericanImport.vue';
import JapanImport from '../components/JapanImport.vue';

const routes = [
  { path: '/', component: HomeView },
  { path: '/import-usa', component: AmericanImport },
  { path: '/import-japonia', component: JapanImport },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router;