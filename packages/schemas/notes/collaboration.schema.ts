import { z } from 'zod';

export const collaborationTicketSchema = z.object({
  token: z.string().min(1),
});

export type CollaborationTicket = z.infer<typeof collaborationTicketSchema>;
