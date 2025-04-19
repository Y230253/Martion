<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { debounce } from 'lodash-es'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css' // スタイルは任意で変更可能

// マークダウンをレンダリングする関数を設定
marked.setOptions({
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch (e) {
        console.error(e);
      }
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true
});

const route = useRoute()
const router = useRouter()
const content = ref('')
const title = ref('Untitled Document')
const tags = ref([])
const newTag = ref('')
const group = ref('None')
const availableGroups = ref(['None', 'Work', 'Personal', 'Study'])

// 新しいグループを追加
const addNewGroup = () => {
  const newGroupName = prompt('新しいグループ名を入力してください:')
  if (newGroupName && !availableGroups.value.includes(newGroupName)) {
    availableGroups.value.push(newGroupName)
    group.value = newGroupName
  }
}

// タグを追加
const addTag = () => {
  if (newTag.value && !tags.value.includes(newTag.value)) {
    tags.value.push(newTag.value.trim())
    newTag.value = ''
  }
}

// タグを削除
const removeTag = (tag) => {
  tags.value = tags.value.filter(t => t !== tag)
}

// マークダウンレンダリング
const renderedContent = computed(() => {
  try {
    return marked(content.value)
  } catch (e) {
    console.error('Markdown parsing error:', e)
    return '<p>レンダリングエラー</p>'
  }
})

// ドキュメントの保存
const saveDocument = () => {
  const id = route.params.id
  
  // メタデータの保存
  const meta = {
    title: title.value,
    createdAt: localStorage.getItem(`document_meta_${id}`) 
      ? JSON.parse(localStorage.getItem(`document_meta_${id}`)).createdAt 
      : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    group: group.value,
    tags: tags.value
  }
  
  localStorage.setItem(`document_meta_${id}`, JSON.stringify(meta))
  localStorage.setItem(`document_content_${id}`, content.value)
  
  alert('ドキュメントが保存されました')
}

// 自動保存（下書き）
const autoSave = debounce(() => {
  const id = route.params.id
  localStorage.setItem(`document_content_${id}`, content.value)
  localStorage.setItem(`document_meta_${id}`, JSON.stringify({
    title: title.value,
    createdAt: localStorage.getItem(`document_meta_${id}`) 
      ? JSON.parse(localStorage.getItem(`document_meta_${id}`)).createdAt 
      : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    group: group.value,
    tags: tags.value
  }))
  console.log('Auto-saved document')
}, 2000)

// 内容変更時に自動保存
watch([content, title, tags, group], () => {
  autoSave()
}, { deep: true })

// ドキュメントの読み込み
onMounted(() => {
  const id = route.params.id
  
  // コンテンツの読み込み
  const savedContent = localStorage.getItem(`document_content_${id}`)
  if (savedContent) {
    content.value = savedContent
  } else {
    content.value = '# Untitled Document\n\nStart typing here...'
  }
  
  // メタデータの読み込み
  const savedMeta = localStorage.getItem(`document_meta_${id}`)
  if (savedMeta) {
    try {
      const meta = JSON.parse(savedMeta)
      title.value = meta.title || 'Untitled Document'
      tags.value = meta.tags || []
      group.value = meta.group || 'None'
      
      // グループが存在しなければ追加
      if (meta.group && !availableGroups.value.includes(meta.group)) {
        availableGroups.value.push(meta.group)
      }
    } catch (e) {
      console.error('Error parsing document metadata', e)
    }
  }
})

// ホームに戻る
const goToHome = () => {
  router.push('/')
}
</script>

<template>
  <div class="editor-container">
    <header class="editor-header">
      <div class="back-button" @click="goToHome">
        <span>&larr;</span> ホームに戻る
      </div>
      
      <div class="document-info">
        <input 
          v-model="title" 
          placeholder="ドキュメントタイトル" 
          class="title-input"
        />
        
        <div class="document-meta">
          <div class="group-selector">
            <select v-model="group">
              <option v-for="g in availableGroups" :key="g" :value="g">{{ g }}</option>
            </select>
            <button @click="addNewGroup" class="small-btn">+</button>
          </div>
          
          <div class="tag-container">
            <div v-for="tag in tags" :key="tag" class="tag">
              {{ tag }}
              <span @click="removeTag(tag)" class="tag-delete">&times;</span>
            </div>
            
            <div class="add-tag">
              <input 
                v-model="newTag" 
                placeholder="新しいタグ" 
                @keyup.enter="addTag"
              />
              <button @click="addTag" class="small-btn">+</button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="actions">
        <button @click="saveDocument" class="save-btn">保存</button>
      </div>
    </header>
    
    <div class="editor-layout">
      <div class="markdown-input">
        <textarea 
          v-model="content" 
          placeholder="マークダウンを入力してください..."
          spellcheck="false"
        ></textarea>
      </div>
      <div class="markdown-preview" v-html="renderedContent"></div>
    </div>
  </div>
</template>

<style scoped>
.editor-container {
  padding: 10px;
  max-width: 1400px;
  margin: 0 auto;
  height: calc(100vh - 20px);
  display: flex;
  flex-direction: column;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #ddd;
  margin-bottom: 10px;
}

.back-button {
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.back-button:hover {
  background-color: #f0f0f0;
}

.document-info {
  flex: 1;
  padding: 0 20px;
}

.title-input {
  font-size: 20px;
  font-weight: bold;
  border: none;
  border-bottom: 2px solid transparent;
  width: 100%;
  padding: 5px;
  margin-bottom: 10px;
  transition: border-color 0.3s;
}

.title-input:focus {
  outline: none;
  border-bottom: 2px solid #4CAF50;
}

.document-meta {
  display: flex;
  gap: 20px;
  align-items: center;
}

.group-selector {
  display: flex;
  align-items: center;
}

.group-selector select {
  padding: 5px;
  border-radius: 4px;
  margin-right: 5px;
}

.tag-container {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-items: center;
}

.tag {
  background-color: #e0f7fa;
  color: #00838f;
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 12px;
  display: flex;
  align-items: center;
}

.tag-delete {
  margin-left: 5px;
  cursor: pointer;
  font-weight: bold;
}

.add-tag {
  display: flex;
  align-items: center;
}

.add-tag input {
  padding: 3px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-right: 5px;
  font-size: 12px;
  width: 100px;
}

.small-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background-color: #4CAF50;
  color: white;
  cursor: pointer;
  font-size: 14px;
  padding: 0;
}

.actions {
  display: flex;
  gap: 10px;
}

.save-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.save-btn:hover {
  background-color: #45a049;
}

.editor-layout {
  display: flex;
  gap: 20px;
  flex: 1;
  overflow: hidden;
}

.markdown-input, .markdown-preview {
  flex: 1;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 10px;
  overflow: auto;
}

.markdown-input textarea {
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  resize: none;
  font-family: monospace;
  font-size: 14px;
}

.markdown-preview {
  background-color: #fbfbfb;
}

/* マークダウンスタイル */
.markdown-preview :deep(h1) {
  border-bottom: 2px solid #eee;
  padding-bottom: 10px;
  margin-top: 20px;
}

.markdown-preview :deep(h2) {
  border-bottom: 1px solid #eee;
  padding-bottom: 5px;
  margin-top: 15px;
}

.markdown-preview :deep(blockquote) {
  border-left: 4px solid #ddd;
  padding-left: 15px;
  color: #666;
  margin: 15px 0;
}

.markdown-preview :deep(code) {
  background-color: #f0f0f0;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
}

.markdown-preview :deep(pre) {
  background-color: #f5f5f5;
  padding: 15px;
  border-radius: 5px;
  overflow-x: auto;
  margin: 15px 0;
}

.markdown-preview :deep(pre code) {
  background-color: transparent;
  padding: 0;
  border-radius: 0;
  display: block;
}

.markdown-preview :deep(a) {
  color: #0066cc;
  text-decoration: none;
}

.markdown-preview :deep(a:hover) {
  text-decoration: underline;
}

.markdown-preview :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 15px 0;
}

.markdown-preview :deep(th), .markdown-preview :deep(td) {
  border: 1px solid #ddd;
  padding: 8px;
}

.markdown-preview :deep(th) {
  background-color: #f2f2f2;
}

.markdown-preview :deep(tr:nth-child(even)) {
  background-color: #f8f8f8;
}

.markdown-preview :deep(img) {
  max-width: 100%;
  display: block;
  margin: 15px auto;
}

.markdown-preview :deep(ul), .markdown-preview :deep(ol) {
  padding-left: 25px;
}
</style>