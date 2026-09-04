import {
  FolderIcon, StarIcon, BookmarkIcon, BriefcaseIcon, CodeBracketIcon,
  CommandLineIcon, CpuChipIcon, FilmIcon, MusicalNoteIcon, ShoppingCartIcon,
  NewspaperIcon, AcademicCapIcon, BeakerIcon, HeartIcon, HomeIcon,
  GlobeAltIcon, PhotoIcon, CloudIcon, BoltIcon, FireIcon,
  PaintBrushIcon, PuzzlePieceIcon, RocketLaunchIcon, WrenchScrewdriverIcon,
  CurrencyDollarIcon, ChatBubbleLeftRightIcon, EnvelopeIcon, CalendarIcon,
  MapIcon, TrophyIcon, LightBulbIcon, ServerStackIcon,
} from '@heroicons/react/24/outline'

export const ICONS = {
  folder: FolderIcon, star: StarIcon, bookmark: BookmarkIcon,
  briefcase: BriefcaseIcon, code: CodeBracketIcon, terminal: CommandLineIcon,
  chip: CpuChipIcon, film: FilmIcon, music: MusicalNoteIcon,
  cart: ShoppingCartIcon, news: NewspaperIcon, school: AcademicCapIcon,
  beaker: BeakerIcon, heart: HeartIcon, home: HomeIcon, globe: GlobeAltIcon,
  photo: PhotoIcon, cloud: CloudIcon, bolt: BoltIcon, fire: FireIcon,
  brush: PaintBrushIcon, puzzle: PuzzlePieceIcon, rocket: RocketLaunchIcon,
  tools: WrenchScrewdriverIcon, money: CurrencyDollarIcon,
  chat: ChatBubbleLeftRightIcon, mail: EnvelopeIcon, calendar: CalendarIcon,
  map: MapIcon, trophy: TrophyIcon, idea: LightBulbIcon, server: ServerStackIcon,
}

export const ICON_KEYS = Object.keys(ICONS)
export const getIcon = (key?: string) => (key && ICONS[key as keyof typeof ICONS]) || FolderIcon
