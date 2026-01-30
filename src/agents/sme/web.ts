import type { SMEDomainConfig } from './base';

export const webSMEConfig: SMEDomainConfig = {
	domain: 'web',
	description: 'Web and frontend development (Flutter, React, Vue, Angular, JavaScript/TypeScript, HTML/CSS)',
	guidance: `For web/frontend tasks, provide:
- **Flutter**: Dart syntax, widget composition, state management (Provider, Riverpod, Bloc), platform channels, pub.dev packages, hot reload workflow
- **React**: Hooks (useState, useEffect, useMemo), context, Redux/Zustand, Next.js App Router, server components, React Native considerations
- **Vue**: Composition API, Pinia stores, Nuxt 3, Vue Router, reactive refs
- **Angular**: Components, services, dependency injection, RxJS patterns, NgRx, Angular CLI commands
- **Svelte**: Runes ($state, $derived), SvelteKit routing, stores
- **JavaScript/TypeScript**: ES modules, async/await, type narrowing, bundler config (Vite, webpack, esbuild)
- **HTML/CSS**: Semantic markup, Flexbox/Grid layouts, CSS custom properties, Tailwind utility classes, SCSS
- **Browser APIs**: DOM manipulation, Fetch API, Web Storage, Service Workers, WebSockets
- Framework selection guidance based on project requirements
- Component architecture and reusability patterns
- State management strategies (local vs global)
- Build optimization and code splitting
- Responsive design and accessibility (WCAG)
- Common gotchas (hydration mismatches, bundle size, memory leaks)`,
};
