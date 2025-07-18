import HeaderClient from "./HeaderClient";

interface HeaderProps {
  convexUser: { isPro?: boolean };
  onFileContent?: (content: string) => void;
  currentCode?: string;
  language?: string;
}

export default function Header({ 
  convexUser, 
  onFileContent,
  currentCode,
  language 
}: HeaderProps) {
  return (
    <HeaderClient 
      convexUser={convexUser} 
      onFileContentAction={onFileContent}
      currentCode={currentCode}
      language={language}
    />
  );
}