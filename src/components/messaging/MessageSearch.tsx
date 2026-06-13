import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface MessageSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function MessageSearch({ onSearch, placeholder = "Search messages..." }: MessageSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleSearch = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  const handleClear = () => {
    setQuery("");
    onSearch("");
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="rounded-xl h-8 w-8"
        onClick={() => setIsOpen(true)}
      >
        <Search className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="h-8 pl-8 pr-8 w-[180px] text-sm rounded-xl"
          autoFocus
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 p-0"
            onClick={handleClear}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-xl h-8 w-8"
        onClick={handleClear}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
