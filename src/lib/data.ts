// Mock data for the Papillon web app

// Subjects with their colors and emoji
export const subjects = [
  { id: "math", name: "Mathématiques", color: "#3b82f6", emoji: "📐", teacher: "M. Martin" },
  { id: "fr", name: "Français", color: "#ef4444", emoji: "📖", teacher: "Mme. Durand" },
  { id: "hist", name: "Histoire-Géo", color: "#f59e0b", emoji: "🌍", teacher: "M. Bernard" },
  { id: "phys", name: "Physique-Chimie", color: "#8b5cf6", emoji: "⚗️", teacher: "Mme. Petit" },
  { id: "svt", name: "SVT", color: "#22c55e", emoji: "🧬", teacher: "M. Moreau" },
  { id: "eng", name: "Anglais", color: "#06b6d4", emoji: "🇬🇧", teacher: "Mme. Thomas" },
  { id: "esp", name: "Espagnol", color: "#f97316", emoji: "🇪🇸", teacher: "M. Garcia" },
  { id: "philo", name: "Philosophie", color: "#ec4899", emoji: "💭", teacher: "Mme. Robert" },
  { id: "sport", name: "EPS", color: "#14b8a6", emoji: "🏃", teacher: "M. Leroy" },
  { id: "spe-math", name: "Spé. Maths", color: "#6366f1", emoji: "∑", teacher: "Mme. Richard" },
  { id: "spe-phys", name: "Spé. Physique", color: "#a855f7", emoji: "⚛️", teacher: "M. Simon" },
  { id: "nsi", name: "NSI", color: "#10b981", emoji: "💻", teacher: "M. Laurent" },
];

// Timetable for the week (Monday to Friday)
export const timetable = [
  // Monday
  { day: 0, start: "08:00", end: "09:00", subjectId: "math", room: "A204" },
  { day: 0, start: "09:00", end: "10:00", subjectId: "math", room: "A204" },
  { day: 0, start: "10:15", end: "11:15", subjectId: "fr", room: "B102" },
  { day: 0, start: "11:15", end: "12:15", subjectId: "hist", room: "C301" },
  { day: 0, start: "13:30", end: "14:30", subjectId: "phys", room: "Labo 1" },
  { day: 0, start: "14:30", end: "15:30", subjectId: "phys", room: "Labo 1" },
  { day: 0, start: "15:45", end: "16:45", subjectId: "eng", room: "B205" },
  // Tuesday
  { day: 1, start: "08:00", end: "09:00", subjectId: "spe-math", room: "A204" },
  { day: 1, start: "09:00", end: "10:00", subjectId: "spe-math", room: "A204" },
  { day: 1, start: "10:15", end: "11:15", subjectId: "philo", room: "C105" },
  { day: 1, start: "11:15", end: "12:15", subjectId: "esp", room: "B103" },
  { day: 1, start: "13:30", end: "14:30", subjectId: "nsi", room: "Info 2" },
  { day: 1, start: "14:30", end: "15:30", subjectId: "nsi", room: "Info 2" },
  // Wednesday
  { day: 2, start: "08:00", end: "09:00", subjectId: "svt", room: "Labo 2" },
  { day: 2, start: "09:00", end: "10:00", subjectId: "svt", room: "Labo 2" },
  { day: 2, start: "10:15", end: "11:15", subjectId: "spe-phys", room: "Labo 1" },
  { day: 2, start: "11:15", end: "12:15", subjectId: "spe-phys", room: "Labo 1" },
  // Thursday
  { day: 3, start: "08:00", end: "09:00", subjectId: "philo", room: "C105" },
  { day: 3, start: "09:00", end: "10:00", subjectId: "fr", room: "B102" },
  { day: 3, start: "10:15", end: "11:15", subjectId: "hist", room: "C301" },
  { day: 3, start: "11:15", end: "12:15", subjectId: "eng", room: "B205" },
  { day: 3, start: "13:30", end: "14:30", subjectId: "sport", room: "Gymnase" },
  { day: 3, start: "14:30", end: "15:30", subjectId: "sport", room: "Gymnase" },
  // Friday
  { day: 4, start: "08:00", end: "09:00", subjectId: "spe-math", room: "A204" },
  { day: 4, start: "09:00", end: "10:00", subjectId: "math", room: "A204" },
  { day: 4, start: "10:15", end: "12:15", subjectId: "spe-phys", room: "Labo 1" },
  { day: 4, start: "13:30", end: "14:30", subjectId: "esp", room: "B103" },
  { day: 4, start: "14:30", end: "15:30", subjectId: "fr", room: "B102" },
];

// Grades
export interface Grade {
  id: string;
  subjectId: string;
  value: number;
  outOf: number;
  coefficient: number;
  date: string;
  title: string;
  classAverage: number;
  classMin: number;
  classMax: number;
}

export const grades: Grade[] = [
  { id: "g1", subjectId: "math", value: 16, outOf: 20, coefficient: 2, date: "2026-03-10", title: "Contrôle intégrales", classAverage: 12.5, classMin: 4, classMax: 19 },
  { id: "g2", subjectId: "fr", value: 14, outOf: 20, coefficient: 1, date: "2026-03-08", title: "Dissertation Baudelaire", classAverage: 11.2, classMin: 5, classMax: 17 },
  { id: "g3", subjectId: "phys", value: 17.5, outOf: 20, coefficient: 2, date: "2026-03-06", title: "TP Optique", classAverage: 13.8, classMin: 7, classMax: 19 },
  { id: "g4", subjectId: "hist", value: 13, outOf: 20, coefficient: 1, date: "2026-03-05", title: "Guerre Froide", classAverage: 11.7, classMin: 6, classMax: 18 },
  { id: "g5", subjectId: "eng", value: 18, outOf: 20, coefficient: 1, date: "2026-03-04", title: "Essay: Climate Change", classAverage: 13.2, classMin: 7, classMax: 19 },
  { id: "g6", subjectId: "spe-math", value: 15, outOf: 20, coefficient: 3, date: "2026-03-03", title: "DS Probabilités", classAverage: 10.5, classMin: 3, classMax: 18 },
  { id: "g7", subjectId: "nsi", value: 19, outOf: 20, coefficient: 2, date: "2026-03-01", title: "Projet Python", classAverage: 14.2, classMin: 8, classMax: 20 },
  { id: "g8", subjectId: "philo", value: 12, outOf: 20, coefficient: 1, date: "2026-02-28", title: "Commentaire: Descartes", classAverage: 10.1, classMin: 4, classMax: 16 },
  { id: "g9", subjectId: "svt", value: 14.5, outOf: 20, coefficient: 1, date: "2026-02-25", title: "Génétique", classAverage: 12.8, classMin: 6, classMax: 18 },
  { id: "g10", subjectId: "spe-phys", value: 16, outOf: 20, coefficient: 3, date: "2026-02-22", title: "Mécanique quantique", classAverage: 11.9, classMin: 5, classMax: 19 },
  { id: "g11", subjectId: "esp", value: 15.5, outOf: 20, coefficient: 1, date: "2026-02-20", title: "Compréhension orale", classAverage: 13.4, classMin: 8, classMax: 18 },
  { id: "g12", subjectId: "sport", value: 17, outOf: 20, coefficient: 1, date: "2026-02-18", title: "Course 3x500m", classAverage: 14.6, classMin: 9, classMax: 19 },
];

// Homework
export interface Homework {
  id: string;
  subjectId: string;
  title: string;
  description: string;
  dueDate: string;
  done: boolean;
}

export const homework: Homework[] = [
  { id: "h1", subjectId: "math", title: "Exercices intégrales", description: "Exercices 45 à 52 p.234", dueDate: "2026-03-12", done: false },
  { id: "h2", subjectId: "fr", title: "Lecture Fleurs du Mal", description: "Lire les poèmes \"Spleen\" I à IV et préparer une analyse", dueDate: "2026-03-12", done: false },
  { id: "h3", subjectId: "phys", title: "Compte rendu TP", description: "Rédiger le compte rendu du TP optique sur les lentilles", dueDate: "2026-03-13", done: false },
  { id: "h4", subjectId: "nsi", title: "Projet algorithme", description: "Implémenter l'algorithme de Dijkstra en Python", dueDate: "2026-03-14", done: true },
  { id: "h5", subjectId: "eng", title: "Oral preparation", description: "Prepare 5-min speech on sustainable development", dueDate: "2026-03-14", done: false },
  { id: "h6", subjectId: "hist", title: "Fiche révision", description: "Fiche de révision sur la décolonisation", dueDate: "2026-03-15", done: false },
  { id: "h7", subjectId: "spe-math", title: "DM Probabilités", description: "Devoir maison n°7 - Lois continues", dueDate: "2026-03-16", done: false },
  { id: "h8", subjectId: "philo", title: "Dissertation", description: "\"La liberté consiste-t-elle à faire ce que l'on veut ?\"", dueDate: "2026-03-17", done: false },
  { id: "h9", subjectId: "spe-phys", title: "Exercices mécanique", description: "Exercices 12 à 18 - Mécanique des fluides", dueDate: "2026-03-18", done: false },
];

// News
export interface NewsItem {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
  category: "info" | "event" | "urgent" | "menu";
}

export const news: NewsItem[] = [
  { id: "n1", title: "Conseils de classe du 2ème trimestre", content: "Les conseils de classe du second trimestre auront lieu du 18 au 22 mars. Les délégués sont priés de recueillir les avis de la classe.", date: "2026-03-11", author: "Direction", category: "info" },
  { id: "n2", title: "Journée portes ouvertes", content: "Le lycée organise sa journée portes ouvertes le samedi 22 mars de 9h à 16h. Tous les élèves volontaires pour aider sont les bienvenus.", date: "2026-03-10", author: "Direction", category: "event" },
  { id: "n3", title: "Alerte météo - Cours maintenus", content: "Malgré l'alerte météo orange, les cours sont maintenus. Les élèves utilisant les transports scolaires sont priés de vérifier les lignes.", date: "2026-03-09", author: "Direction", category: "urgent" },
  { id: "n4", title: "Menu de la semaine", content: "Lundi : Salade composée, Poulet basquaise, Tarte aux pommes. Mardi : Soupe de légumes, Lasagnes, Fruit de saison...", date: "2026-03-09", author: "Cantine", category: "menu" },
  { id: "n5", title: "Sortie musée d'Orsay - Terminales", content: "Une sortie au musée d'Orsay est organisée le 25 mars pour les classes de Terminale. Autorisation parentale à remettre avant le 20 mars.", date: "2026-03-08", author: "M. Bernard", category: "event" },
  { id: "n6", title: "Bac blanc - Planning", content: "Les épreuves du bac blanc se tiendront du 31 mars au 4 avril. Le planning détaillé sera affiché en salle des professeurs et distribué aux élèves.", date: "2026-03-07", author: "Direction", category: "info" },
];

// Attendance
export interface AttendanceRecord {
  id: string;
  type: "absence" | "late" | "departure";
  date: string;
  startTime: string;
  endTime?: string;
  reason?: string;
  justified: boolean;
  subjectId?: string;
}

export const attendance: AttendanceRecord[] = [
  { id: "a1", type: "late", date: "2026-03-10", startTime: "08:12", reason: "Bus en retard", justified: true, subjectId: "math" },
  { id: "a2", type: "absence", date: "2026-03-03", startTime: "08:00", endTime: "17:00", reason: "Rendez-vous médical", justified: true },
  { id: "a3", type: "absence", date: "2026-02-24", startTime: "13:30", endTime: "15:30", justified: false, subjectId: "sport" },
  { id: "a4", type: "late", date: "2026-02-20", startTime: "10:20", reason: "Passage infirmerie", justified: true, subjectId: "hist" },
  { id: "a5", type: "departure", date: "2026-02-18", startTime: "15:30", reason: "Autorisation parentale", justified: true },
  { id: "a6", type: "absence", date: "2026-02-10", startTime: "08:00", endTime: "12:00", reason: "Maladie", justified: true },
];

// Helper to get subject by ID
export function getSubject(id: string) {
  return subjects.find((s) => s.id === id);
}

// Compute subject averages
export function getSubjectAverages() {
  const averages: Record<string, { sum: number; coefSum: number; average: number }> = {};
  for (const grade of grades) {
    if (!averages[grade.subjectId]) {
      averages[grade.subjectId] = { sum: 0, coefSum: 0, average: 0 };
    }
    const normalized = (grade.value / grade.outOf) * 20;
    averages[grade.subjectId].sum += normalized * grade.coefficient;
    averages[grade.subjectId].coefSum += grade.coefficient;
  }
  for (const key of Object.keys(averages)) {
    averages[key].average = averages[key].sum / averages[key].coefSum;
  }
  return averages;
}

// Compute general average
export function getGeneralAverage() {
  let sum = 0;
  let coefSum = 0;
  for (const grade of grades) {
    const normalized = (grade.value / grade.outOf) * 20;
    sum += normalized * grade.coefficient;
    coefSum += grade.coefficient;
  }
  return sum / coefSum;
}

// Days of the week
export const daysOfWeek = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];

// Format date for display
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}
