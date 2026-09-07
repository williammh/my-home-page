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
  /**
   * BCP 47 tag, or 'system' to follow the browser's language setting.
   *
   * 'system' is the default and is stored as-is rather than resolved once at
   * first load, so a user who changes their OS language sees the page follow.
   */
  locale: string
  timeZone: string
  dateFormat: string
  backgroundImage: string
  backgroundColor: string
  textTheme: 'light' | 'dark'
  glass: boolean
  openInNewTab: boolean
}
