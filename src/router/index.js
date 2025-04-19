import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Edit from '../views/MarkdownEditor.vue'
const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/about',
    name: 'About',
    // 遅延ローディングの例
    component: () => import('../views/About.vue')
  },
  {
    path: '/editor/:id',
    name: 'MarkdownEditor',
    component: Edit,
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
