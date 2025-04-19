<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const documents = ref([])

// ドキュメントの読み込み
const loadDocuments = () => {
  const docs = []
  // ローカルストレージからすべてのドキュメントを取得
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key.startsWith('document_meta_')) {
      try {
        const meta = JSON.parse(localStorage.getItem(key))
        docs.push({
          id: key.replace('document_meta_', ''),
          title: meta.title || 'Untitled Document',
          updatedAt: new Date(meta.updatedAt).toLocaleString(),
          group: meta.group || 'None',
          tags: meta.tags || []
        })
      } catch (e) {
        console.error('Error parsing document metadata', e)
      }
    }
  }
  // 更新日時で降順ソート
  docs.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  documents.value = docs
}

// 新規ドキュメントの作成
const createNewDocument = () => {
  const id = Date.now().toString()
  const meta = {
    title: 'Untitled Document',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    group: 'None',
    tags: []
  }
  localStorage.setItem(`document_meta_${id}`, JSON.stringify(meta))
  localStorage.setItem(`document_content_${id}`, '# Untitled Document\n\nStart typing here...')
  router.push(`/editor/${id}`)
}

// ドキュメントを開く
const openDocument = (id) => {
  router.push(`/editor/${id}`)
}

// ドキュメントを削除
const deleteDocument = (id, event) => {
  event.stopPropagation()
  if (confirm('このドキュメントを削除してもよろしいですか？')) {
    localStorage.removeItem(`document_meta_${id}`)
    localStorage.removeItem(`document_content_${id}`)
    loadDocuments()
  }
}

// JSONファイルとしてエクスポート
const exportDocument = (id, event) => {
  event.stopPropagation()
  try {
    const meta = JSON.parse(localStorage.getItem(`document_meta_${id}`))
    const content = localStorage.getItem(`document_content_${id}`)
    
    const documentData = {
      meta,
      content
    }
    
    const blob = new Blob([JSON.stringify(documentData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${meta.title.replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    alert('ドキュメントのエクスポート中にエラーが発生しました: ' + e.message)
  }
}

// JSONファイルからインポート
const importDocument = (event) => {
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
      
      const id = Date.now().toString()
      localStorage.setItem(`document_meta_${id}`, JSON.stringify({
        ...data.meta,
        importedAt: new Date().toISOString()
      }))
      localStorage.setItem(`document_content_${id}`, data.content)
      
      alert('ドキュメントをインポートしました')
      loadDocuments()
    } catch (e) {
      alert('ドキュメントの読み込み中にエラーが発生しました: ' + e.message)
    }
  }
  reader.readAsText(file)
}

// フィルタリングのためのステート
const filterText = ref('')
const filterGroup = ref('All')
const filterTag = ref('')

// 表示するグループの一覧
const groups = ref(['All'])

// グループ一覧を取得
const loadGroups = () => {
  const uniqueGroups = new Set(['All'])
  documents.value.forEach(doc => {
    if (doc.group && doc.group !== 'None') {
      uniqueGroups.add(doc.group)
    }
  })
  groups.value = Array.from(uniqueGroups)
}

// フィルターされたドキュメント
const filteredDocuments = computed(() => {
  return documents.value.filter(doc => {
    // テキストフィルター
    const textMatch = doc.title.toLowerCase().includes(filterText.value.toLowerCase())
    
    // グループフィルター
    const groupMatch = filterGroup.value === 'All' || doc.group === filterGroup.value
    
    // タグフィルター
    const tagMatch = !filterTag.value || (doc.tags && doc.tags.some(tag => 
      tag.toLowerCase().includes(filterTag.value.toLowerCase())
    ))
    
    return textMatch && groupMatch && tagMatch
  })
})

// すべてのドキュメントをJSONとしてエクスポート
const exportAllDocuments = () => {
  try {
    const allDocs = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key.startsWith('document_meta_')) {
        const id = key.replace('document_meta_', '')
        const meta = JSON.parse(localStorage.getItem(key))
        const content = localStorage.getItem(`document_content_${id}`)
        
        allDocs.push({
          id,
          meta,
          content
        })
      }
    }
    
    const blob = new Blob([JSON.stringify(allDocs, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `martion_all_documents_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    alert('すべてのドキュメントをエクスポートしました')
  } catch (e) {
    alert('エクスポート中にエラーが発生しました: ' + e.message)
  }
}

// 複数のJSONドキュメントをインポート
const importMultipleDocuments = (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)
      if (!Array.isArray(data)) {
        alert('無効なドキュメント形式です。複数ドキュメントの配列が必要です。')
        return
      }
      
      let importedCount = 0
      
      data.forEach(doc => {
        if (doc.meta && doc.content) {
          const id = doc.id || Date.now().toString() + Math.random().toString(36).substr(2, 5)
          localStorage.setItem(`document_meta_${id}`, JSON.stringify({
            ...doc.meta,
            importedAt: new Date().toISOString()
          }))
          localStorage.setItem(`document_content_${id}`, doc.content)
          importedCount++
        }
      })
      
      alert(`${importedCount}件のドキュメントをインポートしました`)
      loadDocuments()
    } catch (e) {
      alert('ドキュメントの読み込み中にエラーが発生しました: ' + e.message)
    }
  }
  reader.readAsText(file)
}

onMounted(() => {
  loadDocuments()
  loadGroups()
})
</script>

<template>
  <div class="home">
    <h1>Martion - Markdown Editor</h1>
    
    <div class="top-actions">
      <button @click="createNewDocument" class="create-btn">
        <span class="icon">+</span> 新規ドキュメント作成
      </button>
      
      <div class="import-export">
        <label class="import-btn">
          <input type="file" accept=".json" @change="importDocument" class="hidden-input">
          ドキュメントをインポート
        </label>
        <button @click="exportAllDocuments" class="export-btn">すべてエクスポート</button>
        <label class="import-btn">
          <input type="file" accept=".json" @change="importMultipleDocuments" class="hidden-input">
          複数インポート
        </label>
      </div>
    </div>
    
    <div class="filters">
      <div class="filter-item">
        <input 
          v-model="filterText" 
          placeholder="ドキュメントを検索..." 
          class="search-input"
        />
      </div>
      
      <div class="filter-item">
        <select v-model="filterGroup" class="filter-select">
          <option v-for="group in groups" :key="group" :value="group">
            {{ group }}
          </option>
        </select>
      </div>
      
      <div class="filter-item">
        <input 
          v-model="filterTag" 
          placeholder="タグで検索..." 
          class="search-input"
        />
      </div>
    </div>
    
    <div class="documents-list">
      <div 
        v-for="doc in filteredDocuments" 
        :key="doc.id" 
        class="document-item"
        @click="openDocument(doc.id)"
      >
        <div class="doc-title">{{ doc.title }}</div>
        <div class="doc-meta">
          <span class="doc-group">{{ doc.group }}</span>
          <span class="doc-date">{{ doc.updatedAt }}</span>
        </div>
        <div class="doc-tags">
          <span 
            v-for="tag in doc.tags" 
            :key="tag" 
            class="tag"
          >
            {{ tag }}
          </span>
        </div>
        <div class="doc-actions">
          <button 
            @click="exportDocument(doc.id, $event)"
            class="export-doc-btn"
          >
            エクスポート
          </button>
          <button 
            @click="deleteDocument(doc.id, $event)"
            class="delete-btn"
          >
            削除
          </button>
        </div>
      </div>
      
      <div v-if="filteredDocuments.length === 0" class="no-documents">
        表示するドキュメントがありません。新規作成ボタンからドキュメントを作成してください。
      </div>
    </div>
  </div>
</template>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
}

.top-actions {
  display: flex;
  justify-content: space-between;
  margin-bottom: 30px;
}

.create-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  transition: background-color 0.3s;
}

.create-btn:hover {
  background-color: #45a049;
}

.icon {
  font-size: 18px;
  margin-right: 8px;
}

.import-export {
  display: flex;
  gap: 10px;
}

.import-btn, .export-btn {
  background-color: #2196F3;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.import-btn:hover, .export-btn:hover {
  background-color: #0b7dda;
}

.hidden-input {
  display: none;
}

.filters {
  display: flex;
  margin-bottom: 20px;
  gap: 10px;
}

.filter-item {
  flex: 1;
}

.search-input, .filter-select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.documents-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.document-item {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 15px;
  cursor: pointer;
  transition: box-shadow 0.3s, transform 0.3s;
  position: relative;
}

.document-item:hover {
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.doc-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 14px;
  color: #666;
}

.doc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 10px;
  margin-bottom: 40px;
}

.tag {
  background-color: #e0f7fa;
  color: #00838f;
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 12px;
}

.doc-actions {
  position: absolute;
  bottom: 10px;
  right: 10px;
  display: flex;
  gap: 5px;
}

.delete-btn, .export-doc-btn {
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  cursor: pointer;
  font-size: 12px;
  opacity: 0.8;
  transition: opacity 0.3s;
}

.export-doc-btn {
  background-color: #2196F3;
  color: white;
}

.delete-btn {
  background-color: #f44336;
  color: white;
}

.document-item:hover .delete-btn, .document-item:hover .export-doc-btn {
  opacity: 1;
}

.no-documents {
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px;
  color: #666;
  font-style: italic;
  border: 1px dashed #ddd;
  border-radius: 4px;
}
</style>
