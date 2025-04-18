<template>
    <div class="toolbar">
      <button @click="$emit('insert', '**太字**')">B</button>
      <button @click="$emit('insert', '# 見出し')">H</button>
      <!-- 他にも追加 -->
    </div>
  </template>