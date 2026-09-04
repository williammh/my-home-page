export interface LinkNode {
  id: string
  type: 'link'
  name: string
  url: string
}

export interface FolderNode {
  id: string
  type: 'folder'
  name: string
  icon: string
  children: TreeNode[]
}

export type TreeNode = FolderNode | LinkNode

export interface Settings {
  name: string
  timeZone: string
  dateFormat: string
  backgroundImage: string
  backgroundColor: string
  textTheme: 'light' | 'dark'
  glass: boolean
  openInNewTab: boolean
}
