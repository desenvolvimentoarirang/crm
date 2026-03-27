import { ConversationCategory } from '@prisma/client'

const CATEGORY_KEYWORDS: Record<ConversationCategory, string[]> = {
  BOOKING: [
    'booking', 'reserve', 'reservation', 'trip', 'flight', 'hotel', 'package',
    'travel', 'tour', 'cruise', 'vacation', 'holiday', 'itinerary', 'book',
    'reserva', 'viagem', 'voo', 'pacote', 'hotel', 'passagem', 'reservar',
  ],
  INQUIRY: [
    'price', 'cost', 'how much', 'available', 'information', 'info', 'details',
    'options', 'quote', 'estimate', 'rates', 'schedule',
    'preço', 'quanto', 'disponível', 'informação', 'orçamento', 'cotação',
  ],
  SUPPORT: [
    'help', 'problem', 'issue', 'change', 'modify', 'cancel', 'reschedule',
    'update', 'status', 'question',
    'ajuda', 'problema', 'alterar', 'cancelar', 'reagendar', 'dúvida',
  ],
  COMPLAINT: [
    'complaint', 'unhappy', 'disappointed', 'refund', 'terrible', 'worst',
    'bad', 'angry', 'unacceptable', 'compensation',
    'reclamação', 'insatisfeito', 'reembolso', 'péssimo', 'horrível',
  ],
  GENERAL: [],
}

export function categorizeMessage(text: string): ConversationCategory {
  if (!text) return 'GENERAL'
  const lower = text.toLowerCase()

  let bestCategory: ConversationCategory = 'GENERAL'
  let bestScore = 0

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === 'GENERAL') continue
    const score = keywords.filter((kw) => lower.includes(kw)).length
    if (score > bestScore) {
      bestScore = score
      bestCategory = category as ConversationCategory
    }
  }

  return bestCategory
}
