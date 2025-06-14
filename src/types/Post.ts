export interface Post {
  id: string;
  title: string;
  content: string;
  date: string;
  tags: string[];
  category: string;
  route?: string;      
}