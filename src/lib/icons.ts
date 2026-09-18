import type { IconName } from "@/components/Icon";

// Map subject names to Icon names
// Keywords to icon mapping (case-insensitive matching)
const ICON_RULES: [RegExp, IconName][] = [
  [/math|calcul|algèbre|géom/i, "Coefficient"],
  [/spé.*math|maths.*spé/i, "Sparkles"],
  [/fran[cç]ais|lettres|litt/i, "Book"],
  [/hist|géo/i, "Pillar"],
  [/phys|chimie/i, "Beaker"],
  [/svt|biolog|science.*vie/i, "Biology"],
  [/angl|english/i, "Globe"],
  [/espagnol|esp|allemand|italien|lv/i, "TextBubble"],
  [/philo/i, "Lightbulb"],
  [/eps|sport|éducation.*physique/i, "Trophy"],
  [/nsi|info|numérique|snt/i, "Code"],
  [/art|dessin|plast/i, "Palette"],
  [/musi/i, "Music"],
  [/éco|ses|économ/i, "PiggyBank"],
  [/techno/i, "Wrench"],
  [/latin|grec|ancien/i, "Pillar"],
  [/science/i, "Sparkles"],
  [/écrit|rédac/i, "Pen"],
  [/cantine|repas|demi/i, "Cutlery"],
];

const DEFAULT_ICON: IconName = "GraduationHat";

export function getSubjectIconName(subjectName: string): IconName {
  for (const [pattern, icon] of ICON_RULES) {
    if (pattern.test(subjectName)) return icon;
  }
  return DEFAULT_ICON;
}
