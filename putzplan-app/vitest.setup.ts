import '@testing-library/jest-dom'

// Polyfills or global test helpers can go here

window.scrollTo = window.scrollTo || (() => {}) as any
