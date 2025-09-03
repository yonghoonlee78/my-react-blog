import { Post } from '../types/Post'

// 임시 메모리 저장소
let memoryPosts: Post[] = []

export async function getAllPosts(): Promise<Post[]> {
  console.log('getAllPosts - 메모리에서 가져오기:', memoryPosts)
  return [...memoryPosts]
}

export async function createPost(post: Omit<Post, 'id'>): Promise<Post | null> {
  const newPost: Post = {
    ...post,
    id: Date.now().toString(),
    date: new Date().toISOString().split('T')[0]
  }
  
  memoryPosts.unshift(newPost)
  console.log('새 포스트 생성됨:', newPost)
  return newPost
}

export async function getCategories(): Promise<string[]> {
  const categories = [...new Set(memoryPosts.map(p => p.category))]
  return categories
}

export async function getTags(): Promise<string[]> {
  const tags = [...new Set(memoryPosts.flatMap(p => p.tags))]
  return tags
}

export async function deletePost(id: string): Promise<boolean> {
  const index = memoryPosts.findIndex(p => p.id === id)
  if (index !== -1) {
    memoryPosts.splice(index, 1)
    return true
  }
  return false
}

export async function updatePost(id: string, post: Partial<Post>): Promise<Post | null> { return null }
export async function getPostById(id: string): Promise<Post | null> { return null }