
import { Separator } from "@/components/ui/separator";

const Footer = () => {
  const links = [
    { text: "Data Policy", url: "https://www.rantir.com/company-services-policy" },
    { text: "Security", url: "https://www.rantir.com/security-policy" },
    { text: "Data Classification", url: "https://www.rantir.com/company-services-policy" },
    { text: "Terms & Conditions", url: "https://www.rantir.com/terms-and-conditions" },
    { text: "Privacy Policy", url: "https://www.rantir.com/privacy-policy" },
    { text: "License", url: "https://www.rantir.com/licensing" },
  ];

  return (
    <footer className="h-14 bg-transparent">
      <div className="h-full container mx-auto px-4 flex items-center justify-between text-sm text-muted-foreground">
        <div>© Rantir Cloud by Rantir, Inc. (DBA Hexigon AI)</div>
        <div className="flex gap-4">
          {links.map((link) => (
            <a
              key={link.text}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              {link.text}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
