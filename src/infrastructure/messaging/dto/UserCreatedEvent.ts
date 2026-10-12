import { z } from 'zod';

// Los campos desconocidos se ignoran (zod los descarta por defecto).
// occurredAt llega sin zona horaria y con nanosegundos: se trata como string.
export const userCreatedEventSchema = z.object({
  eventId: z.string().min(1),
  eventType: z.string().min(1),
  aggregateId: z.string().min(1),
  occurredAt: z.string().optional(),
});

export type UserCreatedEvent = z.infer<typeof userCreatedEventSchema>;
