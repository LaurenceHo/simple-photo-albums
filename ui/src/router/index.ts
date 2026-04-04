import AlbumListView from '@/views/AlbumList.vue';
import Index from '@/views/Index.vue';
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'landingPage',
      component: Index,
      redirect: '/albums',
      children: [
        {
          path: '/albums',
          name: 'albums',
          component: AlbumListView,
        },
        {
          path: '/albums/:year',
          name: 'albumsByYear',
          component: AlbumListView,
        },
        {
          path: '/album/:year/:albumId',
          name: 'photosByAlbum',
          component: () => import('../views/PhotoList.vue'),
        },
      ],
    },
    {
      path: '/map/albums',
      name: 'albumMap',
      component: () => import('../views/AlbumMap.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/Login.vue'),
    },
    {
      path: '/:catchAll(.*)*',
      component: () => import('../views/Error404.vue'),
    },
  ],
});

export default router;
