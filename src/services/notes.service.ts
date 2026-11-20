import { HttpClient } from '../utils/http-client.js';

export interface Note {
  id: string;
  text: string;
}

export interface CreateNoteInput {
  text: string;
}

export class NotesService {
  constructor(private readonly http: HttpClient) {}

  list(): Promise<Note[]> {
    return this.http.get<Note[]>('/notes');
  }

  getById(id: string): Promise<Note> {
    return this.http.get<Note>(`/notes/${encodeURIComponent(id)}`);
  }

  create(input: CreateNoteInput): Promise<Note> {
    return this.http.post<Note>('/notes', input);
  }

  update(id: string, input: CreateNoteInput): Promise<Note> {
    return this.http.put<Note>(`/notes/${encodeURIComponent(id)}`, input);
  }

  delete(id: string): Promise<void> {
    return this.http.delete<void>(`/notes/${encodeURIComponent(id)}`);
  }
}
