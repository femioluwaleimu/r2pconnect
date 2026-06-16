import { Link } from "react-router-dom";
import PublicBrand from "./PublicBrand";
interface PublicFooterProps {
  variant?: "simple" | "full";
}
export default function PublicFooter({ variant = "simple" }: PublicFooterProps) {
  if (variant === "full") {
    return (
      <footer className="bg-card border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="mb-4">
                <PublicBrand />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Bridging the gap between academic research and industry needs in Nigeria.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Platform</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <Link to="/research" className="hover:text-foreground transition-colors">
                    Browse Research
                  </Link>
                </li>
                <li></li>
                <li>
                  <Link to="/documentaries" className="hover:text-foreground transition-colors">
                    Documentaries
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <Link to="/about-us" className="hover:text-foreground transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-foreground transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className="hover:text-foreground transition-colors">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link to="/how-it-works" className="hover:text-foreground transition-colors">
                    How It Works
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <Link to="/privacy-policy" className="hover:text-foreground transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms-of-use" className="hover:text-foreground transition-colors">
                    Terms of Use
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} R2P CONNECT Nigeria. All rights reserved.
          </div>
        </div>
      </footer>
    );
  }
  return (
    <footer className="bg-muted/50 border-t border-border py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <PublicBrand compact />
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <Link to="/privacy-policy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms-of-use" className="hover:text-foreground transition-colors">
              Terms of Use
            </Link>
            <Link to="/faq" className="hover:text-foreground transition-colors">
              FAQ
            </Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">
              Contact
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} R2P CONNECT Nigeria Powered By EduTV Nigeria
          </p>
        </div>
      </div>
    </footer>
  );
}
