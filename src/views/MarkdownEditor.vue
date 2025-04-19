<script setup>
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
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
const saveDocument = (navigateHome = false) => {
  const id = route.params.id
  
  // メタデータの保存
  const meta = {
    title: title.value,
    createdAt: localStorage.getItem(`document_meta_${id}`) 
      ? JSON.parse(localStorage.getItem(`document_meta_${id}`)).createdAt 
      : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    group: group.value,
    tags: tags.value,
    isNew: false // 保存したら新規フラグを外す
  }
  
  localStorage.setItem(`document_meta_${id}`, JSON.stringify(meta))
  localStorage.setItem(`document_content_${id}`, content.value)
  
  // 保存後に状態を更新
  hasUnsavedChanges.value = false
  isNewDocument.value = false
  originalContent.value = content.value
  originalTitle.value = title.value
  originalGroup.value = group.value
  originalTags.value = [...tags.value]
  
  if (!navigateHome) {
    alert('ドキュメントが保存されました')
  } else {
    router.push('/')
  }
}

// JSONファイルに保存
const exportToJson = () => {
  const id = route.params.id
  
  try {
    // メタデータを取得または作成
    let meta = {}
    if (localStorage.getItem(`document_meta_${id}`)) {
      meta = JSON.parse(localStorage.getItem(`document_meta_${id}`))
    } else {
      meta = {
        title: title.value,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        group: group.value,
        tags: tags.value
      }
    }
    
    // ドキュメントデータを作成
    const documentData = {
      meta: {
        ...meta,
        exportedAt: new Date().toISOString()
      },
      content: content.value
    }
    
    // JSONとしてエクスポート
    const blob = new Blob([JSON.stringify(documentData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${meta.title.replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    alert('ドキュメントをJSONファイルにエクスポートしました')
  } catch (e) {
    alert('エクスポート中にエラーが発生しました: ' + e.message)
  }
}

// JSONファイルからインポート
const importFromJson = (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)
      if (!data.meta || !data.content) {
        alert('無効なドキュメント形式です')
        return
      }
      
      // 現在のドキュメントを更新
      if (data.meta.title) title.value = data.meta.title
      if (data.meta.group) group.value = data.meta.group
      if (data.meta.tags) tags.value = data.meta.tags
      content.value = data.content
      
      // 即時保存
      saveDocument()
      
      alert('ドキュメントをインポートしました')
    } catch (e) {
      alert('インポート中にエラーが発生しました: ' + e.message)
    }
  }
  reader.readAsText(file)
}

// 自動保存（下書き）
const autoSave = debounce(() => {
  if (disableAutoSave.value) return

  const id = route.params.id
  
  // 新規作成文書ではない場合のみ自動保存
  if (!isNewDocument.value) {
    localStorage.setItem(`document_content_${id}`, content.value)
    localStorage.setItem(`document_meta_${id}`, JSON.stringify({
      title: title.value,
      createdAt: localStorage.getItem(`document_meta_${id}`) 
        ? JSON.parse(localStorage.getItem(`document_meta_${id}`)).createdAt 
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      group: group.value,
      tags: tags.value,
      isNew: false
    }))
    console.log('Auto-saved document')
  }
}, 2000)

// 内容変更時に自動保存
watch([content, title, tags, group], () => {
  autoSave()
}, { deep: true })

// 編集されたかどうかの状態を追跡
const isNewDocument = ref(false)
const hasUnsavedChanges = ref(false)
const originalContent = ref('')
const originalTitle = ref('')
const originalGroup = ref('')
const originalTags = ref([])

// 自動保存を一時的に無効化するフラグ
const disableAutoSave = ref(false)

// 変更監視
watch([content, title, group, tags], () => {
  // 元の内容と比較して変更があるかチェック
  hasUnsavedChanges.value = 
    content.value !== originalContent.value ||
    title.value !== originalTitle.value ||
    group.value !== originalGroup.value ||
    JSON.stringify(tags.value) !== JSON.stringify(originalTags.value)
  
  // 自動保存処理（無効化されていない場合のみ）
  if (!disableAutoSave.value) {
    autoSave()
  }
}, { deep: true })

// ホームに戻る前に確認
const goToHome = () => {
  if (hasUnsavedChanges.value) {
    const id = route.params.id
    
    if (isNewDocument.value) {
      // 新規ドキュメントの場合
      if (confirm('新規ドキュメントが保存されていません。破棄しますか？')) {
        // 自動保存を無効化して、LocalStorageから削除
        disableAutoSave.value = true
        localStorage.removeItem(`document_meta_${id}`)
        localStorage.removeItem(`document_content_${id}`)
        router.push('/')
      }
    } else {
      // 既存ドキュメントの場合
      if (confirm('変更が保存されていません。保存して戻りますか？')) {
        // 自動保存を無効化して、明示的に保存してから戻る
        disableAutoSave.value = true
        saveDocument(true)  // 第2引数でホームに戻るフラグをtrueに
      }
    }
  } else {
    // 変更がない場合はそのまま戻る
    router.push('/')
  }
}

// ドキュメントの読み込み
onMounted(() => {
  const id = route.params.id
  
  // コンテンツの読み込み
  const savedContent = localStorage.getItem(`document_content_${id}`)
  const savedMeta = localStorage.getItem(`document_meta_${id}`)
  
  try {
    // メタデータがある場合はパース
    if (savedMeta) {
      const meta = JSON.parse(savedMeta)
      
      // 新規ドキュメントかどうかの判定
      isNewDocument.value = meta.isNew === true
      
      title.value = meta.title || 'Untitled Document'
      originalTitle.value = title.value
      
      tags.value = meta.tags || []
      originalTags.value = [...tags.value]
      
      group.value = meta.group || 'None'
      originalGroup.value = group.value
      
      // グループが存在しなければ追加
      if (meta.group && !availableGroups.value.includes(meta.group)) {
        availableGroups.value.push(meta.group)
      }
    } else {
      // メタデータがない場合は新規とみなす
      isNewDocument.value = true
      title.value = 'Untitled Document'
      originalTitle.value = title.value
    }
    
    // コンテンツの設定
    if (savedContent) {
      content.value = savedContent
      originalContent.value = savedContent
    } else {
      content.value = '# Untitled Document\n\nStart typing here...'
      originalContent.value = content.value
    }
  } catch (e) {
    console.error('Error loading document:', e)
    // エラー時はデフォルト値を設定
    isNewDocument.value = true
    content.value = '# Untitled Document\n\nStart typing here...'
    originalContent.value = content.value
    title.value = 'Untitled Document'
    originalTitle.value = title.value
  }

  // 初期状態では未保存変更なし
  hasUnsavedChanges.value = false
  
  // ブラウザの戻るボタン対策
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  // イベントリスナーのクリーンアップ
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

// ページ離脱時の確認
const handleBeforeUnload = (e) => {
  if (hasUnsavedChanges.value) {
    const message = '変更が保存されていません。ページを離れますか？'
    e.returnValue = message
    return message
  }
}

// カスタムルーターナビゲーションガード
router.beforeEach((to, from, next) => {
  // 現在のページから離れようとしている場合
  if (from.path.includes('/editor/') && from.params.id === route.params.id) {
    // エディタページから離れようとしている時
    if (hasUnsavedChanges.value) {
      if (isNewDocument.value) {
        if (confirm('新規ドキュメントが保存されていません。破棄しますか？')) {
          // 新規ドキュメントの場合、LocalStorageから削除
          const id = route.params.id
          localStorage.removeItem(`document_meta_${id}`)
          localStorage.removeItem(`document_content_${id}`)
          next()
        } else {
          next(false)
        }
      } else {
        if (confirm('変更が保存されていません。保存して移動しますか？')) {
          // 既存ドキュメントの場合、保存してから移動
          disableAutoSave.value = true
          saveDocument(false)
          next()
        } else {
          next(false)
        }
      }
    } else {
      next()
    }
  } else {
    next()
  }
})

// HTMLファイルにエクスポート
const exportToHTML = () => {
  const id = route.params.id
  
  try {
    // HTMLドキュメントを作成
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
          <p>Last Updated: ${new Date().toLocaleString()}</p>
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
    
    // HTMLファイルとしてエクスポート
    const blob = new Blob([htmlDocument], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.value.replace(/\s+/g, '_')}.html`
    a.click()
    URL.revokeObjectURL(url)
    
    alert('HTMLファイルとしてエクスポートしました')
  } catch (e) {
    alert('エクスポート中にエラーが発生しました: ' + e.message)
  }
}

// プレビューモードで開く
const viewDocument = () => {
  const id = route.params.id
  saveDocument() // 現在の状態を保存してから閲覧モードに移動
  router.push(`/view/${id}`)
}
</script>

<template>
  <div class="editor-container">
    <header class="editor-header">
      <div class="back-button" @click="goToHome">
        <span>&larr;</span> ホームに戻る
        <span v-if="hasUnsavedChanges" class="unsaved-indicator">*</span>
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
        <button @click="viewDocument" class="view-btn">閲覧</button>
        <button @click="exportToHTML" class="html-btn">HTMLエクスポート</button>
        <button @click="exportToJson" class="export-btn">JSONエクスポート</button>
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
  display: flex;
  align-items: center;
  gap: 5px;
}

.back-button:hover {
  background-color: #f0f0f0;
}

.unsaved-indicator {
  color: #f44336;
  font-weight: bold;
  font-size: 18px;
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

.save-btn, .export-btn, .html-btn, .view-btn {
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
  font-size: 14px;
}

.save-btn {
  background-color: #4CAF50;
  color: white;
}

.save-btn:hover {
  background-color: #45a049;
}

.export-btn {
  background-color: #2196F3;
  color: white;
}

.export-btn:hover {
  background-color: #0b7dda;
}

.html-btn {
  background-color: #FF9800;
  color: white;
}

.html-btn:hover {
  background-color: #e68900;
}

.view-btn {
  background-color: #673AB7;
  color: white;
}

.view-btn:hover {
  background-color: #5e35a7;
}

.hidden-input {
  display: none;
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