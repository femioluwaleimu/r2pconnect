import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link,
  Heading1,
  Heading2,
  Quote,
  Undo,
  Redo,
} from "lucide-react";

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  disabled?: boolean;
}

const RichTextEditor = React.forwardRef<HTMLDivElement, RichTextEditorProps>(
  ({ value, onChange, placeholder, className, minHeight = "120px", disabled = false }, ref) => {
    const editorRef = React.useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = React.useState(false);

    React.useEffect(() => {
      if (editorRef.current && editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }, []);

    const handleInput = () => {
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
    };

    const execCommand = (command: string, value?: string) => {
      document.execCommand(command, false, value);
      editorRef.current?.focus();
      handleInput();
    };

    const ToolbarButton = ({
      command,
      icon: Icon,
      value,
      title,
    }: {
      command: string;
      icon: any;
      value?: string;
      title: string;
    }) => (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => execCommand(command, value)}
        disabled={disabled}
        title={title}
      >
        <Icon className="h-4 w-4" />
      </Button>
    );

    const insertLink = () => {
      const url = prompt("Enter URL:");
      if (url) {
        execCommand("createLink", url);
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border border-input bg-background overflow-hidden transition-all",
          isFocused && "ring-2 ring-ring ring-offset-2 ring-offset-background",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        {/* Toolbar */}
        <div className="flex flex-wrap gap-0.5 p-1.5 border-b border-border bg-muted/30">
          <div className="flex items-center gap-0.5 border-r border-border pr-1 mr-1">
            <ToolbarButton command="undo" icon={Undo} title="Undo" />
            <ToolbarButton command="redo" icon={Redo} title="Redo" />
          </div>
          
          <div className="flex items-center gap-0.5 border-r border-border pr-1 mr-1">
            <ToolbarButton command="bold" icon={Bold} title="Bold (Ctrl+B)" />
            <ToolbarButton command="italic" icon={Italic} title="Italic (Ctrl+I)" />
            <ToolbarButton command="underline" icon={Underline} title="Underline (Ctrl+U)" />
          </div>

          <div className="flex items-center gap-0.5 border-r border-border pr-1 mr-1">
            <ToolbarButton command="formatBlock" icon={Heading1} value="H1" title="Heading 1" />
            <ToolbarButton command="formatBlock" icon={Heading2} value="H2" title="Heading 2" />
            <ToolbarButton command="formatBlock" icon={Quote} value="BLOCKQUOTE" title="Quote" />
          </div>

          <div className="flex items-center gap-0.5 border-r border-border pr-1 mr-1">
            <ToolbarButton command="insertUnorderedList" icon={List} title="Bullet List" />
            <ToolbarButton command="insertOrderedList" icon={ListOrdered} title="Numbered List" />
          </div>

          <div className="flex items-center gap-0.5 border-r border-border pr-1 mr-1">
            <ToolbarButton command="justifyLeft" icon={AlignLeft} title="Align Left" />
            <ToolbarButton command="justifyCenter" icon={AlignCenter} title="Align Center" />
            <ToolbarButton command="justifyRight" icon={AlignRight} title="Align Right" />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={insertLink}
            disabled={disabled}
            title="Insert Link"
          >
            <Link className="h-4 w-4" />
          </Button>
        </div>

        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          data-placeholder={placeholder}
          className={cn(
            "p-3 outline-none overflow-y-auto prose prose-sm dark:prose-invert max-w-none",
            "[&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-muted-foreground [&:empty]:before:pointer-events-none",
            "[&_h1]:text-lg [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-2",
            "[&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-2 [&_h2]:mb-1",
            "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2",
            "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2",
            "[&_li]:my-0.5",
            "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/50 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:my-2",
            "[&_a]:text-primary [&_a]:underline"
          )}
          style={{ minHeight }}
        />
      </div>
    );
  }
);

RichTextEditor.displayName = "RichTextEditor";

export { RichTextEditor };
