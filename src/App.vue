<script setup>
import HelloWorld from './components/HelloWorld.vue'
</script>

<template>
<div id="app">
  <nav>
    <router-link to="/">ホーム</router-link> |
    <router-link to="/about">About</router-link>
  </nav>
  <router-view/>
</div>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}

nav {
  padding: 30px;
}

nav a {
  font-weight: bold;
  color: #2c3e50;
  text-decoration: none;
  padding: 0 10px;
}

nav a.router-link-exact-active {
  color: #42b883;
}
</style>
