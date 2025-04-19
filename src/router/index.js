import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Edit from '../views/MarkdownEditor.vue'
import ViewDocument from '../views/ViewDocument.vue'

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
  },
  {
    path: '/view/:id',
    name: 'ViewDocument',
    component: ViewDocument,
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
