/** Shared Tailwind classes — matches dashboard / auth app (zinc + sky). */



export const publicPage = {

  shell: "min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100",

  shellFixed: "h-screen flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950",

  main: "bg-zinc-50 dark:bg-zinc-950",

  section: "py-16 bg-zinc-50 dark:bg-zinc-950",

  sectionAlt: "py-16 bg-white dark:bg-zinc-900/40",

};



export const publicCard = {

  base: "rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900",

  lg: "rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900",

  muted: "rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60",

  hover: "hover:border-sky-200 hover:shadow-md dark:hover:border-sky-800 transition-all",

};



export const publicBtn = {

  primary: "bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl shadow-sm transition-colors",

  outline:

    "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors",

  whatsapp: "bg-[#25D366] hover:bg-[#1eb858] text-white font-semibold rounded-xl transition-colors",

};



export const publicText = {

  primary: "text-sky-600 dark:text-sky-400",

  muted: "text-zinc-500 dark:text-zinc-400",

  heading: "text-zinc-900 dark:text-zinc-50",

};



export const publicHero = {

  section:

    "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pt-[100px] pb-20 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950",

  badge:

    "inline-block bg-white/10 text-sky-200 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-5",

  title: "text-4xl sm:text-5xl font-bold text-white mb-5 leading-tight tracking-tight",

  subtitle: "text-slate-300 text-base max-w-2xl mx-auto leading-relaxed",

};



export const publicBreadcrumb = {

  wrap: "bg-white border-b border-zinc-200 py-3 dark:bg-zinc-900 dark:border-zinc-800",

  link: "hover:text-sky-600 dark:hover:text-sky-400 transition-colors",

  current: "text-zinc-900 font-medium dark:text-zinc-100",

};



/** Logo — transparent; no white frame around the image */
export const publicLogo = {

  base: "inline-flex items-center justify-center",

  nav: "",

  panel: "",

  auth: "",

};


