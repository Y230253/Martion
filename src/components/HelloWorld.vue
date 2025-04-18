<script setup>
defineProps({
  msg: {
    type: String,
    default: 'Hello Vue!'
  }
})
</script>

<template>
  <div class="hello-world">
    <h2>{{ msg }}</h2>
    <p>
      シンプルなHelloWorldコンポーネントです。
      このコンポーネントはApp.vueとHome.vueから参照されています。
    </p>
  </div>
</template>

<style scoped>
.hello-world {
  margin: 20px 0;
  padding: 20px;
  border-radius: 8px;
  background-color: #f9f9f9;
}

h2 {
  color: #42b883;
}
</style>
