import Link from "next/link";
import { Github, Linkedin, Twitter, ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-6 w-6 rounded bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                A
              </span>
              <span className="font-semibold text-base text-slate-900">
                Allo <span className="text-indigo-600 font-medium">Earth</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              Global logistics management and real-time medical-grade inventory allocation. Ensuring zero-concurrency checkout anomalies across multiple global distribution centers.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
              Resources
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-xs text-slate-500 hover:text-indigo-600 transition-colors">
                  API Documentation
                </Link>
              </li>
              <li>
                <Link href="#" className="text-xs text-slate-500 hover:text-indigo-600 transition-colors">
                  System Status
                </Link>
              </li>
              <li>
                <Link href="#" className="text-xs text-slate-500 hover:text-indigo-600 transition-colors">
                  Security Audits
                </Link>
              </li>
            </ul>
          </div>

          {/* Socials & Compliance */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
              Legal & Compliance
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-xs text-slate-500 hover:text-indigo-600 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="#" className="text-xs text-slate-500 hover:text-indigo-600 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded font-medium">
                  HIPAA Compliant
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Allo Health & Allo Earth. All rights reserved.
          </p>

          {/* Operational Status (pulsing indicator) */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-status-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              All Systems Operational (Global API Connected)
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-3">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-indigo-600 transition-colors"
                title="GitHub"
              >
                <Github className="h-4 w-4" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-indigo-600 transition-colors"
                title="LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-indigo-600 transition-colors"
                title="Twitter"
              >
                <Twitter className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
