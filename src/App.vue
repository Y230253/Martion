<script setup>
// 未使用のインポートを削除
// import HelloWorld from './components/HelloWorld.vue'
// import MarkdownEditor from './views/MarkdownEditor.vue'
import { watch } from 'vue'
import { useRoute } from 'vue-router'

// ルート変更監視
const route = useRoute()
watch(() => route.path, () => {
  // ドキュメント一覧表示のためのフラグ設定
  if (route.path === '/') {
    // ホーム画面に戻ったときの処理
    console.log('Returned to home, documents should be refreshed')
  }
}, { immediate: true })
</script>

<template>
  <router-view v-slot="{ Component }">
    <keep-alive>
      <component :is="Component" />
    </keep-alive>
  </router-view>
</template>

<style>
#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  margin: 0;
  padding: 0;
  height: 100vh;
}

body {
  margin: 0;
  padding: 0;
}

* {
  box-sizing: border-box;
}
</style>
