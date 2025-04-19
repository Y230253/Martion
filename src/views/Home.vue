<script setup>
import { ref, onMounted } from 'vue'
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

onMounted(() => {
  loadDocuments()
  loadGroups()
})
</script>

<template>
  <div class="home">
    <h1>Martion - Markdown Editor</h1>
    
    <div class="actions">
      <button @click="createNewDocument" class="create-btn">
        <span class="icon">+</span> 新規ドキュメント作成
      </button>
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
        <button 
          @click="deleteDocument(doc.id, $event)"
          class="delete-btn"
        >
          削除
        </button>
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

.actions {
  display: flex;
  justify-content: center;
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
}

.tag {
  background-color: #e0f7fa;
  color: #00838f;
  padding: 3px 8px;
  border-radius: 20px;
  font-size: 12px;
}

.delete-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 5px 10px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.3s;
}

.document-item:hover .delete-btn {
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
