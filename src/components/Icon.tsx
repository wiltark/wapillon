// Heroicons wrapper — maps the app's semantic icon names to Heroicons (24/outline)
import {
  AcademicCapIcon,
  ArrowDownIcon,
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowRightStartOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUpIcon,
  BanknotesIcon,
  Bars3Icon,
  BeakerIcon,
  BellIcon,
  BookOpenIcon,
  BugAntIcon,
  BuildingLibraryIcon,
  CakeIcon,
  CalculatorIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  CodeBracketIcon,
  Cog6ToothIcon,
  ComputerDesktopIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  FolderIcon,
  GlobeEuropeAfricaIcon,
  HeartIcon,
  HomeIcon,
  InformationCircleIcon,
  LightBulbIcon,
  LockClosedIcon,
  LockOpenIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  MoonIcon,
  MusicalNoteIcon,
  NewspaperIcon,
  PaintBrushIcon,
  PaperClipIcon,
  PencilIcon,
  ShieldCheckIcon,
  SparklesIcon,
  SunIcon,
  TrophyIcon,
  WrenchScrewdriverIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const ICONS = {
  // Brand
  Logo: AcademicCapIcon,

  // Navigation
  Home: HomeIcon,
  Calendar: CalendarDaysIcon,
  Grades: ChartBarIcon,
  Tasks: ClipboardDocumentCheckIcon,
  Newspaper: NewspaperIcon,
  Clock: ClockIcon,
  Gears: Cog6ToothIcon,
  Menu: Bars3Icon,
  Search: MagnifyingGlassIcon,

  // Arrows / Chevrons
  ChevronLeft: ChevronLeftIcon,
  ChevronRight: ChevronRightIcon,
  ChevronUp: ChevronUpIcon,
  ChevronDown: ChevronDownIcon,
  ArrowLeft: ArrowLeftIcon,
  ArrowUp: ArrowUpIcon,
  ArrowDown: ArrowDownIcon,

  // Actions
  Check: CheckIcon,
  Cross: XMarkIcon,
  Download: ArrowDownTrayIcon,
  ExternalLink: ArrowTopRightOnSquareIcon,
  Logout: ArrowRightStartOnRectangleIcon,

  // UI
  Bell: BellIcon,
  Heart: HeartIcon,
  Info: InformationCircleIcon,
  Lock: LockClosedIcon,
  Unlock: LockOpenIcon,
  Shield: ShieldCheckIcon,
  Sun: SunIcon,
  Moon: MoonIcon,
  Desktop: ComputerDesktopIcon,

  // Content
  Envelope: EnvelopeIcon,
  Document: DocumentTextIcon,
  Folder: FolderIcon,
  Paperclip: PaperClipIcon,
  MapPin: MapPinIcon,
  Cutlery: CakeIcon,

  // Subjects
  GraduationHat: AcademicCapIcon,
  Coefficient: CalculatorIcon,
  Sparkles: SparklesIcon,
  Beaker: BeakerIcon,
  Book: BookOpenIcon,
  Pillar: BuildingLibraryIcon,
  Biology: BugAntIcon,
  Globe: GlobeEuropeAfricaIcon,
  TextBubble: ChatBubbleLeftRightIcon,
  Lightbulb: LightBulbIcon,
  Trophy: TrophyIcon,
  Code: CodeBracketIcon,
  Palette: PaintBrushIcon,
  Music: MusicalNoteIcon,
  PiggyBank: BanknotesIcon,
  Wrench: WrenchScrewdriverIcon,
  Pen: PencilIcon,
};

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  color?: string;
}

export default function Icon({ name, size = 24, className = "", color }: IconProps) {
  const Svg = ICONS[name];

  return (
    <Svg
      aria-hidden
      width={size}
      height={size}
      // Thin 1.5 strokes fade out at the small sizes used across the UI
      strokeWidth={size <= 16 ? 2 : 1.5}
      className={`shrink-0 ${className}`}
      style={color ? { color } : undefined}
    />
  );
}
