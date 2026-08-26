import Link from 'next/link';
import { ArrowLeft, Github, Linkedin, Zap, Globe, Lock, Music, Server } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="relative min-h-screen bg-[#F6F3EE] text-[#1B1B1B] font-satoshi flex flex-col justify-between overflow-x-hidden">
      {/* Soft blurred scandinavian record player bg overlay matching home page */}
      <div
        className="fixed inset-0 -z-20 pointer-events-none"
        style={{
          backgroundImage: 'url(/webpage_hero.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'right 65% center',
          filter: 'blur(40px)',
        }}
      />
      <div className="fixed inset-0 -z-15 bg-[#F6F3EE]/78 pointer-events-none" />

      {/* Main Container */}
      <div className="flex-1 max-w-3xl mx-auto px-6 py-12 md:py-20 w-full space-y-12 z-10">

        {/* Header navigation bar */}
        <header className="flex items-center justify-between pb-6 border-b border-black/5">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-[#1B1B1B]/60 hover:text-[#1B1B1B] transition-colors"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Home
          </Link>

          <div className="flex items-center gap-2.5">
            {/* Custom Groove record spiral logo */}
            <div className="relative h-7 w-7 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-charcoal/20 flex items-center justify-center animate-spin-slow">
                <div className="h-5 w-5 rounded-full border border-charcoal/30 flex items-center justify-center">
                  <div className="h-3 w-3 rounded-full border border-charcoal/40 flex items-center justify-center">
                    <div className="h-1 w-1 bg-charcoal rounded-full" />
                  </div>
                </div>
              </div>
            </div>
            <span className="text-xl font-bold tracking-tight text-black font-satoshi lowercase">
              vynyl
            </span>
          </div>
        </header>

        {/* Hero Title */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight font-canela leading-tight text-[#1B1B1B]">
            About vynyl
          </h1>
          <p className="text-lg sm:text-xl font-medium text-[#1B1B1B]/80 leading-relaxed italic font-canela">
            Listen to music together with your friends. vynyl is a shared listening room where friends can play music, build a queue, and listen in sync.
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-10 text-[15px] leading-relaxed text-[#1B1B1B]/75">

          {/* Section 1: Why vynyl was built */}
          <section className="space-y-3.5 text-left">
            <h2 className="text-xl font-bold text-[#E07A5F] font-canela uppercase tracking-wider">
              Why vynyl?
            </h2>
            <p>
              Sharing music should be effortless. Many platforms force users through sign-ups, paywalls, or separate mobile app installations just to share a single track. And don't even mention on starting a whole Gmeet just to listen to music with your friends, because who wants to do that anymore?
            </p>
            <p>
              I made vynyl to serve as a lightweight, zero-friction web alternative. By using YouTube's extensive (and free!) API, you can create or join a synchronized room instantly with nothing more than a browser tab and a guest name.
            </p>
            <p>
              <strong className="text-[#1B1B1B]">100% Free</strong>, <strong className="text-[#1B1B1B]">No Ads</strong>, and <strong className="text-[#1B1B1B]">Open-Source</strong> for everyone to use.
            </p>
          </section>

          {/* Section 2: How synchronization works */}
          <section className="space-y-4 text-left">
            <h2 className="text-xl font-bold text-[#E07A5F] font-canela uppercase tracking-wider">
              How it works
            </h2>
            <p>
              Our synchronization engine is split across three layers:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
              <div className="p-4 rounded-2xl bg-white/40 border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-2">
                <div className="h-8 w-8 rounded-lg bg-[#E07A5F]/10 flex items-center justify-center border border-[#E07A5F]/10">
                  <Zap className="h-4 w-4 text-[#E07A5F]" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1B1B1B]">WebSockets</h4>
                <p className="text-xs text-[#1B1B1B]/60 leading-normal">
                  Socket.IO relays real-time triggers (play, pause, seek, skip) to all room members in under 100ms.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/40 border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-2">
                <div className="h-8 w-8 rounded-lg bg-[#E07A5F]/10 flex items-center justify-center border border-[#E07A5F]/10">
                  <Server className="h-4 w-4 text-[#E07A5F]" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1B1B1B]">State Cache</h4>
                <p className="text-xs text-[#1B1B1B]/60 leading-normal">
                  A NestJS server coordinates with an Upstash Redis store to maintain playback states and sync rooms.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/40 border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-2">
                <div className="h-8 w-8 rounded-lg bg-[#E07A5F]/10 flex items-center justify-center border border-[#E07A5F]/10">
                  <Music className="h-4 w-4 text-[#E07A5F]" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1B1B1B]">Player API</h4>
                <p className="text-xs text-[#1B1B1B]/60 leading-normal">
                  Audio plays via the YouTube Iframe Player, using lightweight local adjustments to reconcile clock drift.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Open-Source and Creator */}
          <section className="space-y-3.5 text-left pt-2 border-t border-black/5">
            <h2 className="text-xl font-bold text-[#E07A5F] font-canela uppercase tracking-wider">
              The Creator & Code
            </h2>
            <p>
              vynyl is fully open-source and developed using modern React guidelines. You can view the code, suggest features, or report issues on GitHub.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href="https://github.com/sourjesh-git/vynyl-app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#1B1B1B] text-white px-4 py-2.5 text-xs font-semibold hover:bg-black transition-colors"
              >
                <Github className="h-4 w-4" />
                GitHub Repository
              </a>
              <a
                href="https://www.linkedin.com/in/sourjesh-mukherjee-5ba657258/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-transparent border border-black/10 text-[#1B1B1B] px-4 py-2.5 text-xs font-semibold hover:bg-black/5 transition-colors"
              >
                <Linkedin className="h-4 w-4 text-[#0077B5]" />
                LinkedIn Profile
              </a>
            </div>
          </section>

          {/* Section 4: Contributing & Usage */}
          <section className="space-y-3.5 text-left pt-6 border-t border-black/5">
            <h2 className="text-xl font-bold text-[#E07A5F] font-canela uppercase tracking-wider">
              Contributions & Custom Builds
            </h2>
            <p>
              vynyl is open to everyone. If you have ideas for improvements, optimization, or new features, feel free to open a Pull Request or create an issue on our GitHub repository.
            </p>
            <p>
              You are welcome to fork this project, modify the codebase, or deploy your own custom versions of vynyl. We only kindly request that if you build upon this work, you give due credit to the original creator (aka ME!) in your readme or project attributes.
            </p>
          </section>

        </div>
      </div>

      {/* Footer matching home page style */}
      <footer className="w-full py-10 px-6 sm:px-12 lg:px-16 border-t border-[#1B1B1B]/10 bg-[#EBE1D6]/70">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row justify-between gap-8 text-[12px] leading-relaxed text-[#1B1B1B]/70">
          <div className="max-w-md space-y-2">
            <p>
              Audio is streamed through YouTube’s embedded player; all rights remain with the respective labels and composers. Nothing is hosted on our servers.
            </p>
          </div>
          <div className="flex flex-col md:items-end justify-between gap-1.5 shrink-0 text-right">
            <p className="text-[11px] text-[#1B1B1B]/50 font-medium">
              &copy; {new Date().getFullYear()} vynyl. Built by{' '}
              <span className="text-[#1B1B1B]/80 font-bold">Sourjesh Mukherjee</span>.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
