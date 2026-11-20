import { HttpClient } from '../utils/http-client.js';
import { NotesService } from './notes.service.js';

const notesApi = new HttpClient(
  process.env.NOTES_API_URL ?? 'http://127.0.0.1:8080',
  {
    timeoutMs: 10_000,
    headers: process.env.NOTES_API_TOKEN
      ? { Authorization: `Bearer ${process.env.NOTES_API_TOKEN}` }
      : undefined,
  },
);

export const notesService = new NotesService(notesApi);

export { NotesService };
export type { CreateNoteInput, Note } from './notes.service.js';
