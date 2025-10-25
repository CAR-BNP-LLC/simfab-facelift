import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Palette, Type } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[100px] p-3 border rounded',
      },
    },
  });

  const setColor = (color: string) => {
    editor?.chain().focus().setColor(color).run();
  };

  const toggleBold = () => {
    editor?.chain().focus().toggleBold().run();
  };

  const toggleItalic = () => {
    editor?.chain().focus().toggleItalic().run();
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-lg">
      <div className="flex items-center gap-2 p-2 border-b bg-muted/50">
        <Button
          type="button"
          variant={editor.isActive('bold') ? 'default' : 'ghost'}
          size="sm"
          onClick={toggleBold}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('italic') ? 'default' : 'ghost'}
          size="sm"
          onClick={toggleItalic}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <input
            type="color"
            defaultValue="#ef4444"
            onChange={(e) => setColor(e.target.value)}
            className="w-6 h-6 rounded border"
          />
          <Palette className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextEditor;
