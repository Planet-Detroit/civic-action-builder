import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'

// Toolbar button styling helper
function ToolbarBtn({ active, onClick, children, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-2 py-1 text-xs rounded font-semibold transition-colors ${
        active
          ? 'bg-pd-blue text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  )
}

// Simple toolbar for bold, italic, and link formatting
function Toolbar({ editor }) {
  if (!editor) return null

  const setLink = () => {
    const url = window.prompt('Enter URL:')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="flex gap-1 px-2 py-1.5 border-b border-gray-200 bg-gray-50 rounded-t">
      <ToolbarBtn
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        B
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        I
      </ToolbarBtn>
      <ToolbarBtn
        active={editor.isActive('link')}
        onClick={setLink}
        title="Add link"
      >
        Link
      </ToolbarBtn>
      {editor.isActive('link') && (
        <ToolbarBtn
          active={false}
          onClick={() => editor.chain().focus().unsetLink().run()}
          title="Remove link"
        >
          Unlink
        </ToolbarBtn>
      )}
    </div>
  )
}

// Rich text editor with bold, italic, and link support.
// Stores content as HTML string via onChange callback.
export default function RichTextEditor({ value, onChange, placeholder }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Only enable the formatting we need
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      // TipTap emits <p></p> for empty content — treat as empty
      const isEmpty = html === '<p></p>' || html === ''
      onChange(isEmpty ? '' : html)
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none px-3 py-2 min-h-[3rem] focus:outline-none text-sm',
      },
    },
  })

  return (
    <div className="border border-gray-300 rounded overflow-hidden">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  )
}
