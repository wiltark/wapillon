// Map subject names to Papicon names
// Keywords to icon mapping (case-insensitive matching)
const ICON_RULES: [RegExp, string][] = [
  [/math|calcul|algèbre|géom/i, "Coefficient"],
  [/spé.*math|maths.*spé/i, "Sparkles"],
  [/fran[cç]ais|lettres|litt/i, "Font"],
  [/hist|géo/i, "Pillar"],
  [/phys|chimie/i, "Sparkles"],
  [/svt|biolog|science.*vie/i, "Butterfly"],
  [/angl|english/i, "Globe" /* no Globe in papicons, use placeholder */],
  [/espagnol|esp|allemand|italien|lv/i, "TextBubble"],
  [/philo/i, "Lightbulb" /* no Lightbulb, fallback */],
  [/eps|sport|éducation.*physique/i, "Heart"],
  [/nsi|info|numérique|snt/i, "Code"],
  [/art|dessin|plast/i, "Palette"],
  [/musi/i, "Star"],
  [/éco|ses|économ/i, "PiggyBank"],
  [/techno/i, "Gears"],
  [/latin|grec|ancien/i, "Pillar"],
  [/science/i, "Sparkles"],
  [/écrit|rédac/i, "Pen"],
  [/cantine|repas|demi/i, "Cutlery"],
];

const DEFAULT_ICON = "GraduationHat";

export function getSubjectIconName(subjectName: string): string {
  for (const [pattern, icon] of ICON_RULES) {
    if (pattern.test(subjectName)) return icon;
  }
  return DEFAULT_ICON;
}
