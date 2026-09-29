// Fängt Tippfehler und undefinierte Variablen im gebündelten Spielcode ab (npm run lint).
export default [
  {
    files: ['build/bundle.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        THREE: 'readonly', window: 'readonly', document: 'readonly', navigator: 'readonly',
        console: 'readonly', performance: 'readonly', requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly',
        setInterval: 'readonly', clearInterval: 'readonly', localStorage: 'readonly',
        AudioContext: 'readonly', OfflineAudioContext: 'readonly', webkitAudioContext: 'readonly',
        Float32Array: 'readonly', URLSearchParams: 'readonly', ResizeObserver: 'readonly',
        location: 'readonly', getComputedStyle: 'readonly', Image: 'readonly', Promise: 'readonly',
        matchMedia: 'readonly', screen: 'readonly', DOMParser: 'readonly', Blob: 'readonly', URL: 'readonly',
        KeyboardEvent: 'readonly', MouseEvent: 'readonly', Event: 'readonly', CustomEvent: 'readonly',
        HTMLElement: 'readonly', fetch: 'readonly', atob: 'readonly', btoa: 'readonly',
      },
    },
    rules: {
      'no-undef': 'error', 'no-redeclare': 'error', 'no-dupe-keys': 'error', 'no-dupe-args': 'error',
      'no-unreachable': 'error', 'no-const-assign': 'error', 'no-func-assign': 'error',
      'no-use-before-define': ['error', { functions: false, classes: true, variables: false }],
      'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }],
      'no-self-assign': 'error', 'no-unsafe-finally': 'error', 'valid-typeof': 'error',
      'no-empty': ['warn', { allowEmptyCatch: true }], 'no-cond-assign': 'error', 'no-loss-of-precision': 'error',
    },
  },
];
