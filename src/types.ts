export interface Card {
  id: string;
  prompt: string;
  answer: string;
  promptImage?: string;
  answerImage?: string;
}

export interface DeckState {
  cards: Card[];
  queue: Card[];
  queueSize: number;
  selectionMode: 'random' | 'sequential';
  rememberedCards: Set<string>;
  requiredStreak: number;
  streaks: Record<string, number>;
} 