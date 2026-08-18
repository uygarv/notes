import { getSchema } from '@tiptap/core';
import BulletList from '@tiptap/extension-bullet-list';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import StarterKit from '@tiptap/starter-kit';
import {
  prosemirrorJSONToYXmlFragment,
  yXmlFragmentToProsemirrorJSON,
} from 'y-prosemirror';
import * as Y from 'yjs';

const extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    bulletList: false,
    link: false,
    underline: false,
  }),
  BulletList,
  Underline,
  Link.configure({ openOnClick: false, autolink: true, defaultProtocol: 'https://' }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
];

const schema = getSchema(extensions);

export async function createCollaborationState(content: string) {
  const { generateJSON } = await import('@tiptap/html/server');
  const document = new Y.Doc();
  const json = generateJSON(content || '<p></p>', extensions as never);
  prosemirrorJSONToYXmlFragment(
    schema,
    json,
    document.getXmlFragment('default'),
  );
  return Buffer.from(Y.encodeStateAsUpdate(document));
}

export function isEmptyCollaborationState(state: Uint8Array) {
  const document = new Y.Doc();
  Y.applyUpdate(document, state);
  return document.getXmlFragment('default').length === 0;
}

export async function collaborationStateToHtml(state: Uint8Array) {
  const { generateHTML } = await import('@tiptap/html/server');
  const document = new Y.Doc();
  Y.applyUpdate(document, state);
  return generateHTML(
    yXmlFragmentToProsemirrorJSON(document.getXmlFragment('default')),
    extensions as never,
  );
}
