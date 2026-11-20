import { McpTool } from '../wrappers/tool.wrapper.js';
import * as z from 'zod/v4';

export const AddNoteSchema = z.object({
  text: z.string(),
});

export const add_note = McpTool({
  name: 'add_note',
  description: 'Adds a new note',
  schema: AddNoteSchema,
  handler: async (args) => {
    return {
      content: [{ type: 'text', text: `Saved: ${args.text}` }],
    };
  },
});
