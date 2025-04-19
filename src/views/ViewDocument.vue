<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import { watch } from 'vue'

// マークダウンレンダリングの設定
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
const id = route.params.id
const title = ref('')
const group = ref('')
const tags = ref([])
const updatedAt = ref('')
const renderedContent = ref('')
const loading = ref(true)
const error = ref(null)

// ドキュメントの読み込み
const loadDocument = () => {
  loading.value = true
  error.value = null
  
  try {
    // メタデータの取得
    const metaJson = localStorage.getItem(`document_meta_${id}`)
    if (!metaJson) {
      throw new Error('ドキュメントが見つかりません')
    }
    
    const meta = JSON.parse(metaJson)
    title.value = meta.title || 'Untitled Document'
    group.value = meta.group || 'None'
    tags.value = meta.tags || []
    updatedAt.value = meta.updatedAt ? new Date(meta.updatedAt).toLocaleString() : '不明'
    
    // コンテンツの取得とレンダリング
    const content = localStorage.getItem(`document_content_${id}`)
    if (!content) {
      throw new Error('ドキュメントの内容が見つかりません')
    }
    
    renderedContent.value = marked(content)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// HTMLとしてエクスポート
const exportAsHTML = () => {
  try {
    const htmlDocument = `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title.value}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
          }
          h1, h2, h3, h4, h5, h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
          }
          h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: .3em; }
          h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: .3em; }
          code {
            background-color: rgba(27,31,35,.05);
            border-radius: 3px;
            font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;
            padding: .2em .4em;
            font-size: 85%;
          }
          pre {
            background-color: #f6f8fa;
            border-radius: 3px;
            padding: 16px;
            overflow: auto;
            line-height: 1.45;
          }
          pre code {
            background-color: transparent;
            padding: 0;
            font-size: 100%;
          }
          blockquote {
            border-left: .25em solid #dfe2e5;
            padding: 0 1em;
            color: #6a737d;
            margin: 0 0 16px;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 16px;
          }
          table th, table td {
            padding: 6px 13px;
            border: 1px solid #dfe2e5;
          }
          table tr {
            background-color: #fff;
            border-top: 1px solid #c6cbd1;
          }
          table tr:nth-child(2n) {
            background-color: #f6f8fa;
          }
          img {
            max-width: 100%;
          }
          .meta-info {
            margin-bottom: 20px;
            font-size: 0.9em;
            color: #666;
          }
          .tag {
            display: inline-block;
            background-color: #e0f7fa;
            color: #00838f;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            margin-right: 5px;
          }
        </style>
      </head>
      <body>
        <h1>${title.value}</h1>
        <div class="meta-info">
          <p>Group: ${group.value}</p>
          <p>Last Updated: ${updatedAt.value}</p>
          <p>Tags: ${tags.value.length > 0 ? 
            tags.value.map(tag => `<span class="tag">${tag}</span>`).join(' ') : 
            'None'}</p>
        </div>
        <hr>
        <div class="content">
          ${renderedContent.value}
        </div>
      </body>
      </html>
    `
    
    const blob = new Blob([htmlDocument], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.value.replace(/\s+/g, '_')}.html`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    alert('HTMLエクスポート中にエラーが発生しました: ' + e.message)
  }
}

// ルート監視でドキュメント更新 - 異なる方法で実装
watch(() => route.params.id, (newId, oldId) => {
  if (newId === oldId && newId) {
    // 同じドキュメントに戻ってきた場合は再読み込み
    loadDocument()
  }
})

// 編集モードに切り替え
const editDocument = () => {
  router.push(`/editor/${id}`)
}

// ホームに戻る
const goToHome = () => {
  router.push('/')
}

// PDF出力（ブラウザの印刷機能を使用）
const printDocument = () => {
  window.print()
}

onMounted(() => {
  loadDocument()
})
</script>

<template>
  <div class="view-container">
    <div class="view-header">
      <div class="back-button" @click="goToHome">
        <span>&larr;</span> ホームに戻る
      </div>
      
      <div class="title-section">
        <h1>{{ title }}</h1>
        <div class="meta-info">
          <span class="group">{{ group }}</span>
          <span class="date">最終更新: {{ updatedAt }}</span>
        </div>
        <div class="tags">
          <span v-for="tag in tags" :key="tag" class="tag">{{ tag }}</span>
        </div>
      </div>
      
      <div class="actions">
        <button @click="editDocument" class="btn edit-btn">編集する</button>
        <button @click="exportAsHTML" class="btn export-btn">HTMLエクスポート</button>
        <button @click="printDocument" class="btn print-btn">印刷/PDF</button>
      </div>
    </div>
    
    <div v-if="loading" class="loading">
      読み込み中...
    </div>
    
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="goToHome" class="btn">ホームに戻る</button>
    </div>
    
    <div v-else class="document-content" v-html="renderedContent"></div>
  </div>
</template>

<style scoped>
.view-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  border-bottom: 1px solid #eee;
  padding-bottom: 20px;
  flex-wrap: wrap;
}

.back-button {
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 4px;
  transition: background-color 0.3s;
  margin-right: 20px;
}

.back-button:hover {
  background-color: #f0f0f0;
}

.title-section {
  flex: 1;
}

.title-section h1 {
  margin: 0 0 10px 0;
  font-size: 28px;
}

.meta-info {
  display: flex;
  gap: 15px;
  color: #666;
  font-size: 14px;
  margin-bottom: 10px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.tag {
  background-color: #e0f7fa;
  color: #00838f;
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 12px;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.btn {
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
  font-size: 14px;
  white-space: nowrap;
}

.edit-btn {
  background-color: #4CAF50;
  color: white;
}

.export-btn {
  background-color: #FF9800;
  color: white;
}

.print-btn {
  background-color: #2196F3;
  color: white;
}

.loading, .error {
  text-align: center;
  padding: 40px;
  font-size: 18px;
  color: #666;
}

.error {
  color: #f44336;
}

.document-content {
  padding: 20px 0;
  line-height: 1.6;
}

.document-content :deep(h1) {
  font-size: 2em;
  margin-top: 28px;
  margin-bottom: 16px;
  border-bottom: 1px solid #eaecef;
  padding-bottom: .3em;
}

.document-content :deep(h2) {
  font-size: 1.5em;
  margin-top: 24px;
  margin-bottom: 16px;
  border-bottom: 1px solid #eaecef;
  padding-bottom: .3em;
}

.document-content :deep(h3) {
  font-size: 1.25em;
  margin-top: 20px;
  margin-bottom: 16px;
}

.document-content :deep(code) {
  background-color: rgba(27,31,35,.05);
  border-radius: 3px;
  font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;
  padding: .2em .4em;
  font-size: 85%;
}

.document-content :deep(pre) {
  background-color: #f6f8fa;
  border-radius: 3px;
  padding: 16px;
  overflow: auto;
  line-height: 1.45;
  margin-bottom: 16px;
}

.document-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
  font-size: 100%;
}

.document-content :deep(blockquote) {
  border-left: .25em solid #dfe2e5;
  color: #6a737d;
  padding: 0 1em;
  margin: 0 0 16px;
}

.document-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 16px;
}

.document-content :deep(table th), 
.document-content :deep(table td) {
  padding: 6px 13px;
  border: 1px solid #dfe2e5;
}

.document-content :deep(table tr) {
  background-color: #fff;
  border-top: 1px solid #c6cbd1;
}

.document-content :deep(table tr:nth-child(2n)) {
  background-color: #f6f8fa;
}

.document-content :deep(img) {
  max-width: 100%;
  box-shadow: 0 3px 10px rgba(0,0,0,0.1);
  margin: 10px 0;
}

.document-content :deep(ul), .document-content :deep(ol) {
  padding-left: 2em;
}

/* 印刷用のスタイル */
@media print {
  .view-header .actions, 
  .view-header .back-button {
    display: none;
  }
  
  .view-container {
    padding: 0;
  }
}
</style>
