// Flaticon Uicons wrapper — maps old Papicon names to Flaticon CSS class names
// Uses "fi fi-rr-*" (Regular Rounded) style

const ICON_MAP: Record<string, string> = {
  // Navigation
  Home: "home",
  Calendar: "calendar",
  Grades: "chart-histogram",
  Tasks: "list-check",
  Newspaper: "newspaper",
  Clock: "clock",
  Gears: "settings",
  Menu: "menu-burger",
  Search: "search",
  Filter: "filter",
  Grid: "apps",
  List: "list",

  // Arrows / Chevrons
  ChevronLeft: "angle-left",
  ChevronRight: "angle-right",
  ChevronUp: "angle-up",
  ChevronDown: "angle-down",
  ArrowLeft: "arrow-left",
  ArrowRight: "arrow-right",
  ArrowUp: "arrow-up",
  ArrowDown: "arrow-down",

  // Actions
  Check: "check",
  Cross: "cross-small",
  Plus: "plus",
  Minus: "minus",
  Trash: "trash",
  Pen: "pencil",
  PenAlt: "pencil",
  Bookmark: "bookmark",

  // UI
  Bell: "bell",
  Star: "star",
  Heart: "heart",
  Info: "info",
  Lock: "lock",
  Unlock: "unlock",
  ExternalLink: "link",
  Eye: "eye",

  // Auth
  Login: "sign-in-alt",
  Logout: "sign-out-alt",
  User: "user",
  Password: "lock",

  // Education
  GraduationHat: "graduation-cap",
  Coefficient: "calculator",
  Sparkles: "sparkles",

  // Subject icons
  Font: "text",
  Pillar: "bank",
  Code: "code-simple",
  Palette: "palette",
  TextBubble: "comment",
  PiggyBank: "piggy-bank",
  Globe: "globe",
  Cutlery: "utensils",
  Butterfly: "butterfly",

  // Communication
  Mail: "envelope",
  Phone: "phone-call",
  MapPin: "marker",
  Paper: "document",
  Paperclip: "paperclip",
  Attachment: "paperclip",
  Gallery: "picture",
  Camera: "camera",

  // Services (use closest match)
  Ecoledirecte: "school",
  Pronote: "book",
  Skolengo: "graduation-cap",

  // Theme
  Moon: "moon",
  Sun: "sun",
  Sunrise: "sunrise",
  ColorTheme: "palette",

  // Misc
  Shield: "shield",
  Crown: "crown",
  Ghost: "ghost",
  Add: "plus",
  Archive: "archive",
  QrCode: "apps",
  Link: "link",
  Bold: "bold",
  Underline: "underline",
  Emoji: "smile",
  PapillonApp: "butterfly",
  PapillonIcon: "butterfly",
  Accessibility: "universal-access",
  InfoBox: "info",
  Placeholder: "circle",
  Pie: "chart-pie",
  Card: "credit-card",
  Chair: "chair",
};

interface PapiconProps {
  name: string;
  size?: number;
  className?: string;
  color?: string;
}

export default function Papicon({ name, size = 24, className = "", color }: PapiconProps) {
  const fiName = ICON_MAP[name] || "circle-small";

  return (
    <i
      className={`fi fi-rr-${fiName} ${className}`}
      style={{
        fontSize: size,
        lineHeight: 1,
        color: color || undefined,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
      }}
    />
  );
}

export type PapiconName = keyof typeof ICON_MAP;
