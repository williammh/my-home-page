import type { Messages } from './en'

const ar: Messages = {
  greetingNight: 'تصبح على خير',
  greetingMorning: 'صباح الخير',
  greetingAfternoon: 'مساء الخير',
  greetingEvening: 'مساء الخير',

  // Arabic comma (U+060C), and the sentence reads right-to-left in source
  // order — the browser's bidi algorithm handles the visual ordering.
  salutation: (greeting) => `${greeting}.`,
  salutationNamed: (greeting, name) => `${greeting}، ${name}.`,

  clockBefore: (date) => `اليوم ${date}، والساعة`,
  clockAfter: (meridiem, zone) => `${meridiem ? `${meridiem} ` : ''}(${zone}).`,

  shortcuts: 'الاختصارات',
  bookmarks: 'الإشارات المرجعية',
  searchPlaceholder: 'البحث في الإشارات المرجعية',
  clear: 'مسح',

  settings: 'الإعدادات',
  edit: 'تعديل',
  rename: 'إعادة تسمية',
  delete: 'حذف',
  cancel: 'إلغاء',
  save: 'حفظ',
  dismiss: 'إغلاق',
  import: 'استيراد',
  export: 'تصدير',
  addShortcut: 'إضافة اختصار',
  addFolder: 'إضافة مجلد',
  addLink: 'إضافة رابط',
  newFolder: 'مجلد جديد',
  newBookmark: 'إشارة مرجعية جديدة',
  editShortcuts: 'تعديل الاختصارات والإشارات المرجعية',
  doneEditingShortcuts: 'إنهاء التعديل',
  dropToTopLevel: 'أفلت هنا للنقل إلى المستوى الأعلى',
  treeEmpty: 'لا يوجد شيء هنا بعد — أضف مجلدًا أو إشارة مرجعية.',
  treeNoMatches: (query) => `لا توجد مجلدات أو إشارات مرجعية تطابق «${query}».`,

  // Arabic has six plural categories; Intl.PluralRules picks the right one.
  // `zero` is handled as its own sentence rather than as a count phrase: the
  // count construction would read "imported any item" instead of "no items
  // were imported".
  importedItems: (n) => {
    if (n === 0) return 'لم يتم استيراد أي عنصر.'
    const forms: Record<string, string> = {
      one: 'عنصر واحد', two: 'عنصرين',
      few: `${n} عناصر`, many: `${n} عنصرًا`, other: `${n} عنصر`,
    }
    return `تم استيراد ${forms[new Intl.PluralRules('ar').select(n)] ?? `${n} عنصر`}.`
  },
  exportedItems: (n) => {
    if (n === 0) return 'لم يتم تصدير أي عنصر.'
    const forms: Record<string, string> = {
      one: 'عنصر واحد', two: 'عنصرين',
      few: `${n} عناصر`, many: `${n} عنصرًا`, other: `${n} عنصر`,
    }
    return `تم تصدير ${forms[new Intl.PluralRules('ar').select(n)] ?? `${n} عنصر`}.`
  },
  importEmpty: 'لم يتم العثور على إشارات مرجعية أو مجلدات في هذا الملف.',
  importInvalid: 'هذا الملف ليس JSON صالحًا.',
  exportEmpty: 'لا يوجد شيء للتصدير بعد.',

  editFolder: 'تعديل المجلد',
  editLink: 'تعديل الرابط',
  newLink: 'رابط جديد',
  fieldName: 'الاسم',
  fieldOptional: '(اختياري)',
  fieldIcon: 'الأيقونة',
  fieldUrl: 'الرابط',
  folderNamePlaceholder: 'العمل',
  urlPlaceholder: 'example.com',
  linkNamePlaceholder: 'تلقائي من الرابط',
  untitledFolder: 'مجلد بدون عنوان',

  fieldYourName: 'اسمك',
  fieldLanguage: 'اللغة',
  fieldTimeZone: 'المنطقة الزمنية',
  fieldDateFormat: 'تنسيق التاريخ',
  fieldTextColor: 'لون النص',
  fieldGlass: 'تأثير الزجاج',
  fieldOpenLinksIn: 'فتح الروابط في',
  fieldBackground: 'الخلفية',
  languageSystem: (language) => `الإعداد الافتراضي للنظام (${language})`,
  textLight: 'فاتح',
  textDark: 'داكن',
  on: 'تشغيل',
  off: 'إيقاف',
  sameTab: 'نفس التبويب',
  newTab: 'تبويب جديد',
  backgroundNone: 'بدون',
  backgroundImage: 'صورة',
  backgroundColor: 'لون',
  glassHint: 'أسطح شفافة ومموهة للساعة وشريط البحث والإشارات المرجعية.',
  openLinksHint: 'ينطبق على الاختصارات والإشارات المرجعية. النقر مع Ctrl/Cmd (أو النقر الأوسط) يقوم بالعكس.',
  chooseFromDevice: 'الاختيار من الجهاز',
  imageSelected: 'تم اختيار صورة من هذا الجهاز',
  imageUrlPlaceholder: 'https://example.com/image.jpg',
  imageTooLarge: 'الصورة كبيرة جدًا (3 ميغابايت كحد أقصى).',
  resetToDefaults: 'إعادة التعيين إلى الافتراضي',
}

export default ar
